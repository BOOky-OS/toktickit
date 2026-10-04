import { expect, it } from "vitest";
import { actionId, actionPage, instant, parseAction, parseActionStatus } from "../../src/tickets/action-validation.js";
const body = { ticketVersion: 1, actionAt: "2026-09-24T10:00:00+07:00", description: "  Check connection  ", result: "", assigneeId: 2, followUpRequired: false, followUpNote: "", attachmentNotes: "" };
it("normalizes offsets and text without inventing required fields", () => {
  expect(parseAction(body)).toMatchObject({ actionAt: "2026-09-24T03:00:00.000Z", description: "Check connection" });
  for (const key of Object.keys(body)) { const copy = { ...body } as Record<string, unknown>; delete copy[key]; expect(() => parseAction(copy)).toThrow(); }
});
it.each(["2026-02-30T12:00:00Z", "2026-09-24", "2026-09-24T24:00:00Z", "2026-09-24T00:00:00", "2026-09-24T00:00:00+99:00"])("rejects invalid instant %s", value => expect(() => instant(value)).toThrow());
it("enforces text, booleans, immutable fields and exact edit shape", () => {
  for (const patch of [{ description: "four" }, { description: "x".repeat(2001) }, { result: "x".repeat(2001) }, { followUpRequired: "true" }, { followUpRequired: true, followUpNote: " " }, { attachmentNotes: "x".repeat(1001) }, { performedById: 1 }, { assigneeId: 1.5 }]) expect(() => parseAction({ ...body, ...patch })).toThrow();
  expect(parseAction({ ...body, description: "x".repeat(2000), result: "x".repeat(2000), followUpRequired: true, followUpNote: "x".repeat(1000) })).toBeTruthy();
  expect(() => parseAction(body, true)).toThrow();
  expect(parseAction({ ...body, version: 1 }, true).version).toBe(1);
});
it("rejects malformed IDs/paging and requires status confirmation and cancellation reason", () => {
  for (const id of ["01", "0", "-1", "1.1", "9007199254740992"]) expect(() => actionId(id)).toThrow();
  for (const q of [{ page: ["1", "2"] }, { pageSize: "11" }, { page: "100002" }, { unknown: "x" }]) expect(() => actionPage(q)).toThrow();
  expect(actionPage({})).toEqual({ page: 1, pageSize: 10, skip: 0 });
  for (const b of [{ status: "CANCELLED", confirmed: true }, { status: "COMPLETED", confirmed: true, reason: "wrong" }, { status: "IN_PROGRESS", confirmed: false }]) expect(() => parseActionStatus({ version: 1, ticketVersion: 1, ...b })).toThrow();
});
