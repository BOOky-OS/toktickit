# Lab 4 UI Specification

Status: peer-reviewed contract from Issue #56 / PR #57, 2026-09-24. Issue #59 implements the Actions Taken section and shared Admin permission controls; Issue #60 implements final Ticket gate feedback and confirmation focus. Dashboards remain planned. See [UI implementation evidence](actions-ui-evidence.md) for actual tests, screenshots and limits. Use [business rules](specification.md), [API shapes](api-spec.md) and [planned verification](tests.md) together.

## 1. Shared shell and navigation

Preserve existing Zen Green tokens, typography, cards, buttons, fields, badges and navigation conventions. Use one h1 per page and semantic header/nav/main. Add Dashboard to each role's shell and make it the normal post-login landing destination after required password change: `/dashboard` for Requester, `/staff/dashboard` for Staff/Admin. Explicit allowed deep links still open their target; existing direct list/detail/users URLs remain valid.

Requester navigation includes Dashboard, Create Ticket and My Tickets. Staff includes Dashboard and Ticket Queue. Admin includes Dashboard, Ticket Queue and User Management. Preserve profile/password/logout and existing health/reference access. Active-page state uses text/shape and aria-current, not green alone. Admin gains Staff operational controls under the Lab 4 matrix; remove earlier read-only Admin copy only where that permission has changed. Do not show Staff a Requester-only Create Ticket shortcut merely because it appears in a handout mockup.

URL query state must drive filtered lists on navigation, refresh and browser Back/Forward. Show active filters with Clear and retain existing search/sort/page behavior. A card link resets page to 1. Existing routes must remain usable when no new filters are supplied.

## 2. Requester Dashboard

Show greeting, heading, last-updated time (Asia/Bangkok label), Refresh and four metric cards: Open Tickets, Waiting for You, Updated in Last 7 Days, Resolved in Last 7 Days. Help text makes clear that Open excludes Resolved/Closed/Cancelled and recent resolution includes currently Closed Tickets resolved during the window. Cards use the backend numbers and links from the contract, never client-side counting of the recent list.

Below cards show up to five recent Tickets with number, summary, status and updated time, plus Create Ticket and View My Tickets. Each item opens authorized Detail. Do not duplicate the full My Tickets table. Empty recent list says no updates in the last seven days; an all-zero dashboard offers Create Ticket. A zero card still opens its correctly filtered empty list. Requester data must be cleared on logout/identity change; an old user's snapshot must never flash for a new login.

## 3. Staff and Administrator Dashboard

Show Unassigned Active Tickets, My Active Tickets and My Pending Actions cards; compact groups for all eight Ticket statuses and active Tickets by IT Priority. Counts include zero labels. Each status/priority links to its Queue filter. Label My Pending Actions as action count; its link says "View Tickets containing my pending actions" because several actions can belong to one Ticket.

Show up to five current-user pending actions (status, short description, Ticket link), five urgent active HIGH-priority Tickets and five recently updated Tickets. Action item links open Detail and focus the relevant action. Staff/Admin metrics share layout and rules; owner/assignee=me always refers to the current actor. Admin retains a User Management navigation link, without adding optional user analytics.

No daily comparison arrows or trend percentages are shown without a defined dataset/calculation. Display labels for all statuses/priorities and clearly separate count cards from the short lists. A useful operational empty state offers Queue rather than an unauthorized Create Ticket action.

## 4. Actions Taken on Ticket Detail

Add an Actions Taken section alongside existing summary, public history, comments, notes and attachments. Default list order is creation time ascending, with paginated controls (10/25/50); edits do not reorder items. Desktop may use a table with expandable details; mobile uses labelled cards. Both expose all fields and terminal entries. Requesters see the same current items on their own Ticket with read-only fields and no private revision panel.

Each item shows action date/time, created time, description, Result, Performed by, Assigned to, status, Follow-up Required, Follow-up Note and Attachment Notes. Show completed/cancelled time and cancellation reason when present. Explain that all current action content is visible to the Ticket's Requester; sensitive material belongs in Internal Notes. Attachment Notes are text references; do not turn arbitrary text into downloadable URLs or render HTML.

Staff/Admin have Add Action when the Ticket is in an eligible status. Create mode uses:

| Field | Behavior |
| --- | --- |
| Action Date/Time | Required; defaults now; label Asia/Bangkok, convert to offset-qualified ISO; reject before Ticket creation/future values |
| Description | Required, 5-2000 trimmed characters |
| Result | Optional until completion; up to 2000; completion requires 5-2000 |
| Performed by | Read-only authenticated creator, never editable |
| Assigned to | Required eligible active Staff/Admin select, defaults to actor |
| Follow-up Required | Required yes/no; explain completion requires No |
| Follow-up Note | Required 5-1000 when Yes; otherwise optional up to 1000; retain existing text when switching to No |
| Attachment Notes | Optional plain text up to 1000; refer to existing Ticket files |

Status is initially PLANNED and read-only in the edit form. Save/Cancel are explicit. Existing action edit permits the same editable fields on PLANNED/IN_PROGRESS items; immutable fields stay read-only. A legacy/inactive current assignee is shown as unavailable and must be replaced before edit/start/complete. Cancellation remains possible without selecting a new active assignee. Revision history is available only to Staff/Admin, ordered by version with actual actor, time and changed content.

Status controls offer only permitted destinations: PLANNED -> Start or Cancel; IN_PROGRESS -> Complete or Cancel. Completion explains missing Result/follow-up requirements and lets the user edit first. Cancellation uses a confirmation dialog and requires a reason. COMPLETED/CANCELLED have no edit/status controls; Add Action is the correction path, referencing the prior item. A resolved parent explains that it must be reopened before action writes. Closed still allows the permitted Ticket Reopen action; Cancelled cannot reopen.

Disable the relevant controls during save, preserving unsaved fields elsewhere. Create/edit/status requests retain their idempotency key for the same ambiguous attempt. A successful save refetches current Ticket summary/version, actions and any visible history, then announces success. Never expose database version fields as user inputs. When the user cancels a dirty form or navigates away, confirm discard; successful save clears the dirty state.

## 5. Ticket workflow and shared permissions

Use the matrix in specification BR-11. Staff/Admin status controls display allowed transitions, owner prerequisites and a confirmation prompt. Resolve explains the need for current-cycle completed work and no pending actions; Cancel explains any remaining nonterminal actions. Do not automatically complete/cancel child actions. After successful change refresh the Ticket summary, status history and action controls.

Requester "Problem Appears Resolved" remains advisory, with its timestamp and explanatory text. Requesters cannot select formal Ticket statuses. Public history retains stable order and no edit/delete controls. Internal Notes remain absent from Requester DOM, response and counts. Admin comments/notes/operations now use Staff behavior; Requester-only file controls remain restricted.

## 6. Feedback and recoverable failures

| State | Required behavior |
| --- | --- |
| Loading | aria-busy and meaningful progress text; avoid showing placeholder zero counts as real results |
| Empty/no results | Distinguish no records from active filters matching none; retain filters and offer Clear where applicable |
| Field validation | Error summary with links, adjacent field messages, aria-invalid/describedby; preserve all inputs |
| Success | Announce result via polite live region; refresh affected data without losing unrelated drafts |
| Forbidden | Explain unavailable access and offer permitted home; clear protected content |
| Not found | Generic unavailable Ticket/action; no existence leak; return to appropriate list |
| Conflict | Keep draft separately, explain data changed, offer Reload; show fresh server values and require explicit review before a new save/key |
| Network/500 | Retain draft; offer safe retry; dashboard may retain prior data only with stale label and timestamp |
| Expired/revoked session | Clear protected in-memory state and route to login; do not persist sensitive drafts to browser storage |

Never label an ambiguous write as saved. Do not blindly repeat existing non-idempotent comment/file requests; reload their data before deciding to retry. Refresh/reload must not silently replace an unsaved action form. Invalid URL filters produce a clear correction/reset action rather than a blank screen.

## 7. Responsive and accessibility contract

Use existing breakpoints: desktop >=992 px, tablet 768-991 px, mobile <768 px. Cards use available columns and stack on narrow screens; fields use two columns where useful and one on mobile; long text spans full width. Controls wrap and long descriptions/file references break safely. Avoid page horizontal scrolling. Action buttons have minimum 44px touch targets.

Preserve skip link, semantic headings/landmarks, real labels, logical keyboard order and visible focus. Counts have descriptive link names including metric and value. Status/priority use text, not color alone. Normal-text contrast >=4.5:1; large text and non-text controls/focus >=3:1. Dialogs have accessible names, initial focus, focus containment, Escape/Cancel when safe and trigger-focus restoration. Busy/disabled states are programmatically exposed. No hover-only action.

Verify desktop 1440x900, tablet 834x1112, mobile 390x844 and narrow 320px layout. Check actual 200% browser zoom when available; label a CSS-viewport reflow approximation honestly if used. Keyboard checks include dashboard cards, filters, pagination, action create/edit/status dialogs and conflict recovery. Automated checks do not replace human readability and focus inspection.

## 8. Planned visual evidence checklist

Capture `artifacts/lab-04/screenshots/staff-dashboard/`, `requester-dashboard/`, `actions-taken/` and `ticket-workflow/`, with desktop/tablet/mobile subfolders. Use demo data without secrets. Actions Taken captures now exist locally in those folders (plus narrow/); workflow gate/confirmation captures also exist locally for desktop/tablet/mobile; dashboard captures remain planned. Retain readable original captures and document the tested commit/environment.

- [ ] Initial, loading, zero/empty, populated and safe-failure dashboards; exact DB count comparison.
- [ ] Requester ownership, Staff/Admin navigation, current-user actions and drill-down filters.
- [ ] Action list, create, assign, edit, start, complete, cancel and inactive-assignee rejection.
- [ ] Conditional validation, read-only performer, terminal/parent restrictions and retained drafts.
- [ ] Workflow gate, stale updates, append-only public history and Requester visibility.
- [ ] Zen Green consistency, labels, spacing, colors, focus, modal operation and keyboard reachability.
- [ ] No clipped text, overlapping controls, horizontal overflow, broken links, console errors or unfinished controls.
- [ ] Desktop/tablet/mobile and zoom/reflow evidence reviewed; limitations reported explicitly.
