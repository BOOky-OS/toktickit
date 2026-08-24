import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketDetail } from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";

const detail: api.TicketDetail = {
  id: 42,
  ticketNumber: "TKT-2026-000042",
  ticketDate: "2026-08-20T08:15:00.000Z",
  requester: { id: 1, displayName: "Jennifer Anderson" },
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  summary: "Laptop battery drains quickly",
  description: "The battery drops from full charge to empty within one hour.",
  requestedPriority: "MEDIUM",
  itPriority: "UNASSIGNED",
  currentStatus: "NEW",
  attachments: [],
};
const active: api.Attachment = {
  id: 9,
  originalFilename: "battery.pdf",
  mimeType: "application/pdf",
  sizeBytes: 2048,
  uploadedAt: "2026-08-20T08:16:00.000Z",
  state: "ACTIVE",
  canDownload: true,
};

describe("Ticket Detail", () => {
  beforeEach(() => {
    vi.spyOn(api, "getTicket").mockResolvedValue(detail);
    vi.spyOn(api, "getAttachments").mockResolvedValue([active]);
  });
  afterEach(() => vi.restoreAllMocks());

  it("shows owned Ticket fields read-only and soft-removes an attachment with a reason", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "removeAttachment").mockResolvedValue({
      ...active,
      state: "REMOVED",
      canDownload: false,
      removedAt: "2026-08-20T09:00:00.000Z",
      removalReason: "Contains private information",
    });
    render(<TicketDetail ticketId={42} requesterId={1} onBack={vi.fn()} />);
    expect(
      await screen.findByRole("heading", { name: "TKT-2026-000042" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Jennifer Anderson")).toHaveClass(
      "zen-field--readonly",
    );
    expect(screen.getByRole("link", { name: "Download" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove" }));
    const confirm = screen.getByRole("button", { name: "Remove attachment" });
    expect(confirm).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", { name: "Removal reason" }),
      "Contains private information",
    );
    await user.click(confirm);
    expect(await screen.findByText("Removed")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Download" }),
    ).not.toBeInTheDocument();
    expect(api.removeAttachment).toHaveBeenCalledWith(
      9,
      1,
      "Contains private information",
    );
  });

  it("uploads a permitted file and reports the uploading state", async () => {
    const user = userEvent.setup();
    const uploaded = {
      ...active,
      id: 10,
      originalFilename: "photo.png",
      mimeType: "image/png",
    };
    vi.spyOn(api, "uploadAttachment").mockResolvedValue(uploaded);
    render(<TicketDetail ticketId={42} requesterId={1} onBack={vi.fn()} />);
    await screen.findByText("battery.pdf");
    await user.upload(
      screen.getByLabelText("Add attachment"),
      new File(["image"], "photo.png", { type: "image/png" }),
    );
    expect(await screen.findByText("photo.png")).toBeInTheDocument();
    expect(api.uploadAttachment).toHaveBeenCalledWith(42, 1, expect.any(File));
    expect(screen.getByRole("status")).toHaveTextContent(
      /photo\.png uploaded successfully/i,
    );
  });

  it("disables attachment selection after five active files", async () => {
    vi.mocked(api.getAttachments).mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({
        ...active,
        id: index + 1,
        originalFilename: `file-${index + 1}.pdf`,
      })),
    );
    render(<TicketDetail ticketId={42} requesterId={1} onBack={vi.fn()} />);
    expect(
      await screen.findByLabelText("Attachment limit reached"),
    ).toBeDisabled();
    expect(screen.getByText(/5 active files/i)).toBeInTheDocument();
  });

  it("rejects an invalid selected file before calling the upload API", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const upload = vi.spyOn(api, "uploadAttachment");
    render(<TicketDetail ticketId={42} requesterId={1} onBack={vi.fn()} />);
    await screen.findByText("battery.pdf");

    await user.upload(
      screen.getByLabelText("Add attachment"),
      new File(["plain text"], "notes.txt", { type: "text/plain" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /choose a JPG, PNG, WEBP, or PDF/i,
    );
    expect(upload).not.toHaveBeenCalled();
  });

  it("reports a safe upload failure and keeps existing attachments active", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "uploadAttachment").mockRejectedValue(
      new api.TicketApiError("Unable to upload attachment.", 500),
    );
    render(<TicketDetail ticketId={42} requesterId={1} onBack={vi.fn()} />);
    await screen.findByText("battery.pdf");

    await user.upload(
      screen.getByLabelText("Add attachment"),
      new File(["%PDF-1.7"], "failed.pdf", { type: "application/pdf" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to upload attachment/i,
    );
    expect(screen.getByText("battery.pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download" })).toBeInTheDocument();
  });

  it("reports a failed removal and leaves the active download available", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "removeAttachment").mockRejectedValue(
      new Error("private failure detail"),
    );
    render(<TicketDetail ticketId={42} requesterId={1} onBack={vi.fn()} />);
    await screen.findByText("battery.pdf");
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.type(
      screen.getByRole("textbox", { name: "Removal reason" }),
      "Keep the original active file",
    );
    await user.click(screen.getByRole("button", { name: "Remove attachment" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to remove attachment/i,
    );
    expect(
      screen.queryByText(/private failure detail/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download" })).toBeInTheDocument();
    expect(
      screen.queryByText("Removed", { exact: true }),
    ).not.toBeInTheDocument();
  });

  it("shows a safe load failure and retries the owned Ticket Detail", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTicket)
      .mockRejectedValueOnce(new Error("private API detail"))
      .mockResolvedValueOnce(detail);
    render(<TicketDetail ticketId={42} requesterId={1} onBack={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to load Ticket Detail/i,
    );
    expect(screen.queryByText(/private API detail/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByRole("heading", { name: "TKT-2026-000042" }),
    ).toBeInTheDocument();
  });

  it("shows a safe unavailable state for a missing or non-owned Ticket", async () => {
    vi.mocked(api.getTicket).mockRejectedValue(
      new api.TicketApiError("not owned", 404),
    );
    render(<TicketDetail ticketId={42} requesterId={2} onBack={vi.fn()} />);
    expect(
      await screen.findByRole("heading", { name: "Ticket unavailable" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/not owned/i)).not.toBeInTheDocument();
  });
});
