import { scrypt } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { seedLab3Demo, DEMO_INITIAL_PASSWORD } from "../../prisma/lab3-seed.js";
import { provisionInitialPasswords } from "../../prisma/lab3-provision.js";
import { databaseFixture } from "./database-fixture.js";

const demoEnv = { NODE_ENV: "test", LAB3_ALLOW_DEMO_SEED: "true" };
const fixtures: Awaited<ReturnType<typeof databaseFixture>>[] = [];
async function fresh() { const db = await databaseFixture(); fixtures.push(db); return db.prisma; }
afterEach(async () => { for (const fixture of fixtures.splice(0)) await fixture.dispose(); });

async function matches(password: string, encoded: string) {
  const [scheme, version, n, r, p, salt, key] = encoded.split("$");
  expect([scheme, version, n, r, p]).toEqual(["scrypt", "v1", "131072", "8", "1"]);
  expect(Buffer.from(salt, "hex")).toHaveLength(16);
  const result = await new Promise<Buffer>((resolve, reject) => scrypt(password, Buffer.from(salt, "hex"), 64,
    { N: Number(n), r: Number(r), p: Number(p), maxmem: 256 * 1024 * 1024 },
    (error, derived) => error ? reject(error) : resolve(derived)));
  return result.toString("hex") === key;
}

describe("Lab 3 safe demo seed and initial provisioning", () => {
  it("seeds required roles, all workflow statuses/priorities and communication without plaintext credentials", async () => {
    const prisma = await fresh();
    await seedLab3Demo(prisma, demoEnv);
    const users = await prisma.user.findMany();
    const count = (role: string, isActive: boolean) => users.filter((u) => u.role === role && u.isActive === isActive).length;
    expect(count("REQUESTER", true)).toBeGreaterThanOrEqual(4);
    expect(count("REQUESTER", false)).toBeGreaterThanOrEqual(1);
    expect(count("IT_STAFF", true)).toBeGreaterThanOrEqual(3);
    expect(count("IT_STAFF", false)).toBeGreaterThanOrEqual(1);
    expect(count("ADMIN", true)).toBeGreaterThanOrEqual(1);
    expect(users.every((u) => u.mustChangePassword && u.passwordHash && !u.passwordHash.includes(DEMO_INITIAL_PASSWORD))).toBe(true);
    expect(new Set(users.map((u) => u.passwordHash)).size).toBe(users.length);
    expect(await matches(DEMO_INITIAL_PASSWORD, users[0].passwordHash!)).toBe(true);
    const tickets = await prisma.ticket.findMany({ include: { owner: true } });
    expect(tickets.length).toBeGreaterThanOrEqual(30);
    expect(new Set(tickets.map((t) => t.currentStatus)).size).toBe(8);
    expect(new Set(tickets.map((t) => t.itPriority))).toEqual(new Set(["LOW", "MEDIUM", "HIGH"]));
    expect(tickets.some((t) => !t.ownerId)).toBe(true);
    expect(tickets.filter((t) => t.ownerId).every((t) => t.owner?.isActive && ["IT_STAFF", "ADMIN"].includes(t.owner.role))).toBe(true);
    expect(await prisma.category.count()).toBe(4);
    expect(await prisma.relatedSystem.count()).toBe(7);
    expect(await prisma.publicComment.count()).toBeGreaterThan(0);
    expect(await prisma.internalNote.count()).toBeGreaterThan(0);
    expect(await prisma.ticketStatusChange.count()).toBeGreaterThan(0);
  }, 90_000);

  it("re-seeding preserves edited email/name/role/activation, credentials, tickets and communication", async () => {
    const prisma = await fresh();
    await seedLab3Demo(prisma, demoEnv);
    const user = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true } });
    const ticket = await prisma.ticket.findFirstOrThrow();
    const comment = await prisma.publicComment.findFirstOrThrow();
    const note = await prisma.internalNote.findFirstOrThrow();
    const edited = await prisma.user.update({ where: { id: user.id }, data: {
      displayName: "Edited identity", email: "changed@example.test", role: "ADMIN", isActive: false,
      passwordHash: "retained-admin-reset-hash", mustChangePassword: false, passwordChangedAt: new Date("2026-09-01"), version: 9,
    } });
    await prisma.ticket.update({ where: { id: ticket.id }, data: { summary: "Staff edited this Ticket", itPriority: "HIGH", version: 7 } });
    await prisma.publicComment.update({ where: { id: comment.id }, data: { body: "Preserve existing public fixture" } });
    await prisma.internalNote.update({ where: { id: note.id }, data: { body: "Preserve existing private fixture" } });
    const before = await Promise.all([prisma.user.findMany({ orderBy: { id: "asc" } }), prisma.ticket.findMany({ orderBy: { id: "asc" } }),
      prisma.publicComment.findMany({ orderBy: { id: "asc" } }), prisma.internalNote.findMany({ orderBy: { id: "asc" } }),
      prisma.ticketStatusChange.findMany({ orderBy: { id: "asc" } })]);
    await seedLab3Demo(prisma, demoEnv);
    expect(await Promise.all([prisma.user.findMany({ orderBy: { id: "asc" } }), prisma.ticket.findMany({ orderBy: { id: "asc" } }),
      prisma.publicComment.findMany({ orderBy: { id: "asc" } }), prisma.internalNote.findMany({ orderBy: { id: "asc" } }),
      prisma.ticketStatusChange.findMany({ orderBy: { id: "asc" } })])).toEqual(before);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toEqual(edited);
  }, 90_000);

  it("provisions null hashes only, preserves inactive users and does not undo later password changes", async () => {
    const prisma = await fresh();
    const a = await prisma.user.create({ data: { displayName: "Legacy Person", email: "a@example.test" } });
    const b = await prisma.user.create({ data: { displayName: "Inactive Person", email: "b@example.test", isActive: false } });
    const password = "Legacy initial password 123";
    expect(await provisionInitialPasswords(prisma, password, { NODE_ENV: "test" })).toBe(2);
    const active = await prisma.user.findUniqueOrThrow({ where: { id: a.id } });
    const inactive = await prisma.user.findUniqueOrThrow({ where: { id: b.id } });
    expect(await matches(password, active.passwordHash!)).toBe(true);
    expect(await matches(password, inactive.passwordHash!)).toBe(true);
    expect(active.passwordHash).not.toBe(inactive.passwordHash);
    expect(inactive.isActive).toBe(false);
    expect(active.mustChangePassword && inactive.mustChangePassword).toBe(true);
    const changed = await prisma.user.update({ where: { id: a.id }, data: { passwordHash: "preserved-changed-hash", mustChangePassword: false } });
    expect(await provisionInitialPasswords(prisma, "A different initial password", { NODE_ENV: "test" })).toBe(0);
    expect(await prisma.user.findUnique({ where: { id: a.id } })).toEqual(changed);
  }, 90_000);

  it("links migrated demo identities without provisioning or changing legacy profile/reference edits", async () => {
    const db = await databaseFixture(true);
    fixtures.push(db);
    await db.prisma.$executeRawUnsafe(`INSERT INTO "DevelopmentRequester" (id,"displayName",email,"isActive","updatedAt")
      VALUES (91,'Existing edited person','jennifer.anderson@example.test',false,'2026-08-01')`);
    await db.prisma.$executeRawUnsafe(`INSERT INTO "Category" (name,"isActive","updatedAt")
      VALUES ('Network',false,'2026-08-01')`);
    db.upgrade();
    const before = await db.prisma.user.findUniqueOrThrow({ where: { id: 91 } });
    await seedLab3Demo(db.prisma, demoEnv);
    const after = await db.prisma.user.findUniqueOrThrow({ where: { id: 91 } });
    expect(after).toEqual({ ...before, seedKey: "lab3.requester.1" });
    expect(after.passwordHash).toBeNull();
    expect((await db.prisma.category.findUniqueOrThrow({ where: { name: "Network" } })).isActive).toBe(false);
    expect(await db.prisma.user.count()).toBe(10);
  }, 90_000);

  it("refuses missing opt-in, production use and invalid provisioning secrets before writes", async () => {
    const prisma = await fresh();
    await expect(seedLab3Demo(prisma, { NODE_ENV: "test" })).rejects.toThrow();
    await expect(seedLab3Demo(prisma, { ...demoEnv, NODE_ENV: "production" })).rejects.toThrow();
    for (const secret of [undefined, "", "short", " ".repeat(12), "a".repeat(129)]) {
      await expect(provisionInitialPasswords(prisma, secret, { NODE_ENV: "test" })).rejects.toThrow();
    }
    await expect(provisionInitialPasswords(prisma, "Valid length password", { NODE_ENV: "production" })).rejects.toThrow();
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.category.count()).toBe(0);
  }, 60_000);
});
