import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { issueSession, revokeUserSessions, securityLock } from "../../src/auth/security.js";
import { databaseFixture } from "./database-fixture.js";
import { deleteStoredAttachment, readStoredAttachment, writeStoredAttachment } from "../../src/attachments/attachment-storage.js";
vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
vi.mock("../../src/attachments/attachment-storage.js", () => ({
  writeStoredAttachment: vi.fn(), deleteStoredAttachment: vi.fn(), readStoredAttachment: vi.fn(),
}));
let fixture: Awaited<ReturnType<typeof databaseFixture>>;
let categoryId: number, relatedSystemId: number, ticketId: number, fileId: number;
type Actor = { id: number; cookie: string; csrf: string };
let actors: Record<string, Actor>;
beforeAll(async () => {
  fixture = await databaseFixture();
  vi.mocked(getPrisma).mockReturnValue(fixture.prisma);
  categoryId = (await fixture.prisma.category.create({ data: { name: "Hardware" } })).id;
  relatedSystemId = (await fixture.prisma.relatedSystem.create({ data: { name: "Laptop" } })).id;
  actors = {};
  for (const [name, role] of [["a", "REQUESTER"], ["b", "REQUESTER"], ["staff", "IT_STAFF"], ["admin", "ADMIN"]] as const) {
    const user = await fixture.prisma.user.create({ data: { displayName: name, email: `${name}@example.test`, role, passwordHash: "test-provisioned", mustChangePassword: false } });
    const issued = await issueSession(fixture.prisma, user.id);
    actors[name] = { id: user.id, cookie: `toktickit.sid=${issued.token}`, csrf: issued.csrfToken };
  }
  ticketId = (await fixture.prisma.ticket.create({ data: {
    requesterId: actors.b.id, categoryId, relatedSystemId, ticketNumber: "TKT-2026-900000", clientSubmissionKey: randomUUID(),
    summary: "Private requester B", description: "This belongs only to requester B.", requestedPriority: "HIGH", itPriority: "HIGH",
  } })).id;
  fileId = (await fixture.prisma.attachment.create({ data: { ticketId, originalFilename: "private.pdf", storageKey: "attachments/test-private", mimeType: "application/pdf", sizeBytes: 8 } })).id;
}, 60000);
beforeEach(() => {
  vi.mocked(writeStoredAttachment).mockReset().mockResolvedValue(undefined);
  vi.mocked(deleteStoredAttachment).mockReset().mockResolvedValue(undefined);
  vi.mocked(readStoredAttachment).mockReset().mockResolvedValue(Buffer.from("%PDF-1.7"));
});
afterAll(async () => { if (fixture) await fixture.dispose(); });
function headers(name: string) { const a = actors[name]; return { Cookie: a.cookie, Origin: "http://localhost:5173", "X-CSRF-Token": a.csrf }; }
describe("Backend role and ownership boundaries", () => {
  it("denies all unauthenticated domain routes before data lookup", async () => {
    for (const path of ["/categories", "/tickets", `/tickets/${ticketId}`, `/tickets/${ticketId}/attachments`, `/attachments/${fileId}/download`, "/staff/tickets", "/admin/users"]) {
      const res = await request(app).get(`/api${path}`); expect(res.status).toBe(401);
      expect(res.text).not.toContain("Private requester B");
    }
  });
  it("scopes list/detail/files to the session, returning identical missing/nonowned results", async () => {
    const list = await request(app).get("/api/tickets").set(headers("a"));
    expect(list.status).toBe(200); expect(list.body.totalItems).toBe(0);
    for (const [actual, missing] of [[`/tickets/${ticketId}`, "/tickets/999999"], [`/tickets/${ticketId}/attachments`, "/tickets/999999/attachments"], [`/attachments/${fileId}/download`, "/attachments/999999/download"]]) {
      const denied = await request(app).get(`/api${actual}`).set(headers("a"));
      const absent = await request(app).get(`/api${missing}`).set(headers("a"));
      expect(denied.status).toBe(404); expect(denied.body).toEqual(absent.body);
    }
    expect(readStoredAttachment).not.toHaveBeenCalled();
    const removed = await request(app).delete(`/api/attachments/${fileId}`).set(headers("a")).send({ reason: "Unauthorized removal attempt" });
    expect(removed.status).toBe(404);
    expect((await fixture.prisma.attachment.findUniqueOrThrow({ where: { id: fileId } })).removedAt).toBeNull();
  });
  it.each(["b", "staff", "admin"])("allows %s to read shared detail and files without private credentials", async role => {
    const detail = await request(app).get(`/api/tickets/${ticketId}`).set(headers(role));
    expect(detail.status).toBe(200); expect(detail.body.requester.id).toBe(actors.b.id);
    expect(detail.body).not.toHaveProperty("passwordHash"); expect(detail.body).not.toHaveProperty("internalNotes");
    expect((await request(app).get(`/api/tickets/${ticketId}/attachments`).set(headers(role))).status).toBe(200);
    const file = await request(app).get(`/api/attachments/${fileId}/download`).set(headers(role));
    expect(file.status).toBe(200); expect(file.headers["cache-control"]).toBe("no-store"); expect(file.headers["x-content-type-options"]).toBe("nosniff");
  });
  it("rejects forged requesterId in query, JSON and multipart before persistence/storage", async () => {
    for (const path of ["/tickets", `/tickets/${ticketId}`, `/attachments/${fileId}/download`]) {
      expect((await request(app).get(`/api${path}?requesterId=${actors.b.id}`).set(headers("a"))).status).toBe(400);
    }
    expect((await request(app).post("/api/tickets").set(headers("a")).send({ requesterId: actors.b.id })).status).toBe(400);
    expect((await request(app).delete(`/api/attachments/${fileId}`).set(headers("a")).send({ requesterId: actors.b.id, reason: "Spoof attempt" })).status).toBe(400);
    expect((await request(app).post(`/api/tickets/${ticketId}/attachments`).set(headers("a"))
      .field("requesterId", String(actors.b.id)).attach("file", Buffer.from("%PDF-1.7"), "x.pdf")).status).toBe(400);
    expect(writeStoredAttachment).not.toHaveBeenCalled();
  });
  it("denies wrong roles before lookup, including Admin ticket mutations and Requester notes", async () => {
    for (const role of ["staff", "admin"]) {
      expect((await request(app).get("/api/tickets").set(headers(role))).status).toBe(403);
      expect((await request(app).post("/api/tickets").set(headers(role)).send({})).status).toBe(403);
      expect((await request(app).post("/api/tickets/999999/attachments").set(headers(role)).attach("file", Buffer.from("%PDF-1.7"), "x.pdf")).status).toBe(403);
      expect((await request(app).delete("/api/attachments/999999").set(headers(role)).send({ reason: "Not permitted" })).status).toBe(403);
    }
    for (const path of ["/staff/tickets", "/staff/assignees", "/tickets/999999/notes", "/admin/users"]) {
      const res = await request(app).get(`/api${path}`).set(headers("a")); expect(res.status).toBe(403); expect(res.body.code).toBe("FORBIDDEN");
    }
    for (const path of ["/staff/tickets/999999/claim", "/tickets/999999/comments", "/tickets/999999/notes"]) {
      expect((await request(app).post(`/api${path}`).set(headers("admin")).send({})).status).toBe(403);
    }
    expect(writeStoredAttachment).not.toHaveBeenCalled();
  });
  it("creates using session identity and serializes concurrent idempotent requests", async () => {
    const body = { categoryId, relatedSystemId, summary: "A new requester ticket", description: "Detailed description of the issue to investigate.", requestedPriority: "MEDIUM" };
    const key = randomUUID();
    const results = await Promise.all([1, 2].map(() => request(app).post("/api/tickets").set(headers("a")).set("Idempotency-Key", key).send(body)));
    expect(results.map(r => r.status).sort()).toEqual([200, 201]);
    expect(results[0].body.id).toBe(results[1].body.id);
    expect(results[0].body.requester.id).toBe(actors.a.id);
    expect(await fixture.prisma.ticket.count({ where: { clientSubmissionKey: key } })).toBe(1);
  });
  it("rejects unknown/repeated queries and unsupported write fields", async () => {
    for (const query of ["unknown=x", "page=1&page=2", "search[x]=private"]) {
      expect((await request(app).get(`/api/tickets?${query}`).set(headers("a"))).status).toBe(400);
    }
    for (const field of ["authorId", "role", "createdAt", "passwordHash"]) {
      expect((await request(app).post("/api/tickets").set(headers("a")).send({ [field]: "forged" })).status).toBe(400);
    }
  });
  it("compensates uploaded storage when revocation wins before the domain transaction", async () => {
    vi.mocked(writeStoredAttachment).mockImplementationOnce(async () => {
      await fixture.prisma.$transaction(async tx => { await securityLock(tx); await revokeUserSessions(tx, actors.b.id); });
    });
    const before = await fixture.prisma.attachment.count();
    const res = await request(app).post(`/api/tickets/${ticketId}/attachments`).set(headers("b"))
      .attach("file", Buffer.from("%PDF-1.7"), "x.pdf");
    expect(res.status).toBe(401); expect(deleteStoredAttachment).toHaveBeenCalledOnce();
    expect(await fixture.prisma.attachment.count()).toBe(before);
  });
});
