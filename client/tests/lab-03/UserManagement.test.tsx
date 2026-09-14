import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { UserManagement } from "../../src/UserManagement.js";
const target: api.AdminUser = { id: 2, displayName: "Test User", email: "user@example.test", role: "REQUESTER", isActive: true, mustChangePassword: false, version: 1, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z" };
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.spyOn(api, "getUsers").mockResolvedValue({ items: [target], totalItems: 1 });
  vi.spyOn(api, "getAdminUser").mockResolvedValue({ ...target, version: 3 });
  vi.spyOn(api, "createUser").mockResolvedValue({ ...target, mustChangePassword: true });
  vi.spyOn(api, "editUser").mockResolvedValue({ ...target, version: 2 });
  vi.spyOn(api, "resetInitialPassword").mockResolvedValue({ ...target, mustChangePassword: true, version: 2 });
});
afterEach(() => vi.restoreAllMocks());
it("lists user fields and applies only search and role filters", async () => {
  const user = userEvent.setup(); render(<UserManagement actorId={1} />);
  await screen.findByRole("button", { name: "Edit Test User" });
  expect(screen.getByText("user@example.test")).toBeInTheDocument();
  await user.type(screen.getByLabelText("Search name or email"), "Test");
  await user.selectOptions(screen.getByLabelText("Filter by role"), "REQUESTER");
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(api.getUsers).toHaveBeenLastCalledWith("Test", "REQUESTER");
  await user.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(api.getUsers).toHaveBeenLastCalledWith(undefined, undefined);
});
it("creates a single-role user and clears the password after success", async () => {
  const user = userEvent.setup(); render(<UserManagement actorId={1} />);
  await user.click(screen.getByRole("button", { name: "Create user" }));
  await user.type(screen.getByLabelText("Display name *"), "New User");
  await user.type(screen.getByLabelText("Email *"), "new@example.test");
  await user.selectOptions(screen.getByLabelText("Role *"), "IT_STAFF");
  await user.type(screen.getByLabelText("Initial password *"), "Initial password 123!");
  await user.click(screen.getByRole("button", { name: "Save new user" }));
  expect(api.createUser).toHaveBeenCalledWith({ displayName: "New User", email: "new@example.test", role: "IT_STAFF", isActive: true, initialPassword: "Initial password 123!" });
  await screen.findByText("User saved."); expect(screen.getByLabelText("New initial password")).toHaveValue("");
});
it("retains non-password drafts on duplicate email and displays validation", async () => {
  const user = userEvent.setup(); vi.mocked(api.createUser).mockRejectedValue(new api.ApiError("duplicate", 409, "DUPLICATE_EMAIL"));
  render(<UserManagement actorId={1} />); await user.click(screen.getByRole("button", { name: "Create user" }));
  await user.click(screen.getByRole("button", { name: "Save new user" }));
  expect(api.createUser).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("Display name *"), "Retained Name");
  await user.type(screen.getByLabelText("Email *"), "duplicate@example.test");
  await user.type(screen.getByLabelText("Initial password *"), "Initial password 123!");
  await user.click(screen.getByRole("button", { name: "Save new user" }));
  await screen.findByText(/That email is already in use/);
  expect(screen.getByLabelText("Display name *")).toHaveValue("Retained Name");
  expect(screen.getByLabelText("Initial password *")).toHaveValue("");
});
it("requires explicit reset confirmation and supports cancel", async () => {
  const user = userEvent.setup(); render(<UserManagement actorId={1} />);
  await user.click(await screen.findByRole("button", { name: "Edit Test User" }));
  await user.type(screen.getByLabelText("New initial password"), "Replacement password 456!");
  await user.click(screen.getByRole("button", { name: "Set new initial password" }));
  expect(api.resetInitialPassword).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
  await user.click(screen.getByRole("button", { name: "Set new initial password" }));
  await user.click(screen.getByRole("button", { name: "Confirm reset" }));
  expect(api.resetInitialPassword).toHaveBeenCalledWith(2, 1, "Replacement password 456!");
  await screen.findByText(/Initial password replaced/); expect(screen.getByLabelText("New initial password")).toHaveValue("");
});
it("retains edit drafts on stale version and uses fresh version only after reload", async () => {
  const user = userEvent.setup(); vi.mocked(api.editUser).mockRejectedValueOnce(new api.ApiError("stale", 409, "STALE_VERSION"));
  render(<UserManagement actorId={1} />); await user.click(await screen.findByRole("button", { name: "Edit Test User" }));
  await user.clear(screen.getByLabelText("Display name *")); await user.type(screen.getByLabelText("Display name *"), "Retained edit");
  await user.click(screen.getByRole("button", { name: "Save user changes" }));
  await screen.findByText(/User changed/); expect(screen.getByRole("button", { name: "Save user changes" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Reload users" })); await screen.findByText(/Latest data loaded/);
  expect(screen.getByLabelText("Display name *")).toHaveValue("Retained edit");
  await user.click(screen.getByRole("button", { name: "Save user changes" }));
  expect(api.editUser).toHaveBeenLastCalledWith(2, expect.objectContaining({ displayName: "Retained edit", version: 3 }));
});
it("shows safety reasons, disables self-deactivation and expires the session after a self-email change", async () => {
  const user = userEvent.setup(); vi.mocked(api.editUser).mockResolvedValue({ ...target, email: "updated@example.test", version: 2 });
  const expired = vi.fn(); window.addEventListener("toktickit:session-expired", expired);
  try {
    render(<UserManagement actorId={2} />); await user.click(await screen.findByRole("button", { name: "Edit Test User" }));
    expect(screen.getByRole("checkbox", { name: "Active account" })).toBeDisabled();
    await user.clear(screen.getByLabelText("Email *")); await user.type(screen.getByLabelText("Email *"), "updated@example.test");
    await user.click(screen.getByRole("button", { name: "Save user changes" })); expect(expired).toHaveBeenCalledOnce();
  } finally { window.removeEventListener("toktickit:session-expired", expired); }
});
it("reports list failures safely and offers retry and no-results feedback", async () => {
  const user = userEvent.setup(); vi.mocked(api.getUsers).mockRejectedValueOnce(new Error("private DB path")).mockResolvedValue({ items: [], totalItems: 0 });
  render(<UserManagement actorId={1} />);
  await user.click(await screen.findByRole("button", { name: "Retry users" })); await screen.findByText("No users yet.");
  expect(screen.queryByText(/private DB path/)).not.toBeInTheDocument();
  await user.type(screen.getByLabelText("Search name or email"), "missing"); await user.click(screen.getByRole("button", { name: "Apply filters" }));
  await screen.findByText("No matching users.");
});
