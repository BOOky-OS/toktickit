import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { mockAuthenticatedUser, requesterUser } from "./auth-test-helpers.js";

function authError(status: number, code: string, message = "Safe error", fields: Record<string, string> = {}, retry?: number) {
  return new api.ApiError(message, status, code, fields, retry);
}
describe("Lab 3 authentication UI and role shell", () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, "", "/login");
  });
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });
  it("clears the legacy identity and shows labelled loading without private UI", async () => {
    localStorage.setItem("toktickit.developmentRequesterId", "99");
    vi.spyOn(api, "getCurrentUser").mockReturnValue(new Promise(() => undefined));
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent(/loading your secure workspace/i);
    expect(screen.queryByText(/private requester/i)).not.toBeInTheDocument();
    expect(localStorage.getItem("toktickit.developmentRequesterId")).toBeNull();
  });
  it("shows Login after unauthenticated boot with no development selector", async () => {
    window.history.replaceState({}, "", "/");
    vi.spyOn(api, "getCurrentUser").mockRejectedValue(authError(401, "AUTH_REQUIRED"));
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email *")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password *")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.queryByText(/development requester/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/session has expired/i)).not.toBeInTheDocument();
  });
  it("validates fields, permits paste/show and prevents duplicate submits while busy", async () => {
    vi.spyOn(api, "getCurrentUser").mockRejectedValue(authError(401, "AUTH_REQUIRED"));
    let resolve!: (user: api.CurrentUser) => void;
    const login = vi.spyOn(api, "login").mockReturnValue(new Promise(r => { resolve = r; }));
    const user = userEvent.setup(); render(<App />);
    await user.click(await screen.findByRole("button", { name: "Sign in" }));
    expect(screen.getByText(/correct the highlighted fields/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email *"), "jennifer@example.test");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password *")).toHaveAttribute("type", "text");
    await user.click(screen.getByLabelText("Password *")); await user.paste("Initial Password 123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /signing in/i })); expect(login).toHaveBeenCalledOnce();
    resolve(requesterUser);
    expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
  });
  it.each([
    [authError(401, "INVALID_CREDENTIALS"), /check your credentials/i],
    [authError(429, "RATE_LIMITED", "limited", {}, 42), /42 seconds/i],
    [new Error("network secret"), /could not reach TokTickIT/i],
  ])("keeps email, clears password and renders a safe server failure", async (failure, expected) => {
    vi.spyOn(api, "getCurrentUser").mockRejectedValue(authError(401, "AUTH_REQUIRED"));
    vi.spyOn(api, "login").mockRejectedValue(failure);
    const user = userEvent.setup(); render(<App />);
    await user.type(await screen.findByLabelText("Email *"), "jennifer@example.test");
    await user.type(screen.getByLabelText("Password *"), "Wrong Password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(expected);
    expect(screen.getByLabelText("Email *")).toHaveValue("jennifer@example.test");
    expect(screen.getByLabelText("Password *")).toHaveValue("");
    expect(document.body).not.toHaveTextContent("network secret");
  });
  it("supports keyboard-only Login navigation and submission", async () => {
    vi.spyOn(api, "getCurrentUser").mockRejectedValue(authError(401, "AUTH_REQUIRED"));
    vi.spyOn(api, "login").mockResolvedValue(requesterUser);
    const user = userEvent.setup(); render(<App />);
    const email = await screen.findByLabelText("Email *");
    await user.tab(); expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveFocus();
    await user.tab(); expect(email).toHaveFocus(); await user.keyboard("jennifer@example.test");
    await user.tab(); expect(screen.getByLabelText("Password *")).toHaveFocus(); await user.keyboard("Initial Password 123");
    await user.tab(); expect(screen.getByRole("button", { name: "Show password" })).toHaveFocus(); await user.keyboard("{Enter}");
    expect(screen.getByLabelText("Password *")).toHaveAttribute("type", "text");
    await user.tab(); expect(screen.getByRole("button", { name: "Sign in" })).toHaveFocus(); await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
  });
  it("allows logout from the mandatory password screen without exposing normal navigation", async () => {
    mockAuthenticatedUser({ ...requesterUser, mustChangePassword: true });
    vi.spyOn(api, "logout").mockResolvedValue();
    const user = userEvent.setup(); render(<App />);
    expect(await screen.findByRole("heading", { name: /create your new password/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Logout" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });  it("forces password replacement with no Cancel and enforces boundaries/match/difference", async () => {
    mockAuthenticatedUser({ ...requesterUser, mustChangePassword: true });
    window.history.replaceState({}, "", "/my-tickets");
    const user = userEvent.setup(); render(<App />);
    expect(await screen.findByRole("heading", { name: /create your new password/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/change-password"); expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Current password *"), "Same Password 123");
    await user.type(screen.getByLabelText("New password *"), "Same Password 123");
    await user.type(screen.getByLabelText("Confirm new password *"), "mismatch");
    await user.click(screen.getByRole("button", { name: "Save new password" }));
    expect(screen.getByText(/different from your current/i)).toBeInTheDocument();
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });
  it("completes mandatory replacement and routes to role home", async () => {
    const initial = { ...requesterUser, mustChangePassword: true };
    mockAuthenticatedUser(initial); const replace = vi.spyOn(api, "changePassword").mockResolvedValue(requesterUser);
    const user = userEvent.setup(); render(<App />);
    await user.type(await screen.findByLabelText("Current password *"), "Initial Password 123");
    await user.type(screen.getByLabelText("New password *"), "Replacement Password 456");
    await user.type(screen.getByLabelText("Confirm new password *"), "Replacement Password 456");
    await user.click(screen.getByRole("button", { name: "Save new password" }));
    expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/my-tickets"); expect(replace).toHaveBeenCalledWith("Initial Password 123", "Replacement Password 456", "Replacement Password 456");
  });
  it.each([
    ["REQUESTER", "/my-tickets", ["My Tickets", "Create Ticket"]],
    ["IT_STAFF", "/staff/tickets", ["Ticket Queue"]],
    ["ADMIN", "/admin/users", ["Users", "Ticket Queue (read-only)"]],
  ] as const)("renders %s identity and permitted navigation", async (role, home, links) => {
    const current = { ...requesterUser, role, displayName: role };
    mockAuthenticatedUser(current); if (role === "REQUESTER") vi.spyOn(api, "getTickets").mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false });
    render(<App />); expect(await screen.findByText(role, { selector: "strong" })).toBeInTheDocument(); expect(window.location.pathname).toBe(home);
    for (const link of links) expect(screen.getAllByRole("button", { name: link }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/change requester/i)).not.toBeInTheDocument();
  });
  it("keeps the role shell and Logout available for voluntary password changes", async () => {
    mockAuthenticatedUser(); vi.spyOn(api, "getTickets").mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false });
    const user = userEvent.setup(); render(<App />); await screen.findByRole("heading", { name: "My Tickets" });
    await user.click(screen.getByRole("button", { name: "Change Password" }));
    expect(await screen.findByRole("heading", { name: "Change password" })).toBeInTheDocument();
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });  it("shows forbidden feedback for direct wrong-role paths and supports browser navigation", async () => {
    mockAuthenticatedUser(); window.history.replaceState({}, "", "/admin/users"); render(<App />);
    expect(await screen.findByRole("heading", { name: /not available for your role/i })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Go to my home" }));
    expect(window.location.pathname).toBe("/my-tickets");
  });
  it("does not claim logout success after failure and clears protected content after success", async () => {
    mockAuthenticatedUser(); vi.spyOn(api, "getTickets").mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false });
    const logout = vi.spyOn(api, "logout").mockRejectedValueOnce(new Error("server secret")).mockResolvedValueOnce();
    const user = userEvent.setup(); render(<App />); await screen.findByRole("heading", { name: "My Tickets" });
    await user.click(screen.getByRole("button", { name: "Logout" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/may still be active/i); expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText("Jennifer Anderson")).not.toBeInTheDocument(); expect(logout).toHaveBeenCalledTimes(2);
  });
  it("moves to Login and clears protected content on session expiry event", async () => {
    mockAuthenticatedUser(); vi.spyOn(api, "getTickets").mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false });
    render(<App />); await screen.findByText("Jennifer Anderson");
    window.dispatchEvent(new Event("toktickit:session-expired"));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/session has expired/i); expect(window.location.pathname).toBe("/login");
  });
  it("shows safe reload failure and retries without displaying private UI", async () => {
    vi.spyOn(api, "getCurrentUser").mockRejectedValueOnce(new Error("database secret")).mockResolvedValueOnce(requesterUser);
    vi.spyOn(api, "getCsrf").mockResolvedValue("csrf"); vi.spyOn(api, "getTickets").mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false });
    render(<App />); expect(await screen.findByRole("heading", { name: /unable to check/i })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("database secret"); await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(window.location.pathname).toBe("/my-tickets"));
  });
});
