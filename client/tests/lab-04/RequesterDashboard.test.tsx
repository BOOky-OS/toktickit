import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { RequesterDashboard } from "../../src/RequesterDashboard.js";
const snapshot: api.RequesterDashboardData = { generatedAt: "2026-09-27T10:00:00Z", timeZone:"Asia/Bangkok", recentWindow:{from:"2026-09-20T10:00:00Z",to:"2026-09-27T10:00:00Z"},metrics:{openTickets:12,waitingForRequester:2,recentlyUpdated:15,recentlyResolved:3},recentTickets:[] };
beforeEach(()=>{window.history.replaceState({},"","/dashboard");vi.spyOn(api,"getRequesterDashboard").mockResolvedValue(snapshot);});
afterEach(()=>vi.restoreAllMocks());
it("renders four authoritative counts and exact date/active/waiting links even when recent list is empty",async()=>{
 render(<RequesterDashboard name="Requester"/>);
 const open=await screen.findByRole("link",{name:"Open Tickets 12"});expect(open).toHaveAttribute("href","/my-tickets?statusGroup=active&page=1&pageSize=10");
 expect(screen.getByRole("link",{name:"Waiting for You 2"})).toHaveAttribute("href","/my-tickets?currentStatus=WAITING_FOR_REQUESTER&page=1&pageSize=10");
 for(const [label,prefix] of [["Updated in Last 7 Days 15","updated"],["Resolved in Last 7 Days 3","resolved"]]) {const url=new URL(screen.getByRole("link",{name:label}).getAttribute("href")!,"http://localhost");expect(url.searchParams.get(prefix+"Since")).toBe(snapshot.recentWindow.from);expect(url.searchParams.get(prefix+"Before")).toBe(snapshot.recentWindow.to);}
 expect(screen.getByText("No updates in the last seven days.")).toBeInTheDocument();await userEvent.setup().click(open);expect(window.location.search).toContain("statusGroup=active");
});
it("keeps stale data on refresh failure, safely retries and clears it on forbidden",async()=>{
 vi.mocked(api.getRequesterDashboard).mockResolvedValueOnce(snapshot).mockRejectedValueOnce(new Error("private secret")).mockResolvedValueOnce({...snapshot,metrics:{...snapshot.metrics,openTickets:5}}).mockRejectedValueOnce(new api.ApiError("denied",403));
 const user=userEvent.setup();render(<RequesterDashboard name="Requester"/>);await screen.findByRole("link",{name:"Open Tickets 12"});
 await user.click(screen.getByRole("button",{name:"Refresh dashboard"}));expect(await screen.findByRole("alert")).toHaveTextContent("out of date");expect(screen.getByRole("link",{name:"Open Tickets 12"})).toBeInTheDocument();expect(screen.queryByText("private secret")).not.toBeInTheDocument();
 await user.click(screen.getByRole("button",{name:"Refresh dashboard"}));await screen.findByRole("link",{name:"Open Tickets 5"});
 await user.click(screen.getByRole("button",{name:"Refresh dashboard"}));await screen.findByText("Your account cannot access this dashboard.");expect(screen.queryByRole("link",{name:/Open Tickets/})).not.toBeInTheDocument();
});
it("does not invent zeros during loading or initial failure",async()=>{
 vi.mocked(api.getRequesterDashboard).mockRejectedValueOnce(new Error("failure"));render(<RequesterDashboard name="Requester"/>);expect(screen.getByRole("status")).toHaveTextContent("Loading");expect(screen.queryByRole("link",{name:/Open Tickets/})).not.toBeInTheDocument();await screen.findByRole("alert");expect(screen.queryByRole("link",{name:/Open Tickets/})).not.toBeInTheDocument();
});
it("ignores a late response after identity unmount and shows zero links for the new identity",async()=>{
 let resolve!:(data:api.RequesterDashboardData)=>void;vi.mocked(api.getRequesterDashboard).mockReturnValueOnce(new Promise(r=>{resolve=r;})).mockResolvedValueOnce({...snapshot,metrics:{openTickets:0,waitingForRequester:0,recentlyUpdated:0,recentlyResolved:0}});
 const first=render(<RequesterDashboard name="First"/>);first.unmount();render(<RequesterDashboard name="Second"/>);await screen.findByRole("link",{name:"Open Tickets 0"});resolve(snapshot);await waitFor(()=>expect(screen.queryByRole("link",{name:"Open Tickets 12"})).not.toBeInTheDocument());expect(screen.getByRole("link",{name:"Create Ticket"})).toBeInTheDocument();
});
