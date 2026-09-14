import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { TicketStatus } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { issueSession } from "../../src/auth/security.js";
import { databaseFixture } from "./database-fixture.js";

vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));

let fixture: Awaited<ReturnType<typeof databaseFixture>>;
let categoryId: number;
let relatedSystemId: number;
let inactiveCategoryId: number;
let staffId: number;
let requesterA: { id: number; cookie: string; csrf: string };
let requesterB: { id: number; cookie: string; csrf: string };
let sequence = 700000;

const body = {
  categoryId: 0,
  relatedSystemId: 0,
  summary: "Laptop battery drains quickly",
  description: "The battery drops from full charge to empty within one hour.",
  requestedPriority: "MEDIUM" as const,
};

function headers(actor = requesterA) {
  return {
    Cookie: actor.cookie,
    Origin: "http://localhost:5173",
    "X-CSRF-Token": actor.csrf,
  };
}

async function makeTicket(
  requesterId: number,
  currentStatus: TicketStatus,
  summary: string,
  options: { ownerId?: number | null; updatedAt?: Date } = {},
) {
  sequence += 1;
  return fixture.prisma.ticket.create({
    data: {
      requesterId,
      categoryId,
      relatedSystemId,
      ticketNumber: `TKT-2026-${sequence}`,
      ticketDate: options.updatedAt ?? new Date("2026-08-20T08:00:00.000Z"),
      updatedAt: options.updatedAt,
      clientSubmissionKey: randomUUID(),
      summary,
      description: "Requester regression detail with enough characters.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus,
      ownerId: options.ownerId,
    },
  });
}

beforeAll(async () => {
  fixture = await databaseFixture();
  vi.mocked(getPrisma).mockReturnValue(fixture.prisma);
  categoryId = (await fixture.prisma.category.create({ data: { name: "Hardware" } })).id;
  inactiveCategoryId = (await fixture.prisma.category.create({ data: { name: "Retired", isActive: false } })).id;
  relatedSystemId = (await fixture.prisma.relatedSystem.create({ data: { name: "Corporate Laptop" } })).id;
  const users = await Promise.all([
    fixture.prisma.user.create({ data: { displayName: "Requester A", email: "requester.a@example.test", role: "REQUESTER", passwordHash: "provisioned", mustChangePassword: false } }),
    fixture.prisma.user.create({ data: { displayName: "Requester B", email: "requester.b@example.test", role: "REQUESTER", passwordHash: "provisioned", mustChangePassword: false } }),
    fixture.prisma.user.create({ data: { displayName: "Assigned Staff", email: "assigned.staff@example.test", role: "IT_STAFF", passwordHash: "provisioned", mustChangePassword: false } }),
  ]);
  staffId = users[2].id;
  const [sessionA, sessionB] = await Promise.all([
    issueSession(fixture.prisma, users[0].id),
    issueSession(fixture.prisma, users[1].id),
  ]);
  requesterA = { id: users[0].id, cookie: `toktickit.sid=${sessionA.token}`, csrf: sessionA.csrfToken };
  requesterB = { id: users[1].id, cookie: `toktickit.sid=${sessionB.token}`, csrf: sessionB.csrfToken };
  body.categoryId = categoryId;
  body.relatedSystemId = relatedSystemId;
}, 60000);

afterAll(async () => { if (fixture) await fixture.dispose(); });

describe("authenticated Requester Ticket regression", () => {
  it("creates from session identity with Lab 3 defaults and replays one immutable snapshot", async () => {
    const key = randomUUID();
    const first = await request(app).post("/api/tickets").set(headers()).set("Idempotency-Key", key).send(body);
    const replay = await request(app).post("/api/tickets").set(headers()).set("Idempotency-Key", key).send(body);
    const changed = await request(app).post("/api/tickets").set(headers()).set("Idempotency-Key", key)
      .send({ ...body, summary: "A different valid summary" });

    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(replay.body.id).toBe(first.body.id);
    expect(changed.status).toBe(409);
    expect(first.body).toMatchObject({
      requester: { id: requesterA.id, displayName: "Requester A" },
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      owner: null,
      version: 1,
      attachments: [],
    });
    expect(first.body).not.toHaveProperty("requesterId");
    expect(await fixture.prisma.ticket.count({ where: { requesterId: requesterA.id, clientSubmissionKey: key } })).toBe(1);
  });

  it("serializes concurrent matching creation to one 201 and one 200", async () => {
    const key = randomUUID();
    const results = await Promise.all([
      request(app).post("/api/tickets").set(headers()).set("Idempotency-Key", key).send(body),
      request(app).post("/api/tickets").set(headers()).set("Idempotency-Key", key).send(body),
    ]);
    expect(results.map(result => result.status).sort()).toEqual([200, 201]);
    expect(results[0].body.id).toBe(results[1].body.id);
    expect(await fixture.prisma.ticket.count({ where: { requesterId: requesterA.id, clientSubmissionKey: key } })).toBe(1);
  });

  it("filters every status, returns owner/version metadata and never includes another requester", async () => {
    for (const status of Object.values(TicketStatus)) {
      await makeTicket(requesterA.id, status, `${status} owned ticket`, { ownerId: status === "IN_PROGRESS" ? staffId : null });
    }
    await makeTicket(requesterB.id, "CLOSED", "CLOSED private other requester");

    for (const status of Object.values(TicketStatus)) {
      const response = await request(app).get(`/api/tickets?currentStatus=${status}&pageSize=50`).set(headers());
      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items.every((item: { currentStatus: string }) => item.currentStatus === status)).toBe(true);
      expect(response.text).not.toContain("private other requester");
      expect(response.body.items[0]).toHaveProperty("version");
      expect(response.body.items[0]).toHaveProperty("owner");
    }
  });

  it("treats percent and underscore search characters literally", async () => {
    await makeTicket(requesterA.id, "OPEN", "Literal 100%_ marker");
    await makeTicket(requesterA.id, "OPEN", "Literal 100XX marker");
    const response = await request(app).get("/api/tickets?search=100%25_&pageSize=50").set(headers());
    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { summary: string }) => item.summary)).toEqual(["Literal 100%_ marker"]);
  });

  it("uses stable sorting/pagination and returns accurate beyond-last metadata", async () => {
    const tied = new Date("2026-09-01T10:00:00.000Z");
    const first = await makeTicket(requesterA.id, "REOPENED", "Stable first", { updatedAt: tied });
    const second = await makeTicket(requesterA.id, "REOPENED", "Stable second", { updatedAt: tied });
    const page = await request(app).get("/api/tickets?currentStatus=REOPENED&sortBy=updatedAt&sortDir=desc&pageSize=10").set(headers());
    expect(page.status).toBe(200);
    const ids = page.body.items.map((item: { id: number }) => item.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));

    const beyond = await request(app).get("/api/tickets?currentStatus=REOPENED&page=100&pageSize=10").set(headers());
    expect(beyond.status).toBe(200);
    expect(beyond.body.items).toEqual([]);
    expect(beyond.body.totalItems).toBeGreaterThanOrEqual(2);
    expect(beyond.body.hasPreviousPage).toBe(true);
    expect(beyond.body.hasNextPage).toBe(false);
  });

  it("rejects inactive references, unsafe offsets, repeated controls and forged requester identity", async () => {
    const inactive = await request(app).get(`/api/tickets?categoryId=${inactiveCategoryId}`).set(headers());
    expect(inactive.status).toBe(400);
    expect(inactive.body.fieldErrors.categoryId).toMatch(/unavailable/i);
    for (const query of ["page=100002&pageSize=10", "currentStatus=NEW&currentStatus=OPEN", `requesterId=${requesterB.id}`]) {
      expect((await request(app).get(`/api/tickets?${query}`).set(headers())).status).toBe(400);
    }
  });

  it("returns full owned Detail with real attachment and lifecycle metadata", async () => {
    const ticket = await makeTicket(requesterA.id, "RESOLVED", "Resolved owned detail", { ownerId: staffId });
    const resolvedAt = new Date("2026-09-02T11:00:00.000Z");
    await fixture.prisma.ticket.update({
      where: { id: ticket.id },
      data: { resolvedAt, resolutionSummary: "Replaced the failing battery.", version: 4 },
    });
    const attachment = await fixture.prisma.attachment.create({
      data: {
        ticketId: ticket.id,
        originalFilename: "evidence.pdf",
        storageKey: `attachments/${randomUUID()}`,
        mimeType: "application/pdf",
        sizeBytes: 128,
      },
    });
    const response = await request(app).get(`/api/tickets/${ticket.id}`).set(headers());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: ticket.id,
      owner: { id: staffId, displayName: "Assigned Staff", role: "IT_STAFF" },
      version: 4,
      resolvedAt: resolvedAt.toISOString(),
      resolutionSummary: "Replaced the failing battery.",
      attachments: [{ id: attachment.id, state: "ACTIVE", canDownload: true }],
    });
    expect(response.body).toHaveProperty("requesterResolutionIndicatedAt", null);
    expect(response.body).toHaveProperty("closedAt", null);
    expect(response.body).toHaveProperty("cancelledAt", null);
    expect(response.text).not.toContain("storageKey");
    expect(response.text).not.toContain("internalNote");

    const denied = await request(app).get(`/api/tickets/${ticket.id}`).set(headers(requesterB));
    expect(denied.status).toBe(404);
  });
});
