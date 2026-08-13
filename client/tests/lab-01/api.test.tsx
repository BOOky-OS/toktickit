import { afterEach, describe, expect, it, vi } from "vitest";
import { checkSystem } from "../../src/api.js";

describe("checkSystem", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the real health endpoint and accepts the required response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ status: "ok", service: "TokTickIT API" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkSystem()).resolves.toEqual({ online: true, categories: [] });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/health");
  });
});
