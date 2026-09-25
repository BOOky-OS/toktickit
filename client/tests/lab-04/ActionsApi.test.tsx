import { afterEach, expect, it, vi } from "vitest";
import { ApiError, getActions, getActionHistory, getCsrf, writeAction } from "../../src/api.js";
afterEach(() => vi.unstubAllGlobals());
it("uses authenticated CSRF/idempotency transport and recognizes replay", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "token" })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ action: { id: 3 }, ticketVersion: 2 }), { headers: { "Idempotency-Replayed": "true" } }));
  vi.stubGlobal("fetch", fetch); await getCsrf(); const body = { version: 1, ticketVersion: 1 };
  expect((await writeAction(1, 3, "edit", body, "stable-key")).replayed).toBe(true);
  const [url, init] = fetch.mock.calls[1]; expect(url).toContain("/api/tickets/1/actions/3"); expect(init.method).toBe("PATCH");
  expect(init.credentials).toBe("include"); expect(init.headers.get("Idempotency-Key")).toBe("stable-key"); expect(init.headers.get("X-CSRF-Token")).toBe("token"); expect(JSON.parse(init.body)).toEqual(body);
});
it("uses bounded paging and propagates typed conflicts for safe recovery", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }))).mockResolvedValueOnce(new Response(JSON.stringify({ items: [] })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Changed", code: "STALE_VERSION" }), { status: 409 })); vi.stubGlobal("fetch", fetch);
  await getActions(7, 2, 25); await getActionHistory(7, 8, 3);
  expect(fetch.mock.calls[0][0]).toContain("/tickets/7/actions?page=2&pageSize=25"); expect(fetch.mock.calls[1][0]).toContain("/actions/8/history?page=3");
  await expect(writeAction(7, 8, "status", {}, "key")).rejects.toMatchObject({ status: 409, code: "STALE_VERSION" });
});
