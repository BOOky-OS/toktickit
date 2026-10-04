import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { actionFixture } from "./action-fixture.js";
vi.mock("../../src/prisma.js",()=>({getPrisma:vi.fn()}));
let f:Awaited<ReturnType<typeof actionFixture>>;
beforeAll(async()=>{f=await actionFixture();},60000);afterAll(async()=>{await f?.dispose();});
it("returns authoritative zero metrics and bounded empty lists for Staff/Admin",async()=>{
  for(const actor of ["staff","admin"]){const r=await f.call("get","/dashboards/staff",actor);expect(r.status).toBe(200);
    expect(r.body.metrics).toMatchObject({unassignedTickets:0,myOwnedTickets:0,myPendingActions:0});expect(Object.keys(r.body.metrics.byStatus)).toHaveLength(8);expect(Object.values(r.body.metrics.byStatus)).toEqual(Array(8).fill(0));expect(r.body.recentTickets).toEqual([]);expect(r.body.urgentTickets).toEqual([]);expect(r.body.myPendingActions).toEqual([]);}
});
it("rejects Requesters, expired/forced sessions and supplied scope/unknown/repeated query",async()=>{
  for(const actor of ["requester","other","anonymous","inactive","forced"])expect((await f.call("get","/dashboards/staff",actor)).status).toBeGreaterThanOrEqual(400);
  for(const query of ["?userId=1","?owner=me","?x=1&x=2"])expect((await f.call("get","/dashboards/staff"+query)).status).toBe(400);
});

it("matches independent SQL, all status/priority buckets, actor scope and bounded ordering",async()=>{
  const statuses=["NEW","OPEN","IN_PROGRESS","WAITING_FOR_REQUESTER","RESOLVED","CLOSED","REOPENED","CANCELLED"] as const;
  for(let n=0;n<24;n++){const t=await f.make();await f.prisma.ticket.update({where:{id:t.id},data:{currentStatus:statuses[n%8],ownerId:n%3===0?null:n%3===1?f.users.staff:f.users.inactive,itPriority:(["LOW","MEDIUM","HIGH"] as const)[n%3],updatedAt:new Date("2026-09-01T00:00:00Z")}});
    await f.prisma.actionTaken.createMany({data:[0,1].map(i=>({ticketId:t.id,performedById:f.users.admin,assigneeId:i?f.users.admin:f.users.staff,actionAt:new Date("2026-09-01"),description:"Long description ".repeat(20),result:"",followUpRequired:false,followUpNote:"",attachmentNotes:"",workCycle:1,status:"PLANNED" as const}))});
  }
  for(const actor of ["staff","admin"]){const r=await f.call("get","/dashboards/staff",actor);expect(r.status).toBe(200);
    const rows=await f.prisma.$queryRaw<Array<{status:string;n:bigint}>>`SELECT "currentStatus"::text AS status,count(*) AS n FROM "Ticket" GROUP BY "currentStatus"`;
    for(const row of rows)expect(r.body.metrics.byStatus[row.status]).toBe(Number(row.n));
    const tickets=await f.prisma.$queryRaw<Array<{ownerId:number|null;itPriority:string;id:number;currentStatus:string}>>`SELECT id,"ownerId","itPriority","currentStatus"::text FROM "Ticket"`;
    const active=tickets.filter(t=>!["RESOLVED","CLOSED","CANCELLED"].includes(t.currentStatus));
    expect(r.body.metrics.unassignedTickets).toBe(active.filter(t=>t.ownerId===null).length);expect(r.body.metrics.myOwnedTickets).toBe(active.filter(t=>t.ownerId===f.users[actor]).length);
    for(const p of ["LOW","MEDIUM","HIGH"])expect(r.body.metrics.activeByPriority[p]).toBe(active.filter(t=>t.itPriority===p).length);
    const [{n}]=await f.prisma.$queryRaw<Array<{n:bigint}>>`SELECT count(*) AS n FROM "ActionTaken" a JOIN "Ticket" t ON t.id=a."ticketId" WHERE a."assigneeId"=${f.users[actor]} AND a.status IN ('PLANNED','IN_PROGRESS') AND t."currentStatus" NOT IN ('RESOLVED','CLOSED','CANCELLED')`;
    expect(r.body.metrics.myPendingActions).toBe(Number(n));expect(r.body.myPendingActions).toHaveLength(5);expect(r.body.myPendingActions.every((a:{description:string})=>a.description.length===120)).toBe(true);
    const expected=active.filter(t=>t.itPriority==="HIGH").sort((a,b)=>b.id-a.id).slice(0,5).map(t=>t.id);expect(r.body.urgentTickets.map((t:{id:number})=>t.id)).toEqual(expected);
    expect(r.body.recentTickets).toEqual([]);expect(JSON.stringify(r.body)).not.toMatch(/passwordHash|storageKey|internalNote|seedKey|responseStatus/);
  }
});
it("includes exact recent boundaries and excludes one millisecond outside them",async()=>{
  const {staffDashboard}=await import("../../src/tickets/staff-dashboard.js");const now=new Date("2026-09-26T10:00:00Z"),from=new Date(+now-7*86400000);
  const ids:number[]=[];for(const at of [new Date(+from-1),from,new Date(+from+1),now,new Date(+now+1)]){const t=await f.make();await f.prisma.ticket.update({where:{id:t.id},data:{updatedAt:at}});ids.push(t.id);}
  const r=await staffDashboard(f.prisma,f.users.staff,now);expect(r.recentWindow).toEqual({from:from.toISOString(),to:now.toISOString()});
  expect((r.recentTickets as Array<{id:number}>).map(t=>t.id)).toEqual([ids[3],ids[2],ids[1]]);
});
it("fails safely without partial counts when the database query fails",async()=>{
  const original=f.prisma.$transaction.bind(f.prisma);const spy=vi.spyOn(f.prisma,"$transaction").mockRejectedValueOnce(new Error("private SQL connection detail"));
  try{const r=await f.call("get","/dashboards/staff");expect(r.status).toBe(500);expect(r.text).not.toMatch(/private SQL|metrics|password/);}finally{spy.mockRestore();}
});
