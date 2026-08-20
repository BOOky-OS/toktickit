import { Prisma, PrismaClient } from "@prisma/client";

export type TicketListInput = {
  requesterId: number;
  search?: string;
  categoryId?: number;
  relatedSystemId?: number;
  requestedPriority?: "LOW" | "MEDIUM" | "HIGH";
  currentStatus?: "NEW";
  sortBy: "updatedAt" | "ticketDate" | "ticketNumber" | "summary";
  sortDir: "asc" | "desc";
  page: number;
  pageSize: 10 | 25 | 50;
};

type ParseResult = { ok: true; value: TicketListInput } | { ok: false; fieldErrors: Record<string, string> };
const priorities = ["LOW", "MEDIUM", "HIGH"] as const;
const sortFields = ["updatedAt", "ticketDate", "ticketNumber", "summary"] as const;
const sortDirections = ["asc", "desc"] as const;

function one(value: unknown) { return typeof value === "string" ? value : undefined; }
function positive(value: string | undefined) { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }

export function parseTicketList(query: Record<string, unknown>): ParseResult {
  const errors: Record<string, string> = {};
  const requesterId = positive(one(query.requesterId));
  if (!requesterId) errors.requesterId = "Requester is required.";
  const searchRaw = one(query.search);
  const search = searchRaw?.trim();
  if (searchRaw !== undefined && (!search || search.length > 120)) errors.search = "Search must contain 1 to 120 characters.";
  const categoryId = one(query.categoryId) === undefined ? undefined : positive(one(query.categoryId));
  if (one(query.categoryId) !== undefined && !categoryId) errors.categoryId = "Category must be a positive integer.";
  const relatedSystemId = one(query.relatedSystemId) === undefined ? undefined : positive(one(query.relatedSystemId));
  if (one(query.relatedSystemId) !== undefined && !relatedSystemId) errors.relatedSystemId = "Related System must be a positive integer.";
  const requestedPriority = one(query.requestedPriority);
  if (requestedPriority !== undefined && !priorities.includes(requestedPriority as typeof priorities[number])) errors.requestedPriority = "Requested Priority must be LOW, MEDIUM, or HIGH.";
  const currentStatus = one(query.currentStatus);
  if (currentStatus !== undefined && currentStatus !== "NEW") errors.currentStatus = "Current Status must be NEW.";
  const sortByRaw = one(query.sortBy) ?? "updatedAt";
  if (!sortFields.includes(sortByRaw as typeof sortFields[number])) errors.sortBy = "Sort field is invalid.";
  const sortDirRaw = one(query.sortDir) ?? "desc";
  if (!sortDirections.includes(sortDirRaw as typeof sortDirections[number])) errors.sortDir = "Sort direction must be asc or desc.";
  const page = one(query.page) === undefined ? 1 : positive(one(query.page));
  if (!page) errors.page = "Page must be a positive integer.";
  const pageSizeRaw = one(query.pageSize);
  const pageSize = pageSizeRaw === undefined ? 10 : Number(pageSizeRaw);
  if (![10, 25, 50].includes(pageSize)) errors.pageSize = "Page size must be 10, 25, or 50.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return { ok: true, value: { requesterId: requesterId!, search, categoryId: categoryId ?? undefined, relatedSystemId: relatedSystemId ?? undefined, requestedPriority: requestedPriority as TicketListInput["requestedPriority"], currentStatus: currentStatus as TicketListInput["currentStatus"], sortBy: sortByRaw as TicketListInput["sortBy"], sortDir: sortDirRaw as TicketListInput["sortDir"], page: page!, pageSize: pageSize as TicketListInput["pageSize"] } };
}

const ticketSelect = {
  id: true, ticketNumber: true, ticketDate: true, summary: true, requestedPriority: true,
  itPriority: true, currentStatus: true, updatedAt: true,
  category: { select: { id: true, name: true } }, relatedSystem: { select: { id: true, name: true } },
} satisfies Prisma.TicketSelect;

export async function listTickets(prisma: PrismaClient, input: TicketListInput) {
  const requester = await prisma.developmentRequester.findUnique({ where: { id: input.requesterId, isActive: true }, select: { id: true } });
  if (!requester) return null;
  const where: Prisma.TicketWhereInput = {
    requesterId: input.requesterId,
    ...(input.search ? { OR: [{ ticketNumber: { contains: input.search, mode: "insensitive" } }, { summary: { contains: input.search, mode: "insensitive" } }] } : {}),
    ...(input.categoryId ? { categoryId: input.categoryId } : {}), ...(input.relatedSystemId ? { relatedSystemId: input.relatedSystemId } : {}),
    ...(input.requestedPriority ? { requestedPriority: input.requestedPriority } : {}), ...(input.currentStatus ? { currentStatus: input.currentStatus } : {}),
  };
  const orderBy: Prisma.TicketOrderByWithRelationInput[] = [{ [input.sortBy]: input.sortDir }, { id: input.sortDir }];
  const [items, totalItems] = await Promise.all([
    prisma.ticket.findMany({ where, select: ticketSelect, orderBy, skip: (input.page - 1) * input.pageSize, take: input.pageSize }),
    prisma.ticket.count({ where }),
  ]);
  const totalPages = Math.ceil(totalItems / input.pageSize);
  return { items: items.map((item) => ({ ...item, ticketDate: item.ticketDate.toISOString(), updatedAt: item.updatedAt.toISOString() })), page: input.page, pageSize: input.pageSize, totalItems, totalPages, hasPreviousPage: input.page > 1, hasNextPage: input.page < totalPages };
}
