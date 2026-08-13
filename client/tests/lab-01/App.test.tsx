import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  // Issue 4 — write these yourself. Hint: mock the api module with
  // vi.spyOn(api, "checkSystem").mockResolvedValue(...) / .mockRejectedValue(...)
  // then click the button and assert the Online list / Offline message.
  it.todo("shows Online and the seeded categories on success");
  it("shows Online when the health check succeeds", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({ online: true, categories: [] });
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Check System" }));

    expect(await screen.findByText("Online")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Check System" }));

    expect(await screen.findByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("Unable to connect to TokTickIT API")).toBeInTheDocument();
  });
});
