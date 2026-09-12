import { Router } from "express";
import { Prisma, TicketStatus } from "@prisma/client";
import { ApiError, asyncRoute, exactBody, Identity, invalid, mutationGuard } from "../auth/security.js";
import { getPrisma } from "../prisma.js";
import { attachmentSelect, toAttachmentResponse } from "../attachments/attachment-service.js";

export const transitions: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], CANCELLED: [],
};
export const canTransition = (from: TicketStatus, to: TicketStatus) => transitions[from].includes(to);
const conflict = (code: string, message: string) => new ApiError(409, code, message);
const positive = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const requiredReason = ["RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
type Operation = "claim" | "owner" | "priority" | "status";
export function parseOperation(operation: Operation, body: Record<string, unknown>) {
  const fields = { claim: ["version"], owner: ["version", "ownerId", "confirmed"],
    priority: ["version", "itPriority"], status: ["version", "currentStatus", "confirmed", "reason"] };
  exactBody(body, fields[operation]);
  if (!positive(body.version)) throw invalid();
  if (["owner", "status"].includes(operation) && body.confirmed !== true) throw invalid();
  if (operation === "owner" && body.ownerId !== null && !positive(body.ownerId)) throw invalid();
  if (operation === "priority" && (typeof body.itPriority !== "string" || !["LOW", "MEDIUM", "HIGH"].includes(body.itPriority))) throw invalid();
  if (operation === "status") {
    if (!Object.values(TicketStatus).includes(body.currentStatus as TicketStatus)) throw invalid();
    if (body.reason !== undefined && (typeof body.reason !== "string" || body.reason.trim().length < 5 || body.reason.trim().length > 1000)) throw invalid();
    if (requiredReason.includes(String(body.currentStatus)) && typeof body.reason !== "string") throw invalid();
  }
  return body;
}
const detailSelect = {
  id: true, ticketNumber: true, ticketDate: true, summary: true, description: true,
  requestedPriority: true, itPriority: true, currentStatus: true, updatedAt: true, version: true,
  requesterResolutionIndicatedAt: true, resolvedAt: true, closedAt: true, cancelledAt: true,
  resolutionSummary: true, cancellationReason: true,
  requester: { select: { id: true, displayName: true } },
  owner: { select: { id: true, displayName: true, role: true } },
  category: { select: { id: true, name: true } }, relatedSystem: { select: { id: true, name: true } },
  attachments: { select: attachmentSelect, orderBy: [{ uploadedAt: "asc" }, { id: "asc" }] },
} satisfies Prisma.TicketSelect;

export async function operate(actor: Identity, id: number, operation: Operation, body: Record<string, unknown>) {
  parseOperation(operation, body);
  return getPrisma().$transaction(async tx => {
    await mutationGuard(actor, ["IT_STAFF"])(tx);
    await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${id} FOR UPDATE`;
    const ticket = await tx.ticket.findUnique({ where: { id } });
    if (!ticket) throw new ApiError(404, "NOT_FOUND", "Ticket is unavailable.");
    if (ticket.version !== body.version) throw conflict("STALE_VERSION", "Ticket changed. Reload and review before saving.");
    const data: Prisma.TicketUpdateInput = {};
    const eligible = (userId: number) => tx.user.findFirst({ where: { id: userId, isActive: true, role: { in: ["IT_STAFF", "ADMIN"] } } });
    if (operation !== "status" && ["CLOSED", "CANCELLED"].includes(ticket.currentStatus)) throw conflict("TICKET_READ_ONLY", "This Ticket is read-only.");
    if (operation === "claim") {
      if (ticket.ownerId !== null && ticket.ownerId !== actor.user.id) throw conflict("ALREADY_ASSIGNED", "Ticket already has an owner.");
      if (ticket.ownerId === null) data.owner = { connect: { id: actor.user.id } };
    }
    if (operation === "owner") {
      const ownerId = body.ownerId as number | null;
      if (ownerId === null && !["NEW", "OPEN"].includes(ticket.currentStatus)) throw conflict("OWNER_REQUIRED", "This status requires an owner.");
      if (ownerId !== null && !await eligible(ownerId)) throw conflict("INVALID_ASSIGNEE", "Selected owner is unavailable.");
      if (ownerId !== ticket.ownerId) data.owner = ownerId === null ? { disconnect: true } : { connect: { id: ownerId } };
    }
    if (operation === "priority" && body.itPriority !== ticket.itPriority) data.itPriority = body.itPriority as "LOW" | "MEDIUM" | "HIGH";
    if (operation === "status") {
      const next = body.currentStatus as TicketStatus;
      if (!canTransition(ticket.currentStatus, next)) throw conflict("INVALID_TRANSITION", "This status transition is unavailable.");
      if (["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED"].includes(next)
        && (ticket.ownerId === null || !await eligible(ticket.ownerId))) throw conflict("OWNER_REQUIRED", "Assign an active eligible owner first.");
      const reason = typeof body.reason === "string" ? body.reason.trim() : null;
      data.currentStatus = next;
      const now = new Date();
      if (next === "RESOLVED") { data.resolvedAt = now; data.resolutionSummary = reason; }
      if (next === "CLOSED") data.closedAt = now;
      if (next === "CANCELLED") { data.cancelledAt = now; data.cancellationReason = reason; }
      if (next === "REOPENED") { data.resolvedAt = null; data.closedAt = null; data.resolutionSummary = null; data.requesterResolutionIndicatedAt = null; }
      await tx.ticketStatusChange.create({ data: { ticketId: id, authorId: actor.user.id, fromStatus: ticket.currentStatus, toStatus: next, reason } });
    }
    if (Object.keys(data).length) await tx.ticket.update({ where: { id }, data: { ...data, version: { increment: 1 } } });
    const detail = await tx.ticket.findUniqueOrThrow({ where: { id }, select: detailSelect });
    return { ...detail, attachments: detail.attachments.map(toAttachmentResponse) };
  });
}

export const staffOperations = Router();
for (const operation of ["claim", "owner", "priority", "status"] as const) {
  const method = operation === "owner" || operation === "priority" ? "patch" : "post";
  staffOperations[method](`/staff/tickets/:ticketId/${operation}`, asyncRoute(async (req, res) => {
    if (!/^[1-9][0-9]*$/.test(req.params.ticketId) || !positive(Number(req.params.ticketId))) throw invalid();
    res.json(await operate(res.locals.actor, Number(req.params.ticketId), operation, req.body));
  }));
}
staffOperations.get("/tickets/:ticketId/status-history", asyncRoute(async (req, res) => {
  if (!/^[1-9][0-9]*$/.test(req.params.ticketId) || !positive(Number(req.params.ticketId))) throw invalid();
  const actor = res.locals.actor as Identity;
  const ticketId = Number(req.params.ticketId);
  const ticket = await getPrisma().ticket.findFirst({ where: { id: ticketId, ...(actor.user.role === "REQUESTER" ? { requesterId: actor.user.id } : {}) }, select: { id: true } });
  if (!ticket) throw new ApiError(404, "NOT_FOUND", "Ticket is unavailable.");
  res.json(await getPrisma().ticketStatusChange.findMany({ where: { ticketId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, fromStatus: true, toStatus: true, reason: true, createdAt: true, author: { select: { id: true, displayName: true, role: true } } } }));
}));
