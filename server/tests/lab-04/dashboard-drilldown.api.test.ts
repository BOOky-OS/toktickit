import { afterAll,beforeAll,expect,it,vi } from "vitest";
import { actionFixture } from "./action-fixture.js";
vi.mock("../../src/prisma.js",()=>({getPrisma:vi.fn()}));let f:Awaited<ReturnType<typeof actionFixture>>;
beforeAll(async()=>{f=await actionFixture();},60000);afterAll(async()=>{await f?.dispose();});
it("uses distinct parent Tickets for multiple assigned actions and matches dashboard counts",async()=>{
  const t=await f.make();await f.prisma.ticket.update({where:{id:t.id},data:{ownerId:f.users.staff,itPriority:"HIGH",currentStatus:"OPEN"}});
  await f.prisma.actionTaken.createMany({data:[1,2].map(n=>({ticketId:t.id,performedById:f.users.admin,assigneeId:f.users.staff,actionAt:new Date(),description:`Investigate issue ${n}`,result:"",followUpRequired:false,followUpNote:"",attachmentNotes:"",workCycle:1}))});
  const d=(await f.call("get","/dashboards/staff")).body;expect(d.metrics.myPendingActions).toBe(2);
  for(const q of ["actionAssignee=me&statusGroup=active","owner=me&statusGroup=active","itPriority=HIGH&statusGroup=active","currentStatus=OPEN"]){const r=await f.call("get","/staff/tickets?"+q);expect(r.status).toBe(200);expect(r.body.totalItems).toBe(1);expect(r.body.items.map((x:{id:number})=>x.id)).toEqual([t.id]);}
  const window=new URLSearchParams({updatedSince:d.recentWindow.from,updatedBefore:d.recentWindow.to});expect((await f.call("get","/staff/tickets?"+window)).body.totalItems).toBe(d.recentTickets.length);
  expect((await f.call("get","/staff/tickets?actionAssignee=me","admin")).body.totalItems).toBe(0);
  expect((await f.call("get","/staff/tickets?statusGroup=active","requester")).status).toBe(403);
  const page2=await f.call("get","/staff/tickets?actionAssignee=me&page=2&pageSize=10");expect(page2.body.items).toEqual([]);expect(page2.body.totalItems).toBe(1);
});
it("validates mutually exclusive and bounded date filters without changing old defaults",async()=>{
  const from="2026-01-01T00:00:00Z",to="2026-01-02T00:00:00Z";
  for(const q of ["updatedSince=2026-02-30T00:00:00Z&updatedBefore=2026-03-01T00:00:00Z","statusGroup=anything","statusGroup=active&currentStatus=OPEN","actionAssignee=1","actionAssignee=me&actionAssignee=me","unknown=1",`updatedSince=${from}`,`updatedSince=${to}&updatedBefore=${from}`,"updatedSince=2026-01-01&updatedBefore=2026-01-02",`updatedSince=${from}&updatedBefore=2099-01-01T00:00:00Z`,`updatedSince=${from}&updatedBefore=${to}&resolvedSince=${from}&resolvedBefore=${to}`,`resolvedSince=${from}&resolvedBefore=${to}&currentStatus=RESOLVED`])expect((await f.call("get","/staff/tickets?"+q)).status,q).toBe(400);
  const t=await f.make();await f.prisma.ticket.update({where:{id:t.id},data:{currentStatus:"CLOSED",resolvedAt:new Date(from)}});
  expect((await f.call("get",`/staff/tickets?resolvedSince=${from}&resolvedBefore=${to}`)).body.items.map((x:{id:number})=>x.id)).toContain(t.id);
  expect((await f.call("get","/staff/tickets")).status).toBe(200);
});
