import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const requester: api.DevelopmentRequester = { id: 1, displayName: "Jennifer Anderson", email: "jennifer@example.test" };

async function openCreateTicket(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await user.selectOptions(await screen.findByRole("combobox", { name: /development requester/i }), "1");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(await screen.findByRole("button", { name: "Create Ticket" }));
  await screen.findByRole("option", { name: "Hardware" });
}

async function completeForm(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByRole("combobox", { name: "Category" }), "2");
  await user.selectOptions(screen.getByRole("combobox", { name: "Related System" }), "7");
  await user.type(screen.getByRole("textbox", { name: "Summary" }), "Laptop battery drains quickly");
  await user.type(screen.getByRole("textbox", { name: "Description" }), "The battery drops from full charge to empty within one hour.");
}

describe("Create Ticket", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue([requester]);
    vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 2, name: "Hardware" }]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([{ id: 7, name: "Corporate Laptop" }]);
  });

  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it("uses the selected requester and displays the official ticket number after submission", async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(api, "createTicket").mockResolvedValue({
      id: 42, ticketNumber: "TKT-2026-000042", ticketDate: "2026-08-20T08:15:00.000Z", requester,
      category: { id: 2, name: "Hardware" }, relatedSystem: { id: 7, name: "Corporate Laptop" },
      summary: "Laptop battery drains quickly", requestedPriority: "MEDIUM", itPriority: "UNASSIGNED",
      currentStatus: "NEW", description: "The battery drops from full charge to empty within one hour.", attachments: [],
    });
    await openCreateTicket(user);
    expect(screen.getByRole("textbox", { name: "Requester" })).toHaveValue("Jennifer Anderson");
    expect(screen.getByRole("textbox", { name: "Requester" })).toHaveAttribute("readonly");
    await completeForm(user);
    await user.click(screen.getByRole("button", { name: "Submit Ticket" }));
    expect(await screen.findByText("Ticket TKT-2026-000042 has been created")).toBeInTheDocument();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ requesterId: 1, categoryId: 2, relatedSystemId: 7 }), expect.any(String));
  });

  it("shows field validation and preserves entered data after a safe API failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("internal detail"));
    await openCreateTicket(user);
    await user.click(screen.getByRole("button", { name: "Submit Ticket" }));
    expect(await screen.findByText("Summary must contain 5 to 120 characters.")).toBeInTheDocument();
    await completeForm(user);
    await user.click(screen.getByRole("button", { name: "Submit Ticket" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not create your ticket/i);
    expect(screen.getByRole("textbox", { name: "Summary" })).toHaveValue("Laptop battery drains quickly");
    expect(screen.queryByText(/internal detail/i)).not.toBeInTheDocument();
  });

  it("rejects an attachment that exceeds the client-side size limit", async () => {
    const user = userEvent.setup();
    await openCreateTicket(user);
    const tooLarge = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("Select files"), tooLarge);
    expect(await screen.findByRole("alert")).toHaveTextContent(/no larger than 5 MiB/i);
  });
});
