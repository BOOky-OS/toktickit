import type { MutationGuard } from "../auth/security.js";
import { Prisma, PrismaClient } from "@prisma/client";

export const attachmentSelect = {
  id: true,
  originalFilename: true,
  storageKey: true,
  mimeType: true,
  sizeBytes: true,
  uploadedAt: true,
  removedAt: true,
  removalReason: true,
  removedByUser: { select: { id: true, displayName: true } },
} satisfies Prisma.AttachmentSelect;

type StoredAttachment = Prisma.AttachmentGetPayload<{ select: typeof attachmentSelect }>;

export interface AttachmentResponse {
  id: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  state: "ACTIVE" | "REMOVED";
  canDownload: boolean;
  removedAt?: string;
  removalReason?: string;
  removedBy?: { id: number; displayName: string } | null;
}

export function toAttachmentResponse(attachment: StoredAttachment): AttachmentResponse {
  const removed = attachment.removedAt !== null;
  return {
    id: attachment.id,
    originalFilename: attachment.originalFilename,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    uploadedAt: attachment.uploadedAt.toISOString(),
    state: removed ? "REMOVED" : "ACTIVE",
    canDownload: !removed,
    ...(removed ? {
      removedAt: attachment.removedAt!.toISOString(),
      removalReason: attachment.removalReason ?? undefined,
      removedBy: attachment.removedByUser,
    } : {}),
  };
}

async function ownedTicket(prisma: PrismaClient, ticketId: number, requesterId?: number) {
  return prisma.ticket.findFirst({
    where: {
      id: ticketId,
      ...(requesterId ? {
        requesterId,
        requester: { isActive: true, role: "REQUESTER" },
      } : {}),
    },
    select: { id: true },
  });
}

async function lockTicket(tx: Prisma.TransactionClient, ticketId: number) {
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "Ticket" WHERE "id" = ${ticketId} FOR UPDATE`,
  );
}

export async function createAttachment(
  prisma: PrismaClient,
  input: {
    ticketId: number;
    requesterId: number;
    originalFilename: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
  },
  guard?: MutationGuard,
): Promise<{ kind: "created"; attachment: AttachmentResponse } | { kind: "unavailable" | "limit" }> {
  return prisma.$transaction(async tx => {
    await guard?.(tx);
    await lockTicket(tx, input.ticketId);
    const ticket = await tx.ticket.findFirst({
      where: {
        id: input.ticketId,
        requesterId: input.requesterId,
        requester: { isActive: true, role: "REQUESTER" },
      },
      select: { id: true },
    });
    if (!ticket) return { kind: "unavailable" } as const;

    const activeCount = await tx.attachment.count({
      where: { ticketId: input.ticketId, removedAt: null },
    });
    if (activeCount >= 5) return { kind: "limit" } as const;

    const attachment = await tx.attachment.create({
      data: {
        ticketId: input.ticketId,
        originalFilename: input.originalFilename,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
      },
      select: attachmentSelect,
    });
    await tx.ticket.update({
      where: { id: input.ticketId },
      data: { version: { increment: 1 } },
      select: { id: true },
    });
    return { kind: "created", attachment: toAttachmentResponse(attachment) } as const;
  });
}

export async function listAttachments(prisma: PrismaClient, ticketId: number, requesterId?: number) {
  if (!await ownedTicket(prisma, ticketId, requesterId)) return null;
  const items = await prisma.attachment.findMany({
    where: { ticketId },
    select: attachmentSelect,
    orderBy: [{ uploadedAt: "asc" }, { id: "asc" }],
  });
  return items.map(toAttachmentResponse);
}

export async function findDownloadableAttachment(prisma: PrismaClient, attachmentId: number, requesterId?: number) {
  return prisma.attachment.findFirst({
    where: {
      id: attachmentId,
      removedAt: null,
      ...(requesterId ? { ticket: { requesterId } } : {}),
    },
    select: attachmentSelect,
  });
}

export async function removeAttachment(
  prisma: PrismaClient,
  attachmentId: number,
  requesterId: number,
  reason: string,
  guard?: MutationGuard,
): Promise<AttachmentResponse | null> {
  return prisma.$transaction(async tx => {
    await guard?.(tx);
    const candidate = await tx.attachment.findUnique({
      where: { id: attachmentId },
      select: { ticketId: true },
    });
    if (!candidate) return null;

    await lockTicket(tx, candidate.ticketId);
    const attachment = await tx.attachment.findFirst({
      where: {
        id: attachmentId,
        removedAt: null,
        ticket: {
          requesterId,
          requester: { isActive: true, role: "REQUESTER" },
        },
      },
      select: { id: true, ticketId: true },
    });
    if (!attachment) return null;

    const updated = await tx.attachment.update({
      where: { id: attachment.id },
      data: {
        removedAt: new Date(),
        removalReason: reason,
        removedByUserId: requesterId,
      },
      select: attachmentSelect,
    });
    await tx.ticket.update({
      where: { id: attachment.ticketId },
      data: { version: { increment: 1 } },
      select: { id: true },
    });
    return toAttachmentResponse(updated);
  });
}
