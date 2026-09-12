import { FormEvent, useEffect, useState } from "react";
import { ApiError, Category, getAssignees, getCategories, getRelatedSystems, getStaffQueue,
  StaffQueueItem, StaffQueueOptions, StaffQueueResponse, TicketOwner } from "./api.js";
import "./staff-queue.css";

const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const priorities = ["LOW", "MEDIUM", "HIGH"];
export const queueLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replaceAll("_", " ");
type Controls = Record<"search" | "currentStatus" | "categoryId" | "relatedSystemId" | "requestedPriority" | "itPriority" | "owner" | "sortBy" | "sortDir" | "pageSize", string>;
const defaults: Controls = { search: "", currentStatus: "", categoryId: "", relatedSystemId: "", requestedPriority: "", itPriority: "", owner: "", sortBy: "updatedAt", sortDir: "desc", pageSize: "10" };

export function StaffTicketQueue({ admin, onOpen, onHome }: { admin: boolean; onOpen: (id: number) => void; onHome: () => void }) {
  const [draft, setDraft] = useState(defaults);
  const [applied, setApplied] = useState(defaults);
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<StaffQueueResponse | null>(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [refs, setRefs] = useState<{ categories: Category[]; systems: Category[]; owners: Array<NonNullable<TicketOwner>> }>({ categories: [], systems: [], owners: [] });
  const [referenceError, setReferenceError] = useState(false);
  useEffect(() => {
    let live = true;
    setReferenceError(false);
    void Promise.all([getCategories(), getRelatedSystems(), getAssignees()]).then(([categories, systems, owners]) => {
      if (live) setRefs({ categories, systems, owners });
    }).catch(() => { if (live) setReferenceError(true); });
    return () => { live = false; };
  }, [retry]);
  useEffect(() => {
    let live = true;
    setState("loading");
    const options = { ...applied, page, pageSize: Number(applied.pageSize), search: applied.search.trim() || undefined,
      categoryId: applied.categoryId ? Number(applied.categoryId) : undefined,
      relatedSystemId: applied.relatedSystemId ? Number(applied.relatedSystemId) : undefined } as StaffQueueOptions;
    void getStaffQueue(options).then(value => { if (live) { setData(value); setState("ready"); } })
      .catch(reason => {
        if (!live) return;
        setState(reason instanceof ApiError && reason.status === 403 ? "forbidden" : "error");
        setError(reason instanceof ApiError && reason.status === 400 ? "Check your filters. A selected reference may no longer be available." : "Unable to load Ticket Queue. Your filters are unchanged.");
      });
    return () => { live = false; };
  }, [applied, page, retry]);
  const set = (key: keyof Controls, value: string) => setDraft(current => ({ ...current, [key]: value }));
  function apply(event: FormEvent) { event.preventDefault(); setPage(1); setApplied({ ...draft }); }
  function clear() { setDraft(defaults); setApplied(defaults); setPage(1); }
  function select(key: keyof Controls, label: string, options: Array<[string, string]>) {
    return <div><label htmlFor={`queue-${key}`}>{label}</label><select id={`queue-${key}`} className="zen-field" value={draft[key]}
      onChange={event => {
        set(key, event.target.value);
        if (key === "pageSize") { setPage(1); setApplied(current => ({ ...current, pageSize: event.target.value })); }
      }}>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>;
  }
  const filtered = Object.entries(applied).some(([key, value]) => !["sortBy", "sortDir", "pageSize"].includes(key) && value);
  const open = (t: StaffQueueItem, summary = false) => <button className="ticket-link" onClick={() => onOpen(t.id)}
    aria-label={`Open ${t.ticketNumber}${summary ? ": " + t.summary : ""}`}>{summary ? t.summary : t.ticketNumber}</button>;
  return <main className="page-content" id="main-content"><section className="ticket-card staff-queue">
    <h1>Ticket Queue</h1><p>{admin ? "Administrator read-only access" : "All service requests across the support team."}</p>
    <form className="filter-card" onSubmit={apply}>
      <div className="filter-grid">
        <div className="filter-wide"><label htmlFor="queue-search">Search</label><input id="queue-search" className="zen-field" maxLength={120}
          value={draft.search} onChange={event => set("search", event.target.value)} placeholder="Ticket number, summary or requester" /></div>
        {select("currentStatus", "Status", [["", "All statuses"], ...statuses.map(s => [s, queueLabel(s)] as [string, string])])}
        {select("categoryId", "Category", [["", "All categories"], ...refs.categories.map(r => [String(r.id), r.name] as [string, string])])}
        {select("relatedSystemId", "Related System", [["", "All systems"], ...refs.systems.map(r => [String(r.id), r.name] as [string, string])])}
        {select("requestedPriority", "Requested Priority", [["", "All priorities"], ...priorities.map(p => [p, queueLabel(p)] as [string, string])])}
        {select("itPriority", "IT Priority", [["", "All priorities"], ...priorities.map(p => [p, queueLabel(p)] as [string, string])])}
        {select("owner", "Owner", [["", "All owners"], ["unassigned", "Unassigned"], ["me", "Me"], ...refs.owners.map(o => [String(o.id), `${o.displayName} (${o.role === "ADMIN" ? "Admin" : "IT Staff"})`] as [string, string])])}
        {select("sortBy", "Sort by", [["updatedAt", "Last updated"], ["ticketDate", "Created date"], ["ticketNumber", "Ticket number"], ["summary", "Summary"], ["itPriority", "IT Priority"]])}
        {select("sortDir", "Order", [["desc", "Descending"], ["asc", "Ascending"]])}
        {select("pageSize", "Page size", [["10", "10"], ["25", "25"], ["50", "50"]])}
      </div>
      <div className="filter-actions"><button type="button" className="zen-button zen-button--secondary" onClick={clear}>Clear filters</button>
        <button className="zen-button zen-button--primary" type="submit">Apply filters</button></div>
    </form>
    {referenceError && <p role="alert">Unable to load filter options. <button onClick={() => setRetry(v => v + 1)}>Retry options</button></p>}
    {state === "loading" && <p role="status">Loading Ticket Queue...</p>}
    {state === "forbidden" && <section className="zen-empty-state"><h2>Queue unavailable</h2><p>Your account cannot access this queue.</p><button onClick={onHome}>Go to my home</button></section>}
    {state === "error" && <p role="alert">{error} <button onClick={() => setRetry(v => v + 1)}>Retry</button></p>}
    {state === "ready" && data && <>
      {data.items.length === 0 ? <section className="zen-empty-state"><h2>{filtered ? "No matching Tickets" : "No Tickets yet"}</h2>
        <p>{filtered ? "Try another search or clear the filters." : "New service requests will appear here."}</p>
        {filtered && <button onClick={clear}>Clear search and filters</button>}</section> : <>
        <div className="queue-desktop ticket-table-wrap"><table className="ticket-table"><caption className="visually-hidden">All service requests</caption>
          <thead><tr>{["Ticket Number", "Created Date", "Summary", "Category", "Requested Priority", "IT Priority", "Status", "Owner", "Last Updated"].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{data.items.map(t => <tr key={t.id}><td>{open(t)}</td><td>{new Date(t.ticketDate).toLocaleDateString()}</td><td>{open(t, true)}<small className="queue-secondary">{t.requester.displayName} / {t.relatedSystem.name}</small></td>
            <td>{t.category.name}</td><td>{queueLabel(t.requestedPriority)}</td><td>{queueLabel(t.itPriority)}</td><td><span className="zen-badge">{queueLabel(t.currentStatus)}</span></td><td>{t.owner?.displayName ?? "Unassigned"}</td><td>{new Date(t.updatedAt).toLocaleDateString()}</td></tr>)}</tbody>
        </table></div>
        <div className="queue-cards">{data.items.map(t => <article className="queue-card" key={t.id} aria-label={t.ticketNumber}>
          <h2>{open(t)}</h2><p>{open(t, true)}</p><dl>{[
            ["Requester", t.requester.displayName], ["Owner", t.owner?.displayName ?? "Unassigned"], ["Status", queueLabel(t.currentStatus)],
            ["Requested Priority", queueLabel(t.requestedPriority)], ["IT Priority", queueLabel(t.itPriority)], ["Category", t.category.name], ["Related System", t.relatedSystem.name],
            ["Created Date", new Date(t.ticketDate).toLocaleDateString()], ["Last Updated", new Date(t.updatedAt).toLocaleDateString()],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><button className="zen-button zen-button--primary" onClick={() => onOpen(t.id)}>Open Ticket</button>
        </article>)}</div>
      </>}
      <div className="pagination-row"><span>Showing {data.items.length ? (data.page - 1) * data.pageSize + 1 : 0}-{data.items.length ? Math.min(data.page * data.pageSize, data.totalItems) : 0} of {data.totalItems} Tickets</span>
        <div><button className="zen-button zen-button--secondary" disabled={!data.hasPreviousPage} onClick={() => setPage(p => p - 1)}>Previous</button>
          <button className="zen-button zen-button--secondary" disabled={!data.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</button></div></div>
    </>}
  </section></main>;
}
