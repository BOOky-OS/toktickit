import { describe, expect, it } from "vitest";
import { validateCreateTicket } from "../../src/tickets/ticket-validation.js";

const KEY = "550e8400-e29b-41d4-a716-446655440000";
const validBody = {
  requesterId: 1,
  categoryId: 2,
  relatedSystemId: 3,
  summary: "Laptop battery drains quickly",
  requestedPriority: "MEDIUM",
  description: "The battery becomes empty within one hour.",
};

describe("validateCreateTicket", () => {
  it("trims valid Summary and Description", () => {
    const result = validateCreateTicket({
      ...validBody,
      summary: "  Laptop battery drains quickly  ",
      description: "  The battery becomes empty within one hour.  ",
    }, KEY);

    expect(result).toEqual({
      ok: true,
      value: validBody,
      idempotencyKey: KEY,
    });
  });

  it.each([
    ["summary", "abcd", "Summary must contain 5 to 120 characters."],
    ["summary", "s".repeat(121), "Summary must contain 5 to 120 characters."],
    ["description", "d".repeat(19), "Description must contain 20 to 4000 characters."],
    ["description", "d".repeat(4001), "Description must contain 20 to 4000 characters."],
  ])("rejects the %s length boundary", (field, value, message) => {
    const result = validateCreateTicket({ ...validBody, [field]: value }, KEY);
    expect(result).toMatchObject({ ok: false, fieldErrors: { [field]: message } });
  });

  it("accepts inclusive Summary and Description boundaries", () => {
    expect(validateCreateTicket({
      ...validBody,
      summary: "s".repeat(5),
      description: "d".repeat(20),
    }, KEY).ok).toBe(true);
    expect(validateCreateTicket({
      ...validBody,
      summary: "s".repeat(120),
      description: "d".repeat(4000),
    }, KEY).ok).toBe(true);
  });

  it("rejects invalid IDs, priority, and Idempotency-Key together", () => {
    const result = validateCreateTicket({
      ...validBody,
      requesterId: 0,
      categoryId: 1.5,
      relatedSystemId: "3",
      requestedPriority: "URGENT",
    }, "not-a-uuid");

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        idempotencyKey: "Idempotency-Key must be a UUID.",
        requesterId: "Requester is required.",
        categoryId: "Category is required.",
        relatedSystemId: "Related System is required.",
        requestedPriority: "Requested Priority must be LOW, MEDIUM, or HIGH.",
      },
    });
  });
});
