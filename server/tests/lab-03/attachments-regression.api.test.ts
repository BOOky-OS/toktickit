import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { TicketStatus } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { issueSession } from "../../src/auth/security.js";
import { databaseFixture } from "./database-fixture.js";
import { deleteStoredAttachment, readStoredAttachment, writeStoredAttachment } from "../../src/attachments/attachment-storage.js";

vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
vi.mock("../../src/attachments/attachment-storage.js", () => ({
  writeStoredAttachment: vi.fn(),
  readStoredAttachment: vi.fn(),
  deleteStoredAttachment: vi.fn(),
}));

let fixture: Awaited<ReturnType<typeof databaseFixture>>;
let categoryId: number;
let relatedSystemId: number;
let sequence = 800000;
type Actor = { id: number; cookie: string; csrf: string };
let actors: Record<string, Actor>;

function headers(name = "requester") {
  return {
    Cookie: actors[name].cookie,
    Origin: "http://localhost:5173",
    "X-CSRF-Token": actors[name].csrf,
  };
}

async function makeTicket(status: TicketStatus = "NEW") {
  sequence += 1;
  return fixture.prisma.ticket.create({
    data: {
      requesterId: actors.requester.id,
      categoryId,
      relatedSystemId,
      ticketNumber: `TKT-2026-${sequence}`,
      clientSubmissionKey: randomUUID(),
      summary: `${status} attachment regression`,
      description: "Attachment regression details with enough characters.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: status,
    },
  });
}

function pdf(size = 32) {
  const value = Buffer.alloc(size, 0x20);
  value.write("%PDF-", 0, "ascii");
  return value;
}

beforeAll(async () => {
  fixture = await databaseFixture();
  vi.mocked(getPrisma).mockReturnValue(fixture.prisma);
  categoryId = (await fixture.prisma.category.create({ data: { name: "Hardware" } })).id;
  relatedSystemId = (await fixture.prisma.relatedSystem.create({ data: { name: "Corporate Laptop" } })).id;
  actors = {};
  for (const [name, role] of [["requester", "REQUESTER"], ["staff", "IT_STAFF"], ["admin", "ADMIN"]] as const) {
    const user = await fixture.prisma.user.create({
      data: { displayName: name, email: `${name}.attachments@example.test`, role, passwordHash: "provisioned", mustChangePassword: false },
    });
    const issued = await issueSession(fixture.prisma, user.id);
    actors[name] = { id: user.id, cookie: `toktickit.sid=${issued.token}`, csrf: issued.csrfToken };
  }
}, 60000);

beforeEach(() => {
  vi.mocked(writeStoredAttachment).mockReset().mockResolvedValue(undefined);
  vi.mocked(readStoredAttachment).mockReset().mockResolvedValue(pdf());
  vi.mocked(deleteStoredAttachment).mockReset().mockResolvedValue(undefined);
});

afterAll(async () => { if (fixture) await fixture.dispose(); });

describe("authenticated Requester Attachment regression", () => {
  it("accepts exactly 5 MiB and rejects 5 MiB plus one before storage", async () => {
    const ticket = await makeTicket();
    const exact = await request(app).post(`/api/tickets/${ticket.id}/attachments`).set(headers())
      .attach("file", pdf(5 * 1024 * 1024), { filename: "exact.pdf", contentType: "application/pdf" });
    expect(exact.status).toBe(201);
    expect(exact.body).toMatchObject({ sizeBytes: 5 * 1024 * 1024, state: "ACTIVE", canDownload: true });

    vi.mocked(writeStoredAttachment).mockClear();
    const oversized = await request(app).post(`/api/tickets/${ticket.id}/attachments`).set(headers())
      .attach("file", pdf(5 * 1024 * 1024 + 1), { filename: "too-large.pdf", contentType: "application/pdf" });
    expect(oversized.status).toBe(413);
    expect(oversized.body.code).toBe("FILE_TOO_LARGE");
    expect(writeStoredAttachment).not.toHaveBeenCalled();
  });

  it("allows the owner to upload at every Ticket status", async () => {
    for (const status of Object.values(TicketStatus)) {
      const ticket = await makeTicket(status);
      const response = await request(app).post(`/api/tickets/${ticket.id}/attachments`).set(headers())
        .attach("file", pdf(), { filename: `${status.toLowerCase()}.pdf`, contentType: "application/pdf" });
      expect(response.status).toBe(201);
    }
  });

  it("serializes simultaneous fifth and sixth uploads and advances Ticket version once", async () => {
    const ticket = await makeTicket("OPEN");
    await fixture.prisma.attachment.createMany({
      data: Array.from({ length: 4 }, (_, index) => ({
        ticketId: ticket.id,
        originalFilename: `existing-${index}.pdf`,
        storageKey: `attachments/${randomUUID()}`,
        mimeType: "application/pdf",
        sizeBytes: 10,
      })),
    });
    const responses = await Promise.all(["fifth", "sixth"].map(name =>
      request(app).post(`/api/tickets/${ticket.id}/attachments`).set(headers())
        .attach("file", pdf(), { filename: `${name}.pdf`, contentType: "application/pdf" })));
    expect(responses.map(response => response.status).sort()).toEqual([201, 409]);
    expect(await fixture.prisma.attachment.count({ where: { ticketId: ticket.id, removedAt: null } })).toBe(5);
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(2);
    expect(deleteStoredAttachment).toHaveBeenCalledOnce();
  });

  it("soft-removes with trimmed reason, retained bytes/audit and a Ticket version increment", async () => {
    const ticket = await makeTicket("CLOSED");
    const upload = await request(app).post(`/api/tickets/${ticket.id}/attachments`).set(headers())
      .attach("file", pdf(), { filename: "audit.pdf", contentType: "application/pdf" });
    const removed = await request(app).delete(`/api/attachments/${upload.body.id}`).set(headers())
      .send({ reason: "  Contains private customer details  " });
    expect(removed.status).toBe(200);
    expect(removed.body).toMatchObject({
      state: "REMOVED",
      canDownload: false,
      removalReason: "Contains private customer details",
      removedBy: { id: actors.requester.id, displayName: "requester" },
    });
    expect(deleteStoredAttachment).not.toHaveBeenCalled();
    expect((await fixture.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(3);
    const persisted = await fixture.prisma.attachment.findUniqueOrThrow({ where: { id: upload.body.id } });
    expect(persisted.storageKey).toBeTruthy();
    expect(persisted.removedByUserId).toBe(actors.requester.id);

    const download = await request(app).get(`/api/attachments/${upload.body.id}/download`).set(headers());
    expect(download.status).toBe(404);
    expect(readStoredAttachment).not.toHaveBeenCalled();
  });

  it("returns retained removal metadata to permitted readers without internal storage fields", async () => {
    const ticket = await makeTicket();
    const attachment = await fixture.prisma.attachment.create({
      data: {
        ticketId: ticket.id,
        originalFilename: "removed.pdf",
        storageKey: `attachments/${randomUUID()}`,
        mimeType: "application/pdf",
        sizeBytes: 42,
        removedAt: new Date("2026-09-05T10:00:00.000Z"),
        removalReason: "Superseded evidence",
        removedByUserId: actors.requester.id,
      },
    });
    for (const role of ["requester", "staff", "admin"]) {
      const response = await request(app).get(`/api/tickets/${ticket.id}/attachments`).set(headers(role));
      expect(response.status).toBe(200);
      expect(response.body).toContainEqual(expect.objectContaining({
        id: attachment.id,
        state: "REMOVED",
        canDownload: false,
        removedBy: { id: actors.requester.id, displayName: "requester" },
      }));
      expect(response.text).not.toContain("storageKey");
      expect(response.text).not.toContain("removedByUserId");
    }
  });

  it("uses safe download headers for an active file", async () => {
    const ticket = await makeTicket();
    const attachment = await fixture.prisma.attachment.create({
      data: {
        ticketId: ticket.id,
        originalFilename: "résumé report.pdf",
        storageKey: `attachments/${randomUUID()}`,
        mimeType: "application/pdf",
        sizeBytes: 32,
      },
    });
    const response = await request(app).get(`/api/attachments/${attachment.id}/download`).set(headers("staff"));
    expect(response.status).toBe(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-disposition"]).toMatch(/^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''/);
  });

  it("rejects missing/invalid reasons and compensates a failed storage write safely", async () => {
    const ticket = await makeTicket();
    const attachment = await fixture.prisma.attachment.create({
      data: { ticketId: ticket.id, originalFilename: "active.pdf", storageKey: `attachments/${randomUUID()}`, mimeType: "application/pdf", sizeBytes: 10 },
    });
    for (const reason of [undefined, "four", "x".repeat(251)]) {
      const response = await request(app).delete(`/api/attachments/${attachment.id}`).set(headers())
        .send(reason === undefined ? {} : { reason });
      expect(response.status).toBe(400);
    }
    vi.mocked(writeStoredAttachment).mockRejectedValueOnce(new Error("private storage path"));
    const failed = await request(app).post(`/api/tickets/${ticket.id}/attachments`).set(headers())
      .attach("file", pdf(), { filename: "failed.pdf", contentType: "application/pdf" });
    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({ error: "Unable to upload attachment", code: "INTERNAL_ERROR" });
    expect(failed.text).not.toContain("private storage path");
    expect(deleteStoredAttachment).toHaveBeenCalledOnce();
  });
});
