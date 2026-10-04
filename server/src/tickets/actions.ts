import { Router } from "express";
import { Prisma, ActionStatus } from "@prisma/client";
import { ApiError, asyncRoute, clock, completed, Identity, identity, invalid, mutationGuard } from "../auth/security.js";
import { getPrisma } from "../prisma.js";
import { actionId, actionPage, pageEnvelope, parseAction, parseActionStatus } from "./action-validation.js";

const person = { id: true, displayName: true, role: true } as const;
export const actionSelect = {
  id: true, ticketId: true, actionAt: true, description: true, result: true,
  performedBy: { select: person }, assignee: { select: person }, followUpRequired: true, followUpNote: true,
  attachmentNotes: true, status: true, version: true, createdAt: true, updatedAt: true,
  completedAt: true, cancelledAt: true, cancellationReason: true,
} satisfies Prisma.ActionTakenSelect;
export const actionJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
const missing = () => new ApiError(404, "NOT_FOUND", "Ticket or action is unavailable.");
const conflict = (code: string, message: string) => new ApiError(409, code, message);
function resourceId(raw: string) {
  const value = actionId(raw);
  if (value > 2_147_483_647) throw missing(); // Valid safe integer, outside PostgreSQL Int IDs.
  return value;
}
const terminal = (status: ActionStatus) => status === "COMPLETED" || status === "CANCELLED";
const transitions: Record<ActionStatus, ActionStatus[]> = { PLANNED: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["COMPLETED", "CANCELLED"], COMPLETED: [], CANCELLED: [] };
// JSONB does not retain object key ordering. Compare objects using sorted keys.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export const actionsRouter = Router();
actionsRouter.get("/tickets/:ticketId/actions", asyncRoute(async (req, res) => {
  const ticketId = resourceId(req.params.ticketId), paging = actionPage(req.query), actor = res.locals.actor as Identity;
  res.json(await getPrisma().$transaction(async tx => {
    const current = await identity(tx, actor.token); completed(current.user);
    const ticket = await tx.ticket.findFirst({ where: { id: ticketId, ...(current.user.role === "REQUESTER" ? { requesterId: current.user.id } : {}) }, select: { version: true } });
    if (!ticket) throw missing();
    const items = await tx.actionTaken.findMany({ where: { ticketId }, select: actionSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip: paging.skip, take: paging.pageSize });
    const count = await tx.actionTaken.count({ where: { ticketId } });
    return { ...pageEnvelope(items, count, paging.page, paging.pageSize), ticketVersion: ticket.version };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
}));
actionsRouter.get("/tickets/:ticketId/actions/:actionId/history", asyncRoute(async (req, res) => {
  const ticketId = resourceId(req.params.ticketId), id = resourceId(req.params.actionId), paging = actionPage(req.query);
  res.json(await getPrisma().$transaction(async tx => {
    const current = await identity(tx, (res.locals.actor as Identity).token); completed(current.user);
    if (!["IT_STAFF", "ADMIN"].includes(current.user.role)) throw new ApiError(403, "FORBIDDEN", "This operation is not permitted.");
    if (!await tx.actionTaken.findFirst({ where: { id, ticketId }, select: { id: true } })) throw missing();
    const items = await tx.actionRevision.findMany({ where: { actionId: id },
      select: { id: true, actionId: true, version: true, event: true, actor: { select: person }, createdAt: true, snapshot: true },
      orderBy: [{ version: "asc" }, { id: "asc" }], skip: paging.skip, take: paging.pageSize });
    return pageEnvelope(items, await tx.actionRevision.count({ where: { actionId: id } }), paging.page, paging.pageSize);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
}));

for (const operation of ["create", "edit", "status"] as const) {
  const method = operation === "edit" ? "patch" : "post";
  const suffix = operation === "create" ? "" : `/:actionId${operation === "status" ? "/status" : ""}`;
  actionsRouter[method](`/tickets/:ticketId/actions${suffix}`, asyncRoute(async (req, res) => {
    const ticketId = resourceId(req.params.ticketId), id = operation === "create" ? undefined : resourceId(req.params.actionId);
    if (Object.keys(req.query).length) throw invalid();
    const rawKey = req.get("Idempotency-Key");
    if (!rawKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawKey)) throw invalid();
    const key = rawKey.toLowerCase(), actor = res.locals.actor as Identity;
    const fields = operation === "status" ? undefined : parseAction(req.body, operation === "edit");
    const statusFields = operation === "status" ? parseActionStatus(req.body) : undefined;
    const normalized = actionJson(fields ?? statusFields), path = `/tickets/${ticketId}/actions${id ? `/${id}` : ""}${operation === "status" ? "/status" : ""}`;
    const result = await getPrisma().$transaction(async tx => {
      await mutationGuard(actor, ["IT_STAFF", "ADMIN"])(tx);
      // Scope is rechecked even for a saved receipt; revoked callers cannot replay.
      if (!await tx.ticket.findUnique({ where: { id: ticketId }, select: { id: true } })) throw missing();
      if (id && !await tx.actionTaken.findFirst({ where: { id, ticketId }, select: { id: true } })) throw missing();
      const receipt = await tx.actionReceipt.findUnique({ where: { actorId_key: { actorId: actor.user.id, key } } });
      if (receipt) {
        if (receipt.method !== req.method || receipt.path !== path || canonical(receipt.request) !== canonical(normalized)) throw conflict("IDEMPOTENCY_CONFLICT", "Use a new key for a changed request.");
        return { status: receipt.responseStatus, body: receipt.response, replay: true };
      }
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
      const ticket = await tx.ticket.findUniqueOrThrow({ where: { id: ticketId } });
      if (id) await tx.$queryRaw`SELECT id FROM "ActionTaken" WHERE id = ${id} FOR UPDATE`;
      const current = id ? await tx.actionTaken.findUniqueOrThrow({ where: { id } }) : null;
      const expected = fields ?? statusFields!;
      if (ticket.version !== expected.ticketVersion || (current && current.version !== expected.version)) throw conflict("STALE_VERSION", "Ticket or action changed. Reload before saving.");
      if (current && terminal(current.status)) throw conflict("ACTION_READ_ONLY", "This action is read-only.");
      if (["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.currentStatus)) throw conflict("TICKET_READ_ONLY", "This Ticket is read-only.");
      const now = clock.now();
      const eligible = (assigneeId: number) => assigneeId > 2_147_483_647 ? null : tx.user.findFirst({ where: { id: assigneeId, isActive: true, role: { in: ["IT_STAFF", "ADMIN"] } }, select: { id: true } });
      let data: Prisma.ActionTakenUncheckedUpdateInput = {}, changed = true;
      if (fields) {
        const { ticketVersion: _ticketVersion, version: _version, actionAt, ...editable } = fields;
        const date = new Date(actionAt);
        if (date < ticket.ticketDate || date > now) throw invalid();
        if (!await eligible(fields.assigneeId)) throw conflict("INVALID_ASSIGNEE", "Select an active Staff or Admin assignee.");
        data = { ...editable, actionAt: date };
        changed = !current || Object.entries(editable).some(([k,v]) => current[k as keyof typeof current] !== v) || current.actionAt.getTime() !== date.getTime();
      } else {
        if (!current || !statusFields || !transitions[current.status].includes(statusFields.status)) throw conflict("INVALID_ACTION_TRANSITION", "This action transition is unavailable.");
        if (statusFields.status !== "CANCELLED" && !await eligible(current.assigneeId)) throw conflict("INVALID_ASSIGNEE", "Select an active Staff or Admin assignee.");
        if (statusFields.status === "COMPLETED" && (current.result.trim().length < 5 || current.followUpRequired)) throw invalid();
        data = { status: statusFields.status, ...(statusFields.status === "COMPLETED" ? { completedAt: now } : {}),
          ...(statusFields.status === "CANCELLED" ? { cancelledAt: now, cancellationReason: statusFields.reason! } : {}) };
      }
      let action;
      if (!current && fields) {
        const { ticketVersion: _tv, version: _v, actionAt, ...editable } = fields;
        action = await tx.actionTaken.create({ data: { ...editable, actionAt: new Date(actionAt), ticketId, performedById: actor.user.id, workCycle: ticket.workCycle }, select: actionSelect });
      } else {
        action = changed ? await tx.actionTaken.update({ where: { id }, data: { ...data, version: { increment: 1 } }, select: actionSelect })
          : await tx.actionTaken.findUniqueOrThrow({ where: { id }, select: actionSelect });
      }
      if (changed) {
        await tx.actionRevision.create({ data: { actionId: action.id, actorId: actor.user.id, version: action.version,
          event: operation === "create" ? "CREATE" : operation === "edit" ? "EDIT" : "STATUS", snapshot: actionJson(action) } });
        await tx.ticket.update({ where: { id: ticketId }, data: { version: { increment: 1 }, updatedAt: now } });
      }
      const body = actionJson({ action, ticketVersion: ticket.version + (changed ? 1 : 0) }), status = operation === "create" ? 201 : 200;
      await tx.actionReceipt.create({ data: { actorId: actor.user.id, key, method: req.method, path, request: normalized, responseStatus: status, response: body } });
      return { body, status, replay: false };
    }, { maxWait: 10_000, timeout: 15_000 });
    if (result.replay) res.set("Idempotency-Replayed", "true");
    res.status(result.status).json(result.body);
  }));
}
