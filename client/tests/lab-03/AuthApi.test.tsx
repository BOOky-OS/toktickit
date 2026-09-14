import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../src/api.js";

const user: api.CurrentUser = {
  id: 1,
  displayName: "Jennifer Anderson",
  email: "jennifer@example.test",
  role: "REQUESTER",
  mustChangePassword: false,
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("Lab 3 authenticated client transport", () => {
  beforeEach(() => {
    api.clearAuthTransport();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    api.clearAuthTransport();
  });

  it("uses cookie credentials and an in-memory CSRF token without browser credential storage", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ csrfToken: "csrf-before-login" }))
      .mockResolvedValueOnce(json({ user, csrfToken: "csrf-after-login" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.login("jennifer@example.test", "Initial Password 123")).resolves.toEqual(user);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ credentials: "include" }));
    const loginInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect(loginInit.credentials).toBe("include");
    expect(new Headers(loginInit.headers).get("X-CSRF-Token")).toBe("csrf-before-login");
    expect(JSON.parse(String(loginInit.body))).toEqual({
      email: "jennifer@example.test",
      password: "Initial Password 123",
    });
    expect(localStorage).toHaveLength(0);
    expect(sessionStorage).toHaveLength(0);
  });

  it("derives requester ownership from the session and never transports requesterId", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ csrfToken: "csrf" }))
      .mockResolvedValueOnce(json({
        items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0,
        hasPreviousPage: false, hasNextPage: false,
      }))
      .mockResolvedValueOnce(json({ id: 42, ticketNumber: "TKT-2026-000042" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await api.getCsrf();
    await api.getTickets({ search: "battery", page: 1 });
    await api.createTicket({
      categoryId: 2,
      relatedSystemId: 7,
      summary: "Laptop battery drains quickly",
      requestedPriority: "MEDIUM",
      description: "The battery drops from full charge to empty within one hour.",
    }, "client-key");

    expect(String(fetchMock.mock.calls[1][0])).toContain("search=battery");
    expect(String(fetchMock.mock.calls[1][0])).not.toContain("requesterId");
    const createInit = fetchMock.mock.calls[2][1] as RequestInit;
    expect(String(createInit.body)).not.toContain("requesterId");
    expect(new Headers(createInit.headers).get("X-CSRF-Token")).toBe("csrf");
  });

  it("expires protected requests while treating a Login 401 as credential feedback", async () => {
    let expired = 0;
    const onExpired = () => { expired += 1; };
    window.addEventListener("toktickit:session-expired", onExpired);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ csrfToken: "csrf" }))
      .mockResolvedValueOnce(json({ error: "Invalid", code: "INVALID_CREDENTIALS" }, 401))
      .mockResolvedValueOnce(json({ error: "Expired", code: "AUTH_REQUIRED" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.login("jennifer@example.test", "wrong password")).rejects.toMatchObject({ status: 401 });
    expect(expired).toBe(0);
    await expect(api.getTicket(42)).rejects.toMatchObject({ status: 401 });
    expect(expired).toBe(1);
    window.removeEventListener("toktickit:session-expired", onExpired);
  });

  it("routes a password-change-required response to the mandatory flow", async () => {
    let required = 0;
    const onRequired = () => { required += 1; };
    window.addEventListener("toktickit:password-change-required", onRequired);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      json({ error: "Password change required", code: "PASSWORD_CHANGE_REQUIRED" }, 403),
    ));

    await expect(api.getCategories()).rejects.toThrow("Unable to load request categories");
    expect(required).toBe(1);
    window.removeEventListener("toktickit:password-change-required", onRequired);
  });
});
