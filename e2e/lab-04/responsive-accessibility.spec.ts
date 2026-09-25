import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

for (const [name, width, height, id] of [["desktop", 1440, 900, 3], ["tablet", 834, 1112, 4], ["mobile", 390, 844, 5], ["narrow", 320, 844, 6]] as const) {
  test(`Actions ${name}: validation, keyboard, dialog and no overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
    await page.goto("/login"); await page.getByLabel("Email *", { exact: true }).fill("staff@lab4.example");
    await page.getByLabel("Password *", { exact: true }).fill("Lab4-test-only-password!"); await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("button", { name: "Logout", exact: true })).toBeVisible(); await page.goto(`/tickets/${id}`);
    const add = page.getByRole("button", { name: "Add action" }); await add.focus(); await page.keyboard.press("Enter");
    const description = page.getByLabel("Description", { exact: true }); await expect(description).toBeFocused();
    await page.getByLabel("Follow-up required?").selectOption("yes"); await page.getByRole("button", { name: "Save action", exact: true }).click();
    await expect(page.locator("#action-errors")).toBeFocused();
    await description.fill("LongNetworkReference".repeat(12)); await page.getByLabel("Follow-up note").fill("Contact requester to repeat the test.");
    await page.getByLabel("Attachment notes").fill("See the existing screenshot network-check.png.");
    const dir = `artifacts/lab-04/screenshots/actions-taken/${name}`; await mkdir(dir, { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${dir}/create.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Save action", exact: true }).click(); await expect(page.getByRole("article")).toHaveCount(1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${dir}/list.png`, fullPage: true });
    const cancel = page.getByRole("button", { name: /^Cancel action/ }); await cancel.focus(); await page.keyboard.press("Enter");
    const modal = page.getByRole("dialog"); await expect(page.getByLabel("Cancellation reason")).toBeFocused();
    for (let i = 0; i < 6; i++) { await page.keyboard.press("Tab"); expect(await modal.evaluate(el => el.contains(document.activeElement))).toBe(true); }
    await page.getByLabel("Cancellation reason").fill("Duplicate check no longer needed");
    await page.evaluate(() => window.scrollTo(0, 0)); const box = await modal.boundingBox(); expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width); expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    await page.screenshot({ path: `${dir}/cancel.png` });
    page.once("dialog", d => d.dismiss()); await page.keyboard.press("Escape"); await expect(modal).toBeVisible();
    page.once("dialog", d => d.accept()); await page.keyboard.press("Escape"); await expect(modal).not.toBeVisible(); await expect(cancel).toBeFocused();
    await page.getByRole("button", { name: /^Edit action/ }).click(); await description.fill("Protected unsaved draft");
    page.once("dialog", d => d.dismiss()); await page.getByRole("button", { name: "Back to Ticket Queue" }).click();
    await expect(description).toHaveValue("Protected unsaved draft"); expect(page.url()).toContain(`/tickets/${id}`);
    expect(errors).toEqual([]);
  });
}
