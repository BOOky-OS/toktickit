import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { ActionsTaken } from "../../src/ActionsTaken.js";
const actor: api.CurrentUser = { id: 2, displayName: "Staff One", email: "staff@test", role: "IT_STAFF", mustChangePassword: false };
const ticket = { id: 42, version: 1, ticketDate: "2026-01-01T00:00:00Z", currentStatus: "OPEN" } as api.TicketDetail;
const action: api.ActionTaken = { id: 7, ticketId: 42, actionAt: "2026-01-02T00:00:00Z", description: "Check network", result: "Works correctly", performedBy: actor, assignee: actor, followUpRequired: false, followUpNote: "", attachmentNotes: "", status: "PLANNED", version: 1, createdAt: "2026-01-02T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z", completedAt: null, cancelledAt: null, cancellationReason: null };
const list = (items = [action]) => ({ items, ticketVersion: 1, page: 1, pageSize: 10, totalItems: items.length, totalPages: items.length ? 1 : 0, hasPreviousPage: false, hasNextPage: false });
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.spyOn(api, "getActions").mockResolvedValue(list());
  vi.spyOn(api, "getAssignees").mockResolvedValue([actor]);
  vi.spyOn(api, "getTicket").mockResolvedValue(ticket);
  vi.spyOn(api, "writeAction").mockResolvedValue({ action, ticketVersion: 2, replayed: false });
  vi.spyOn(api, "getActionHistory").mockResolvedValue({ ...list([]), items: [] });
});
afterEach(() => { vi.restoreAllMocks(); window.history.replaceState({}, "", "/"); });
const show = (role = actor.role, value = ticket) => render(<ActionsTaken ticket={value} actor={{ ...actor, role }} onUpdate={vi.fn()} />);
it("gives Requesters read-only current actions without private history or assignee requests", async () => {
  show("REQUESTER"); await screen.findByText("Check network");
  expect(screen.queryByRole("button", { name: "Add action" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /History/ })).not.toBeInTheDocument();
  expect(api.getAssignees).not.toHaveBeenCalled();
});
it("validates conditional follow-up and preserves notes when switching to No", async () => {
  const u = userEvent.setup(); show(); await screen.findByText("Check network");
  await u.click(screen.getByRole("button", { name: "Add action" }));
  await u.type(screen.getByLabelText("Description"), "Investigate connection");
  await u.selectOptions(screen.getByLabelText("Follow-up required?"), "yes");
  await u.click(screen.getByRole("button", { name: "Save action" }));
  expect(screen.getByLabelText("Follow-up note")).toHaveAttribute("aria-invalid", "true");
  expect(api.writeAction).not.toHaveBeenCalled();
  await u.type(screen.getByLabelText("Follow-up note"), "Check tomorrow");
  await u.selectOptions(screen.getByLabelText("Follow-up required?"), "no");
  await u.click(screen.getByRole("button", { name: "Save action" }));
  await waitFor(() => expect(api.writeAction).toHaveBeenCalled());
  expect(vi.mocked(api.writeAction).mock.calls[0][3]).toMatchObject({ followUpRequired: false, followUpNote: "Check tomorrow", assigneeId: 2 });
});
it("retries an ambiguous save with the same body/key and blocks duplicate clicks", async () => {
  const u = userEvent.setup(); vi.mocked(api.writeAction).mockRejectedValueOnce(new TypeError("private transport detail"));
  show(); await screen.findByText("Check network"); await u.click(screen.getByRole("button", { name: "Edit action 7" }));
  await u.click(screen.getByRole("button", { name: "Save action" }));
  await screen.findByText(/could not confirm/);
  expect(screen.queryByText(/private transport/)).not.toBeInTheDocument();
  const first = vi.mocked(api.writeAction).mock.calls[0];
  await u.click(screen.getByRole("button", { name: "Retry same save" }));
  await waitFor(() => expect(api.writeAction).toHaveBeenCalledTimes(2));
  expect(vi.mocked(api.writeAction).mock.calls[1]).toEqual(first);
});
it("retains conflict draft and requires reload and explicit review", async () => {
  const u = userEvent.setup(); vi.mocked(api.writeAction).mockRejectedValueOnce(new api.ApiError("stale", 409, "STALE_VERSION"));
  show(); await screen.findByText("Check network"); await u.click(screen.getByRole("button", { name: "Edit action 7" }));
  await u.clear(screen.getByLabelText("Description")); await u.type(screen.getByLabelText("Description"), "My retained draft");
  await u.click(screen.getByRole("button", { name: "Save action" }));
  await u.click(await screen.findByRole("button", { name: "Reload current values" }));
  expect(screen.getByLabelText("Description")).toHaveValue("My retained draft");
  expect(screen.getByRole("button", { name: "Save action" })).toBeDisabled();
  await u.click(screen.getByLabelText("I reviewed the current values and my draft"));
  expect(screen.getByRole("button", { name: "Save action" })).toBeEnabled();
});
it("uses a named cancellation dialog and retains terminal entries", async () => {
  const u = userEvent.setup(); show(); await screen.findByText("Check network");
  await u.click(screen.getByRole("button", { name: "Cancel action 7" }));
  const dialog = screen.getByRole("dialog", { name: "Cancel action 7?" });
  await u.type(within(dialog).getByLabelText("Cancellation reason"), "No longer required");
  await u.click(within(dialog).getByRole("button", { name: "Confirm cancellation" }));
  await waitFor(() => expect(api.writeAction).toHaveBeenCalled());
  expect(vi.mocked(api.writeAction).mock.calls[0][3]).toMatchObject({ status: "CANCELLED", reason: "No longer required", confirmed: true });
});

it.each([403, 404])("clears protected content after %s and offers permitted home", async status => {
  vi.mocked(api.getActions).mockRejectedValue(new api.ApiError("private detail", status));
  show(); expect(await screen.findByRole("button", { name: "Go to my home" })).toBeInTheDocument();
  expect(screen.queryByText("Check network")).not.toBeInTheDocument(); expect(screen.queryByText("private detail")).not.toBeInTheDocument();
});
it("retries list and history failures with safe messages", async () => {
  const u = userEvent.setup(); vi.mocked(api.getActions).mockRejectedValueOnce(new Error("secret SQL")); show();
  await u.click(await screen.findByRole("button", { name: "Reload actions" })); await screen.findByText("Check network");
  vi.mocked(api.getActionHistory).mockRejectedValueOnce(new Error("private SQL"));
  await u.click(screen.getByRole("button", { name: "History of action 7" }));
  await u.click(await screen.findByRole("button", { name: "Retry action history" }));
  await screen.findByText("No revisions on this page."); expect(screen.queryByText(/SQL/)).not.toBeInTheDocument();
});
it("permits reassignment/cancellation but disables start for unavailable assignees", async () => {
  const u = userEvent.setup(); vi.mocked(api.getActions).mockResolvedValue(list([{ ...action, assignee: { id: 99, displayName: "Retired", role: "IT_STAFF" } }])); show("ADMIN");
  await screen.findByText("Check network"); expect(screen.getByRole("button", { name: "Start action 7" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel action 7" })).toBeEnabled();
  await u.click(screen.getByRole("button", { name: "Edit action 7" }));
  await u.click(screen.getByRole("button", { name: "Save action" })); expect(api.writeAction).not.toHaveBeenCalled();
  await u.selectOptions(screen.getByLabelText("Assigned to"), "2"); await u.click(screen.getByRole("button", { name: "Save action" }));
  await waitFor(() => expect(api.writeAction).toHaveBeenCalledTimes(1));
});
it("shows all terminal actions but no writes for terminal parent", async () => {
  vi.mocked(api.getActions).mockResolvedValue(list([{ ...action, status: "CANCELLED", cancelledAt: action.createdAt, cancellationReason: "Retained cancellation" }]));
  show("ADMIN", { ...ticket, currentStatus: "RESOLVED" }); await screen.findByText("Retained cancellation");
  expect(screen.queryByRole("button", { name: "Add action" })).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Edit action 7" })).not.toBeInTheDocument();
});
it("requires completion result and no follow-up and blocks two submissions in flight", async () => {
  vi.mocked(api.getActions).mockResolvedValue(list([{ ...action, status: "IN_PROGRESS", result: "", followUpRequired: true }]));
  let done!: (v: { action: api.ActionTaken; ticketVersion: number; replayed: boolean }) => void;
  vi.mocked(api.writeAction).mockImplementation(() => new Promise(resolve => { done = resolve; }));
  const u = userEvent.setup(); show(); await screen.findByText("Check network"); expect(screen.getByRole("button", { name: "Complete action 7" })).toBeDisabled();
  await u.click(screen.getByRole("button", { name: "Edit action 7" })); await u.selectOptions(screen.getByLabelText("Follow-up required?"), "no"); await u.dblClick(screen.getByRole("button", { name: "Save action" }));
  expect(api.writeAction).toHaveBeenCalledTimes(1); expect(screen.getByRole("button", { name: "Save action" })).toBeDisabled();
  done({ action, ticketVersion: 2, replayed: false }); await screen.findByText("Action saved. Current actions refreshed.");
});
it("confirms discard and retains drafts when the user declines", async () => {
  const u = userEvent.setup(), confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  show(); await screen.findByText("Check network"); await u.click(screen.getByRole("button", { name: "Add action" }));
  await u.type(screen.getByLabelText("Description"), "Unsaved work"); await u.click(screen.getByRole("button", { name: "Cancel editing" }));
  expect(screen.getByLabelText("Description")).toHaveValue("Unsaved work");
  expect(window.dispatchEvent(new Event("toktickit:before-navigate", { cancelable: true }))).toBe(false);
  confirm.mockReturnValue(true); await u.click(screen.getByRole("button", { name: "Cancel editing" })); expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
});
