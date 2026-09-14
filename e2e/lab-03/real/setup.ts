import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { databaseFixture } from "../../../server/tests/lab-03/database-fixture";
import { hashPassword } from "../../../server/src/auth/password";

export default async function setup() {
  const fixture = await databaseFixture();
  const workingUrl = process.env.DATABASE_URL;
  const workingDirectory = process.cwd();
  const storage = await mkdtemp(join(tmpdir(), "toktickit-lab3-e2e-"));
  let stop: (() => Promise<void>) | undefined;
  try {
    const passwordHash = await hashPassword("Lab3-test-only-password!");
    for (const [name, role, forced, active] of [
      ["requester", "REQUESTER", false, true], ["other", "REQUESTER", false, true], ["staff", "IT_STAFF", false, true], ["staff2", "IT_STAFF", false, true],
      ["admin", "ADMIN", false, true], ["first", "REQUESTER", true, true], ["visualfirst", "REQUESTER", true, true],
      ["inactive", "REQUESTER", false, false],
    ] as const) {
      await fixture.prisma.user.create({ data: { displayName: `E2E ${name}`, email: `${name}@lab3.example`,
        role, passwordHash, mustChangePassword: forced, isActive: active } });
    }
    await fixture.prisma.category.create({ data: { name: 'E2E Hardware' } });
    await fixture.prisma.relatedSystem.create({ data: { name: 'E2E Laptop' } });
    const requester = await fixture.prisma.user.findUniqueOrThrow({ where: { email: "requester@lab3.example" } });
    const category = await fixture.prisma.category.findFirstOrThrow();
    const system = await fixture.prisma.relatedSystem.findFirstOrThrow();
    await fixture.prisma.ticket.create({ data: { ticketNumber: "TKT-2026-900001", requesterId: requester.id,
      categoryId: category.id, relatedSystemId: system.id, summary: "Visual " + "long-summary-".repeat(8),
      description: "LongUnbrokenDescription".repeat(30), requestedPriority: "MEDIUM", itPriority: "MEDIUM",
      clientSubmissionKey: "12345678-1234-4234-8234-123456789012" } });
    await fixture.prisma.ticket.createMany({ data: Array.from({ length: 12 }, (_, index) => ({
      ticketNumber: `TKT-2026-${910000 + index}`, requesterId: requester.id,
      categoryId: category.id, relatedSystemId: system.id, summary: `Queue audit ${String(index).padStart(2, "0")}`,
      description: "Queue pagination and filtering fixture.", requestedPriority: "LOW" as const,
      itPriority: "LOW" as const, currentStatus: "OPEN" as const,
      clientSubmissionKey: `12345678-1234-4234-8234-${String(index).padStart(12, "0")}`,
    })) });
    process.env.LAB3_E2E_DATABASE_URL = fixture.url;
    process.env.DATABASE_URL = fixture.url;
    process.env.CLIENT_ORIGIN = "http://localhost:5176";
    process.env.ALLOW_LOCAL_HTTP = "true";
    // Storage resolves cwd when app modules load. Only the owned temp directory is used.
    process.chdir(storage);
    const { app } = await import("../../../server/src/app");
    const { getPrisma } = await import("../../../server/src/prisma");
    process.chdir(workingDirectory);
    const server = app.listen(3006);
    await new Promise<void>((done, reject) => { server.once("listening", done); server.once("error", reject); });
    stop = async () => {
      server.closeAllConnections();
      await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()));
      await getPrisma().$disconnect();
    };
  } catch (error) {
    process.chdir(workingDirectory);
    if (workingUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = workingUrl;
    await fixture.dispose();
    throw error;
  }
  return async () => {
    try { await stop?.(); }
    finally {
      if (workingUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = workingUrl;
      delete process.env.LAB3_E2E_DATABASE_URL;
      await fixture.dispose();
      const target = resolve(storage);
      if (!target.startsWith(resolve(tmpdir()) + sep) || !target.split(sep).at(-1)?.startsWith("toktickit-lab3-e2e-")) {
        throw new Error("Unsafe test storage cleanup path.");
      }
      await rm(target, { recursive: true, force: true });
    }
  };
}
