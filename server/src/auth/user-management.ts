import { Router } from "express";
import { Prisma, UserRole } from "@prisma/client";
import { ApiError, asyncRoute, exactBody, Identity, invalid, mutationGuard, revokeUserSessions } from "./security.js";
import { hashPassword, validateInitialPassword, verifyPassword } from "./password.js";
import { getPrisma } from "../prisma.js";

const positive = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const conflict = (code: string, message: string) => new ApiError(409, code, message);
const validation = (fields: Record<string, string>) => new ApiError(400, "VALIDATION_ERROR", "Check the user fields.", fields);
const notFound = () => new ApiError(404, "NOT_FOUND", "User is unavailable.");
export const userSelect = { id: true, displayName: true, email: true, role: true, isActive: true, mustChangePassword: true, version: true, createdAt: true, updatedAt: true } as const;
export function userFields(body: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (displayName.length < 2 || displayName.length > 120) errors.displayName = "Use 2–120 characters.";
  if (email.length < 3 || email.length > 254 || !/^[^\s@]+@[^\s@.][^\s@]*\.[^\s@.]+$/.test(email)) errors.email = "Enter a valid email address of at most 254 characters.";
  if (!Object.values(UserRole).includes(body.role as UserRole)) errors.role = "Choose Requester, IT Staff or Admin.";
  if (typeof body.isActive !== "boolean") errors.isActive = "Choose an activation state.";
  if (Object.keys(errors).length) throw validation(errors);
  return { displayName, email, role: body.role as UserRole, isActive: body.isActive as boolean };
}
export function userQuery(query: Record<string, unknown>) {
  if (Object.keys(query).some(k => !["search", "role"].includes(k) || typeof query[k] !== "string")) throw invalid();
  const search = typeof query.search === "string" ? query.search.trim() : undefined;
  if (search !== undefined && (!search || search.length > 120)) throw invalid();
  if (query.role !== undefined && !Object.values(UserRole).includes(query.role as UserRole)) throw invalid();
  return { search, role: query.role as UserRole | undefined };
}
function password(value: unknown): string {
  try { validateInitialPassword(value); } catch { throw validation({ initialPassword: "Use 12–128 Unicode characters, at most 512 UTF-8 bytes, with non-whitespace text." }); }
  return value;
}
function id(raw: string) { if (!/^[1-9][0-9]*$/.test(raw) || !positive(Number(raw))) throw invalid(); return Number(raw); }
async function unique<T>(operation: () => Promise<T>) {
  try { return await operation(); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw conflict("DUPLICATE_EMAIL", "That email is already in use.");
    throw error;
  }
}
export const userManagement = Router();
userManagement.get("/admin/users", asyncRoute(async (req, res) => {
  const query = userQuery(req.query);
  const search = query.search?.replace(/[\\%_]/g, c => `\\${c}`);
  const items = await getPrisma().user.findMany({ where: {
    ...(query.role ? { role: query.role } : {}),
    ...(search ? { OR: [{ displayName: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] } : {}),
  }, select: userSelect, orderBy: [{ displayName: "asc" }, { id: "asc" }] });
  res.json({ items, totalItems: items.length });
}));
userManagement.get("/admin/users/:userId", asyncRoute(async (req, res) => {
  const user = await getPrisma().user.findUnique({ where: { id: id(req.params.userId) }, select: userSelect });
  if (!user) throw notFound(); res.json(user);
}));
userManagement.post("/admin/users", asyncRoute(async (req, res) => {
  exactBody(req.body, ["displayName", "email", "role", "isActive", "initialPassword"]);
  const fields = userFields(req.body), hash = await hashPassword(password(req.body.initialPassword));
  const user = await unique(() => getPrisma().$transaction(async tx => {
    await mutationGuard(res.locals.actor, ["ADMIN"])(tx);
    return tx.user.create({ data: { ...fields, passwordHash: hash, mustChangePassword: true }, select: userSelect });
  }));
  res.status(201).json(user);
}));
userManagement.patch("/admin/users/:userId", asyncRoute(async (req, res) => {
  exactBody(req.body, ["displayName", "email", "role", "isActive", "version"]);
  const userId = id(req.params.userId), fields = userFields(req.body), actor = res.locals.actor as Identity;
  if (!positive(req.body.version)) throw invalid();
  const user = await unique(() => getPrisma().$transaction(async tx => {
    await mutationGuard(actor, ["ADMIN"])(tx);
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: userId } });
    if (!current) throw notFound();
    if (current.version !== req.body.version) throw conflict("STALE_VERSION", "User changed. Reload and review before saving.");
    if (userId === actor.user.id && !fields.isActive) throw conflict("SELF_DEACTIVATION", "You cannot deactivate your own account.");
    if (current.role === "ADMIN" && current.isActive && (!fields.isActive || fields.role !== "ADMIN")
      && await tx.user.count({ where: { role: "ADMIN", isActive: true } }) <= 1) throw conflict("LAST_ACTIVE_ADMIN", "Keep at least one active Administrator.");
    if ((!fields.isActive || fields.role === "REQUESTER") && current.isActive && ["IT_STAFF", "ADMIN"].includes(current.role)
      && await tx.ticket.count({ where: { ownerId: userId, currentStatus: { notIn: ["CLOSED", "CANCELLED"] } } })) throw conflict("ACTIVE_ASSIGNMENTS", "Reassign this user's nonterminal Tickets first.");
    const changed = fields.displayName !== current.displayName || fields.email !== current.email || fields.role !== current.role || fields.isActive !== current.isActive;
    if (changed) {
      await tx.user.update({ where: { id: userId }, data: { ...fields, version: { increment: 1 } } });
      if (fields.email !== current.email || fields.role !== current.role || fields.isActive !== current.isActive) await revokeUserSessions(tx, userId);
    }
    return tx.user.findUniqueOrThrow({ where: { id: userId }, select: userSelect });
  }));
  res.json(user);
}));
userManagement.post("/admin/users/:userId/initial-password", asyncRoute(async (req, res) => {
  exactBody(req.body, ["initialPassword", "version", "confirmed"]);
  const userId = id(req.params.userId), value = password(req.body.initialPassword);
  if (!positive(req.body.version) || req.body.confirmed !== true) throw invalid();
  const snapshot = await getPrisma().user.findUnique({ where: { id: userId } });
  if (!snapshot) throw notFound();
  if (snapshot.passwordHash && await verifyPassword(value, snapshot.passwordHash)) throw validation({ initialPassword: "Choose a password different from the current password." });
  const hash = await hashPassword(value);
  const user = await getPrisma().$transaction(async tx => {
    await mutationGuard(res.locals.actor, ["ADMIN"])(tx);
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: userId } });
    if (!current) throw notFound();
    if (current.version !== req.body.version || current.passwordHash !== snapshot.passwordHash) throw conflict("STALE_VERSION", "User changed. Reload and review before saving.");
    await tx.user.update({ where: { id: userId }, data: { passwordHash: hash, mustChangePassword: true, version: { increment: 1 } } });
    await revokeUserSessions(tx, userId);
    return tx.user.findUniqueOrThrow({ where: { id: userId }, select: userSelect });
  });
  res.json(user);
}));
