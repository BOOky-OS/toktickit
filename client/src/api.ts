const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMIN";
export interface CurrentUser {
  id: number;
  displayName: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}
type ErrorBody = { error?: string; code?: string; fieldErrors?: Record<string, string> };
let csrfToken = "";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = "",
    public readonly fieldErrors: Record<string, string> = {},
    public readonly retryAfter?: number,
  ) { super(message); }
}
async function responseError(response: Response, fallback: string): Promise<ApiError> {
  const body = await response.json().catch(() => ({})) as ErrorBody;
  return new ApiError(body.error ?? fallback, response.status, body.code, body.fieldErrors,
    response.status === 429 ? Number(response.headers.get("Retry-After") ?? 0) : undefined);
}
async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.method && !["GET", "HEAD"].includes(init.method)) headers.set("X-CSRF-Token", csrfToken);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && path !== "/api/auth/login" && path !== "/api/auth/me") window.dispatchEvent(new Event("toktickit:session-expired"));
  if (response.status === 403) {
    const body = await response.clone().json().catch(() => ({})) as ErrorBody;
    if (body.code === "PASSWORD_CHANGE_REQUIRED") window.dispatchEvent(new Event("toktickit:password-change-required"));
  }
  return response;
}
export function clearAuthTransport() { csrfToken = ""; }
export async function getCsrf(): Promise<string> {
  const response = await apiFetch("/api/auth/csrf");
  if (!response.ok) throw await responseError(response, "Unable to prepare sign in.");
  csrfToken = ((await response.json()) as { csrfToken: string }).csrfToken;
  return csrfToken;
}
export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await apiFetch("/api/auth/me");
  if (!response.ok) throw await responseError(response, "Unable to restore your session.");
  return ((await response.json()) as { user: CurrentUser }).user;
}
export async function login(email: string, password: string): Promise<CurrentUser> {
  await getCsrf();
  const response = await apiFetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }) });
  if (!response.ok) throw await responseError(response, "Unable to sign in.");
  const body = await response.json() as { user: CurrentUser; csrfToken: string };
  csrfToken = body.csrfToken;
  return body.user;
}
export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<CurrentUser> {
  const response = await apiFetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }) });
  if (!response.ok) throw await responseError(response, "Unable to change password.");
  const body = await response.json() as { user: CurrentUser; csrfToken: string };
  csrfToken = body.csrfToken;
  return body.user;
}
export async function logout(): Promise<void> {
  const response = await apiFetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  if (!response.ok) throw await responseError(response, "Unable to sign out.");
  clearAuthTransport();
}


export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export type RequestedPriority = "LOW" | "MEDIUM" | "HIGH";
export type ItPriority = "LOW" | "MEDIUM" | "HIGH" | "UNASSIGNED";
export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";
export type TicketOwner = { id: number; displayName: string; role: UserRole } | null;

export interface CreateTicketInput {
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
  itPriority: ItPriority;
  currentStatus: TicketStatus;
  description: string;
  owner: TicketOwner;
  version: number;
  updatedAt: string;
  requesterResolutionIndicatedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  resolutionSummary: string | null;
  cancellationReason: string | null;
  attachments: [];
}

export interface Attachment {
  id: number; originalFilename: string; mimeType: string; sizeBytes: number; uploadedAt: string;
  state: "ACTIVE" | "REMOVED"; canDownload: boolean; removedAt?: string; removalReason?: string; removedBy?: { id: number; displayName: string } | null;
}
export interface TicketDetail extends Omit<CreatedTicket, "attachments"> { attachments: Attachment[]; }

export class TicketApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly fieldErrors: Record<string, string> = {}) {
    super(message);
  }
}

async function getReferenceData<T>(path: string, safeName: string): Promise<T[]> {
  const response = await apiFetch(path);
  if (!response.ok) throw new Error(`Unable to load ${safeName}`);
  return (await response.json()) as T[];
}

export function getCategories(): Promise<Category[]> { return getReferenceData<Category>("/api/categories", "request categories"); }
export function getRelatedSystems(): Promise<RelatedSystem[]> { return getReferenceData<RelatedSystem>("/api/related-systems", "related systems"); }

export async function createTicket(input: CreateTicketInput, idempotencyKey: string): Promise<CreatedTicket> {
  const response = await apiFetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) });
  const body = await response.json().catch(() => ({})) as { error?: string; fieldErrors?: Record<string, string> };
  if (!response.ok) throw new TicketApiError(body.error ?? "Unable to create ticket", response.status, body.fieldErrors);
  return body as CreatedTicket;
}

export type TicketSortBy = "updatedAt" | "ticketDate" | "ticketNumber" | "summary";
export interface TicketListOptions {
  search?: string; categoryId?: number; relatedSystemId?: number; requestedPriority?: RequestedPriority;
  currentStatus?: TicketStatus; sortBy?: TicketSortBy; sortDir?: "asc" | "desc"; page?: number; pageSize?: 10 | 25 | 50;
}
export interface TicketListItem {
  id: number; ticketNumber: string; ticketDate: string; summary: string; category: Category; relatedSystem: RelatedSystem;
  requestedPriority: RequestedPriority; itPriority: ItPriority; currentStatus: TicketStatus; updatedAt: string; owner: TicketOwner; version: number;
}
export interface TicketListResponse {
  items: TicketListItem[]; page: number; pageSize: number; totalItems: number; totalPages: number; hasPreviousPage: boolean; hasNextPage: boolean;
}
export async function getTickets(options: TicketListOptions = {}): Promise<TicketListResponse> {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  const response = await apiFetch(`/api/tickets${params.size ? `?${params.toString()}` : ""}`);
  if (!response.ok) throw new Error("Unable to load tickets");
  return (await response.json()) as TicketListResponse;
}

export async function getTicket(ticketId: number): Promise<TicketDetail> {
  const response = await apiFetch(`/api/tickets/${ticketId}`);
  if (!response.ok) throw new TicketApiError("Ticket is unavailable", response.status);
  return (await response.json()) as TicketDetail;
}
export async function getAttachments(ticketId: number): Promise<Attachment[]> {
  const response = await apiFetch(`/api/tickets/${ticketId}/attachments`);
  if (!response.ok) throw new TicketApiError("Attachments are unavailable", response.status);
  return (await response.json()) as Attachment[];
}
export async function uploadAttachment(ticketId: number, file: File): Promise<Attachment> {
  const form = new FormData(); form.append("file", file);
  const response = await apiFetch(`/api/tickets/${ticketId}/attachments`, { method: "POST", body: form });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new TicketApiError(body.error ?? "Unable to upload attachment", response.status);
  return body as Attachment;
}
export async function removeAttachment(attachmentId: number, reason: string): Promise<Attachment> {
  const response = await apiFetch(`/api/attachments/${attachmentId}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new TicketApiError(body.error ?? "Unable to remove attachment", response.status);
  return body as Attachment;
}
export function attachmentDownloadUrl(attachmentId: number) { return `${API_URL}/api/attachments/${attachmentId}/download`; }

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

  const categoryResponse = await apiFetch("/api/categories");
  if (!categoryResponse.ok) {
    throw new Error(`Category request failed with status ${categoryResponse.status}`);
  }

  const categories = (await categoryResponse.json()) as Category[];
  return { online: true, categories };
}
