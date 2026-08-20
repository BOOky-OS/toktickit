import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prismaMock = vi.hoisted(() => ({ $transaction: vi.fn() }));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prismaMock }));

import { app } from "../../src/app.js";

const KEY = "550e8400-e29b-41d4-a716-446655440000";
const BODY = {
  requesterId: 1,
  categoryId: 2,
  relatedSystemId: 7,
  summary: "  Laptop battery drains quickly  ",
  requestedPriority: "MEDIUM",
  description: "  The battery drops from full charge to empty within one hour.  ",
};
const SAVED = {
  id: 42,
  ticketNumber: "TKT-2026-000042",
  ticketDate: new Date("2026-08-20T08:15:00.000Z"),
  requesterId: 1,
  categoryId: 2,
  relatedSystemId: 7,
  summary: "Laptop battery drains quickly",
  requestedPriority: "MEDIUM",
  itPriority: "UNASSIGNED",
  currentStatus: "NEW",
  description: "The battery drops from full charge to empty within one hour.",
  clientSubmissionKey: KEY,
  requester: { id: 1, displayName: "Jennifer Anderson" },
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 7, name: "Corporate Laptop" },
};

function makeTransaction(overrides: Record<string, unknown> = {}) {
  return {
    developmentRequester: {
      findUnique: vi.fn().mockResolvedValue({ id: 1, displayName: "Jennifer Anderson", isActive: true }),
    },
    category: {
      findUnique: vi.fn().mockResolvedValue({ id: 2, name: "Hardware", isActive: true }),
    },
    relatedSystem: {
      findUnique: vi.fn().mockResolvedValue({ id: 7, name: "Corporate Laptop", isActive: true }),
    },
    ticket: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(SAVED),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ value: 42n }]),
    ...overrides,
  };
}

describe("POST /api/tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates one requester-owned Ticket with official defaults and trimmed fields", async () => {
    const tx = makeTransaction();
    prismaMock.$transaction.mockImplementation((callback) => callback(tx));

    const response = await request(app)
      .post("/api/tickets")
      .set("Idempotency-Key", KEY)
      .send(BODY);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 42,
      ticketNumber: "TKT-2026-000042",
      ticketDate: "2026-08-20T08:15:00.000Z",
      requester: { id: 1, displayName: "Jennifer Anderson" },
      category: { id: 2, name: "Hardware" },
      relatedSystem: { id: 7, name: "Corporate Laptop" },
      summary: "Laptop battery drains quickly",
      requestedPriority: "MEDIUM",
      itPriority: "UNASSIGNED",
      currentStatus: "NEW",
      description: "The battery drops from full charge to empty within one hour.",
      attachments: [],
    });
    expect(tx.ticket.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        requesterId: 1,
        categoryId: 2,
        relatedSystemId: 7,
        clientSubmissionKey: KEY,
        currentStatus: "NEW",
        itPriority: "UNASSIGNED",
        summary: "Laptop battery drains quickly",
      }),
    }));
  });

  it("returns unique official Ticket Numbers for different database sequence values", async () => {
    function transactionFor(value: bigint) {
      const tx = makeTransaction();
      tx.$queryRaw.mockResolvedValue([{ value }]);
      tx.ticket.create.mockImplementation(async ({ data }) => ({
        ...SAVED,
        ...data,
        id: Number(value),
        requester: SAVED.requester,
        category: SAVED.category,
        relatedSystem: SAVED.relatedSystem,
      }));
      return tx;
    }
    const firstTx = transactionFor(100n);
    const secondTx = transactionFor(101n);
    prismaMock.$transaction
      .mockImplementationOnce((callback) => callback(firstTx))
      .mockImplementationOnce((callback) => callback(secondTx));

    const first = await request(app)
      .post("/api/tickets")
      .set("Idempotency-Key", "550e8400-e29b-41d4-a716-446655440001")
      .send(BODY);
    const second = await request(app)
      .post("/api/tickets")
      .set("Idempotency-Key", "550e8400-e29b-41d4-a716-446655440002")
      .send(BODY);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.ticketNumber).toMatch(/^TKT-\d{4}-000100$/);
    expect(second.body.ticketNumber).toMatch(/^TKT-\d{4}-000101$/);
    expect(first.body.ticketNumber).not.toBe(second.body.ticketNumber);
  });

  it("returns the original Ticket with 200 for an identical idempotent replay", async () => {
    const tx = makeTransaction({
      ticket: {
        findUnique: vi.fn().mockResolvedValue(SAVED),
        create: vi.fn(),
      },
    });
    prismaMock.$transaction.mockImplementation((callback) => callback(tx));

    const response = await request(app).post("/api/tickets").set("Idempotency-Key", KEY).send(BODY);

    expect(response.status).toBe(200);
    expect(response.body.ticketNumber).toBe("TKT-2026-000042");
    expect(tx.ticket.create).not.toHaveBeenCalled();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });

  it("returns 409 when an Idempotency-Key is reused with different content", async () => {
    const tx = makeTransaction({
      ticket: {
        findUnique: vi.fn().mockResolvedValue({ ...SAVED, summary: "A different summary" }),
        create: vi.fn(),
      },
    });
    prismaMock.$transaction.mockImplementation((callback) => callback(tx));

    const response = await request(app).post("/api/tickets").set("Idempotency-Key", KEY).send(BODY);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "Idempotency-Key was already used for a different ticket.",
      code: "IDEMPOTENCY_CONFLICT",
    });
  });

  it("returns safe field errors without touching Prisma for malformed input", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("Idempotency-Key", "invalid")
      .send({ ...BODY, requesterId: 0, summary: "   ", requestedPriority: "URGENT" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      fieldErrors: {
        idempotencyKey: "Idempotency-Key must be a UUID.",
        requesterId: "Requester is required.",
        summary: "Summary must contain 5 to 120 characters.",
        requestedPriority: "Requested Priority must be LOW, MEDIUM, or HIGH.",
      },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("returns a safe validation response for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("Content-Type", "application/json")
      .set("Idempotency-Key", KEY)
      .send('{"requesterId":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      fieldErrors: { body: "Request body must be valid JSON." },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ["developmentRequester", "requesterId", "Selected Requester is unavailable."],
    ["category", "categoryId", "Selected Category is unavailable."],
    ["relatedSystem", "relatedSystemId", "Selected Related System is unavailable."],
  ])("rejects missing or inactive %s reference data", async (model, field, message) => {
    const tx = makeTransaction({
      [model]: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    prismaMock.$transaction.mockImplementation((callback) => callback(tx));

    const response = await request(app).post("/api/tickets").set("Idempotency-Key", KEY).send(BODY);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      fieldErrors: { [field]: message },
    });
  });

  it("returns a safe 500 response for unexpected database failures", async () => {
    prismaMock.$transaction.mockRejectedValue(new Error("postgresql://secret"));

    const response = await request(app).post("/api/tickets").set("Idempotency-Key", KEY).send(BODY);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Unable to create ticket", code: "INTERNAL_ERROR" });
    expect(JSON.stringify(response.body)).not.toContain("postgresql");
  });
});
