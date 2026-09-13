import { test, expect, type Page } from "@playwright/test";
import { signIn } from "./helpers";

const sizes = [{ name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 834, height: 1112 }, { name: "mobile", width: 390, height: 844 }];
async function capture(page: Page, screen: string) {
  await expect(page.locator("main")).toBeVisible();
  for (const size of sizes) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${screen}/${size.name} page overflow`).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `artifacts/lab-03/screenshots/real/${screen}-${size.name}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 720, height: 450 });
  // A 1440x900 browser at 200% has a 720x450 CSS viewport; this checks reflow,
  // not OS/browser chrome magnification.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${screen}/200%-equivalent reflow`).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  const region = screen === "login" || screen === "mandatory-password" ? page.locator(".auth-card")
    : screen === "admin-create" || screen === "admin-edit-reset" ? page.locator('section[aria-labelledby="user-editor-heading"]')
    : screen === "staff-detail" ? page.locator('section[aria-labelledby="staff-operations-heading"]')
    : screen === "requester-detail" ? page.locator(".detail-wide").last() : null;
  if (region) await region.screenshot({ path: `artifacts/lab-03/screenshots/real/${screen}-region.png` });
  await page.setViewportSize({ width: 390, height: 844 });
}

test("login and mandatory-password screens across three sizes", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await page.getByLabel("Email *", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Password *", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Show password", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeFocused();
  await capture(page, "login");
  await signIn(page, "visualfirst");
  await expect(page.getByRole("heading", { name: "Create your new password" })).toBeVisible();
  await capture(page, "mandatory-password");
});

for (const account of ["requester", "staff", "admin"]) {
  test(`${account} workspace and detail across three sizes`, async ({ page }) => {
    await signIn(page, account);
    await expect(page.getByRole("button", { name: "Logout", exact: true })).toBeVisible();
    await capture(page, `${account}-home`);
    if (account === "requester") {
      await page.goto("/tickets/new");
      await expect(page.getByLabel("Category *", { exact: true })).toBeEnabled();
      await capture(page, "requester-create");
    } else if (account === "admin") {
      await page.getByRole("button", { name: "Create user", exact: true }).click();
      await expect(page.getByRole("button", { name: "Save new user" })).toBeVisible();
      await page.getByLabel("Initial password *", { exact: true }).focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Save new user" })).toBeFocused();
      await capture(page, "admin-create");
      await page.getByRole("button", { name: "Edit E2E staff", exact: true }).click();
      await expect(page.getByRole("button", { name: "Set new initial password" })).toBeVisible();
      await capture(page, "admin-edit-reset");
    }
    const list = await page.request.get(`http://localhost:3006/api/${account === "requester" ? "tickets" : "staff/tickets"}?search=Visual`);
    expect(list.status()).toBe(200);
    const data = await list.json();
    const ticket = data.items.find((item: { summary: string }) => item.summary.startsWith("Visual"));
    expect(ticket).toBeDefined();
    await page.goto(`/tickets/${ticket.id}`);
    await expect(page.getByText(ticket.summary, { exact: true })).toBeVisible();
    await capture(page, `${account}-detail`);

    // Text remains visible; meaning does not depend on badge colour.
    await expect(page.locator("dt", { hasText: /^IT Priority$/ }).locator("..").locator(".zen-badge")).toHaveText("Medium");
    if (account === "staff") {
      const trigger = page.getByRole("button", { name: "Assign owner", exact: true });
      await page.getByLabel("Assigned owner").selectOption({ label: "E2E staff (IT Staff)" });
      await trigger.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await capture(page, "staff-confirm-dialog");
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    }
  });
}
