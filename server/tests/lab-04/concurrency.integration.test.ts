import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { actionFixture } from "./action-fixture.js";
vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
let f: Awaited<ReturnType<typeof actionFixture>>;
beforeAll(async () => { f = await actionFixture(); }, 60000);
afterAll(async () => { if (f) await f.dispose(); });
it("serializes identical create/status requests to one write and replays before stale checks", async () => {
  const t = await f.make(), path = `/tickets/${t.id}/actions`, key = randomUUID();
  const results = await Promise.all([1, 2].map(() => f.call("post", path, "staff", f.body(), key)));
  expect(results.map(r => r.status)).toEqual([201, 201]); expect(results[0].body).toEqual(results[1].body);
  expect(results.filter(r => r.headers["idempotency-replayed"] === "true")).toHaveLength(1);
  const id = results[0].body.action.id, statusKey = randomUUID(), statusBody = { ticketVersion: 2, version: 1, status: "IN_PROGRESS", confirmed: true };
  const statuses = await Promise.all([1, 2].map(() => f.call("post", `${path}/${id}/status`, "staff", statusBody, statusKey)));
  expect(statuses.map(r => r.status)).toEqual([200, 200]); expect(statuses[0].body).toEqual(statuses[1].body);
  expect(await f.prisma.actionTaken.count({ where: { ticketId: t.id } })).toBe(1);
  expect(await f.prisma.actionRevision.count({ where: { actionId: id } })).toBe(2);
  const replay = await f.call("post", path, "staff", f.body(), key); expect(replay.body).toEqual(results[0].body);
  expect(replay.headers["access-control-expose-headers"]).toContain("Idempotency-Replayed");
  expect((await f.call("post", path, "staff", { ...f.body(), result: "Changed request" }, key)).body.code).toBe("IDEMPOTENCY_CONFLICT");
  expect((await f.call("patch", `${path}/${id}`, "staff", { ...f.body(3), version: 2 }, key)).body.code).toBe("IDEMPOTENCY_CONFLICT");
  const other = await f.make(); expect((await f.call("post", `/tickets/${other.id}/actions`, "staff", f.body(), key)).body.code).toBe("IDEMPOTENCY_CONFLICT");
});
it("rejects one competing edit with no extra revision or receipt", async () => {
  const t = await f.make(), path = `/tickets/${t.id}/actions`, created = await f.call("post", path, "staff", f.body()), id = created.body.action.id;
  const results = await Promise.all(["staff", "admin"].map(actor => f.call("patch", `${path}/${id}`, actor, { ...f.body(2), version: 1, result: `Result from ${actor}` })));
  expect(results.map(r => r.status).sort()).toEqual([200, 409]); expect(results.find(r => r.status === 409)?.body.code).toBe("STALE_VERSION");
  expect(await f.prisma.actionRevision.count({ where: { actionId: id } })).toBe(2);
});
it("rolls back action, revision, Ticket version and receipt together after a database fault", async () => {
  const t = await f.make(), path = `/tickets/${t.id}/actions`, key = randomUUID();
  const revisionsBefore = await f.prisma.actionRevision.count();
  await f.prisma.$executeRawUnsafe('CREATE FUNCTION reject_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION \'test fault private detail\'; END $$');
  await f.prisma.$executeRawUnsafe('CREATE TRIGGER reject_receipt BEFORE INSERT ON "ActionReceipt" FOR EACH ROW EXECUTE FUNCTION reject_receipt()');
  try {
    const result = await f.call("post", path, "staff", f.body(), key); expect(result.status).toBe(500); expect(result.text).not.toMatch(/test fault|INSERT|ActionReceipt/);
    expect(await f.prisma.actionTaken.count({ where: { ticketId: t.id } })).toBe(0);
    expect(await f.prisma.actionRevision.count()).toBe(revisionsBefore);
    expect((await f.prisma.ticket.findUniqueOrThrow({ where: { id: t.id } })).version).toBe(1);
    expect(await f.prisma.actionReceipt.count({ where: { key } })).toBe(0);
  } finally { await f.prisma.$executeRawUnsafe('DROP TRIGGER reject_receipt ON "ActionReceipt"'); }
  expect((await f.call("post", path, "staff", f.body(), key)).status).toBe(201);
});
