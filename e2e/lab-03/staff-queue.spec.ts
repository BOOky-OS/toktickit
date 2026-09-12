import { expect, test } from "@playwright/test";

// Browser layout/navigation evidence with explicit API fixtures. Real DB behavior
// is covered separately by staff-queue.api.test.ts, not claimed by these mocks.
test("Queue layout, controls, read-only detail and safe states", async ({ page }, info) => {
  const item = { id: 42, ticketNumber: "TKT-2026-000042", summary: "Campus laptop battery drains during online classes", requester: { id: 1, displayName: "Jennifer Anderson" },
    category: { id: 2, name: "Hardware" }, relatedSystem: { id: 3, name: "Corporate Laptop" }, requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "WAITING_FOR_REQUESTER",
    ticketDate: "2026-09-01T00:00:00Z", updatedAt: "2026-09-02T00:00:00Z", owner: { id: 4, displayName: "Alex Chen", role: "IT_STAFF" }, version: 1 };
  let mode = "ready";
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    let body: unknown = {};
    let status = 200;
    if (url.pathname === "/api/auth/me") body = { user: { id: 4, displayName: "Alex Chen", email: "alex@example.test", role: "IT_STAFF", mustChangePassword: false } };
    else if (url.pathname === "/api/auth/csrf") body = { csrfToken: "a".repeat(64) };
    else if (url.pathname === "/api/categories") body = [item.category];
    else if (url.pathname === "/api/related-systems") body = [item.relatedSystem];
    else if (url.pathname === "/api/staff/assignees") body = [item.owner];
    else if (url.pathname === "/api/staff/tickets") {
      if (mode === "error") { status = 500; body = { error: "private DB path" }; }
      else body = { items: url.searchParams.get("search") ? [] : [item], page: 1, pageSize: 10, totalItems: url.searchParams.get("search") ? 0 : 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false };
    } else if (url.pathname === "/api/tickets/42") body = { ...item, description: "The battery runs down within one hour after a full charge.", attachments: [], requesterResolutionIndicatedAt: null, resolvedAt: null, closedAt: null, cancelledAt: null, resolutionSummary: null, cancellationReason: null };
    else if (url.pathname.endsWith("/attachments")) body = [];
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/staff/tickets");
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  const desktop = info.project.name === "desktop";
  await expect(page.locator(desktop ? ".queue-desktop" : ".queue-cards")).toBeVisible();
  await expect(page.locator(desktop ? ".queue-cards" : ".queue-desktop")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/lab-03/screenshots/staff-queue/${info.project.name}/queue.png`, fullPage: true });
  await page.getByLabel("Search", { exact: true }).fill("missing");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No matching Tickets")).toBeVisible();
  mode = "error";
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("alert")).toContainText("Your filters are unchanged");
  await expect(page.getByText("private DB path")).toHaveCount(0);
  mode = "ready";
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByRole("button", { name: desktop ? "Open TKT-2026-000042" : "Open Ticket", exact: true }).click();
  await expect(page).toHaveURL(/\/tickets\/42$/);
  await expect(page.getByRole("heading", { name: item.ticketNumber })).toBeVisible();
  await expect(page.getByLabel("Add attachment")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: item.ticketNumber })).toBeVisible();
  await page.getByRole("button", { name: "Back to Ticket Queue" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
});
