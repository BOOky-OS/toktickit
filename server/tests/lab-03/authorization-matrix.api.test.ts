import { afterAll, beforeAll, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth/password.js";
import { databaseFixture } from "./database-fixture.js";
import { httpLogin, TEST_PASSWORD } from "./http-login.js";
vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
let fixture: Awaited<ReturnType<typeof databaseFixture>>;
const actors: Record<string, Awaited<ReturnType<typeof httpLogin>>> = {};
beforeAll(async () => {
  fixture = await databaseFixture();
  vi.mocked(getPrisma).mockReturnValue(fixture.prisma);
  const passwordHash = await hashPassword(TEST_PASSWORD);
  for (const name of ["REQUESTER", "IT_STAFF", "ADMIN", "forced"] as const) {
    await fixture.prisma.user.create({ data: { displayName: name, email: `${name.toLowerCase()}@audit.test`,
      role: name === "forced" ? "ADMIN" : name, mustChangePassword: name === "forced", passwordHash } });
    actors[name] = await httpLogin(`${name.toLowerCase()}@audit.test`);
  }
}, 60000);
afterAll(async () => { if (fixture) await fixture.dispose(); });
type Method = "get" | "head" | "post" | "patch" | "delete";
type Route = [Method, string, string[], number];
const all = ["REQUESTER", "IT_STAFF", "ADMIN"], staff = ["IT_STAFF", "ADMIN"];
// Independent contract matrix. Missing IDs / invalid bodies deliberately test
// authorization before lookup/validation; successful workflows are in the domain suites.
const routes: Route[] = [
  ["get", "/categories", all, 200], ["get", "/related-systems", all, 200],
  ["get", "/tickets", ["REQUESTER"], 200], ["post", "/tickets", ["REQUESTER"], 400],
  ["get", "/tickets/999999", all, 404], ["get", "/tickets/999999/attachments", all, 404],
  ["post", "/tickets/999999/attachments", ["REQUESTER"], 400],
  ["get", "/attachments/999999/download", all, 404], ["delete", "/attachments/999999", ["REQUESTER"], 400],
  ["get", "/staff/tickets", staff, 200], ["get", "/staff/assignees", staff, 200],
  ["get", "/tickets/999999/status-history", all, 404],
  ["post", "/staff/tickets/999999/claim", ["IT_STAFF", "ADMIN"], 400],
  ["patch", "/staff/tickets/999999/owner", ["IT_STAFF", "ADMIN"], 400],
  ["patch", "/staff/tickets/999999/priority", ["IT_STAFF", "ADMIN"], 400],
  ["post", "/staff/tickets/999999/status", ["IT_STAFF", "ADMIN"], 400],
  ["get", "/tickets/999999/comments", all, 404], ["post", "/tickets/999999/comments", ["REQUESTER", "IT_STAFF", "ADMIN"], 400],
  ["get", "/tickets/999999/notes", staff, 404], ["post", "/tickets/999999/notes", ["IT_STAFF", "ADMIN"], 400],
  ["post", "/tickets/999999/resolution-indication", ["REQUESTER"], 400],
  ["get", "/admin/users", ["ADMIN"], 200], ["get", "/admin/users/999999", ["ADMIN"], 404],
  ["post", "/admin/users", ["ADMIN"], 400], ["patch", "/admin/users/999999", ["ADMIN"], 400],
  ["post", "/admin/users/999999/initial-password", ["ADMIN"], 400],
];
// Express implicitly registers HEAD for GET handlers; include that surface too.
const methods = [...routes, ...routes.filter(r => r[0] === "get").map(r => ["head", ...r.slice(1)] as Route)];
const cases = methods.flatMap(([method, path, roles, granted]) =>
  ["anonymous", "forced", ...all].map(actor => ({ method, path, actor, expected:
    actor === "anonymous" ? 401 : actor === "forced" || !roles.includes(actor) ? 403 : granted })));
it.each(cases)("$actor $method $path -> $expected", async ({ method, path, actor, expected }) => {
  let call = request(app)[method](`/api${path}`);
  if (actor !== "anonymous") call = call.set(actors[actor]);
  if (!["get", "head"].includes(method)) call = call.send({});
  const res = await call;
  expect(res.status, res.text).toBe(expected);
  if (method !== "head" && expected === 401) expect(res.body.code).toBe("AUTH_REQUIRED");
  if (method !== "head" && expected === 403)
    expect(res.body.code).toBe(actor === "forced" ? "PASSWORD_CHANGE_REQUIRED" : "FORBIDDEN");
});
