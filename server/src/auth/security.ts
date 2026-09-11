import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Prisma, PrismaClient, User, UserRole } from "@prisma/client";
import type { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string,
    public fieldErrors?: Record<string, string>) { super(message); }
}
export const invalid = () => new ApiError(400, "VALIDATION_ERROR", "Validation failed.");
export const unauthenticated = () => new ApiError(401, "AUTH_REQUIRED", "Sign in is required.");
export const forbidden = () => new ApiError(403, "FORBIDDEN", "This operation is not permitted.");
export const origin = () => process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
export const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export const clock = { now: () => new Date() };
export const COOKIE = "toktickit.sid";
export const AUTH_MS = 8 * 60 * 60 * 1000;
export const PRELOGIN_MS = 10 * 60 * 1000;
export type Database = PrismaClient | Prisma.TransactionClient;
export type Identity = { token: string; user: User };
export type MutationGuard = (tx: Prisma.TransactionClient) => Promise<void>;

export function cookieToken(req: Request): string | null {
  const values = (req.headers.cookie ?? "").split(";").map(v => v.trim())
    .filter(v => v.startsWith(`${COOKIE}=`)).map(v => v.slice(COOKIE.length + 1));
  return values.length === 1 && /^[a-f0-9]{64}$/.test(values[0]) ? values[0] : null;
}
export function setCookie(res: Response, token: string, maxAge: number) {
  // HTTP cookies are opt-in and limited to an explicitly local browser origin.
  const local = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin());
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/",
    secure: !(process.env.NODE_ENV !== "production" && process.env.ALLOW_LOCAL_HTTP === "true" && local), maxAge });
}
export async function session(db: Database, token: string | null) {
  if (!token) return null;
  const row = await db.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: true } });
  return row && !row.revokedAt && row.expiresAt > clock.now() ? row : null;
}
export async function identity(db: Database, token: string | null): Promise<Identity> {
  const row = await session(db, token);
  if (!row?.user?.isActive || !row.user.passwordHash) throw unauthenticated();
  return { token: token!, user: row.user };
}
export function completed(user: User) {
  if (user.mustChangePassword) throw new ApiError(403, "PASSWORD_CHANGE_REQUIRED", "Change your initial password before continuing.");
}
export function csrf(req: Request, expected: string) {
  const actual = req.get("X-CSRF-Token") ?? "";
  if (req.get("Origin") !== origin() || !/^[a-f0-9]{64}$/.test(actual)
    || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) {
    throw new ApiError(403, "CSRF_INVALID", "Refresh the page and try again.");
  }
}
export function summary(user: User) {
  return { id: user.id, displayName: user.displayName, email: user.email,
    role: user.role, mustChangePassword: user.mustChangePassword };
}
export async function issueSession(db: Database, userId: number | null) {
  const token = randomBytes(32).toString("hex");
  const csrfToken = randomBytes(32).toString("hex");
  const maxAge = userId === null ? PRELOGIN_MS : AUTH_MS;
  await db.session.create({ data: { tokenHash: digest(token), csrfToken, userId,
    expiresAt: new Date(clock.now().getTime() + maxAge) } });
  return { token, csrfToken, maxAge };
}
export async function securityLock(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(334003)`;
}
// Admin account edits/reset must call this inside the same locked transaction.
export async function revokeUserSessions(tx: Prisma.TransactionClient, userId: number) {
  await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: clock.now() } });
}
export function mutationGuard(actor: Identity, roles: readonly UserRole[]): MutationGuard {
  return async tx => {
    await securityLock(tx);
    const current = await identity(tx, actor.token);
    completed(current.user);
    if (current.user.id !== actor.user.id || !roles.includes(current.user.role)) throw forbidden();
  };
}
export function exactBody(body: unknown, fields: readonly string[]) {
  if (!body || typeof body !== "object" || Array.isArray(body)
    || Object.keys(body).some(key => !fields.includes(key))) throw invalid();
}
export const asyncRoute = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { void fn(req, res).catch(next); };

// The matrix also guards future domain routes, which still return 404 until implemented.
export function permittedRoles(method: string, path: string): readonly UserRole[] | null {
  const read = method === "GET" || method === "HEAD";
  const all: UserRole[] = ["REQUESTER", "IT_STAFF", "ADMIN"];
  if (path.startsWith("/admin/")) return ["ADMIN"];
  if (path.startsWith("/staff/")) return read ? ["IT_STAFF", "ADMIN"] : ["IT_STAFF"];
  if (/^\/tickets\/[^/]+\/notes\/?$/.test(path)) return read ? ["IT_STAFF", "ADMIN"] : ["IT_STAFF"];
  if (/^\/tickets\/[^/]+\/comments\/?$/.test(path)) return read ? all : ["REQUESTER", "IT_STAFF"];
  if (/^\/tickets\/[^/]+\/resolution-indication\/?$/.test(path)) return ["REQUESTER"];
  if (/^\/tickets\/?$/.test(path)) return ["REQUESTER"];
  if (/^\/(tickets|attachments)\//.test(path)) return read ? all : ["REQUESTER"];
  if (/^\/(categories|related-systems)\/?$/.test(path)) return read ? all : [];
  return null;
}
export const protect = (req: Request, res: Response, next: NextFunction) => {
 void (async () => {
  const actor = await identity(getPrisma(), cookieToken(req));
  completed(actor.user);
  const roles = permittedRoles(req.method, req.path);
  if (!roles?.includes(actor.user.role)) throw forbidden();
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const row = await session(getPrisma(), actor.token);
    if (!row) throw unauthenticated();
    csrf(req, row.csrfToken);
  }
  res.locals.actor = actor;
  next();
 })().catch(next);
};
