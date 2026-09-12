import express, { Request, Response } from "express";
import cors from "cors";
import { authRouter } from "./auth/routes.js";
import { ApiError, Identity, invalid, mutationGuard, origin, permittedRoles, protect, exactBody } from "./auth/security.js";
import { RateLimitError } from "./auth/rate-limit.js";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { getPrisma } from "./prisma.js";
import {
  attachmentSelect,
  createAttachment,
  findDownloadableAttachment,
  listAttachments,
  removeAttachment,
  toAttachmentResponse,
} from "./attachments/attachment-service.js";
import {
  attachmentContentDisposition,
  MAX_ATTACHMENT_BYTES,
  sanitizeOriginalFilename,
  validateAttachmentFile,
  validateRemovalReason,
} from "./attachments/attachment-policy.js";
import {
  deleteStoredAttachment,
  readStoredAttachment,
  writeStoredAttachment,
} from "./attachments/attachment-storage.js";
import { createTicket } from "./tickets/create-ticket.js";
import { validateCreateTicket } from "./tickets/ticket-validation.js";
import { listTickets, parseTicketList } from "./tickets/list-tickets.js";
import { listAssignees, parseQueue, staffQueue } from "./tickets/staff-queue.js";
import { staffOperations } from "./tickets/staff-operations.js";
import { communication } from "./tickets/communication.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.set("case sensitive routing", true);
app.use("/api", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
app.use(cors({ origin: (value, done) => done(null, value === origin()), credentials: true,
  methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token", "Idempotency-Key"] }));
app.use(express.json({ limit: "32kb" }));
app.use("/api/auth", authRouter);
app.use("/api", (req, res, next) => {
  if (permittedRoles(req.method, req.path) === null) return next();
  protect(req, res, error => {
    if (error) return next(error);
    if (Object.keys(req.query).some(k => k === "requesterId" || typeof req.query[k] !== "string")) return next(invalid());
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && !req.is("multipart/form-data") && !req.is("application/json")) {
      return next(new ApiError(415, "UNSUPPORTED_TYPE", "Use application/json."));
    }
    if (!/^\/(?:staff\/)?tickets\/?$/.test(req.path) || !["GET", "HEAD"].includes(req.method)) {
      if (Object.keys(req.query).length) return next(invalid());
    }
    next();
  });
});
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_ATTACHMENT_BYTES + 1, files: 1, fields: 8, fieldSize: 1024, parts: 10 } });

function positiveInteger(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" && /^[1-9][0-9]*$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json(categories);
  } catch (error) {
    if (error instanceof ApiError) { sendError(res, error); return; }
    res.status(500).json({ error: "Unable to load request categories", code: "INTERNAL_ERROR" });
  }
});

app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    res.status(200).json(systems);
  } catch (error) {
    if (error instanceof ApiError) { sendError(res, error); return; }
    res.status(500).json({ error: "Unable to load related systems", code: "INTERNAL_ERROR" });
  }
});

app.post("/api/tickets", async (req: Request, res: Response) => {
  try { exactBody(req.body, ["categoryId", "relatedSystemId", "summary", "description", "requestedPriority"]); } catch (error) { sendError(res, error); return; }
  const validation = validateCreateTicket({ ...req.body, requesterId: res.locals.actor.user.id }, req.get("Idempotency-Key"));
  if (!validation.ok) {
    res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      fieldErrors: validation.fieldErrors,
    });
    return;
  }

  try {
    const result = await createTicket(
      getPrisma(),
      validation.value,
      validation.idempotencyKey,
      mutationGuard(res.locals.actor, ["REQUESTER"]),
    );

    if (result.kind === "validation") {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        fieldErrors: result.fieldErrors,
      });
      return;
    }
    if (result.kind === "conflict") {
      res.status(409).json({
        error: "Idempotency-Key was already used for a different ticket.",
        code: "IDEMPOTENCY_CONFLICT",
      });
      return;
    }

    res.status(result.kind === "created" ? 201 : 200).json(result.ticket);
  } catch (error) {
    if (error instanceof ApiError) { sendError(res, error); return; }
    res.status(500).json({
      error: "Unable to create ticket",
      code: "INTERNAL_ERROR",
    });
  }
});

app.get("/api/staff/tickets", async (req: Request, res: Response) => {
  try {
    res.json(await staffQueue(getPrisma(), parseQueue(req.query, res.locals.actor.user.id)));
  } catch (error) {
    if (error instanceof ApiError) { sendError(res, error); return; }
    res.status(500).json({ error: "Unable to load ticket queue", code: "INTERNAL_ERROR" });
  }
});
app.get("/api/staff/assignees", async (_req: Request, res: Response) => {
  try { res.json(await listAssignees(getPrisma())); }
  catch (error) {
    if (error instanceof ApiError) { sendError(res, error); return; }
    res.status(500).json({ error: "Unable to load assignees", code: "INTERNAL_ERROR" });
  }
});
app.get("/api/tickets", async (req: Request, res: Response) => {
  if (Object.keys(req.query).some(k => !["search", "categoryId", "relatedSystemId", "requestedPriority", "currentStatus", "sortBy", "sortDir", "page", "pageSize"].includes(k))) { sendError(res, invalid()); return; }
  const parsed = parseTicketList({ ...req.query, requesterId: String(res.locals.actor.user.id) });
  if (!parsed.ok) {
    res.status(400).json({ error: "Validation failed", code: "VALIDATION_ERROR", fieldErrors: parsed.fieldErrors });
    return;
  }
  try {
    const result = await listTickets(getPrisma(), parsed.value);
    if (result.kind === "validation") {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        fieldErrors: result.fieldErrors,
      });
      return;
    }
    res.status(200).json(result.value);
  } catch (error) {
    if (error instanceof ApiError) { sendError(res, error); return; }
    res.status(500).json({ error: "Unable to load tickets", code: "INTERNAL_ERROR" });
  }
});

app.get("/api/tickets/:ticketId", async (req: Request, res: Response) => {
  const ticketId = positiveInteger(req.params.ticketId);
  const requesterId = (res.locals.actor as Identity).user.role === "REQUESTER" ? res.locals.actor.user.id as number : undefined;
  if (!ticketId || Object.keys(req.query).length) {
    res.status(400).json({ error: "Validation failed", code: "VALIDATION_ERROR" });
    return;
  }
  try {
    const ticket = await getPrisma().ticket.findFirst({
      where: { id: ticketId, ...(requesterId ? { requesterId } : {}) },
      select: {
        id: true,
        ticketNumber: true,
        ticketDate: true,
        summary: true,
        description: true,
        requestedPriority: true,
        itPriority: true,
        currentStatus: true,
        updatedAt: true,
        version: true,
        requesterResolutionIndicatedAt: true,
        resolvedAt: true,
        closedAt: true,
        cancelledAt: true,
        resolutionSummary: true,
        cancellationReason: true,
        requester: { select: { id: true, displayName: true } },
        owner: { select: { id: true, displayName: true, role: true } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        attachments: {
          select: attachmentSelect,
          orderBy: [{ uploadedAt: "asc" }, { id: "asc" }],
        },
      },
    });
    if (!ticket) {
      res.status(404).json({ error: "Ticket is unavailable.", code: "NOT_FOUND" });
      return;
    }
    const { attachments, ...detail } = ticket;
    res.status(200).json({
      ...detail,
      ticketDate: ticket.ticketDate.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      requesterResolutionIndicatedAt: ticket.requesterResolutionIndicatedAt?.toISOString() ?? null,
      resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
      closedAt: ticket.closedAt?.toISOString() ?? null,
      cancelledAt: ticket.cancelledAt?.toISOString() ?? null,
      attachments: attachments.map(toAttachmentResponse),
    });
  } catch (error) {
    if (error instanceof ApiError) { sendError(res, error); return; }
    res.status(500).json({ error: "Unable to load ticket", code: "INTERNAL_ERROR" });
  }
});

app.get("/api/tickets/:ticketId/attachments", async (req: Request, res: Response) => {
  const ticketId = positiveInteger(req.params.ticketId);
  const requesterId = (res.locals.actor as Identity).user.role === "REQUESTER" ? res.locals.actor.user.id as number : undefined;
  if (!ticketId || Object.keys(req.query).length) {
    res.status(400).json({ error: "Validation failed", code: "VALIDATION_ERROR" });
    return;
  }
  try {
    const attachments = await listAttachments(getPrisma(), ticketId, requesterId);
    if (!attachments) {
      res.status(404).json({ error: "Ticket is unavailable.", code: "NOT_FOUND" });
      return;
    }
    res.status(200).json(attachments);
  } catch (error) {
    if (error instanceof ApiError) { sendError(res, error); return; }
    res.status(500).json({ error: "Unable to load attachments", code: "INTERNAL_ERROR" });
  }
});

app.post("/api/tickets/:ticketId/attachments", upload.single("file"), async (req: Request, res: Response) => {
  const ticketId = positiveInteger(req.params.ticketId);
  const requesterId = res.locals.actor.user.id as number;
  if (Object.keys(req.body ?? {}).length) { sendError(res, invalid()); return; }
  if (!ticketId || !requesterId || !req.file) {
    res.status(400).json({ error: "Validation failed", code: "VALIDATION_ERROR" });
    return;
  }
  const policy = validateAttachmentFile(req.file);
  if (!policy.ok) {
    res.status(policy.code === "FILE_TOO_LARGE" ? 413 : 415).json({
      error: policy.code === "FILE_TOO_LARGE"
        ? "Attachment exceeds the 5 MiB limit."
        : "Attachment type is not allowed.",
      code: policy.code,
    });
    return;
  }

  const storageKey = "attachments/" + randomUUID();
  try {
    await writeStoredAttachment(storageKey, req.file.buffer);
    const result = await createAttachment(getPrisma(), {
      ticketId,
      requesterId,
      originalFilename: sanitizeOriginalFilename(req.file.originalname),
      storageKey,
      mimeType: policy.mimeType,
      sizeBytes: req.file.size,
    }, mutationGuard(res.locals.actor, ["REQUESTER"]));
    if (result.kind !== "created") {
      await deleteStoredAttachment(storageKey);
      if (result.kind === "limit") {
        res.status(409).json({
          error: "A ticket can have at most five active attachments.",
          code: "ATTACHMENT_LIMIT",
        });
      } else {
        res.status(404).json({ error: "Ticket is unavailable.", code: "NOT_FOUND" });
      }
      return;
    }
    res.status(201).json(result.attachment);
  } catch (error) {
    await deleteStoredAttachment(storageKey).catch(() => undefined);
    if (error instanceof ApiError) { sendError(res, error); return; }
    res.status(500).json({ error: "Unable to upload attachment", code: "INTERNAL_ERROR" });
  }
});

app.get("/api/attachments/:attachmentId/download", async (req: Request, res: Response) => {
  const attachmentId = positiveInteger(req.params.attachmentId);
  const requesterId = (res.locals.actor as Identity).user.role === "REQUESTER" ? res.locals.actor.user.id as number : undefined;
  if (!attachmentId || Object.keys(req.query).length) {
    res.status(400).json({ error: "Validation failed", code: "VALIDATION_ERROR" });
    return;
  }
  try {
    const attachment = await findDownloadableAttachment(getPrisma(), attachmentId, requesterId);
    if (!attachment) {
      res.status(404).json({ error: "Attachment is unavailable.", code: "NOT_FOUND" });
      return;
    }
    const content = await readStoredAttachment(attachment.storageKey);
    res
      .status(200)
      .type(attachment.mimeType)
      .setHeader("X-Content-Type-Options", "nosniff")
      .setHeader("Content-Disposition", attachmentContentDisposition(attachment.originalFilename))
      .send(content);
  } catch (error) {
    if (error instanceof ApiError) { sendError(res, error); return; }
    res.status(500).json({ error: "Unable to download attachment", code: "INTERNAL_ERROR" });
  }
});

app.delete("/api/attachments/:attachmentId", async (req: Request, res: Response) => {
  const attachmentId = positiveInteger(req.params.attachmentId);
  const requesterId = res.locals.actor.user.id as number;
  try { exactBody(req.body, ["reason"]); } catch (error) { sendError(res, error); return; }
  const reason = validateRemovalReason(req.body?.reason);
  if (!attachmentId || !requesterId || !reason.ok) {
    res.status(400).json({ error: "Validation failed", code: "VALIDATION_ERROR" });
    return;
  }
  try {
    const attachment = await removeAttachment(getPrisma(), attachmentId, requesterId, reason.value, mutationGuard(res.locals.actor, ["REQUESTER"]));
    if (!attachment) {
      res.status(404).json({ error: "Attachment is unavailable.", code: "NOT_FOUND" });
      return;
    }
    res.status(200).json(attachment);
  } catch (error) {
    if (error instanceof ApiError) { sendError(res, error); return; }
    res.status(500).json({ error: "Unable to remove attachment", code: "INTERNAL_ERROR" });
  }
});

app.use("/api", staffOperations);
app.use("/api", communication);
app.use((_req, res) => { res.status(404).json({ error: "Resource is unavailable.", code: "NOT_FOUND" }); });

function sendError(res: Response, error: unknown) {
  if (error instanceof RateLimitError) res.set("Retry-After", String(error.retryAfter));
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: error.message, code: error.code, ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) });
  } else res.status(500).json({ error: "Unable to complete the operation.", code: "INTERNAL_ERROR" });
}
app.use((
  error: unknown,
  _req: Request,
  res: Response,
  next: (error?: unknown) => void,
) => {
  if (
    error instanceof SyntaxError
    && "type" in error
    && error.type === "entity.parse.failed"
  ) {
    res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      fieldErrors: { body: "Request body must be valid JSON." },
    });
    return;
  }
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: "Attachment exceeds the 5 MiB limit.", code: "FILE_TOO_LARGE" });
    return;
  }
  if (error instanceof multer.MulterError) { sendError(res, invalid()); return; }
  if (error && typeof error === "object" && "type" in error && error.type === "entity.too.large") {
    res.status(413).json({ error: "Request body is too large.", code: "BODY_TOO_LARGE" }); return;
  }
  sendError(res, error);
});

export default app;
