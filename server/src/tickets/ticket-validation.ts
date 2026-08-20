export const REQUESTED_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type RequestedPriorityValue = typeof REQUESTED_PRIORITIES[number];

export interface ValidCreateTicket {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriorityValue;
  description: string;
}

export type CreateTicketValidation =
  | { ok: true; value: ValidCreateTicket; idempotencyKey: string }
  | { ok: false; fieldErrors: Record<string, string> };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function trimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateCreateTicket(
  input: unknown,
  idempotencyKey: string | undefined,
): CreateTicketValidation {
  const body = input && typeof input === "object"
    ? input as Record<string, unknown>
    : {};
  const fieldErrors: Record<string, string> = {};

  if (!idempotencyKey || !UUID_PATTERN.test(idempotencyKey)) {
    fieldErrors.idempotencyKey = "Idempotency-Key must be a UUID.";
  }
  if (!isPositiveInteger(body.requesterId)) {
    fieldErrors.requesterId = "Requester is required.";
  }
  if (!isPositiveInteger(body.categoryId)) {
    fieldErrors.categoryId = "Category is required.";
  }
  if (!isPositiveInteger(body.relatedSystemId)) {
    fieldErrors.relatedSystemId = "Related System is required.";
  }

  const summary = trimmedString(body.summary);
  if (summary.length < 5 || summary.length > 120) {
    fieldErrors.summary = "Summary must contain 5 to 120 characters.";
  }

  if (
    typeof body.requestedPriority !== "string"
    || !REQUESTED_PRIORITIES.includes(body.requestedPriority as RequestedPriorityValue)
  ) {
    fieldErrors.requestedPriority = "Requested Priority must be LOW, MEDIUM, or HIGH.";
  }

  const description = trimmedString(body.description);
  if (description.length < 20 || description.length > 4000) {
    fieldErrors.description = "Description must contain 20 to 4000 characters.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    idempotencyKey: idempotencyKey!,
    value: {
      requesterId: body.requesterId as number,
      categoryId: body.categoryId as number,
      relatedSystemId: body.relatedSystemId as number,
      summary,
      requestedPriority: body.requestedPriority as RequestedPriorityValue,
      description,
    },
  };
}
