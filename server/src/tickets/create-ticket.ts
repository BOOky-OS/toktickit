import { Prisma, PrismaClient } from "@prisma/client";
import { formatTicketNumber } from "./ticket-number.js";
import { ValidCreateTicket } from "./ticket-validation.js";

const ticketInclude = {
  requester: { select: { id: true, displayName: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
} satisfies Prisma.TicketInclude;

type SavedTicket = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

export interface TicketResponse {
  id: number;
  ticketNumber: string;
  ticketDate: string;
  requester: { id: number; displayName: string };
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  summary: string;
  requestedPriority: string;
  itPriority: string;
  currentStatus: string;
  description: string;
  attachments: [];
}

export type CreateTicketResult =
  | { kind: "created"; ticket: TicketResponse }
  | { kind: "replayed"; ticket: TicketResponse }
  | { kind: "validation"; fieldErrors: Record<string, string> }
  | { kind: "conflict" };

function toResponse(ticket: SavedTicket): TicketResponse {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    ticketDate: ticket.ticketDate.toISOString(),
    requester: ticket.requester,
    category: ticket.category,
    relatedSystem: ticket.relatedSystem,
    summary: ticket.summary,
    requestedPriority: ticket.requestedPriority,
    itPriority: ticket.itPriority,
    currentStatus: ticket.currentStatus,
    description: ticket.description,
    attachments: [],
  };
}

function matchesSubmission(ticket: SavedTicket, input: ValidCreateTicket): boolean {
  return ticket.requesterId === input.requesterId
    && ticket.categoryId === input.categoryId
    && ticket.relatedSystemId === input.relatedSystemId
    && ticket.summary === input.summary
    && ticket.requestedPriority === input.requestedPriority
    && ticket.description === input.description;
}

export async function createTicket(
  prisma: PrismaClient,
  input: ValidCreateTicket,
  idempotencyKey: string,
): Promise<CreateTicketResult> {
  return prisma.$transaction(async (tx) => {
    const [requester, category, relatedSystem] = await Promise.all([
      tx.developmentRequester.findUnique({
        where: { id: input.requesterId, isActive: true },
        select: { id: true },
      }),
      tx.category.findUnique({
        where: { id: input.categoryId, isActive: true },
        select: { id: true },
      }),
      tx.relatedSystem.findUnique({
        where: { id: input.relatedSystemId, isActive: true },
        select: { id: true },
      }),
    ]);

    const fieldErrors: Record<string, string> = {};
    if (!requester) fieldErrors.requesterId = "Selected Requester is unavailable.";
    if (!category) fieldErrors.categoryId = "Selected Category is unavailable.";
    if (!relatedSystem) fieldErrors.relatedSystemId = "Selected Related System is unavailable.";
    if (Object.keys(fieldErrors).length > 0) {
      return { kind: "validation", fieldErrors };
    }

    const existing = await tx.ticket.findUnique({
      where: {
        requesterId_clientSubmissionKey: {
          requesterId: input.requesterId,
          clientSubmissionKey: idempotencyKey,
        },
      },
      include: ticketInclude,
    });
    if (existing) {
      return matchesSubmission(existing, input)
        ? { kind: "replayed", ticket: toResponse(existing) }
        : { kind: "conflict" };
    }

    const ticketDate = new Date();
    const sequenceRows = await tx.$queryRaw<Array<{ value: bigint }>>(
      Prisma.sql`SELECT nextval('ticket_number_seq')::bigint AS value`,
    );
    const sequence = sequenceRows[0]?.value;
    if (sequence === undefined) throw new Error("Ticket sequence returned no value.");

    const saved = await tx.ticket.create({
      data: {
        ticketNumber: formatTicketNumber(BigInt(sequence), ticketDate),
        ticketDate,
        requesterId: input.requesterId,
        categoryId: input.categoryId,
        relatedSystemId: input.relatedSystemId,
        summary: input.summary,
        requestedPriority: input.requestedPriority,
        description: input.description,
        clientSubmissionKey: idempotencyKey,
        currentStatus: "NEW",
        itPriority: "UNASSIGNED",
      },
      include: ticketInclude,
    });
    return { kind: "created", ticket: toResponse(saved) };
  });
}
