import { Prisma, PrismaClient } from "@prisma/client";

const attachmentSelect = {
  id: true,
  originalFilename: true,
  storageKey: true,
  mimeType: true,
  sizeBytes: true,
  uploadedAt: true,
  removedAt: true,
  removalReason: true,
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
}

function toResponse(attachment: StoredAttachment): AttachmentResponse {
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
    } : {}),
  };
}

async function ownedTicket(prisma: PrismaClient, ticketId: number, requesterId: number) {
  return prisma.ticket.findFirst({
    where: { id: ticketId, requesterId, requester: { isActive: true } },
    select: { id: true },
  });
}

export async function createAttachment(
  prisma: PrismaClient,
  input: {
    ticketId: number; requesterId: number; originalFilename: string;
    storageKey: string; mimeType: string; sizeBytes: number;
  },
): Promise<{ kind: "created"; attachment: AttachmentResponse } | { kind: "unavailable" | "limit" }> {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findFirst({
      where: { id: input.ticketId, requesterId: input.requesterId, requester: { isActive: true } },
      select: { id: true },
    });
    if (!ticket) return { kind: "unavailable" } as const;
    const activeCount = await tx.attachment.count({
      where: { ticketId: input.ticketId, removedAt: null },
    });
    if (activeCount >= 5) return { kind: "limit" } as const;
    const attachment = await tx.attachment.create({
      data: input,
      select: attachmentSelect,
    });
    return { kind: "created", attachment: toResponse(attachment) } as const;
  });
}

export async function listAttachments(prisma: PrismaClient, ticketId: number, requesterId: number) {
  if (!await ownedTicket(prisma, ticketId, requesterId)) return null;
  const items = await prisma.attachment.findMany({
    where: { ticketId },
    select: attachmentSelect,
    orderBy: { uploadedAt: "asc" },
  });
  return items.map(toResponse);
}

export async function findDownloadableAttachment(prisma: PrismaClient, attachmentId: number, requesterId: number) {
  return prisma.attachment.findFirst({
    where: {
      id: attachmentId,
      removedAt: null,
      ticket: { requesterId, requester: { isActive: true } },
    },
    select: attachmentSelect,
  });
}

export async function removeAttachment(
  prisma: PrismaClient,
  attachmentId: number,
  requesterId: number,
  reason: string,
): Promise<AttachmentResponse | null> {
  return prisma.$transaction(async (tx) => {
    const attachment = await tx.attachment.findFirst({
      where: {
        id: attachmentId,
        removedAt: null,
        ticket: { requesterId, requester: { isActive: true } },
      },
      select: { id: true },
    });
    if (!attachment) return null;
    const updated = await tx.attachment.update({
      where: { id: attachment.id },
      data: { removedAt: new Date(), removalReason: reason, removedByRequesterId: requesterId },
      select: attachmentSelect,
    });
    return toResponse(updated);
  });
}
