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

export function TicketDetail({
  ticketId,
  requesterId,
  onBack,
}: {
  ticketId: number;
  requesterId: number;
  onBack: () => void;
}) {
  const [state, setState] = useState<DetailState>("loading");
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<Attachment | null>(null);
  const [reason, setReason] = useState("");
  const [removalBusy, setRemovalBusy] = useState(false);

  async function load() {
    setState("loading");
    setMessage("");
    try {
      const [detail, files] = await Promise.all([
        getTicket(ticketId, requesterId),
        getAttachments(ticketId, requesterId),
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
  }, [ticketId, requesterId]);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (activeCount >= 5) {
      setMessageTone("error");
      setMessage(
        "This Ticket already has the maximum of five active attachments.",
      );
      return;
    }
    if (!allowedTypes.includes(file.type) || file.size > maxBytes) {
      setMessageTone("error");
      setMessage("Choose a JPG, PNG, WEBP, or PDF no larger than 5 MiB.");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const saved = await uploadAttachment(ticketId, requesterId, file);
      setAttachments((current) => [...current, saved]);
      setMessageTone("success");
      setMessage(`${file.name} uploaded successfully.`);
    } catch (error) {
      setMessageTone("error");
      setMessage(
        error instanceof TicketApiError
          ? error.message
          : "Unable to upload attachment.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function confirmRemoval() {
    if (!removing || reason.trim().length < 5) return;
    setRemovalBusy(true);
    setMessage("");
    try {
      const updated = await removeAttachment(removing.id, requesterId, reason);
      setAttachments((current) =>
        current.map((file) => (file.id === updated.id ? updated : file)),
      );
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

  if (state === "loading")
    return (
      <main className="page-content" id="main-content">
        <p className="notice" role="status">
          Loading Ticket Detail...
        </p>
      </main>
    );
  if (state === "unavailable")
    return (
      <main className="page-content" id="main-content">
        <section className="zen-empty-state">
          <h1>Ticket unavailable</h1>
          <p>
            This Ticket does not exist or is not available to the selected
            requester.
          </p>
          <button className="zen-button zen-button--secondary" onClick={onBack}>
            Back to My Tickets
          </button>
        </section>
      </main>
    );
  if (state === "error" || !ticket)
    return (
      <main className="page-content" id="main-content">
        <div className="alert alert-danger" role="alert">
          Unable to load Ticket Detail.{" "}
          <button className="btn btn-link p-0" onClick={() => void load()}>
            Retry
          </button>
        </div>
      </main>
    );
  const activeCount = attachments.filter(
    (file) => file.state === "ACTIVE",
  ).length;
  return (
    <main className="page-content" id="main-content">
      <button className="ticket-link mb-3" onClick={onBack}>
        Back to My Tickets
      </button>
      <section className="ticket-card">
        <div className="ticket-heading">
          <div>
            <p className="eyebrow">Requester Ticket Detail</p>
            <h1>{ticket.ticketNumber}</h1>
          </div>
          <span className="zen-badge">{ticket.currentStatus}</span>
        </div>
        <dl className="detail-grid">
          <Detail
            label="Ticket Date"
            value={new Date(ticket.ticketDate).toLocaleString()}
          />
          <Detail label="Requester" value={ticket.requester.displayName} />
          <Detail label="Category" value={ticket.category.name} />
          <Detail label="Related System" value={ticket.relatedSystem.name} />
          <Detail label="Requested Priority" value={ticket.requestedPriority} />
          <Detail label="IT Priority" value={ticket.itPriority} />
          <Detail label="Summary" value={ticket.summary} wide />
          <Detail label="Description" value={ticket.description} wide />
        </dl>
        <section
          className="attachment-section"
          aria-labelledby="detail-attachments"
        >
          <div className="ticket-heading">
            <div>
              <h2 id="detail-attachments">Attachments</h2>
              <p>
                {activeCount} active file{activeCount === 1 ? "" : "s"}. Removed
                metadata is retained.
              </p>
            </div>
            <label
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
            />
          </div>
          {message && (
            <p
              className={
                messageTone === "success" ? "success-message" : "field-error"
              }
              role={messageTone === "success" ? "status" : "alert"}
            >
              {message}
            </p>
          )}
          {attachments.length === 0 ? (
            <p className="zen-empty-state">No attachments.</p>
          ) : (
            <ul className="attachment-list">
              {attachments.map((file) => (
                <li key={file.id}>
                  <div>
                    <strong>{file.originalFilename}</strong>
                    <br />
                    <small>
                      {file.mimeType} · {Math.ceil(file.sizeBytes / 1024)} KB ·{" "}
                      {new Date(file.uploadedAt).toLocaleString()}
                    </small>
                    {file.state === "REMOVED" && (
                      <>
                        <br />
                        <span className="zen-badge">Removed</span>{" "}
                        <small>
                          {file.removedAt &&
                            new Date(file.removedAt).toLocaleString()}{" "}
                          — {file.removalReason}
                        </small>
                      </>
                    )}
                  </div>
                  {file.state === "ACTIVE" && (
                    <div className="attachment-actions">
                      <a
                        className="zen-button zen-button--secondary"
                        href={attachmentDownloadUrl(file.id, requesterId)}
                      >
                        Download
                      </a>
                      <button
                        className="zen-button zen-button--danger"
                        onClick={() => {
                          setRemoving(file);
                          setReason("");
                        }}
                      >
                        Remove
                      </button>
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
          <section
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-title"
          >
            <h2 id="remove-title">Remove attachment?</h2>
            <p>
              The file will no longer be downloadable, but its metadata will be
              retained.
            </p>
            <label htmlFor="removal-reason">Removal reason</label>
            <textarea
              id="removal-reason"
              className="zen-field"
              value={reason}
              maxLength={250}
              aria-describedby="removal-reason-help"
              onChange={(event) => setReason(event.target.value)}
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
                disabled={
                  removalBusy ||
                  reason.trim().length < 5 ||
                  reason.trim().length > 250
                }
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
