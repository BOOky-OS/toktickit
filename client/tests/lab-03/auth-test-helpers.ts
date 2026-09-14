import { vi } from "vitest";
import * as api from "../../src/api.js";

export const requesterUser: api.CurrentUser = {
  id: 1,
  displayName: "Jennifer Anderson",
  email: "jennifer@example.test",
  role: "REQUESTER",
  mustChangePassword: false,
};

export function mockAuthenticatedUser(user: api.CurrentUser = requesterUser) {
  window.history.replaceState({}, "", "/");
  vi.spyOn(api, "getCurrentUser").mockResolvedValue(user);
  vi.spyOn(api, "getCsrf").mockResolvedValue("csrf-test-token");
}
