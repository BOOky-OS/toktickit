import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { TicketStatus, ActionStatus } from "@prisma/client";
import { actionFixture } from "./action-fixture.js";
import { canTransition } from "../../src/tickets/staff-operations.js";
vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
let f: Awaited<ReturnType<typeof actionFixture>>;
beforeAll(async () => { f = await actionFixture(); }, 60000);
afterAll(async () => { if (f) await f.dispose(); });
const allowed = new Set(["NEW:OPEN","NEW:CANCELLED","OPEN:IN_PROGRESS","OPEN:WAITING_FOR_REQUESTER","OPEN:RESOLVED","OPEN:CANCELLED","IN_PROGRESS:WAITING_FOR_REQUESTER","IN_PROGRESS:RESOLVED","IN_PROGRESS:CANCELLED","WAITING_FOR_REQUESTER:IN_PROGRESS","WAITING_FOR_REQUESTER:RESOLVED","WAITING_FOR_REQUESTER:CANCELLED","RESOLVED:CLOSED","RESOLVED:REOPENED","CLOSED:REOPENED","REOPENED:OPEN","REOPENED:IN_PROGRESS","REOPENED:WAITING_FOR_REQUESTER","REOPENED:RESOLVED","REOPENED:CANCELLED"]);
async function make(status: TicketStatus = "OPEN") {
  const t = await f.make();
  return f.prisma.ticket.update({ where: { id: t.id }, data: { currentStatus: status, ownerId: f.users.staff } });
}
async function action(ticketId: number, status: ActionStatus = "COMPLETED", workCycle = 1) {
  return f.prisma.actionTaken.create({ data: { ticketId, status, workCycle, performedById: f.users.staff, assigneeId: f.users.second,
    actionAt: new Date("2026-09-01"), description: "Investigate connection", result: "Connection restored", followUpRequired: false, followUpNote: "", attachmentNotes: "",
    ...(status === "COMPLETED" ? { completedAt: new Date() } : status === "CANCELLED" ? { cancelledAt: new Date(), cancellationReason: "No longer required" } : {}) } });
}
const change = (id: number, currentStatus: string, version = 1, actor = "staff") => f.call("post", `/staff/tickets/${id}/status`, actor, { version, currentStatus, confirmed: true, reason: "Documented public reason" });
for (const from of Object.values(TicketStatus)) for (const to of Object.values(TicketStatus)) {
  it(`matrix ${from} -> ${to}: unit predicate and direct API`, async () => {
    const permitted = allowed.has(`${from}:${to}`), t = await make(from); await action(t.id);
    expect(canTransition(from, to)).toBe(permitted);
    const r = await change(t.id, to); expect(r.status).toBe(permitted ? 200 : 409);
    if (!permitted) expect(r.body.code).toBe("INVALID_TRANSITION");
    const stored = await f.prisma.ticket.findUniqueOrThrow({ where: { id: t.id } });
    expect(stored.currentStatus).toBe(permitted ? to : from); expect(stored.version).toBe(permitted ? 2 : 1);
    expect(await f.prisma.ticketStatusChange.count({ where: { ticketId: t.id } })).toBe(permitted ? 1 : 0);
  });
}
it("rejects zero work, old-cycle work and pending actions without writes", async () => {
  const t = await make();
  expect((await change(t.id, "RESOLVED")).body.code).toBe("RESOLUTION_BLOCKED");
  await action(t.id); await f.prisma.ticket.update({ where: { id: t.id }, data: { workCycle: 2 } });
  expect((await change(t.id, "RESOLVED")).body.code).toBe("RESOLUTION_BLOCKED");
  await action(t.id, "COMPLETED", 2);
  for (const status of ["PLANNED", "IN_PROGRESS"] as const) {
    const pending = await action(t.id, status, 1);
    expect((await change(t.id, "RESOLVED")).body.code).toBe("RESOLUTION_BLOCKED");
    expect((await change(t.id, "CANCELLED")).body.code).toBe("ACTIVE_ACTIONS");
    await f.prisma.actionTaken.update({ where: { id: pending.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: "Cancelled explicitly" } });
  }
  expect(await f.prisma.ticketStatusChange.count({ where: { ticketId: t.id } })).toBe(0);
  expect((await change(t.id, "RESOLVED")).status).toBe(200);
});
it("closes legacy work, increments reopen cycle, clears advisory/timestamps and preserves public history", async () => {
  const t = await make("RESOLVED");
  await f.prisma.ticket.update({ where: { id: t.id }, data: { resolvedAt: new Date(), resolutionSummary: "Legacy resolution", requesterResolutionIndicatedAt: new Date() } });
  expect((await change(t.id, "CLOSED", 1, "admin")).status).toBe(200);
  expect((await change(t.id, "REOPENED", 2, "admin")).status).toBe(200);
  const reopened = await f.prisma.ticket.findUniqueOrThrow({ where: { id: t.id } });
  expect(reopened).toMatchObject({ workCycle: 2, resolvedAt: null, closedAt: null, resolutionSummary: null, requesterResolutionIndicatedAt: null });
  await action(t.id, "COMPLETED", 1);
  expect((await change(t.id, "RESOLVED", 3)).body.code).toBe("RESOLUTION_BLOCKED");
  await action(t.id, "COMPLETED", 2); expect((await change(t.id, "RESOLVED", 3)).status).toBe(200);
  const history = await f.call("get", `/tickets/${t.id}/status-history`, "requester");
  expect(history.body.map((x: {toStatus: string}) => x.toStatus)).toEqual(["CLOSED", "REOPENED", "RESOLVED"]);
  expect((await f.call("get", `/tickets/${t.id}/status-history`, "other")).status).toBe(404);
  expect((await f.call("patch", `/tickets/${t.id}/status-history`, "staff", { reason: "Rewrite history" })).status).not.toBe(200);
});
it("enforces actor, confirmation, unknown-field, active-owner and stale-version guards", async () => {
  const t = await make(); await action(t.id);
  for (const actor of ["requester", "other", "forced", "inactive", "anonymous"]) expect((await change(t.id, "RESOLVED", 1, actor)).status).toBeGreaterThanOrEqual(400);
  for (const extra of [{ confirmed: false }, { workCycle: 1 }, { reason: "x" }]) {
    expect((await f.call("post", `/staff/tickets/${t.id}/status`, "staff", { version: 1, currentStatus: "RESOLVED", confirmed: true, reason: "Valid reason", ...extra })).status).toBe(400);
  }
  await f.prisma.ticket.update({ where: { id: t.id }, data: { ownerId: f.users.inactive } });
  expect((await change(t.id, "RESOLVED")).body.code).toBe("OWNER_REQUIRED");
  await f.prisma.ticket.update({ where: { id: t.id }, data: { ownerId: f.users.staff } });
  expect((await change(t.id, "RESOLVED", 99)).body.code).toBe("STALE_VERSION");
  expect((await change(t.id, "RESOLVED", 1, "admin")).status).toBe(200);
});
it("serializes resolution/cancellation against new actions and competing status requests", async () => {
  for (const next of ["RESOLVED", "CANCELLED"]) {
    const t = await make(); await action(t.id);
    const results = await Promise.all([change(t.id, next), f.call("post", `/tickets/${t.id}/actions`, "staff", f.body())]);
    expect(results.filter(r => r.status < 300)).toHaveLength(1);
    expect(results.find(r => r.status === 409)?.body.code).toBe("STALE_VERSION");
    const stored = await f.prisma.ticket.findUniqueOrThrow({ where: { id: t.id } });
    const pending = await f.prisma.actionTaken.count({ where: { ticketId: t.id, status: { in: ["PLANNED", "IN_PROGRESS"] } } });
    expect(stored.currentStatus === next ? pending === 0 : pending === 1).toBe(true);
  }
  const t = await make(); await action(t.id);
  const results = await Promise.all([change(t.id, "RESOLVED"), change(t.id, "CANCELLED", 1, "admin")]);
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
  expect(await f.prisma.ticketStatusChange.count({ where: { ticketId: t.id } })).toBe(1);
});

it("indication stays advisory/idempotent and cancelled-only work cannot resolve", async () => {
  const t = await make(); await action(t.id, "CANCELLED");
  const path = `/tickets/${t.id}/resolution-indication`;
  const indicated = await f.call("post", path, "requester", { version: 1, confirmed: true });
  expect(indicated.status).toBe(200); expect(indicated.body.currentStatus).toBe("OPEN");
  expect(indicated.body.requesterResolutionIndicatedAt).toBeTruthy();
  const repeated = await f.call("post", path, "requester", { version: 2, confirmed: true });
  expect(repeated.body.version).toBe(2);
  expect((await change(t.id, "RESOLVED", 2)).body.code).toBe("RESOLUTION_BLOCKED");
  expect(await f.prisma.ticketStatusChange.count({ where: { ticketId: t.id } })).toBe(0);
  const unassigned = await f.make();
  expect((await change(unassigned.id, "CANCELLED")).status).toBe(200);
});
it("uses cycle integers for equal timestamps and orders history ties by id", async () => {
  const t = await make("RESOLVED"), old = await action(t.id);
  await change(t.id, "REOPENED");
  const h = await f.prisma.ticketStatusChange.findFirstOrThrow({ where: { ticketId: t.id } });
  await f.prisma.actionTaken.update({ where: { id: old.id }, data: { completedAt: h.createdAt } });
  expect((await change(t.id, "RESOLVED", 2)).body.code).toBe("RESOLUTION_BLOCKED");
  await action(t.id, "COMPLETED", 2); expect((await change(t.id, "RESOLVED", 2)).status).toBe(200);
  await f.prisma.ticketStatusChange.updateMany({ where: { ticketId: t.id }, data: { createdAt: h.createdAt } });
  const history = await f.call("get", `/tickets/${t.id}/status-history`, "requester");
  expect(history.body.map((x: {toStatus:string}) => x.toStatus)).toEqual(["REOPENED", "RESOLVED"]);
  expect(history.body[0].id).toBeLessThan(history.body[1].id);
});
it("serializes action completion against Ticket cancellation without silently cancelling work", async () => {
  const t=await make(), a=await action(t.id,"IN_PROGRESS");
  const [complete,cancel]=await Promise.all([
    f.call("post",`/tickets/${t.id}/actions/${a.id}/status`,"staff",{status:"COMPLETED",version:1,ticketVersion:1,confirmed:true}),
    change(t.id,"CANCELLED")
  ]);
  expect(complete.status).toBe(200);expect(cancel.status).toBe(409);expect(["ACTIVE_ACTIONS","STALE_VERSION"]).toContain(cancel.body.code);
  expect((await f.prisma.ticket.findUniqueOrThrow({where:{id:t.id}})).currentStatus).toBe("OPEN");
  expect((await f.prisma.actionTaken.findUniqueOrThrow({where:{id:a.id}})).status).toBe("COMPLETED");
  expect((await change(t.id,"CANCELLED",2)).status).toBe(200);
});
