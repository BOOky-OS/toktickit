import { afterAll, beforeAll, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { issueSession } from "../../src/auth/security.js";
import { databaseFixture } from "./database-fixture.js";
vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
let fixture: Awaited<ReturnType<typeof databaseFixture>>;
const cookies: Record<string, string> = {};
const ids: Record<string, number> = {};
let categoryId: number;
let systemId: number;
let inactiveCategory: number;
beforeAll(async () => {
  fixture = await databaseFixture();
  vi.mocked(getPrisma).mockReturnValue(fixture.prisma);
  categoryId = (await fixture.prisma.category.create({ data: { name: "Hardware" } })).id;
  inactiveCategory = (await fixture.prisma.category.create({ data: { name: "Retired", isActive: false } })).id;
  systemId = (await fixture.prisma.relatedSystem.create({ data: { name: "Laptop" } })).id;
  for (const [name, role] of [["Requester", "REQUESTER"], ["Staff", "IT_STAFF"], ["Admin", "ADMIN"], ["Retired", "IT_STAFF"]] as const) {
    const user = await fixture.prisma.user.create({ data: { displayName: name, email: `${name}@queue.test`, role,
      isActive: name !== "Retired", passwordHash: "provisioned", mustChangePassword: false } });
    ids[name] = user.id;
    cookies[name] = `toktickit.sid=${(await issueSession(fixture.prisma, user.id)).token}`;
  }
  for (let i = 0; i < 13; i++) {
    await fixture.prisma.ticket.create({ data: {
      ticketNumber: `TKT-2026-${900100 + i}`, requesterId: ids.Requester, categoryId, relatedSystemId: systemId,
      clientSubmissionKey: randomUUID(), summary: i === 0 ? "Literal 100%_ battery" : `Battery issue ${i}`,
      description: "A realistic support request description.", requestedPriority: "MEDIUM",
      itPriority: (["LOW", "HIGH", "MEDIUM"] as const)[i % 3], currentStatus: i % 2 ? "OPEN" : "NEW",
      ownerId: i === 0 ? ids.Retired : i % 2 ? ids.Staff : null,
      updatedAt: new Date("2026-09-01T00:00:00Z"),
    } });
  }
}, 60000);
afterAll(async () => { if (fixture) await fixture.dispose(); });
const get = (query = "", role = "Staff") => request(app).get(`/api/staff/tickets${query}`).set("Cookie", cookies[role]);
it("denies anonymous and requester access to queue and assignees", async () => {
  for (const path of ["/api/staff/tickets", "/api/staff/assignees"]) {
    expect((await request(app).get(path)).status).toBe(401);
    expect((await request(app).get(path).set("Cookie", cookies.Requester)).status).toBe(403);
  }
});
it("returns all owners, safe metadata and stable default pagination for Staff and Admin", async () => {
  for (const role of ["Staff", "Admin"]) {
    const response = await get("", role);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ totalItems: 13, totalPages: 2, pageSize: 10, hasNextPage: true });
    const ids = response.body.items.map((t: {id: number}) => t.id);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
    expect(response.body.items[0]).toHaveProperty("requester.displayName", "Requester");
    expect(response.body.items[0]).toHaveProperty("version", 1);
    expect(response.text).not.toMatch(/passwordHash|seedKey|email|internalNote/);
    const second = await get("?page=2", role);
    expect(second.body.items).toHaveLength(3);
    expect(second.body.items.some((t: {owner: {displayName: string} | null}) => t.owner?.displayName === "Retired")).toBe(true);
  }
});
it("searches requester case-insensitively and treats wildcards literally", async () => {
  expect((await get("?search=rEqUeStEr")).body.totalItems).toBe(13);
  expect((await get("?search=100%25_")).body.totalItems).toBe(1);
  expect((await get("?search=missing")).body).toMatchObject({ items: [], totalItems: 0, totalPages: 0 });
});
it("combines filters including me, unassigned and explicit eligible owner", async () => {
  const query = `?owner=me&currentStatus=OPEN&categoryId=${categoryId}&relatedSystemId=${systemId}&requestedPriority=MEDIUM&itPriority=HIGH`;
  const response = await get(query);
  expect(response.status).toBe(200);
  expect(response.body.totalItems).toBeGreaterThan(0);
  expect(response.body.items.every((t: any) => t.owner.id === ids.Staff && t.itPriority === "HIGH" && t.currentStatus === "OPEN")).toBe(true);
  expect((await get("?owner=unassigned")).body.items.every((t: any) => t.owner === null)).toBe(true);
  expect((await get(`?owner=${ids.Staff}`)).body.totalItems).toBe(6);
});
it("ranks priorities HIGH/MEDIUM/LOW descending and breaks ties by id", async () => {
  for (const dir of ["asc", "desc"]) {
    const response = await get(`?sortBy=itPriority&sortDir=${dir}&pageSize=25`);
    expect(response.status).toBe(200);
    const rank: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    const sorted = [...response.body.items].sort((a, b) => (rank[a.itPriority] - rank[b.itPriority] || a.id - b.id) * (dir === "asc" ? 1 : -1));
    expect(response.body.items).toEqual(sorted);
  }
  expect((await get("?page=100")).body).toMatchObject({ items: [], totalItems: 13, hasPreviousPage: true, hasNextPage: false });
});
it("rejects unknown/repeated/invalid controls and inactive references", async () => {
  for (const query of ["unknown=x", "search=", "page=100002", "pageSize=20", "sortBy=passwordHash", "sortDir=sideways", "owner=0", `owner=${ids.Retired}`, `owner=${ids.Requester}`, `categoryId=${inactiveCategory}`, "relatedSystemId=999999", "currentStatus=WRONG", "itPriority=UNASSIGNED", "owner=me&owner=unassigned", `requesterId=${ids.Requester}`]) {
    expect((await get(`?${query}`)).status, query).toBe(400);
  }
});
it("lists only active eligible assignees in name/id order", async () => {
  const response = await request(app).get("/api/staff/assignees").set("Cookie", cookies.Admin);
  expect(response.status).toBe(200);
  expect(response.body).toEqual([
    { id: ids.Admin, displayName: "Admin", role: "ADMIN" },
    { id: ids.Staff, displayName: "Staff", role: "IT_STAFF" },
  ]);
});
