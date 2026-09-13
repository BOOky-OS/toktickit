import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth/password.js";
import { readStoredAttachment, writeStoredAttachment, deleteStoredAttachment } from "../../src/attachments/attachment-storage.js";
import { databaseFixture } from "./database-fixture.js";
import { httpLogin, TEST_PASSWORD } from "./http-login.js";
vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
vi.mock("../../src/attachments/attachment-storage.js", () => ({
  readStoredAttachment: vi.fn(), writeStoredAttachment: vi.fn(), deleteStoredAttachment: vi.fn(),
}));
let fixture: Awaited<ReturnType<typeof databaseFixture>>;
let actor: Awaited<ReturnType<typeof httpLogin>>, ticketId: number, attachmentId: number;
const secret = "postgresql://private-user:private-password@private-host/db /private/storage/file passwordHash private-note";
beforeAll(async () => {
  fixture = await databaseFixture();
  vi.mocked(getPrisma).mockReturnValue(fixture.prisma);
  const user = await fixture.prisma.user.create({ data: { displayName: "Error audit", email: "errors@audit.test",
    passwordHash: await hashPassword(TEST_PASSWORD), mustChangePassword: false } });
  actor = await httpLogin(user.email);
  const category = await fixture.prisma.category.create({ data: { name: "Hardware" } });
  const system = await fixture.prisma.relatedSystem.create({ data: { name: "Laptop" } });
  const ticket = await fixture.prisma.ticket.create({ data: { requesterId: user.id, categoryId: category.id,
    relatedSystemId: system.id, ticketNumber: "TKT-2026-990000", clientSubmissionKey: randomUUID(),
    summary: "Error audit ticket", description: "Private content must never leak through an error.", requestedPriority: "LOW", itPriority: "LOW" } });
  ticketId = ticket.id;
  attachmentId = (await fixture.prisma.attachment.create({ data: { ticketId, originalFilename: "test.pdf",
    storageKey: "attachments/private-storage", mimeType: "application/pdf", sizeBytes: 8 } })).id;
  vi.mocked(deleteStoredAttachment).mockResolvedValue(undefined);
}, 60000);
afterEach(() => { vi.restoreAllMocks(); vi.mocked(getPrisma).mockReturnValue(fixture.prisma); });
afterAll(async () => { if (fixture) await fixture.dispose(); });
function safe(res: request.Response, status: number, code: string) {
  expect(res.status, res.text).toBe(status);
  expect(res.headers["content-type"]).toContain("application/json");
  expect(res.headers["cache-control"]).toBe("no-store");
  expect(res.body.code).toBe(code);
  expect(typeof res.body.error).toBe("string");
  expect(Object.keys(res.body).every(key => ["error", "code", "fieldErrors"].includes(key))).toBe(true);
  expect(res.text).not.toMatch(/private-|passwordHash|postgresql:|stack|Private content/);
}
it("returns a safe validation envelope for malformed JSON", async () => {
  safe(await request(app).post("/api/tickets").set(actor).type("json").send('{"private-note":'), 400, "VALIDATION_ERROR");
});
it("rejects unsupported domain content types", async () => {
  safe(await request(app).post("/api/tickets").set(actor).type("text").send(secret), 415, "UNSUPPORTED_TYPE");
});
it("rejects oversized JSON without echoing input", async () => {
  safe(await request(app).post("/api/tickets").set(actor).send({ description: secret.repeat(400) }), 413, "BODY_TOO_LARGE");
});
it.each(["unknown=private-note", "page=1&page=2", "search[x]=private-note", "page=invalid"])("returns safe query errors: %s", async query => {
  safe(await request(app).get(`/api/tickets?${query}`).set(actor), 400, "VALIDATION_ERROR");
});
it.each(["/api/unknown-private-route", "/api/development-requesters"])("returns JSON 404 for %s", async path => {
  safe(await request(app).get(path).set(actor), 404, "NOT_FOUND");
});
it("rejects an unexpected multipart field", async () => {
  safe(await request(app).post(`/api/tickets/${ticketId}/attachments`).set(actor)
    .attach("unexpected", Buffer.from("%PDF-1.7"), "private-file.pdf"), 400, "VALIDATION_ERROR");
});
it("rejects unsupported upload bytes without disclosing the filename", async () => {
  safe(await request(app).post(`/api/tickets/${ticketId}/attachments`).set(actor)
    .attach("file", Buffer.from(secret), "private-file.exe"), 415, "UNSUPPORTED_TYPE");
});
it("hides session database connection failures", async () => {
  vi.spyOn(fixture.prisma.session, "findUnique").mockRejectedValueOnce(new Error(secret));
  safe(await request(app).get("/api/tickets").set(actor), 500, "INTERNAL_ERROR");
});
it("hides reference query database failures after authentication", async () => {
  vi.spyOn(fixture.prisma.category, "findMany").mockRejectedValueOnce(new Error(secret));
  safe(await request(app).get("/api/categories").set(actor), 500, "INTERNAL_ERROR");
});
it("hides Ticket lookup database failures after authentication", async () => {
  vi.spyOn(fixture.prisma.ticket, "findFirst").mockRejectedValueOnce(new Error(secret));
  safe(await request(app).get(`/api/tickets/${ticketId}`).set(actor), 500, "INTERNAL_ERROR");
});
it("hides storage-read paths and secrets", async () => {
  vi.mocked(readStoredAttachment).mockRejectedValueOnce(new Error(secret));
  safe(await request(app).get(`/api/attachments/${attachmentId}/download`).set(actor), 500, "INTERNAL_ERROR");
});
it("hides storage-write failures and preserves Ticket and Attachment metadata", async () => {
  const before = await fixture.prisma.attachment.count();
  vi.mocked(writeStoredAttachment).mockRejectedValueOnce(new Error(secret));
  safe(await request(app).post(`/api/tickets/${ticketId}/attachments`).set(actor)
    .attach("file", Buffer.from("%PDF-1.7"), "test.pdf"), 500, "INTERNAL_ERROR");
  expect(await fixture.prisma.ticket.count({ where: { id: ticketId } })).toBe(1);
  expect(await fixture.prisma.attachment.count()).toBe(before);
  expect(deleteStoredAttachment).toHaveBeenCalled();
});
