import { describe, expect, it } from "vitest";
import { parseQueue } from "../../src/tickets/staff-queue.js";

describe("Staff Queue query boundary", () => {
  it("uses session identity and deterministic default controls", () => {
    expect(parseQueue({}, 7)).toMatchObject({ requesterId: 7, sortBy: "updatedAt", sortDir: "desc", page: 1, pageSize: 10 });
  });
  it("trims search, preserves literal wildcards, and accepts priority sorting", () => {
    expect(parseQueue({ search: "  %_\\  ", sortBy: "itPriority", sortDir: "asc", owner: "me" }, 7))
      .toMatchObject({ search: "%_\\", sortBy: "itPriority", sortDir: "asc", owner: "me" });
  });
  it("accepts the maximum offset and rejects an offset beyond it", () => {
    expect(parseQueue({ page: "100001", pageSize: "10" }, 7).page).toBe(100001);
    expect(() => parseQueue({ page: "100002", pageSize: "10" }, 7)).toThrow();
  });
  it("rejects unknown, repeated, nested, unsafe and invalid controls", () => {
    const invalid: Record<string, unknown>[] = [
      { requesterId: "2" }, { search: ["a", "b"] }, { owner: { id: "1" } },
      { sortBy: "passwordHash" }, { sortDir: "DESC" }, { currentStatus: "INVALID" },
      { itPriority: "URGENT" }, { requestedPriority: "URGENT" },
      { search: " " }, { search: "a".repeat(121) }, { owner: "1e2" },
      { owner: "9007199254740992" }, { page: "9007199254740992" },
      { pageSize: "20" }, { categoryId: "0" }, { relatedSystemId: "-1" },
      { categoryId: "1e2" }, { page: "0x10" }, { pageSize: "10.0" },
    ];
    for (const query of invalid) expect(() => parseQueue(query, 7), JSON.stringify(query)).toThrow();
  });
});
