import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { Prisma, PrismaClient, TicketStatus, UserRole } from "@prisma/client";
import { hashPassword } from "../src/auth/password.js";
import { getPrisma } from "../src/prisma.js";
import { formatTicketNumber } from "../src/tickets/ticket-number.js";
import { CATEGORIES, DEVELOPMENT_REQUESTERS, RELATED_SYSTEMS, seedReferenceData } from "./seed.js";
import { requireLocalMaintenance } from "./lab3-provision.js";

// Deliberately public, opt-in local demo credential; never use for deployed accounts.
export const DEMO_INITIAL_PASSWORD = "TokTickIT-Lab3-Initial!";
const accounts = [
  ...DEVELOPMENT_REQUESTERS.map((u, i) => ({ ...u, role: UserRole.REQUESTER, seedKey: `lab3.requester.${i + 1}` })),
  { displayName: "Alex Chen", email: "alex.chen@example.test", isActive: true, role: UserRole.IT_STAFF, seedKey: "lab3.staff.1" },
  { displayName: "Priya Patel", email: "priya.patel@example.test", isActive: true, role: UserRole.IT_STAFF, seedKey: "lab3.staff.2" },
  { displayName: "Daniel Kim", email: "daniel.kim@example.test", isActive: true, role: UserRole.IT_STAFF, seedKey: "lab3.staff.3" },
  { displayName: "Sam Wilson", email: "sam.wilson@example.test", isActive: false, role: UserRole.IT_STAFF, seedKey: "lab3.staff.4" },
  { displayName: "Morgan Admin", email: "morgan.admin@example.test", isActive: true, role: UserRole.ADMIN, seedKey: "lab3.admin.1" },
];

const paths: TicketStatus[][] = [
  [], ["OPEN"], ["OPEN", "IN_PROGRESS"], ["OPEN", "WAITING_FOR_REQUESTER"],
  ["OPEN", "IN_PROGRESS", "RESOLVED"], ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
  ["OPEN", "IN_PROGRESS", "RESOLVED", "REOPENED"], ["CANCELLED"],
];
const scenarios = [
  ["Campus Wi-Fi disconnects", "Connection drops during online classes in the library; reconnecting only helps briefly."],
  ["Laptop battery drains quickly", "The laptop battery runs down within an hour even after a full overnight charge."],
  ["Email attachments cannot open", "Course handout attachments fail to open in the email application on the campus workstation."],
  ["Grade submission is unavailable", "Submitting the completed grade form returns an error and the entered grades are not saved."],
  ["LEB2 course page loads slowly", "The course materials page takes several minutes to load when accessed from the faculty office."],
  ["Printer queue is stuck", "Print jobs stay in the queue although the shared printer is online and has enough paper."],
  ["VPN session disconnects", "The remote VPN session disconnects while accessing the shared research drive from home."],
];

export async function seedLab3Demo(prisma: PrismaClient, env: NodeJS.ProcessEnv = process.env) {
  requireLocalMaintenance(env);
  if (env.LAB3_ALLOW_DEMO_SEED !== "true") throw new Error("Set LAB3_ALLOW_DEMO_SEED=true to opt into local demonstration data.");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(334003)`;
    await seedReferenceData(tx);
    const users = [];
    for (const account of accounts) {
      let user = await tx.user.findUnique({ where: { seedKey: account.seedKey } });
      if (!user) {
        user = await tx.user.findUnique({ where: { email: account.email } });
        if (user) {
          if (user.seedKey) throw new Error("Demo account identity conflicts with another seed key.");
          // Claim only fixture identity metadata. Existing credentials/profile remain untouched.
          user = await tx.user.update({ where: { id: user.id }, data: { seedKey: account.seedKey, updatedAt: user.updatedAt } });
        } else {
          user = await tx.user.create({ data: { ...account, passwordHash: await hashPassword(DEMO_INITIAL_PASSWORD) } });
        }
      }
      users.push(user);
    }
    const requesters = users.filter((u) => u.role === "REQUESTER" && u.isActive);
    const staff = users.filter((u) => u.role === "IT_STAFF" && u.isActive);
    const ownerCandidates = users.filter((u) => ["IT_STAFF", "ADMIN"].includes(u.role) && u.isActive);
    const categories = await Promise.all(CATEGORIES.map((c) => tx.category.findUniqueOrThrow({ where: { name: c.name } })));
    const systems = await Promise.all(RELATED_SYSTEMS.map((s) => tx.relatedSystem.findUniqueOrThrow({ where: { name: s.name } })));
    for (let i = 0; i < 32; i++) {
      const seedKey = `lab3.ticket.${String(i + 1).padStart(2, "0")}`;
      // Skip the entire existing fixture, including its communications and history.
      if (await tx.ticket.findUnique({ where: { seedKey } })) continue;
      if (!requesters.length || !staff.length || !ownerCandidates.length) {
        throw new Error("Missing active demo Requester/IT Staff; restore eligibility manually before adding missing demo tickets.");
      }
      const requester = requesters[i % requesters.length];
      const author = staff[i % staff.length];
      const sequence = await tx.$queryRaw<Array<{ value: bigint }>>(Prisma.sql`SELECT nextval('ticket_number_seq')::bigint AS value`);
      const ticketDate = new Date(Date.now() - (40 - i) * 86_400_000);
      const steps = paths[i % paths.length];
      const currentStatus = steps.at(-1) ?? "NEW";
      const eventTime = (offset: number) => new Date(ticketDate.getTime() + offset * 3_600_000);
      const ownerId = currentStatus === "NEW" || (currentStatus === "OPEN" && i % 2 === 1)
        ? null : ownerCandidates[i % ownerCandidates.length].id;
      const reason = "Verified service restored and documented the outcome.";
      const ticket = await tx.ticket.create({ data: {
        seedKey, ticketNumber: formatTicketNumber(sequence[0].value, ticketDate), ticketDate,
        requesterId: requester.id, categoryId: categories[i % categories.length].id,
        relatedSystemId: systems[i % systems.length].id,
        summary: `${scenarios[i % scenarios.length][0]} (${i + 1})`, description: scenarios[i % scenarios.length][1],
        requestedPriority: (["LOW", "MEDIUM", "HIGH"] as const)[i % 3],
        itPriority: (["LOW", "MEDIUM", "HIGH"] as const)[i % 3], currentStatus, ownerId,
        clientSubmissionKey: randomUUID(), createdAt: ticketDate, updatedAt: eventTime(8),
        resolvedAt: ["RESOLVED", "CLOSED"].includes(currentStatus) ? eventTime(5) : null,
        closedAt: currentStatus === "CLOSED" ? eventTime(6) : null,
        cancelledAt: currentStatus === "CANCELLED" ? eventTime(3) : null,
        resolutionSummary: ["RESOLVED", "CLOSED"].includes(currentStatus) ? reason : null,
        cancellationReason: currentStatus === "CANCELLED" ? "Duplicate request confirmed by the requester." : null,
        requesterResolutionIndicatedAt: currentStatus === "WAITING_FOR_REQUESTER" && i % 2 ? eventTime(7) : null,
        publicComments: { create: { seedKey: `${seedKey}.public`, authorId: requester.id,
          body: "I can reproduce this issue and have shared the details with support.", createdAt: eventTime(1) } },
        internalNotes: { create: { seedKey: `${seedKey}.internal`, authorId: author.id,
          body: "Checked the service logs. Follow up with the requester before closing the request.", createdAt: eventTime(2) } },
      } });
      let fromStatus: TicketStatus = "NEW";
      for (let step = 0; step < steps.length; step++) {
        const toStatus = steps[step];
        await tx.ticketStatusChange.create({ data: {
          ticketId: ticket.id, authorId: author.id, fromStatus, toStatus, createdAt: eventTime(step + 3),
          reason: ["RESOLVED", "CLOSED", "REOPENED", "CANCELLED"].includes(toStatus)
            ? toStatus === "CANCELLED" ? "Duplicate request confirmed by the requester." : reason : null,
        } });
        fromStatus = toStatus;
      }
    }
    return { demoUsers: users.length, demoTickets: 32 };
  }, { timeout: 120_000, maxWait: 10_000 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prisma = getPrisma();
  seedLab3Demo(prisma).then(() => console.log("Local Lab 3 demonstration data is ready; existing edits and credentials were retained."))
    .catch(() => {
      console.error("Demo seed failed. Check explicit opt-in, non-production mode, migrated database and active demo identities. No credentials are logged.");
      process.exitCode = 1;
    }).finally(() => prisma.$disconnect());
}
