import { describe, expect, it } from "vitest";
import { permittedRoles } from "../../src/auth/security.js";

describe("Lab 3 boundaries with approved Lab 4 Admin extensions", () => {
  it.each([
    ["GET", "/staff/tickets", ["IT_STAFF", "ADMIN"]],
    ["POST", "/staff/tickets/1/claim", ["IT_STAFF", "ADMIN"]],
    ["PATCH", "/staff/tickets/1/priority", ["IT_STAFF", "ADMIN"]],
    ["GET", "/tickets/1/notes", ["IT_STAFF", "ADMIN"]],
    ["POST", "/tickets/1/notes", ["IT_STAFF", "ADMIN"]],
    ["GET", "/tickets/1/comments", ["REQUESTER", "IT_STAFF", "ADMIN"]],
    ["POST", "/tickets/1/comments", ["REQUESTER", "IT_STAFF", "ADMIN"]],
    ["POST", "/tickets/1/resolution-indication", ["REQUESTER"]],
    ["POST", "/tickets", ["REQUESTER"]],
    ["POST", "/tickets/1/attachments", ["REQUESTER"]],
    ["DELETE", "/attachments/1", ["REQUESTER"]],
    ["GET", "/admin/users", ["ADMIN"]],
    ["POST", "/admin/users", ["ADMIN"]],
  ] as const)("%s %s permits only the agreed roles", (method, path, roles) => {
    expect(permittedRoles(method, path)).toEqual(roles);
  });
  it("HEAD retains read permissions and unknown resources do not acquire a role grant", () => {
    expect(permittedRoles("HEAD", "/tickets/1/notes")).toEqual(["IT_STAFF", "ADMIN"]);
    expect(permittedRoles("GET", "/unrecognized-resource")).toBeNull();
  });
});
