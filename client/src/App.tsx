import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  Category,
  checkSystem,
  createTicket,
  CreatedTicket,
  getCategories,
  getRelatedSystems,
  RelatedSystem,
  RequestedPriority,
  TicketApiError,
  uploadAttachment,
} from "./api.js";
import { AuthProvider, homeFor, navigate, useAuth } from "./AuthContext.js";
import { ApplicationShell, ChangePasswordScreen, LoginScreen, SessionFailure, SessionLoading } from "./AuthScreens.js";
import type { UserRole } from "./api.js";
import { MyTickets } from "./MyTickets.js";
import { StaffTicketQueue } from "./StaffTicketQueue.js";
import { TicketDetail } from "./TicketDetail.js";
import "./theme.css";
import "./auth.css";

type UiState = "idle" | "loading" | "success" | "error";
type FormState = {
  categoryId: string;
  relatedSystemId: string;
  requestedPriority: RequestedPriority;
  summary: string;
  description: string;
};
const EMPTY_FORM: FormState = {
  categoryId: "",
  relatedSystemId: "",
  requestedPriority: "MEDIUM",
  summary: "",
  description: "",
};
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function newSubmissionKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function Field({
  label,
  id,
  error,
  wide = false,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "ticket-grid-wide" : ""}>
      <label htmlFor={id}>
        {label}{" "}
        <span className="required-marker" aria-hidden="true">
          *
        </span>
      </label>
      {children}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function CreateTicket({
  goHome,
  goDetail,
}: {
  goHome: () => void;
  goDetail: (ticketId: number, retryFiles?: File[]) => void;
}) {
  const { user: currentRequester } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [referenceState, setReferenceState] = useState<UiState>("loading");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionLabel, setSubmissionLabel] = useState(
    "Submitting ticket...",
  );
  const [created, setCreated] = useState<CreatedTicket | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadFailures, setUploadFailures] = useState<File[]>([]);
  const submission = useRef<{ fingerprint: string; key: string } | null>(null);
  async function loadReferenceData() {
    setReferenceState("loading");
    try {
      const [loadedCategories, loadedSystems] = await Promise.all([
        getCategories(),
        getRelatedSystems(),
      ]);
      setCategories(loadedCategories);
      setSystems(loadedSystems);
      setReferenceState("success");
    } catch {
      setReferenceState("error");
    }
  }
  useEffect(() => {
    void loadReferenceData();
  }, []);
  function update(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
  }
  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    const summary = form.summary.trim();
    const description = form.description.trim();
    if (!form.categoryId) errors.categoryId = "Choose a category.";
    if (!form.relatedSystemId)
      errors.relatedSystemId = "Choose a related system.";
    if (summary.length < 5 || summary.length > 120)
      errors.summary = "Summary must contain 5 to 120 characters.";
    if (description.length < 20 || description.length > 4000)
      errors.description = "Description must contain 20 to 4000 characters.";
    return errors;
  }
  function onFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const proposed = Array.from(event.target.files ?? []);
    const invalid = proposed.find(
      (file) =>
        !ALLOWED_FILE_TYPES.includes(file.type) ||
        file.size > MAX_ATTACHMENT_BYTES,
    );
    if (files.length + proposed.length > 5)
      setFileError("You can select at most five attachments.");
    else if (invalid)
      setFileError(
        "Attachments must be JPG, PNG, WEBP, or PDF and no larger than 5 MiB.",
      );
    else {
      setFiles((current) => [...current, ...proposed]);
      setFileError("");
    }
    event.target.value = "";
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0 || !currentRequester) {
      setFieldErrors(errors);
      return;
    }
    setSubmitting(true);
    setSubmissionLabel("Creating ticket...");
    setApiError("");
    try {
      const input = {
        categoryId: Number(form.categoryId),
        relatedSystemId: Number(form.relatedSystemId),
        summary: form.summary.trim(),
        requestedPriority: form.requestedPriority,
        description: form.description.trim(),
      };
      const fingerprint = JSON.stringify(input);
      if (!submission.current || submission.current.fingerprint !== fingerprint) {
        submission.current = { fingerprint, key: newSubmissionKey() };
      }
      const ticket = await createTicket(input, submission.current.key);
      submission.current = null;
      let completedUploads = 0;
      const failedUploads: File[] = [];
      for (const [index, file] of files.entries()) {
        setSubmissionLabel(
          `Uploading attachment ${index + 1} of ${files.length}...`,
        );
        try {
          await uploadAttachment(ticket.id, file);
          completedUploads += 1;
        } catch {
          failedUploads.push(file);
        }
      }
      setUploadedCount(completedUploads);
      setUploadFailures(failedUploads);
      setCreated(ticket);
    } catch (error) {
      if (
        error instanceof TicketApiError &&
        Object.keys(error.fieldErrors).length > 0
      )
        setFieldErrors(error.fieldErrors);
      else
        setApiError(
          "We could not create your ticket. Your entered details are still here; please retry.",
        );
    } finally {
      setSubmitting(false);
      setSubmissionLabel("Submitting ticket...");
    }
  }
  if (created)
    return (
      <main className="page-content" id="main-content">
        <section className="zen-empty-state success-panel" aria-live="polite">
          <p className="eyebrow">Ticket submitted</p>
          <h1>Ticket {created.ticketNumber} has been created</h1>
          <p>
            Keep this official ticket number for your next action. Your status
            is <span className="zen-badge">{created.currentStatus}</span>.
          </p>
          {uploadedCount > 0 && (
            <p className="success-message" role="status">
              {uploadedCount} attachment{uploadedCount === 1 ? "" : "s"}{" "}
              uploaded successfully.
            </p>
          )}
          {uploadFailures.length > 0 && (
            <div className="warning-message" role="alert">
              <strong>
                The Ticket was created, but some files were not uploaded.
              </strong>
              <p>Open Ticket Detail to retry: {uploadFailures.map(file => file.name).join(", ")}</p>
            </div>
          )}
          <div className="success-actions">
            <button
              className="zen-button zen-button--primary"
              onClick={() => goDetail(created.id, uploadFailures)}
            >
              View Ticket Detail
            </button>
            <button
              className="zen-button zen-button--secondary"
              onClick={goHome}
            >
              Go to My Tickets
            </button>
            <button
              className="zen-button zen-button--secondary"
              onClick={() => {
                setCreated(null);
                setForm(EMPTY_FORM);
                setFiles([]);
                setUploadedCount(0);
                setUploadFailures([]);
                submission.current = null;
              }}
            >
              Create another ticket
            </button>
          </div>
        </section>
      </main>
    );
  return (
    <main className="page-content" id="main-content">
      <section className="ticket-card" aria-labelledby="create-ticket-title">
        <div className="ticket-heading">
          <div>
            <p className="eyebrow">New service request</p>
            <h1 id="create-ticket-title">Create Ticket</h1>
            <p className="text-secondary mb-0">
              Fields marked required are needed before you submit.
            </p>
          </div>
          <span className="zen-badge">NEW</span>
        </div>
        {referenceState === "loading" && (
          <p className="notice" role="status">
            Loading ticket options...
          </p>
        )}
        {referenceState === "error" && (
          <div className="alert alert-danger" role="alert">
            Unable to load ticket options.{" "}
            <button
              className="btn btn-link p-0"
              onClick={() => void loadReferenceData()}
            >
              Retry
            </button>
          </div>
        )}
        <form onSubmit={submit} noValidate>
          <div className="ticket-system-grid">
            <div>
              <label htmlFor="ticket-number">Ticket Number</label>
              <input
                id="ticket-number"
                className="zen-field zen-field--readonly"
                value="Generated after submission"
                readOnly
              />
            </div>
            <div>
              <label htmlFor="ticket-date">Ticket Date</label>
              <input
                id="ticket-date"
                className="zen-field zen-field--readonly"
                value="Set when saved"
                readOnly
              />
            </div>
            <div>
              <label htmlFor="ticket-requester">Requester</label>
              <input
                id="ticket-requester"
                className="zen-field zen-field--readonly"
                value={currentRequester?.displayName ?? ""}
                readOnly
              />
            </div>
          </div>
          <div className="ticket-grid">
            <div>
              <label htmlFor="ticket-priority">
                Requested Priority{" "}
                <span className="required-marker" aria-hidden="true">
                  *
                </span>
              </label>
              <select
                id="ticket-priority"
                className="zen-field"
                value={form.requestedPriority}
                onChange={(event) =>
                  update("requestedPriority", event.target.value)
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label htmlFor="ticket-it-priority">IT Priority</label>
              <input
                id="ticket-it-priority"
                className="zen-field zen-field--readonly"
                value={form.requestedPriority.charAt(0) + form.requestedPriority.slice(1).toLowerCase()}
                readOnly
              />
            </div>
            <div>
              <label htmlFor="ticket-status">Current Status</label>
              <input
                id="ticket-status"
                className="zen-field zen-field--readonly"
                value="New"
                readOnly
              />
            </div>
            <Field
              label="Category"
              id="ticket-category"
              error={fieldErrors.categoryId}
            >
              <select
                id="ticket-category"
                className={`zen-field ${fieldErrors.categoryId ? "zen-field--invalid" : ""}`}
                value={form.categoryId}
                disabled={referenceState !== "success" || submitting}
                onChange={(event) => update("categoryId", event.target.value)}
              >
                <option value="">Choose a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Related System"
              id="ticket-system"
              error={fieldErrors.relatedSystemId}
            >
              <select
                id="ticket-system"
                className={`zen-field ${fieldErrors.relatedSystemId ? "zen-field--invalid" : ""}`}
                value={form.relatedSystemId}
                disabled={referenceState !== "success" || submitting}
                onChange={(event) =>
                  update("relatedSystemId", event.target.value)
                }
              >
                <option value="">Choose a related system</option>
                {systems.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Summary"
              id="ticket-summary"
              error={fieldErrors.summary}
              wide
            >
              <input
                id="ticket-summary"
                className={`zen-field ${fieldErrors.summary ? "zen-field--invalid" : ""}`}
                value={form.summary}
                maxLength={120}
                onChange={(event) => update("summary", event.target.value)}
                aria-describedby="summary-help"
                disabled={submitting}
              />
              <small id="summary-help">5-120 characters</small>
            </Field>
            <Field
              label="Description"
              id="ticket-description"
              error={fieldErrors.description}
              wide
            >
              <textarea
                id="ticket-description"
                className={`zen-field ${fieldErrors.description ? "zen-field--invalid" : ""}`}
                rows={5}
                value={form.description}
                maxLength={4000}
                onChange={(event) => update("description", event.target.value)}
                aria-describedby="description-help"
                disabled={submitting}
              />
              <small id="description-help">20-4,000 characters</small>
            </Field>
          </div>
          <section
            className="attachment-section"
            aria-labelledby="attachment-title"
          >
            <h2 id="attachment-title">Attachments</h2>
            <p>
              Optional: JPG, PNG, WEBP, or PDF, up to 5 MiB each; maximum five
              files.
            </p>
            <label
              className="zen-button zen-button--secondary"
              htmlFor="ticket-attachments"
            >
              Select files
            </label>
            <input
              id="ticket-attachments"
              className="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={onFilesSelected}
              disabled={submitting}
            />
            {fileError && (
              <p className="field-error" role="alert">
                {fileError}
              </p>
            )}
            {files.length > 0 && (
              <ul className="attachment-list">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    <span>
                      {file.name} ({Math.ceil(file.size / 1024)} KB)
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      disabled={submitting}
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((_, fileIndex) => fileIndex !== index),
                        )
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {apiError && (
            <div className="alert alert-danger" role="alert">
              {apiError}
            </div>
          )}
          <div className="ticket-actions">
            <button
              className="zen-button zen-button--secondary"
              type="button"
              disabled={submitting}
              onClick={() => {
                setForm(EMPTY_FORM);
                setFiles([]);
                setFieldErrors({});
                setFileError("");
                submission.current = null;
              }}
            >
              Clear form
            </button>
            <button
              className={`zen-button zen-button--primary ${submitting ? "zen-button--busy" : ""}`}
              type="submit"
              disabled={submitting || referenceState !== "success"}
            >
              {submitting ? submissionLabel : "Submit Ticket"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function ServiceDesk() {
  const [path, setPath] = useState(window.location.pathname);
  const [systemState, setSystemState] = useState<UiState>("idle");
  const [healthCategories, setHealthCategories] = useState<Category[]>([]);
  const [systemError, setSystemError] = useState("");
  const [pendingRetry, setPendingRetry] = useState<{ ticketId: number; files: File[] } | null>(null);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  async function handleCheck() {
    setSystemState("loading");
    try {
      const result = await checkSystem();
      setHealthCategories(result.categories);
      setSystemState(result.online ? "success" : "error");
    } catch {
      setHealthCategories([]);
      setSystemError("Unable to connect to TokTickIT API");
      setSystemState("error");
    }
  }
  const detail = /^\/tickets\/([1-9][0-9]*)$/.exec(path);
  return (
    <>
      <nav className="app-nav" aria-label="Service desk">
        <button className={path === "/my-tickets" || detail ? "active" : ""} aria-current={path === "/my-tickets" || detail ? "page" : undefined}
          onClick={() => navigate("/my-tickets")}>My Tickets</button>
        <button className={path === "/tickets/new" ? "active" : ""} aria-current={path === "/tickets/new" ? "page" : undefined}
          onClick={() => navigate("/tickets/new")}>Create Ticket</button>
      </nav>
      {path === "/tickets/new" ? (
        <CreateTicket
          goHome={() => navigate("/my-tickets")}
          goDetail={(ticketId, files = []) => {
            setPendingRetry(files.length ? { ticketId, files } : null);
            navigate(`/tickets/${ticketId}`);
          }}
        />
      ) : detail ? (
        <TicketDetail
          ticketId={Number(detail[1])}
          onBack={() => navigate("/my-tickets")}
          retryFiles={pendingRetry?.ticketId === Number(detail[1]) ? pendingRetry.files : []}
          onRetryFilesChange={files => setPendingRetry(files.length ? { ticketId: Number(detail[1]), files } : null)}
        />
      ) : (
        <>
          <MyTickets onCreate={() => navigate("/tickets/new")} onOpen={ticketId => navigate(`/tickets/${ticketId}`)} />
          <section className="container pb-4" style={{ maxWidth: 1100 }}>
            <button className="btn btn-success" onClick={handleCheck} disabled={systemState === "loading"}>
              {systemState === "loading" ? "Loading..." : "Check System"}
            </button>
            {systemState === "success" && (
              <section className="mt-3" aria-live="polite">
                <div className="alert alert-success" role="status"><strong>System Status:</strong> Online</div>
                <h2 className="h5">Supported Request Categories</h2>
                <ol className="list-group list-group-numbered">
                  {healthCategories.map((category) => <li className="list-group-item" key={category.id}>{category.name}</li>)}
                </ol>
              </section>
            )}
            {systemState === "error" && <div className="alert alert-danger mt-3" role="alert">
              <p className="mb-1"><strong>System Status:</strong> Offline</p><p className="mb-0">{systemError}</p>
            </div>}
          </section>
        </>
      )}
    </>
  );
}
function PlannedRoleHome() {
  const { user } = useAuth();
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const admin = user?.role === "ADMIN";
  const ticketDetail = /^\/tickets\/[1-9][0-9]*$/.test(path);
  return <>
    <nav className="app-nav" aria-label="Service desk">
      {admin && <button className={path === "/admin/users" ? "active" : ""} aria-current={path === "/admin/users" ? "page" : undefined}
        onClick={() => navigate("/admin/users")}>Users</button>}
      <button className={path === "/staff/tickets" ? "active" : ""} aria-current={path === "/staff/tickets" ? "page" : undefined}
        onClick={() => navigate("/staff/tickets")}>Ticket Queue{admin ? " (read-only)" : ""}</button>
    </nav>
    {path === "/staff/tickets" ? <StaffTicketQueue admin={admin} onOpen={id => navigate("/tickets/" + id)} onHome={() => navigate(homeFor(user!.role))} />
      : ticketDetail ? <TicketDetail ticketId={Number(path.split("/")[2])} readOnly staffEditable={!admin} onBack={() => navigate("/staff/tickets")} />
      : <main className="page-content" id="main-content">
      <section className="zen-empty-state">
        <p className="eyebrow">{admin && (path === "/staff/tickets" || ticketDetail) ? "Administrator read-only access" : "Role workspace"}</p>
        <h1>{ticketDetail ? "Ticket Detail" : path === "/staff/tickets" ? "Ticket Queue" : "User Management"}</h1>
        <p>This destination is available to {user?.displayName} under the signed-in role.</p>
      </section>
    </main>}
  </>;
}
function AccessUnavailable() {
  const { user } = useAuth();
  return <main className="page-content" id="main-content"><section className="zen-empty-state">
    <p className="eyebrow">Access unavailable</p><h1>This page is not available for your role</h1>
    <p>Your signed-in account does not have permission to open this destination.</p>
    <button className="zen-button zen-button--primary" onClick={() => navigate(homeFor(user!.role))}>Go to my home</button>
  </section></main>;
}
function routeAllowed(role: UserRole, path: string) {
  if (path === "/change-password") return true;
  if (role === "REQUESTER") return path === "/my-tickets" || path === "/tickets/new" || /^\/tickets\/[1-9][0-9]*$/.test(path);
  if (role === "IT_STAFF") return path === "/staff/tickets" || /^\/tickets\/[1-9][0-9]*$/.test(path);
  return path === "/admin/users" || path === "/staff/tickets" || /^\/tickets\/[1-9][0-9]*$/.test(path);
}
function AuthenticatedApp() {
  const { user } = useAuth();
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  if (!user) return null;
  if (user.mustChangePassword) return <ChangePasswordScreen />;
  if (path === "/change-password") return <ApplicationShell><ChangePasswordScreen /></ApplicationShell>;
  const content = !routeAllowed(user.role, path) ? <AccessUnavailable /> :
    user.role === "REQUESTER" ? <ServiceDesk /> : <PlannedRoleHome />;
  return <ApplicationShell>{content}</ApplicationShell>;
}
function AppContent() {
  const { state } = useAuth();
  return <>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    {state === "loading" ? <SessionLoading /> :
      state === "error" ? <SessionFailure /> :
      state === "anonymous" ? <LoginScreen /> : <AuthenticatedApp />}
  </>;
}
export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
