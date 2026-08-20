import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { getPrisma } from "./prisma.js";
import {
  createAttachment,
  findDownloadableAttachment,
  listAttachments,
  removeAttachment,
} from "./attachments/attachment-service.js";
import {
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

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_ATTACHMENT_BYTES } });

function positiveInteger(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
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
  } catch {
    res.status(500).json({ error: "Unable to load request categories" });
  }
});

app.get("/api/development-requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().developmentRequester.findMany({
      where: { isActive: true },
      select: { id: true, displayName: true, email: true },
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
    });
    res.status(200).json(requesters);
  } catch {
    res.status(500).json({ error: "Unable to load development requesters" });
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
  } catch {
    res.status(500).json({ error: "Unable to load related systems" });
  }
});

app.post("/api/tickets", async (req: Request, res: Response) => {
  const validation = validateCreateTicket(req.body, req.get("Idempotency-Key"));
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
  } catch {
    res.status(500).json({
      error: "Unable to create ticket",
      code: "INTERNAL_ERROR",
    });
  }
});

app.get("/api/tickets/:ticketId/attachments", async (req: Request, res: Response) => {
  const ticketId = positiveInteger(req.params.ticketId);
  const requesterId = positiveInteger(req.query.requesterId);
  if (!ticketId || !requesterId) {
    res.status(400).json({ error: "Validation failed", code: "VALIDATION_ERROR" });
    return;
  }
  try {
    const attachments = await listAttachments(getPrisma(), ticketId, requesterId);
    if (!attachments) {
      res.status(404).json({ error: "Ticket is unavailable." });
      return;
    }
    res.status(200).json(attachments);
  } catch {
    res.status(500).json({ error: "Unable to load attachments", code: "INTERNAL_ERROR" });
  }
});

app.post("/api/tickets/:ticketId/attachments", upload.single("file"), async (req: Request, res: Response) => {
  const ticketId = positiveInteger(req.params.ticketId);
  const requesterId = positiveInteger(req.body.requesterId);
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
    });
    if (result.kind !== "created") {
      await deleteStoredAttachment(storageKey);
      if (result.kind === "limit") {
        res.status(409).json({
          error: "A ticket can have at most five active attachments.",
          code: "ATTACHMENT_LIMIT",
        });
      } else {
        res.status(404).json({ error: "Ticket is unavailable." });
      }
      return;
    }
    res.status(201).json(result.attachment);
  } catch {
    await deleteStoredAttachment(storageKey).catch(() => undefined);
    res.status(500).json({ error: "Unable to upload attachment", code: "INTERNAL_ERROR" });
  }
});

app.get("/api/attachments/:attachmentId/download", async (req: Request, res: Response) => {
  const attachmentId = positiveInteger(req.params.attachmentId);
  const requesterId = positiveInteger(req.query.requesterId);
  if (!attachmentId || !requesterId) {
    res.status(400).json({ error: "Validation failed", code: "VALIDATION_ERROR" });
    return;
  }
  try {
    const attachment = await findDownloadableAttachment(getPrisma(), attachmentId, requesterId);
    if (!attachment) {
      res.status(404).json({ error: "Attachment is unavailable." });
      return;
    }
    const content = await readStoredAttachment(attachment.storageKey);
    res
      .status(200)
      .type(attachment.mimeType)
      .setHeader("Content-Disposition", `attachment; filename="${attachment.originalFilename.replace(/"/g, "")}"`)
      .send(content);
  } catch {
    res.status(500).json({ error: "Unable to download attachment", code: "INTERNAL_ERROR" });
  }
});

app.delete("/api/attachments/:attachmentId", async (req: Request, res: Response) => {
  const attachmentId = positiveInteger(req.params.attachmentId);
  const requesterId = positiveInteger(req.body?.requesterId);
  const reason = validateRemovalReason(req.body?.reason);
  if (!attachmentId || !requesterId || !reason.ok) {
    res.status(400).json({ error: "Validation failed", code: "VALIDATION_ERROR" });
    return;
  }
  try {
    const attachment = await removeAttachment(getPrisma(), attachmentId, requesterId, reason.value);
    if (!attachment) {
      res.status(404).json({ error: "Attachment is unavailable." });
      return;
    }
    res.status(200).json(attachment);
  } catch {
    res.status(500).json({ error: "Unable to remove attachment", code: "INTERNAL_ERROR" });
  }
});

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
  next(error);
});

export default app;
