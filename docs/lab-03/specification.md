# Lab 3 Sprint Engineering Specification

Status: contract proposed for student confirmation and peer review in Issue #32.
No Lab 3 feature is implemented by this document. Baseline: Lab 2 main
`2fc1fe3`. Implementation starts only after this contract is confirmed and its
PR is approved and merged by the reviewer into `lab3-staging`.

Sources: `Lab_3_sheet.pdf` (18 pages), the Lab 2 rules explicitly referenced by
that sheet, `GITHUB_WORKFLOW_AI_GUIDE(1).md`, and the student's instructions.
The student confirmed on 2026-09-10 that Administrators manage users and read
Tickets, while IT Staff perform Ticket mutations. The student also requires a
separate documentation confirmation before the release proceeds to `main`.
See [workflow.md](workflow.md) for the Issue plan and release gate.

## 1. Sprint Goal

Evolve the existing requester service desk into an authenticated application
with one role per user, operational IT Staff ticket handling, and minimal
Administrator account management. Preserve existing data and requester
behavior while proving permissions, migration, workflow, and responsive UI
through tests planned before implementation.

## 2. Stakeholder Request Interpretation

Replace the development identity selector with email/password login and require
initial-password replacement before normal use. Requesters continue managing
their submitted Tickets and Attachments. Staff locate work, accept ownership,
set operational priority, communicate, and move Tickets through a defined
lifecycle. Administrators manage accounts and can inspect Ticket communication.
Every permission and resource boundary is enforced in the API.

## 3. Scope

### Included

Authentication, forced/voluntary password change, logout, session revocation;
three-role authorization; preserved requester Ticket/Attachment workflows;
staff Queue and Detail; ownership, IT Priority and lifecycle; append-only
Public Comments/Internal Notes; requester resolution indication; minimal user
management; migration, seed, specifications, tests and evidence. Reuse React,
Express, Prisma, PostgreSQL and the existing Zen Green visual system.

### Excluded

Self-registration, multiple roles, email invitations/reset delivery, MFA,
social login/SSO, user deletion, bulk/import/export, departments/tenants,
profile photos, account-history screens, unlocking/approval workflows,
Actions Taken/Service Actions, SLA/escalations/notifications, KPI dashboards
other than queue counts, and deployment/cloud changes. User-list pagination
and advanced simultaneous filters are not required. Comments/notes cannot be
edited or deleted. No role/profile self-editing beyond changing one's password.

## 4. Functional Requirements

- **FR-01** Migrate identities without losing submitted Ticket ownership or
  Attachment content and removal attribution.
- **FR-02** Supply safe, repeatable local provisioning and realistic seed data.
- **FR-03** Authenticate an active provisioned User by normalized email and
  password; return only safe identity fields.
- **FR-04** Block normal APIs/screens until an initial password is changed.
- **FR-05** Support current-user retrieval, voluntary password change, logout,
  expiration and immediate revocation on relevant account changes.
- **FR-06** Enforce the authorization matrix and authenticated identity on
  every protected request, including direct requests outside the UI.
- **FR-07** Present authenticated name/role, permitted navigation and safe
  loading/forbidden/session-expired feedback.
- **FR-08** Preserve validated Ticket creation, official numbering and
  idempotent retry with authenticated ownership.
- **FR-09** Preserve requester-owned search/filter/sort/pagination and Detail.
- **FR-10** Preserve permitted upload/list/download/soft removal and retained
  Attachment metadata under authenticated ownership.
- **FR-11** Provide a searchable, filterable, sortable, paginated staff Queue.
- **FR-12** Provide operational staff Detail with grouped read-only submission
  fields and only the permitted editable controls.
- **FR-13** Support claim, assignment/reassignment and unassignment according
  to eligibility, workflow and concurrent-update rules.
- **FR-14** Initialize IT Priority from Requested Priority and permit staff
  priority updates without altering the requester's submitted priority.
- **FR-15** Enforce the status matrix and required confirmations/reasons.
- **FR-16** Retrieve/create Public Comments with backend author and time.
- **FR-17** Retrieve/create private Internal Notes only for permitted roles.
- **FR-18** Let an owning Requester indicate that the problem appears resolved
  without formally resolving or closing the Ticket.
- **FR-19** Provide Admin user listing, name/email search and optional role filter.
- **FR-20** Provide Admin creation/editing of name, email, one role and activation.
- **FR-21** Let Admin set a new initial password requiring replacement at next login.
- **FR-22** Protect self-deactivation, the last active Admin, and active assignments.
- **FR-23** Apply documented validation, safe failures, concurrency handling,
  keyboard accessibility and desktop/tablet/mobile behavior.
- **FR-24** Deliver traceable tests, current documentation, factual review/AI
  evidence and the gated final-main release.

## 5. Business Rules

### Identity and session

- **BR-01** A User has exactly one role: `REQUESTER`, `IT_STAFF`, or `ADMIN`.
  Only active Users with a provisioned password may log in.
- **BR-02** Emails are trimmed, lowercased and unique across all users,
  including inactive accounts; length 3-254, one `@`, nonempty local/domain
  parts, no whitespace, and a domain containing a non-leading/non-trailing dot.
  Display name is trimmed, 2-120 characters. Passwords are never trimmed.
- **BR-03** New/initial passwords are 12-128 Unicode code points, at most 512
  UTF-8 bytes, with at least one non-whitespace character. No arbitrary
  uppercase/symbol requirement. Confirmation must match; replacement must
  differ from the current password. Reject over-limit input before hashing.
  Login validates presence and these maximums, not new-password minimums.
- **BR-04** Use asynchronous Node `crypto.scrypt` with independent random
  16-byte salts, `N=131072`, `r=8`, `p=1`, 64-byte derived keys and 256 MiB
  `maxmem`; store version/parameters/salt/hash together. Compare equal-length
  keys with `timingSafeEqual`. No plaintext password, password hash or session
  token appears in API responses, application logs, Git or report screenshots.
- **BR-05** Unknown email, inactive/unprovisioned account and incorrect password
  return the same 401 message: "Unable to sign in. Check your credentials or
  contact your administrator." Perform a comparable dummy hash check for
  absent credentials. Throttle by IP (30 attempts/15 minutes) and normalized
  email (10 attempts/15 minutes); the next attempt returns 429 and Retry-After.
  Use bounded in-memory buckets for this single-process lab, expire old buckets,
  and document that restart clears throttles; no permanent account lock.
- **BR-06** Use opaque random 32-byte session tokens in a host-only
  `toktickit.sid` cookie: HttpOnly, SameSite=Lax, Path=/, 8-hour absolute expiry.
  Secure is required outside explicit local HTTP development. Store only the
  SHA-256 token digest server-side; no token in browser local/sessionStorage.
  A new login creates a fresh token and invalidates any presented old session.
- **BR-07** Current-user loads the session and current User from PostgreSQL on
  every request. Missing, expired, revoked, inactive or unprovisioned sessions
  are unauthenticated. `mustChangePassword=true` permits only auth/me,
  auth/csrf, auth/password and auth/logout, plus public auth/health endpoints;
  all normal APIs return 403 PASSWORD_CHANGE_REQUIRED.
- **BR-08** Logout revokes the presented session server-side and expires the
  cookie. Password change revokes all sessions then issues one fresh session;
  Admin reset, email change, role change or deactivation revokes all target
  sessions in the same transaction. Updating display name alone does not.
  Revocation prevents new authorized operations; mutations recheck actor
  session/user state inside their transaction to prevent stale authorization.
- **BR-09** Credentialed CORS permits only configured `CLIENT_ORIGIN` (local
  default http://localhost:5173). Every state-changing browser request requires
  that exact Origin and `X-CSRF-Token`. A pre-login token is bound to a short
  lived HttpOnly cookie; authenticated tokens are bound to their session.
  SameSite is additional protection, not the only CSRF control. Reads cannot
  mutate data; OPTIONS does not reveal protected data. See api-spec.md.

### Permission matrix

`Own` refers to `Ticket.requesterId == authenticated User.id`, never a supplied
requesterId. All authenticated roles below also require active, provisioned
accounts that completed password change. A missing permission is denied.

| Operation | Requester | IT Staff | Administrator |
| --- | --- | --- | --- |
| Current user, own password, logout | Yes | Yes | Yes |
| Read active Categories/Related Systems | Yes | Yes | Yes |
| Create Ticket; My Tickets | Own | No | No |
| Read Ticket Detail | Own | Any | Any, read-only |
| Read active Attachment / retained metadata | Own | Any Ticket | Any Ticket |
| Upload / soft-remove Attachment | Own | No | No |
| Read Queue and assignment candidates | No | Yes | Yes, read-only |
| Claim / assign / IT Priority / status | No | Yes | No |
| Read Public Comments | Own | Any | Any |
| Add Public Comment | Own, allowed status | Any, allowed status | No |
| Read Internal Notes | No | Any | Any |
| Add Internal Note | No | Any, allowed status | No |
| Problem Appears Resolved | Own, allowed status | No | No |
| List/create/edit/reset users | No | No | Yes |

- **BR-10** Enforce this matrix in backend middleware and resource queries.
  A forbidden role returns 403 before probing protected resource existence;
  permitted-role access to missing/non-owned resources returns identical 404.
- **BR-11** Reject a client `requesterId` on requester query/JSON/multipart
  operations with 400; it can never override identity. Reject supplied author,
  server timestamps, hash, role escalation and other unsupported write fields.
  The legacy development-requesters route returns safe 404 and no identities.
- **BR-12** Requester submission ownership is immutable. Staff assignment is
  separate. Historical Ticket ownership and entry authors survive User role
  and activation changes; a change of role never grants requester impersonation.

### Existing Tickets and Attachments

- **BR-13** Preserve `TKT-YYYY-NNNNNN`, immutable official number/date and the
  existing database sequence. New Tickets use server UTC time, `NEW`, null
  staff owner, and IT Priority copied from Requested Priority.
- **BR-14** Category/System must exist and be active. Trim Summary (5-120) and
  Description (20-4000). Requested Priority is LOW/MEDIUM/HIGH and becomes
  read-only after creation. All text limits except passwords use UTF-16 code
  units to preserve the existing JavaScript validation contract.
- **BR-15** Require a UUID Idempotency-Key unique per authenticated requester.
  Retain the key across ambiguous failures/retries of the same form snapshot;
  changed submitted fields require a new key. Concurrent identical requests
  create exactly one Ticket; matching replay returns 200, changed payload 409.
  Compare original submitted fields, not later staff-edited priority/status.
- **BR-16** Preserve requester list defaults (updatedAt DESC, id DESC; page 1,
  size 10 with 10/25/50 allowed), search on number/summary and existing reference
  and priority filters. Extend status filter to all eight statuses. Unknown,
  repeated, malformed or unsupported queries are 400, not silently ignored.
- **BR-17** Attachments remain JPG/JPEG, PNG, WEBP or PDF, at most 5 MiB/file
  and five active files/Ticket. Verify extension, MIME and signature server-side;
  validate count atomically under a Ticket-row lock, including concurrent uploads.
  Generate UUID storage keys and sanitize display filenames; never expose paths.
- **BR-18** Soft removal requires a trimmed 5-250 character reason and records
  actor/time without deleting metadata. Removed files cannot be downloaded by
  any role. Preserve old bytes/storage keys and audit authors during migration.
  Owner Requester attachment actions remain allowed at all Ticket statuses to
  preserve Lab 2 behavior; staff/Admin may read only.
- **BR-19** Ticket creation commits before individual uploads. A later upload
  failure preserves the saved Ticket and provides per-file retry from Detail.
  Compensate stored bytes if metadata creation fails; never report a failed
  upload/removal as successful. Use safe download names/content disposition
  and `X-Content-Type-Options: nosniff`.

### Staff operations and lifecycle

- **BR-20** A Ticket has zero or one `ownerId`, eligible only while the target
  is active and has IT_STAFF or ADMIN role (handout section 4.5). Assignment does
  not confer permissions: an assigned Admin remains read-only under the
  student-approved matrix. Staff can operate on any accessible Ticket; being
  its assigned owner is not an additional prerequisite.
- **BR-21** Claim assigns the authenticated IT Staff member only if unassigned;
  a repeat by its current owner is a no-op success, a different claimant gets
  409. Explicit assignment/reassignment selects an eligible user and requires
  confirmation. Unassignment is allowed only in NEW or OPEN. CLOSED/CANCELLED
  Tickets reject all assignment and priority changes with 409.
- **BR-22** Staff may set IT Priority LOW/MEDIUM/HIGH; never UNASSIGNED in Lab 3.
  Priority changes never alter Requested Priority. Values equal to current
  priority/owner are no-op responses and do not advance version/timestamps.
- **BR-23** Only IT Staff perform the following transitions. All unlisted
  pairs, including same-status requests, return 409 INVALID_TRANSITION.

| Current | Allowed next statuses |
| --- | --- |
| NEW | OPEN, CANCELLED |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED |
| RESOLVED | CLOSED, REOPENED |
| CLOSED | REOPENED |
| REOPENED | OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| CANCELLED | None |

- **BR-24** Entering IN_PROGRESS, WAITING_FOR_REQUESTER or RESOLVED requires
  an active eligible assigned owner. OPEN may be unassigned. Every transition
  requires explicit confirmation; RESOLVED, CLOSED, REOPENED and CANCELLED also
  require a trimmed 5-1000 character public reason. Entering RESOLVED sets
  resolvedAt and resolutionSummary; CLOSED sets closedAt; CANCELLED sets
  cancelledAt/cancellationReason. REOPENED clears resolvedAt/closedAt and the
  current resolutionSummary and requester resolution flag; prior transition
  records retain earlier values/reasons. No Actions Taken prerequisite exists.
- **BR-25** Operational writes, requester resolution indication and Admin edits
  use integer optimistic `version` preconditions and atomic updates. Stale
  version returns 409 STALE_VERSION with no partial mutation. The UI preserves
  draft text, announces conflict and requires reload/review before resubmission.
  A successful Ticket metadata/status/comment/note/attachment change advances
  Ticket.updatedAt and version; a repeated resolution indication is a no-op.
- **BR-26** Record every status transition with Ticket, from/to, staff author,
  public reason and backend timestamp in the transaction. This is Ticket
  workflow evidence, not an out-of-scope user-account-history feature.

### Communication

- **BR-27** Public Comments are visible to the owning Requester, Staff and Admin.
  Requester/Staff may append at any status except CLOSED/CANCELLED. Trim text,
  require 1-2000 code units, render as plain text with line breaks, and reject
  client author/time fields. Never insert content as HTML or evaluate Markdown.
- **BR-28** Internal Notes follow the same append-only rule with 1-4000 code
  units, but only Staff create them and only Staff/Admin read them. Requester
  responses must omit note content, counts, authors and note-only fields;
  shared serializers cannot accidentally include notes. Staff status reasons
  are explicitly public and must not copy private note text automatically.
- **BR-29** The owning Requester may indicate resolution in NEW, OPEN,
  IN_PROGRESS, WAITING_FOR_REQUESTER or REOPENED. Confirmation sets
  requesterResolutionIndicatedAt once and touches Ticket version/update time;
  no status or staff owner change occurs. Repeats are no-op; RESOLVED/CLOSED/
  CANCELLED return 409. Staff sees the indicator and decides the formal outcome.

### Minimal Administrator operations

- **BR-30** User list returns name/email/role/active/password-change state with
  case-insensitive name/email search (trimmed 1-120) and one optional role
  filter. Default displayName ASC, id ASC; no pagination or advanced filters.
- **BR-31** Create requires displayName, normalized unique email, one role,
  boolean isActive and a valid initialPassword. Set mustChangePassword=true.
  Admin reset overwrites the hash, sets that flag and revokes sessions. Neither
  operation returns the password; no email is sent. Deliver the initial
  password through the agreed local-lab/manual mechanism.
- **BR-32** Admin may update name/email/role/isActive with a version precondition.
  Reject own deactivation and any change that would remove the final active
  ADMIN role. Serialize Admin-count decisions in a transaction using a common
  PostgreSQL advisory lock (334003, shared with all authenticated domain mutations and session revocation) to prevent concurrent edits removing all admins and to serialize eligibility checks. See api-spec.md transaction ordering.
- **BR-33** Reject deactivation or a role change out of IT_STAFF/ADMIN for a
  user owning nonterminal Tickets (anything except CLOSED/CANCELLED), with 409
  ACTIVE_ASSIGNMENTS. Staff must reassign first. Historical terminal owners
  and requester authors are retained. Staff-to-Admin changes remain eligible
  but revoke sessions and do not grant staff mutations to that Admin.
- **BR-34** Deactivation replaces deletion. No delete user endpoint exists.
  Last-admin and own-deactivation guards are enforced in API even if UI disables
  the control. Reactivation does not clear mustChangePassword or reset passwords.

### Evidence and errors

- **BR-35** Distinguish 400 validation, 401 unauthenticated, 403 forbidden/forced
  change/CSRF, 404 unavailable, 409 conflict, 413 size, 415 type, 429 throttled
  and 500 safe internal errors. Never return stack traces, connection strings,
  hashes, storage paths, private notes or cross-requester existence details.
- **BR-36** All major screens follow ui-spec.md at desktop >=992, tablet
  768-991 and mobile <768, with keyboard focus and non-colour status cues.
- **BR-37** The contract/test plan precedes implementation. Tests have factual
  Planned/Fail/Pass states; generated evidence cannot be represented as peer
  review or student verification. Observe the workflow.md main-release gate.

## 6. UI Specification Summary

See [ui-spec.md](ui-spec.md) for screens, routes, modes, reusable components,
forms, status feedback, dialogs and responsive evidence. Reuse existing colour
tokens and class conventions. Requester has My Tickets/Create; Staff has Queue;
Admin has Users and read-only Queue. Authenticated roles have Change Password
and Logout. Every Ticket view clearly separates submission, operational data,
public communication, private notes (permitted roles only), and Attachments.

## 7. Data Changes

The following is the target model, not an already applied schema:

| Model | Fields / relationships |
| --- | --- |
| User | Rename/evolve DevelopmentRequester, preserve id/displayName/email/isActive/timestamps. Add role enum, nullable passwordHash during provisioning, mustChangePassword (true), passwordChangedAt nullable, version (1). Unique normalized email. Existing requester and removal-author FKs point here. |
| Session | id UUID, userId nullable FK (null for 10-minute pre-login CSRF sessions only), tokenHash unique CHAR(64), csrfToken random 32-byte value, createdAt, expiresAt, revokedAt nullable. Return CSRF only through auth/csrf and rotated login/password responses; never return the authentication digest. Index userId/revokedAt and expiresAt. |
| Ticket | Preserve existing fields/FKs and submission key. Add ownerId nullable User FK, version (1), requesterResolutionIndicatedAt, resolvedAt, closedAt, cancelledAt nullable, resolutionSummary/cancellationReason nullable VARCHAR(1000). Add nullable unique seedKey VARCHAR(80) for idempotent demo fixtures. Expand status enum to the eight values; IT Priority has only LOW/MEDIUM/HIGH after backfill. |
| PublicComment | id, ticketId FK, authorId User FK, body VARCHAR(2000), createdAt, nullable unique seedKey VARCHAR(80); index ticketId/createdAt/id. |
| InternalNote | Separate table: id, ticketId FK, authorId User FK, body VARCHAR(4000), createdAt, nullable unique seedKey VARCHAR(80); index ticketId/createdAt/id. |
| TicketStatusChange | id, ticketId FK, authorId User FK, fromStatus, toStatus, reason nullable VARCHAR(1000), createdAt; index ticketId/createdAt/id. |
| Attachment | Preserve fields and bytes; rename removedByRequesterId to removedByUserId without changing values. FK points to User. No hard deletion. |
| Category / RelatedSystem | Preserve rows, active state, identifiers and existing relationships. |

Keep existing requester query and idempotency indexes; add Ticket indexes on
(currentStatus, updatedAt, id), (ownerId, updatedAt, id), (itPriority, updatedAt,
id). Preserve ticket_number_seq and all auto-increment sequence positions;
resynchronize a renamed User sequence above the highest preserved id. Use
RESTRICT for historical author/owner FKs; no cascade that deletes work history.
Timestamps remain UTC. Credential hashes/secrets must not use general serializers.

### Migration and local provisioning

1. Capture isolated Lab 2 fixture counts, row IDs, numbers, sequences, ownership,
   removal authors, reference values and attachment file digests before upgrade.
   Never reset a user's working database for a migration test.
2. Preflight normalized-email collisions/invalid existing emails. Fail with
   actionable local diagnostics before changing data; never merge identities
   or silently rewrite a conflicting address. SQL migration is transactional.
3. Rename/evolve the requester table and audit column, preserving all IDs/FKs.
   Existing records become REQUESTER; preserve isActive; passwordHash initially
   null and mustChangePassword=true. Null hashes cannot authenticate.
4. Add workflow/session/communication schema. Backfill only UNASSIGNED IT
   Priority from Requested Priority, preserving any existing LOW/MEDIUM/HIGH.
   Retain existing NEW status, number, date, text and attachment lifecycle.
5. Provide `npm run lab3:provision --workspace server` (planned) to hash an
   explicitly supplied `LAB3_MIGRATION_INITIAL_PASSWORD` for users whose hash
   is null only. Require a valid password, refuse production mode, provision
   in a transaction, and never print the password or reset provisioned users.
   Admin can subsequently set individual initial passwords. No credentials in SQL.
6. Apply repeatable local seed only with explicit `LAB3_ALLOW_DEMO_SEED=true`
   outside production. For fresh demo accounts document the development-only
   initial password `TokTickIT-Lab3-Initial!`. Existing hashes, flags, name,
   role, activation, comments and Ticket edits are never overwritten by re-seed.
7. Fresh seed provides >=4 active +1 inactive Requesters, >=3 active +1 inactive
   Staff, >=1 active Admin, existing four Categories/seven Systems and >=30
   realistic Tickets covering all statuses/priorities, assigned/unassigned
   cases, plus public/private communication. Use stable unique seed keys;
   repeated seed creates neither duplicate Tickets nor communication.
8. Remove the selector API/UI and `toktickit.developmentRequesterId` client
   storage in the authenticated increment. Verify old data by new authenticated
   identities, including retained removed attachments and denied downloads.

## 8. API Contract

See [api-spec.md](api-spec.md) for all endpoints, exact writable fields,
query parameters, response envelopes, CSRF/session transport, pagination,
status/error codes and safe role/ownership checks. The API uses `/api`, ISO UTC,
uppercase enum values, JSON except multipart upload and binary download.

## 9. Acceptance Criteria

| ID | Observable acceptance criterion |
| --- | --- |
| AC-01 | Given a populated Lab 2 database/storage fixture, upgrading preserves identities, Ticket numbers/text/ownership, reference records and Attachment bytes/removal authors; unsafe email collisions abort without partial upgrade. |
| AC-02 | Given fresh and already-edited local data, provisioning/seed establishes required sample roles/workflows and can repeat without duplicates, credential resets or overwriting edits. |
| AC-03 | Given an active provisioned user with valid credentials, login establishes a fresh session and exposes only safe identity and first-change state. |
| AC-04 | Given wrong/unknown/inactive credentials or excessive attempts, login returns uniform safe failure or documented throttling without authenticated access. |
| AC-05 | Given initial credentials, all normal screens/APIs remain blocked until a valid, confirmed, different new password is saved; boundary failures preserve the restriction. |
| AC-06 | Given logout, expiration, password reset/change, email/role change or deactivation, affected old sessions cannot authorize subsequent operations; reload reflects current identity. |
| AC-07 | Given missing/incorrect CSRF, untrusted origin or forged session material, writes fail without mutation; cookies and authenticated responses have documented security/cache behavior. |
| AC-08 | Given each role, direct calls and navigation match every permission-matrix cell, including read-only Admin Ticket access. |
| AC-09 | Given Requester A's session and B's IDs or a supplied requesterId, list/detail/upload/download/removal cannot expose or modify B's resources. |
| AC-10 | Given valid/invalid or concurrently retried creation, exactly one valid owned Ticket receives a unique number, NEW and matching IT Priority; invalid/changed replay yields safe errors. |
| AC-11 | Given owned Tickets, search/filter/sort/pagination and all eight status filters return only owned results with stable metadata and appropriate empty/no-results UI. |
| AC-12 | Given Attachment policy boundaries and ownership/removal states, permitted operations preserve metadata/bytes; invalid, concurrent sixth, removed or forbidden operations fail safely. |
| AC-13 | Given Staff/Admin Queue queries, all controls and pagination produce stable documented results; Requesters are forbidden and invalid queries fail. |
| AC-14 | Given unassigned/assigned/terminal Tickets and active/inactive role targets, staff claim/reassignment obeys eligibility, confirmation and ownership rules without changing requester identity. |
| AC-15 | Given priority changes, only Staff can write LOW/MEDIUM/HIGH; Requested Priority is unchanged and terminal Tickets reject edits. |
| AC-16 | Given every status pair and prerequisite combination, the API allows exactly the transition matrix and persists required owner/confirmation/reason/timestamps/history atomically. |
| AC-17 | Given simultaneous claims, stale Ticket/User versions or competing last-admin edits, one valid outcome commits and conflicting operations return safe errors with no partial update. |
| AC-18 | Given permitted public communication, author/time come from the server, plain text is safe, length/status boundaries hold, and edit/delete is unavailable. |
| AC-19 | Given Internal Notes, Staff can append and Staff/Admin can read; Requester receives neither note content nor note metadata/counts in any path. |
| AC-20 | Given an owning Requester in an eligible status, confirmed resolution indication records a timestamp once and leaves formal status unchanged; ineligible requests fail. |
| AC-21 | Given an Admin, user list/search/optional role filtering displays required fields; other roles are forbidden. |
| AC-22 | Given user creation, valid single-role accounts are created with forced change; duplicate normalized emails, malformed fields and invalid roles are rejected. |
| AC-23 | Given Admin account edits, permitted fields update with version control; session invalidation, assigned-owner restrictions and retained historical relationships hold. |
| AC-24 | Given Admin reset, the old password/sessions fail and new initial password requires change; re-seed does not undo the reset or subsequent change. |
| AC-25 | Given own deactivation or removal of the last active Admin through deactivation/demotion, API and UI block the action, including concurrent requests. |
| AC-26 | Given auth loading/validation/initial-change/success/failure/logout conditions, Login, Change Password and shell provide accessible accurate feedback and role navigation. |
| AC-27 | Given authenticated requester flows, Create/List/Detail/Attachments and partial-upload recovery work without any development selector or identity storage. |
| AC-28 | Given staff and read-only Admin views, Queue/Detail expose only allowed controls and distinguish public/private communication, busy, conflict, unavailable and safe failure states. |
| AC-29 | Given Admin create/edit/reset/search flows, the minimal Users screen preserves appropriate draft values and displays validation, success, forbidden and safe failure feedback. |
| AC-30 | Given desktop/tablet/mobile and keyboard navigation, all major screens follow Zen Green, labels/focus/status cues are accessible, and no page overflow/clipping/overlap hides work. |
| AC-31 | Given expected/unexpected API or storage failures, error status/body and UI are consistent and disclose no protected content or technical secrets. |
| AC-32 | Given final integration, all planned required tests and documented setup/build checks pass on final main, evidence is traceable, and the student documentation gate and reviewer merge are recorded factually. |

Every AC maps to planned tests in [tests.md](tests.md). No Pass is inferred
from the plan itself.

## 10. Definition of Done

### Product completion

- [ ] All FR/BR/AC and matrices implemented; no excluded feature introduced.
- [ ] Existing data survives tested upgrade; provisioning and seed repeat safely.
- [ ] Real database integration tests prove constraints, concurrency, migration
  and revocation; mocks alone are not proof of those properties.
- [ ] Unit/API/UI/style/security/regression/E2E suites pass with every AC mapped;
  no required test skipped, disabled, commented out or marked Pass prematurely.
- [ ] Authenticated requester, staff and Admin flows work end to end, including
  forced change, forbidden direct requests and safe failure cases.
- [ ] Builds/Prisma validation and documented clean setup succeed. Required
  browser screenshots/checklist cover all screen groups and three viewport sizes.
- [ ] README, specifications, test results and usage/local credential guidance
  reflect actual behavior; no secrets are committed.

### Course delivery and main gate

- [ ] Per-Issue branches, linked PRs, board transitions, reviewer approvals and
  author responses are complete; reviewer performs merges.
- [ ] Student reviews the completed pre-release documents and explicitly answers
  the documentation question in workflow.md before release to main proceeds.
- [ ] Release from lab3-staging receives peer review and reviewer merge; final
  main test/evidence capture is completed without silently editing main.
- [ ] Exactly one concise PDF contains Answer Part 1-9 in order (60 points),
  working links, readable screenshots and factual AI/review evidence.

## 11. Assumptions and Decisions

1. The handout's illustrative UI contains Service Actions, forgot-password/email
   delivery and extra admin controls. Its explicit exclusions take precedence;
   pictures define visual direction rather than additional functionality.
2. Admin Ticket writes are denied by the student's explicit choice. Admin reads
   Queue/Detail/public/private communication. Section 4.5 still allows Admin as
   an assignment target; assignment conveys responsibility, not extra privileges.
3. Session cookies with PostgreSQL revocation fit the existing single-server lab.
   Node scrypt avoids adding a platform-specific native password dependency.
   The chosen cost follows [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html);
   asynchronous hashing/random generation uses [Node crypto](https://nodejs.org/api/crypto.html).
4. HttpOnly/SameSite/expiry/revocation follow [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
   Session-bound tokens and Origin checks follow [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
   Specific durations, limits, role permissions and workflow transitions here
   are proposed course decisions, not instructor-prescribed constants.
5. Public reasons and append-only transition records make lifecycle effects
   testable; no account audit UI or Actions Taken subsystem is added.
6. Administrator-owned Tickets may require Staff to perform operations on their
   behalf. If a different policy is desired, amend the matrix/test plan through
   review before implementing it; do not silently broaden access.
7. Lab 2 documentation overstates some existing guarantees: the client currently
   regenerates submission keys per submit, and mocked API tests do not prove
   database race handling. Lab 3 regression must prove the specified behavior.
8. Work is sequential across Issues #32-#41. Documentation-only Issue #32 checks
   contract consistency/links, not unimplemented feature tests. Historical Lab 2
   test counts are not Lab 3 results.
