import { test, expect, Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
export async function signIn(page: Page, name: string) {
  await page.goto("/login"); await page.getByLabel("Email *", { exact: true }).fill(`${name}@lab4.example`);
  await page.getByLabel("Password *", { exact: true }).fill("Lab4-test-only-password!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Logout", exact: true })).toBeVisible();
}
test("real Staff/Admin actions, Requester visibility and revisions", async ({ page, browser }) => {
  await signIn(page, "staff"); await page.goto("/tickets/1");
  await page.getByRole("button", { name: "Add action" }).click();
  await page.getByLabel("Description", { exact: true }).fill("Checked the adapter and connection");
  await page.getByLabel("Result", { exact: true }).fill("Connection stable after testing");
  await page.getByLabel("Assigned to", { exact: true }).selectOption({ label: "E2E second (It Staff)" });
  await page.getByRole("button", { name: "Save action", exact: true }).click();
  const card = page.getByRole("article").filter({ hasText: "Checked the adapter" }); await expect(card).toBeVisible();
  await card.getByRole("button", { name: /^Start action/ }).click(); await expect(card.getByText("In Progress", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: /^Complete action/ }).click(); await expect(card.getByText("Completed", { exact: true }).first()).toBeVisible();
  await expect(card.getByRole("button", { name: /^Edit action/ })).toHaveCount(0);
  const admin = await browser.newPage(); await signIn(admin, "admin"); await admin.goto("/tickets/1");
  await admin.getByRole("button", { name: "Add action" }).click(); await admin.getByLabel("Description", { exact: true }).fill("Additional check by administrator");
  await admin.getByRole("button", { name: "Save action", exact: true }).click();
  const second = admin.getByRole("article").filter({ hasText: "Additional check" });
  await second.getByRole("button", { name: /^Cancel action/ }).click();
  await admin.getByLabel("Cancellation reason").fill("Duplicate work no longer needed"); await admin.getByRole("button", { name: "Confirm cancellation" }).click();
  await expect(second.getByText("Cancelled", { exact: true }).first()).toBeVisible();
  await second.getByRole("button", { name: /^History/ }).click(); await expect(admin.getByText(/Revision 2: Status by E2E admin/)).toBeVisible();
  const requester = await browser.newPage(); await signIn(requester, "requester"); await requester.goto("/tickets/1");
  await expect(requester.getByRole("article")).toHaveCount(2); await expect(requester.getByRole("button", { name: "Add action" })).toHaveCount(0);
  await expect(requester.getByRole("button", { name: /^History of action/ })).toHaveCount(0);
  const db = new PrismaClient({ datasources: { db: { url: process.env.LAB4_E2E_DATABASE_URL } } });
  try { const records = await db.actionTaken.findMany({ where: { ticketId: 1 }, include: { revisions: true } }); expect(records).toHaveLength(2); expect(records[0].performedById).not.toBe(records[1].performedById); expect(records.map(r => r.revisions.length)).toEqual([3, 2]); } finally { await db.$disconnect(); }
  await admin.close(); await requester.close();
});
test("conflict retains draft; real saved-but-lost response retries without duplication", async ({ page }) => {
  await signIn(page, "staff"); await page.goto("/tickets/2"); await page.getByRole("button", { name: "Add action" }).click();
  await page.getByLabel("Description", { exact: true }).fill("Retained network draft");
  const db = new PrismaClient({ datasources: { db: { url: process.env.LAB4_E2E_DATABASE_URL } } });
  try {
    await db.ticket.update({ where: { id: 2 }, data: { version: { increment: 1 } } });
    await page.getByRole("button", { name: "Save action", exact: true }).click(); await page.getByRole("button", { name: "Reload current values" }).click();
    await expect(page.getByLabel("Description", { exact: true })).toHaveValue("Retained network draft");
    await page.getByLabel("I reviewed the current values and my draft").check();
    let key = "", calls = 0;
    await page.route("**/api/tickets/2/actions", async route => {
      if (route.request().method() !== "POST") return route.continue();
      calls++; const currentKey = route.request().headers()["idempotency-key"];
      if (calls === 1) { key = currentKey; await route.fetch(); await route.abort("failed"); }
      else { expect(currentKey).toBe(key); await route.continue(); }
    });
    await page.getByRole("button", { name: "Save action", exact: true }).click();
    await page.getByRole("button", { name: "Retry same save" }).click();
    await expect(page.getByText("Previous save confirmed. Current actions refreshed.")).toBeVisible();
    expect(await db.actionTaken.count({ where: { ticketId: 2 } })).toBe(1);
  } finally { await db.$disconnect(); }
});
test("foreign Requester cannot view Ticket; hash link finds a later action page", async ({ page }) => {
  await signIn(page, "other"); await page.goto("/tickets/1"); await expect(page.getByRole("heading", { name: "Ticket unavailable" })).toBeVisible();
  await page.getByRole("button", { name: "Logout", exact: true }).click(); await signIn(page, "staff");
  const db = new PrismaClient({ datasources: { db: { url: process.env.LAB4_E2E_DATABASE_URL } } });
  try { const action = await db.actionTaken.findFirstOrThrow({ where: { ticketId: 12 }, orderBy: { id: "desc" } });
    await page.goto(`/tickets/12#action-${action.id}`); await expect(page.locator(`#action-${action.id}`)).toBeFocused();
  } finally { await db.$disconnect(); }
});

test("unavailable assignee requires reassignment; cancellation works and expired session clears draft", async ({ page }) => {
  await signIn(page, "staff"); await page.goto("/tickets/7"); await page.getByRole("button", { name: "Add action" }).click();
  await page.getByLabel("Description", { exact: true }).fill("Check retired technician assignment");
  await page.getByRole("button", { name: "Save action", exact: true }).click(); await expect(page.getByRole("article")).toHaveCount(1);
  const db = new PrismaClient({ datasources: { db: { url: process.env.LAB4_E2E_DATABASE_URL } } });
  try {
    const retired = await db.user.create({ data: { displayName: "Retired technician", email: "retired@lab4.example", isActive: false, role: "IT_STAFF" } });
    await db.actionTaken.updateMany({ where: { ticketId: 7 }, data: { assigneeId: retired.id } });
    await page.reload(); await expect(page.getByRole("button", { name: /^Start action/ })).toBeDisabled();
    await page.getByRole("button", { name: /^Edit action/ }).click(); await page.getByRole("button", { name: "Save action", exact: true }).click();
    await expect(page.getByLabel("Assigned to", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await page.getByRole("button", { name: "Cancel editing" }).click(); await page.getByRole("button", { name: /^Cancel action/ }).click();
    await page.getByLabel("Cancellation reason").fill("Retired technician no longer assigned"); await page.getByRole("button", { name: "Confirm cancellation" }).click();
    await expect(page.getByRole("article").getByText("Cancelled", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Add action" }).click(); await page.getByLabel("Description", { exact: true }).fill("Sensitive unsaved draft");
    const staff = await db.user.findUniqueOrThrow({ where: { email: "staff@lab4.example" } });
    await db.session.updateMany({ where: { userId: staff.id }, data: { revokedAt: new Date() } });
    await page.getByRole("button", { name: "Save action", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Sign in/ })).toBeVisible(); await expect(page.getByText("Sensitive unsaved draft")).toHaveCount(0);
  } finally { await db.$disconnect(); }
});
