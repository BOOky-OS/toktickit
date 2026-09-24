import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { ActionStatus } from "@prisma/client";
import { actionFixture } from "./action-fixture.js";
vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
let f: Awaited<ReturnType<typeof actionFixture>>;
beforeAll(async () => { f = await actionFixture(); }, 60000);
afterAll(async () => { if (f) await f.dispose(); });
it("creates a safe DTO, separates creator/assignee/owner and retains immutable revisions", async () => {
  const t = await f.make(), path = `/tickets/${t.id}/actions`;
  const created = await f.call("post", path, "staff", f.body());
  expect(created.status, created.text).toBe(201);
  expect(created.body).toMatchObject({ ticketVersion: 2, action: { ticketId: t.id, version: 1, status: "PLANNED", performedBy: { id: f.users.staff }, assignee: { id: f.users.second }, description: "Check network adapter" } });
  expect(created.text).not.toMatch(/passwordHash|email|seedKey|workCycle|performedById|assigneeId/);
  const id = created.body.action.id;
  const changed = await f.call("patch", `${path}/${id}`, "admin", { ...f.body(2), version: 1, description: "Updated adapter findings", assigneeId: f.users.admin });
  expect(changed.status).toBe(200);
  expect(changed.body.action.performedBy.id).toBe(f.users.staff);
  const history = await f.call("get", `${path}/${id}/history`, "admin");
  expect(history.body.items.map((v: { event: string }) => v.event)).toEqual(["CREATE", "EDIT"]);
  expect(history.body.items[0].snapshot).toEqual(created.body.action);
  expect(history.body.items[1].actor.id).toBe(f.users.admin);
  expect((await f.prisma.ticket.findUniqueOrThrow({ where: { id: t.id } })).ownerId).toBeNull();
  await f.prisma.user.update({ where: { id: f.users.staff }, data: { displayName: "Renamed" } });
  expect((await f.call("get", `${path}/${id}/history`)).body.items[0].snapshot.performedBy.displayName).toBe("staff");
});
it("validates all fields, dates, spoofing, idempotency headers and no-op edits", async () => {
  const t = await f.make(), path = `/tickets/${t.id}/actions`;
  for (const patch of [{ actionAt: "2025-01-01T00:00:00Z" }, { actionAt: "2999-01-01T00:00:00Z" }, { description: "no" }, { performedById: f.users.admin }, { workCycle: 9 }, { followUpRequired: true, followUpNote: "" }]) expect((await f.call("post", path, "staff", { ...f.body(), ...patch })).status).toBe(400);
  for (const assigneeId of [f.users.requester, f.users.inactive, 999999, Number.MAX_SAFE_INTEGER]) expect((await f.call("post", path, "staff", { ...f.body(), assigneeId })).body.code).toBe("INVALID_ASSIGNEE");
  expect((await f.call("post", path, "staff", f.body(), "invalid")).status).toBe(400);
  const created = await f.call("post", path, "staff", f.body()), id = created.body.action.id;
  const noOp = await f.call("patch", `${path}/${id}`, "staff", { ...f.body(2), version: 1 });
  expect(noOp.body).toEqual(created.body);
  expect(await f.prisma.actionRevision.count({ where: { actionId: id } })).toBe(1);
  expect(await f.prisma.actionReceipt.count({ where: { path: { startsWith: path } } })).toBe(2);
  expect((await f.call("patch", `${path}/${id}`, "staff", { ...f.body(1), version: 1 })).body.code).toBe("STALE_VERSION");
});
const states = Object.values(ActionStatus);
it.each(states.flatMap(from => states.map(to => ({ from, to }))))("enforces $from -> $to with terminal immutability", async ({ from, to }) => {
  const t = await f.make(), path = `/tickets/${t.id}/actions`;
  const created = await f.call("post", path, "staff", f.body()), id = created.body.action.id;
  await f.prisma.actionTaken.update({ where: { id }, data: { status: from,
    completedAt: from === "COMPLETED" ? new Date() : null, cancelledAt: from === "CANCELLED" ? new Date() : null,
    cancellationReason: from === "CANCELLED" ? "Fixture cancellation" : null } });
  const response = await f.call("post", `${path}/${id}/status`, "admin", { ticketVersion: 2, version: 1, confirmed: true, status: to, ...(to === "CANCELLED" ? { reason: "No longer needed" } : {}) });
  const allowed = (from === "PLANNED" && ["IN_PROGRESS", "CANCELLED"].includes(to)) || (from === "IN_PROGRESS" && ["COMPLETED", "CANCELLED"].includes(to));
  expect(response.status, response.text).toBe(allowed ? 200 : 409);
  if (!allowed) expect(response.body.code).toBe(["COMPLETED", "CANCELLED"].includes(from) ? "ACTION_READ_ONLY" : "INVALID_ACTION_TRANSITION");
  else { expect(response.body.action.version).toBe(2); expect(response.body.ticketVersion).toBe(3); }
});
it("requires a final result and cleared follow-up, but can cancel an inactive assignment", async () => {
  for (const patch of [{ result: "" }, { followUpRequired: true, followUpNote: "Follow up tomorrow" }]) {
    const t = await f.make(), path = `/tickets/${t.id}/actions`;
    const created = await f.call("post", path, "staff", { ...f.body(), ...patch }), id = created.body.action.id;
    expect((await f.call("post", `${path}/${id}/status`, "staff", { ticketVersion: 2, version: 1, status: "IN_PROGRESS", confirmed: true })).status).toBe(200);
    expect((await f.call("post", `${path}/${id}/status`, "staff", { ticketVersion: 3, version: 2, status: "COMPLETED", confirmed: true })).status).toBe(400);
    await f.prisma.actionTaken.update({ where: { id }, data: { assigneeId: f.users.inactive } });
    expect((await f.call("post", `${path}/${id}/status`, "staff", { ticketVersion: 3, version: 2, status: "CANCELLED", confirmed: true, reason: "Obsolete investigation" })).status).toBe(200);
  }
});
it.each(["RESOLVED", "CLOSED", "CANCELLED"] as const)("rejects new and existing writes on %s Tickets", async currentStatus => {
  const t = await f.make(), path = `/tickets/${t.id}/actions`;
  const created = await f.call("post", path, "staff", f.body()), id = created.body.action.id;
  await f.prisma.ticket.update({ where: { id: t.id }, data: { currentStatus } });
  for (const [method, url, body] of [["post", path, f.body(2)], ["patch", `${path}/${id}`, { ...f.body(2), version: 1 }], ["post", `${path}/${id}/status`, { ticketVersion: 2, version: 1, status: "IN_PROGRESS", confirmed: true }]] as const) expect((await f.call(method, url, "staff", body)).body.code).toBe("TICKET_READ_ONLY");
});
it("paginates stably, exposes all terminal current items, rejects foreign parents and history writes", async () => {
  const t = await f.make(), other = await f.make(), path = `/tickets/${t.id}/actions`;
  const ids: number[] = [];
  for (let n = 0; n < 12; n++) {
    const r = await f.call("post", path, "staff", f.body(n + 1)); expect(r.status).toBe(201); ids.push(r.body.action.id);
  }
  await f.prisma.actionTaken.update({ where: { id: ids[0] }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: "Retained for requester" } });
  const page1 = await f.call("get", path, "requester"), page2 = await f.call("get", `${path}?page=2`, "requester");
  expect(page1.body.totalItems).toBe(12); expect(page1.body.items[0].status).toBe("CANCELLED"); expect(page1.body.items).toHaveLength(10);
  expect(page2.body.items.map((a: { id: number }) => a.id)).toEqual(ids.slice(10));
  const beyond = await f.call("get", `${path}?page=3`); expect(beyond.body).toMatchObject({ items: [], totalItems: 12, totalPages: 2, hasPreviousPage: true, hasNextPage: false });
  for (const query of ["page=1&page=2", "pageSize=5", "actorId=1"]) expect((await f.call("get", `${path}?${query}`)).status).toBe(400);
  expect((await f.call("get", `/tickets/${Number.MAX_SAFE_INTEGER}/actions`)).status).toBe(404);
  expect((await f.call("get", `${path}/${Number.MAX_SAFE_INTEGER}/history`)).status).toBe(404);
  expect((await f.call("get", `/tickets/${other.id}/actions/${ids[0]}/history`)).status).toBe(404);
  expect((await f.call("patch", `/tickets/${other.id}/actions/${ids[0]}`, "staff", { ...f.body(), version: 1 })).status).toBe(404);
  for (const method of ["patch", "delete"] as const) expect((await f.call(method, `${path}/${ids[0]}/history`, "staff", {})).status).toBe(404);
  expect((await f.call("delete", `${path}/${ids[0]}`, "staff", {})).status).toBe(404);
});
