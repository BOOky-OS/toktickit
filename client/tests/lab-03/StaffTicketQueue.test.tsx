import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffTicketQueue } from "../../src/StaffTicketQueue.js";
import { TicketDetail } from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";

const item: api.StaffQueueItem = { id: 42, ticketNumber: "TKT-2026-000042", summary: "Battery drains quickly", requester: { id: 1, displayName: "Requester" },
  category: { id: 2, name: "Hardware" }, relatedSystem: { id: 3, name: "Laptop" }, requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "WAITING_FOR_REQUESTER",
  ticketDate: "2026-09-01T00:00:00Z", updatedAt: "2026-09-02T00:00:00Z", owner: { id: 4, displayName: "Assigned Staff", role: "IT_STAFF" }, version: 1 };
const result: api.StaffQueueResponse = { items: [item], page: 1, pageSize: 10, totalItems: 11, totalPages: 2, hasNextPage: true, hasPreviousPage: false };
beforeEach(() => {
  vi.spyOn(api, "getCategories").mockResolvedValue([item.category]);
  vi.spyOn(api, "getRelatedSystems").mockResolvedValue([item.relatedSystem]);
  vi.spyOn(api, "getAssignees").mockResolvedValue([item.owner!]);
  vi.spyOn(api, "getStaffQueue").mockResolvedValue(result);
});
afterEach(() => vi.restoreAllMocks());
it("submits all queue controls and resets page when page size changes", async () => {
  const user = userEvent.setup();
  render(<StaffTicketQueue admin={false} onOpen={vi.fn()} onHome={vi.fn()} />);
  await screen.findByText("Showing 1-10 of 11 Tickets");
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(api.getStaffQueue).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  await user.selectOptions(screen.getByLabelText("Page size"), "25");
  expect(api.getStaffQueue).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 25 }));
  await user.type(screen.getByLabelText("Search"), "battery");
  for (const [label, value] of [["Status", "OPEN"], ["Category", "2"], ["Related System", "3"], ["Requested Priority", "MEDIUM"], ["IT Priority", "HIGH"], ["Owner", "me"], ["Sort by", "itPriority"], ["Order", "asc"]]) {
    await user.selectOptions(screen.getByLabelText(label), value);
  }
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(api.getStaffQueue).toHaveBeenLastCalledWith(expect.objectContaining({ search: "battery", currentStatus: "OPEN", categoryId: 2, relatedSystemId: 3,
    requestedPriority: "MEDIUM", itPriority: "HIGH", owner: "me", sortBy: "itPriority", sortDir: "asc", pageSize: 25, page: 1 }));
});
it("displays queue data, opens detail and labels Admin read-only", async () => {
  const user = userEvent.setup(); const onOpen = vi.fn();
  render(<StaffTicketQueue admin onOpen={onOpen} onHome={vi.fn()} />);
  await screen.findByText("Administrator read-only access");
  const table = await screen.findByRole("table");
  expect(within(table).getByText("Waiting for requester")).toBeInTheDocument();
  expect(within(table).getByText("Assigned Staff")).toBeInTheDocument();
  await user.click(within(table).getByRole("button", { name: "Open TKT-2026-000042" }));
  expect(onOpen).toHaveBeenCalledWith(42);
  expect(screen.queryByRole("button", { name: /claim|assign|create ticket/i })).not.toBeInTheDocument();
});
it("announces loading and preserves filters after failure and retry", async () => {
  const user = userEvent.setup();
  vi.mocked(api.getStaffQueue).mockRejectedValueOnce(new Error("private connection"));
  render(<StaffTicketQueue admin={false} onOpen={vi.fn()} onHome={vi.fn()} />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading Ticket Queue");
  await screen.findByRole("alert");
  expect(screen.queryByText(/private connection/)).not.toBeInTheDocument();
  await user.type(screen.getByLabelText("Search"), "keep draft");
  await user.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByRole("table");
  expect(screen.getByLabelText("Search")).toHaveValue("keep draft");
});
it("distinguishes empty and filtered no-results, and clears filters", async () => {
  const user = userEvent.setup();
  vi.mocked(api.getStaffQueue).mockResolvedValue({ ...result, items: [], totalItems: 0, totalPages: 0 });
  render(<StaffTicketQueue admin={false} onOpen={vi.fn()} onHome={vi.fn()} />);
  await screen.findByText("No Tickets yet");
  await user.type(screen.getByLabelText("Search"), "no results");
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  await screen.findByText("No matching Tickets");
  await user.click(screen.getByRole("button", { name: "Clear search and filters" }));
  expect(screen.getByLabelText("Search")).toHaveValue("");
});
it("offers a permitted home for forbidden queue access", async () => {
  const user = userEvent.setup(); const onHome = vi.fn();
  vi.mocked(api.getStaffQueue).mockRejectedValue(new api.ApiError("Forbidden", 403));
  render(<StaffTicketQueue admin={false} onOpen={vi.fn()} onHome={onHome} />);
  await screen.findByText("Queue unavailable");
  await user.click(screen.getByRole("button", { name: "Go to my home" }));
  expect(onHome).toHaveBeenCalledOnce();
});
it("shares read-only Detail without exposing Requester upload/removal controls", async () => {
  vi.spyOn(api, "getTicket").mockResolvedValue({ ...item, description: "Full immutable description", attachments: [],
    requesterResolutionIndicatedAt: null, resolvedAt: null, closedAt: null, cancelledAt: null, resolutionSummary: null, cancellationReason: null });
  vi.spyOn(api, "getAttachments").mockResolvedValue([{ id: 1, originalFilename: "evidence.pdf", mimeType: "application/pdf", sizeBytes: 42, uploadedAt: item.updatedAt, state: "ACTIVE", canDownload: true }]);
  render(<TicketDetail ticketId={42} readOnly onBack={vi.fn()} />);
  await screen.findByRole("heading", { name: item.ticketNumber });
  expect(screen.getByRole("link", { name: "Download" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Add attachment")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Back to Ticket Queue" })).toBeInTheDocument();
});
