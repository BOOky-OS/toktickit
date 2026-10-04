import { ActionStatus } from "@prisma/client";
import { exactBody, invalid } from "../auth/security.js";

export const positive = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
export function actionId(value: string): number {
  if (!/^[1-9][0-9]*$/.test(value) || !positive(Number(value))) throw invalid();
  return Number(value);
}
function text(value: unknown, min: number, max: number): string {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw invalid();
  return value.trim();
}
export function instant(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw invalid();
  const day = value.slice(0, 10), date = new Date(value);
  // Date.parse alone normalizes invalid days such as February 30.
  const calendar = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day) throw invalid();
  if (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59) throw invalid();
  return date.toISOString();
}
export function parseAction(body: Record<string, unknown>, edit = false) {
  exactBody(body, ["ticketVersion", "actionAt", "description", "result", "assigneeId", "followUpRequired", "followUpNote", "attachmentNotes", ...(edit ? ["version"] : [])]);
  if (!positive(body.ticketVersion) || !positive(body.assigneeId) || typeof body.followUpRequired !== "boolean" || (edit && !positive(body.version))) throw invalid();
  return { ticketVersion: body.ticketVersion, ...(edit ? { version: body.version as number } : {}),
    actionAt: instant(body.actionAt), description: text(body.description, 5, 2000), result: text(body.result, 0, 2000),
    assigneeId: body.assigneeId, followUpRequired: body.followUpRequired,
    followUpNote: text(body.followUpNote, body.followUpRequired ? 5 : 0, 1000), attachmentNotes: text(body.attachmentNotes, 0, 1000) };
}
export function parseActionStatus(body: Record<string, unknown>) {
  exactBody(body, ["status", "version", "ticketVersion", "confirmed", "reason"]);
  if (!positive(body.version) || !positive(body.ticketVersion) || body.confirmed !== true || !Object.values(ActionStatus).includes(body.status as ActionStatus)) throw invalid();
  if (body.status !== "CANCELLED" && Object.hasOwn(body, "reason")) throw invalid();
  return { status: body.status as ActionStatus, version: body.version, ticketVersion: body.ticketVersion, confirmed: true,
    ...(body.status === "CANCELLED" ? { reason: text(body.reason, 5, 1000) } : {}) };
}
export function actionPage(query: Record<string, unknown>) {
  if (Object.keys(query).some(k => !["page", "pageSize"].includes(k) || typeof query[k] !== "string")) throw invalid();
  const page = actionId(query.page as string ?? "1"), pageSize = actionId(query.pageSize as string ?? "10");
  const skip = (page - 1) * pageSize;
  if (![10, 25, 50].includes(pageSize) || skip > 1_000_000) throw invalid();
  return { page, pageSize, skip };
}
export function pageEnvelope<T>(items: T[], totalItems: number, page: number, pageSize: number) {
  const totalPages = Math.ceil(totalItems / pageSize);
  return { items, page, pageSize, totalItems, totalPages, hasPreviousPage: page > 1, hasNextPage: page < totalPages };
}
