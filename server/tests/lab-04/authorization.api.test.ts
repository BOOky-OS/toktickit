import { afterAll, beforeAll, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.js";
import { digest, issueSession, origin } from "../../src/auth/security.js";
import { actionFixture } from "./action-fixture.js";
vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
let f: Awaited<ReturnType<typeof actionFixture>>;
beforeAll(async () => { f = await actionFixture(); }, 60000);
afterAll(async () => { if (f) await f.dispose(); });
it("enforces action role/ownership boundaries with real login and CSRF", async () => {
  const t = await f.make(), path = `/tickets/${t.id}/actions`;
  for (const actor of ["anonymous", "inactive", "forced", "requester", "other", "staff", "admin"]) {
    const blocked = actor === "anonymous" || actor === "inactive" ? 401 : actor === "forced" ? 403 : undefined;
    const read = await f.call("get", path, actor);
    expect(read.status, actor).toBe(blocked ?? (actor === "other" ? 404 : 200));
    const write = await f.call("post", path, actor, {});
    expect(write.status, actor).toBe(blocked ?? (["requester", "other"].includes(actor) ? 403 : 400));
    const history = await f.call("get", `${path}/999999/history`, actor);
    expect(history.status, actor).toBe(blocked ?? (["requester", "other"].includes(actor) ? 403 : 404));
  }
  const foreign = await f.call("get", path, "other"), missing = await f.call("get", "/tickets/999999/actions", "other");
  expect(foreign.body).toEqual(missing.body);
  const noCsrf = await request(app).post(`/api${path}`).set("Cookie", f.headers.staff.Cookie).set("Idempotency-Key", randomUUID()).send(f.body());
  expect(noCsrf.status).toBe(403);
  const missingKey = await request(app).post(`/api${path}`).set(f.headers.staff).send(f.body()); expect(missingKey.status).toBe(400);
});
it("blocks deactivation/demotion while pending actions exist, then permits reassignment and revokes sessions", async () => {
  const t = await f.make(), path = `/tickets/${t.id}/actions`, created = await f.call("post", path, "admin", f.body());
  expect(created.status).toBe(201);
  const user = await f.prisma.user.findUniqueOrThrow({ where: { id: f.users.second } });
  const original = { displayName: user.displayName, email: user.email, role: user.role, isActive: true, version: user.version };
  for (const patch of [{ isActive: false }, { role: "REQUESTER" }]) {
    const result = await f.call("patch", `/admin/users/${user.id}`, "admin", { ...original, ...patch });
    expect(result.status).toBe(409); expect(result.body.code).toBe("ACTIVE_ASSIGNMENTS");
  }
  expect((await f.call("patch", `${path}/${created.body.action.id}`, "staff", { ...f.body(2), version: 1, assigneeId: f.users.admin })).status).toBe(200);
  expect((await f.call("patch", `/admin/users/${user.id}`, "admin", { ...original, isActive: false })).status).toBe(200);
  expect((await f.call("get", path, "second")).status).toBe(401);
  await f.prisma.user.update({ where: { id: user.id }, data: { isActive: true } });
});
it("revalidates sessions before receipt replay and denies expired/forced sessions", async () => {
  const t = await f.make(), path = `/tickets/${t.id}/actions`, key = randomUUID();
  const session = await issueSession(f.prisma, f.users.staff);
  const headers = { Cookie: `toktickit.sid=${session.token}`, Origin: origin(), "X-CSRF-Token": session.csrfToken };
  expect((await request(app).post(`/api${path}`).set(headers).set("Idempotency-Key", key).send(f.body())).status).toBe(201);
  await f.prisma.session.update({ where: { tokenHash: digest(session.token) }, data: { revokedAt: new Date() } });
  expect((await request(app).post(`/api${path}`).set(headers).set("Idempotency-Key", key).send(f.body())).status).toBe(401);
  const expired = await issueSession(f.prisma, f.users.staff);
  await f.prisma.session.update({ where: { tokenHash: digest(expired.token) }, data: { expiresAt: new Date(0) } });
  expect((await request(app).get(`/api${path}`).set("Cookie", `toktickit.sid=${expired.token}`)).status).toBe(401);
});
it("serializes assignment against deactivation so no ineligible pending assignee is committed", async () => {
  const t = await f.make(), path = `/tickets/${t.id}/actions`;
  const target = await f.prisma.user.create({ data: { displayName: "Race assignee", email: "race@actions.test", role: "IT_STAFF" } });
  const responses = await Promise.all([
    f.call("post", path, "staff", { ...f.body(), assigneeId: target.id }),
    f.call("patch", `/admin/users/${target.id}`, "admin", { displayName: target.displayName, email: target.email, role: target.role, isActive: false, version: 1 }),
  ]);
  expect(responses.map(r => r.status).filter(s => s === 409)).toHaveLength(1);
  const after = await f.prisma.user.findUniqueOrThrow({ where: { id: target.id } });
  const pending = await f.prisma.actionTaken.count({ where: { assigneeId: target.id, status: { in: ["PLANNED", "IN_PROGRESS"] } } });
  expect(after.isActive || pending === 0).toBe(true);
});
