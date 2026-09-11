import { afterAll, beforeAll, describe, it, expect, vi } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import { CATEGORIES } from "../../prisma/seed.js";
import { databaseFixture } from "../lab-03/database-fixture.js";

vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
let fixture: Awaited<ReturnType<typeof databaseFixture>>;

beforeAll(async () => {
  fixture = await databaseFixture();
  await fixture.prisma.category.createMany({ data: CATEGORIES.map((category) => ({ ...category })) });
  vi.mocked(getPrisma).mockReturnValue(fixture.prisma);
}, 60_000);
afterAll(async () => { if (fixture) await fixture.dispose(); });

describe("GET /api/categories", () => {
  it("returns the four seeded categories in id order from the isolated database", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(CATEGORIES.map((category, index) => ({ id: index + 1, name: category.name })));
  });
});
