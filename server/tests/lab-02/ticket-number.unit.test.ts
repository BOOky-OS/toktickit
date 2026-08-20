import { describe, expect, it } from "vitest";
import { formatTicketNumber } from "../../src/tickets/ticket-number.js";

describe("formatTicketNumber", () => {
  it("formats the database sequence as TKT-YYYY-NNNNNN", () => {
    expect(formatTicketNumber(42n, new Date("2026-08-20T08:15:00.000Z")))
      .toBe("TKT-2026-000042");
  });

  it("keeps different sequence values unique", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    expect(formatTicketNumber(1n, date)).not.toBe(formatTicketNumber(2n, date));
  });

  it("rejects a non-positive database sequence", () => {
    expect(() => formatTicketNumber(0n, new Date())).toThrow("positive");
  });
});
