import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticatedRequest as request, sessionMock } from "../lab-03/legacy-auth-fixture.js";

const prismaMock = vi.hoisted(() => ({ session: { findUnique: vi.fn() },
  $transaction: vi.fn(),
  ticket: { findFirst: vi.fn() },
  attachment: { findMany: vi.fn(), findFirst: vi.fn() },
}));
const storageMock = vi.hoisted(() => ({
  writeStoredAttachment: vi.fn(),
  readStoredAttachment: vi.fn(),
  deleteStoredAttachment: vi.fn(),
}));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prismaMock }));
vi.mock("../../src/attachments/attachment-storage.js", () => storageMock);

import { app } from "../../src/app.js";

const UPLOADED = {
  id: 9,
  originalFilename: "request.pdf",
  storageKey: "attachments/example",
  mimeType: "application/pdf",
  sizeBytes: 8,
  uploadedAt: new Date("2026-08-20T10:00:00.000Z"),
  removedAt: null,
  removalReason: null,
  removedByUser: null,
};

function transaction(overrides: Record<string, unknown> = {}) {
  return {
    session: sessionMock(), $executeRaw: vi.fn().mockResolvedValue(1), $queryRaw: vi.fn().mockResolvedValue([{ id: 42 }]),
    ticket: { findFirst: vi.fn().mockResolvedValue({ id: 42 }), update: vi.fn().mockResolvedValue({ id: 42 }) },
    attachment: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue(UPLOADED),
      findUnique: vi.fn().mockResolvedValue({ ticketId: 42 }),
      findFirst: vi.fn().mockResolvedValue({ id: 9, ticketId: 42 }),
      update: vi.fn().mockResolvedValue({
        ...UPLOADED,
        removedAt: new Date("2026-08-20T10:01:00.000Z"),
        removalReason: "Contains sensitive information.",
        removedByUser: { id: 1, displayName: "Jennifer Anderson" },
      }),
    },
    ...overrides,
  };
}

describe("Attachment lifecycle APIs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.session.findUnique.mockImplementation(sessionMock().findUnique);
    storageMock.writeStoredAttachment.mockResolvedValue(undefined);
    storageMock.deleteStoredAttachment.mockResolvedValue(undefined);
  });

  it("uploads a permitted owned file and returns safe active metadata", async () => {
    const tx = transaction();
    prismaMock.$transaction.mockImplementation((callback) => callback(tx));

    const response = await request(app)
      .post("/api/tickets/42/attachments")
      .attach("file", Buffer.from("%PDF-1.7"), {
        filename: "request.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(201);
    expect(tx.attachment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ requesterId: expect.anything() }),
      }),
    );
    expect(response.body).toEqual({
      id: 9,
      originalFilename: "request.pdf",
      mimeType: "application/pdf",
      sizeBytes: 8,
      uploadedAt: "2026-08-20T10:00:00.000Z",
      state: "ACTIVE",
      canDownload: true,
    });
    expect(response.body).not.toHaveProperty("storageKey");
    expect(storageMock.writeStoredAttachment).toHaveBeenCalledOnce();
  });

  it("rejects an unsupported signature without writing storage", async () => {
    const response = await request(app)
      .post("/api/tickets/42/attachments")
      .attach("file", Buffer.from("not a PDF"), {
        filename: "request.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(415);
    expect(response.body).toEqual({
      error: "Attachment type is not allowed.",
      code: "UNSUPPORTED_TYPE",
    });
    expect(storageMock.writeStoredAttachment).not.toHaveBeenCalled();
  });

  it("rejects an unowned Ticket and compensates the stored object", async () => {
    const tx = transaction({
      ticket: { findFirst: vi.fn().mockResolvedValue(null) },
    });
    prismaMock.$transaction.mockImplementation((callback) => callback(tx));

    const response = await request(app)
      .post("/api/tickets/42/attachments")
      .attach("file", Buffer.from("%PDF-1.7"), {
        filename: "request.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(404);
    expect(storageMock.deleteStoredAttachment).toHaveBeenCalledOnce();
  });

  it("rejects a sixth active attachment", async () => {
    const tx = transaction({
      attachment: { count: vi.fn().mockResolvedValue(5) },
    });
    prismaMock.$transaction.mockImplementation((callback) => callback(tx));

    const response = await request(app)
      .post("/api/tickets/42/attachments")
      .attach("file", Buffer.from("%PDF-1.7"), {
        filename: "request.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("ATTACHMENT_LIMIT");
  });

  it("downloads an active owned attachment with a safe filename and MIME type", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue(UPLOADED);
    const content = Buffer.from("%PDF-1.7 owned evidence");
    storageMock.readStoredAttachment.mockResolvedValue(content);

    const response = await request(app).get(
      "/api/attachments/9/download",
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^application\/pdf/);
    expect(response.headers["content-disposition"]).toBe(
      "attachment; filename=\"request.pdf\"; filename*=UTF-8''request.pdf",
    );
    expect(Buffer.compare(response.body, content)).toBe(0);
    expect(storageMock.readStoredAttachment).toHaveBeenCalledWith(
      "attachments/example",
    );
  });

  it("rejects removed or cross-requester attachment downloads without reading storage", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue(null);

    const removed = await request(app).get(
      "/api/attachments/9/download",
    );
    const unowned = await request(app).get(
      "/api/attachments/9/download",
    );

    expect(removed.status).toBe(404);
    expect(unowned.status).toBe(404);
    expect(removed.body).toEqual({ error: "Attachment is unavailable.", code: "NOT_FOUND" });
    expect(unowned.body).toEqual({ error: "Attachment is unavailable.", code: "NOT_FOUND" });
    expect(storageMock.readStoredAttachment).not.toHaveBeenCalled();
  });

  it("rejects cross-requester attachment listing and soft removal", async () => {
    prismaMock.ticket.findFirst.mockResolvedValue(null);
    const tx = transaction({
      attachment: {
        findUnique: vi.fn().mockResolvedValue({ ticketId: 42 }),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    });
    prismaMock.$transaction.mockImplementation((callback) => callback(tx));

    const list = await request(app).get(
      "/api/tickets/42/attachments",
    );
    const removal = await request(app)
      .delete("/api/attachments/9")
      .send({ reason: "Not owned by this requester." });

    expect(list.status).toBe(404);
    expect(removal.status).toBe(404);
    expect(prismaMock.attachment.findMany).not.toHaveBeenCalled();
    expect(tx.attachment.update).not.toHaveBeenCalled();
  });

  it("returns a safe error when active attachment storage cannot be read", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue(UPLOADED);
    storageMock.readStoredAttachment.mockRejectedValue(
      new Error("private storage detail"),
    );

    const response = await request(app).get(
      "/api/attachments/9/download",
    );

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "Unable to download attachment",
      code: "INTERNAL_ERROR",
    });
    expect(response.text).not.toContain("private storage detail");
  });

  it("lists retained removed metadata and soft-removes an owned active attachment", async () => {
    prismaMock.ticket.findFirst.mockResolvedValue({ id: 42 });
    prismaMock.attachment.findMany.mockResolvedValue([
      {
        ...UPLOADED,
        removedAt: new Date("2026-08-20T10:01:00.000Z"),
        removalReason: "Contains sensitive information.",
        removedByUser: { id: 1, displayName: "Jennifer Anderson" },
      },
    ]);
    const tx = transaction();
    prismaMock.$transaction.mockImplementation((callback) => callback(tx));

    const list = await request(app).get(
      "/api/tickets/42/attachments",
    );
    const removed = await request(app)
      .delete("/api/attachments/9")
      .send({ reason: "Contains sensitive information." });

    expect(list.status).toBe(200);
    expect(list.body[0]).toMatchObject({
      state: "REMOVED",
      canDownload: false,
    });
    expect(list.body[0]).not.toHaveProperty("storageKey");
    expect(removed.status).toBe(200);
    expect(removed.body).toMatchObject({
      state: "REMOVED",
      canDownload: false,
      removalReason: "Contains sensitive information.",
    });
  });
});
