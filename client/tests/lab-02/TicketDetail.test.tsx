import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketDetail } from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";

const detail: api.TicketDetail = { id: 42, ticketNumber: "TKT-2026-000042", ticketDate: "2026-08-20T08:15:00.000Z", requester: { id: 1, displayName: "Jennifer Anderson" }, category: { id: 2, name: "Hardware" }, relatedSystem: { id: 7, name: "Corporate Laptop" }, summary: "Laptop battery drains quickly", description: "The battery drops from full charge to empty within one hour.", requestedPriority: "MEDIUM", itPriority: "UNASSIGNED", currentStatus: "NEW", attachments: [] };
const active: api.Attachment = { id: 9, originalFilename: "battery.pdf", mimeType: "application/pdf", sizeBytes: 2048, uploadedAt: "2026-08-20T08:16:00.000Z", state: "ACTIVE", canDownload: true };

describe("Ticket Detail", () => {
  beforeEach(() => { vi.spyOn(api, "getTicket").mockResolvedValue(detail); vi.spyOn(api, "getAttachments").mockResolvedValue([active]); });
  afterEach(() => vi.restoreAllMocks());

  it("shows owned Ticket fields read-only and soft-removes an attachment with a reason", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "removeAttachment").mockResolvedValue({ ...active, state: "REMOVED", canDownload: false, removedAt: "2026-08-20T09:00:00.000Z", removalReason: "Contains private information" });
    render(<TicketDetail ticketId={42} requesterId={1} onBack={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "TKT-2026-000042" })).toBeInTheDocument();
    expect(screen.getByText("Jennifer Anderson")).toHaveClass("zen-field--readonly");
    expect(screen.getByRole("link", { name: "Download" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove" }));
    const confirm = screen.getByRole("button", { name: "Remove attachment" });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Removal reason" }), "Contains private information");
    await user.click(confirm);
    expect(await screen.findByText("Removed")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Download" })).not.toBeInTheDocument();
    expect(api.removeAttachment).toHaveBeenCalledWith(9, 1, "Contains private information");
  });

  it("uploads a permitted file and reports the uploading state", async () => {
    const user = userEvent.setup();
    const uploaded = { ...active, id: 10, originalFilename: "photo.png", mimeType: "image/png" };
    vi.spyOn(api, "uploadAttachment").mockResolvedValue(uploaded);
    render(<TicketDetail ticketId={42} requesterId={1} onBack={vi.fn()} />);
    await screen.findByText("battery.pdf");
    await user.upload(screen.getByLabelText("Add attachment"), new File(["image"], "photo.png", { type: "image/png" }));
    expect(await screen.findByText("photo.png")).toBeInTheDocument();
    expect(api.uploadAttachment).toHaveBeenCalledWith(42, 1, expect.any(File));
  });

  it("shows a safe unavailable state for a missing or non-owned Ticket", async () => {
    vi.mocked(api.getTicket).mockRejectedValue(new api.TicketApiError("not owned", 404));
    render(<TicketDetail ticketId={42} requesterId={2} onBack={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "Ticket unavailable" })).toBeInTheDocument();
    expect(screen.queryByText(/not owned/i)).not.toBeInTheDocument();
  });
});
