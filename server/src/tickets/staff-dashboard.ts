import { Router } from "express";
import { Prisma, PrismaClient, TicketStatus } from "@prisma/client";
import { asyncRoute, invalid } from "../auth/security.js";
import { getPrisma } from "../prisma.js";
import { activeStatuses } from "./dashboard-filters.js";
const active=Prisma.sql`(${Prisma.join(activeStatuses)})`;
// Fixed, selected public fields: no private notes, revisions, storage keys or credentials.
const summary=Prisma.sql`t.id, t."ticketNumber", t."ticketDate", t.summary, t."updatedAt", t.version,
 t."currentStatus", t."requestedPriority", t."itPriority",
 json_build_object('id',r.id,'displayName',r."displayName") AS requester,
 CASE WHEN o.id IS NULL THEN NULL ELSE json_build_object('id',o.id,'displayName',o."displayName",'role',o.role) END AS owner,
 json_build_object('id',c.id,'name',c.name) AS category, json_build_object('id',s.id,'name',s.name) AS "relatedSystem"`;
const joins=Prisma.sql`FROM "Ticket" t JOIN "User" r ON r.id=t."requesterId" LEFT JOIN "User" o ON o.id=t."ownerId"
 JOIN "Category" c ON c.id=t."categoryId" JOIN "RelatedSystem" s ON s.id=t."relatedSystemId"`;
export async function staffDashboard(prisma:PrismaClient, actorId:number, now=new Date()) {
  return prisma.$transaction(async tx=>{
    const from=new Date(+now-7*24*60*60*1000);
    const counts=await tx.$queryRaw<Array<Record<string,bigint>>>(Prisma.sql`SELECT
      count(*) FILTER (WHERE "currentStatus"::text IN ${active} AND "ownerId" IS NULL) AS unassigned,
      count(*) FILTER (WHERE "currentStatus"::text IN ${active} AND "ownerId"=${actorId}) AS owned,
      ${Prisma.join(Object.values(TicketStatus).map(s=>Prisma.sql`count(*) FILTER (WHERE "currentStatus"::text=${s}) AS ${Prisma.raw('"'+s+'"')}`))},
      ${Prisma.join(["LOW","MEDIUM","HIGH"].map(p=>Prisma.sql`count(*) FILTER (WHERE "currentStatus"::text IN ${active} AND "itPriority"::text=${p}) AS ${Prisma.raw('"'+p+'"')}`))},
      (SELECT count(*) FROM "ActionTaken" a JOIN "Ticket" parent ON parent.id=a."ticketId"
       WHERE a."assigneeId"=${actorId} AND a.status IN ('PLANNED','IN_PROGRESS') AND parent."currentStatus"::text IN ${active}) AS pending FROM "Ticket"`);
    const recentTickets=await tx.$queryRaw(Prisma.sql`SELECT ${summary} ${joins} WHERE t."updatedAt">=${from} AND t."updatedAt"<=${now} ORDER BY t."updatedAt" DESC,t.id DESC LIMIT 5`);
    const urgentTickets=await tx.$queryRaw(Prisma.sql`SELECT ${summary} ${joins} WHERE t."currentStatus"::text IN ${active} AND t."itPriority"='HIGH' ORDER BY t."updatedAt" DESC,t.id DESC LIMIT 5`);
    const myPendingActions=await tx.$queryRaw(Prisma.sql`SELECT a.id,a."ticketId",left(a.description,120) AS description,a.status,a."updatedAt",
      json_build_object('id',t.id,'ticketNumber',t."ticketNumber",'summary',t.summary,'currentStatus',t."currentStatus") AS ticket
      FROM "ActionTaken" a JOIN "Ticket" t ON t.id=a."ticketId" WHERE a."assigneeId"=${actorId} AND a.status IN ('PLANNED','IN_PROGRESS')
      AND t."currentStatus"::text IN ${active} ORDER BY a."updatedAt" DESC,a.id DESC LIMIT 5`);
    const row=counts[0], read=(key:string)=>Number(row[key]);
    return {generatedAt:now.toISOString(),timeZone:"Asia/Bangkok",recentWindow:{from:from.toISOString(),to:now.toISOString()},
      metrics:{unassignedTickets:read("unassigned"),myOwnedTickets:read("owned"),myPendingActions:read("pending"),
      byStatus:Object.fromEntries(Object.values(TicketStatus).map(s=>[s,read(s)])),activeByPriority:Object.fromEntries(["LOW","MEDIUM","HIGH"].map(p=>[p,read(p)]))},
      recentTickets,urgentTickets,myPendingActions};
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}
export const dashboardRouter=Router();
dashboardRouter.get("/dashboards/staff",asyncRoute(async(req,res)=>{
  if(Object.keys(req.query).length || (req.body && Object.keys(req.body).length))throw invalid();
  res.json(await staffDashboard(getPrisma(),res.locals.actor.user.id));
}));
