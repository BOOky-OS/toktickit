import { useEffect, useRef, useState } from "react";
import { ActionTaken as Action, ActionList, ActionPage, ActionRevision, ApiError, CurrentUser, getActions, getActionHistory, getAssignees, getTicket, TicketDetail, TicketOwner, writeAction } from "./api.js";
import { homeFor, navigate } from "./AuthContext.js";
import "./actions-taken.css";

const label = (v: string) => v.split("_").map(w => w[0] + w.slice(1).toLowerCase()).join(" ");
const time = (v: string) => new Date(v).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" }) + " (Bangkok)";
const localDate = (v: string) => new Date(new Date(v).getTime() + 7 * 3600000).toISOString().slice(0, 23);
type Draft = { actionAt: string; description: string; result: string; assigneeId: string; followUpRequired: string; followUpNote: string; attachmentNotes: string };
type Attempt = { id: number | null; operation: "create" | "edit" | "status"; body: Record<string, unknown>; key: string };
type Editor = { action: Action | null; version: number; ticketVersion: number };
const fieldLabels: Record<keyof Draft, string> = { actionAt: "Action date/time (Asia/Bangkok)", description: "Description", result: "Result", assigneeId: "Assigned to", followUpRequired: "Follow-up required?", followUpNote: "Follow-up note", attachmentNotes: "Attachment notes" };
function draftFor(action: Action | null, actor: CurrentUser): Draft {
  return { actionAt: localDate(action?.actionAt ?? new Date().toISOString()), description: action?.description ?? "", result: action?.result ?? "",
    assigneeId: String(action?.assignee.id ?? actor.id), followUpRequired: action?.followUpRequired ? "yes" : "no", followUpNote: action?.followUpNote ?? "", attachmentNotes: action?.attachmentNotes ?? "" };
}
function Fields({ action, showStatus = false }: { action: Action; showStatus?: boolean }) {
  return <dl className="action-fields">
    {showStatus && <div><dt>Status</dt><dd>{label(action.status)}</dd></div>}
    <div><dt>Last updated</dt><dd>{time(action.updatedAt)}</dd></div>
    <div><dt>Action date/time</dt><dd>{time(action.actionAt)}</dd></div><div><dt>Created</dt><dd>{time(action.createdAt)}</dd></div>
    <div><dt>Performed by</dt><dd>{action.performedBy.displayName} ({label(action.performedBy.role)})</dd></div>
    <div><dt>Assigned to</dt><dd>{action.assignee.displayName} ({label(action.assignee.role)})</dd></div>
    <div className="action-wide"><dt>Description</dt><dd>{action.description}</dd></div>
    <div className="action-wide"><dt>Result</dt><dd>{action.result || "Not recorded"}</dd></div>
    <div><dt>Follow-up required?</dt><dd>{action.followUpRequired ? "Yes" : "No"}</dd></div>
    <div><dt>Follow-up note</dt><dd>{action.followUpNote || "None"}</dd></div>
    <div className="action-wide"><dt>Attachment notes</dt><dd>{action.attachmentNotes || "None"}</dd></div>
    {action.completedAt && <div><dt>Completed</dt><dd>{time(action.completedAt)}</dd></div>}
    {action.cancelledAt && <><div><dt>Cancelled</dt><dd>{time(action.cancelledAt)}</dd></div><div><dt>Cancellation reason</dt><dd>{action.cancellationReason}</dd></div></>}
  </dl>;
}

export function ActionsTaken({ ticket, actor, onUpdate }: { ticket: TicketDetail; actor: CurrentUser; onUpdate: (value: TicketDetail) => void }) {
  const operational = actor.role !== "REQUESTER", writable = !["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.currentStatus);
  const [data, setData] = useState<ActionList | null>(null), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [restricted, setRestricted] = useState(false), [message, setMessage] = useState("");
  const [assignees, setAssignees] = useState<Array<NonNullable<TicketOwner>>>([]), [assigneeError, setAssigneeError] = useState(false), [retry, setRetry] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null), [draft, setDraft] = useState<Draft>(() => draftFor(null, actor)), [initial, setInitial] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false), lock = useRef(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null), [conflict, setConflict] = useState(false), [review, setReview] = useState(false), [reviewed, setReviewed] = useState(false);
  const [cancelAction, setCancelAction] = useState<Action | null>(null), [reason, setReason] = useState("");
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLElement | null>(null), heading = useRef<HTMLHeadingElement>(null), mounted = useRef(true);
  const [historyId, setHistoryId] = useState<number | null>(null), [historyPage, setHistoryPage] = useState(1), [history, setHistory] = useState<ActionPage<ActionRevision> | null>(null), [historyError, setHistoryError] = useState(false);
  const [focusId, setFocusId] = useState<number | null>(null);
  const dirty = !!editor && JSON.stringify(draft) !== initial || !!cancelAction && !!reason || !!attempt;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function denied(e: unknown) {
    if (e instanceof ApiError && [401, 403, 404].includes(e.status)) {
      setRestricted(true); setData(null); setHistory(null); setEditor(null); setDraft(draftFor(null, actor)); setAttempt(null); setCancelAction(null); setReason("");
      setError(e.status === 404 ? "Ticket or actions are unavailable." : "Actions are unavailable for your current access. Return to your permitted home.");
      return true;
    } return false;
  }
  useEffect(() => {
    let live = true; setLoading(true); setError("");
    void getActions(ticket.id, page, pageSize).then(v => { if (live) { setData(v); setRestricted(false); } })
      .catch(e => { if (live && !denied(e)) { setData(null); setError("Unable to load actions. Please retry."); } }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [ticket.id, ticket.version, page, pageSize, retry]);
  useEffect(() => {
    if (!operational || restricted) return;
    let live = true; setAssigneeError(false);
    void getAssignees().then(v => { if (live) setAssignees(v); }).catch(e => { if (live) { setAssigneeError(true); denied(e); } });
    return () => { live = false; };
  }, [operational, ticket.version, retry, restricted]);
  useEffect(() => {
    if (!historyId || !operational || restricted) return;
    let live = true; setHistory(null); setHistoryError(false);
    void getActionHistory(ticket.id, historyId, historyPage).then(v => { if (live) setHistory(v); }).catch(e => { if (live && !denied(e)) setHistoryError(true); });
    return () => { live = false; };
  }, [historyId, historyPage, ticket.id, ticket.version, retry, operational, restricted]);
  useEffect(() => {
    const hash = () => { const found = /^#action-([1-9][0-9]*)$/.exec(window.location.hash); if (found) { setFocusId(Number(found[1])); setPage(1); } };
    hash(); window.addEventListener("hashchange", hash); return () => window.removeEventListener("hashchange", hash);
  }, [ticket.id]);
  useEffect(() => {
    if (!focusId || loading || !data) return;
    if (data.items.some(a => a.id === focusId)) { document.getElementById(`action-${focusId}`)?.focus(); setFocusId(null); }
    else if (data.hasNextPage) setPage(data.page + 1);
    else { setMessage("Linked action is unavailable."); setFocusId(null); }
  }, [focusId, loading, data]);
  useEffect(() => {
    if (cancelAction) { dialog.current?.showModal(); dialog.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus(); }
    else if (dialog.current?.open) { dialog.current.close(); trigger.current?.focus(); }
  }, [cancelAction]);
  useEffect(() => { if (editor) document.getElementById("action-description")?.focus(); }, [!!editor]);
  useEffect(() => {
    if (!dirty) return;
    const currentUrl = window.location.href;
    const pop = (e: PopStateEvent) => {
      if (!e.isTrusted || window.location.pathname === new URL(currentUrl).pathname) return;
      if (!window.confirm("Discard the unsaved action draft and leave this page?")) {
        e.stopImmediatePropagation(); window.history.pushState({}, "", currentUrl);
      }
    };
    window.addEventListener("popstate", pop, true);
    const before = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const navigate = (e: Event) => { if (!window.confirm("Discard the unsaved action draft and leave this page?")) e.preventDefault(); };
    window.addEventListener("beforeunload", before); window.addEventListener("toktickit:before-navigate", navigate);
    return () => { window.removeEventListener("popstate", pop, true); window.removeEventListener("beforeunload", before); window.removeEventListener("toktickit:before-navigate", navigate); };
  }, [dirty]);
  function openEditor(action: Action | null) {
    trigger.current = document.activeElement as HTMLElement;
    const next = draftFor(action, actor); setDraft(next); setInitial(JSON.stringify(next)); setErrors({}); setMessage(""); setConflict(false); setReview(false); setReviewed(false);
    setEditor({ action, version: action?.version ?? 1, ticketVersion: data?.ticketVersion ?? ticket.version });
  }
  function discard() {
    if (dirty && !window.confirm("Discard the unsaved action draft?")) return;
    setEditor(null); setCancelAction(null); setReason(""); setAttempt(null); setConflict(false); setReview(false); setErrors({}); trigger.current?.focus();
  }
  async function refresh() {
    const [current, list, options] = await Promise.all([getTicket(ticket.id), getActions(ticket.id, page, pageSize), operational ? getAssignees() : Promise.resolve([])]);
    if (!mounted.current) return null;
    setData(list); setAssignees(options); setAssigneeError(false); onUpdate(current); setRetry(v => v + 1);
    return { current, list };
  }
  async function send(saved: Attempt) {
    if (lock.current || restricted) return;
    lock.current = true; setBusy(true); setMessage("");
    try {
      const result = await writeAction(ticket.id, saved.id, saved.operation, saved.body, saved.key);
      if (!mounted.current) return;
      setAttempt(null); setEditor(null); setCancelAction(null); setReason(""); setConflict(false); setReview(false);
      try { await refresh(); setMessage(result.replayed ? "Previous save confirmed. Current actions refreshed." : "Action saved. Current actions refreshed."); }
      catch (e) { if (!denied(e)) { setData(null); setError("Action saved, but refresh failed. Reload actions before making another change."); } }
      heading.current?.focus();
    } catch (e) {
      if (!mounted.current || denied(e)) return;
      if (!(e instanceof ApiError) || e.status >= 500) { setAttempt(saved); setMessage("We could not confirm this save. Your draft is retained. Retry the same save before making changes."); }
      else if (e.status === 409) { setAttempt(null); setConflict(true); setMessage("Action or Ticket changed. Your draft is retained. Reload current values and review before saving."); }
      else { setAttempt(null); setMessage("Check the action fields and try again."); setErrors(e.fieldErrors); }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  function updateDraft(key: keyof Draft, value: string) {
    setDraft(current => ({ ...current, [key]: value }));
    setErrors(current => { const next = { ...current }; delete next[key]; return next; });
  }
  function save() {
    if (!editor || busy || attempt || conflict || (review && !reviewed)) return;
    const issues: Record<string, string> = {}, date = new Date(draft.actionAt + "+07:00");
    if (!draft.actionAt || !Number.isFinite(date.getTime()) || date < new Date(ticket.ticketDate) || date > new Date()) issues.actionAt = "Use a valid time between Ticket creation and now.";
    for (const [name, min, max] of [["description", 5, 2000], ["result", 0, 2000], ["followUpNote", draft.followUpRequired === "yes" ? 5 : 0, 1000], ["attachmentNotes", 0, 1000]] as const) {
      if (draft[name].trim().length < min || draft[name].trim().length > max) issues[name] = `Use ${min}-${max} characters.`;
    }
    if (!assignees.some(a => String(a.id) === draft.assigneeId)) issues.assigneeId = "Choose an active Staff or Admin assignee.";
    setErrors(issues);
    if (Object.keys(issues).length) { setTimeout(() => document.getElementById("action-errors")?.focus(), 0); return; }
    void send({ id: editor.action?.id ?? null, operation: editor.action ? "edit" : "create", key: crypto.randomUUID(), body: {
      ticketVersion: editor.ticketVersion, ...(editor.action ? { version: editor.version } : {}), actionAt: date.toISOString(), description: draft.description.trim(), result: draft.result.trim(),
      assigneeId: Number(draft.assigneeId), followUpRequired: draft.followUpRequired === "yes", followUpNote: draft.followUpNote.trim(), attachmentNotes: draft.attachmentNotes.trim(),
    } });
  }
  async function reloadConflict() {
    if (lock.current) return; lock.current = true; setBusy(true);
    try {
      const current = await refresh(); if (!current) return;
      let item: Action | undefined;
      const id = editor?.action?.id ?? cancelAction?.id;
      if (id) {
        let list = current.list; item = list.items.find(a => a.id === id);
        for (let n = 1; !item && n <= list.totalPages; n++) { list = await getActions(ticket.id, n, pageSize); item = list.items.find(a => a.id === id); }
        if (!item) { setMessage("Action is unavailable. Your draft is retained for reference."); return; }
      }
      if (editor) setEditor({ action: item ?? null, version: item?.version ?? 1, ticketVersion: current.list.ticketVersion });
      if (cancelAction && item) setCancelAction(item);
      setConflict(false); setReview(true); setReviewed(false); setMessage("Current values loaded. Compare them with your retained draft, then confirm your review.");
    } catch (e) { if (!denied(e)) setMessage("Unable to reload. Your draft is retained. Try again."); }
    finally { lock.current = false; setBusy(false); }
  }
  function changeStatus(action: Action, status: string) {
    void send({ id: action.id, operation: "status", key: crypto.randomUUID(), body: { ticketVersion: data?.ticketVersion ?? ticket.version, version: action.version, status, confirmed: true, ...(status === "CANCELLED" ? { reason: reason.trim() } : {}) } });
  }
  const frozen = busy || !!attempt || conflict || (review && !reviewed), canWrite = operational && writable && !restricted && !!data && !error;
  const editableAction = !editor?.action || ["PLANNED", "IN_PROGRESS"].includes(editor.action.status);
  const feedback = <>
    {message && <p role="status" className="notice">{message}</p>}
    {attempt && <button className="zen-button zen-button--primary" disabled={busy} onClick={() => void send(attempt)}>Retry same save</button>}
    {conflict && <button className="zen-button zen-button--secondary" disabled={busy} onClick={() => void reloadConflict()}>Reload current values</button>}
    {review && <label className="action-review"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /> I reviewed the current values and my draft</label>}
  </>;
  return <section className="attachment-section actions-section" aria-labelledby="actions-heading" aria-busy={loading || busy}>
    <div className="ticket-heading"><div><h2 id="actions-heading" ref={heading} tabIndex={-1}>Actions Taken</h2><p>Visible to the Ticket's Requester. Put sensitive information in Internal Notes.</p></div>
      {canWrite && !editor && !cancelAction && <button className="zen-button zen-button--primary" disabled={frozen} onClick={() => openEditor(null)}>Add action</button>}
    </div>
    {operational && !writable && <p>Actions are read-only while this Ticket is {label(ticket.currentStatus)}. {ticket.currentStatus === "CANCELLED" ? "Cancelled Tickets cannot reopen." : "Reopen the Ticket before recording more work."}</p>}
    {!cancelAction && feedback}
    {restricted && <button className="zen-button zen-button--secondary" onClick={() => navigate(homeFor(actor.role))}>Go to my home</button>}
    {error && <p role="alert">{error} {!restricted && <button onClick={() => setRetry(v => v + 1)}>Reload actions</button>}</p>}
    {assigneeError && !restricted && <p role="alert">Unable to load active assignees. <button onClick={() => setRetry(v => v + 1)}>Retry assignees</button></p>}
    {editor && !restricted && <form className="action-editor" noValidate onSubmit={e => { e.preventDefault(); save(); }}>
      <h3>{editor.action ? `Edit action ${editor.action.id}` : "New action"}</h3>
      <p>Performed by: {editor.action?.performedBy.displayName ?? actor.displayName} (automatic, read-only). Status: {label(editor.action?.status ?? "PLANNED")}.</p>
      {review && editor.action && <details open><summary>Current saved values</summary><Fields action={editor.action} showStatus /></details>}
      {!editableAction && <p>This action is now terminal. Keep your draft for reference and add a new action if a correction is needed.</p>}
      {!!Object.keys(errors).length && <div id="action-errors" role="alert" tabIndex={-1}><p>Check these fields:</p><ul>{Object.entries(errors).map(([key, value]) => <li key={key}><a href={`#action-${key}`} onClick={e => { e.preventDefault(); document.getElementById(`action-${key}`)?.focus(); }}>{fieldLabels[key as keyof Draft] ?? key}: {value}</a></li>)}</ul></div>}
      <fieldset disabled={busy || !!attempt} className="action-form-grid">
        {(Object.keys(fieldLabels) as Array<keyof Draft>).map(key => <div key={key} className={["description", "result", "followUpNote", "attachmentNotes"].includes(key) ? "action-wide" : ""}>
          <label htmlFor={`action-${key}`}>{fieldLabels[key]}</label>
          {key === "assigneeId" ? <select className="zen-field" id={`action-${key}`} value={draft[key]} onChange={e => updateDraft(key, e.target.value)} aria-invalid={!!errors[key]} aria-describedby={`action-${key}-help`}>
            {!assignees.some(a => String(a.id) === draft.assigneeId) && <option value={draft.assigneeId} disabled>Current assignee unavailable - choose another</option>}
            {assignees.map(a => <option key={a.id} value={a.id}>{a.displayName} ({label(a.role)})</option>)}</select>
          : key === "followUpRequired" ? <select className="zen-field" id={`action-${key}`} value={draft[key]} onChange={e => updateDraft(key, e.target.value)}><option value="no">No</option><option value="yes">Yes</option></select>
          : key === "actionAt" ? <input className="zen-field" type="datetime-local" step="0.001" id={`action-${key}`} value={draft[key]} onChange={e => updateDraft(key, e.target.value)} aria-invalid={!!errors[key]} aria-describedby={`action-${key}-help`} />
          : <textarea className="zen-field" id={`action-${key}`} value={draft[key]} maxLength={key === "description" || key === "result" ? 2000 : 1000} onChange={e => updateDraft(key, e.target.value)} aria-invalid={!!errors[key]} aria-describedby={`action-${key}-help`} />}
          <small id={`action-${key}-help`} className={errors[key] ? "field-error" : ""}>{errors[key] ?? (key === "description" ? "Required: 5-2000 characters." : key === "result" ? "Up to 2000; at least 5 before completion." : key === "followUpNote" ? draft.followUpRequired === "yes" ? "Required: 5-1000 characters." : "Optional, retained as context (up to 1000)." : key === "attachmentNotes" ? "Plain text references to existing files; up to 1000 characters." : key === "followUpRequired" ? "Completion requires No." : key === "actionAt" ? `Required, between Ticket creation and now. Selected: ${draft.actionAt.replace("T", " ")} Bangkok.` : "Required active Staff/Admin." )}</small>
        </div>)}
      </fieldset>
      <div className="ticket-actions"><button className="zen-button zen-button--primary" disabled={frozen || !canWrite || !editableAction || assigneeError}>Save action</button><button type="button" className="zen-button zen-button--secondary" disabled={busy} onClick={discard}>Cancel editing</button></div>
    </form>}
    {loading ? <p role="status">Loading actions...</p> : data && !restricted && <>
      {!data.items.length && <p className="zen-empty-state">No actions on this page.</p>}
      <ol className="action-list">{data.items.map(action => {
        const active = ["PLANNED", "IN_PROGRESS"].includes(action.status), eligible = assignees.some(a => a.id === action.assignee.id);
        const complete = action.result.trim().length >= 5 && !action.followUpRequired;
        return <li key={action.id}><article id={`action-${action.id}`} tabIndex={-1} className="action-card" aria-label={`Action ${action.id}`}>
          <div className="ticket-heading"><h3>Action {action.id}</h3><span className="zen-badge">{label(action.status)}</span></div><Fields action={action} />
          {canWrite && active && <>
            {!eligible && <p>Current assignee unavailable. Reassign before editing, starting or completing; cancellation is still allowed.</p>}
            {action.status === "IN_PROGRESS" && !complete && <p>Edit the Result to at least 5 characters and set Follow-up required to No before completion.</p>}
            <div className="ticket-actions"><button className="zen-button zen-button--secondary" disabled={frozen || !!editor || !!cancelAction} onClick={() => openEditor(action)}>Edit action {action.id}</button>
              <button className="zen-button zen-button--primary" disabled={frozen || !!editor || !!cancelAction || !eligible || assigneeError || (action.status === "IN_PROGRESS" && !complete)} onClick={() => changeStatus(action, action.status === "PLANNED" ? "IN_PROGRESS" : "COMPLETED")}>{action.status === "PLANNED" ? "Start" : "Complete"} action {action.id}</button>
              <button className="zen-button zen-button--danger" disabled={frozen || !!editor || !!cancelAction} onClick={() => { trigger.current = document.activeElement as HTMLElement; setCancelAction(action); setReason(""); setMessage(""); }}>Cancel action {action.id}</button>
            </div></>}
          {!active && operational && <p>Final action: add a new action referencing this ID for corrections.</p>}
          {operational && <button className="zen-button zen-button--secondary" onClick={() => { setHistoryId(historyId === action.id ? null : action.id); setHistoryPage(1); }}>History of action {action.id}</button>}
        </article></li>;
      })}</ol>
      <div className="action-pagination"><label>Actions per page <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10, 25, 50].map(n => <option key={n}>{n}</option>)}</select></label><span>Page {data.page} / {data.totalPages} · {data.totalItems} actions</span>
        <button className="zen-button zen-button--secondary" disabled={!data.hasPreviousPage || loading} onClick={() => setPage(page - 1)}>Previous actions</button><button className="zen-button zen-button--secondary" disabled={!data.hasNextPage || loading} onClick={() => setPage(page + 1)}>Next actions</button></div>
    </>}
    {historyId && operational && !restricted && <section className="action-history" aria-label={`History of action ${historyId}`}><h3>History of action {historyId}</h3>
      {historyError ? <p role="alert">Unable to load action history. <button onClick={() => setRetry(v => v + 1)}>Retry action history</button></p> : !history ? <p role="status">Loading action history...</p> : <>
        <ol>{history.items.map(r => <li key={r.id}><details><summary>Revision {r.version}: {label(r.event)} by {r.actor.displayName} · {time(r.createdAt)}</summary><Fields action={r.snapshot} showStatus /></details></li>)}</ol>
        {!history.items.length && <p>No revisions on this page.</p>}
        <button disabled={!history.hasPreviousPage} onClick={() => setHistoryPage(v => v - 1)}>Previous revisions</button><button disabled={!history.hasNextPage} onClick={() => setHistoryPage(v => v + 1)}>Next revisions</button>
      </>}
    </section>}
    <dialog className="action-dialog" onKeyDown={e => {
      if (e.key !== "Tab") return;
      const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), input:not(:disabled), a[href]'));
      const first = controls[0], last = controls.at(-1);
      if (!first) { e.preventDefault(); return; }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }} ref={dialog} aria-labelledby="cancel-action-title" onCancel={e => { e.preventDefault(); if (!busy) discard(); }}>
      <h2 id="cancel-action-title">Cancel action {cancelAction?.id}?</h2><p>This keeps the action and its earlier revisions. The reason is visible to the Requester.</p>
      {cancelAction && feedback}
      <label htmlFor="action-cancellation-reason">Cancellation reason</label><textarea className="zen-field" id="action-cancellation-reason" value={reason} maxLength={1000} disabled={busy || !!attempt} onChange={e => setReason(e.target.value)} aria-describedby="cancel-help" /><p id="cancel-help">Required: 5-1000 characters.</p>
      <div className="ticket-actions"><button className="zen-button zen-button--secondary" disabled={busy} onClick={discard}>Keep action</button><button className="zen-button zen-button--danger" disabled={frozen || !canWrite || !cancelAction || !["PLANNED", "IN_PROGRESS"].includes(cancelAction.status) || reason.trim().length < 5} onClick={() => cancelAction && changeStatus(cancelAction, "CANCELLED")}>Confirm cancellation</button></div>
    </dialog>
  </section>;
}
