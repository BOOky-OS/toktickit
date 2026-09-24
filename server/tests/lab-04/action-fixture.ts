import { randomUUID } from "node:crypto";
import request from "supertest";
import { vi } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { issueSession, origin } from "../../src/auth/security.js";
import { hashPassword } from "../../src/auth/password.js";
import { databaseFixture } from "../lab-03/database-fixture.js";
import { httpLogin, TEST_PASSWORD } from "../lab-03/http-login.js";

export async function actionFixture() {
  const db = await databaseFixture("99999999999999"); // All migrations, Lab 4 owned schema.
  vi.mocked(getPrisma).mockReturnValue(db.prisma);
  const category = await db.prisma.category.create({ data: { name: "Actions test" } });
  const system = await db.prisma.relatedSystem.create({ data: { name: "Actions system" } });
  const users: Record<string, number> = {}, headers: Record<string, Record<string, string>> = {};
  const passwordHash = await hashPassword(TEST_PASSWORD);
  for (const [name, role] of [["requester", "REQUESTER"], ["other", "REQUESTER"], ["staff", "IT_STAFF"], ["second", "IT_STAFF"], ["admin", "ADMIN"], ["inactive", "IT_STAFF"], ["forced", "IT_STAFF"]] as const) {
    const user = await db.prisma.user.create({ data: { displayName: name, email: `${name}@actions.test`, role, passwordHash, isActive: name !== "inactive", mustChangePassword: name === "forced" } });
    users[name] = user.id;
    if (name === "inactive") {
      const session = await issueSession(db.prisma, user.id);
      headers[name] = { Cookie: `toktickit.sid=${session.token}`, Origin: origin(), "X-CSRF-Token": session.csrfToken };
    } else headers[name] = await httpLogin(user.email);
  }
  const make = () => db.prisma.ticket.create({ data: { ticketNumber: `T-${randomUUID().slice(0, 16)}`, requesterId: users.requester,
    categoryId: category.id, relatedSystemId: system.id, clientSubmissionKey: randomUUID(), summary: "Action fixture", description: "Investigate a connection issue.",
    ticketDate: new Date("2026-01-01T00:00:00Z"), requestedPriority: "HIGH", itPriority: "MEDIUM" } });
  const body = (ticketVersion = 1) => ({ ticketVersion, actionAt: "2026-09-01T00:00:00Z", description: "  Check network adapter  ", result: "Connection works", assigneeId: users.second, followUpRequired: false, followUpNote: "", attachmentNotes: "" });
  function call(method: "get" | "head" | "post" | "patch" | "delete", path: string, actor = "staff", payload?: object, key = randomUUID()) {
    let req = request(app)[method](`/api${path}`);
    if (actor !== "anonymous") req = req.set(headers[actor]);
    if (!["get", "head"].includes(method)) req = req.set("Idempotency-Key", key);
    return payload ? req.send(payload) : req;
  }
  return { ...db, users, headers, make, body, call };
}
