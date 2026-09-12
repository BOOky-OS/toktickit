import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import * as api from "../../src/api.js";
import { TicketCommunication } from "../../src/TicketCommunication.js";
const ticket = { id: 42, currentStatus: "OPEN", version: 1, requesterResolutionIndicatedAt: null } as api.TicketDetail;
const entry: api.CommunicationEntry = { id: 1, body: "Saved message", author: { id: 4, displayName: "Staff", role: "IT_STAFF" }, createdAt: "2026-09-01T00:00:00Z" };
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.spyOn(api, "getEntries").mockResolvedValue([]);
  vi.spyOn(api, "postEntry").mockResolvedValue(entry);
  vi.spyOn(api, "getTicket").mockResolvedValue({ ...ticket, version: 2 });
  vi.spyOn(api, "indicateResolution").mockResolvedValue({ ...ticket, version: 2, requesterResolutionIndicatedAt: "2026-09-12T00:00:00Z" });
});
afterEach(() => vi.restoreAllMocks());
function Harness({ role = "IT_STAFF", initial = ticket }: { role?: api.UserRole; initial?: api.TicketDetail }) {
  const [value, setValue] = useState(initial);
  return <TicketCommunication ticket={value} role={role} onUpdate={setValue} />;
}
it("never requests or displays notes for Requester and renders public content literally", async () => {
  vi.mocked(api.getEntries).mockResolvedValue([{ ...entry, body: "<script>literal</script>\nsecond line" }]);
  render(<Harness role="REQUESTER" />);
  expect(await screen.findByText(/<script>literal/)).toBeInTheDocument();
  expect(api.getEntries).toHaveBeenCalledWith(42, "comments");
  expect(api.getEntries).not.toHaveBeenCalledWith(42, "notes");
  expect(screen.queryByText("Internal Notes")).not.toBeInTheDocument();
});
it("maintains independent public/internal drafts and clears only the posted stream", async () => {
  const user = userEvent.setup(); render(<Harness />); await screen.findByText("No internal notes yet.");
  await user.type(screen.getByLabelText("Public comment"), "Public draft");
  await user.type(screen.getByLabelText("Internal note"), "Private draft");
  await user.click(screen.getByRole("button", { name: "Post public comment" }));
  expect(api.postEntry).toHaveBeenCalledWith(42, "comments", "Public draft");
  expect(screen.getByLabelText("Public comment")).toHaveValue("");
  expect(screen.getByLabelText("Internal note")).toHaveValue("Private draft");
  await user.click(screen.getByRole("button", { name: "Post internal note" }));
  expect(api.postEntry).toHaveBeenLastCalledWith(42, "notes", "Private draft");
});
it("keeps Admin read-only and disables posting in terminal states", async () => {
  const { unmount } = render(<Harness role="ADMIN" />); await screen.findByText("No internal notes yet.");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Problem Appears Resolved" })).not.toBeInTheDocument();
  unmount(); render(<Harness initial={{ ...ticket, currentStatus: "CLOSED" }} />);
  expect(screen.getByRole("button", { name: "Post public comment" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Post internal note" })).toBeDisabled();
});
it("retains ambiguous failure drafts and requires stream reload before manual retry", async () => {
  const user = userEvent.setup(); vi.mocked(api.postEntry).mockRejectedValueOnce(new TypeError("private network path"));
  render(<Harness role="REQUESTER" />); await screen.findByText("No public comments yet.");
  await user.type(screen.getByLabelText("Public comment"), "Retained draft");
  await user.click(screen.getByRole("button", { name: "Post public comment" }));
  await screen.findByText(/message may have been saved/);
  expect(screen.getByRole("button", { name: "Post public comment" })).toBeDisabled();
  expect(screen.getByLabelText("Public comment")).toHaveValue("Retained draft");
  expect(screen.queryByText(/private network path/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Reload Public Comments" }));
  await screen.findByText(/Latest entries loaded/);
  expect(api.postEntry).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Post public comment" }));
  expect(api.postEntry).toHaveBeenCalledTimes(2);
});
it("validates whitespace locally and exposes safe load retry", async () => {
  const user = userEvent.setup(); vi.mocked(api.getEntries).mockRejectedValueOnce(new Error("private db failure"));
  render(<Harness role="REQUESTER" />);
  await user.click(await screen.findByRole("button", { name: "Retry Public Comments" }));
  await screen.findByText("No public comments yet.");
  await user.type(screen.getByLabelText("Public comment"), "   ");
  await user.click(screen.getByRole("button", { name: "Post public comment" }));
  expect(api.postEntry).not.toHaveBeenCalled();
  expect(screen.getByText("Enter 1–2000 characters.")).toBeInTheDocument();
});
it("requires confirmation for resolution indication and uses the current version", async () => {
  const user = userEvent.setup(); render(<Harness role="REQUESTER" />);
  const button = screen.getByRole("button", { name: "Problem Appears Resolved" });
  await user.click(button); expect(api.indicateResolution).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
  expect(button).toHaveFocus();
  await user.click(button); await user.click(screen.getByRole("button", { name: "Confirm indication" }));
  expect(api.indicateResolution).toHaveBeenCalledWith(42, 1);
  expect(await screen.findByText("Your resolution indication has been recorded.")).toBeInTheDocument();
});
it("requires reload on stale indication and blocks ineligible statuses", async () => {
  const user = userEvent.setup(); vi.mocked(api.indicateResolution).mockRejectedValueOnce(new api.ApiError("stale", 409, "STALE_VERSION"));
  const { unmount } = render(<Harness role="REQUESTER" />);
  await user.click(screen.getByRole("button", { name: "Problem Appears Resolved" }));
  await user.click(screen.getByRole("button", { name: "Confirm indication" }));
  await screen.findByText(/Ticket may have changed/);
  expect(screen.getByRole("button", { name: "Problem Appears Resolved" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Reload Ticket" }));
  await screen.findByText(/Latest Ticket loaded/);
  await user.click(screen.getByRole("button", { name: "Problem Appears Resolved" }));
  await user.click(screen.getByRole("button", { name: "Confirm indication" }));
  expect(api.indicateResolution).toHaveBeenLastCalledWith(42, 2);
  unmount(); render(<Harness role="REQUESTER" initial={{ ...ticket, currentStatus: "RESOLVED" }} />);
  expect(screen.getByRole("button", { name: "Problem Appears Resolved" })).toBeDisabled();
});
