import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { databaseFixture } from "./database-fixture.js";
import { hashPassword, verifyPassword } from "../../src/auth/password.js";
import { AUTH_MS, PRELOGIN_MS, clock, digest, issueSession, mutationGuard, revokeUserSessions, securityLock } from "../../src/auth/security.js";
import { loginLimit, csrfLimit, RateLimiter } from "../../src/auth/rate-limit.js";

vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
const ORIGIN = "http://localhost:5173";
const PASSWORD = "Original Password 123";
let fixture: Awaited<ReturnType<typeof databaseFixture>>;
let hash: string;
type Login = { cookie: string; csrf: string; user: { id: number } };
function cookie(res: request.Response) { return String(res.headers["set-cookie"][0]).split(";")[0]; }
async function csrfSession() {
  const res = await request(app).get("/api/auth/csrf");
  expect(res.status).toBe(200);
  return { cookie: cookie(res), csrf: res.body.csrfToken };
}
async function login(email = "requester@example.test", password = PASSWORD): Promise<Login> {
  const pre = await csrfSession();
  const res = await request(app).post("/api/auth/login").set("Cookie", pre.cookie)
    .set("Origin", ORIGIN).set("X-CSRF-Token", pre.csrf).send({ email, password });
  expect(res.status, res.text).toBe(200);
  return { cookie: cookie(res), csrf: res.body.csrfToken, user: res.body.user };
}
function change(actor: Login, body: object) {
  return request(app).post("/api/auth/password").set("Cookie", actor.cookie)
    .set("Origin", ORIGIN).set("X-CSRF-Token", actor.csrf).send(body);
}
beforeAll(async () => {
  fixture = await databaseFixture();
  hash = await hashPassword(PASSWORD);
}, 60000);
beforeEach(async () => {
  vi.mocked(getPrisma).mockReturnValue(fixture.prisma);
  loginLimit.clear(); csrfLimit.clear();
  await fixture.prisma.session.deleteMany();
  await fixture.prisma.user.deleteMany();
  await fixture.prisma.user.createMany({ data: [
    { displayName: "Requester", email: "requester@example.test", role: "REQUESTER", passwordHash: hash, mustChangePassword: false },
    { displayName: "Staff", email: "staff@example.test", role: "IT_STAFF", passwordHash: hash, mustChangePassword: false },
    { displayName: "Admin", email: "admin@example.test", role: "ADMIN", passwordHash: hash, mustChangePassword: false },
    { displayName: "Initial", email: "initial@example.test", passwordHash: hash },
    { displayName: "Inactive", email: "inactive@example.test", isActive: false, passwordHash: hash },
    { displayName: "Unprovisioned", email: "null@example.test" },
  ] });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
afterAll(async () => { if (fixture) await fixture.dispose(); });

describe("Persisted authentication", () => {
  it.each(["requester", "staff", "admin"])("logs in %s, rotates tokens and returns only safe identity", async name => {
    const pre = await csrfSession();
    const res = await request(app).post("/api/auth/login").set("Cookie", pre.cookie).set("Origin", ORIGIN)
      .set("X-CSRF-Token", pre.csrf).send({ email: `  ${name.toUpperCase()}@EXAMPLE.TEST  `, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(["csrfToken", "user"]);
    expect(Object.keys(res.body.user).sort()).toEqual(["displayName", "email", "id", "mustChangePassword", "role"]);
    expect(res.headers["set-cookie"][0]).toContain("Max-Age=28800");
    expect(cookie(res)).not.toBe(pre.cookie); expect(res.body.csrfToken).not.toBe(pre.csrf);
    const raw = cookie(res).split("=")[1];
    const stored = await fixture.prisma.session.findUniqueOrThrow({ where: { tokenHash: digest(raw) } });
    expect(stored.tokenHash).not.toBe(raw);
    expect(stored.expiresAt.getTime() - stored.createdAt.getTime()).toBeGreaterThan(AUTH_MS - 5000);
    expect((await request(app).get("/api/auth/me").set("Cookie", pre.cookie)).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie(res))).body.user).toEqual(res.body.user);
    expect(res.headers["cache-control"]).toBe("no-store");
  });
  it("returns identical wrong, unknown, inactive and unprovisioned failures", async () => {
    const pre = await csrfSession(); const bodies = [];
    for (const email of ["requester@example.test", "unknown@example.test", "inactive@example.test", "null@example.test"]) {
      const res = await request(app).post("/api/auth/login").set("Cookie", pre.cookie).set("Origin", ORIGIN)
        .set("X-CSRF-Token", pre.csrf).send({ email, password: "wrong" });
      expect(res.status).toBe(401); bodies.push(res.body);
    }
    expect(bodies.every(b => JSON.stringify(b) === JSON.stringify(bodies[0]))).toBe(true);
    expect(bodies[0]).toEqual({ error: "Unable to sign in. Check your credentials or contact your administrator.", code: "INVALID_CREDENTIALS" });
  });
  it("rejects malformed or unsupported login input without creating authenticated sessions", async () => {
    const pre = await csrfSession();
    for (const body of [{ email: [], password: PASSWORD }, { email: "a@b", password: PASSWORD },
      { email: "requester@example.test", password: "x".repeat(129) }, { email: "requester@example.test", password: "" },
      { email: "requester@example.test", password: PASSWORD, role: "ADMIN" }]) {
      expect((await request(app).post("/api/auth/login").set("Cookie", pre.cookie).set("Origin", ORIGIN)
        .set("X-CSRF-Token", pre.csrf).send(body)).status).toBe(400);
    }
    expect(await fixture.prisma.session.count({ where: { userId: { not: null } } })).toBe(0);
  });
  it("enforces forced change on every domain route, including unimplemented role routes", async () => {
    const actor = await login("initial@example.test");
    for (const path of ["/categories", "/related-systems", "/tickets", "/tickets/1", "/tickets/1/attachments", "/attachments/1/download", "/staff/tickets", "/admin/users", "/tickets/1/notes"]) {
      const res = await request(app).get(`/api${path}`).set("Cookie", actor.cookie);
      expect(res.status).toBe(403); expect(res.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
    }
    expect((await request(app).post("/api/tickets").set("Cookie", actor.cookie).set("Origin", ORIGIN)
      .set("X-CSRF-Token", actor.csrf).send({})).body.code).toBe("PASSWORD_CHANGE_REQUIRED");
    expect((await request(app).get("/api/auth/me").set("Cookie", actor.cookie)).status).toBe(200);
    expect((await request(app).get("/api/auth/csrf").set("Cookie", actor.cookie)).body.csrfToken).toBe(actor.csrf);
  });
  it("validates replacement boundaries, confirmation, difference and current password", async () => {
    const actor = await login("initial@example.test");
    for (const newPassword of ["a".repeat(11), "a".repeat(129), " ".repeat(12), PASSWORD]) {
      expect((await change(actor, { currentPassword: PASSWORD, newPassword, confirmPassword: newPassword })).status).toBe(400);
    }
    expect((await change(actor, { currentPassword: PASSWORD, newPassword: "Replacement 123", confirmPassword: "mismatch" })).status).toBe(400);
    const wrong = await change(actor, { currentPassword: "wrong", newPassword: "Replacement 123", confirmPassword: "Replacement 123" });
    expect(wrong.status).toBe(400); expect(wrong.body.fieldErrors.currentPassword).toBeDefined();
    expect((await fixture.prisma.user.findUniqueOrThrow({ where: { id: actor.user.id } })).mustChangePassword).toBe(true);
  });
  it.each(["A".repeat(12), "😀".repeat(128), "  Replacement password  "])("changes to a valid boundary password without trimming: %s", async newPassword => {
    const first = await login("initial@example.test"); const second = await login("initial@example.test");
    const res = await change(first, { currentPassword: PASSWORD, newPassword, confirmPassword: newPassword });
    expect(res.status).toBe(200); expect(res.body.user.mustChangePassword).toBe(false);
    expect(res.body.csrfToken).not.toBe(first.csrf);
    for (const old of [first, second]) expect((await request(app).get("/api/auth/me").set("Cookie", old.cookie)).status).toBe(401);
    const saved = await fixture.prisma.user.findUniqueOrThrow({ where: { id: first.user.id } });
    expect(await verifyPassword(newPassword, saved.passwordHash!)).toBe(true);
    expect(saved.version).toBe(2);
    expect((await request(app).get("/api/categories").set("Cookie", cookie(res))).status).toBe(200);
  }, 15000);
  it("supports voluntary change and logout with persisted revocation", async () => {
    const actor = await login();
    const changed = await change(actor, { currentPassword: PASSWORD, newPassword: "New voluntary password", confirmPassword: "New voluntary password" });
    expect(changed.status).toBe(200);
    const freshCookie = cookie(changed);
    const logout = await request(app).post("/api/auth/logout").set("Cookie", freshCookie).set("Origin", ORIGIN)
      .set("X-CSRF-Token", changed.body.csrfToken).send({});
    expect(logout.status).toBe(204); expect(logout.headers["set-cookie"][0]).toContain("Max-Age=0");
    expect((await request(app).get("/api/auth/me").set("Cookie", freshCookie)).status).toBe(401);
    expect((await request(app).post("/api/auth/logout").set("Cookie", freshCookie).set("Origin", ORIGIN)
      .set("X-CSRF-Token", changed.body.csrfToken).send({})).status).toBe(401);
  });
  it("expires at the exact absolute boundary and ignores forged or duplicate cookies/bearer", async () => {
    const actor = await login();
    const row = await fixture.prisma.session.findUniqueOrThrow({ where: { tokenHash: digest(actor.cookie.split("=")[1]) } });
    vi.spyOn(clock, "now").mockReturnValue(new Date(row.expiresAt.getTime() - 1));
    expect((await request(app).get("/api/auth/me").set("Cookie", actor.cookie)).status).toBe(200);
    vi.spyOn(clock, "now").mockReturnValue(row.expiresAt);
    expect((await request(app).get("/api/auth/me").set("Cookie", actor.cookie)).status).toBe(401);
    for (const value of ["toktickit.sid=garbage", `${actor.cookie}; ${actor.cookie}`, `toktickit.sid=${"f".repeat(64)}`]) {
      expect((await request(app).get("/api/auth/me").set("Cookie", value)).status).toBe(401);
    }
    expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${actor.cookie.split("=")[1]}`)).status).toBe(401);
  });
  it("rereads current activation, provisioning and role and supports atomic account revocation", async () => {
    const actor = await login();
    await fixture.prisma.user.update({ where: { id: actor.user.id }, data: { role: "ADMIN" } });
    expect((await request(app).get("/api/tickets").set("Cookie", actor.cookie)).status).toBe(403);
    await fixture.prisma.user.update({ where: { id: actor.user.id }, data: { isActive: false } });
    expect((await request(app).get("/api/auth/me").set("Cookie", actor.cookie)).status).toBe(401);
    await fixture.prisma.user.update({ where: { id: actor.user.id }, data: { isActive: true, passwordHash: null } });
    expect((await request(app).get("/api/auth/me").set("Cookie", actor.cookie)).status).toBe(401);
    await fixture.prisma.$transaction(async tx => {
      await securityLock(tx);
      await tx.user.update({ where: { id: actor.user.id }, data: { email: "changed@example.test", passwordHash: hash } });
      await revokeUserSessions(tx, actor.user.id);
    });
    expect((await request(app).get("/api/auth/me").set("Cookie", actor.cookie)).status).toBe(401);
  });
  it("rechecks revoked sessions inside domain mutation transactions", async () => {
    const actor = await login();
    const user = await fixture.prisma.user.findUniqueOrThrow({ where: { id: actor.user.id } });
    const guard = mutationGuard({ token: actor.cookie.split("=")[1], user }, ["REQUESTER"]);
    await fixture.prisma.$transaction(async tx => { await securityLock(tx); await revokeUserSessions(tx, user.id); });
    await expect(fixture.prisma.$transaction(async tx => {
      await guard(tx);
      await tx.user.update({ where: { id: user.id }, data: { displayName: "Unauthorized" } });
    })).rejects.toMatchObject({ status: 401 });
    expect((await fixture.prisma.user.findUniqueOrThrow({ where: { id: user.id } })).displayName).toBe("Requester");
  });
  it("serializes simultaneous password changes so only one can commit", async () => {
    const actor = await login();
    const results = await Promise.all(["Concurrent Password One", "Concurrent Password Two"].map(newPassword =>
      change(actor, { currentPassword: PASSWORD, newPassword, confirmPassword: newPassword })));
    expect(results.map(r => r.status).sort()).toEqual([200, 401]);
    expect(await fixture.prisma.session.count({ where: { userId: actor.user.id, revokedAt: null } })).toBe(1);
  }, 15000);
  it("returns safe session-store errors without claiming logout success", async () => {
    const actor = await login();
    vi.mocked(getPrisma).mockReturnValue({ session: { findUnique: async () => { throw new Error("postgresql://private-secret"); } },
      $transaction: async () => { throw new Error("private-password-hash"); } } as never);
    for (const path of ["/auth/me", "/auth/csrf", "/categories"]) {
      const res = await request(app).get(`/api${path}`).set("Cookie", actor.cookie);
      expect(res.status).toBe(500); expect(res.body.code).toBe("INTERNAL_ERROR"); expect(res.text).not.toContain("private");
    }
    const res = await request(app).post("/api/auth/logout").set("Cookie", actor.cookie).set("Origin", ORIGIN).set("X-CSRF-Token", actor.csrf).send({});
    expect(res.status).toBe(500); expect(res.headers["set-cookie"]).toBeUndefined();
  });
});

describe("CSRF, cookies and limits", () => {
  it("uses HttpOnly host-only cookies with secure defaults and explicit local HTTP opt-in", async () => {
    for (const production of [false, true]) {
      vi.stubEnv("NODE_ENV", production ? "production" : "test");
      vi.stubEnv("ALLOW_LOCAL_HTTP", "true");
      const res = await request(app).get("/api/auth/csrf");
      const value = res.headers["set-cookie"][0];
      expect(value).toContain("HttpOnly"); expect(value).toContain("SameSite=Lax");
      expect(value).toContain("Path=/"); expect(value).not.toContain("Domain=");
      expect(value.includes("Secure")).toBe(production); expect(value).toContain("Max-Age=600");
    }
    vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("ALLOW_LOCAL_HTTP", "false");
    expect((await request(app).get("/api/auth/csrf")).headers["set-cookie"][0]).toContain("Secure");
  });
  it("denies anonymous authorization, expires prelogin cookies and reuses valid CSRF tokens", async () => {
    const pre = await csrfSession();
    expect((await request(app).get("/api/tickets").set("Cookie", pre.cookie)).status).toBe(401);
    const reused = await request(app).get("/api/auth/csrf").set("Cookie", pre.cookie);
    expect(reused.body.csrfToken).toBe(pre.csrf); expect(reused.headers["set-cookie"]).toBeUndefined();
    const now = clock.now().getTime(); vi.spyOn(clock, "now").mockReturnValue(new Date(now + PRELOGIN_MS));
    const fresh = await request(app).get("/api/auth/csrf").set("Cookie", pre.cookie);
    expect(fresh.body.csrfToken).not.toBe(pre.csrf);
  });
  it("requires exact Origin and session-bound token for login, JSON and multipart writes", async () => {
    const actor = await login(); const other = await csrfSession();
    for (const [origin, token] of [["", actor.csrf], ["https://hostile.test", actor.csrf], [ORIGIN, ""], [ORIGIN, other.csrf]]) {
      const res = await request(app).post("/api/auth/logout").set("Cookie", actor.cookie)
        .set("Origin", origin).set("X-CSRF-Token", token).send({});
      expect(res.status).toBe(403); expect(res.body.code).toBe("CSRF_INVALID");
      const upload = await request(app).post("/api/tickets/1/attachments").set("Cookie", actor.cookie)
        .set("Origin", origin).set("X-CSRF-Token", token).attach("file", Buffer.from("%PDF-1.7"), "x.pdf");
      expect(upload.status).toBe(403);
    }
    expect((await request(app).post("/api/auth/login").send({ email: "requester@example.test", password: PASSWORD })).status).toBe(403);
    expect((await request(app).get("/api/auth/me").set("Cookie", actor.cookie)).status).toBe(200);
  });
  it("restricts credentialed CORS and safely rejects unsupported/oversize/unknown requests", async () => {
    const allowed = await request(app).options("/api/auth/login").set("Origin", ORIGIN).set("Access-Control-Request-Method", "POST");
    expect(allowed.headers["access-control-allow-origin"]).toBe(ORIGIN);
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");
    const denied = await request(app).get("/api/health").set("Origin", "https://hostile.test");
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
    expect((await request(app).post("/api/auth/login").type("text").send("x")).status).toBe(415);
    expect((await request(app).post("/api/auth/login").send({ padding: "x".repeat(33000) })).status).toBe(413);
    expect((await request(app).get("/api/development-requesters")).body.code).toBe("NOT_FOUND");
    expect((await request(app).get("/api/auth/me?x=1&x=2")).status).toBe(400);
  });
  it("throttles normalized email at 10 attempts and expires its bucket", async () => {
    const pre = await csrfSession();
    const send = () => request(app).post("/api/auth/login").set("Cookie", pre.cookie).set("Origin", ORIGIN)
      .set("X-CSRF-Token", pre.csrf).send({ email: " UNKNOWN@example.test ", password: "bad" });
    for (let i = 0; i < 10; i++) expect((await send()).status).toBe(401);
    const limited = await send(); expect(limited.status).toBe(429); expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
    const now = clock.now().getTime(); vi.spyOn(clock, "now").mockReturnValue(new Date(now + 15 * 60 * 1000));
    const fresh = await csrfSession();
    expect((await request(app).post("/api/auth/login").set("Cookie", fresh.cookie).set("Origin", ORIGIN)
      .set("X-CSRF-Token", fresh.csrf).send({ email: "unknown@example.test", password: "bad" })).status).toBe(401);
  }, 15000);
  it("wires the IP throttle into login and ignores untrusted forwarded IP headers", async () => {
    const pre = await csrfSession();
    // Supertest's socket address is IPv4-mapped loopback; trust proxy is disabled.
    for (let i = 0; i < 29; i++) loginLimit.consume([["ip:::ffff:127.0.0.1", 30]]);
    const send = (email: string) => request(app).post("/api/auth/login").set("Cookie", pre.cookie)
      .set("Origin", ORIGIN).set("X-CSRF-Token", pre.csrf).set("X-Forwarded-For", "203.0.113.9")
      .send({ email, password: "wrong" });
    expect((await send("one@example.test")).status).toBe(401);
    const res = await send("two@example.test"); expect(res.status).toBe(429);
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
  });
  it("enforces independent IP limit, anonymous CSRF limit, bounded buckets and expiry", async () => {
    const limiter = new RateLimiter(100);
    for (let i = 0; i < 30; i++) limiter.consume([["ip:one", 30], [`email:${i}`, 10]]);
    expect(() => limiter.consume([["ip:one", 30], ["email:new", 10]])).toThrow(expect.objectContaining({ status: 429 }));
    const bounded = new RateLimiter(1); bounded.consume([["one", 2]]);
    expect(() => bounded.consume([["two", 2]])).toThrow(expect.objectContaining({ status: 429 }));
    for (let i = 0; i < 60; i++) expect((await request(app).get("/api/auth/csrf")).status).toBe(200);
    const res = await request(app).get("/api/auth/csrf"); expect(res.status).toBe(429);
    const now = clock.now().getTime(); vi.spyOn(clock, "now").mockReturnValue(new Date(now + 900000));
    expect(() => bounded.consume([["two", 2]])).not.toThrow();
    expect((await request(app).get("/api/auth/csrf")).status).toBe(200);
  });
});
