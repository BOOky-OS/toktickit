import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { databaseFixture, executeScript, checkSchemaDrift } from "./database-fixture.js";

const fixtureSql = `
INSERT INTO "DevelopmentRequester" (id,"displayName",email,"isActive","updatedAt") VALUES
 (42,'Legacy Active','  Legacy.Active@Example.test  ',true,'2026-08-01'),
 (91,'Legacy Inactive','legacy.inactive@example.test',false,'2026-08-02');
SELECT setval('"DevelopmentRequester_id_seq"',200,true);
INSERT INTO "Category" (id,name,"isActive","updatedAt") VALUES (7,'Historical category',false,'2026-08-01');
INSERT INTO "RelatedSystem" (id,name,"isActive","updatedAt") VALUES (11,'Historical system',false,'2026-08-01');
INSERT INTO "Ticket" (id,"ticketNumber","ticketDate","requesterId","categoryId","relatedSystemId",summary,description,"requestedPriority","itPriority","clientSubmissionKey","updatedAt") VALUES
 (63,'TKT-2026-000301','2026-08-03',42,7,11,'Legacy active file','Original submitted description','HIGH','UNASSIGNED','00000000-0000-4000-8000-000000000001','2026-08-04'),
 (64,'TKT-2026-000302','2026-08-05',91,7,11,'Legacy removed file','Original second description','LOW','MEDIUM','00000000-0000-4000-8000-000000000002','2026-08-06');
SELECT setval('ticket_number_seq',400,true);
SELECT setval('"Ticket_id_seq"',120,true);
INSERT INTO "Attachment" (id,"ticketId","originalFilename","storageKey","mimeType","sizeBytes","removedAt","removalReason","removedByRequesterId") VALUES
 (80,63,'retained.pdf','active-key','application/pdf',12,NULL,NULL,NULL),
 (81,64,'removed.pdf','removed-key','application/pdf',13,'2026-08-07','No longer required',91);
SELECT setval('"Attachment_id_seq"',150,true);
`;

async function snapshot(prisma: Awaited<ReturnType<typeof databaseFixture>>["prisma"], table: string) {
  return prisma.$queryRawUnsafe<Array<{ row: Record<string, unknown> }>>(`SELECT to_jsonb(t) AS row FROM "${table}" t ORDER BY id`);
}

describe("Lab 3 migration from actual Lab 2 migrations", () => {
  it("preserves identities, historical fields, FKs, file bytes and sequence positions", async () => {
    const db = await databaseFixture(true);
    const storage = await mkdtemp(join(tmpdir(), "toktickit-migration-files-"));
    try {
      await writeFile(join(storage, "active-key"), "%PDF-1.7\nold");
      await writeFile(join(storage, "removed-key"), "%PDF-1.7\ngone");
      const digest = async (key: string) => createHash("sha256").update(await readFile(join(storage, key))).digest("hex");
      const beforeFiles = await Promise.all([digest("active-key"), digest("removed-key")]);
      executeScript(db.url, fixtureSql);
      const tickets = await snapshot(db.prisma, "Ticket");
      const attachments = await snapshot(db.prisma, "Attachment");
      const users = await snapshot(db.prisma, "DevelopmentRequester");
      const refs = await Promise.all([snapshot(db.prisma, "Category"), snapshot(db.prisma, "RelatedSystem")]);
      db.upgrade();
      checkSchemaDrift(db.url);
      const migrated = await snapshot(db.prisma, "User");
      expect(migrated).toHaveLength(2);
      for (let i = 0; i < users.length; i++) {
        expect(migrated[i].row).toMatchObject({ ...users[i].row,
          email: String(users[i].row.email).trim().toLowerCase(), role: "REQUESTER",
          passwordHash: null, mustChangePassword: true, version: 1 });
      }
      const newTickets = await snapshot(db.prisma, "Ticket");
      tickets.forEach(({ row }, i) => expect(newTickets[i].row).toMatchObject({ ...row,
        itPriority: row.itPriority === "UNASSIGNED" ? row.requestedPriority : row.itPriority,
        ownerId: null, version: 1, requesterResolutionIndicatedAt: null }));
      const newFiles = await snapshot(db.prisma, "Attachment");
      attachments.forEach(({ row }, i) => {
        const { removedByRequesterId, ...rest } = row;
        expect(newFiles[i].row).toEqual({ ...rest, removedByUserId: removedByRequesterId });
      });
      expect(await Promise.all([snapshot(db.prisma, "Category"), snapshot(db.prisma, "RelatedSystem")])).toEqual(refs);
      expect(await Promise.all([digest("active-key"), digest("removed-key")])).toEqual(beforeFiles);
      expect(await db.prisma.$queryRawUnsafe('SELECT nextval(\'"User_id_seq"\') AS value')).toEqual([{ value: 201n }]);
      expect(await db.prisma.$queryRawUnsafe("SELECT nextval('ticket_number_seq') AS value")).toEqual([{ value: 401n }]);
      expect(await db.prisma.$queryRawUnsafe('SELECT nextval(\'"Ticket_id_seq"\') AS value')).toEqual([{ value: 121n }]);
      expect(await db.prisma.$queryRawUnsafe('SELECT nextval(\'"Attachment_id_seq"\') AS value')).toEqual([{ value: 151n }]);
      await expect(db.prisma.$executeRawUnsafe('DELETE FROM "User" WHERE id=91')).rejects.toThrow();
      expect((await snapshot(db.prisma, "Attachment"))[1].row.removedByUserId).toBe(91);
    } finally {
      await db.dispose();
      if (!resolve(storage).startsWith(resolve(tmpdir()) + sep + "toktickit-migration-files-")) {
        throw new Error("Unsafe temporary fixture directory.");
      }
      await rm(storage, { recursive: true });
    }
  }, 60_000);

  it.each(["duplicate", "invalid"])("aborts %s email preflight without changing the legacy schema or data", async (kind) => {
    const db = await databaseFixture(true);
    try {
      executeScript(db.url, fixtureSql);
      await db.prisma.$executeRawUnsafe('UPDATE "DevelopmentRequester" SET email=$1 WHERE id=91',
        kind === "duplicate" ? "legacy.active@example.test" : "invalid email");
      const before = await snapshot(db.prisma, "DevelopmentRequester");
      expect(() => db.upgrade()).toThrow(/Lab 3 migration preflight/);
      expect(await snapshot(db.prisma, "DevelopmentRequester")).toEqual(before);
      expect(await db.prisma.$queryRawUnsafe('SELECT to_regclass(\'"User"\')::text AS name')).toEqual([{ name: null }]);
      expect((await snapshot(db.prisma, "Ticket"))[0].row.itPriority).toBe("UNASSIGNED");
    } finally { await db.dispose(); }
  }, 60_000);

  it("resynchronizes a lagging user sequence above the highest preserved ID", async () => {
    const db = await databaseFixture(true);
    try {
      executeScript(db.url, fixtureSql);
      await db.prisma.$executeRawUnsafe('SELECT setval(\'"DevelopmentRequester_id_seq"\',1,false)');
      db.upgrade();
      expect(await db.prisma.$queryRawUnsafe('SELECT nextval(\'"User_id_seq"\') AS value')).toEqual([{ value: 92n }]);
    } finally { await db.dispose(); }
  }, 60_000);
});
