import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { ActionStatus, TicketStatus } from "@prisma/client";
import { databaseFixture } from "../lab-03/database-fixture.js";
import { requireLab4Seed, seedLab4Demo } from "../../prisma/lab4-seed.js";
it("requires explicit opt-in and rejects remote, production and unknown databases", () => {
  for (const env of [{}, { NODE_ENV: "production" }, { DATABASE_URL: "postgresql://remote/toktickit" }, { DATABASE_URL: "postgresql://localhost/customer" }]) expect(() => requireLab4Seed({ LAB4_ALLOW_DEMO_SEED: "true", ...env })).toThrow();
});
it("seeds every scenario, preserves edits/credentials and inserts nothing on repeat", async () => {
  const f = await databaseFixture("99999999999999");
  try {
    const env = { NODE_ENV: "test", LAB4_ALLOW_DEMO_SEED: "true", DATABASE_URL: f.url };
    await seedLab4Demo(f.prisma, env);
    const tickets = await f.prisma.ticket.findMany({ include: { actions: true } });
    expect(new Set(tickets.map(t => t.currentStatus))).toEqual(new Set(Object.values(TicketStatus)));
    expect(new Set(tickets.map(t => t.itPriority))).toEqual(new Set(["LOW", "MEDIUM", "HIGH"]));
    expect(tickets.some(t => t.ownerId === null)).toBe(true); expect(tickets.some(t => t.ownerId !== null)).toBe(true);
    expect(tickets.some(t => t.actions.length === 0)).toBe(true); expect(tickets.some(t => t.actions.length === 1)).toBe(true);
    expect(tickets.some(t => new Set(t.actions.map(a => a.performedById)).size === 2)).toBe(true);
    expect(new Set(tickets.flatMap(t => t.actions.map(a => a.status)))).toEqual(new Set(Object.values(ActionStatus)));
    const action = await f.prisma.actionTaken.findFirstOrThrow(), user = await f.prisma.user.findFirstOrThrow();
    await f.prisma.actionTaken.update({ where: { id: action.id }, data: { description: "Student edited this fixture" } });
    await f.prisma.user.update({ where: { id: user.id }, data: { displayName: "Student chosen name", passwordHash: "preserved student credential" } });
    const before = await Promise.all([f.prisma.user.findMany(), f.prisma.ticket.findMany(), f.prisma.actionTaken.findMany(), f.prisma.actionRevision.findMany()]);
    const cliOutput = execFileSync(process.execPath, [resolve(import.meta.dirname, "../../../node_modules/tsx/dist/cli.mjs"), resolve(import.meta.dirname, "../../prisma/lab4-seed.ts")], {
      env: { ...process.env, ...env }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    expect(cliOutput).toContain("existing edits and credentials retained");
    expect(await Promise.all([f.prisma.user.findMany(), f.prisma.ticket.findMany(), f.prisma.actionTaken.findMany(), f.prisma.actionRevision.findMany()])).toEqual(before);
    for (const name of ["empty-requester", "empty-staff"]) {
      const empty = await f.prisma.user.findUniqueOrThrow({ where: { seedKey: `lab4.user.${name}` } });
      expect(await f.prisma.ticket.count({ where: { OR: [{ requesterId: empty.id }, { ownerId: empty.id }] } })).toBe(0);
      expect(await f.prisma.actionTaken.count({ where: { assigneeId: empty.id } })).toBe(0);
    }
  } finally { await f.dispose(); }
}, 60000);
