import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticatedRequest as request, sessionMock } from "../lab-03/legacy-auth-fixture.js";
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
  vi.mocked(getPrisma).mockReturnValue({ ...prisma, session: sessionMock() } as unknown as ReturnType<typeof getPrisma>);
}

describe("Lab 2 reference-data seed", () => {
  it("uses stable unique keys for the required active and inactive records", async () => {
    const categoryUpsert = vi.fn().mockResolvedValue({});
    const relatedSystemUpsert = vi.fn().mockResolvedValue({});

    await seedReferenceData({
      category: { upsert: categoryUpsert },
      relatedSystem: { upsert: relatedSystemUpsert },
    } as never);

    expect(CATEGORIES).toHaveLength(4);
    expect(RELATED_SYSTEMS.length).toBeGreaterThanOrEqual(6);
    expect(DEVELOPMENT_REQUESTERS.filter((requester) => requester.isActive)).toHaveLength(4);
    expect(DEVELOPMENT_REQUESTERS.filter((requester) => !requester.isActive)).toHaveLength(1);
    expect(categoryUpsert).toHaveBeenCalledTimes(CATEGORIES.length);
    expect(relatedSystemUpsert).toHaveBeenCalledTimes(RELATED_SYSTEMS.length);
  });
});

describe("Lab 2 reference-data APIs", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("retires the development selector without exposing identities", async () => {
    const findMany = vi.fn();
    usePrismaMock({ user: { findMany } });
    const response = await request(app).get("/api/development-requesters");
    expect(response.status).toBe(404);
    expect(response.body.code).toBe("NOT_FOUND");
    expect(findMany).not.toHaveBeenCalled();
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
    ["/api/categories", "category", "Unable to load request categories"],
    ["/api/related-systems", "relatedSystem", "Unable to load related systems"],
  ])("%s returns a safe error when Prisma fails", async (path, model, message) => {
    usePrismaMock({ [model]: { findMany: vi.fn().mockRejectedValue(new Error("database secret")) } });

    const response = await request(app).get(path);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: message, code: "INTERNAL_ERROR" });
    expect(JSON.stringify(response.body)).not.toContain("database secret");
  });
});
