import { useEffect, useState } from "react";
import { ApiError, getStaffDashboard, StaffDashboardData } from "./api.js";
import { navigate } from "./AuthContext.js";
import "./dashboard.css";
const label=(s:string)=>s.charAt(0)+s.slice(1).toLowerCase().replaceAll("_"," ");
const time=(s:string)=>new Date(s).toLocaleString("en-GB",{timeZone:"Asia/Bangkok"});
export function StaffDashboard({name}:{name:string}) {
  const [data,setData]=useState<StaffDashboardData|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(""),[denied,setDenied]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{let live=true;setBusy(true);setError("");setDenied(false);
    void getStaffDashboard().then(d=>{if(live)setData(d);}).catch(e=>{if(!live)return;
      if(e instanceof ApiError && [401,403].includes(e.status)){setData(null);setDenied(true);setError("Your account cannot access this dashboard.");}
      else setError("Unable to refresh dashboard. Displayed information may be out of date.");
    }).finally(()=>{if(live)setBusy(false);});return()=>{live=false;};
  },[retry]);
  const link=(title:string,href:string,children:React.ReactNode)=> <a href={href} onClick={e=>{if(e.button===0&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();navigate(href);}}} aria-label={title}>{children}</a>;
  const queue=(query:Record<string,string>)=>"/staff/tickets?"+new URLSearchParams({...query,page:"1",pageSize:"10"});
  const card=(title:string,value:number,query:Record<string,string>)=><div className="dashboard-metric" key={title}>{link(title,queue(query),<><span>{title}</span><strong>{value}</strong></>)}</div>;
  const tickets=(title:string,items:StaffDashboardData["recentTickets"])=><section className="dashboard-list"><h2>{title}</h2>{items.length?<ul>{items.map(t=><li key={t.id}>{link(`Open ${t.ticketNumber}`,`/tickets/${t.id}`,<><strong>{t.ticketNumber}</strong> {t.summary}</>)}<p><span className="zen-badge">{label(t.currentStatus)}</span> · {label(t.itPriority)} · {t.owner?.displayName??"Unassigned"}</p><small>Updated {time(t.updatedAt)} (Bangkok)</small></li>)}</ul>:<p>No matching Tickets.</p>}</section>;
  return <main className="page-content" id="main-content"><section className="ticket-card dashboard" aria-busy={busy}>
    <div className="ticket-heading"><div><h1>Staff Dashboard</h1><p>Hello, {name}. Overview of all service requests.</p></div><button className="zen-button zen-button--secondary" disabled={busy} onClick={()=>setRetry(n=>n+1)}>Refresh dashboard</button></div>
    {busy&&<p role="status">Loading dashboard...</p>}
    {error&&<p role="alert">{data?error:denied?error:"Unable to load dashboard. Try Refresh dashboard."}</p>}
    {!denied&&data&&<>
      <p>Updated {time(data.generatedAt)} (Bangkok){error?" — Out of date":""}</p><p>Active means New, Open, In progress, Waiting for requester or Reopened. Counts are separate and should not be added together.</p>
      <div className="dashboard-metrics">{card("Unassigned Tickets",data.metrics.unassignedTickets,{owner:"unassigned",statusGroup:"active"})}{card("My owned Tickets",data.metrics.myOwnedTickets,{owner:"me",statusGroup:"active"})}{card("My pending actions",data.metrics.myPendingActions,{actionAssignee:"me",statusGroup:"active"})}</div>
      <p>My pending actions counts actions; its link opens distinct Tickets containing those actions.</p>
      <h2>Tickets by status</h2><div className="dashboard-metrics">{Object.entries(data.metrics.byStatus).map(([s,n])=>card(label(s),n,{currentStatus:s}))}</div>
      <h2>Active Tickets by IT Priority</h2><div className="dashboard-metrics">{Object.entries(data.metrics.activeByPriority).map(([p,n])=>card(label(p)+" priority",n,{itPriority:p,statusGroup:"active"}))}</div>
      <div className="dashboard-lists"><section className="dashboard-list"><h2>My pending work</h2>{data.myPendingActions.length?<ul>{data.myPendingActions.map(a=><li key={a.id}>{link(`Action ${a.id} on ${a.ticket.ticketNumber}`,`/tickets/${a.ticketId}#action-${a.id}`,<><strong>{a.ticket.ticketNumber}</strong> {a.description}</>)}<p><span className="zen-badge">{label(a.status)}</span></p></li>)}</ul>:<p>No pending actions assigned to you.</p>}</section>
      {tickets("Urgent active Tickets",data.urgentTickets)}{tickets("Recently updated Tickets",data.recentTickets)}</div>
      <p>Recent window: {time(data.recentWindow.from)} to {time(data.recentWindow.to)} (Bangkok).</p>
      <p>{link("View recent Ticket Queue",queue({updatedSince:data.recentWindow.from,updatedBefore:data.recentWindow.to}),"View all recently updated Tickets")}</p>
    </>}
    <p>{link("Open Ticket Queue","/staff/tickets","Open Ticket Queue")}</p>
  </section></main>;
}
