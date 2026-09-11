import request from "supertest";
import type { Express } from "express";
import { vi } from "vitest";

// Older domain API tests mock persistence, including the newly required session lookup.
// Real cookie/session/revocation behavior is independently exercised against PostgreSQL.
export const TOKEN = "a".repeat(64);
export const CSRF = "b".repeat(64);
export const AUTH_USER = { id: 1, role: "REQUESTER", isActive: true, passwordHash: "fixture-hash", mustChangePassword: false };
export function sessionMock() {
  return { findUnique: vi.fn().mockResolvedValue({ id: "fixture-session", expiresAt: new Date("2099-01-01"), revokedAt: null, csrfToken: CSRF, user: AUTH_USER }) };
}
export function authenticatedRequest(app: Express) {
  const agent = request(app);
  const headers = { Cookie: `toktickit.sid=${TOKEN}`, Origin: "http://localhost:5173", "X-CSRF-Token": CSRF };
  return {
    get: (url: string) => agent.get(url).set(headers),
    post: (url: string) => agent.post(url).set(headers),
    delete: (url: string) => agent.delete(url).set(headers),
  };
}
