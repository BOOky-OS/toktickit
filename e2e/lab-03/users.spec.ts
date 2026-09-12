import { expect, test } from "@playwright/test";
test("Admin user create/edit/reset, conflict reload and responsive layout", async ({ page }, info) => {
  let target = { id: 2, displayName: "Jennifer Anderson", email: "jennifer@example.test", role: "REQUESTER", isActive: true, mustChangePassword: false, version: 1, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z" };
  let conflict = true, created = false;
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname, method = route.request().method();
    let body: unknown = {}, status = 200;
    if (path === "/api/auth/me") body = { user: { id: 1, displayName: "Alex Admin", email: "admin@example.test", role: "ADMIN", mustChangePassword: false } };
    else if (path === "/api/auth/csrf") body = { csrfToken: "a".repeat(64) };
    else if (path === "/api/admin/users" && method === "GET") body = { items: [target], totalItems: 1 };
    else if (path === "/api/admin/users" && method === "POST") {
      const input = route.request().postDataJSON(); expect(input.initialPassword).toBe("Local test password 123!");
      target = { ...target, displayName: input.displayName, email: input.email, role: input.role, mustChangePassword: true }; body = target; status = 201; created = true;
    } else if (path === "/api/admin/users/2" && method === "GET") body = target;
    else if (path === "/api/admin/users/2" && method === "PATCH") {
      const input = route.request().postDataJSON();
      if (conflict) { conflict = false; target = { ...target, version: 2 }; status = 409; body = { code: "STALE_VERSION" }; }
      else { expect(input.version).toBe(2); target = { ...target, ...input, version: 3 }; body = target; }
    } else if (path.endsWith("/initial-password")) {
      expect(route.request().postDataJSON().confirmed).toBe(true);
      target = { ...target, mustChangePassword: true, version: target.version + 1 }; body = target;
    }
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/admin/users");
  await page.getByRole("button", { name: "Edit Jennifer Anderson" }).click();
  await page.getByLabel("Display name *", { exact: true }).fill("Jennifer Updated");
  await page.getByRole("button", { name: "Save user changes" }).click();
  await expect(page.getByText(/User changed/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save user changes" })).toBeDisabled();
  await page.getByRole("button", { name: "Reload users" }).click();
  await expect(page.getByLabel("Display name *", { exact: true })).toHaveValue("Jennifer Updated");
  await page.getByRole("button", { name: "Save user changes" }).click();
  await expect(page.getByText("User saved.", { exact: true })).toBeVisible();
  await page.getByLabel("New initial password", { exact: true }).fill("Local reset password 456!");
  const reset = page.getByRole("button", { name: "Set new initial password" });
  await reset.click(); await page.keyboard.press("Escape"); await expect(reset).toBeFocused();
  await reset.click(); await page.getByRole("button", { name: "Confirm reset" }).click();
  await expect(page.getByText(/Initial password replaced/)).toBeVisible();
  await expect(page.getByLabel("New initial password", { exact: true })).toHaveValue("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/lab-03/screenshots/user-management/${info.project.name}/edit.png`, fullPage: true });
  await page.getByRole("button", { name: "Create user", exact: true }).click();
  await page.getByLabel("Display name *", { exact: true }).fill("New Staff");
  await page.getByLabel("Email *", { exact: true }).fill("staff@example.test");
  await page.getByLabel("Role *", { exact: true }).selectOption("IT_STAFF");
  await page.getByLabel("Initial password *", { exact: true }).fill("Local test password 123!");
  await page.getByRole("button", { name: "Save new user" }).click();
  await expect(page.getByText("User saved.", { exact: true })).toBeVisible(); expect(created).toBe(true);
  await expect(page.getByLabel("New initial password", { exact: true })).toHaveValue("");
});
