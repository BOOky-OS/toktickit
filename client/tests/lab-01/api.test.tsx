import { afterEach, describe, expect, it, vi } from "vitest";
import { checkSystem } from "../../src/api.js";

describe("checkSystem", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the health and category endpoints in order", async () => {
    const categories = [
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ status: "ok", service: "TokTickIT API" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(categories),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkSystem()).resolves.toEqual({ online: true, categories });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://localhost:3000/api/health");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://localhost:3000/api/categories");
  });
});
