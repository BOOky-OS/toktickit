import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import {StaffDashboard} from "../../src/StaffDashboard.js";
const snapshot:api.StaffDashboardData={generatedAt:"2026-09-26T10:00:00Z",timeZone:"Asia/Bangkok",recentWindow:{from:"2026-09-19T10:00:00Z",to:"2026-09-26T10:00:00Z"},metrics:{unassignedTickets:2,myOwnedTickets:3,myPendingActions:4,byStatus:{NEW:2,OPEN:3,IN_PROGRESS:0,WAITING_FOR_REQUESTER:0,RESOLVED:0,CLOSED:0,REOPENED:0,CANCELLED:0},activeByPriority:{LOW:2,MEDIUM:3,HIGH:0}},recentTickets:[],urgentTickets:[],myPendingActions:[]};
beforeEach(()=>{vi.spyOn(api,"getStaffDashboard").mockResolvedValue(snapshot);window.history.replaceState({},"","/staff/dashboard");});afterEach(()=>vi.restoreAllMocks());
it("renders authoritative counts, zero groups, current-user drill-down and exact date bounds",async()=>{
  const user=userEvent.setup();render(<StaffDashboard name="Staff"/>);await screen.findByText("Hello, Staff. Overview of all service requests.");
  const pending=await screen.findByRole("link",{name:"My pending actions"});expect(pending).toHaveTextContent("4");expect(pending).toHaveAttribute("href","/staff/tickets?actionAssignee=me&statusGroup=active&page=1&pageSize=10");
  expect(screen.getByRole("link",{name:"High priority"})).toHaveTextContent("0");
  const dates=new URL(screen.getByRole("link",{name:"View recent Ticket Queue"}).getAttribute("href")!,"http://localhost");expect(dates.searchParams.get("updatedBefore")).toBe(snapshot.recentWindow.to);
  await user.click(pending);expect(window.location.search).toContain("actionAssignee=me");
});
it("retains a clearly stale snapshot on failure and Refresh recovers",async()=>{
  const user=userEvent.setup();vi.mocked(api.getStaffDashboard).mockResolvedValueOnce(snapshot).mockRejectedValueOnce(new Error("private network detail")).mockResolvedValueOnce({...snapshot,metrics:{...snapshot.metrics,unassignedTickets:8}});
  render(<StaffDashboard name="Admin"/>);await screen.findByRole("link",{name:"Unassigned Tickets"});await user.click(screen.getByRole("button",{name:"Refresh dashboard"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("out of date");expect(screen.getByRole("link",{name:"Unassigned Tickets"})).toHaveTextContent("2");expect(screen.queryByText("private network detail")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Refresh dashboard"}));await waitFor(()=>expect(screen.getByRole("link",{name:"Unassigned Tickets"})).toHaveTextContent("8"));
});
it("shows initial loading/error without invented zeros and clears protected data on denial",async()=>{
  vi.mocked(api.getStaffDashboard).mockRejectedValueOnce(new Error("failure"));const user=userEvent.setup();render(<StaffDashboard name="Staff"/>);
  expect(screen.getByRole("status")).toHaveTextContent("Loading");await screen.findByRole("alert");expect(screen.queryByRole("link",{name:"Unassigned Tickets"})).not.toBeInTheDocument();
  vi.mocked(api.getStaffDashboard).mockResolvedValueOnce(snapshot);await user.click(screen.getByRole("button",{name:"Refresh dashboard"}));await screen.findByRole("link",{name:"Unassigned Tickets"});
  vi.mocked(api.getStaffDashboard).mockRejectedValueOnce(new api.ApiError("forbidden",403));await user.click(screen.getByRole("button",{name:"Refresh dashboard"}));await screen.findByText("Your account cannot access this dashboard.");expect(screen.queryByRole("link",{name:"Unassigned Tickets"})).not.toBeInTheDocument();
});
it("renders safe pending-action text and actionable deep links",async()=>{
  vi.mocked(api.getStaffDashboard).mockResolvedValue({...snapshot,myPendingActions:[{id:7,ticketId:4,status:"PLANNED",description:"<script>literal text</script>",updatedAt:snapshot.generatedAt,ticket:{id:4,ticketNumber:"T-4",summary:"Repair",currentStatus:"OPEN"}}]});
  render(<StaffDashboard name="Staff"/>);expect(await screen.findByRole("link",{name:"Action 7 on T-4"})).toHaveAttribute("href","/tickets/4#action-7");expect(screen.getByText(/<script>literal/)).toBeInTheDocument();expect(document.querySelector("main script")).toBeNull();
});
