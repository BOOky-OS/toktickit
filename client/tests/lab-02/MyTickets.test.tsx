import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const requesters: api.DevelopmentRequester[] = [
  { id: 1, displayName: "Jennifer Anderson", email: "jennifer@example.test" },
  { id: 2, displayName: "Michael Brown", email: "michael@example.test" },
];
const list: api.TicketListResponse = {
  items: [
    {
      id: 42,
      ticketNumber: "TKT-2026-000042",
      ticketDate: "2026-08-20T08:15:00.000Z",
      updatedAt: "2026-08-20T09:15:00.000Z",
      summary: "Laptop battery drains quickly",
      category: { id: 2, name: "Hardware" },
      relatedSystem: { id: 7, name: "Corporate Laptop" },
      requestedPriority: "MEDIUM",
      itPriority: "UNASSIGNED",
      currentStatus: "NEW",
    },
  ],
  page: 1,
  pageSize: 10,
  totalItems: 1,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

async function enter(
  user: ReturnType<typeof userEvent.setup>,
  requesterId = "1",
) {
  render(<App />);
  await user.selectOptions(
    await screen.findByRole("combobox", { name: /development requester/i }),
    requesterId,
  );
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

describe("My Tickets", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue(requesters);
    vi.spyOn(api, "getCategories").mockResolvedValue([
      { id: 2, name: "Hardware" },
    ]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([
      { id: 7, name: "Corporate Laptop" },
    ]);
    vi.spyOn(api, "getTickets").mockResolvedValue(list);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("loads the selected requester's Tickets and sends applied filters to the API", async () => {
    const user = userEvent.setup();
    const getTickets = vi.mocked(api.getTickets);
    await enter(user);
    expect(await screen.findByText("TKT-2026-000042")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Search" }), "battery");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(
      await screen.findByText("Laptop battery drains quickly"),
    ).toBeInTheDocument();
    expect(getTickets).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({
        search: "battery",
        page: 1,
        sortBy: "updatedAt",
        sortDir: "desc",
      }),
    );
    expect(
      screen.getByRole("region", { name: "Requester tickets" }),
    ).toBeInTheDocument();
  });

  it("opens Ticket Detail from the Summary link", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getTicket").mockResolvedValue({
      id: 42,
      ticketNumber: "TKT-2026-000042",
      ticketDate: "2026-08-20T08:15:00.000Z",
      requester: { id: 1, displayName: "Jennifer Anderson" },
      category: { id: 2, name: "Hardware" },
      relatedSystem: { id: 7, name: "Corporate Laptop" },
      summary: "Laptop battery drains quickly",
      description:
        "The battery drops from full charge to empty within one hour.",
      requestedPriority: "MEDIUM",
      itPriority: "UNASSIGNED",
      currentStatus: "NEW",
      attachments: [],
    });
    vi.spyOn(api, "getAttachments").mockResolvedValue([]);

    await enter(user);
    await user.click(
      await screen.findByRole("button", {
        name: /open TKT-2026-000042: Laptop battery drains quickly/i,
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "TKT-2026-000042" }),
    ).toBeInTheDocument();
  });

  it("shows an empty state and starts Create Ticket from the empty list", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTickets).mockResolvedValue({
      ...list,
      items: [],
      totalItems: 0,
      totalPages: 0,
    });
    await enter(user);
    expect(
      await screen.findByText(/selected requester has no Tickets/i),
    ).toBeInTheDocument();
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Service desk" }),
      ).getByRole("button", { name: "Create Ticket" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Create Ticket" }),
    ).toBeInTheDocument();
  });

  it("announces the loading state while the requester list request is pending", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTickets).mockReturnValue(new Promise(() => undefined));

    await enter(user);

    expect(screen.getByRole("status")).toHaveTextContent(
      /loading your Tickets/i,
    );
  });

  it("shows loading and safely retries without losing the current requester", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTickets)
      .mockRejectedValueOnce(new Error("private API detail"))
      .mockResolvedValueOnce(list);

    await enter(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to load Tickets/i,
    );
    expect(screen.queryByText(/private API detail/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("TKT-2026-000042")).toBeInTheDocument();
    expect(api.getTickets).toHaveBeenLastCalledWith(1, expect.any(Object));
  });

  it("shows no-results and sends every selected filter and sort control", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTickets)
      .mockResolvedValueOnce(list)
      .mockResolvedValueOnce({
        ...list,
        items: [],
        totalItems: 0,
        totalPages: 0,
      });

    await enter(user);
    await screen.findByText("TKT-2026-000042");
    await user.type(screen.getByRole("textbox", { name: "Search" }), "vpn");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Category" }),
      "2",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Related System" }),
      "7",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Requested Priority" }),
      "HIGH",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Current Status" }),
      "NEW",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort by" }),
      "summary",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Order" }),
      "asc",
    );
    await user.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(
      await screen.findByRole("heading", { name: "No matching Tickets" }),
    ).toBeInTheDocument();
    expect(api.getTickets).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({
        search: "vpn",
        categoryId: 2,
        relatedSystemId: 7,
        requestedPriority: "HIGH",
        currentStatus: "NEW",
        sortBy: "summary",
        sortDir: "asc",
        page: 1,
      }),
    );
  });

  it("uses server-backed next and previous pagination controls", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTickets)
      .mockResolvedValueOnce({
        ...list,
        totalItems: 11,
        totalPages: 2,
        hasNextPage: true,
      })
      .mockResolvedValueOnce({
        ...list,
        page: 2,
        totalItems: 11,
        totalPages: 2,
        hasPreviousPage: true,
        hasNextPage: false,
      });

    await enter(user);
    const next = await screen.findByRole("button", { name: "Next" });
    expect(next).toBeEnabled();
    await user.click(next);

    expect(
      await screen.findByText("Showing 11-11 of 11 Tickets"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(api.getTickets).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({ page: 2 }),
    );
  });

  it("reloads Tickets for the new requester after Change Requester", async () => {
    const user = userEvent.setup();
    const getTickets = vi.mocked(api.getTickets);
    await enter(user);
    await screen.findByText("TKT-2026-000042");
    await user.click(screen.getByRole("button", { name: "Change Requester" }));
    await user.selectOptions(
      await screen.findByRole("combobox", { name: /development requester/i }),
      "2",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("TKT-2026-000042");
    expect(getTickets).toHaveBeenLastCalledWith(2, expect.any(Object));
  });
});
