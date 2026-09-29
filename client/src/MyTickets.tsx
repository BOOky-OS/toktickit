import { navigate } from "./AuthContext.js";
import { FormEvent, useEffect, useState } from "react";
import {
  Category,
  getCategories,
  getRelatedSystems,
  getTickets,
  RelatedSystem,
  RequestedPriority,
  TicketListOptions,
  TicketListResponse,
  TicketStatus,
} from "./api.js";

type LoadState = "loading" | "ready" | "error";
type Filters = {
  statusGroup: "" | "active"; updatedSince: string; updatedBefore: string; resolvedSince: string; resolvedBefore: string;
  search: string;
  categoryId: string;
  relatedSystemId: string;
  requestedPriority: "" | RequestedPriority;
  currentStatus: "" | TicketStatus;
  sortBy: TicketListOptions["sortBy"];
  sortDir: "asc" | "desc";
};
const DEFAULT_FILTERS: Filters = {
  statusGroup: "", updatedSince: "", updatedBefore: "", resolvedSince: "", resolvedBefore: "",
  search: "",
  categoryId: "",
  relatedSystemId: "",
  requestedPriority: "",
  currentStatus: "",
  sortBy: "updatedAt",
  sortDir: "desc",
};
const STATUSES: TicketStatus[] = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];

function enumLabel(value: string) {
  return value
    .split("_")
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function readUrl() {
  const query = new URLSearchParams(window.location.search);
  const filters = { ...DEFAULT_FILTERS };
  for (const key of Object.keys(filters) as Array<keyof Filters>) if (query.has(key)) (filters as Record<string,string>)[key] = query.get(key)!;
  const invalid = [...query.keys()].some(key => ![...Object.keys(filters), "page", "pageSize"].includes(key) || query.getAll(key).length !== 1);
  return { filters, page: Number(query.get("page") ?? 1), pageSize: Number(query.get("pageSize") ?? 10) as 10 | 25 | 50, invalid };
}
export function MyTickets({
  onCreate,
  onOpen,
}: {
  onCreate: () => void;
  onOpen: (ticketId: number) => void;
}) {
  const [filters, setFilters] = useState<Filters>(() => readUrl().filters);
  const [applied, setApplied] = useState<Filters>(() => readUrl().filters);
  const [page, setPage] = useState(() => readUrl().page);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(() => readUrl().pageSize);
  const [invalidUrl, setInvalidUrl] = useState(() => readUrl().invalid);
  useEffect(() => { const update = () => { const next = readUrl(); setFilters(next.filters); setApplied(next.filters); setPage(next.page); setPageSize(next.pageSize); setInvalidUrl(next.invalid); };
    window.addEventListener("popstate", update); return () => window.removeEventListener("popstate", update);
  }, []);
  function go(next: Filters, nextPage = 1, size = pageSize) {
    const query = new URLSearchParams();
    for (const [key,value] of Object.entries(next)) if (value) query.set(key,value);
    query.set("page",String(nextPage)); query.set("pageSize",String(size));
    navigate("/my-tickets?" + query);
  }
  const [state, setState] = useState<LoadState>("loading");
  const [response, setResponse] = useState<TicketListResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);

  useEffect(() => {
    void Promise.all([getCategories(), getRelatedSystems()])
      .then(([nextCategories, nextSystems]) => {
        setCategories(nextCategories);
        setSystems(nextSystems);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let live = true;
    if (invalidUrl) { setState("error"); return; }
    setState("loading");
    const options: TicketListOptions = {
      ...applied,
      statusGroup: applied.statusGroup || undefined,
      categoryId: applied.categoryId ? Number(applied.categoryId) : undefined,
      relatedSystemId: applied.relatedSystemId
        ? Number(applied.relatedSystemId)
        : undefined,
      requestedPriority: applied.requestedPriority || undefined,
      currentStatus: applied.currentStatus || undefined,
      page, pageSize,
    };
    void getTickets(options)
      .then(value => {
        if (!live) return;
        setResponse(value);
        setState("ready");
      })
      .catch(() => { if (live) setState("error"); });
    return () => { live = false; };
  }, [applied, page, pageSize, invalidUrl]);

  function set(name: keyof Filters, value: string) {
    setFilters(current => ({ ...current, ...(name === "currentStatus" ? {statusGroup:"",resolvedSince:"",resolvedBefore:""} : name === "statusGroup" ? {currentStatus:"",resolvedSince:"",resolvedBefore:""} : {}), [name]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    go(filters);
  }

  function clear() {
    go(DEFAULT_FILTERS, 1, 10);
  }

  const filtered = Boolean(
    applied.statusGroup || applied.updatedSince || applied.resolvedSince || applied.search
      || applied.categoryId
      || applied.relatedSystemId
      || applied.requestedPriority
      || applied.currentStatus,
  );
  const rangeStart = response && response.totalItems
    ? (response.page - 1) * response.pageSize + 1
    : 0;
  const rangeEnd = response
    ? Math.min(response.page * response.pageSize, response.totalItems)
    : 0;

  return (
    <main className="page-content" id="main-content">
      <section className="ticket-card" aria-labelledby="my-tickets-title">
        <div className="ticket-heading">
          <div>
            <p className="eyebrow">Service requests</p>
            <h1 id="my-tickets-title">My Tickets</h1>
            <p className="text-secondary mb-0">
              Only Tickets for your signed-in account appear here.
            </p>
          </div>
          <button className="zen-button zen-button--primary" onClick={onCreate}>
            Create Ticket
          </button>
        </div>
        {(applied.updatedSince || applied.resolvedSince) && <p>Active date filter: {applied.updatedSince ? "Updated" : "Resolved"} from {applied.updatedSince || applied.resolvedSince} to {applied.updatedBefore || applied.resolvedBefore} (UTC). <button className="btn btn-link" onClick={() => go({...applied,updatedSince:"",updatedBefore:"",resolvedSince:"",resolvedBefore:""})}>Clear date filter</button></p>}
        <form className="filter-card" onSubmit={submit}>
          <div className="filter-grid">
            <div><label htmlFor="filter-active">Status group</label><select id="filter-active" className="zen-field" value={filters.statusGroup} onChange={event => set("statusGroup",event.target.value)}><option value="">All groups</option><option value="active">Active Tickets</option></select></div>
            <div className="filter-wide">
              <label htmlFor="ticket-search">Search</label>
              <input
                id="ticket-search"
                className="zen-field"
                value={filters.search}
                onChange={event => set("search", event.target.value)}
                placeholder="Ticket number or summary"
              />
            </div>
            <div>
              <label htmlFor="filter-category">Category</label>
              <select
                id="filter-category"
                className="zen-field"
                value={filters.categoryId}
                onChange={event => set("categoryId", event.target.value)}
              >
                <option value="">All categories</option>
                {categories.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-system">Related System</label>
              <select
                id="filter-system"
                className="zen-field"
                value={filters.relatedSystemId}
                onChange={event => set("relatedSystemId", event.target.value)}
              >
                <option value="">All systems</option>
                {systems.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-priority">Requested Priority</label>
              <select
                id="filter-priority"
                className="zen-field"
                value={filters.requestedPriority}
                onChange={event => set("requestedPriority", event.target.value)}
              >
                <option value="">All priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-status">Current Status</label>
              <select
                id="filter-status"
                className="zen-field"
                value={filters.currentStatus}
                onChange={event => set("currentStatus", event.target.value)}
              >
                <option value="">All statuses</option>
                {STATUSES.map(status => (
                  <option key={status} value={status}>{enumLabel(status)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sort-by">Sort by</label>
              <select
                id="sort-by"
                className="zen-field"
                value={filters.sortBy}
                onChange={event => set("sortBy", event.target.value)}
              >
                <option value="updatedAt">Last updated</option>
                <option value="ticketDate">Created date</option>
                <option value="ticketNumber">Ticket number</option>
                <option value="summary">Summary</option>
              </select>
            </div>
            <div>
              <label htmlFor="sort-dir">Order</label>
              <select
                id="sort-dir"
                className="zen-field"
                value={filters.sortDir}
                onChange={event => set("sortDir", event.target.value)}
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>
          <div className="filter-actions">
            <button className="zen-button zen-button--secondary" type="button" onClick={clear}>
              Clear filters
            </button>
            <button className="zen-button zen-button--primary" type="submit">
              Apply filters
            </button>
          </div>
        </form>
        {state === "loading" && <p className="notice" role="status">Loading your Tickets...</p>}
        {state === "error" && (
          <div className="alert alert-danger" role="alert">
            Unable to load Tickets. Check or clear your URL filters, or retry. Your filters are unchanged.{" "}
            <button className="btn btn-link p-0" onClick={() => setApplied({ ...applied })}>Retry</button>
          </div>
        )}
        {state === "ready" && response && response.items.length === 0 && (
          <section className="zen-empty-state">
            <h2>{filtered ? "No matching Tickets" : "No Tickets yet"}</h2>
            <p>
              {filtered
                ? "Your active search or filters did not find matching Tickets."
                : "Your account has no Tickets yet."}
            </p>
            {filtered ? (
              <button className="zen-button zen-button--secondary" onClick={clear}>Clear filters</button>
            ) : (
              <button className="zen-button zen-button--primary" onClick={onCreate}>Create Ticket</button>
            )}
          </section>
        )}
        {state === "ready" && response && response.items.length > 0 && (
          <>
            <div className="ticket-table-wrap" role="region" aria-label="Requester tickets" tabIndex={0}>
              <table className="ticket-table requester-ticket-table" role="table">
                <caption className="visually-hidden">
                  Tickets belonging to the signed-in requester
                </caption>
                <thead role="rowgroup">
                  <tr role="row">
                    <th role="columnheader">Ticket Number</th>
                    <th role="columnheader">Created Date</th>
                    <th role="columnheader">Summary</th>
                    <th role="columnheader">Category</th>
                    <th role="columnheader">Related System</th>
                    <th role="columnheader">Requested Priority</th>
                    <th role="columnheader">IT Priority</th>
                    <th role="columnheader">Current Status</th>
                    <th role="columnheader">Owner</th>
                    <th role="columnheader">Last Updated</th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {response.items.map(ticket => (
                    <tr key={ticket.id} role="row">
                      <td role="cell">
                        <button
                          className="ticket-link"
                          type="button"
                          aria-label={`Open ${ticket.ticketNumber}`}
                          onClick={() => onOpen(ticket.id)}
                        >
                          {ticket.ticketNumber}
                        </button>
                      </td>
                      <td role="cell">{new Date(ticket.ticketDate).toLocaleDateString()}</td>
                      <td role="cell">
                        <button
                          className="ticket-link ticket-summary-link"
                          type="button"
                          aria-label={`Open ${ticket.ticketNumber}: ${ticket.summary}`}
                          onClick={() => onOpen(ticket.id)}
                        >
                          {ticket.summary}
                        </button>
                      </td>
                      <td role="cell">{ticket.category.name}</td>
                      <td role="cell">{ticket.relatedSystem.name}</td>
                      <td role="cell"><span className="zen-badge">{enumLabel(ticket.requestedPriority)}</span></td>
                      <td role="cell"><span className="zen-badge">{enumLabel(ticket.itPriority)}</span></td>
                      <td role="cell"><span className="zen-badge" data-status={ticket.currentStatus}>{enumLabel(ticket.currentStatus)}</span></td>
                      <td role="cell">{ticket.owner?.displayName ?? "Unassigned"}</td>
                      <td role="cell">{new Date(ticket.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination-row">
              <span>Showing {rangeStart}-{rangeEnd} of {response.totalItems} Tickets</span>
              <div>
                <button
                  className="zen-button zen-button--secondary"
                  disabled={!response.hasPreviousPage}
                  onClick={() => go(applied, page - 1)}
                >
                  Previous
                </button>
                <button
                  className="zen-button zen-button--secondary"
                  disabled={!response.hasNextPage}
                  onClick={() => go(applied, page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
