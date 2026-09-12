import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test("real attachment bytes persist across reload, remain private, and become unavailable after removal", async ({ page, browser }) => {
  await signIn(page, "requester");
  await expect(page).toHaveURL(/\/my-tickets$/);
  await page.getByRole("navigation").getByRole("button", { name: "Create Ticket", exact: true }).click();
  await page.getByLabel("Category *", { exact: true }).selectOption({ label: "E2E Hardware" });
  await page.getByLabel("Related System *", { exact: true }).selectOption({ label: "E2E Laptop" });
  await page.getByLabel("Summary *", { exact: true }).fill("Attachment persistence browser regression");
  await page.getByLabel("Description *", { exact: true }).fill("Evidence of the laptop screen issue for the service desk.");
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=", "base64");
  await page.getByLabel("Select files", { exact: true }).setInputFiles({ name: "evidence.png", mimeType: "image/png", buffer: bytes });
  let failedUpload = false;
  await page.route("**/api/tickets/*/attachments", async route => {
    if (!failedUpload && route.request().method() === "POST") {
      failedUpload = true;
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Submit Ticket", exact: true }).click();
  await page.getByRole("button", { name: "View Ticket Detail", exact: true }).click();
  await expect(page).toHaveURL(/\/tickets\/\d+$/);
  const ticketPath = new URL(page.url()).pathname;
  expect(failedUpload).toBe(true);
  await expect(page.getByText("The Ticket is saved. Retry each failed file from this page.")).toBeVisible();
  await page.getByRole("button", { name: "Retry upload", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry upload", exact: true })).toHaveCount(0);
  await expect(page.getByText("evidence.png", { exact: true })).toBeVisible();
  await page.reload();
  const ticket = await (await page.request.get(`http://localhost:3006/api${ticketPath}`)).json();
  await page.goto("/my-tickets");
  await page.getByLabel("Search", { exact: true }).fill("Attachment persistence browser regression");
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await page.getByRole("button", { name: `Open ${ticket.ticketNumber}`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${ticketPath}$`));
  const download = page.getByRole("link", { name: "Download", exact: true });
  await expect(download).toBeVisible();
  const url = (await download.getAttribute("href"))!;
  const response = await page.request.get(url);
  expect(response.status()).toBe(200);
  expect(await response.body()).toEqual(bytes);
  const otherContext = await browser.newContext({ baseURL: "http://localhost:5176" });
  const other = await otherContext.newPage();
  try {
    await signIn(other, "other");
    await expect(other).toHaveURL(/\/my-tickets$/);
    expect((await other.request.get(`http://localhost:3006/api${ticketPath}`)).status()).toBe(404);
    expect((await other.request.get(url)).status()).toBe(404);
    await other.goto(ticketPath);
    await expect(other.getByText("evidence.png", { exact: true })).toHaveCount(0);
  } finally { await otherContext.close(); }
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByLabel("Removal reason", { exact: true }).fill("The evidence has been superseded.");
  await page.getByRole("button", { name: "Remove attachment", exact: true }).click();
  await expect(page.getByText("Removed", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Removed", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download", exact: true })).toHaveCount(0);
  expect((await page.request.get(url)).status()).toBe(404);
});
