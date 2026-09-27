import {afterAll,beforeAll,expect,it,vi} from "vitest";
import {PrismaClient} from "@prisma/client";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {cpus,totalmem,platform,release} from "node:os";
import {actionFixture} from "./action-fixture.js";
import {getPrisma} from "../../src/prisma.js";
vi.mock("../../src/prisma.js",()=>({getPrisma:vi.fn()}));let f:Awaited<ReturnType<typeof actionFixture>>;
beforeAll(async()=>{f=await actionFixture();},60000);afterAll(async()=>{await f?.dispose();});
it("bounds query count and meets local p95 budget at 1000 Tickets/3000 actions",async()=>{
  const template=await f.make();const t={...template};
  await f.prisma.ticket.delete({where:{id:t.id}});
  await f.prisma.$executeRaw`INSERT INTO "Ticket" ("ticketNumber","ticketDate",summary,description,"requestedPriority","itPriority","currentStatus","requesterId","categoryId","relatedSystemId","clientSubmissionKey","updatedAt","ownerId") SELECT 'PERF-'||n,now(),'Performance smoke','Fixture only','HIGH','HIGH','OPEN',${t.requesterId},${t.categoryId},${t.relatedSystemId},md5('perf-key-'||n)::uuid,now(),CASE WHEN n%2=0 THEN ${f.users.staff} ELSE NULL END FROM generate_series(1,1000) n`;
  await f.prisma.$executeRaw`INSERT INTO "ActionTaken" ("ticketId","performedById","assigneeId","actionAt",description,result,"followUpRequired","followUpNote","attachmentNotes",status,"workCycle","updatedAt") SELECT t.id,${f.users.admin},${f.users.staff},now(),'Performance action','','f','','','PLANNED',1,now() FROM "Ticket" t CROSS JOIN generate_series(1,3)`;
  const observed=new PrismaClient({datasources:{db:{url:f.url}},log:[{emit:"event",level:"query"}]});const queries:string[]=[];observed.$on("query",e=>queries.push(e.query));vi.mocked(getPrisma).mockReturnValue(observed);
  try{
    for(let n=0;n<5;n++)expect((await f.call("get","/dashboards/requester","requester")).status).toBe(200);
    const times:number[]=[],counts:number[]=[];
    for(let n=0;n<30;n++){queries.length=0;const start=performance.now();const r=await f.call("get","/dashboards/requester","requester");times.push(performance.now()-start);expect(r.status).toBe(200);expect(r.body.metrics).toMatchObject({openTickets:1000,waitingForRequester:0,recentlyUpdated:1000,recentlyResolved:0});expect(r.body.recentTickets).toHaveLength(5);
      // Service reads use explicit raw SELECTs; authentication's Prisma reads are excluded.
      counts.push(queries.filter(q=>/^SELECT\s+(count\(\*\)|t\.id|a\.id)/.test(q.trimStart())).length);
    }
    const plan=await observed.$queryRaw`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT t.id FROM "Ticket" t WHERE t."requesterId"=${f.users.requester} AND t."updatedAt" >= now() - interval '7 days' AND t."updatedAt" <= now() ORDER BY t."updatedAt" DESC,t.id DESC LIMIT 5`;
    const p95=[...times].sort((a,b)=>a-b)[Math.ceil(.95*times.length)-1];
    const dir=resolve("../output");await mkdir(dir,{recursive:true});await writeFile(resolve(dir,"lab4-requester-performance.json"),JSON.stringify({machine:{platform:platform(),release:release(),cpu:cpus()[0].model,memoryGB:totalmem()/1024**3,node:process.version},tickets:1000,actions:3000,warmups:5,timesMs:times,p95Ms:p95,readQueries:counts,queryPlan:plan},null,2));
    expect(counts).toEqual(Array(30).fill(2));expect(p95).toBeLessThanOrEqual(1000);
  }finally{vi.mocked(getPrisma).mockReturnValue(f.prisma);await observed.$disconnect();}
},60000);
