import { Router } from "express";
import { ApiError, asyncRoute, exactBody, Identity, invalid, mutationGuard } from "../auth/security.js";
import { getPrisma } from "../prisma.js";
import { detailSelect } from "./staff-operations.js";
import { toAttachmentResponse } from "../attachments/attachment-service.js";

const entrySelect = { id: true, body: true, createdAt: true, author: { select: { id: true, displayName: true, role: true } } } as const;
const unavailable = () => new ApiError(404, "NOT_FOUND", "Ticket is unavailable.");
const readOnly = () => new ApiError(409, "TICKET_READ_ONLY", "This Ticket is read-only.");
const positive = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
function ticketId(raw: string) { if (!/^[1-9][0-9]*$/.test(raw) || !positive(Number(raw))) throw invalid(); return Number(raw); }
const ownedWhere = (id: number, actor: Identity) => ({ id, ...(actor.user.role === "REQUESTER" ? { requesterId: actor.user.id } : {}) });
export function entryBody(body: Record<string, unknown>, internal: boolean) {
  exactBody(body, ["body"]);
  if (typeof body.body !== "string") throw invalid();
  const text = body.body.trim();
  if (!text || text.length > (internal ? 4000 : 2000)) throw invalid();
  return text;
}
export const communication = Router();
for (const stream of ["comments", "notes"] as const) {
  const internal = stream === "notes";
  communication.get(`/tickets/:ticketId/${stream}`, asyncRoute(async (req, res) => {
    const id = ticketId(req.params.ticketId), actor = res.locals.actor as Identity;
    if (internal && actor.user.role === "REQUESTER") throw new ApiError(403, "FORBIDDEN", "This operation is not permitted.");
    if (!await getPrisma().ticket.findFirst({ where: ownedWhere(id, actor), select: { id: true } })) throw unavailable();
    const args = { where: { ticketId: id }, select: entrySelect, orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] };
    res.json(internal ? await getPrisma().internalNote.findMany(args) : await getPrisma().publicComment.findMany(args));
  }));
  communication.post(`/tickets/:ticketId/${stream}`, asyncRoute(async (req, res) => {
    const id = ticketId(req.params.ticketId), actor = res.locals.actor as Identity;
    const body = entryBody(req.body, internal);
    const entry = await getPrisma().$transaction(async tx => {
      await mutationGuard(actor, internal ? ["IT_STAFF"] : ["REQUESTER", "IT_STAFF"])(tx);
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${id} FOR UPDATE`;
      const ticket = await tx.ticket.findFirst({ where: ownedWhere(id, actor), select: { currentStatus: true } });
      if (!ticket) throw unavailable();
      if (["CLOSED", "CANCELLED"].includes(ticket.currentStatus)) throw readOnly();
      const args = { data: { ticketId: id, authorId: actor.user.id, body }, select: entrySelect };
      const saved = internal ? await tx.internalNote.create(args) : await tx.publicComment.create(args);
      await tx.ticket.update({ where: { id }, data: { version: { increment: 1 } } });
      return saved;
    });
    res.status(201).json(entry);
  }));
}
communication.post("/tickets/:ticketId/resolution-indication", asyncRoute(async (req, res) => {
  const id = ticketId(req.params.ticketId), actor = res.locals.actor as Identity;
  exactBody(req.body, ["version", "confirmed"]);
  if (!positive(req.body.version) || req.body.confirmed !== true) throw invalid();
  const result = await getPrisma().$transaction(async tx => {
    await mutationGuard(actor, ["REQUESTER"])(tx);
    await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${id} FOR UPDATE`;
    const ticket = await tx.ticket.findFirst({ where: { id, requesterId: actor.user.id } });
    if (!ticket) throw unavailable();
    if (ticket.version !== req.body.version) throw new ApiError(409, "STALE_VERSION", "Ticket changed. Reload and review before saving.");
    if (["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.currentStatus)) throw readOnly();
    if (!ticket.requesterResolutionIndicatedAt) await tx.ticket.update({ where: { id }, data: {
      requesterResolutionIndicatedAt: new Date(), version: { increment: 1 },
    } });
    const detail = await tx.ticket.findUniqueOrThrow({ where: { id }, select: detailSelect });
    return { ...detail, attachments: detail.attachments.map(toAttachmentResponse) };
  });
  res.json(result);
}));
