import { ChangeEvent, useEffect, useState } from "react";
import {
  Attachment,
  attachmentDownloadUrl,
  getAttachments,
  getTicket,
  removeAttachment,
  TicketApiError,
  TicketDetail as TicketDetailData,
  uploadAttachment,
} from "./api.js";

type DetailState = "loading" | "ready" | "error" | "unavailable";
const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const maxBytes = 5 * 1024 * 1024;
const NO_RETRY_FILES: File[] = [];

function enumLabel(value: string) {
  return value
    .split("_")
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function TicketDetail({
  ticketId,
  onBack,
  retryFiles = NO_RETRY_FILES,
  onRetryFilesChange,
  readOnly = false,
}: {
  ticketId: number;
  onBack: () => void;
  retryFiles?: File[];
  readOnly?: boolean;
  onRetryFilesChange?: (files: File[]) => void;
}) {
  const [state, setState] = useState<DetailState>("loading");
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pendingRetries, setPendingRetries] = useState<File[]>(retryFiles);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<Attachment | null>(null);
  const [reason, setReason] = useState("");
  const [removalBusy, setRemovalBusy] = useState(false);
  const activeCount = attachments.filter(file => file.state === "ACTIVE").length;

  useEffect(() => {
    setPendingRetries(retryFiles);
  }, [retryFiles]);

  function updatePending(files: File[]) {
    setPendingRetries(files);
    onRetryFilesChange?.(files);
  }

  async function load() {
    setState("loading");
    setMessage("");
    try {
      const [detail, files] = await Promise.all([
        getTicket(ticketId),
        getAttachments(ticketId),
      ]);
      setTicket(detail);
      setAttachments(files);
      setState("ready");
    } catch (error) {
      setState(
        error instanceof TicketApiError && error.status === 404
          ? "unavailable"
          : "error",
      );
    }
  }

  useEffect(() => {
    void load();
  }, [ticketId]);

  function validFile(file: File) {
    return allowedTypes.includes(file.type) && file.size <= maxBytes;
  }

  async function saveFile(file: File): Promise<boolean> {
    if (activeCount >= 5) {
      setMessageTone("error");
      setMessage("This Ticket already has the maximum of five active attachments.");
      return false;
    }
    if (!validFile(file)) {
      setMessageTone("error");
      setMessage("Choose a JPG, PNG, WEBP, or PDF no larger than 5 MiB.");
      return false;
    }

    setUploading(true);
    setMessage("");
    try {
      const saved = await uploadAttachment(ticketId, file);
      setAttachments(current => [...current, saved]);
      setTicket(current => current ? { ...current, version: current.version + 1 } : current);
      setMessageTone("success");
      setMessage(`${file.name} uploaded successfully.`);
      return true;
    } catch (error) {
      setMessageTone("error");
      setMessage(
        error instanceof TicketApiError
          ? error.message
          : "Unable to upload attachment.",
      );
      return false;
    } finally {
      setUploading(false);
    }
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await saveFile(file);
  }

  async function retryFile(index: number) {
    const file = pendingRetries[index];
    if (!file) return;
    if (await saveFile(file)) {
      updatePending(pendingRetries.filter((_, currentIndex) => currentIndex !== index));
    }
  }

  async function confirmRemoval() {
    if (!removing || reason.trim().length < 5) return;
    setRemovalBusy(true);
    setMessage("");
    try {
      const updated = await removeAttachment(removing.id, reason);
      setAttachments(current =>
        current.map(file => file.id === updated.id ? updated : file),
      );
      setTicket(current => current ? { ...current, version: current.version + 1 } : current);
      setRemoving(null);
      setReason("");
      setMessageTone("success");
      setMessage("Attachment removed. Its metadata is retained.");
    } catch {
      setMessageTone("error");
      setMessage("Unable to remove attachment. The file remains active.");
    } finally {
      setRemovalBusy(false);
    }
  }

  if (state === "loading") {
    return (
      <main className="page-content" id="main-content">
        <p className="notice" role="status">Loading Ticket Detail...</p>
      </main>
    );
  }

  if (state === "unavailable") {
    return (
      <main className="page-content" id="main-content">
        <section className="zen-empty-state">
          <h1>Ticket unavailable</h1>
          <p>This Ticket does not exist or is not available to your signed-in account.</p>
          <button className="zen-button zen-button--secondary" onClick={onBack}>
            {readOnly ? "Back to Ticket Queue" : "Back to My Tickets"}
          </button>
        </section>
      </main>
    );
  }

  if (state === "error" || !ticket) {
    return (
      <main className="page-content" id="main-content">
        <div className="alert alert-danger" role="alert">
          Unable to load Ticket Detail.{" "}
          <button className="btn btn-link p-0" onClick={() => void load()}>Retry</button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-content" id="main-content">
      <button className="ticket-link mb-3" onClick={onBack}>{readOnly ? "Back to Ticket Queue" : "Back to My Tickets"}</button>
      <section className="ticket-card">
        <div className="ticket-heading">
          <div>
            <p className="eyebrow">{readOnly ? "Ticket Detail (read-only)" : "Requester Ticket Detail"}</p>
            <h1>{ticket.ticketNumber}</h1>
          </div>
          <span className="zen-badge">{enumLabel(ticket.currentStatus)}</span>
        </div>
        <dl className="detail-grid">
          <Detail label="Ticket Date" value={new Date(ticket.ticketDate).toLocaleString()} />
          <Detail label="Last Updated" value={new Date(ticket.updatedAt).toLocaleString()} />
          <Detail label="Requester" value={ticket.requester.displayName} />
          <Detail label="Owner" value={ticket.owner?.displayName ?? "Unassigned"} />
          <Detail label="Category" value={ticket.category.name} />
          <Detail label="Related System" value={ticket.relatedSystem.name} />
          <Detail label="Requested Priority" value={enumLabel(ticket.requestedPriority)} />
          <Detail label="IT Priority" value={enumLabel(ticket.itPriority)} />
          <Detail label="Version" value={String(ticket.version)} />
          <Detail label="Summary" value={ticket.summary} wide />
          <Detail label="Description" value={ticket.description} wide />
          {ticket.requesterResolutionIndicatedAt && (
            <Detail
              label="Requester resolution indicated"
              value={new Date(ticket.requesterResolutionIndicatedAt).toLocaleString()}
            />
          )}
          {ticket.resolvedAt && <Detail label="Resolved At" value={new Date(ticket.resolvedAt).toLocaleString()} />}
          {ticket.closedAt && <Detail label="Closed At" value={new Date(ticket.closedAt).toLocaleString()} />}
          {ticket.cancelledAt && <Detail label="Cancelled At" value={new Date(ticket.cancelledAt).toLocaleString()} />}
          {ticket.resolutionSummary && <Detail label="Resolution Summary" value={ticket.resolutionSummary} wide />}
          {ticket.cancellationReason && <Detail label="Cancellation Reason" value={ticket.cancellationReason} wide />}
        </dl>

        {pendingRetries.length > 0 && (
          <section className="attachment-section" aria-labelledby="retry-attachments">
            <h2 id="retry-attachments">Files that still need upload</h2>
            <p>The Ticket is saved. Retry each failed file from this page.</p>
            <ul className="attachment-list">
              {pendingRetries.map((file, index) => (
                <li key={`${file.name}-${file.size}-${index}`}>
                  <span>{file.name} ({Math.ceil(file.size / 1024)} KB)</span>
                  <button
                    className="zen-button zen-button--secondary"
                    disabled={uploading || activeCount >= 5}
                    onClick={() => void retryFile(index)}
                  >
                    {uploading ? "Uploading..." : "Retry upload"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="attachment-section" aria-labelledby="detail-attachments">
          <div className="ticket-heading">
            <div>
              <h2 id="detail-attachments">Attachments</h2>
              <p>
                {activeCount} active file{activeCount === 1 ? "" : "s"}. Removed metadata is retained.
              </p>
            </div>
            {!readOnly && <><label
              className={`zen-button zen-button--secondary ${uploading ? "zen-button--busy" : ""} ${activeCount >= 5 ? "zen-button--disabled" : ""}`}
              htmlFor="detail-file"
              aria-disabled={uploading || activeCount >= 5}
            >
              {uploading
                ? "Uploading..."
                : activeCount >= 5
                  ? "Attachment limit reached"
                  : "Add attachment"}
            </label>
            <input
              className="visually-hidden"
              id="detail-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={uploading || activeCount >= 5}
              onChange={selectFile}
            /></>}
          </div>
          {message && (
            <p
              className={messageTone === "success" ? "success-message" : "field-error"}
              role={messageTone === "success" ? "status" : "alert"}
            >
              {message}
            </p>
          )}
          {attachments.length === 0 ? (
            <p className="zen-empty-state">No attachments.</p>
          ) : (
            <ul className="attachment-list">
              {attachments.map(file => (
                <li key={file.id}>
                  <div>
                    <strong>{file.originalFilename}</strong>
                    <br />
                    <small>
                      {file.mimeType} &bull; {Math.ceil(file.sizeBytes / 1024)} KB &bull;{" "}
                      {new Date(file.uploadedAt).toLocaleString()}
                    </small>
                    {file.state === "REMOVED" && (
                      <>
                        <br />
                        <span className="zen-badge">Removed</span>{" "}
                        <small>
                          {file.removedAt && new Date(file.removedAt).toLocaleString()}{" "}
                          &mdash; {file.removalReason}
                          {file.removedBy ? ` by ${file.removedBy.displayName}` : ""}
                        </small>
                      </>
                    )}
                  </div>
                  {file.state === "ACTIVE" && (
                    <div className="attachment-actions">
                      <a
                        className="zen-button zen-button--secondary"
                        href={attachmentDownloadUrl(file.id)}
                      >
                        Download
                      </a>
                      {!readOnly && <button
                        className="zen-button zen-button--danger"
                        onClick={() => {
                          setRemoving(file);
                          setReason("");
                        }}
                      >
                        Remove
                      </button>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

      {removing && (
        <div className="dialog-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="remove-title">
            <h2 id="remove-title">Remove attachment?</h2>
            <p>The file will no longer be downloadable, but its metadata will be retained.</p>
            <label htmlFor="removal-reason">Removal reason</label>
            <textarea
              id="removal-reason"
              className="zen-field"
              value={reason}
              maxLength={250}
              aria-describedby="removal-reason-help"
              onChange={event => setReason(event.target.value)}
            />
            <small id="removal-reason-help">Required: 5-250 characters.</small>
            <div className="ticket-actions">
              <button
                className="zen-button zen-button--secondary"
                disabled={removalBusy}
                onClick={() => setRemoving(null)}
              >
                Cancel
              </button>
              <button
                className="zen-button zen-button--danger"
                disabled={removalBusy || reason.trim().length < 5 || reason.trim().length > 250}
                onClick={() => void confirmRemoval()}
              >
                {removalBusy ? "Removing..." : "Remove attachment"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "detail-wide" : ""}>
      <dt>{label}</dt>
      <dd className="zen-field zen-field--readonly">{value}</dd>
    </div>
  );
}
