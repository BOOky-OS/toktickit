import { afterAll, beforeAll, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { issueSession, origin } from "../../src/auth/security.js";
import { databaseFixture } from "./database-fixture.js";
vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
let fixture: Awaited<ReturnType<typeof databaseFixture>>;
const users: Record<string, number> = {};
const sessions: Record<string, Awaited<ReturnType<typeof issueSession>>> = {};
let categoryId: number, relatedSystemId: number, serial = 920000;
beforeAll(async () => {
  fixture = await databaseFixture(); vi.mocked(getPrisma).mockReturnValue(fixture.prisma);
  categoryId = (await fixture.prisma.category.create({ data: { name: "Hardware" } })).id;
  relatedSystemId = (await fixture.prisma.relatedSystem.create({ data: { name: "Laptop" } })).id;
  for (const [name, role] of [["Requester", "REQUESTER"], ["Other", "REQUESTER"], ["Staff", "IT_STAFF"], ["Admin", "ADMIN"]] as const) {
    const user = await fixture.prisma.user.create({ data: { displayName: name, email: `${name}@communication.test`, role, passwordHash: "provisioned", mustChangePassword: false } });
    users[name] = user.id; sessions[name] = await issueSession(fixture.prisma, user.id);
  }
}, 60000);
afterAll(async () => { if (fixture) await fixture.dispose(); });
const make = () => fixture.prisma.ticket.create({ data: { ticketNumber: `TKT-2026-${serial++}`, requesterId: users.Requester, categoryId, relatedSystemId,
  clientSubmissionKey: randomUUID(), summary: "Battery drains quickly", description: "Battery drains during meetings.", requestedPriority: "MEDIUM", itPriority: "LOW" } });
function call(id: number, stream: string, method: "get" | "post" | "patch" | "delete", role = "Staff", body?: object) {
  const req = request(app)[method](`/api/tickets/${id}/${stream}`).set("Cookie", `toktickit.sid=${sessions[role].token}`)
    .set("Origin", origin()).set("X-CSRF-Token", sessions[role].csrfToken);
  return body ? req.send(body) : req;
}
it("allows public reads for the owner/Staff/Admin, appends only owner/Staff, and isolates other requesters", async () => {
  const ticket = await make();
  expect((await call(ticket.id, "comments", "get", "Requester")).body).toEqual([]);
  for (const role of ["Requester", "Staff"]) {
    const result = await call(ticket.id, "comments", "post", role, { body: `  Message by ${role}  ` });
    expect(result.status).toBe(201); expect(result.body).toMatchObject({ body: `Message by ${role}`, author: { id: users[role] } });
    expect(Object.keys(result.body).sort()).toEqual(["author", "body", "createdAt", "id"]);
  }
  for (const role of ["Requester", "Staff", "Admin"]) expect((await call(ticket.id, "comments", "get", role)).body).toHaveLength(2);
  expect((await call(ticket.id, "comments", "post", "Admin", { body: "Forbidden" })).status).toBe(403);
  for (const method of ["get", "post"] as const) expect((await call(ticket.id, "comments", method, "Other", method === "post" ? { body: "Wrong owner" } : undefined)).status).toBe(404);
});
it("keeps notes private across direct access, forged fields and requester serializers", async () => {
  const ticket = await make();
  expect((await call(ticket.id, "notes", "post", "Staff", { body: "PRIVATE_INTERNAL_MARKER" })).status).toBe(201);
  for (const role of ["Staff", "Admin"]) expect((await call(ticket.id, "notes", "get", role)).body[0].body).toBe("PRIVATE_INTERNAL_MARKER");
  for (const id of [ticket.id, 999999]) for (const method of ["get", "post"] as const) {
    const response = await call(id, "notes", method, "Requester", method === "post" ? { body: "forged" } : undefined);
    expect(response.status).toBe(403); expect(response.text).not.toMatch(/PRIVATE_INTERNAL_MARKER|count|author/);
  }
  expect((await call(ticket.id, "notes", "post", "Admin", { body: "Forbidden" })).status).toBe(403);
  for (const path of [`/api/tickets/${ticket.id}`, "/api/tickets", `/api/tickets/${ticket.id}/comments`]) {
    const response = await request(app).get(path).set("Cookie", `toktickit.sid=${sessions.Requester.token}`);
    expect(response.status).toBe(200); expect(response.text).not.toMatch(/PRIVATE_INTERNAL_MARKER|internalNote|noteCount/);
  }
  for (const body of [{ body: "hello", authorId: users.Admin }, { body: "hello", createdAt: "2020-01-01" }, { body: "hello", internal: true }])
    expect((await call(ticket.id, "comments", "post", "Requester", body)).status).toBe(400);
});
it("enforces trimmed content boundaries and preserves literal text", async () => {
  const ticket = await make();
  for (const [stream, max] of [["comments", 2000], ["notes", 4000]] as const) {
    for (const body of ["", " \n ", "a".repeat(max + 1), 123, ["hi"]]) expect((await call(ticket.id, stream, "post", "Staff", { body })).status).toBe(400);
    for (const body of ["x", "a".repeat(max), "  <script>alert('text')</script>\nsecond line  "]) {
      const result = await call(ticket.id, stream, "post", "Staff", { body });
      expect(result.status).toBe(201); expect(result.body.body).toBe(body.trim());
    }
  }
});
it("is append-only, checks CSRF and rejects posting after terminal status", async () => {
  const ticket = await make();
  for (const stream of ["comments", "notes"]) {
    for (const method of ["patch", "delete"] as const) expect((await call(ticket.id, stream, method, "Staff", { body: "overwrite" })).status).toBe(404);
    expect((await request(app).post(`/api/tickets/${ticket.id}/${stream}`).set("Cookie", `toktickit.sid=${sessions.Staff.token}`).send({ body: "missing csrf" })).status).toBe(403);
    for (const currentStatus of ["CLOSED", "CANCELLED"] as const) {
      await fixture.prisma.ticket.update({ where: { id: ticket.id }, data: { currentStatus } });
      expect((await call(ticket.id, stream, "post", "Staff", { body: "Too late" })).body.code).toBe("TICKET_READ_ONLY");
    }
  }
});
it("serializes concurrent independent appends and advances version for each entry", async () => {
  const ticket = await make();
  const results = await Promise.all([call(ticket.id, "comments", "post", "Requester", { body: "Public one" }), call(ticket.id, "notes", "post", "Staff", { body: "Private one" }), call(ticket.id, "comments", "post", "Staff", { body: "Public two" })]);
  expect(results.map(r => r.status)).toEqual([201, 201, 201]);
  expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(4);
  const sameTime = new Date("2026-09-01T00:00:00Z");
  await fixture.prisma.publicComment.updateMany({ where: { ticketId: ticket.id }, data: { createdAt: sameTime } });
  const entries = (await call(ticket.id, "comments", "get")).body;
  expect(entries[0].id).toBeLessThan(entries[1].id);
  await fixture.prisma.user.update({ where: { id: users.Staff }, data: { displayName: "Renamed Staff" } });
  expect((await call(ticket.id, "notes", "get", "Admin")).body[0].author).toMatchObject({ id: users.Staff, displayName: "Renamed Staff" });
});
it("rolls back an entry when the Ticket update fails", async () => {
  const ticket = await make();
  await fixture.prisma.$executeRawUnsafe('CREATE FUNCTION reject_ticket_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION \'forced test failure\'; END $$');
  await fixture.prisma.$executeRawUnsafe('CREATE TRIGGER fail_ticket_update BEFORE UPDATE ON "Ticket" FOR EACH ROW EXECUTE FUNCTION reject_ticket_update()');
  try {
    const response = await call(ticket.id, "comments", "post", "Staff", { body: "Must roll back" });
    expect(response.status).toBe(500); expect(response.text).not.toContain("forced test failure");
    expect(await fixture.prisma.publicComment.count({ where: { ticketId: ticket.id } })).toBe(0);
  } finally { await fixture.prisma.$executeRawUnsafe('DROP TRIGGER fail_ticket_update ON "Ticket"'); }
});
