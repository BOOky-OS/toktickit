# Lab 4 Sprint Engineering Specification

Status: proposed engineering contract for Issue [#56](https://github.com/BOOky-OS/toktickit/issues/56), prepared 2026-09-24. Student and peer review pending. This records target behavior, not completed implementation or passing tests.

Sources: `SE+Lab+4.pdf`, sections 1-14 and the nine-part rubric; existing Lab 3 contracts and code at `754a81d`; root `skill.md`. No newer instructor announcement was supplied. This contract extends [Lab 3](../lab-03/specification.md); the explicit changes below supersede its affected rules. Companion documents: [UI](ui-spec.md), [API](api-spec.md), [tests](tests.md).

## 1. Sprint Goal

Complete the TokTickIT service-desk workflow with auditable Actions Taken, enforced Ticket resolution, useful role dashboards, and verified regression across Labs 1-3. Preserve existing data and deliver a consistent, accessible Zen Green application with evidence from the final main commit.

## 2. Stakeholder Request

Staff need to record work performed under a Ticket while one primary owner coordinates it. Requesters need visibility of that work and a summary of their own Tickets. Staff and Administrators need concise operational summaries linked to detail screens. Requester resolution indications remain advisory; authorized staff make the formal workflow decision.

## 3. Scope

Included: Actions Taken model, assignment, create/edit/status/history; final Ticket workflow; Requester and Staff/Admin dashboards; additive PostgreSQL/Prisma migration and seed; API/UI authorization; concurrency and retry handling; regression, accessibility, visual review, and final release evidence.

Excluded: SLA clocks, escalation, on-call schedules, external notifications, stock/spare-parts/purchasing/cost accounting, payroll/billing, multi-level approval/e-signature, advanced BI/export warehouses, multi-tenancy, production cloud operations, and additional product features. Attachment Notes are plain-text references to existing Ticket files, not a new upload subsystem. Optional Admin user-count analytics are omitted.

## 4. Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-01 | Staff/Admin create, assign and edit Actions Taken on eligible Tickets; automatically identify the recording performer. |
| FR-02 | Staff/Admin start, complete or cancel an action through its documented lifecycle, with retained revisions. |
| FR-03 | Owning Requesters see every current Actions Taken item, including completed/cancelled items, read-only; other Requesters cannot access them. |
| FR-04 | Enforce the final Ticket transition matrix, resolution gate, owner prerequisites and append-only status history in the backend. |
| FR-05 | Return a Requester dashboard scoped exclusively to the authenticated user's Tickets. |
| FR-06 | Return a Staff/Admin dashboard with operational counts, current-user actions and recent/urgent Tickets. |
| FR-07 | Dashboard links open correctly filtered existing lists or Ticket Detail; refresh recomputes authoritative values. |
| FR-08 | Preserve existing records through migration, handle legacy Tickets, and supply repeatable demonstration seeds. |
| FR-09 | Enforce role/ownership, validation, atomic writes, stale-update detection and safe retry behavior. |
| FR-10 | Extend the responsive Zen Green shell and accessible forms, feedback, navigation and read-only presentation. |
| FR-11 | Preserve and verify Labs 1-3 behavior except the explicitly specified Admin capability and resolution changes. |
| FR-12 | Deliver traceable tests, peer-review/AI-use records, screenshots, setup instructions and the final nine-part PDF. |

## 5. Business Rules

### Action data and lifecycle

- **BR-01:** Each Action Taken belongs to exactly one existing Ticket. No endpoint moves an action to another Ticket or deletes it.
- **BR-02:** Ticket owner coordinates the Ticket. Action `assigneeId` can be a different active IT_STAFF or ADMIN. Assignment is required, defaults to the actor, and is revalidated on create/edit/start/complete. Inactive or Requester targets produce `409 INVALID_ASSIGNEE`. Historical terminal assignees remain visible.
- **BR-03:** `performedById` is the authenticated creator and immutable; `createdAt` is server time. Assignment represents responsibility for the action/follow-up, not permission to impersonate its recorder. Each later edit records its actual actor in revision history. This interpretation is a proposed decision; see section 11.
- **BR-04:** `actionAt` is an offset-qualified ISO instant, no earlier than Ticket creation and no later than transaction time. UI defaults it to now; server stores UTC. Description is trimmed 5-2000 characters; Result is 0-2000, required 5-2000 on completion; follow-up and attachment notes are each 0-1000. Text is plain text; lengths use JavaScript UTF-16 code units, consistent with existing validation.
- **BR-05:** `followUpRequired` is a required boolean. If true, trimmed `followUpNote` must be 5-1000 characters. If false, the note may remain as historical context. Completion requires `followUpRequired=false`; the user must explicitly record the final Result and resolve follow-up first. No automatic clearing of flags or notes.
- **BR-06:** New actions start `PLANNED`. Permitted transitions: PLANNED -> IN_PROGRESS or CANCELLED; IN_PROGRESS -> COMPLETED or CANCELLED. All other pairs, including same-state requests, fail with `409 INVALID_ACTION_TRANSITION`. COMPLETED/CANCELLED actions are immutable; corrections use a new action referencing the previous action ID in its description.
- **BR-07:** Staff/Admin may create/edit/transition actions only while the parent Ticket is NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER or REOPENED. RESOLVED/CLOSED/CANCELLED prohibit action writes (`409 TICKET_READ_ONLY`); reopen the Ticket where permitted before adding work. All eligible staff may collaborate, independently of owner/assignee identity.
- **BR-08:** Action cancellation requires a plain-text reason of 5-1000 characters and retains the item, Result and earlier revisions. Terminal timestamps are server-generated. Cancel does not require an active assignee, allowing cleanup of historical invalid assignments.
- **BR-09:** List actions by `createdAt ASC, id ASC`, independent of editable `actionAt`. Each effective write appends an immutable full revision in the same transaction. No PATCH/DELETE for revision or Ticket history. Requesters see all current action fields; detailed revision snapshots are Staff/Admin-only.

### Authorization matrix

**BR-10:** Completed password change and active cookie session are required. Every mutation enforces CSRF, backend role checks and current identity inside the transaction. Parent ownership is checked before serializing an action. A Requester asking for another user's Ticket/action gets generic 404; forbidden role operations get 403 without resource data.

| Capability | Requester | IT Staff | Administrator |
| --- | --- | --- | --- |
| Requester Dashboard, My Tickets, create Ticket | Own only | No | No |
| Read Ticket, Actions Taken and public history | Own only | All | All |
| Create/edit/assign/transition Actions Taken | No | Yes, BR-02..08 | Same as Staff |
| Read action revision history | No | Yes | Yes |
| Staff Dashboard and Queue | No | Yes | Yes |
| Claim, owner, priority, Ticket status | No | Yes | Same as Staff |
| Public Comments | Own, existing rules | Yes | Yes |
| Internal Notes | No content/count/access | Yes | Yes |
| Upload/remove Ticket Attachments | Own, existing rules | No | No |
| Download active Attachments | Own | All | All |
| Requester resolution indication | Own only | No | No |
| User administration | No | No | Yes |

Lab 4 section 4.3 explicitly gives Admin IT Staff behavior. This changes Lab 3's Admin read-only Ticket operations/comments/notes rule. Update both routing and transaction guards, UI controls and the affected earlier authorization tests; retain all other security boundaries. Do not broadly allow every `/tickets/*` write for Admin.

### Ticket workflow

**BR-11:** Retain all eight statuses and the existing permitted pairs. Staff/Admin are the only transition actors. Every unlisted or same-status transition is rejected.

| From | Allowed destinations |
| --- | --- |
| NEW | OPEN, CANCELLED |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED |
| RESOLVED | CLOSED, REOPENED |
| CLOSED | REOPENED |
| REOPENED | OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| CANCELLED | None |

- **BR-12:** Keep existing version, confirmation, active owner and public reason rules. Entering IN_PROGRESS, WAITING_FOR_REQUESTER or RESOLVED requires an active eligible owner. Reasons of 5-1000 are required for RESOLVED, CLOSED, REOPENED and CANCELLED. An explicit unassign operation is permitted only in NEW/OPEN; cancellation of an unassigned NEW/OPEN Ticket may retain null ownership; owner/priority edits remain forbidden on CLOSED/CANCELLED.
- **BR-13:** Resolution gate (proposed): at least one COMPLETED action exists in the current work cycle; no PLANNED/IN_PROGRESS actions remain on the Ticket in any cycle. A completed action has valid Result and no unresolved follow-up. Ticket.workCycle starts at 1 and increments atomically on REOPENED. Each new action copies that value; clients cannot set it. Compare cycle integers, not timestamps, so equal timestamps cannot qualify old work. Old completed actions do not resolve a newly reopened problem. Gate failure is `409 RESOLUTION_BLOCKED`.
- **BR-14:** Closing a previously RESOLVED legacy Ticket is permitted without fabricating actions. Ticket cancellation requires zero nonterminal actions (`409 ACTIVE_ACTIONS` otherwise); staff must cancel those actions individually first. Ticket changes never silently cancel or complete actions.
- **BR-15:** Requester indication is advisory and changes no Ticket status. Retain its existing permitted states and idempotent same-version behavior. Resolve sets `resolvedAt`/summary; Close sets `closedAt`; Cancel sets `cancelledAt`/reason. Reopen clears resolved/closed time, resolution summary and requester indication, retaining immutable public history and all action records.
- **BR-16:** Ticket status and its history record commit together. History uses `createdAt ASC, id ASC`, is visible to the owning Requester and Staff/Admin, and is append-only. Comments and notes retain their existing append-only rules and separate visibility.

### Concurrency, migration and safe failure

- **BR-17:** Extend the existing transaction advisory lock `334003`: revalidate actor/session, lock parent Ticket, then check current versions and eligibility. Create action requires current `ticketVersion`; edit/status require `ticketVersion` and action `version`. Effective action writes increment both versions and Ticket.updatedAt and append a revision atomically. No-op edits validate versions first, then return unchanged data without revision/version increment. All direct stale writes return `409 STALE_VERSION` with no partial change.
- **BR-18:** Each new action mutation requires a UUID `Idempotency-Key` scoped to actor. Persist method, canonical resource path, normalized payload, response and key atomically. Same actor/key/request replays the original status/body without a second revision; changed request is `409 IDEMPOTENCY_CONFLICT`. Check replay after current authentication/authorization and before stale-version checking. Revoked users cannot replay. Keep receipts for the lab lifespan. An ambiguous failure retains the key; changed payload needs a new key and fresh versions. Existing Ticket operations already reject duplicates via versions; comments/files retain the documented manual reload-before-retry policy, not a new exactly-once claim.
- **BR-19:** Prevent deactivation or demotion out of IT_STAFF/ADMIN when the user owns existing nonterminal Tickets OR has PLANNED/IN_PROGRESS actions. Return `409 ACTIVE_ASSIGNMENTS`; reassign first. Keep existing last-admin/self-deactivation/session-revocation guards.
- **BR-20:** Migration preserves all existing IDs, relationships, credentials, sessions, files, comments, notes and history. Legacy Tickets have zero actions, not invented work. Their dashboards derive from existing data; new resolutions must meet BR-13, while already resolved legacy Tickets may close under BR-14.
- **BR-21:** Seed uses stable unique seed keys and insert-if-absent behavior; repeated runs do not overwrite real edits, credentials or existing work. Only explicitly opted-in local demo databases are seeded. Cover eight Ticket statuses, three priorities, assigned/unassigned ownership, zero/one/many actions, every action status, two performers on one Ticket, follow-up, and users with zero dashboard metrics.

### Dashboard calculations

**BR-22:** Backend queries authoritative PostgreSQL data in one consistent read snapshot. `generatedAt` is the transaction's captured UTC instant T. Recent means `[T - 7*24 hours, T]`, inclusive, not a calendar-week approximation. Transport uses UTC ISO strings; UI labels dates in Asia/Bangkok. Zero is 0 and no rows is []; never fabricate deltas/trends from the illustrative handout screenshots.

**BR-23:** Define active Ticket states A = {NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED}; resolved is not active. Requester scope R is `requesterId = session.user.id`. Staff/Admin scope S is all Tickets; neither is implicitly restricted to owner. Metric cards are independent and must not be added into a total.

| Scope / metric key | Exact calculation | Drill-down |
| --- | --- | --- |
| R / openTickets | Count R with status in A | My Tickets, statusGroup=active |
| R / waitingForRequester | Count R with WAITING_FOR_REQUESTER | My Tickets, currentStatus=WAITING_FOR_REQUESTER |
| R / recentlyUpdated | Count R with updatedAt in recent window | My Tickets, updatedSince/updatedBefore |
| R / recentlyResolved | Count R currently RESOLVED or CLOSED with resolvedAt in window | My Tickets, resolvedSince/resolvedBefore |
| S / unassignedTickets | Count active Tickets with null ownerId | Queue, owner=unassigned and statusGroup=active |
| S / myOwnedTickets | Count active Tickets with ownerId=actor | Queue, owner=me and statusGroup=active |
| S / byStatus | Eight counts over all S; include zeros | Queue, currentStatus=<enum> |
| S / activeByPriority | LOW/MEDIUM/HIGH counts over active S | Queue, itPriority=<enum> and statusGroup=active |
| S / myPendingActions | Count PLANNED/IN_PROGRESS actions assigned to actor on active Tickets | Queue, actionAssignee=me and statusGroup=active; distinct Tickets, explicitly labelled as containing these actions |

**BR-24:** Both dashboards include up to five recent Tickets, ordered updatedAt DESC/id DESC, within their scope and the recent window. Staff also gets up to five urgent active HIGH-priority Tickets ordered updatedAt DESC/id DESC, plus up to five own pending actions ordered action updatedAt DESC/id DESC. Each item links to its Ticket (action links focus its item). The action count is actions, while its Queue destination lists distinct Tickets; UI must explain that distinction. Rows contain only safe summaries; no note bodies, credentials, session identifiers or storage keys. Results are refreshed on return from successful relevant mutations; no polling is required.

**BR-25:** Preserve existing list filters and defaults. New filters and date-window query rules are defined in [api-spec.md](api-spec.md). List/count use matching predicates; paging must not duplicate Tickets joined to several actions. Passing another requester/user ID to Dashboard is rejected. A later list refresh may differ from an earlier card after concurrent writes; show the dashboard's update time and offer Refresh rather than claiming a persistent snapshot.

## 6. UI Specification Summary

Add `/dashboard` for Requesters and `/staff/dashboard` for Staff/Admin, navigation with an active indicator, and Actions Taken on existing Ticket Detail. Preserve direct access to existing My Tickets, Queue, Users and health/reference behavior. [ui-spec.md](ui-spec.md) defines forms, modes, safe feedback, responsive layouts and the visual checklist. Backend capabilities remain authoritative.

## 7. Data Changes

Proposed additive Prisma structures (implementation follows review):

| Model | Fields / constraints |
| --- | --- |
| Ticket increment | Add positive workCycle Int default 1; increment atomically on REOPENED; existing Tickets receive 1 without fabricated history |
| ActionTaken | Int PK; ticketId, performedById, assigneeId required User/Ticket FKs with RESTRICT; actionAt UTC timestamp; description varchar(2000); result varchar(2000) default empty; followUpRequired boolean; followUpNote/attachmentNotes varchar(1000) default empty; status ActionStatus default PLANNED; version Int default 1; createdAt/updatedAt; completedAt/cancelledAt nullable; cancellationReason varchar(1000) nullable; seedKey nullable unique varchar(80) |
| ActionStatus | PLANNED, IN_PROGRESS, COMPLETED, CANCELLED |
| ActionTakenRevision | Int PK; actionId FK RESTRICT; actorId FK RESTRICT; version Int; event CREATE/EDIT/STATUS; JSON snapshot of the safe Action response with captured Person names/roles; never credentials or seed keys; createdAt; UNIQUE(actionId,version) |
| ActionMutationReceipt | Int PK; actorId FK RESTRICT; key UUID; method/path; normalized request JSON; response status Int and response JSON; createdAt; UNIQUE(actorId,key) |

ActionTaken additionally stores immutable positive `workCycle`, copied from the locked parent on create; this is backend-managed and not a form field. Indexes: ActionTaken(ticketId,createdAt,id), (ticketId,workCycle,status), (assigneeId,status,updatedAt,id); ActionTakenRevision(actionId,version); Ticket(requesterId,resolvedAt,id) for recent-resolution drill-down. Reuse existing Ticket status/owner/priority/updatedAt indexes; inspect representative query plans before adding more. SQL constraints enforce positive versions and terminal timestamp consistency; backend enforces cross-record rules in the locked transaction. Use UTC instants consistently with existing Prisma DateTime storage.

Design decisions:

1. Normalize actions as child records rather than a Ticket JSON array: foreign keys, independent versions and filtered indexes support concurrent collaboration and enforce identity.
2. Keep editable current records plus append-only revisions: ordinary forms stay simple while actor, old values and state changes remain auditable. Terminal actions remain immutable.
3. Reuse the existing parent Ticket version and mutation lock: a resolution check cannot race a newly created action or deactivated assignee. Serializing writes is acceptable for this lab, not a production scaling claim.
4. Compute dashboard aggregates from source rows instead of stored counters: no counter backfill or drift on legacy data, with snapshot-consistent totals and lists.

Migration/recovery sequence: capture a restorable database backup and matching attachment storage before deployment; on an isolated restored copy, apply existing migrations then the new additive migration using `prisma migrate deploy`; compare before/after counts and representative IDs/FKs/content for every existing model, attachment files and login access; verify zero legacy actions and schema drift; run the seed twice and test existing edits survive. Rehearse restoring the backup to a separate database and validating old data. Transactional migration failure must roll back its DDL. After real writes exist, prefer a forward fix; never drop new action/history tables or restore over the working database as an automatic rollback. Deploy application and schema coherently; an old app bypasses the new resolution rule, so do not resume it for normal writes against a Lab 4 database. Implementation must record actual backup/restore commands and results before release.

## 8. API Contract

Keep `/api` prefix, cookie/CSRF authentication, safe `{error,code,fieldErrors?}` errors and existing request shapes unless explicitly extended. New action list/create/edit/status/history endpoints and role dashboard endpoints are fully specified in [api-spec.md](api-spec.md). No generic object PATCH, client-author identity or direct status/database bypass is permitted.

## 9. Acceptance Criteria

| ID | Observable acceptance criterion | Requirements |
| --- | --- | --- |
| AC-01 | Authorized create records one correctly parented action, authenticated performer and eligible assignee; invalid fields/assignees fail safely. | FR-01, FR-09 |
| AC-02 | Edits and allowed action transitions work; terminal records/history cannot be rewritten; follow-up and Result rules are enforced. | FR-02 |
| AC-03 | Requesters see all current actions only on their own Tickets and cannot mutate them or read private revisions/notes. | FR-03, FR-09 |
| AC-04 | Staff and Admin have the documented operational rights; unrelated Requester/admin-only permissions remain protected. | FR-09, FR-11 |
| AC-05 | Every permitted Ticket pair and rejected pair is tested; resolving without qualifying work fails even via direct API. | FR-04 |
| AC-06 | Reopen, legacy closure, cancellation, indication and stable append-only public history obey the cycle rules. | FR-04, FR-11 |
| AC-07 | Real concurrent writes/retries create no duplicate action/revision and cannot overwrite newer state or race resolution/account changes. | FR-09 |
| AC-08 | Upgrade preserves old records/files/auth and legacy dashboards; seed is repeatable; isolated recovery is demonstrated. | FR-08 |
| AC-09 | Requester metrics and recent rows match independent DB queries at zero, date boundaries and mixed ownership. | FR-05 |
| AC-10 | Staff/Admin metrics, own actions and recent/urgent rows match independent DB queries, including inactive historical users. | FR-06 |
| AC-11 | Every dashboard drill-down applies correct filters with stable paging, refresh/back navigation and no duplicate Tickets. | FR-07 |
| AC-12 | Actions Taken UI covers list/create/assign/edit/start/complete/cancel, validation, conflict and retained drafts. | FR-01, FR-02, FR-10 |
| AC-13 | Dashboards and workflow UI provide accessible loading/empty/forbidden/error/success feedback at required viewports. | FR-05, FR-06, FR-10 |
| AC-14 | Authentication, health, Requester flow, attachments, communication, staff operations and Admin users pass regression with explicit expectation changes. | FR-11 |
| AC-15 | Dashboard smoke checks meet the defined lab dataset/query budget and avoid unbounded collections/N+1 queries. | FR-06, FR-09 |
| AC-16 | Main contains peer-reviewed increments, actual passing evidence, complete docs and exactly one nine-part submission PDF. | FR-12 |

Every criterion maps to planned tests in [tests.md](tests.md). No Lab 4 acceptance criterion is claimed as passed by this documentation PR.

## 10. Definition of Done

- [ ] Contract reviewed before feature implementation; meaningful decisions are recorded without claiming student approval prematurely.
- [ ] All ACs have actual test files, commands, environment, tested commit and observed results; no required failures/skips hidden.
- [ ] Migration, repeatable seed and isolated recovery proven; all earlier data/features preserved except approved changes.
- [ ] Actions Taken, workflow and dashboards meet API/UI/authorization/concurrency contracts.
- [ ] Unit, API/integration, component, style, responsive, accessibility, performance smoke and real E2E checks pass.
- [ ] All major screens visually inspected at desktop/tablet/mobile; no broken controls, placeholders, console errors, clipping or overflow.
- [ ] README/setup/migration/seed/demo instructions current; repository hygiene and `.gitignore` checked.
- [ ] `reviewer.md` records real identities, PRs, comments, responses and approvals; `ai-use.md` includes the actual LLM, 6-10 real representative prompts and student reflection on specification/coding agents.
- [ ] Screenshots and completed visual checklist recorded; metric examples verified against database queries.
- [ ] Exactly one concise PDF has Answer Part 1 through Answer Part 9, in order, working links and legible evidence. Weights: workflow 10, Spec DD 5, Test DD 10, AI use 5, Staff dashboard 5, Actions Taken 10, Ticket workflow 5, Requester/regression 5, visual/accessibility 5 (60 total).
- [ ] Work branches peer-merged to `lab4-staging`; completed pre-release package shown to student; explicit pre-main documentation gate answered; peer release merge and final-main checks recorded; only then all Issues Done.

## 11. Assumptions and Decisions

These are AI-authored proposals for Issue #56 review, not instructor statements or recorded student acceptance of individual rules. The student selected an eight-Issue plan and confirmed Atip-Infa as reviewer on 2026-09-24.

| Topic | Source tension / chosen interpretation |
| --- | --- |
| Admin operations | Lab 4 section 4.3 gives Staff behavior; this overrides Lab 3's prior read-only Admin policy for operational writes, comments and notes. Requester-specific creation/files stay restricted. |
| Assignment/action statuses | Rubric Part 6 and example AC-01 require assign, transitions, complete/cancel and inactive-assignee rejection beyond the short field list. Add assignee and four-state lifecycle to meet that rubric. |
| Performed by | Auto-authenticated creator is immutable; assignee is work/follow-up responsibility; revision actors identify later contributors. Confirm this wording during review because the handout does not define delegation semantics. |
| Append-only versus editable | Part 7's append-only language applies to Ticket history; action editing is explicitly required by Part 6. Immutable action revisions preserve edits while current nonterminal actions remain editable. |
| Resolution gate | Handout requires a gate but does not give its exact predicate. Require current-cycle completed work and no pending actions; do not invent historical work. |
| Requester visibility | Section 8.3 says Requesters see all actions; interpret as all current items on their own Tickets, including terminal items, not other Requesters' Tickets or private revision snapshots. |
| Dashboard examples | Exact cards/time window are student design decisions; use BR-22..25 rather than copying mockup numbers or unsupported daily trends. |

Approved work-package order: (1) #56 contract; (2) Actions Taken foundation; (3) Actions Taken UI; (4) Ticket workflow; (5) Staff dashboard; (6) Requester dashboard; (7) regression/hardening; (8) documentation/release. Actual Issue mapping: #56, #58, #59, #60, #61, #62, #63, #64; see [workflow.md](workflow.md). Every package includes its own tests/docs. Foundation introduces shared Admin/action permissions; workflow completes Ticket gate/UI changes; dashboard packages add their corresponding filters/UI. Intermediate staging is not a release. Work one Issue at a time, branch from current staging, and wait for peer merge/Done before the next. Final release uses `lab4-staging -> main` after the root guide's explicit documentation gate.
