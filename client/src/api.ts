const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export type RequestedPriority = "LOW" | "MEDIUM" | "HIGH";

export interface CreateTicketInput {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
}

export interface CreatedTicket {
  id: number;
  ticketNumber: string;
  ticketDate: string;
  requester: { id: number; displayName: string };
  category: Category;
  relatedSystem: RelatedSystem;
  summary: string;
  requestedPriority: RequestedPriority;
  itPriority: string;
  currentStatus: string;
  description: string;
  attachments: [];
}

export class TicketApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly fieldErrors: Record<string, string> = {}) {
    super(message);
  }
}

export interface DevelopmentRequester {
  id: number;
  displayName: string;
  email: string;
}

export async function getDevelopmentRequesters(): Promise<DevelopmentRequester[]> {
  const response = await fetch(`${API_URL}/api/development-requesters`);
  if (!response.ok) {
    throw new Error(`Requester request failed with status ${response.status}`);
  }
  return (await response.json()) as DevelopmentRequester[];
}

async function getReferenceData<T>(path: string, safeName: string): Promise<T[]> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`Unable to load ${safeName}`);
  return (await response.json()) as T[];
}

export function getCategories(): Promise<Category[]> { return getReferenceData<Category>("/api/categories", "request categories"); }
export function getRelatedSystems(): Promise<RelatedSystem[]> { return getReferenceData<RelatedSystem>("/api/related-systems", "related systems"); }

export async function createTicket(input: CreateTicketInput, idempotencyKey: string): Promise<CreatedTicket> {
  const response = await fetch(`${API_URL}/api/tickets`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) });
  const body = await response.json().catch(() => ({})) as { error?: string; fieldErrors?: Record<string, string> };
  if (!response.ok) throw new TicketApiError(body.error ?? "Unable to create ticket", response.status, body.fieldErrors);
  return body as CreatedTicket;
}

export type TicketSortBy = "updatedAt" | "ticketDate" | "ticketNumber" | "summary";
export interface TicketListOptions {
  search?: string; categoryId?: number; relatedSystemId?: number; requestedPriority?: RequestedPriority;
  currentStatus?: "NEW"; sortBy?: TicketSortBy; sortDir?: "asc" | "desc"; page?: number; pageSize?: 10 | 25 | 50;
}
export interface TicketListItem {
  id: number; ticketNumber: string; ticketDate: string; summary: string; category: Category; relatedSystem: RelatedSystem;
  requestedPriority: RequestedPriority; itPriority: string; currentStatus: string; updatedAt: string;
}
export interface TicketListResponse {
  items: TicketListItem[]; page: number; pageSize: number; totalItems: number; totalPages: number; hasPreviousPage: boolean; hasNextPage: boolean;
}
export async function getTickets(requesterId: number, options: TicketListOptions = {}): Promise<TicketListResponse> {
  const params = new URLSearchParams({ requesterId: String(requesterId) });
  Object.entries(options).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  const response = await fetch(`${API_URL}/api/tickets?${params.toString()}`);
  if (!response.ok) throw new Error("Unable to load tickets");
  return (await response.json()) as TicketListResponse;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

interface HealthResponse {
  status: string;
  service: string;
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthResponse = await fetch(`${API_URL}/api/health`);

  if (!healthResponse.ok) {
    throw new Error(`Health check failed with status ${healthResponse.status}`);
  }

  const health = (await healthResponse.json()) as HealthResponse;
  if (health.status !== "ok" || health.service !== "TokTickIT API") {
    throw new Error("Health check returned an unexpected response");
  }

  const categoryResponse = await fetch(`${API_URL}/api/categories`);
  if (!categoryResponse.ok) {
    throw new Error(`Category request failed with status ${categoryResponse.status}`);
  }

  const categories = (await categoryResponse.json()) as Category[];
  return { online: true, categories };
}
