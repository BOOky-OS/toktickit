import { Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "../auth/security.js";
import { parseTicketList } from "./list-tickets.js";

const keys = ["search", "currentStatus", "requestedPriority", "itPriority", "categoryId", "relatedSystemId", "owner", "sortBy", "sortDir", "page", "pageSize"];
const validation = (fieldErrors: Record<string, string>) => new ApiError(400, "VALIDATION_ERROR", "Validation failed.", fieldErrors);
export function parseQueue(query: Record<string, unknown>, actorId: number) {
  if (Object.keys(query).some(key => !keys.includes(key) || typeof query[key] !== "string")) {
    throw validation({ query: "Use only supported, single-valued query controls." });
  }
  for (const field of ["page", "pageSize", "categoryId", "relatedSystemId"]) {
    if (query[field] !== undefined && !/^[1-9][0-9]*$/.test(String(query[field]))) {
      throw validation({ [field]: "Use a positive decimal integer." });
    }
  }
  const parsed = parseTicketList({ ...query, requesterId: String(actorId), sortBy: query.sortBy === "itPriority" ? "updatedAt" : query.sortBy });
  if (!parsed.ok) throw validation(parsed.fieldErrors);
  if (query.itPriority !== undefined && !["LOW", "MEDIUM", "HIGH"].includes(String(query.itPriority))) {
    throw validation({ itPriority: "Choose LOW, MEDIUM or HIGH." });
  }
  const owner = query.owner as string | undefined;
  if (owner !== undefined && !["me", "unassigned"].includes(owner)
    && (!/^[1-9][0-9]*$/.test(owner) || !Number.isSafeInteger(Number(owner)))) {
    throw validation({ owner: "Choose an eligible owner, me or unassigned." });
  }
  return { ...parsed.value, sortBy: query.sortBy === "itPriority" ? "itPriority" as const : parsed.value.sortBy,
    itPriority: query.itPriority as "LOW" | "MEDIUM" | "HIGH" | undefined, owner };
}

const userSelect = { id: true, displayName: true, role: true } as const;
export function listAssignees(prisma: PrismaClient) {
  return prisma.user.findMany({ where: { isActive: true, role: { in: ["IT_STAFF", "ADMIN"] } },
    select: userSelect, orderBy: [{ displayName: "asc" }, { id: "asc" }] });
}

export async function staffQueue(prisma: PrismaClient, input: ReturnType<typeof parseQueue>) {
  return prisma.$transaction(async tx => {
    const errors: Record<string, string> = {};
    if (input.categoryId && !await tx.category.findUnique({ where: { id: input.categoryId, isActive: true } })) errors.categoryId = "Selected Category is unavailable.";
    if (input.relatedSystemId && !await tx.relatedSystem.findUnique({ where: { id: input.relatedSystemId, isActive: true } })) errors.relatedSystemId = "Selected Related System is unavailable.";
    const ownerId = input.owner === "me" ? input.requesterId : input.owner && input.owner !== "unassigned" ? Number(input.owner) : undefined;
    if (ownerId && !await tx.user.findFirst({ where: { id: ownerId, isActive: true, role: { in: ["IT_STAFF", "ADMIN"] } } })) errors.owner = "Selected owner is unavailable.";
    if (Object.keys(errors).length) throw validation(errors);
    const search = input.search?.replace(/[\\%_]/g, char => `\\${char}`);
    const where: Prisma.TicketWhereInput = {
      ...(search ? { OR: [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
        { requester: { displayName: { contains: search, mode: "insensitive" } } },
      ] } : {}),
      ...(input.currentStatus ? { currentStatus: input.currentStatus } : {}),
      ...(input.requestedPriority ? { requestedPriority: input.requestedPriority } : {}),
      ...(input.itPriority ? { itPriority: input.itPriority } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.relatedSystemId ? { relatedSystemId: input.relatedSystemId } : {}),
      ...(input.owner === "unassigned" ? { ownerId: null } : ownerId ? { ownerId } : {}),
    };
    // PostgreSQL ItPriority enum order is LOW, MEDIUM, HIGH; DESC gives urgency order.
    const [items, totalItems] = await Promise.all([
      tx.ticket.findMany({ where, skip: (input.page - 1) * input.pageSize, take: input.pageSize,
        orderBy: [{ [input.sortBy]: input.sortDir }, { id: input.sortDir }],
        select: { id: true, ticketNumber: true, ticketDate: true, summary: true, updatedAt: true, version: true,
          currentStatus: true, requestedPriority: true, itPriority: true, owner: { select: userSelect },
          requester: { select: { id: true, displayName: true } },
          category: { select: { id: true, name: true } }, relatedSystem: { select: { id: true, name: true } } } }),
      tx.ticket.count({ where }),
    ]);
    const totalPages = Math.ceil(totalItems / input.pageSize);
    return { items, totalItems, totalPages, page: input.page, pageSize: input.pageSize,
      hasPreviousPage: input.page > 1, hasNextPage: input.page < totalPages };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
