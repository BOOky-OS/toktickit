import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test("server expiry denies the old cookie and returns the browser to sign-in", async ({ page }) => {
  await signIn(page, "other");
  await expect(page).toHaveURL(/\/my-tickets$/);
  const token = (await page.context().cookies("http://localhost:3006"))
    .find(cookie => cookie.name === "toktickit.sid")!.value;
  const url = new URL(process.env.LAB3_E2E_DATABASE_URL!);
  if (url.pathname !== "/toktickit_lab3_test" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || !/^lab3_test_[a-f0-9]{32}$/.test(url.searchParams.get("schema") ?? "")) {
    throw new Error("Expiry simulation requires the owned isolated test schema.");
  }
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    // Advance this session's persisted expiry only; no route interception or global clock mock.
    await db.session.update({ where: { tokenHash: createHash("sha256").update(token).digest("hex") },
      data: { expiresAt: new Date(Date.now() - 1_000) } });
  } finally { await db.$disconnect(); }
  expect((await page.request.get("http://localhost:3006/api/tickets")).status()).toBe(401);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Ticket", exact: true })).toHaveCount(0);
});
