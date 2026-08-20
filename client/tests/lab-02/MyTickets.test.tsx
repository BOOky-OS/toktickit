import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const requesters: api.DevelopmentRequester[] = [
  { id: 1, displayName: "Jennifer Anderson", email: "jennifer@example.test" },
  { id: 2, displayName: "Michael Brown", email: "michael@example.test" },
];
const list: api.TicketListResponse = { items: [{ id: 42, ticketNumber: "TKT-2026-000042", ticketDate: "2026-08-20T08:15:00.000Z", updatedAt: "2026-08-20T09:15:00.000Z", summary: "Laptop battery drains quickly", category: { id: 2, name: "Hardware" }, relatedSystem: { id: 7, name: "Corporate Laptop" }, requestedPriority: "MEDIUM", itPriority: "UNASSIGNED", currentStatus: "NEW" }], page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false };

async function enter(user: ReturnType<typeof userEvent.setup>, requesterId = "1") {
  render(<App />);
  await user.selectOptions(await screen.findByRole("combobox", { name: /development requester/i }), requesterId);
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

describe("My Tickets", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue(requesters);
    vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 2, name: "Hardware" }]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([{ id: 7, name: "Corporate Laptop" }]);
    vi.spyOn(api, "getTickets").mockResolvedValue(list);
  });
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it("loads the selected requester's Tickets and sends applied filters to the API", async () => {
    const user = userEvent.setup();
    const getTickets = vi.mocked(api.getTickets);
    await enter(user);
    expect(await screen.findByText("TKT-2026-000042")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Search" }), "battery");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(await screen.findByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(getTickets).toHaveBeenLastCalledWith(1, expect.objectContaining({ search: "battery", page: 1, sortBy: "updatedAt", sortDir: "desc" }));
  });

  it("shows an empty state and starts Create Ticket from the empty list", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTickets).mockResolvedValue({ ...list, items: [], totalItems: 0, totalPages: 0 });
    await enter(user);
    expect(await screen.findByText(/selected requester has no Tickets/i)).toBeInTheDocument();
    await user.click(within(screen.getByRole("navigation", { name: "Service desk" })).getByRole("button", { name: "Create Ticket" }));
    expect(await screen.findByRole("heading", { name: "Create Ticket" })).toBeInTheDocument();
  });

  it("reloads Tickets for the new requester after Change Requester", async () => {
    const user = userEvent.setup();
    const getTickets = vi.mocked(api.getTickets);
    await enter(user);
    await screen.findByText("TKT-2026-000042");
    await user.click(screen.getByRole("button", { name: "Change Requester" }));
    await user.selectOptions(await screen.findByRole("combobox", { name: /development requester/i }), "2");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("TKT-2026-000042");
    expect(getTickets).toHaveBeenLastCalledWith(2, expect.any(Object));
  });
});
