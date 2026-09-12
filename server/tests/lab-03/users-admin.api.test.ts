import { afterAll, beforeAll, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { issueSession, origin, securityLock } from "../../src/auth/security.js";
import { verifyPassword } from "../../src/auth/password.js";
import { databaseFixture } from "./database-fixture.js";
vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
let fixture: Awaited<ReturnType<typeof databaseFixture>>;
const sessions: Record<string, Awaited<ReturnType<typeof issueSession>>> = {};
const users: Record<string, number> = {};
const newPassword = "Initial lab password 123!";
beforeAll(async () => {
  fixture = await databaseFixture(); vi.mocked(getPrisma).mockReturnValue(fixture.prisma);
  for (const [name, role] of [["Admin", "ADMIN"], ["Staff", "IT_STAFF"], ["Requester", "REQUESTER"]] as const) {
    const user = await fixture.prisma.user.create({ data: { displayName: name, email: `${name.toLowerCase()}@admin.test`, role, passwordHash: "provisioned", mustChangePassword: false } });
    users[name] = user.id; sessions[name] = await issueSession(fixture.prisma, user.id);
  }
}, 60000);
afterAll(async () => { if (fixture) await fixture.dispose(); });
function call(path = "", method: "get" | "post" | "patch" | "delete" = "get", body?: object, role = "Admin") {
  const req = request(app)[method](`/api/admin/users${path}`).set("Cookie", `toktickit.sid=${sessions[role].token}`).set("Origin", origin()).set("X-CSRF-Token", sessions[role].csrfToken);
  return body ? req.send(body) : req;
}
const data = (email: string) => ({ displayName: "New User", email, role: "REQUESTER", isActive: true, initialPassword: newPassword });
async function fresh(name: string, role: "ADMIN" | "IT_STAFF" | "REQUESTER" = "REQUESTER") {
  return fixture.prisma.user.create({ data: { displayName: name, email: `${randomUUID()}@test.local`, role, isActive: true, passwordHash: "provisioned", mustChangePassword: false } });
}
const edit = (u: { displayName: string; email: string; role: string; isActive: boolean; version: number }, fields = {}) => ({ displayName: u.displayName, email: u.email, role: u.role, isActive: u.isActive, version: u.version, ...fields });
it("restricts all user endpoints to Admin and rejects unknown list controls", async () => {
  for (const role of ["Staff", "Requester"]) for (const [path, method, body] of [["", "get", undefined], ["", "post", data("deny@test.local")], [`/${users.Requester}`, "patch", {}], [`/${users.Requester}/initial-password`, "post", {}]] as const)
    expect((await call(path, method, body, role)).status).toBe(403);
  expect((await request(app).get("/api/admin/users")).status).toBe(401);
  expect((await call(`/${users.Requester}`, "delete", {})).status).toBe(404);
  for (const query of ["?page=1", "?search=a&search=b", "?role=invalid", "?search="]) expect((await call(query)).status).toBe(400);
});
it("creates normalized users with hashed initial passwords and safe serializers", async () => {
  const response = await call("", "post", data("  FIRST@Example.Test  "));
  expect(response.status).toBe(201); expect(response.body).toMatchObject({ email: "first@example.test", mustChangePassword: true, version: 1 });
  expect(response.text).not.toMatch(/passwordHash|seedKey|Initial lab/);
  const stored = await fixture.prisma.user.findUniqueOrThrow({ where: { id: response.body.id } });
  expect(await verifyPassword(newPassword, stored.passwordHash!)).toBe(true);
  expect((await call("", "post", { ...data("FIRST@example.test"), isActive: false })).body.code).toBe("DUPLICATE_EMAIL");
  const race = await Promise.all([call("", "post", data("race@test.local")), call("", "post", data("RACE@test.local"))]);
  expect(race.map(r => r.status).sort()).toEqual([201, 409]);
});
it("searches names/emails literally and case-insensitively, filters one role, and sorts stably", async () => {
  const user = await fresh("Literal 100%_ user", "IT_STAFF");
  expect((await call("?search=100%25_")).body.items.map((u: {id:number}) => u.id)).toEqual([user.id]);
  expect((await call("?search=LITERAL&role=IT_STAFF")).body.totalItems).toBe(1);
  expect((await call("?search=no-such-user")).body).toEqual({ items: [], totalItems: 0 });
  const response = await call("?role=ADMIN"); expect(response.body.items.every((u: {role:string}) => u.role === "ADMIN")).toBe(true);
  expect((await call(`/${user.id}`)).body.id).toBe(user.id);
});
it("checks versions before no-ops and revokes sessions only for security-sensitive edits", async () => {
  const user = await fresh("Session target"); const session = await issueSession(fixture.prisma, user.id);
  const noop = await call(`/${user.id}`, "patch", edit(user)); expect(noop.body.version).toBe(1);
  const renamed = await call(`/${user.id}`, "patch", edit(user, { displayName: "Renamed target" })); expect(renamed.body.version).toBe(2);
  expect((await request(app).get("/api/auth/me").set("Cookie", `toktickit.sid=${session.token}`)).status).toBe(200);
  expect((await call(`/${user.id}`, "patch", edit(user))).body.code).toBe("STALE_VERSION");
  const changed = await call(`/${user.id}`, "patch", edit(renamed.body, { email: "new-email@test.local" })); expect(changed.status).toBe(200);
  expect((await request(app).get("/api/auth/me").set("Cookie", `toktickit.sid=${session.token}`)).status).toBe(401);
});
it("rejects self-deactivation and demotion of the last active Admin", async () => {
  const admin = await fixture.prisma.user.findUniqueOrThrow({ where: { id: users.Admin } });
  expect((await call(`/${admin.id}`, "patch", edit(admin, { isActive: false }))).body.code).toBe("SELF_DEACTIVATION");
  expect((await call(`/${admin.id}`, "patch", edit(admin, { role: "REQUESTER" }))).body.code).toBe("LAST_ACTIVE_ADMIN");
});
it("serializes concurrent Admin demotions so one active Admin remains", async () => {
  const second = await fresh("Second admin", "ADMIN"); sessions.Second = await issueSession(fixture.prisma, second.id);
  const first = await fixture.prisma.user.findUniqueOrThrow({ where: { id: users.Admin } });
  const results = await Promise.all([call(`/${first.id}`, "patch", edit(first, { role: "REQUESTER" })), call(`/${second.id}`, "patch", edit(second, { role: "REQUESTER" }), "Second")]);
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
  expect(await fixture.prisma.user.count({ where: { role: "ADMIN", isActive: true } })).toBe(1);
  // Restore the fixture's primary actor after the concurrency assertion.
  await fixture.prisma.user.update({ where: { id: first.id }, data: { role: "ADMIN" } });
  await fixture.prisma.user.update({ where: { id: second.id }, data: { role: "REQUESTER" } });
  sessions.Admin = await issueSession(fixture.prisma, first.id);
});
it("guards active assignments and preserves historical ownership on deactivation/reactivation", async () => {
  const owner = await fresh("Ticket owner", "IT_STAFF");
  const category = await fixture.prisma.category.create({ data: { name: "Hardware" } }), system = await fixture.prisma.relatedSystem.create({ data: { name: "Laptop" } });
  const ticket = await fixture.prisma.ticket.create({ data: { ticketNumber: "TKT-2026-940000", requesterId: users.Requester, ownerId: owner.id, categoryId: category.id, relatedSystemId: system.id, clientSubmissionKey: randomUUID(), summary: "Laptop issue", description: "Needs repair", requestedPriority: "MEDIUM", itPriority: "LOW" } });
  for (const fields of [{ isActive: false }, { role: "REQUESTER" }]) expect((await call(`/${owner.id}`, "patch", edit(owner, fields))).body.code).toBe("ACTIVE_ASSIGNMENTS");
  const toAdmin = await call(`/${owner.id}`, "patch", edit(owner, { role: "ADMIN" })); expect(toAdmin.status).toBe(200);
  await fixture.prisma.ticket.update({ where: { id: ticket.id }, data: { currentStatus: "CLOSED" } });
  const disabled = await call(`/${owner.id}`, "patch", edit(toAdmin.body, { isActive: false })); expect(disabled.status).toBe(200);
  expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).ownerId).toBe(owner.id);
  const active = await call(`/${owner.id}`, "patch", edit(disabled.body, { isActive: true })); expect(active.body.mustChangePassword).toBe(false);
});
it("resets an initial password, requires replacement, and revokes target sessions", async () => {
  const created = (await call("", "post", data("reset@test.local"))).body;
  await fixture.prisma.user.update({ where: { id: created.id }, data: { mustChangePassword: false } });
  const session = await issueSession(fixture.prisma, created.id);
  expect((await call(`/${created.id}/initial-password`, "post", { initialPassword: newPassword, version: 1, confirmed: true })).status).toBe(400);
  const result = await call(`/${created.id}/initial-password`, "post", { initialPassword: "Replacement password 456!", version: 1, confirmed: true });
  expect(result.status).toBe(200); expect(result.body).toMatchObject({ version: 2, mustChangePassword: true });
  expect(result.text).not.toMatch(/passwordHash|Replacement password/);
  expect((await request(app).get("/api/auth/me").set("Cookie", `toktickit.sid=${session.token}`)).status).toBe(401);
  expect(await verifyPassword("Replacement password 456!", (await fixture.prisma.user.findUniqueOrThrow({ where: { id: created.id } })).passwordHash!)).toBe(true);
});
it("revalidates an actor revoked while a domain mutation waits on the security lock", async () => {
  const actor = await fresh("Revoked actor", "ADMIN"); sessions.Revoked = await issueSession(fixture.prisma, actor.id);
  const target = await fresh("Target");
  let release!: () => void, locked!: () => void;
  const ready = new Promise<void>(r => { locked = r; }), wait = new Promise<void>(r => { release = r; });
  const tx = fixture.prisma.$transaction(async db => { await securityLock(db); locked(); await wait; await db.session.updateMany({ where: { userId: actor.id }, data: { revokedAt: new Date() } }); });
  await ready;
  const pending = call(`/${target.id}`, "patch", edit(target, { displayName: "Forbidden rename" }), "Revoked").then(r => r);
  release(); await tx;
  expect((await pending).status).toBe(401);
  expect((await fixture.prisma.user.findUniqueOrThrow({ where: { id: target.id } })).displayName).toBe("Target");
});

it("serializes owner deactivation against a concurrent claim", async () => {
  const staff = await fresh("Racing owner", "IT_STAFF");
  const session = await issueSession(fixture.prisma, staff.id);
  const category = await fixture.prisma.category.create({ data: { name: "Race category" } });
  const system = await fixture.prisma.relatedSystem.create({ data: { name: "Race system" } });
  const ticket = await fixture.prisma.ticket.create({ data: { ticketNumber: "TKT-2026-940001", requesterId: users.Requester, categoryId: category.id, relatedSystemId: system.id, clientSubmissionKey: randomUUID(), summary: "Assignment race", description: "Claim versus deactivation", requestedPriority: "MEDIUM", itPriority: "LOW" } });
  const results = await Promise.all([
    call(`/${staff.id}`, "patch", edit(staff, { isActive: false })),
    request(app).post(`/api/staff/tickets/${ticket.id}/claim`).set("Cookie", `toktickit.sid=${session.token}`).set("Origin", origin()).set("X-CSRF-Token", session.csrfToken).send({ version: 1 }),
  ]);
  const currentUser = await fixture.prisma.user.findUniqueOrThrow({ where: { id: staff.id } });
  const currentTicket = await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
  if (currentTicket.ownerId === staff.id) {
    expect(currentUser.isActive).toBe(true); expect(results[0].body.code).toBe("ACTIVE_ASSIGNMENTS"); expect(results[1].status).toBe(200);
  } else {
    expect(currentTicket.ownerId).toBeNull(); expect(currentUser.isActive).toBe(false); expect(results[0].status).toBe(200); expect(results[1].status).toBe(401);
  }
});
