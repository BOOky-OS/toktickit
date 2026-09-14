import { useEffect, useRef, useState } from "react";
import { ApiError, CommunicationEntry, getEntries, getTicket, indicateResolution, postEntry, TicketDetail, UserRole } from "./api.js";

function EntryStream({ ticket, stream, canPost, onRefresh }: { ticket: TicketDetail; stream: "comments" | "notes"; canPost: boolean; onRefresh: () => Promise<void> }) {
  const internal = stream === "notes", title = internal ? "Internal Notes" : "Public Comments";
  const limit = internal ? 4000 : 2000;
  const [entries, setEntries] = useState<CommunicationEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const terminal = ["CLOSED", "CANCELLED"].includes(ticket.currentStatus);
  useEffect(() => {
    let live = true; setLoading(true); setFailed(false);
    void getEntries(ticket.id, stream).then(value => { if (live) setEntries(value); })
      .catch(() => { if (live) setFailed(true); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [ticket.id, ticket.version, stream, retry]);
  async function reload() {
    setBusy(true);
    try { const value = await getEntries(ticket.id, stream); await onRefresh(); setEntries(value); setBlocked(false); setFailed(false); setMessage("Latest entries loaded. Review them and your retained draft before posting again."); }
    catch { setMessage("Unable to reload. Your draft is retained. Try again."); }
    finally { setBusy(false); }
  }
  async function submit() {
    const body = draft.trim();
    if (!body || body.length > limit) { setMessage(`Enter 1–${limit} characters.`); return; }
    if (busy || blocked || terminal) return;
    setBusy(true); setMessage("");
    try {
      const entry = await postEntry(ticket.id, stream, body);
      setEntries(current => [...current, entry]); setDraft(""); setMessage("Message posted.");
      try { await onRefresh(); } catch { setBlocked(true); setMessage("Message posted, but Ticket refresh failed. Reload before posting again."); }
    } catch (error) {
      if (!(error instanceof ApiError) || error.status >= 500 || error.status === 409) {
        setBlocked(true); setMessage("The message may have been saved or the Ticket changed. Your draft is retained. Reload before retrying to avoid a duplicate.");
      } else setMessage(error.status === 403 ? "Your account cannot post here." : error.status === 404 ? "Ticket is unavailable." : `Check your message. Use 1–${limit} characters.`);
    } finally { setBusy(false); }
  }
  return <section className="attachment-section" aria-labelledby={`${stream}-heading`}>
    <h2 id={`${stream}-heading`}>{title}</h2>
    <p>{internal ? "Internal — visible to IT Staff and administrators" : "Visible to the requester"}</p>
    {loading ? <p role="status">Loading {title}...</p> : failed ? <p role="alert">Unable to load {title}. <button onClick={() => setRetry(v => v + 1)}>Retry {title}</button></p>
      : entries.length ? <ol>{entries.map(entry => <li key={entry.id}><p><strong>{entry.author.displayName}</strong> ({entry.author.role}) · {new Date(entry.createdAt).toLocaleString()}</p>
        <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.body}</p></li>)}</ol> : <p>No {internal ? "internal notes" : "public comments"} yet.</p>}
    {message && <p role="status">{message}</p>}
    {blocked && <button className="zen-button zen-button--secondary" disabled={busy} onClick={() => void reload()}>Reload {title}</button>}
    {canPost && <form onSubmit={e => { e.preventDefault(); void submit(); }}>
      {terminal && <p>Posting is unavailable while this Ticket is Closed or Cancelled.</p>}
      <label htmlFor={`${stream}-draft`}>{internal ? "Internal note" : "Public comment"}</label>
      <textarea id={`${stream}-draft`} className="zen-field" value={draft} onChange={e => setDraft(e.target.value)} maxLength={limit} required disabled={busy || terminal || blocked} />
      <p>{draft.trim().length}/{limit} characters</p>
      <button className="zen-button zen-button--primary" disabled={busy || terminal || blocked || loading || failed}>{busy ? "Posting..." : internal ? "Post internal note" : "Post public comment"}</button>
    </form>}
  </section>;
}

function ResolutionIndication({ ticket, onUpdate }: { ticket: TicketDetail; onUpdate: (value: TicketDetail) => void }) {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [message, setMessage] = useState("");
  const eligible = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"].includes(ticket.currentStatus);
  async function confirm() {
    if (busy || blocked) return;
    setBusy(true);
    try { onUpdate(await indicateResolution(ticket.id, ticket.version)); setMessage("Your indication was recorded. IT Staff will decide the formal outcome."); }
    catch (error) {
      setMessage(error instanceof ApiError && error.status < 409 ? "Unable to record your indication. Check your access and try again." : "Ticket may have changed. Reload and review before confirming again.");
      if (!(error instanceof ApiError) || error.status >= 409) setBlocked(true);
    } finally { setBusy(false); dialog.current?.close(); trigger.current?.focus(); }
  }
  async function reload() {
    setBusy(true);
    try { onUpdate(await getTicket(ticket.id)); setBlocked(false); setMessage("Latest Ticket loaded. Review it before confirming again."); }
    catch { setMessage("Unable to reload Ticket. Try again."); }
    finally { setBusy(false); }
  }
  return <section className="attachment-section" aria-labelledby="resolution-indication-heading">
    <h2 id="resolution-indication-heading">Problem Appears Resolved</h2>
    <p>Let IT Staff know the problem appears resolved. This does not formally resolve or close the Ticket.</p>
    {ticket.requesterResolutionIndicatedAt ? <p>Your resolution indication has been recorded.</p>
      : <button ref={trigger} className="zen-button zen-button--primary" disabled={busy || blocked || !eligible} onClick={() => dialog.current?.showModal()}>Problem Appears Resolved</button>}
    {!eligible && <p>This action is unavailable in the current status.</p>}
    {message && <p role="status">{message}</p>}
    {blocked && <button disabled={busy} onClick={() => void reload()}>Reload Ticket</button>}
    <dialog ref={dialog} aria-labelledby="resolution-confirm-heading" onCancel={e => { if (busy) e.preventDefault(); }} style={{ maxWidth: "min(32rem, 90vw)", borderRadius: "1rem" }}>
      <h2 id="resolution-confirm-heading">Confirm resolution indication</h2>
      <p>Notify IT Staff that the problem appears resolved? The Ticket status will remain unchanged.</p>
      <button disabled={busy} onClick={() => { dialog.current?.close(); trigger.current?.focus(); }}>Cancel</button>
      <button disabled={busy} onClick={() => void confirm()}>{busy ? "Saving..." : "Confirm indication"}</button>
    </dialog>
  </section>;
}

export function TicketCommunication({ ticket, role, onUpdate }: { ticket: TicketDetail; role: UserRole; onUpdate: (value: TicketDetail) => void }) {
  async function refresh() { onUpdate(await getTicket(ticket.id)); }
  return <>
    {role === "REQUESTER" && <ResolutionIndication key={`indication-${ticket.id}`} ticket={ticket} onUpdate={onUpdate} />}
    <EntryStream key={`comments-${ticket.id}`} ticket={ticket} stream="comments" canPost={role !== "ADMIN"} onRefresh={refresh} />
    {role !== "REQUESTER" && <EntryStream key={`notes-${ticket.id}`} ticket={ticket} stream="notes" canPost={role === "IT_STAFF"} onRefresh={refresh} />}
  </>;
}
