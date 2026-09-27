import { Prisma, PrismaClient } from "@prisma/client";
import { activeStatuses } from "./dashboard-filters.js";

// Every query is scoped by the authenticated requester, within one read snapshot.
export async function requesterDashboard(prisma: PrismaClient, requesterId: number, now = new Date()) {
  const from = new Date(+now - 7 * 86400000);
  return prisma.$transaction(async tx => {
    const [counts] = await tx.$queryRaw<Array<Record<string, bigint>>>(Prisma.sql`
      SELECT count(*) FILTER (WHERE "currentStatus"::text IN (${Prisma.join(activeStatuses)})) AS open,
        count(*) FILTER (WHERE "currentStatus" = 'WAITING_FOR_REQUESTER') AS waiting,
        count(*) FILTER (WHERE "updatedAt" >= ${from} AND "updatedAt" <= ${now}) AS updated,
        count(*) FILTER (WHERE "currentStatus" IN ('RESOLVED','CLOSED') AND "resolvedAt" >= ${from} AND "resolvedAt" <= ${now}) AS resolved
      FROM "Ticket" WHERE "requesterId" = ${requesterId}`);
    const recentTickets = await tx.$queryRaw(Prisma.sql`
      SELECT t.id, t."ticketNumber", t.summary, t."currentStatus", t."itPriority", t."updatedAt",
        json_build_object('id',r.id,'displayName',r."displayName") AS requester,
        CASE WHEN o.id IS NULL THEN NULL ELSE json_build_object('id',o.id,'displayName',o."displayName",'role',o.role) END AS owner
      FROM "Ticket" t JOIN "User" r ON r.id = t."requesterId" LEFT JOIN "User" o ON o.id = t."ownerId"
      WHERE t."requesterId" = ${requesterId} AND t."updatedAt" >= ${from} AND t."updatedAt" <= ${now}
      ORDER BY t."updatedAt" DESC, t.id DESC LIMIT 5`);
    return {
      generatedAt: now.toISOString(), timeZone: "Asia/Bangkok",
      recentWindow: { from: from.toISOString(), to: now.toISOString() },
      metrics: { openTickets: Number(counts.open), waitingForRequester: Number(counts.waiting), recentlyUpdated: Number(counts.updated), recentlyResolved: Number(counts.resolved) },
      recentTickets,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
