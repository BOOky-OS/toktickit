import { useEffect, useRef, useState } from "react";
import { ApiError, getAssignees, getTicket, getStatusHistory, mutateStaffTicket, TicketDetail, TicketOwner, StatusHistoryEntry } from "./api.js";

const nextStatuses: Record<string, string[]> = {
  NEW: ["OPEN", "CANCELLED"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"], REOPENED: ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], CANCELLED: [],
};
const label = (s: string) => s.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
type Operation = "claim" | "owner" | "priority" | "status";

export function StaffOperations({ ticket, editable, onUpdate }: { ticket: TicketDetail; editable: boolean; onUpdate: (ticket: TicketDetail) => void }) {
  const [owners, setOwners] = useState<Array<NonNullable<TicketOwner>>>([]);
  const [owner, setOwner] = useState(String(ticket.owner?.id ?? ""));
  const [priority, setPriority] = useState(ticket.itPriority);
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [ownersError, setOwnersError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [confirm, setConfirm] = useState<"owner" | "status" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const terminal = ["CLOSED", "CANCELLED"].includes(ticket.currentStatus);
  const options = nextStatuses[ticket.currentStatus] ?? [];
  const requiresOwner = ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED"].includes(status);
  const validOwner = owners.some(o => o.id === ticket.owner?.id);
  const requiresReason = ["RESOLVED", "CLOSED", "REOPENED", "CANCELLED"].includes(status);
  useEffect(() => {
    let live = true;
    setHistoryError(false);
    void getStatusHistory(ticket.id).then(value => { if (live) setHistory(value); }).catch(() => { if (live) setHistoryError(true); });
    if (editable) {
      setOwnersError(false);
      void getAssignees().then(value => { if (live) setOwners(value); }).catch(() => { if (live) setOwnersError(true); });
    }
    return () => { live = false; };
  }, [ticket.id, ticket.version, editable, retry]);
  useEffect(() => {
    if (confirm) dialog.current?.showModal();
    else if (dialog.current?.open) { dialog.current.close(); trigger.current?.focus(); }
  }, [confirm]);
  function ask(operation: "owner" | "status") { trigger.current = document.activeElement as HTMLElement; setConfirm(operation); }
  async function save(operation: Operation) {
    if (busy || blocked) return;
    if (operation === "status" && requiresReason && (reason.trim().length < 5 || reason.trim().length > 1000)) {
      setMessage("Enter a public reason between 5 and 1000 characters."); return;
    }
    setBusy(true); setMessage("");
    try {
      const body = operation === "owner" ? { ownerId: owner ? Number(owner) : null, confirmed: true }
        : operation === "priority" ? { itPriority: priority }
        : operation === "status" ? { currentStatus: status, confirmed: true, ...(reason.trim() ? { reason: reason.trim() } : {}) } : {};
      const updated = await mutateStaffTicket(ticket.id, operation, { ...body, version: ticket.version });
      onUpdate(updated); setOwner(String(updated.owner?.id ?? "")); setPriority(updated.itPriority);
      if (operation === "status") { setReason(""); setStatus(""); }
      setConfirm(null); setMessage("Ticket updated.");
    } catch (error) {
      setConfirm(null);
      if (!(error instanceof ApiError) || error.status >= 500 || error.status === 409) {
        setBlocked(true); setConfirm(null); setMessage("Ticket may have changed. Your draft is retained. Reload and review before saving again.");
      } else setMessage(error.status === 403 ? "Your account cannot perform this operation." : error.status === 404 ? "Ticket is unavailable." : "Check your selection, confirmation and public reason.");
    } finally { setBusy(false); }
  }
  async function reload() {
    setBusy(true);
    try { onUpdate(await getTicket(ticket.id)); setBlocked(false); setMessage("Latest Ticket loaded. Review current values and your retained draft before saving."); }
    catch { setMessage("Unable to reload Ticket. Your draft is retained. Try again."); }
    finally { setBusy(false); }
  }
  return <section className="attachment-section" aria-labelledby="staff-operations-heading">
    <h2 id="staff-operations-heading">{editable ? "Ticket operations" : "Status history"}</h2>
    {message && <p role="status">{message}</p>}
    {blocked && <button className="zen-button zen-button--secondary" disabled={busy} onClick={() => void reload()}>Reload Ticket</button>}
    {editable && <>
      {terminal && <p>Assignment and priority are read-only for this status.</p>}
      {ownersError && <p role="alert">Unable to load eligible owners. <button onClick={() => setRetry(v => v + 1)}>Retry owners</button></p>}
      <fieldset disabled={busy || blocked} aria-busy={busy}>
        {!ticket.owner && !terminal && <button className="zen-button zen-button--primary" onClick={() => void save("claim")}>Claim Ticket</button>}
        <div className="filter-grid">
          <div><label htmlFor="staff-owner">Assigned owner</label><select className="zen-field" id="staff-owner" value={owner} onChange={e => setOwner(e.target.value)} disabled={terminal || ownersError}>
            <option value="" disabled={!["NEW", "OPEN"].includes(ticket.currentStatus)}>Unassigned</option>
            {owner && !owners.some(o => String(o.id) === owner) && <option value={owner} disabled>Current or unavailable owner</option>}
            {owners.map(o => <option key={o.id} value={o.id}>{o.displayName} ({o.role === "ADMIN" ? "Admin" : "IT Staff"})</option>)}
          </select><button className="zen-button zen-button--secondary" disabled={terminal || ownersError} onClick={() => ask("owner")}>{owner ? ticket.owner ? "Reassign owner" : "Assign owner" : "Unassign owner"}</button></div>
          <div><label htmlFor="staff-priority">Set IT Priority</label><select className="zen-field" id="staff-priority" value={priority} onChange={e => setPriority(e.target.value as typeof priority)} disabled={terminal}>
            {["LOW", "MEDIUM", "HIGH"].map(p => <option key={p} value={p}>{label(p)}</option>)}
          </select><button className="zen-button zen-button--secondary" disabled={terminal} onClick={() => void save("priority")}>Save IT Priority</button></div>
          <div><label htmlFor="staff-status">Next status</label><select className="zen-field" id="staff-status" value={status} onChange={e => setStatus(e.target.value)} disabled={!options.length}>
            <option value="">Choose next status</option>{status && !options.includes(status) && <option value={status} disabled>{label(status)} (no longer available)</option>}
            {options.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>{requiresOwner && !validOwner && <p>Assign an active eligible owner before entering this status.</p>}
          <button className="zen-button zen-button--primary" disabled={!options.includes(status) || (requiresOwner && !validOwner)} onClick={() => ask("status")}>Change status</button></div>
        </div>
        <label htmlFor="staff-reason">Public status reason{requiresReason ? " (required)" : " (optional)"}</label>
        <p>Visible to the requester. Required reasons must contain 5–1000 characters.</p>
        <textarea id="staff-reason" className="zen-field" value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} required={requiresReason} />
      </fieldset>
      <dialog ref={dialog} aria-labelledby="staff-confirm-title" onCancel={e => { if (busy) e.preventDefault(); else setConfirm(null); }} style={{ maxWidth: "min(32rem, 90vw)", borderRadius: "1rem" }}>
        <h2 id="staff-confirm-title">{confirm === "owner" ? "Confirm owner change" : "Confirm status change"}</h2>
        <p>{confirm === "owner" ? `Assign responsibility to ${owners.find(o => String(o.id) === owner)?.displayName ?? "Unassigned"}?` : `Change status from ${label(ticket.currentStatus)} to ${label(status)}?`}</p>
        {confirm === "status" && reason && <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>Public reason: {reason}</p>}
        <button className="zen-button zen-button--secondary" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
        <button className="zen-button zen-button--primary" disabled={busy || blocked || (confirm === "status" && requiresReason && reason.trim().length < 5)} onClick={() => confirm && void save(confirm)}>{busy ? "Saving..." : "Confirm change"}</button>
      </dialog>
    </>}
    {editable && <h3>Public status history</h3>}
    {historyError ? <p role="alert">Unable to load status history. <button onClick={() => setRetry(v => v + 1)}>Retry history</button></p>
      : history.length ? <ol>{history.map(entry => <li key={entry.id}><strong>{label(entry.fromStatus)} → {label(entry.toStatus)}</strong>
        <p>{entry.author.displayName} ({label(entry.author.role)}) · {new Date(entry.createdAt).toLocaleString()}</p>
        {entry.reason && <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.reason}</p>}</li>)}</ol> : <p>No status changes yet.</p>}
  </section>;
}
