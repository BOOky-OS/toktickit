import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { databaseFixture } from "../../server/tests/lab-03/database-fixture";
import { hashPassword } from "../../server/src/auth/password";

export default async function setup() {
  const fixture = await databaseFixture("99999999999999");
  const workingUrl = process.env.DATABASE_URL, cwd = process.cwd();
  const storage = await mkdtemp(join(tmpdir(), "toktickit-lab4-e2e-"));
  let stop: (() => Promise<void>) | undefined;
  const cleanup = async () => {
    await stop?.(); process.chdir(cwd);
    if (workingUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = workingUrl;
    delete process.env.LAB4_E2E_DATABASE_URL;
    await fixture.dispose();
    if (!resolve(storage).startsWith(resolve(tmpdir()) + sep + "toktickit-lab4-e2e-")) throw new Error("Unsafe E2E storage path.");
    await rm(storage, { recursive: true });
  };
  try {
    const passwordHash = await hashPassword("Lab4-test-only-password!");
    const users: Record<string, number> = {};
    for (const [name, role] of [["requester", "REQUESTER"], ["other", "REQUESTER"], ["staff", "IT_STAFF"], ["second", "IT_STAFF"], ["admin", "ADMIN"]] as const) {
      users[name] = (await fixture.prisma.user.create({ data: { displayName: `E2E ${name}`, email: `${name}@lab4.example`, role, passwordHash, mustChangePassword: false } })).id;
    }
    const category = await fixture.prisma.category.create({ data: { name: "Network" } });
    const system = await fixture.prisma.relatedSystem.create({ data: { name: "Campus connection" } });
    for (let i = 1; i <= 12; i++) {
      const ticket = await fixture.prisma.ticket.create({ data: { id: i, ticketNumber: `TKT-2026-${String(i).padStart(6, "0")}`, requesterId: users.requester,
        categoryId: category.id, relatedSystemId: system.id, summary: `Connection investigation ${i}`, description: "The connection drops during online meetings. Check the adapter and repeat the connection test.",
        requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "OPEN", ticketDate: new Date("2026-01-01T00:00:00Z"), clientSubmissionKey: randomUUID() } });
      if (i === 12) for (let n = 0; n < 12; n++) await fixture.prisma.actionTaken.create({ data: { ticketId: ticket.id, performedById: users.staff, assigneeId: users.second, actionAt: new Date("2026-01-02T00:00:00Z"),
        description: `Linked action ${n + 1}`, result: "", followUpRequired: false, followUpNote: "", attachmentNotes: "", workCycle: 1 } });
    }
    process.env.LAB4_E2E_DATABASE_URL = fixture.url; process.env.DATABASE_URL = fixture.url;
    process.env.CLIENT_ORIGIN = "http://localhost:5177"; process.env.ALLOW_LOCAL_HTTP = "true";
    process.chdir(storage);
    const { app } = await import("../../server/src/app"); const { getPrisma } = await import("../../server/src/prisma");
    process.chdir(cwd);
    const server = app.listen(3007);
    await new Promise<void>((done, reject) => { server.once("listening", done); server.once("error", reject); });
    stop = async () => { server.closeAllConnections(); await new Promise<void>((done, reject) => server.close(e => e ? reject(e) : done())); await getPrisma().$disconnect(); };
  } catch (e) { await cleanup(); throw e; }
  return cleanup;
}
