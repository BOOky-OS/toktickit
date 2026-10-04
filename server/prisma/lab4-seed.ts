import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { ActionStatus, PrismaClient, TicketStatus } from "@prisma/client";
import { hashPassword } from "../src/auth/password.js";
import { getPrisma } from "../src/prisma.js";
import { actionJson, actionSelect } from "../src/tickets/actions.js";
import { formatTicketNumber } from "../src/tickets/ticket-number.js";

export const LAB4_DEMO_PASSWORD = "TokTickIT-Lab4-Initial!"; // Public local demo only; first login requires change.
export function requireLab4Seed(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV === "production" || env.LAB4_ALLOW_DEMO_SEED !== "true") throw new Error("Explicit non-production Lab 4 demo opt-in is required.");
  let url: URL;
  try { url = new URL(env.DATABASE_URL ?? ""); } catch { throw new Error("A local demo database URL is required."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || !["/toktickit", "/toktickit_lab4_demo", "/toktickit_lab3_test"].includes(url.pathname)) throw new Error("Use an allowlisted local demo database.");
}
export async function seedLab4Demo(prisma: PrismaClient, env: NodeJS.ProcessEnv = process.env) {
  requireLab4Seed(env);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(334003)`;
    const category = await tx.category.upsert({ where: { name: "Lab 4 Service" }, update: {}, create: { name: "Lab 4 Service" } });
    const system = await tx.relatedSystem.upsert({ where: { name: "Lab 4 Workstation" }, update: {}, create: { name: "Lab 4 Workstation" } });
    const users = [];
    for (const [name, role] of [["requester", "REQUESTER"], ["empty-requester", "REQUESTER"], ["staff", "IT_STAFF"], ["second-staff", "IT_STAFF"], ["empty-staff", "IT_STAFF"], ["admin", "ADMIN"]] as const) {
      const seedKey = `lab4.user.${name}`;
      let user = await tx.user.findUnique({ where: { seedKey } });
      if (!user) user = await tx.user.create({ data: { seedKey, email: `${name}@lab4.example.test`, displayName: `Lab 4 ${name}`, role, passwordHash: await hashPassword(LAB4_DEMO_PASSWORD) } });
      users.push(user);
    }
    const [requester, , staff, second] = users;
    for (let i = 0; i < 16; i++) {
      const seedKey = `lab4.ticket.${i + 1}`;
      // Never change an existing Ticket, its actions, revisions or passwords on repeat.
      if (await tx.ticket.findUnique({ where: { seedKey } })) continue;
      if (!requester.isActive || requester.role !== "REQUESTER" || [staff, second].some(u => !u.isActive || !["IT_STAFF", "ADMIN"].includes(u.role))) throw new Error("Restore demo account eligibility before inserting missing fixtures.");
      const status = Object.values(TicketStatus)[i % 8], priority = (["LOW", "MEDIUM", "HIGH"] as const)[i % 3];
      const date = new Date(Date.now() - (i + 2) * 86_400_000), event = new Date(date.getTime() + 3_600_000);
      const sequence = await tx.$queryRaw<Array<{ value: bigint }>>`SELECT nextval('ticket_number_seq')::bigint AS value`;
      const done = status === "RESOLVED" || status === "CLOSED";
      const ticket = await tx.ticket.create({ data: { seedKey, ticketNumber: formatTicketNumber(sequence[0].value, date), ticketDate: date, createdAt: date, updatedAt: event,
        requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, clientSubmissionKey: randomUUID(),
        ownerId: status === "NEW" || status === "OPEN" ? null : staff.id, currentStatus: status, requestedPriority: priority, itPriority: priority,
        summary: `Lab 4 service investigation ${i + 1}`, description: "Investigate the workstation connection and record the result.",
        resolvedAt: done ? event : null, resolutionSummary: done ? "Service restored and verified." : null,
        closedAt: status === "CLOSED" ? event : null, cancelledAt: status === "CANCELLED" ? event : null,
        cancellationReason: status === "CANCELLED" ? "Duplicate request confirmed." : null } });
      const statuses: ActionStatus[] = status === "NEW" ? [] : done ? ["COMPLETED"] : status === "CANCELLED" ? ["CANCELLED"] : ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
      for (const [n, actionStatus] of statuses.entries()) {
        const performer = n % 2 ? second : staff;
        const action = await tx.actionTaken.create({ data: { seedKey: `${seedKey}.action.${n + 1}`, ticketId: ticket.id, performedById: performer.id, assigneeId: second.id,
          actionAt: event, createdAt: event, updatedAt: event, description: `Connection check ${n + 1}`, result: "Connection tested and findings recorded.", followUpRequired: actionStatus === "PLANNED",
          followUpNote: actionStatus === "PLANNED" ? "Repeat connection test with requester." : "", attachmentNotes: "No attachment needed.", status: actionStatus, workCycle: 1,
          completedAt: actionStatus === "COMPLETED" ? event : null, cancelledAt: actionStatus === "CANCELLED" ? event : null,
          cancellationReason: actionStatus === "CANCELLED" ? "Investigation step no longer needed." : null }, select: actionSelect });
        await tx.actionRevision.create({ data: { actionId: action.id, actorId: performer.id, version: 1, event: "CREATE", snapshot: actionJson(action), createdAt: event } });
      }
    }
    return { demoUsers: 6, demoTickets: 16 };
  }, { timeout: 120_000, maxWait: 10_000 });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const envFile = resolve(import.meta.dirname, "../.env");
  if (existsSync(envFile)) loadEnvFile(envFile); // Existing shell values take precedence.
  const prisma = getPrisma();
  seedLab4Demo(prisma).then(() => console.log("Lab 4 local demo is ready; existing edits and credentials retained."))
    .catch(() => { console.error("Lab 4 seed failed. Check opt-in, local database, migrations and fixture identities. Credentials are not logged."); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
