import { test, expect, type Page } from "@playwright/test";

const password = "Lab3-test-only-password!";
async function login(page: Page, account: string, credential = password) {
  await page.goto("/login");
  await page.getByLabel("Email *", { exact: true }).fill(`${account}@lab3.example`);
  await page.getByLabel("Password *", { exact: true }).fill(credential);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

for (const [account, route, allowed, denied] of [
  ["requester", /\/my-tickets$/, "/api/tickets", "/api/admin/users"],
  ["staff", /\/staff\/tickets$/, "/api/staff/tickets", "/api/admin/users"],
  ["admin", /\/admin\/users$/, "/api/admin/users", null],
] as const) {
  test(`${account}: real login, role authorization, reload and logout revocation`, async ({ page }) => {
    await login(page, account);
    await expect(page).toHaveURL(route);
    expect((await page.request.get(`http://localhost:3006${allowed}`)).status()).toBe(200);
    if (denied) expect((await page.request.get(`http://localhost:3006${denied}`)).status()).toBe(403);
    await page.reload();
    await expect(page.getByRole("button", { name: "Logout", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Logout", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    expect((await page.request.get(`http://localhost:3006${allowed}`)).status()).toBe(401);
  });
}

test("invalid and inactive credentials show the same safe failure", async ({ page }) => {
  await login(page, "requester", "Incorrect-password!");
  const message = "Unable to sign in. Check your credentials or contact your administrator.";
  await expect(page.getByRole("alert")).toContainText(message);
  await expect(page.getByLabel("Password *", { exact: true })).toHaveValue("");
  await login(page, "inactive");
  await expect(page.getByRole("alert")).toContainText(message);
  expect((await page.request.get("http://localhost:3006/api/tickets")).status()).toBe(401);
});

test("initial password blocks direct access until changed and cannot be reused", async ({ page }) => {
  await login(page, "first");
  await expect(page.getByRole("heading", { name: "Create your new password" })).toBeVisible();
  expect((await page.request.get("http://localhost:3006/api/tickets")).status()).toBe(403);
  await page.getByLabel("Current password *", { exact: true }).fill(password);
  await page.getByLabel("New password *", { exact: true }).fill("Changed-test-password!");
  await page.getByLabel("Confirm new password *", { exact: true }).fill("Changed-test-password!");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/my-tickets$/);
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await login(page, "first");
  await expect(page.getByRole("alert")).toContainText("Unable to sign in");
  await login(page, "first", "Changed-test-password!");
  await expect(page).toHaveURL(/\/my-tickets$/);
});
