import { Router } from "express";
import { getPrisma } from "../prisma.js";
import { hashPassword, validateInitialPassword, verifyPassword } from "./password.js";
import { loginLimit, csrfLimit } from "./rate-limit.js";
import { ApiError, asyncRoute, clock, cookieToken, csrf, digest, exactBody, identity,
  invalid, issueSession, revokeUserSessions, securityLock, session, setCookie, summary, unauthenticated } from "./security.js";

export const authRouter = Router();
const failure = () => new ApiError(401, "INVALID_CREDENTIALS", "Unable to sign in. Check your credentials or contact your administrator.");
// A syntactically valid stored hash ensures absent credentials still perform the full scrypt cost.
const dummy = `scrypt$v1$131072$8$1$${"0".repeat(32)}$${"0".repeat(128)}`;
function passwordInput(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && [...value].length <= 128 && Buffer.byteLength(value) <= 512;
}
function emailInput(value: unknown): string {
  if (typeof value !== "string") throw invalid();
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !/^[^\s@]+@[^\s@.][^\s@]*\.[^\s@.]+$/.test(email)) throw invalid();
  return email;
}
authRouter.use((req, _res, next) => {
  if (Object.keys(req.query).length) return next(invalid());
  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method) && !req.is("application/json")) {
    return next(new ApiError(415, "UNSUPPORTED_TYPE", "Use application/json."));
  }
  next();
});
authRouter.get("/csrf", asyncRoute(async (req, res) => {
  const db = getPrisma();
  const row = await session(db, cookieToken(req));
  if (row && (row.userId === null || (row.user?.isActive && row.user.passwordHash))) {
    res.json({ csrfToken: row.csrfToken }); return;
  }
  csrfLimit.consume([[`csrf:${req.ip}`, 60]]);
  const issued = await db.$transaction(async tx => {
    // A bounded batch avoids an unbounded sweep on a public endpoint.
    const expired = await tx.session.findMany({ where: { expiresAt: { lte: clock.now() } }, select: { id: true }, take: 100, orderBy: { expiresAt: "asc" } });
    await tx.session.deleteMany({ where: { id: { in: expired.map(s => s.id) } } });
    return issueSession(tx, null);
  });
  setCookie(res, issued.token, issued.maxAge);
  res.json({ csrfToken: issued.csrfToken });
}));
authRouter.post("/login", asyncRoute(async (req, res) => {
  const db = getPrisma();
  const token = cookieToken(req);
  const row = await session(db, token);
  if (!row) throw new ApiError(403, "CSRF_INVALID", "Refresh the page and try again.");
  csrf(req, row.csrfToken);
  exactBody(req.body, ["email", "password"]);
  const email = emailInput(req.body.email);
  if (!passwordInput(req.body.password)) throw invalid();
  loginLimit.consume([[`ip:${req.ip}`, 30], [`email:${digest(email)}`, 10]]);
  const user = await db.user.findUnique({ where: { email } });
  const verified = await verifyPassword(req.body.password, user?.passwordHash ?? dummy);
  if (!verified || !user?.isActive || !user.passwordHash) throw failure();
  const result = await db.$transaction(async tx => {
    await securityLock(tx);
    const currentSession = await session(tx, token);
    if (!currentSession) throw new ApiError(403, "CSRF_INVALID", "Refresh the page and try again.");
    csrf(req, currentSession.csrfToken);
    const current = await tx.user.findUnique({ where: { id: user.id } });
    if (!current?.isActive || current.email !== email || current.passwordHash !== user.passwordHash || current.version !== user.version) throw failure();
    await tx.session.update({ where: { id: row.id }, data: { revokedAt: clock.now() } });
    return { user: summary(current), issued: await issueSession(tx, current.id) };
  });
  setCookie(res, result.issued.token, result.issued.maxAge);
  res.json({ user: result.user, csrfToken: result.issued.csrfToken });
}));
authRouter.get("/me", asyncRoute(async (req, res) => {
  const actor = await identity(getPrisma(), cookieToken(req));
  res.json({ user: summary(actor.user) });
}));
authRouter.post("/logout", asyncRoute(async (req, res) => {
  await getPrisma().$transaction(async tx => {
    await securityLock(tx);
    const actor = await identity(tx, cookieToken(req));
    const row = await session(tx, actor.token);
    if (!row) throw unauthenticated();
    csrf(req, row.csrfToken);
    exactBody(req.body, []);
    await tx.session.update({ where: { id: row.id }, data: { revokedAt: clock.now() } });
  });
  setCookie(res, "", 0);
  res.status(204).end();
}));
authRouter.post("/password", asyncRoute(async (req, res) => {
  const db = getPrisma();
  const actor = await identity(db, cookieToken(req));
  const row = await session(db, actor.token);
  if (!row) throw unauthenticated();
  csrf(req, row.csrfToken);
  exactBody(req.body, ["currentPassword", "newPassword", "confirmPassword"]);
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!passwordInput(currentPassword)) throw invalid();
  try { validateInitialPassword(newPassword); } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation failed.", { newPassword: "Use 12-128 Unicode characters, at most 512 UTF-8 bytes, including non-whitespace text." });
  }
  if (confirmPassword !== newPassword || currentPassword === newPassword) {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation failed.", { newPassword: "Confirm the new password exactly and choose a different password." });
  }
  if (!await verifyPassword(currentPassword, actor.user.passwordHash!)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation failed.", { currentPassword: "Current password is incorrect." });
  }
  const passwordHash = await hashPassword(newPassword);
  const result = await db.$transaction(async tx => {
    await securityLock(tx);
    const current = await identity(tx, actor.token);
    if (current.user.version !== actor.user.version || current.user.passwordHash !== actor.user.passwordHash) throw unauthenticated();
    const updated = await tx.user.update({ where: { id: actor.user.id }, data: {
      passwordHash, mustChangePassword: false, passwordChangedAt: clock.now(), version: { increment: 1 },
    } });
    await revokeUserSessions(tx, actor.user.id);
    return { user: summary(updated), issued: await issueSession(tx, actor.user.id) };
  });
  setCookie(res, result.issued.token, result.issued.maxAge);
  res.json({ user: result.user, csrfToken: result.issued.csrfToken });
}));
