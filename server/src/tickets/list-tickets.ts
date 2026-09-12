import { Prisma, PrismaClient, TicketStatus } from "@prisma/client";

export type TicketListInput = {
  requesterId: number;
  search?: string;
  categoryId?: number;
  relatedSystemId?: number;
  requestedPriority?: "LOW" | "MEDIUM" | "HIGH";
  currentStatus?: TicketStatus;
  sortBy: "updatedAt" | "ticketDate" | "ticketNumber" | "summary";
  sortDir: "asc" | "desc";
  page: number;
  pageSize: 10 | 25 | 50;
};

type ParseResult = { ok: true; value: TicketListInput } | { ok: false; fieldErrors: Record<string, string> };
type ListResult =
  | { kind: "validation"; fieldErrors: Record<string, string> }
  | { kind: "ok"; value: TicketListResponse };

type TicketListResponse = {
  items: Array<{
    id: number;
    ticketNumber: string;
    ticketDate: string;
    summary: string;
    requestedPriority: string;
    itPriority: string;
    currentStatus: string;
    updatedAt: string;
    version: number;
    owner: { id: number; displayName: string; role: string } | null;
    category: { id: number; name: string };
    relatedSystem: { id: number; name: string };
  }>;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

const priorities = ["LOW", "MEDIUM", "HIGH"] as const;
const statuses = Object.values(TicketStatus);
const sortFields = ["updatedAt", "ticketDate", "ticketNumber", "summary"] as const;
const sortDirections = ["asc", "desc"] as const;

function one(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function positive(value: string | undefined) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseTicketList(query: Record<string, unknown>): ParseResult {
  const errors: Record<string, string> = {};
  const requesterId = positive(one(query.requesterId));
  if (!requesterId) errors.requesterId = "Requester is required.";

  const searchRaw = one(query.search);
  const search = searchRaw?.trim();
  if (searchRaw !== undefined && (!search || search.length > 120)) {
    errors.search = "Search must contain 1 to 120 characters.";
  }

  const categoryId = one(query.categoryId) === undefined ? undefined : positive(one(query.categoryId));
  if (one(query.categoryId) !== undefined && !categoryId) errors.categoryId = "Category must be a positive integer.";

  const relatedSystemId = one(query.relatedSystemId) === undefined ? undefined : positive(one(query.relatedSystemId));
  if (one(query.relatedSystemId) !== undefined && !relatedSystemId) errors.relatedSystemId = "Related System must be a positive integer.";

  const requestedPriority = one(query.requestedPriority);
  if (requestedPriority !== undefined && !priorities.includes(requestedPriority as typeof priorities[number])) {
    errors.requestedPriority = "Requested Priority must be LOW, MEDIUM, or HIGH.";
  }

  const currentStatus = one(query.currentStatus);
  if (currentStatus !== undefined && !statuses.includes(currentStatus as TicketStatus)) {
    errors.currentStatus = `Current Status must be one of: ${statuses.join(", ")}.`;
  }

  const sortByRaw = one(query.sortBy) ?? "updatedAt";
  if (!sortFields.includes(sortByRaw as typeof sortFields[number])) errors.sortBy = "Sort field is invalid.";
  const sortDirRaw = one(query.sortDir) ?? "desc";
  if (!sortDirections.includes(sortDirRaw as typeof sortDirections[number])) errors.sortDir = "Sort direction must be asc or desc.";

  const page = one(query.page) === undefined ? 1 : positive(one(query.page));
  if (!page) errors.page = "Page must be a positive integer.";
  const pageSizeRaw = one(query.pageSize);
  const pageSize = pageSizeRaw === undefined ? 10 : Number(pageSizeRaw);
  if (![10, 25, 50].includes(pageSize)) errors.pageSize = "Page size must be 10, 25, or 50.";
  if (page && [10, 25, 50].includes(pageSize)) {
    const offset = BigInt(page - 1) * BigInt(pageSize);
    if (offset > 1_000_000n) errors.page = "Page offset must not exceed 1,000,000 rows.";
  }

  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    value: {
      requesterId: requesterId!,
      search,
      categoryId: categoryId ?? undefined,
      relatedSystemId: relatedSystemId ?? undefined,
      requestedPriority: requestedPriority as TicketListInput["requestedPriority"],
      currentStatus: currentStatus as TicketListInput["currentStatus"],
      sortBy: sortByRaw as TicketListInput["sortBy"],
      sortDir: sortDirRaw as TicketListInput["sortDir"],
      page: page!,
      pageSize: pageSize as TicketListInput["pageSize"],
    },
  };
}

const ticketSelect = {
  id: true,
  ticketNumber: true,
  ticketDate: true,
  summary: true,
  requestedPriority: true,
  itPriority: true,
  currentStatus: true,
  updatedAt: true,
  version: true,
  owner: { select: { id: true, displayName: true, role: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
} satisfies Prisma.TicketSelect;

function escapeContains(value: string): string {
  return value.replace(/[\\%_]/g, character => `\\${character}`);
}

export async function listTickets(prisma: PrismaClient, input: TicketListInput): Promise<ListResult> {
  return prisma.$transaction(async tx => {
    const [requester, category, relatedSystem] = await Promise.all([
      tx.user.findUnique({
        where: { id: input.requesterId, isActive: true, role: "REQUESTER" },
        select: { id: true },
      }),
      input.categoryId
        ? tx.category.findUnique({ where: { id: input.categoryId, isActive: true }, select: { id: true } })
        : Promise.resolve({ id: 0 }),
      input.relatedSystemId
        ? tx.relatedSystem.findUnique({ where: { id: input.relatedSystemId, isActive: true }, select: { id: true } })
        : Promise.resolve({ id: 0 }),
    ]);

    const fieldErrors: Record<string, string> = {};
    if (!requester) fieldErrors.requesterId = "Selected Requester is unavailable.";
    if (!category) fieldErrors.categoryId = "Selected Category is unavailable.";
    if (!relatedSystem) fieldErrors.relatedSystemId = "Selected Related System is unavailable.";
    if (Object.keys(fieldErrors).length) return { kind: "validation", fieldErrors } as const;

    const search = input.search ? escapeContains(input.search) : undefined;
    const where: Prisma.TicketWhereInput = {
      requesterId: input.requesterId,
      ...(search ? {
        OR: [
          { ticketNumber: { contains: search, mode: "insensitive" } },
          { summary: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.relatedSystemId ? { relatedSystemId: input.relatedSystemId } : {}),
      ...(input.requestedPriority ? { requestedPriority: input.requestedPriority } : {}),
      ...(input.currentStatus ? { currentStatus: input.currentStatus } : {}),
    };
    const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
      { [input.sortBy]: input.sortDir },
      { id: input.sortDir },
    ];
    const [items, totalItems] = await Promise.all([
      tx.ticket.findMany({
        where,
        select: ticketSelect,
        orderBy,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      tx.ticket.count({ where }),
    ]);
    const totalPages = Math.ceil(totalItems / input.pageSize);
    return {
      kind: "ok",
      value: {
        items: items.map(item => ({
          ...item,
          ticketDate: item.ticketDate.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        page: input.page,
        pageSize: input.pageSize,
        totalItems,
        totalPages,
        hasPreviousPage: input.page > 1,
        hasNextPage: input.page < totalPages,
      },
    } as const;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
