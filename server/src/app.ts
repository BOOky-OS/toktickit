import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { createTicket } from "./tickets/create-ticket.js";
import { validateCreateTicket } from "./tickets/ticket-validation.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

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
  next(error);
});

export default app;
