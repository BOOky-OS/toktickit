import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { verifyPassword } from "../../src/auth/password.js";
import { checkSchemaDrift, executeScript, migrationDirectory } from "../lab-03/database-fixture.js";
import { legacyFixture, migration, oldSnapshot } from "./legacy-fixture.js";
vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
it("preserves all legacy rows, credentials, live session, file bytes, FKs and sequence values", async () => {
  const f = await legacyFixture();
  try {
    const before = await oldSnapshot(f.prisma), hash = await f.fileHash();
    const sequences = await f.prisma.$queryRaw`SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = current_schema() ORDER BY sequencename`;
    f.upgrade(); checkSchemaDrift(f.url);
    expect(await oldSnapshot(f.prisma)).toEqual(before); expect(await f.fileHash()).toBe(hash);
    const after = await f.prisma.$queryRaw<Array<{ sequencename: string; last_value: bigint | null }>>`SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = current_schema() ORDER BY sequencename`;
    expect(after.filter(s => !s.sequencename.startsWith("Action"))).toEqual(sequences);
    expect(await f.prisma.actionTaken.count()).toBe(0); expect(await f.prisma.actionReceipt.count()).toBe(0);
    expect((await f.prisma.ticket.findUniqueOrThrow({ where: { id: f.ticketId } })).workCycle).toBe(1);
    expect(await verifyPassword("Legacy password 123!", (await f.prisma.user.findUniqueOrThrow({ where: { id: f.user.id } })).passwordHash!)).toBe(true);
    vi.mocked(getPrisma).mockReturnValue(f.prisma);
    const read = await request(app).get(`/api/tickets/${f.ticketId}`).set("Cookie", `toktickit.sid=${f.session.token}`);
    expect(read.status).toBe(200); expect(read.body.summary).toBe("Retained legacy ticket");
    await expect(f.prisma.user.delete({ where: { id: f.staff.id } })).rejects.toThrow();
    await expect(f.prisma.ticket.update({ where: { id: f.ticketId }, data: { workCycle: 0 } })).rejects.toThrow();
  } finally { await f.dispose(); }
}, 60000);
it("rolls back failed additive DDL and can then migrate successfully", async () => {
  const f = await legacyFixture();
  try {
    const before = await oldSnapshot(f.prisma);
    const sql = readFileSync(resolve(migrationDirectory, migration, "migration.sql"), "utf8");
    expect(() => executeScript(f.url, sql.replace("COMMIT;", "SELECT 1/0;\nCOMMIT;"))).toThrow();
    expect(await oldSnapshot(f.prisma)).toEqual(before);
    expect(await f.prisma.$queryRaw`SELECT to_regclass('"ActionTaken"')::text AS name`).toEqual([{ name: null }]);
    f.upgrade(); expect(await f.prisma.actionTaken.count()).toBe(0);
  } finally { await f.dispose(); }
}, 60000);
