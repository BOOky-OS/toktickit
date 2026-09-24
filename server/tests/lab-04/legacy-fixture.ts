import { randomUUID, createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { hashPassword } from "../../src/auth/password.js";
import { issueSession } from "../../src/auth/security.js";
import { databaseFixture } from "../lab-03/database-fixture.js";
export const migration = "20260924060000_lab4_actions";
const tables = ["User", "Category", "RelatedSystem", "Session", "Ticket", "Attachment", "PublicComment", "InternalNote", "TicketStatusChange"];
export async function oldSnapshot(prisma: Awaited<ReturnType<typeof databaseFixture>>["prisma"]) {
  const snapshot: Record<string, unknown> = {};
  for (const table of tables) snapshot[table] = await prisma.$queryRawUnsafe(`SELECT to_jsonb(t) ${table === "Ticket" ? "- 'workCycle'" : ""} AS row FROM "${table}" t ORDER BY id`);
  return snapshot;
}
export async function legacyFixture() {
  const db = await databaseFixture(migration);
  const storage = await mkdtemp(join(tmpdir(), "toktickit-lab4-files-"));
  try {
    const user = await db.prisma.user.create({ data: { displayName: "Legacy Requester", email: "legacy@lab4.test", passwordHash: await hashPassword("Legacy password 123!"), mustChangePassword: false } });
    const staff = await db.prisma.user.create({ data: { displayName: "Legacy Staff", email: "staff@lab4.test", role: "IT_STAFF", passwordHash: await hashPassword("Legacy staff password!"), mustChangePassword: false } });
    const category = await db.prisma.category.create({ data: { name: "Legacy category" } });
    const system = await db.prisma.relatedSystem.create({ data: { name: "Legacy system" } });
    const session = await issueSession(db.prisma, user.id);
    const tickets = await db.prisma.$queryRaw<Array<{ id: number }>>`INSERT INTO "Ticket" ("ticketNumber","requesterId","categoryId","relatedSystemId",summary,description,"requestedPriority","itPriority","clientSubmissionKey","updatedAt","currentStatus","ownerId","resolvedAt","resolutionSummary") VALUES ('TKT-2026-888888',${user.id},${category.id},${system.id},'Retained legacy ticket','Original details','HIGH','MEDIUM',${randomUUID()}::uuid,now(),'RESOLVED',${staff.id},now(),'Legacy resolution') RETURNING id`;
    const ticketId = tickets[0].id;
    await db.prisma.attachment.create({ data: { ticketId, storageKey: "legacy-file", originalFilename: "original.pdf", mimeType: "application/pdf", sizeBytes: 20 } });
    await writeFile(join(storage, "legacy-file"), "%PDF-1.7\nlegacy data");
    await db.prisma.publicComment.create({ data: { ticketId, authorId: user.id, body: "Original public communication" } });
    await db.prisma.internalNote.create({ data: { ticketId, authorId: staff.id, body: "Original private note" } });
    await db.prisma.ticketStatusChange.create({ data: { ticketId, authorId: staff.id, fromStatus: "IN_PROGRESS", toStatus: "RESOLVED", reason: "Original resolution" } });
    const fileHash = async () => createHash("sha256").update(await readFile(join(storage, "legacy-file"))).digest("hex");
    return { ...db, ticketId, user, staff, session, storage, fileHash,
      dispose: async () => {
        await db.dispose();
        if (!resolve(storage).startsWith(resolve(tmpdir()) + sep + "toktickit-lab4-files-")) throw new Error("Unsafe fixture cleanup.");
        await rm(storage, { recursive: true });
      } };
  } catch (error) { await db.dispose(); throw error; }
}
