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
const users: Record<string, number> = {}, sessions: Record<string, Awaited<ReturnType<typeof issueSession>>> = {};
let categoryId: number, relatedSystemId: number, serial = 930000;
beforeAll(async () => {
  fixture = await databaseFixture(); vi.mocked(getPrisma).mockReturnValue(fixture.prisma);
  categoryId = (await fixture.prisma.category.create({ data: { name: "Hardware" } })).id;
  relatedSystemId = (await fixture.prisma.relatedSystem.create({ data: { name: "Laptop" } })).id;
  for (const [name, role] of [["Requester", "REQUESTER"], ["Other", "REQUESTER"], ["Staff", "IT_STAFF"], ["Admin", "ADMIN"]] as const) {
    const user = await fixture.prisma.user.create({ data: { displayName: name, email: `${name}@indication.test`, role, passwordHash: "provisioned", mustChangePassword: false } });
    users[name] = user.id; sessions[name] = await issueSession(fixture.prisma, user.id);
  }
}, 60000);
afterAll(async () => { if (fixture) await fixture.dispose(); });
const make = (currentStatus: TicketStatus = "OPEN") => fixture.prisma.ticket.create({ data: { ticketNumber: `TKT-2026-${serial++}`, requesterId: users.Requester, categoryId, relatedSystemId, currentStatus,
  clientSubmissionKey: randomUUID(), summary: "Battery drains quickly", description: "Battery drains during meetings.", requestedPriority: "MEDIUM", itPriority: "LOW", ownerId: users.Staff } });
function indicate(id: number, body: object = { version: 1, confirmed: true }, role = "Requester") {
  return request(app).post(`/api/tickets/${id}/resolution-indication`).set("Cookie", `toktickit.sid=${sessions[role].token}`).set("Origin", origin()).set("X-CSRF-Token", sessions[role].csrfToken).send(body);
}
it("sets the indication once in five allowed statuses without changing owner or formal status", async () => {
  for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as const) {
    const ticket = await make(status), first = await indicate(ticket.id);
    expect(first.status).toBe(200); expect(first.body).toMatchObject({ currentStatus: status, owner: { id: users.Staff }, version: 2 });
    expect(first.body.requesterResolutionIndicatedAt).not.toBeNull();
    const repeated = await indicate(ticket.id, { version: 2, confirmed: true });
    expect(repeated.body).toMatchObject({ version: 2, updatedAt: first.body.updatedAt, requesterResolutionIndicatedAt: first.body.requesterResolutionIndicatedAt });
    expect(await fixture.prisma.ticketStatusChange.count({ where: { ticketId: ticket.id } })).toBe(0);
  }
});
it("denies wrong roles/owners and malformed, terminal and stale requests", async () => {
  const ticket = await make();
  for (const role of ["Staff", "Admin"]) expect((await indicate(ticket.id, { version: 1, confirmed: true }, role)).status).toBe(403);
  expect((await indicate(ticket.id, { version: 1, confirmed: true }, "Other")).status).toBe(404);
  for (const body of [{ version: 1 }, { version: "1", confirmed: true }, { version: 1, confirmed: true, currentStatus: "RESOLVED" }]) expect((await indicate(ticket.id, body)).status).toBe(400);
  for (const status of ["RESOLVED", "CLOSED", "CANCELLED"] as const) expect((await indicate((await make(status)).id)).status).toBe(409);
  await indicate(ticket.id); expect((await indicate(ticket.id)).body.code).toBe("STALE_VERSION");
});
it("allows one winner for concurrent indications and preserves stale-write protection after an append", async () => {
  const ticket = await make();
  const results = await Promise.all([indicate(ticket.id), indicate(ticket.id)]);
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
  const response = await request(app).post(`/api/tickets/${ticket.id}/comments`).set("Cookie", `toktickit.sid=${sessions.Requester.token}`).set("Origin", origin()).set("X-CSRF-Token", sessions.Requester.csrfToken).send({ body: "Additional context" });
  expect(response.status).toBe(201);
  expect((await indicate(ticket.id, { version: 2, confirmed: true })).body.code).toBe("STALE_VERSION");
});
