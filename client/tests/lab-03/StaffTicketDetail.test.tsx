import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import * as api from "../../src/api.js";
import { StaffOperations } from "../../src/StaffOperations.js";

const ticket = {
  id: 42, ticketNumber: "TKT-2026-000042", currentStatus: "OPEN", itPriority: "LOW", requestedPriority: "MEDIUM",
  owner: { id: 4, displayName: "Assigned Staff", role: "IT_STAFF" }, version: 1,
} as api.TicketDetail;
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.spyOn(api, "getAssignees").mockResolvedValue([ticket.owner!, { id: 5, displayName: "Administrator", role: "ADMIN" }]);
  vi.spyOn(api, "getStatusHistory").mockResolvedValue([]);
  vi.spyOn(api, "mutateStaffTicket").mockResolvedValue({ ...ticket, version: 2 });
  vi.spyOn(api, "getTicket").mockResolvedValue({ ...ticket, version: 3 });
});
afterEach(() => vi.restoreAllMocks());
function Harness({ initial = ticket, editable = true }: { initial?: api.TicketDetail; editable?: boolean }) {
  const [value, setValue] = useState(initial);
  return <StaffOperations ticket={value} editable={editable} onUpdate={setValue} />;
}
it("shows read-only Admin history without operational controls", async () => {
  vi.mocked(api.getStatusHistory).mockResolvedValue([{ id: 1, fromStatus: "NEW", toStatus: "OPEN", reason: "<script>literal text</script>", author: ticket.owner!, createdAt: "2026-09-01T00:00:00Z" }]);
  render(<Harness editable={false} />);
  expect(await screen.findByText("<script>literal text</script>")).toBeInTheDocument();
  expect(screen.queryByLabelText("Assigned owner")).not.toBeInTheDocument();
  expect(api.getAssignees).not.toHaveBeenCalled();
});
it("claims unassigned Tickets and saves only IT Priority with the current version", async () => {
  const user = userEvent.setup(); render(<Harness initial={{ ...ticket, owner: null }} />);
  await user.click(screen.getByRole("button", { name: "Claim Ticket" }));
  expect(api.mutateStaffTicket).toHaveBeenLastCalledWith(42, "claim", { version: 1 });
  await screen.findByText("Ticket updated.");
  await user.selectOptions(screen.getByLabelText("Set IT Priority"), "HIGH");
  await user.click(screen.getByRole("button", { name: "Save IT Priority" }));
  expect(api.mutateStaffTicket).toHaveBeenLastCalledWith(42, "priority", { version: 2, itPriority: "HIGH" });
});
it("requires explicit owner confirmation, supports cancel, and returns focus", async () => {
  const user = userEvent.setup(); render(<Harness />);
  await screen.findByRole("option", { name: "Administrator (Admin)" });
  await user.selectOptions(screen.getByLabelText("Assigned owner"), "5");
  const button = screen.getByRole("button", { name: "Reassign owner" });
  await user.click(button); expect(api.mutateStaffTicket).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
  expect(button).toHaveFocus();
  await user.click(button);
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm change" }));
  expect(api.mutateStaffTicket).toHaveBeenCalledWith(42, "owner", { version: 1, ownerId: 5, confirmed: true });
});
it("requires a public reason for resolution and sends a confirmed trimmed reason", async () => {
  const user = userEvent.setup(); render(<Harness />);
  await screen.findByRole("option", { name: "Assigned Staff (IT Staff)" });
  await user.selectOptions(screen.getByLabelText("Next status"), "RESOLVED");
  await user.click(screen.getByRole("button", { name: "Change status" }));
  expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm change" })).toBeDisabled();
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
  await user.type(screen.getByLabelText("Public status reason (required)"), "  Replaced the battery  ");
  await user.click(screen.getByRole("button", { name: "Change status" }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm change" }));
  expect(api.mutateStaffTicket).toHaveBeenCalledWith(42, "status", { version: 1, currentStatus: "RESOLVED", confirmed: true, reason: "Replaced the battery" });
});
it("retains conflict drafts and blocks resubmission until explicit reload", async () => {
  const user = userEvent.setup();
  vi.mocked(api.mutateStaffTicket).mockRejectedValueOnce(new api.ApiError("Conflict", 409, "STALE_VERSION"));
  render(<Harness />); await screen.findByRole("option", { name: "Assigned Staff (IT Staff)" });
  await user.type(screen.getByLabelText("Public status reason (optional)"), "Retained draft");
  await user.selectOptions(screen.getByLabelText("Set IT Priority"), "HIGH");
  await user.click(screen.getByRole("button", { name: "Save IT Priority" }));
  await screen.findByText(/Ticket may have changed/);
  expect(screen.getByRole("button", { name: "Save IT Priority" })).toBeDisabled();
  expect(screen.getByLabelText("Public status reason (optional)")).toHaveValue("Retained draft");
  await user.click(screen.getByRole("button", { name: "Reload Ticket" }));
  await screen.findByText(/Latest Ticket loaded/);
  expect(screen.getByLabelText("Set IT Priority")).toHaveValue("HIGH");
  await user.click(screen.getByRole("button", { name: "Save IT Priority" }));
  expect(api.mutateStaffTicket).toHaveBeenLastCalledWith(42, "priority", { version: 3, itPriority: "HIGH" });
});
it("disables terminal edits, allows Closed to Reopened and enforces owner prerequisites", async () => {
  const user = userEvent.setup(); const { unmount } = render(<Harness initial={{ ...ticket, currentStatus: "CLOSED" }} />);
  expect(screen.getByRole("button", { name: "Save IT Priority" })).toBeDisabled();
  await user.selectOptions(screen.getByLabelText("Next status"), "REOPENED");
  expect(screen.getByRole("button", { name: "Change status" })).toBeEnabled();
  unmount(); render(<Harness initial={{ ...ticket, owner: null }} />);
  await user.selectOptions(screen.getByLabelText("Next status"), "IN_PROGRESS");
  expect(screen.getByRole("button", { name: "Change status" })).toBeDisabled();
  expect(screen.getByText(/Assign an active eligible owner/)).toBeInTheDocument();
});
it("shows safe history failures and retries without exposing internal errors", async () => {
  const user = userEvent.setup(); vi.mocked(api.getStatusHistory).mockRejectedValueOnce(new Error("private connection failure"));
  render(<Harness editable={false} />);
  await screen.findByRole("alert"); expect(screen.queryByText(/private connection/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Retry history" }));
  expect(await screen.findByText("No status changes yet.")).toBeInTheDocument();
});
