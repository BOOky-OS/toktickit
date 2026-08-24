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
} from "./api.js";
import { TicketDetail } from "./TicketDetail.js";

type LoadState = "loading" | "ready" | "error";
type Filters = {
  search: string;
  categoryId: string;
  relatedSystemId: string;
  requestedPriority: "" | RequestedPriority;
  currentStatus: "" | "NEW";
  sortBy: TicketListOptions["sortBy"];
  sortDir: "asc" | "desc";
};
const DEFAULT_FILTERS: Filters = {
  search: "",
  categoryId: "",
  relatedSystemId: "",
  requestedPriority: "",
  currentStatus: "",
  sortBy: "updatedAt",
  sortDir: "desc",
};

function priorityLabel(priority: string) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function MyTickets({
  requesterId,
  onCreate,
}: {
  requesterId: number;
  onCreate: () => void;
}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>("loading");
  const [response, setResponse] = useState<TicketListResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [openedTicketId, setOpenedTicketId] = useState<number | null>(null);

  useEffect(() => {
    void Promise.all([getCategories(), getRelatedSystems()])
      .then(([nextCategories, nextSystems]) => {
        setCategories(nextCategories);
        setSystems(nextSystems);
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    setState("loading");
    const options: TicketListOptions = {
      ...applied,
      categoryId: applied.categoryId ? Number(applied.categoryId) : undefined,
      relatedSystemId: applied.relatedSystemId
        ? Number(applied.relatedSystemId)
        : undefined,
      requestedPriority: applied.requestedPriority || undefined,
      currentStatus: applied.currentStatus || undefined,
      page,
    };
    void getTickets(requesterId, options)
      .then((value) => {
        setResponse(value);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [requesterId, applied, page]);

  function set(name: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setApplied(filters);
  }
  function clear() {
    setFilters(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setPage(1);
  }
  const filtered = Boolean(
    applied.search ||
      applied.categoryId ||
      applied.relatedSystemId ||
      applied.requestedPriority ||
      applied.currentStatus,
  );
  const rangeStart =
    response && response.totalItems
      ? (response.page - 1) * response.pageSize + 1
      : 0;
  const rangeEnd = response
    ? Math.min(response.page * response.pageSize, response.totalItems)
    : 0;

  if (openedTicketId)
    return (
      <TicketDetail
        ticketId={openedTicketId}
        requesterId={requesterId}
        onBack={() => setOpenedTicketId(null)}
      />
    );

  return (
    <main className="page-content" id="main-content">
      <section className="ticket-card" aria-labelledby="my-tickets-title">
        <div className="ticket-heading">
          <div>
            <p className="eyebrow">Service requests</p>
            <h1 id="my-tickets-title">My Tickets</h1>
            <p className="text-secondary mb-0">
              Only Tickets for the currently selected requester appear here.
            </p>
          </div>
          <button className="zen-button zen-button--primary" onClick={onCreate}>
            Create Ticket
          </button>
        </div>
        <form className="filter-card" onSubmit={submit}>
          <div className="filter-grid">
            <div className="filter-wide">
              <label htmlFor="ticket-search">Search</label>
              <input
                id="ticket-search"
                className="zen-field"
                value={filters.search}
                onChange={(event) => set("search", event.target.value)}
                placeholder="Ticket number or summary"
              />
            </div>
            <div>
              <label htmlFor="filter-category">Category</label>
              <select
                id="filter-category"
                className="zen-field"
                value={filters.categoryId}
                onChange={(event) => set("categoryId", event.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-system">Related System</label>
              <select
                id="filter-system"
                className="zen-field"
                value={filters.relatedSystemId}
                onChange={(event) => set("relatedSystemId", event.target.value)}
              >
                <option value="">All systems</option>
                {systems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-priority">Requested Priority</label>
              <select
                id="filter-priority"
                className="zen-field"
                value={filters.requestedPriority}
                onChange={(event) =>
                  set("requestedPriority", event.target.value)
                }
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
                onChange={(event) => set("currentStatus", event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="NEW">New</option>
              </select>
            </div>
            <div>
              <label htmlFor="sort-by">Sort by</label>
              <select
                id="sort-by"
                className="zen-field"
                value={filters.sortBy}
                onChange={(event) => set("sortBy", event.target.value)}
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
                onChange={(event) => set("sortDir", event.target.value)}
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>
          <div className="filter-actions">
            <button
              className="zen-button zen-button--secondary"
              type="button"
              onClick={clear}
            >
              Clear filters
            </button>
            <button className="zen-button zen-button--primary" type="submit">
              Apply filters
            </button>
          </div>
        </form>
        {state === "loading" && (
          <p className="notice" role="status">
            Loading your Tickets...
          </p>
        )}
        {state === "error" && (
          <div className="alert alert-danger" role="alert">
            Unable to load Tickets. Your filters are unchanged.{" "}
            <button
              className="btn btn-link p-0"
              onClick={() => setApplied({ ...applied })}
            >
              Retry
            </button>
          </div>
        )}
        {state === "ready" && response && response.items.length === 0 && (
          <section className="zen-empty-state">
            <h2>{filtered ? "No matching Tickets" : "No Tickets yet"}</h2>
            <p>
              {filtered
                ? "Your active search or filters did not find matching Tickets."
                : "The selected requester has no Tickets yet."}
            </p>
            {filtered ? (
              <button
                className="zen-button zen-button--secondary"
                onClick={clear}
              >
                Clear filters
              </button>
            ) : (
              <button
                className="zen-button zen-button--primary"
                onClick={onCreate}
              >
                Create Ticket
              </button>
            )}
          </section>
        )}
        {state === "ready" && response && response.items.length > 0 && (
          <>
            <div
              className="ticket-table-wrap"
              role="region"
              aria-label="Requester tickets"
              tabIndex={0}
            >
              <table className="ticket-table">
                <caption className="visually-hidden">
                  Tickets belonging to the current development requester
                </caption>
                <thead>
                  <tr>
                    <th>Ticket Number</th>
                    <th>Created Date</th>
                    <th>Summary</th>
                    <th>Category</th>
                    <th>Related System</th>
                    <th>Requested Priority</th>
                    <th>IT Priority</th>
                    <th>Current Status</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {response.items.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <button
                          className="ticket-link"
                          type="button"
                          aria-label={`Open ${ticket.ticketNumber}`}
                          onClick={() => setOpenedTicketId(ticket.id)}
                        >
                          {ticket.ticketNumber}
                        </button>
                      </td>
                      <td>
                        {new Date(ticket.ticketDate).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          className="ticket-link ticket-summary-link"
                          type="button"
                          aria-label={`Open ${ticket.ticketNumber}: ${ticket.summary}`}
                          onClick={() => setOpenedTicketId(ticket.id)}
                        >
                          {ticket.summary}
                        </button>
                      </td>
                      <td>{ticket.category.name}</td>
                      <td>{ticket.relatedSystem.name}</td>
                      <td>
                        <span className="zen-badge">
                          {priorityLabel(ticket.requestedPriority)}
                        </span>
                      </td>
                      <td>
                        <span className="zen-badge">
                          {priorityLabel(ticket.itPriority)}
                        </span>
                      </td>
                      <td>
                        <span className="zen-badge">
                          {priorityLabel(ticket.currentStatus)}
                        </span>
                      </td>
                      <td>{new Date(ticket.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination-row">
              <span>
                Showing {rangeStart}-{rangeEnd} of {response.totalItems} Tickets
              </span>
              <div>
                <button
                  className="zen-button zen-button--secondary"
                  disabled={!response.hasPreviousPage}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </button>
                <button
                  className="zen-button zen-button--secondary"
                  disabled={!response.hasNextPage}
                  onClick={() => setPage((value) => value + 1)}
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
