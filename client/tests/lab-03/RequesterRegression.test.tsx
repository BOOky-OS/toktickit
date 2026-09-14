import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import { TicketDetail } from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";
import { mockAuthenticatedUser } from "./auth-test-helpers.js";

const ticket: api.TicketDetail = {
  id: 42,
  ticketNumber: "TKT-2026-000042",
  ticketDate: "2026-08-20T08:15:00.000Z",
  updatedAt: "2026-08-20T09:15:00.000Z",
  requester: { id: 1, displayName: "Jennifer Anderson" },
  owner: null,
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  summary: "Laptop battery drains quickly",
  description: "The battery drops from full charge to empty within one hour.",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  currentStatus: "NEW",
  version: 1,
  requesterResolutionIndicatedAt: null,
  resolvedAt: null,
  closedAt: null,
  cancelledAt: null,
  resolutionSummary: null,
  cancellationReason: null,
  attachments: [],
};

const list: api.TicketListResponse = {
  items: [{
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    ticketDate: ticket.ticketDate,
    updatedAt: ticket.updatedAt,
    summary: ticket.summary,
    category: ticket.category,
    relatedSystem: ticket.relatedSystem,
    requestedPriority: ticket.requestedPriority,
    itPriority: ticket.itPriority,
    currentStatus: ticket.currentStatus,
    owner: ticket.owner,
    version: ticket.version,
  }],
  page: 1,
  pageSize: 10,
  totalItems: 1,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

async function openCreate(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await screen.findByRole("heading", { name: "My Tickets" });
  await user.click(
    within(screen.getByRole("navigation", { name: "Service desk" }))
      .getByRole("button", { name: "Create Ticket" }),
  );
  await screen.findByRole("option", { name: "Hardware" });
  await user.selectOptions(screen.getByRole("combobox", { name: "Category" }), "2");
  await user.selectOptions(screen.getByRole("combobox", { name: "Related System" }), "7");
  await user.type(screen.getByRole("textbox", { name: "Summary" }), ticket.summary);
  await user.type(screen.getByRole("textbox", { name: "Description" }), ticket.description);
}

describe("Lab 3 authenticated Requester regression", () => {
  beforeEach(() => {
    mockAuthenticatedUser();
    vi.spyOn(api, "getCategories").mockResolvedValue([ticket.category]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([ticket.relatedSystem]);
    vi.spyOn(api, "getTickets").mockResolvedValue(list);
  });

  afterEach(() => vi.restoreAllMocks());

  it("retains one submission key across an uncertain retry and rotates it after an edit", async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(api, "createTicket").mockRejectedValue(new Error("network uncertain"));
    await openCreate(user);

    await user.click(screen.getByRole("button", { name: "Submit Ticket" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Submit Ticket" }));

    expect(create).toHaveBeenCalledTimes(2);
    const originalKey = create.mock.calls[0][1];
    expect(create.mock.calls[1][1]).toBe(originalKey);

    await user.type(screen.getByRole("textbox", { name: "Summary" }), " updated");
    await user.click(screen.getByRole("button", { name: "Submit Ticket" }));
    expect(create.mock.calls[2][1]).not.toBe(originalKey);
  });

  it("offers all statuses and opens a reloadable Ticket Detail URL", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getTicket").mockResolvedValue(ticket);
    vi.spyOn(api, "getAttachments").mockResolvedValue([]);
    render(<App />);

    await screen.findByText(ticket.ticketNumber);
    const status = screen.getByRole("combobox", { name: "Current Status" });
    for (const name of ["New", "Open", "In Progress", "Waiting For Requester", "Resolved", "Closed", "Reopened", "Cancelled"]) {
      expect(within(status).getByRole("option", { name })).toBeInTheDocument();
    }

    await user.click(screen.getByRole("button", { name: `Open ${ticket.ticketNumber}` }));
    await screen.findByRole("heading", { name: ticket.ticketNumber });
    expect(window.location.pathname).toBe("/tickets/42");
    expect(screen.getByText("Unassigned")).toHaveClass("zen-field--readonly");
  });

  it("retries an individual file retained after a partial Create Ticket upload", async () => {
    const user = userEvent.setup();
    const failed = new File(["%PDF-1.7"], "failed.pdf", { type: "application/pdf" });
    const saved: api.Attachment = {
      id: 9,
      originalFilename: failed.name,
      mimeType: failed.type,
      sizeBytes: failed.size,
      uploadedAt: "2026-08-20T09:16:00.000Z",
      state: "ACTIVE",
      canDownload: true,
    };
    vi.spyOn(api, "getTicket").mockResolvedValue(ticket);
    vi.spyOn(api, "getAttachments").mockResolvedValue([]);
    vi.spyOn(api, "uploadAttachment").mockResolvedValue(saved);
    const onRetryFilesChange = vi.fn();
    render(
      <TicketDetail
        ticketId={ticket.id}
        onBack={vi.fn()}
        retryFiles={[failed]}
        onRetryFilesChange={onRetryFilesChange}
      />,
    );

    await screen.findByText("Files that still need upload");
    await user.click(screen.getByRole("button", { name: "Retry upload" }));

    expect(api.uploadAttachment).toHaveBeenCalledWith(ticket.id, failed);
    expect(onRetryFilesChange).toHaveBeenCalledWith([]);
    expect(await screen.findByText(/failed\.pdf uploaded successfully/i)).toBeInTheDocument();
  });
});
