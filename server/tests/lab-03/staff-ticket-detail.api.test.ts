import { afterAll, beforeAll, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { TicketStatus } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { issueSession, origin } from "../../src/auth/security.js";
import { databaseFixture } from "./database-fixture.js";
vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
let fixture: Awaited<ReturnType<typeof databaseFixture>>;
const users: Record<string, number> = {};
const sessions: Record<string, Awaited<ReturnType<typeof issueSession>>> = {};
let categoryId: number, relatedSystemId: number, serial = 910000;
beforeAll(async () => {
  fixture = await databaseFixture(); vi.mocked(getPrisma).mockReturnValue(fixture.prisma);
  categoryId = (await fixture.prisma.category.create({ data: { name: "Hardware" } })).id;
  relatedSystemId = (await fixture.prisma.relatedSystem.create({ data: { name: "Laptop" } })).id;
  for (const [name, role] of [["Requester", "REQUESTER"], ["Other", "REQUESTER"], ["Staff", "IT_STAFF"], ["Staff2", "IT_STAFF"], ["Admin", "ADMIN"], ["Retired", "IT_STAFF"]] as const) {
    const user = await fixture.prisma.user.create({ data: { displayName: name, email: `${name}@operations.test`, role,
      isActive: name !== "Retired", passwordHash: "provisioned", mustChangePassword: false } });
    users[name] = user.id; sessions[name] = await issueSession(fixture.prisma, user.id);
  }
}, 60000);
afterAll(async () => { if (fixture) await fixture.dispose(); });
const make = (currentStatus: TicketStatus = "NEW", ownerId: number | null = null) => fixture.prisma.ticket.create({ data: {
  ticketNumber: `TKT-2026-${serial++}`, requesterId: users.Requester, categoryId, relatedSystemId, currentStatus, ownerId,
  clientSubmissionKey: randomUUID(), summary: "Battery drains quickly", description: "Battery drains during meetings.", requestedPriority: "MEDIUM", itPriority: "LOW",
} });
function write(id: number, operation: string, body: object, role = "Staff") {
  const method = operation === "owner" || operation === "priority" ? "patch" : "post";
  return request(app)[method](`/api/staff/tickets/${id}/${operation}`).set("Cookie", `toktickit.sid=${sessions[role].token}`)
    .set("Origin", origin()).set("X-CSRF-Token", sessions[role].csrfToken).send(body);
}
it("denies Admin/Requester writes and missing CSRF without changing Tickets", async () => {
  const ticket = await make();
  for (const role of ["Admin", "Requester"]) expect((await write(ticket.id, "claim", { version: 1 }, role)).status).toBe(403);
  expect((await request(app).post(`/api/staff/tickets/${ticket.id}/claim`).set("Cookie", `toktickit.sid=${sessions.Staff.token}`).send({ version: 1 })).status).toBe(403);
  expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(1);
});
it("claims once, handles current no-op, rejects stale and concurrent claims", async () => {
  const ticket = await make();
  const results = await Promise.all([write(ticket.id, "claim", { version: 1 }), write(ticket.id, "claim", { version: 1 }, "Staff2")]);
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
  const saved = results.find(r => r.status === 200)!.body;
  const winner = saved.owner.id === users.Staff ? "Staff" : "Staff2";
  const noop = await write(ticket.id, "claim", { version: 2 }, winner);
  expect(noop.body).toMatchObject({ version: 2, updatedAt: saved.updatedAt, summary: ticket.summary, requestedPriority: "MEDIUM" });
  expect((await write(ticket.id, "claim", { version: 1 }, winner)).body.code).toBe("STALE_VERSION");
  expect((await write(ticket.id, "claim", { version: 2 }, winner === "Staff" ? "Staff2" : "Staff")).status).toBe(409);
  expect(JSON.stringify(saved)).not.toMatch(/passwordHash|seedKey|internalNote|storageKey/);
});
it("validates assignment, confirmation, unassignment and terminal restrictions", async () => {
  const ticket = await make("OPEN");
  for (const ownerId of [users.Retired, users.Requester, 999999]) expect((await write(ticket.id, "owner", { version: 1, ownerId, confirmed: true })).body.code).toBe("INVALID_ASSIGNEE");
  expect((await write(ticket.id, "owner", { version: 1, ownerId: users.Admin })).status).toBe(400);
  expect((await write(ticket.id, "owner", { version: 1, ownerId: users.Admin, confirmed: true })).body.owner.id).toBe(users.Admin);
  expect((await write(ticket.id, "owner", { version: 2, ownerId: null, confirmed: true })).body.owner).toBeNull();
  const active = await make("IN_PROGRESS", users.Staff);
  expect((await write(active.id, "owner", { version: 1, ownerId: null, confirmed: true })).body.code).toBe("OWNER_REQUIRED");
  for (const status of ["CLOSED", "CANCELLED"] as const) {
    const terminal = await make(status, users.Staff);
    for (const [operation, body] of [["claim", {}], ["owner", { ownerId: users.Staff2, confirmed: true }], ["priority", { itPriority: "HIGH" }]] as const)
      expect((await write(terminal.id, operation, { version: 1, ...body })).body.code).toBe("TICKET_READ_ONLY");
  }
});
it("updates only IT Priority and rejects forged fields and stale no-ops", async () => {
  const ticket = await make();
  expect((await write(ticket.id, "priority", { version: 1, itPriority: "HIGH", requestedPriority: "HIGH" })).status).toBe(400);
  expect((await write(ticket.id, "priority", { version: 1, itPriority: "HIGH" })).body).toMatchObject({ itPriority: "HIGH", requestedPriority: "MEDIUM", version: 2 });
  expect((await write(ticket.id, "priority", { version: 2, itPriority: "HIGH" })).body.version).toBe(2);
  expect((await write(ticket.id, "priority", { version: 1, itPriority: "HIGH" })).body.code).toBe("STALE_VERSION");
});
const allowed = new Set(["NEW:OPEN", "NEW:CANCELLED", "OPEN:IN_PROGRESS", "OPEN:WAITING_FOR_REQUESTER", "OPEN:RESOLVED", "OPEN:CANCELLED", "IN_PROGRESS:WAITING_FOR_REQUESTER", "IN_PROGRESS:RESOLVED", "IN_PROGRESS:CANCELLED", "WAITING_FOR_REQUESTER:IN_PROGRESS", "WAITING_FOR_REQUESTER:RESOLVED", "WAITING_FOR_REQUESTER:CANCELLED", "RESOLVED:CLOSED", "RESOLVED:REOPENED", "CLOSED:REOPENED", "REOPENED:OPEN", "REOPENED:IN_PROGRESS", "REOPENED:WAITING_FOR_REQUESTER", "REOPENED:RESOLVED", "REOPENED:CANCELLED"]);
it("enforces all 64 status pairs and atomically records only permitted changes", async () => {
  for (const from of Object.values(TicketStatus)) for (const to of Object.values(TicketStatus)) {
    const ticket = await make(from, users.Staff);
    const result = await write(ticket.id, "status", { version: 1, currentStatus: to, confirmed: true, reason: "Verified public reason" });
    const valid = allowed.has(`${from}:${to}`);
    expect(result.status, `${from}:${to}`).toBe(valid ? 200 : 409);
    expect(await fixture.prisma.ticketStatusChange.count({ where: { ticketId: ticket.id } })).toBe(valid ? 1 : 0);
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(valid ? 2 : 1);
  }
}, 30000);
it("enforces active owner prerequisites and public confirmation/reasons", async () => {
  for (const ownerId of [null, users.Retired, users.Requester]) {
    const ticket = await make("OPEN", ownerId);
    for (const currentStatus of ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED"]) expect((await write(ticket.id, "status", { version: 1, currentStatus, confirmed: true, reason: "Valid reason" })).body.code).toBe("OWNER_REQUIRED");
  }
  const ticket = await make("OPEN", users.Staff);
  expect((await write(ticket.id, "status", { version: 1, currentStatus: "RESOLVED", confirmed: true })).status).toBe(400);
  expect((await write(ticket.id, "status", { version: 1, currentStatus: "IN_PROGRESS" })).status).toBe(400);
});
it("sets resolution/close dates, clears current resolution on reopen and preserves public history", async () => {
  const ticket = await make("OPEN", users.Staff);
  await fixture.prisma.ticket.update({ where: { id: ticket.id }, data: { requesterResolutionIndicatedAt: new Date() } });
  const resolved = await write(ticket.id, "status", { version: 1, currentStatus: "RESOLVED", confirmed: true, reason: "  Replaced battery  " });
  expect(resolved.body.resolvedAt).not.toBeNull(); expect(resolved.body.resolutionSummary).toBe("Replaced battery");
  expect((await write(ticket.id, "status", { version: 2, currentStatus: "CLOSED", confirmed: true, reason: "Requester confirmed" })).body.closedAt).not.toBeNull();
  const reopened = await write(ticket.id, "status", { version: 3, currentStatus: "REOPENED", confirmed: true, reason: "Problem returned" });
  expect(reopened.body).toMatchObject({ resolvedAt: null, closedAt: null, resolutionSummary: null, requesterResolutionIndicatedAt: null, version: 4 });
  for (const role of ["Requester", "Staff", "Admin"]) {
    const history = await request(app).get(`/api/tickets/${ticket.id}/status-history`).set("Cookie", `toktickit.sid=${sessions[role].token}`);
    expect(history.status).toBe(200); expect(history.body.map((r: { toStatus: string }) => r.toStatus)).toEqual(["RESOLVED", "CLOSED", "REOPENED"]);
    expect(history.body[0]).toMatchObject({ reason: "Replaced battery", author: { id: users.Staff } });
  }
  expect((await request(app).get(`/api/tickets/${ticket.id}/status-history`).set("Cookie", `toktickit.sid=${sessions.Other.token}`)).status).toBe(404);
});
it("rolls back status and version if history insertion fails", async () => {
  const ticket = await make("NEW");
  await fixture.prisma.$executeRawUnsafe('CREATE FUNCTION reject_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION \'forced test failure\'; END $$');
  await fixture.prisma.$executeRawUnsafe('CREATE TRIGGER fail_history BEFORE INSERT ON "TicketStatusChange" FOR EACH ROW EXECUTE FUNCTION reject_history()');
  try {
    const result = await write(ticket.id, "status", { version: 1, currentStatus: "OPEN", confirmed: true });
    expect(result.status).toBe(500); expect(result.text).not.toContain("forced test failure");
    expect(await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toMatchObject({ currentStatus: "NEW", version: 1 });
  } finally { await fixture.prisma.$executeRawUnsafe('DROP TRIGGER fail_history ON "TicketStatusChange"'); }
});
