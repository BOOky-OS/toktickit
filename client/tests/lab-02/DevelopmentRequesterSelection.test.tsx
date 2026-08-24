import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const ACTIVE_REQUESTERS: api.DevelopmentRequester[] = [
  {
    id: 1,
    displayName: "Jennifer Anderson",
    email: "jennifer.anderson@example.test",
  },
  { id: 2, displayName: "Michael Brown", email: "michael.brown@example.test" },
];

describe("Development Requester Selection", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue(
      ACTIVE_REQUESTERS,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("explains the testing-only context and continues with an active requester", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.getByRole("link", { name: "Skip to main content" }),
    ).toHaveAttribute("href", "#main-content");
    expect(document.getElementById("main-content")).toBeInTheDocument();
    expect(screen.getByText(/not a login screen/i)).toBeInTheDocument();
    const requesterSelect = await screen.findByRole("combobox", {
      name: /development requester/i,
    });
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getAllByRole("option")).toHaveLength(3);

    await user.selectOptions(requesterSelect, "1");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText(/current requester/i)).toBeInTheDocument();
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(localStorage.getItem("toktickit.developmentRequesterId")).toBe("1");
  });

  it("shows an accessible loading state while requesters are loading", () => {
    vi.mocked(api.getDevelopmentRequesters).mockReturnValue(
      new Promise(() => undefined),
    );

    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent(
      /loading development requesters/i,
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("shows a distinct empty state when no active requesters exist", async () => {
    vi.mocked(api.getDevelopmentRequesters).mockResolvedValue([]);

    render(<App />);

    expect(
      await screen.findByText(
        /no active development requesters are available/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows a safe failure state and retries loading", async () => {
    vi.mocked(api.getDevelopmentRequesters)
      .mockRejectedValueOnce(new Error("internal API detail"))
      .mockResolvedValueOnce(ACTIVE_REQUESTERS);
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to load development requesters/i,
    );
    expect(screen.queryByText(/internal API detail/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByRole("combobox", { name: /development requester/i }),
    ).toBeInTheDocument();
    expect(api.getDevelopmentRequesters).toHaveBeenCalledTimes(2);
  });

  it("restores a retained active requester after validating it with the API", async () => {
    localStorage.setItem("toktickit.developmentRequesterId", "2");

    render(<App />);

    expect(await screen.findByText(/current requester/i)).toBeInTheDocument();
    expect(screen.getByText("Michael Brown")).toBeInTheDocument();
  });

  it("reloads requester data and updates context when the requester changes", async () => {
    localStorage.setItem("toktickit.developmentRequesterId", "1");
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Change Requester" }));

    const requesterSelect = await screen.findByRole("combobox", {
      name: /development requester/i,
    });
    await user.selectOptions(requesterSelect, "2");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Michael Brown")).toBeInTheDocument();
    expect(localStorage.getItem("toktickit.developmentRequesterId")).toBe("2");
    expect(api.getDevelopmentRequesters).toHaveBeenCalledTimes(2);
  });
});
