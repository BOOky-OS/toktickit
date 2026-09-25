# Lab 4 REST API Contract

Status: peer-reviewed contract from #56 / PR #57, 2026-09-24. Issue #58 implements the Actions endpoints, Admin/account extensions and workCycle storage/reopen increment. Issue #60 implements the final Ticket gates; dashboard/filter endpoints remain planned for #61/#62. See [workflow evidence](workflow-evidence.md). Business rules and authorization are defined in [specification.md](specification.md). Existing [Lab 3 APIs](../lab-03/api-spec.md) continue except the explicit extensions here.

## 1. Common conventions and authorization

All paths below are relative to `/api`. Require a valid active cookie session and completed password change, as in Lab 3. New mutations require existing CSRF header/origin checks; no caller-supplied actor identity. Update `permittedRoles` and transactional `mutationGuard` together. Match new routes explicitly before broad `/tickets/*` fallbacks; do not accidentally give Requesters action write access. ADMIN gains IT_STAFF operation/comment/note permissions as specified by BR-10, but not Requester-only creation/upload/removal/indication rights.

IDs and versions are positive safe integers; path IDs are canonical positive decimal strings. Reject unknown, repeated or malformed query fields, unknown body fields, invalid JSON and invalid enums with 400. JSON objects are required. Trim free text, not enum/identity values. Dates must be valid ISO 8601 instants with Z or an explicit offset; date-only strings are invalid. Responses use UTC ISO strings, explicit nulls for nullable values and no secrets. Preserve existing no-store caching and security headers.

| HTTP | Code / behavior |
| --- | --- |
| 400 | VALIDATION_ERROR; `{error,code,fieldErrors?}` with safe field errors |
| 401 | Existing unauthenticated/session-expiry behavior |
| 403 | Existing forbidden/CSRF/password-change behavior; no resource body |
| 404 | NOT_FOUND; generic unavailable for missing/foreign Ticket/action |
| 409 | STALE_VERSION, INVALID_ASSIGNEE, INVALID_ACTION_TRANSITION, ACTION_READ_ONLY, TICKET_READ_ONLY, RESOLUTION_BLOCKED, ACTIVE_ACTIONS, IDEMPOTENCY_CONFLICT, plus existing workflow/user conflicts |
| 500 | Safe generic failure; no SQL, stack, filesystem path or credentials |

Resolve role denial before resource lookup. Authorized read then checks Ticket ownership and the action's parent relationship. Do not expose private record existence via error details. Preserve inherited auth rate limiting and existing 413 handling for oversized JSON. Empty collections succeed with 200 and []/zero counts.

## 2. Shared response types

`Person = {id,displayName,role}`; roles are REQUESTER, IT_STAFF, ADMIN. No email in operational summaries. Historical User FKs are retained; current display name/role may change, but IDs do not.

```text
Action = {
  id, ticketId, actionAt, description, result,
  performedBy: Person, assignee: Person,
  followUpRequired, followUpNote, attachmentNotes,
  status, version, createdAt, updatedAt,
  completedAt: ISO|null, cancelledAt: ISO|null,
  cancellationReason: string|null
}
ActionWriteResult = { action: Action, ticketVersion: integer }
ActionList = { items: Action[], ticketVersion, page, pageSize,
  totalItems, totalPages, hasPreviousPage, hasNextPage }
Revision = { id, actionId, version, event, actor: Person,
  createdAt, snapshot: Action }
TicketSummary = { id, ticketNumber, summary, currentStatus, itPriority,
  updatedAt, requester: {id,displayName}, owner: Person|null }
```

Revision snapshots serialize safe action fields only, including the names/roles captured at that revision. No receipt request/response storage, seed keys or private notes are exposed. Summary fields do not replace the existing full TicketDetail response. Requester Dashboard uses the exact same TicketSummary shape, including its own requester identity.

The form reuses GET /staff/assignees for active Staff/Admin options, ordered displayName ASC/id ASC. Historical assignees remain visible in Action responses; eligibility is rechecked on writes. Internal workCycle is not a public DTO or input field.

## 3. Actions Taken endpoints

| Method / path | Access | Success |
| --- | --- | --- |
| GET /tickets/:ticketId/actions | Owning Requester, Staff, Admin | 200 ActionList |
| POST /tickets/:ticketId/actions | Staff, Admin | 201 ActionWriteResult |
| PATCH /tickets/:ticketId/actions/:actionId | Staff, Admin | 200 ActionWriteResult |
| POST /tickets/:ticketId/actions/:actionId/status | Staff, Admin | 200 ActionWriteResult |
| GET /tickets/:ticketId/actions/:actionId/history | Staff, Admin | 200 paginated Revision collection |

GET collections accept only `page` (default 1) and `pageSize` (10 default, 10/25/50); computed offset <=1,000,000. Actions use createdAt ASC/id ASC; revisions use version ASC/id ASC. Both use the existing page envelope and consistent list/count snapshot. Empty totalPages=0, previous=page>1, next=page<totalPages; beyond-last returns empty items and correct totals. History has the same envelope without ticketVersion. No action filters conceal cancelled/completed items from Requesters.

POST create exact body:

```json
{
  "ticketVersion": 3,
  "actionAt": "2026-09-24T03:00:00.000Z",
  "description": "Checked the network connection.",
  "result": "Follow-up connection test required.",
  "assigneeId": 7,
  "followUpRequired": true,
  "followUpNote": "Repeat the test after the requester reconnects.",
  "attachmentNotes": "See the existing Ticket file network-check.png."
}
```

All fields shown are required; optional text is represented by empty strings. BR-04/05 validation applies. Backend supplies ticketId, performer, PLANNED state, version=1, current parent workCycle, timestamps and null terminal fields. Validate the date against Ticket.ticketDate and transaction time. A CREATE revision is stored. Reject input such as performedById, createdAt, status, version, workCycle, seedKey or arbitrary nested objects.

PATCH exact body is the same editable fields plus `version` and `ticketVersion`; all editable fields are required (explicit complete edit, not arbitrary partial patch). It cannot alter parent, performer, createdAt or status. Current action must be PLANNED/IN_PROGRESS and parent eligible. Assignments and conditional notes are revalidated; no-op behavior is BR-17.

POST status exact body: `{status,version,ticketVersion,confirmed:true,reason?}`. Status is a destination enum; cancellation requires reason 5-1000 characters. Other destinations reject a supplied reason. Edit Result/follow-up before completion, then send the refreshed versions. Completion sets completedAt; cancellation sets cancelledAt and cancellationReason. All writes obey the current-state matrix in BR-06/07.

Every action mutation requires UUID `Idempotency-Key`. Canonicalization uses validated field values and fixed key ordering; normalized payload includes supplied versions. Receipt replay follows BR-18 and returns original HTTP status/body with `Idempotency-Replayed: true`. After replay the UI refetches current Ticket/actions, because the saved original response may be older than later edits. Expose the replay header to the configured allowed frontend origin. A new changed request gets a new key. After ambiguous transport failure retry the same body/key; never generate a second key automatically.

Transaction order: acquire security advisory lock; revalidate current actor/session/role and authorized resource scope; resolve existing receipt; lock Ticket then action; check expected versions; check parent/action state, assignee, fields and transitions; write action/revision/parent version/receipt; commit. Any failure rolls back all writes. Reusing a key on another method/path is a conflict, not a replay. Failed validations do not reserve a successful receipt. Missing/malformed Idempotency-Key is 400 VALIDATION_ERROR. A current-version same-value PATCH returns unchanged data and stores its receipt without a new revision. Validate fields before detecting a no-op. After version checks, a terminal action returns ACTION_READ_ONLY and an ineligible parent returns TICKET_READ_ONLY. Two identical simultaneous requests serialize to one effective write and one replay.

## 4. Ticket workflow and account extensions

Existing `/staff/tickets/:ticketId/claim`, `/owner`, `/priority`, `/status` retain their exact methods, request shapes and TicketDetail responses from Lab 3. Staff and Admin now share access. `/status` enforces BR-11..16 inside its existing locked transaction. `version` remains the Ticket version, not an action version.

Resolution checks for at least one completed action whose workCycle equals the parent and zero nonterminal actions on that Ticket; otherwise return 409 RESOLUTION_BLOCKED with safe guidance to review Actions Taken. Reopen increments Ticket.workCycle atomically with the status/history write. Cancel requires zero nonterminal actions, otherwise 409 ACTIVE_ACTIONS. Do not leak internal revision data in those errors. Close of an already resolved legacy Ticket is allowed. No automatic action state changes accompany Ticket changes. Status history remains public to the owning Requester and append-only.

Retain Requester-only `/tickets/:ticketId/resolution-indication`; it never formally resolves a Ticket. Extend Admin account update's ACTIVE_ASSIGNMENTS predicate to include pending action assignments, in the same security lock as reassignment. No new user-administration endpoint is needed. Comments/notes permit Admin posting under existing status/validation/append-only rules; file mutations remain owning-Requester-only.

## 5. Dashboard endpoints and payloads

`GET /dashboards/requester`: REQUESTER only. `GET /dashboards/staff`: IT_STAFF or ADMIN. No query parameters or body; reject supplied scope/user/date filters. Backend derives the identity, captures T once, and computes all fields in one consistent snapshot. Return 200, including zero-valued keys and empty arrays. No entire Ticket collection is returned.

```text
RequesterDashboard = {
  generatedAt, timeZone: "Asia/Bangkok", recentWindow: {from,to},
  metrics: {openTickets, waitingForRequester, recentlyUpdated, recentlyResolved},
  recentTickets: TicketSummary[0..5]
}
StaffDashboard = {
  generatedAt, timeZone: "Asia/Bangkok", recentWindow: {from,to},
  metrics: {
    unassignedTickets, myOwnedTickets, myPendingActions,
    byStatus: {NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,RESOLVED,CLOSED,REOPENED,CANCELLED},
    activeByPriority: {LOW,MEDIUM,HIGH}
  },
  recentTickets: TicketSummary[0..5],
  urgentTickets: TicketSummary[0..5],
  myPendingActions: [{id,ticketId,description,status,updatedAt,
    ticket:{id,ticketNumber,summary,currentStatus}}][0..5]
}
```

All metric values are nonnegative integers. BR-22..24 define exact predicates and ordering. Truncate action description to 120 characters in dashboard summaries only, preserving full text in Detail. Pending actions belong to the current actor as assignee, not necessarily performer. Recent Ticket items use the same seven-day boundary; urgent items and pending actions have no recent-window restriction. Keep Internal Notes and receipt/revision content out of all summaries. Auth failures are not converted into empty success data.

## 6. Drill-down filter extensions

Extend existing `GET /tickets` and `GET /staff/tickets`, retaining their existing auth, search/sort/paging and response shapes. UI uses `/my-tickets` for Requester list and `/staff/tickets` for Queue (both routes verified in existing App.tsx). Add:

| Query | Meaning / validation |
| --- | --- |
| statusGroup | Only `active`; statuses are the five in BR-23. Mutually exclusive with currentStatus. |
| updatedSince, updatedBefore | Both required together; inclusive ISO instant bounds on updatedAt; lower <= upper. |
| resolvedSince, resolvedBefore | Both required together; inclusive bounds on resolvedAt AND currentStatus in {RESOLVED,CLOSED}. |
| actionAssignee | Staff Queue only, exactly `me`; EXISTS a PLANNED/IN_PROGRESS action assigned to actor; distinct parent Tickets. |

Allow at most one date pair; reject mixed updated/resolved pairs. Resolved-date filters cannot combine with currentStatus/statusGroup. Other existing compatible filters combine with AND. Window upper bound may be at/before now; reject future or reversed bounds. Omitted filters retain existing behavior. Date strings passed in URLs must be URL-encoded. Requester ownership is always applied, regardless of filter input. Existing active owner-ID filtering rules remain; unfiltered historical inactive owners still appear.

Card links use page=1, default pageSize=10 and the dashboard's exact recentWindow bounds. Waiting/active/priority/owner cards use the mapping in specification section 5. Recent items go to `/tickets/:id`. Current-user action items go to `/tickets/:ticketId#action-:id`; Detail locates/focuses that action even if it is on a later page (load pages until found or report unavailable safely). Browser refresh/back preserves URL filters and their visible labels. Counts reflect the time of each request, not a stored dashboard snapshot.

## 7. Performance and failure contract

Use bounded aggregate/grouped queries, indexed predicates and EXISTS for action joins, with no per-Ticket query loop. Record query count and query plan in performance smoke evidence: at most 10 SQL read queries per dashboard request excluding session checks, regardless of dataset size. On the documented local test machine, after five warm-ups, target p95 <=1000 ms over 30 sequential requests for 1000 Tickets and 3000 actions; retain raw timings and environment. This is a lab acceptance threshold, not a production SLA.

Database failure returns a safe 500; do not return partial counts as a valid dashboard. Frontend preserves the last displayed snapshot with an explicit stale/error label, or shows an initial error without fabricated zeros. The Refresh action retries a read. No external network notification/reporting service is introduced.
