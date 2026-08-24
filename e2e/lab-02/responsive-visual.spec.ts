import { expect, test } from "@playwright/test";
import path from "node:path";

test("requester creates, finds, and opens an owned Ticket responsively", async ({
  page,
}, testInfo) => {
  const viewport = testInfo.project.name;
  await page.goto("/");
  await page.screenshot({
    path: path.join(
      "artifacts/lab-02/screenshots/create-ticket",
      viewport,
      "requester-selection.png",
    ),
    fullPage: true,
  });
  await page
    .getByRole("combobox", { name: "Development Requester", exact: true })
    .selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Create Ticket" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Create Ticket" }),
  ).toBeVisible();
  await expect(page.getByLabel("Ticket Number")).toHaveValue(
    "Generated after submission",
  );
  await expect(page.getByLabel("Ticket Date")).toHaveValue("Set when saved");
  await expect(page.getByLabel("IT Priority")).toHaveValue("Unassigned");
  await page.screenshot({
    path: path.join(
      "artifacts/lab-02/screenshots/create-ticket",
      viewport,
      "initial.png",
    ),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await expect(
    page.getByText("Summary must contain 5 to 120 characters."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(
      "artifacts/lab-02/screenshots/create-ticket",
      viewport,
      "validation.png",
    ),
    fullPage: true,
  });
  await page.getByLabel("Select files").setInputFiles({
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("invalid attachment"),
  });
  await expect(
    page.getByText(/Attachments must be JPG, PNG, WEBP, or PDF/i),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(
      "artifacts/lab-02/screenshots/create-ticket",
      viewport,
      "invalid-attachment.png",
    ),
    fullPage: true,
  });

  await page.getByLabel("Category").selectOption({ index: 1 });
  await page.getByLabel("Related System").selectOption({ index: 1 });
  const uniqueSummary = `E2E ${viewport} ticket ${Date.now()}`;
  await page.getByLabel("Summary").fill(uniqueSummary);
  await page
    .getByLabel("Description")
    .fill(
      "This ticket verifies the complete requester-owned responsive workflow.",
    );
  const createFile = `create-evidence-${viewport}.pdf`;
  await page.getByLabel("Select files").setInputFiles({
    name: createFile,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 create ticket evidence"),
  });
  await page.route("**/api/tickets", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Unable to create ticket",
        code: "INTERNAL_ERROR",
      }),
    });
  });
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await expect(
    page.getByText(/We could not create your ticket/i),
  ).toBeVisible();
  await expect(page.getByLabel("Summary")).toHaveValue(uniqueSummary);
  await page.screenshot({
    path: path.join(
      "artifacts/lab-02/screenshots/create-ticket",
      viewport,
      "api-failure.png",
    ),
    fullPage: true,
  });
  await page.unroute("**/api/tickets");

  await page.route("**/api/tickets", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await expect(
    page.getByRole("button", { name: /Creating ticket|Uploading attachment/ }),
  ).toBeDisabled();
  await page.screenshot({
    path: path.join(
      "artifacts/lab-02/screenshots/create-ticket",
      viewport,
      "submitting.png",
    ),
    fullPage: true,
  });
  const successHeading = page.getByRole("heading", {
    name: /Ticket TKT-.* has been created/,
  });
  await expect(successHeading).toBeVisible();
  const ticketNumber = (await successHeading.textContent())!.match(
    /TKT-\d{4}-\d{6}/,
  )![0];
  await expect(
    page.getByText(/1 attachment uploaded successfully/i),
  ).toBeVisible();
  await page.unroute("**/api/tickets");
  await page.screenshot({
    path: path.join(
      "artifacts/lab-02/screenshots/create-ticket",
      viewport,
      "success.png",
    ),
    fullPage: true,
  });
  await page.getByRole("button", { name: "View Ticket Detail" }).click();
  await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
  await expect(page.getByText(createFile)).toBeVisible();
  await page.getByRole("button", { name: "Back to My Tickets" }).click();
  await expect(page.getByText(ticketNumber)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(
      "artifacts/lab-02/screenshots/my-tickets",
      viewport,
      "list.png",
    ),
    fullPage: true,
  });
  await page
    .getByRole("textbox", { name: "Search" })
    .fill("no-matching-ticket-evidence");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("heading", { name: "No matching Tickets" }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(
      "artifacts/lab-02/screenshots/my-tickets",
      viewport,
      "no-results.png",
    ),
    fullPage: true,
  });
  await page
    .locator(".zen-empty-state")
    .getByRole("button", { name: "Clear filters" })
    .click();
  await expect(page.getByText(ticketNumber)).toBeVisible();
  await page
    .getByRole("button", { name: `Open ${ticketNumber}`, exact: true })
    .click();
  await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
  await expect(page.getByText(uniqueSummary)).toBeVisible();
  const detailFile = `detail-evidence-${viewport}.pdf`;
  await page.getByLabel("Add attachment").setInputFiles({
    name: detailFile,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 TokTickIT evidence"),
  });
  await expect(page.getByText(detailFile, { exact: true })).toBeVisible();
  await page
    .locator("li")
    .filter({ hasText: detailFile })
    .getByRole("button", { name: "Remove" })
    .click();
  await page
    .getByLabel("Removal reason")
    .fill("Completed responsive lifecycle verification");
  await page.getByRole("button", { name: "Remove attachment" }).click();
  await expect(page.getByText("Removed", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download" })).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(
      "artifacts/lab-02/screenshots/ticket-detail",
      viewport,
      "detail.png",
    ),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Back to My Tickets" }).click();
  await page.getByRole("button", { name: "Change Requester" }).click();
  await page
    .getByRole("combobox", { name: "Development Requester", exact: true })
    .selectOption({ index: 2 });
  await page.screenshot({
    path: path.join(
      "artifacts/lab-02/screenshots/create-ticket",
      viewport,
      "requester-switch.png",
    ),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(uniqueSummary)).toHaveCount(0);
});

test("requester selector exposes loading and safe failure evidence", async ({
  page,
}, testInfo) => {
  const viewport = testInfo.project.name;
  await page.route("**/api/development-requesters", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.goto("/");
  await expect(
    page.getByRole("status").filter({
      hasText: "Loading development requesters",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(
      "artifacts/lab-02/screenshots/create-ticket",
      viewport,
      "requester-loading.png",
    ),
    fullPage: true,
  });
  await expect(
    page.getByRole("combobox", {
      name: "Development Requester",
      exact: true,
    }),
  ).toBeEnabled();
  await page.unroute("**/api/development-requesters");

  await page.route("**/api/development-requesters", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "private backend detail" }),
    });
  });
  await page.reload();
  await expect(
    page.getByRole("alert").filter({
      hasText: "Unable to load development requesters",
    }),
  ).toBeVisible();
  await expect(page.getByText(/private backend detail/i)).toHaveCount(0);
  await page.screenshot({
    path: path.join(
      "artifacts/lab-02/screenshots/create-ticket",
      viewport,
      "requester-failure.png",
    ),
    fullPage: true,
  });
});
