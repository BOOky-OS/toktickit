import { expect, type Page } from "@playwright/test";

export const initialPassword = "Lab3-test-only-password!";
export async function signIn(page: Page, account: string, password = initialPassword) {
  await page.goto("/login");
  await page.getByLabel("Email *", { exact: true }).fill(`${account}@lab3.example`);
  await page.getByLabel("Password *", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
export async function changeInitialPassword(page: Page, current: string, next: string) {
  await expect(page.getByRole("heading", { name: "Create your new password" })).toBeVisible();
  await page.getByLabel("Current password *", { exact: true }).fill(current);
  await page.getByLabel("New password *", { exact: true }).fill(next);
  await page.getByLabel("Confirm new password *", { exact: true }).fill(next);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("button", { name: "Logout", exact: true })).toBeVisible();
}
