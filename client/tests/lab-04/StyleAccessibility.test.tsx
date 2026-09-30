import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StaffDashboard } from "../../src/StaffDashboard.js";
import * as api from "../../src/api.js";
afterEach(() => vi.restoreAllMocks());
it("exposes metric values in accessible link names instead of hiding them behind labels", async () => {
  vi.spyOn(api,"getStaffDashboard").mockResolvedValue({generatedAt:"2026-09-27T00:00:00Z",timeZone:"Asia/Bangkok",recentWindow:{from:"2026-09-20T00:00:00Z",to:"2026-09-27T00:00:00Z"},metrics:{unassignedTickets:7,myOwnedTickets:2,myPendingActions:4,byStatus:{OPEN:7},activeByPriority:{HIGH:3}},recentTickets:[],urgentTickets:[],myPendingActions:[]});
  render(<StaffDashboard name="Staff"/>);
  expect(await screen.findByRole("link",{name:"Unassigned Tickets, 7"})).toHaveAttribute("href",expect.stringContaining("owner=unassigned"));
  expect(screen.getByRole("link",{name:"My pending actions, 4"})).toHaveAttribute("href",expect.stringContaining("actionAssignee=me"));
  expect(screen.getByRole("link",{name:"High priority, 3"})).toBeInTheDocument();
  expect(screen.getAllByRole("main")).toHaveLength(1);
});
