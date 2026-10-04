import { ShellIcon } from "./ShellIcon.js";
import { ReactNode, useEffect, useState } from "react";
import { ApiError, getRequesterDashboard, RequesterDashboardData } from "./api.js";
import { navigate } from "./AuthContext.js";
import "./dashboard.css";

const time = (value: string) => new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" });
const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
function Link({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} onClick={event => {
    if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault(); navigate(href);
    }
  }}>{children}</a>;
}

export function RequesterDashboard({ name }: { name: string }) {
  const [data, setData] = useState<RequesterDashboardData | null>(null);
  const [busy, setBusy] = useState(true), [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setBusy(true); setError("");
    void getRequesterDashboard().then(value => { if (live) setData(value); }).catch(reason => {
      if (!live) return;
      if (reason instanceof ApiError && [401, 403].includes(reason.status)) {
        setData(null); setError("Your account cannot access this dashboard.");
      } else setError("Unable to load dashboard. Try Refresh dashboard.");
    }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [retry]);

  const card = (title: string, value: number, query: Record<string, string>) =>
    <div className="dashboard-metric"><Link href={"/my-tickets?" + new URLSearchParams({ ...query, page: "1", pageSize: "10" })}>
      <span className="dashboard-metric-label">{title}</span><strong>{value}</strong><span className="dashboard-metric-arrow" aria-hidden="true"><ShellIcon name="arrow" /></span>
    </Link></div>;
  return <main className="page-content" id="main-content">
    <section className="ticket-card dashboard" aria-busy={busy}>
      <div className="ticket-heading">
        <div><span className="dashboard-eyebrow">Your workspace</span><h1>Requester Dashboard</h1><p>Hello, {name}. Here is an overview of your Tickets.</p></div>
        <button className="zen-button zen-button--secondary" disabled={busy} onClick={() => setRetry(value => value + 1)}><ShellIcon name="refresh" />Refresh dashboard</button>
      </div>
      {busy && <p role="status">Loading dashboard...</p>}
      {error && <p role="alert">{data ? "Unable to refresh dashboard. Displayed information may be out of date." : error}</p>}
      {data && <>
        <p className="dashboard-updated">Updated {time(data.generatedAt)} (Asia/Bangkok){error ? " - Out of date" : ""}</p>
        <div className="dashboard-metrics dashboard-requester-overview">
          {card("Open Tickets", data.metrics.openTickets, { statusGroup: "active" })}
          {card("Waiting for You", data.metrics.waitingForRequester, { currentStatus: "WAITING_FOR_REQUESTER" })}
          {card("Updated in Last 7 Days", data.metrics.recentlyUpdated, { updatedSince: data.recentWindow.from, updatedBefore: data.recentWindow.to })}
          {card("Resolved in Last 7 Days", data.metrics.recentlyResolved, { resolvedSince: data.recentWindow.from, resolvedBefore: data.recentWindow.to })}
        </div>
        <p className="dashboard-note">Open excludes Resolved, Closed and Cancelled Tickets. Recent resolutions include currently Closed Tickets resolved during the window. Counts are separate and should not be added together.</p>
        <p className="dashboard-window">Recent window: {time(data.recentWindow.from)} to {time(data.recentWindow.to)} (Asia/Bangkok).</p>
        <section className="dashboard-list" aria-labelledby="recent-requester-tickets">
          <h2 id="recent-requester-tickets">Recently updated Tickets</h2>
          {data.recentTickets.length ? <ul>{data.recentTickets.map(ticket => <li key={ticket.id}>
            <Link href={`/tickets/${ticket.id}`}><strong>{ticket.ticketNumber}</strong> {ticket.summary}</Link>
            <p><span className="zen-badge" data-status={ticket.currentStatus}>{label(ticket.currentStatus)}</span></p>
            <small>Updated {time(ticket.updatedAt)} (Bangkok)</small>
          </li>)}</ul> : <p>No updates in the last seven days.</p>}
        </section>
      </>}
      <div className="filter-actions"><Link href="/tickets/new">Create Ticket</Link><Link href="/my-tickets">View My Tickets</Link></div>
    </section>
  </main>;
}
