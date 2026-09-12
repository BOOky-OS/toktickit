import { expect, test } from "@playwright/test";
test("role-separated messages, uncertain retry and requester indication", async ({ page }, info) => {
  let role = "IT_STAFF", uncertain = true, noteRequests = 0;
  const author = { id: 4, displayName: "Alex Chen", role: "IT_STAFF" };
  const entries: Record<string, unknown[]> = { comments: [], notes: [] };
  let ticket = { id: 42, ticketNumber: "TKT-2026-000042", summary: "Laptop battery issue", description: "Battery drains during classes.", requester: { id: 1, displayName: "Jennifer Anderson" },
    category: { id: 2, name: "Hardware" }, relatedSystem: { id: 3, name: "Corporate Laptop" }, requestedPriority: "MEDIUM", itPriority: "LOW", currentStatus: "OPEN", requesterResolutionIndicatedAt: null as string | null,
    ticketDate: "2026-09-01T00:00:00Z", updatedAt: "2026-09-02T00:00:00Z", owner: author, version: 1, attachments: [] };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [], status = 200;
    if (path === "/api/auth/me") body = { user: { id: role === "REQUESTER" ? 1 : 4, displayName: role === "REQUESTER" ? "Jennifer Anderson" : "Alex Chen", email: "local@example.test", role, mustChangePassword: false } };
    else if (path === "/api/auth/csrf") body = { csrfToken: "a".repeat(64) };
    else if (path === "/api/staff/assignees") body = [author];
    else if (path === "/api/tickets/42") body = ticket;
    else if (path.endsWith("/comments") || path.endsWith("/notes")) {
      const stream = path.endsWith("/notes") ? "notes" : "comments";
      if (stream === "notes") noteRequests++;
      if (route.request().method() === "POST") {
        if (uncertain && stream === "comments") { uncertain = false; await route.abort("failed"); return; }
        body = { id: entries[stream].length + 1, body: route.request().postDataJSON().body, author, createdAt: "2026-09-12T08:00:00Z" };
        entries[stream].push(body); ticket = { ...ticket, version: ticket.version + 1 }; status = 201;
      } else body = entries[stream];
    } else if (path.endsWith("/resolution-indication")) {
      expect(route.request().postDataJSON()).toEqual({ version: ticket.version, confirmed: true });
      ticket = { ...ticket, version: ticket.version + 1, requesterResolutionIndicatedAt: "2026-09-12T09:00:00Z" }; body = ticket;
    }
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/tickets/42");
  await page.getByLabel("Public comment", { exact: true }).fill("<b>Public update</b>\nSecond line");
  await page.getByLabel("Internal note", { exact: true }).fill("PRIVATE_INTERNAL_MARKER");
  await page.getByRole("button", { name: "Post public comment" }).click();
  await expect(page.getByText(/message may have been saved/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Post public comment" })).toBeDisabled();
  await page.getByRole("button", { name: "Reload Public Comments" }).click();
  await expect(page.getByText(/Latest entries loaded/)).toBeVisible();
  await page.getByRole("button", { name: "Post public comment" }).click();
  await expect(page.getByLabel("Public comment", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Internal note", { exact: true })).toHaveValue("PRIVATE_INTERNAL_MARKER");
  await page.getByRole("button", { name: "Post internal note" }).click();
  await expect(page.getByLabel("Internal note", { exact: true })).toHaveValue("");
  await expect(page.getByText("<b>Public update</b>\nSecond line", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/lab-03/screenshots/communication/${info.project.name}/staff.png`, fullPage: true });
  role = "ADMIN"; await page.reload();
  await expect(page.getByRole("heading", { name: "Internal Notes", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Post internal note" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Post public comment" })).toHaveCount(0);
  role = "REQUESTER"; const previousNotes = noteRequests; await page.reload();
  await expect(page.getByRole("heading", { name: "Public Comments", exact: true })).toBeVisible();
  await expect(page.getByText("PRIVATE_INTERNAL_MARKER", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Internal Notes", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Problem Appears Resolved", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Problem Appears Resolved", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Problem Appears Resolved", exact: true }).click();
  await page.getByRole("button", { name: "Confirm indication", exact: true }).click();
  await expect(page.getByText("Your resolution indication has been recorded.")).toBeVisible();
  expect(ticket.currentStatus).toBe("OPEN"); expect(noteRequests).toBe(previousNotes);
  await page.screenshot({ path: `artifacts/lab-03/screenshots/communication/${info.project.name}/requester.png`, fullPage: true });
});
