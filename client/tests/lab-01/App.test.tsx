import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue([
      { id: 1, displayName: "Jennifer Anderson", email: "jennifer.anderson@example.test" },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  async function enterServiceDesk(user: ReturnType<typeof userEvent.setup>) {
    const select = await screen.findByRole("combobox", { name: /development requester/i });
    await user.selectOptions(select, "1");
    await user.click(screen.getByRole("button", { name: "Continue" }));
  }

  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("shows Online and the seeded categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });
    const user = userEvent.setup();

    render(<App />);
    await enterServiceDesk(user);
    await user.click(screen.getByRole("button", { name: "Check System" }));

    expect(await screen.findByText("Online")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Supported Request Categories" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
  });

  it("shows Loading while the system request is pending", async () => {
    let resolveRequest!: (value: api.SystemStatus) => void;
    const pendingRequest = new Promise<api.SystemStatus>((resolve) => {
      resolveRequest = resolve;
    });
    vi.spyOn(api, "checkSystem").mockReturnValue(pendingRequest);
    const user = userEvent.setup();

    render(<App />);
    await enterServiceDesk(user);
    await user.click(screen.getByRole("button", { name: "Check System" }));

    expect(screen.getByRole("button", { name: /Loading/ })).toBeDisabled();
    resolveRequest({ online: true, categories: [] });
    expect(await screen.findByText("Online")).toBeInTheDocument();
  });

  it("shows Online when the health check succeeds", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({ online: true, categories: [] });
    const user = userEvent.setup();

    render(<App />);
    await enterServiceDesk(user);
    await user.click(screen.getByRole("button", { name: "Check System" }));

    expect(await screen.findByText("Online")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<App />);
    await enterServiceDesk(user);
    await user.click(screen.getByRole("button", { name: "Check System" }));

    expect(await screen.findByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("Unable to connect to TokTickIT API")).toBeInTheDocument();
  });
});
