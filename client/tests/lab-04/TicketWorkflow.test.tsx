import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import * as api from "../../src/api.js";
import { StaffOperations } from "../../src/StaffOperations.js";
const ticket = { id: 42, currentStatus: "OPEN", itPriority: "LOW", owner: { id: 4, displayName: "Staff", role: "IT_STAFF" }, version: 1 } as api.TicketDetail;
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.spyOn(api, "getAssignees").mockResolvedValue([ticket.owner!]);
  vi.spyOn(api, "getStatusHistory").mockResolvedValue([]);
  vi.spyOn(api, "getTicket").mockResolvedValue({ ...ticket, version: 2 });
  vi.spyOn(api, "mutateStaffTicket").mockResolvedValue({ ...ticket, currentStatus: "RESOLVED", version: 3 });
});
afterEach(() => vi.restoreAllMocks());
function Harness({ initial = ticket }: { initial?: api.TicketDetail }) { const [t, set] = useState(initial); return <StaffOperations ticket={t} editable onUpdate={set} />; }
for (const [status, code, expected] of [["RESOLVED","RESOLUTION_BLOCKED","Complete work in the current cycle"],["CANCELLED","ACTIVE_ACTIONS","Cancel pending actions individually"]]) {
  it(`explains ${code}, retains reason, and reloads before another explicit save`, async () => {
    vi.mocked(api.mutateStaffTicket).mockRejectedValueOnce(new api.ApiError("Untrusted backend text",409,code));
    const user=userEvent.setup();render(<Harness />);
    await screen.findByRole("option",{name:"Staff (IT Staff)"});
    await user.selectOptions(screen.getByLabelText("Next status"),status);
    await user.type(screen.getByLabelText("Public status reason (required)"),"Documented reason");
    await user.click(screen.getByRole("button",{name:"Change status"}));
    await user.click(screen.getByRole("button",{name:"Confirm change"}));
    expect(await screen.findByText(new RegExp(expected))).toBeInTheDocument();
    expect(screen.getByLabelText("Public status reason (required)")).toHaveValue("Documented reason");
    expect(screen.getByRole("link",{name:"Review Actions Taken"})).toHaveAttribute("href","#actions-heading");
    expect(screen.getByRole("button",{name:"Change status"})).toBeDisabled();
    await user.click(screen.getByRole("button",{name:"Reload Ticket"}));
    await screen.findByText(/Latest Ticket loaded/);
    await user.click(screen.getByRole("button",{name:"Change status"}));
    await user.click(screen.getByRole("button",{name:"Confirm change"}));
    expect(api.mutateStaffTicket).toHaveBeenLastCalledWith(42,"status",{currentStatus:status,version:2,confirmed:true,reason:"Documented reason"});
  });
}
it("contains keyboard focus and suppresses repeated confirmation while saving", async () => {
  let resolve!: (v: api.TicketDetail)=>void;
  vi.mocked(api.mutateStaffTicket).mockReturnValue(new Promise(r=>{resolve=r;}));
  const user=userEvent.setup();render(<Harness />);await screen.findByRole("option",{name:"Staff (IT Staff)"});
  await user.selectOptions(screen.getByLabelText("Next status"),"IN_PROGRESS");
  await user.click(screen.getByRole("button",{name:"Change status"}));
  const dialog=screen.getByRole("dialog"), cancel=within(dialog).getByRole("button",{name:"Cancel"}), save=within(dialog).getByRole("button",{name:"Confirm change"});
  cancel.focus();await user.tab({shift:true});expect(save).toHaveFocus();await user.tab();expect(cancel).toHaveFocus();
  await user.dblClick(save);expect(api.mutateStaffTicket).toHaveBeenCalledTimes(1);
  resolve({...ticket,currentStatus:"IN_PROGRESS",version:2});await screen.findByText("Ticket updated.");
});
for(const [status,destinations] of Object.entries({NEW:["Open","Cancelled"],OPEN:["In Progress","Waiting For Requester","Resolved","Cancelled"],IN_PROGRESS:["Waiting For Requester","Resolved","Cancelled"],WAITING_FOR_REQUESTER:["In Progress","Resolved","Cancelled"],RESOLVED:["Closed","Reopened"],CLOSED:["Reopened"],REOPENED:["Open","In Progress","Waiting For Requester","Resolved","Cancelled"],CANCELLED:[]})) {
  it(`shows only allowed destinations for ${status}`,()=>{render(<Harness initial={{...ticket,currentStatus:status as api.TicketDetail["currentStatus"]}} />);expect(within(screen.getByLabelText("Next status")).getAllByRole("option").map(o=>o.textContent)).toEqual(["Choose next status",...destinations]);});
}
