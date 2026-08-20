import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prismaMock = vi.hoisted(() => ({ developmentRequester: { findUnique: vi.fn() }, ticket: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn() } }));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prismaMock }));
import { app } from "../../src/app.js";

const ticket = {
  id: 42, ticketNumber: "TKT-2026-000042", ticketDate: new Date("2026-08-20T08:15:00.000Z"), updatedAt: new Date("2026-08-20T09:15:00.000Z"),
  summary: "Laptop battery drains quickly", description: "The battery drops from full charge to empty within one hour.", requestedPriority: "MEDIUM", itPriority: "UNASSIGNED", currentStatus: "NEW",
  requester: { id: 1, displayName: "Jennifer Anderson" }, category: { id: 2, name: "Hardware" }, relatedSystem: { id: 7, name: "Corporate Laptop" },
};

describe("GET /api/tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.developmentRequester.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.ticket.findMany.mockResolvedValue([ticket]);
    prismaMock.ticket.count.mockResolvedValue(1);
  });

  it("returns only requester-owned, filtered Tickets with documented pagination metadata", async () => {
    const response = await request(app).get("/api/tickets?requesterId=1&search=battery&categoryId=2&relatedSystemId=7&requestedPriority=MEDIUM&page=1&pageSize=10");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false });
    expect(response.body.items[0]).toMatchObject({ ticketNumber: "TKT-2026-000042", category: { name: "Hardware" } });
    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ requesterId: 1, categoryId: 2, relatedSystemId: 7, requestedPriority: "MEDIUM" }), skip: 0, take: 10 }));
  });

  it("rejects invalid list controls before querying Prisma", async () => {
    const response = await request(app).get("/api/tickets?requesterId=0&pageSize=20&sortBy=unsafe");
    expect(response.status).toBe(400);
    expect(response.body.fieldErrors).toMatchObject({ requesterId: expect.any(String), pageSize: expect.any(String), sortBy: expect.any(String) });
    expect(prismaMock.ticket.findMany).not.toHaveBeenCalled();
  });

  it("does not leak another requester's direct Ticket", async () => {
    prismaMock.ticket.findFirst.mockResolvedValue(null);
    const response = await request(app).get("/api/tickets/42?requesterId=2");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Ticket is unavailable." });
    expect(prismaMock.ticket.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 42, requesterId: 2 }) }));
  });
});
