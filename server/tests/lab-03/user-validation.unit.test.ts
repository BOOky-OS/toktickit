import { expect, it } from "vitest";
import { userFields, userQuery } from "../../src/auth/user-management.js";
const valid = { displayName: " Alice ", email: " Alice@Example.TEST ", role: "REQUESTER", isActive: true };
it("normalizes display name/email and preserves typed role/state", () => {
  expect(userFields(valid)).toEqual({ displayName: "Alice", email: "alice@example.test", role: "REQUESTER", isActive: true });
});
it("validates inclusive name/email boundaries and types", () => {
  for (const displayName of ["ab", "a".repeat(120)]) expect(() => userFields({ ...valid, displayName })).not.toThrow();
  for (const displayName of ["a", "a".repeat(121), 12, null]) expect(() => userFields({ ...valid, displayName })).toThrow();
  for (const email of ["a@b.c", "a".repeat(250) + "@b.c"]) expect(() => userFields({ ...valid, email })).not.toThrow();
  for (const email of ["a".repeat(251) + "@b.c", "a@@b.c", "a@.b.c", "a@b.", "a@b", "a b@c.d", null]) expect(() => userFields({ ...valid, email })).toThrow();
  for (const role of ["UNKNOWN", ["ADMIN"], null]) expect(() => userFields({ ...valid, role })).toThrow();
  expect(() => userFields({ ...valid, isActive: "true" })).toThrow();
});
it("allows only one optional search and role filter", () => {
  expect(userQuery({ search: " Alice ", role: "ADMIN" })).toEqual({ search: "Alice", role: "ADMIN" });
  for (const query of [{ page: "1" }, { search: ["a", "b"] }, { search: " " }, { search: "a".repeat(121) }, { role: "admin" }]) expect(() => userQuery(query)).toThrow();
});
