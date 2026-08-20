import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import {
  CATEGORIES,
  DEVELOPMENT_REQUESTERS,
  RELATED_SYSTEMS,
  seedReferenceData,
} from "../../prisma/seed.js";

vi.mock("../../src/prisma.js", () => ({
  getPrisma: vi.fn(),
}));

type PrismaMock = Record<string, { findMany?: ReturnType<typeof vi.fn>; upsert?: ReturnType<typeof vi.fn> }>;

function usePrismaMock(prisma: PrismaMock) {
  vi.mocked(getPrisma).mockReturnValue(prisma as unknown as ReturnType<typeof getPrisma>);
}

describe("Lab 2 reference-data seed", () => {
  it("uses stable unique keys for the required active and inactive records", async () => {
    const categoryUpsert = vi.fn().mockResolvedValue({});
    const relatedSystemUpsert = vi.fn().mockResolvedValue({});
    const requesterUpsert = vi.fn().mockResolvedValue({});

    await seedReferenceData({
      category: { upsert: categoryUpsert },
      relatedSystem: { upsert: relatedSystemUpsert },
      developmentRequester: { upsert: requesterUpsert },
    } as never);

    expect(CATEGORIES).toHaveLength(4);
    expect(RELATED_SYSTEMS.length).toBeGreaterThanOrEqual(6);
    expect(DEVELOPMENT_REQUESTERS.filter((requester) => requester.isActive)).toHaveLength(4);
    expect(DEVELOPMENT_REQUESTERS.filter((requester) => !requester.isActive)).toHaveLength(1);
    expect(categoryUpsert).toHaveBeenCalledTimes(CATEGORIES.length);
    expect(relatedSystemUpsert).toHaveBeenCalledTimes(RELATED_SYSTEMS.length);
    expect(requesterUpsert).toHaveBeenCalledTimes(DEVELOPMENT_REQUESTERS.length);
    expect(requesterUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: DEVELOPMENT_REQUESTERS[0].email },
    }));
  });
});

describe("Lab 2 reference-data APIs", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("GET /api/development-requesters returns active requesters in display-name order", async () => {
    const requesters = [
      { id: 1, displayName: "Jennifer Anderson", email: "jennifer.anderson@example.test" },
      { id: 2, displayName: "Michael Brown", email: "michael.brown@example.test" },
    ];
    const findMany = vi.fn().mockResolvedValue(requesters);
    usePrismaMock({ developmentRequester: { findMany } });

    const response = await request(app).get("/api/development-requesters");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(requesters);
    expect(findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true, displayName: true, email: true },
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
    });
  });

  it("GET /api/categories returns active categories in ID order", async () => {
    const categories = [{ id: 1, name: "Account and Access" }];
    const findMany = vi.fn().mockResolvedValue(categories);
    usePrismaMock({ category: { findMany } });

    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(categories);
    expect(findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });
  });

  it("GET /api/related-systems returns active systems in name order", async () => {
    const systems = [{ id: 1, name: "Campus Wi-Fi" }];
    const findMany = vi.fn().mockResolvedValue(systems);
    usePrismaMock({ relatedSystem: { findMany } });

    const response = await request(app).get("/api/related-systems");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(systems);
    expect(findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
  });

  it.each([
    ["/api/development-requesters", "developmentRequester", "Unable to load development requesters"],
    ["/api/categories", "category", "Unable to load request categories"],
    ["/api/related-systems", "relatedSystem", "Unable to load related systems"],
  ])("%s returns a safe error when Prisma fails", async (path, model, message) => {
    usePrismaMock({ [model]: { findMany: vi.fn().mockRejectedValue(new Error("database secret")) } });

    const response = await request(app).get(path);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: message });
    expect(JSON.stringify(response.body)).not.toContain("database secret");
  });
});
