import { expect, test } from "@playwright/test";

test("Staff confirms changes, retains conflict draft, reloads and sees public history", async ({ page }, info) => {
  const owner = { id: 4, displayName: "Alex Chen", role: "IT_STAFF" };
  let ticket = { id: 42, ticketNumber: "TKT-2026-000042", summary: "Campus laptop battery drains during online classes", description: "Battery lasts less than one hour.", requester: { id: 1, displayName: "Jennifer Anderson" },
    category: { id: 2, name: "Hardware" }, relatedSystem: { id: 3, name: "Corporate Laptop" }, requestedPriority: "MEDIUM", itPriority: "LOW", currentStatus: "OPEN",
    ticketDate: "2026-09-01T00:00:00Z", updatedAt: "2026-09-02T00:00:00Z", owner, version: 1, attachments: [] };
  let conflict = true;
  let role = "IT_STAFF";
  const history: unknown[] = [];
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [], status = 200;
    if (path === "/api/auth/me") body = { user: { id: 4, displayName: "Alex Chen", email: "alex@example.test", role, mustChangePassword: false } };
    else if (path === "/api/auth/csrf") body = { csrfToken: "a".repeat(64) };
    else if (path === "/api/staff/assignees") body = [owner];
    else if (path === "/api/tickets/42") body = ticket;
    else if (path.endsWith("/status-history")) body = history;
    else if (path === "/api/staff/tickets/42/status") {
      const input = route.request().postDataJSON();
      expect(input.confirmed).toBe(true);
      if (conflict) { conflict = false; ticket = { ...ticket, version: 2 }; status = 409; body = { code: "STALE_VERSION" }; }
      else {
        expect(input.version).toBe(2);
        history.push({ id: 1, fromStatus: "OPEN", toStatus: input.currentStatus, reason: input.reason, author: owner, createdAt: "2026-09-12T07:00:00Z" });
        ticket = { ...ticket, currentStatus: input.currentStatus, version: 3 }; body = ticket;
      }
    }
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/tickets/42");
  await page.getByLabel("Next status").selectOption("RESOLVED");
  await page.getByLabel("Public status reason (required)").fill("Replaced the faulty battery.");
  const change = page.getByRole("button", { name: "Change status", exact: true });
  await change.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(change).toBeFocused();
  await change.click();
  await page.getByRole("button", { name: "Confirm change" }).click();
  await expect(page.getByText(/Ticket may have changed/)).toBeVisible();
  await expect(change).toBeDisabled();
  await page.screenshot({ path: `artifacts/lab-03/screenshots/staff-ticket-detail/${info.project.name}/conflict.png`, fullPage: true });
  await page.getByRole("button", { name: "Reload Ticket" }).click();
  await expect(page.getByLabel("Public status reason (required)")).toHaveValue("Replaced the faulty battery.");
  await change.click();
  await page.getByRole("button", { name: "Confirm change" }).click();
  await expect(page.getByText("Ticket updated.", { exact: true })).toBeVisible();
  await expect(page.getByText("Open → Resolved")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/lab-03/screenshots/staff-ticket-detail/${info.project.name}/resolved.png`, fullPage: true });
  role = "ADMIN";
  await page.reload();
  await expect(page.getByRole("heading", { name: "Status history", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Change status", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Add attachment")).toHaveCount(0);
});
