import { expect, it } from "vitest";
import { TicketStatus } from "@prisma/client";
import { canTransition, parseOperation } from "../../src/tickets/staff-operations.js";
const allowed = new Set([
  "NEW:OPEN", "NEW:CANCELLED", "OPEN:IN_PROGRESS", "OPEN:WAITING_FOR_REQUESTER", "OPEN:RESOLVED", "OPEN:CANCELLED",
  "IN_PROGRESS:WAITING_FOR_REQUESTER", "IN_PROGRESS:RESOLVED", "IN_PROGRESS:CANCELLED",
  "WAITING_FOR_REQUESTER:IN_PROGRESS", "WAITING_FOR_REQUESTER:RESOLVED", "WAITING_FOR_REQUESTER:CANCELLED",
  "RESOLVED:CLOSED", "RESOLVED:REOPENED", "CLOSED:REOPENED", "REOPENED:OPEN", "REOPENED:IN_PROGRESS",
  "REOPENED:WAITING_FOR_REQUESTER", "REOPENED:RESOLVED", "REOPENED:CANCELLED",
]);
for (const from of Object.values(TicketStatus)) for (const to of Object.values(TicketStatus)) {
  it(`${from} -> ${to} follows the approved matrix`, () => expect(canTransition(from, to)).toBe(allowed.has(`${from}:${to}`)));
}
it("requires exact typed bodies, versions, confirmation and public reason boundaries", () => {
  for (const body of [{ version: "1" }, { version: 0 }, { version: 1, ownerId: 2 }]) expect(() => parseOperation("claim", body)).toThrow();
  for (const reason of [undefined, "tiny", "a".repeat(1001), 12]) expect(() => parseOperation("status", { version: 1, currentStatus: "RESOLVED", confirmed: true, reason })).toThrow();
  for (const reason of ["valid", "a".repeat(1000)]) expect(() => parseOperation("status", { version: 1, currentStatus: "RESOLVED", confirmed: true, reason })).not.toThrow();
  expect(() => parseOperation("owner", { version: 1, ownerId: 2, confirmed: false })).toThrow();
  for (const itPriority of ["UNASSIGNED", ["HIGH"], null, 1]) expect(() => parseOperation("priority", { version: 1, itPriority })).toThrow();
});
