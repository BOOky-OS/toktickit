# Lab 3 REST API Contract

Status: proposed for Issue #32. These endpoints are targets, not implemented
features. The BRs and role/status matrices in [specification.md](specification.md)
are authoritative. Every route below is relative to `/api`.

## 1. Shared conventions

JSON uses application/json; upload is multipart; downloads are binary. Timestamps
are ISO UTC, enums uppercase. IDs/versions are safe positive integers, no coercion
of arrays/objects. Body maximum is 32 KiB except multipart file upload. Reject
unknown body/query fields, repeated query keys and wrong primitive types with
400. Reject requesterId supplied to requester routes in query/JSON/multipart.

Errors use `{error,code,fieldErrors?}`, with fieldErrors a field-to-message map.
No exception text, hashes, session credentials, storage paths or other users'
protected data. Role denial (403) precedes resource lookup; a permitted role
requesting missing/non-owned data gets the same 404. Authenticated and auth
responses/downloads use Cache-Control: no-store.

| HTTP | Code / use |
| --- | --- |
| 200 | Read/update, matching create replay, documented no-op |
| 201 | Created User/Ticket/Attachment/comment/note |
| 204 | Successful logout |
| 400 | VALIDATION_ERROR (including malformed JSON/IDs/query) |
| 401 | AUTH_REQUIRED or uniform INVALID_CREDENTIALS |
| 403 | FORBIDDEN, PASSWORD_CHANGE_REQUIRED, CSRF_INVALID |
| 404 | NOT_FOUND; generic unavailable response |
| 409 | IDEMPOTENCY_CONFLICT, STALE_VERSION, ALREADY_ASSIGNED, INVALID_TRANSITION, TICKET_READ_ONLY, OWNER_REQUIRED, INVALID_ASSIGNEE, ATTACHMENT_LIMIT, DUPLICATE_EMAIL, SELF_DEACTIVATION, LAST_ACTIVE_ADMIN, ACTIVE_ASSIGNMENTS |
| 413 | BODY_TOO_LARGE / FILE_TOO_LARGE |
| 415 | UNSUPPORTED_TYPE |
| 429 | RATE_LIMITED + Retry-After seconds |
| 500 | INTERNAL_ERROR, safe operation-specific message |

Example: `{"error":"Validation failed.","code":"VALIDATION_ERROR","fieldErrors":{"summary":"Summary must contain 5 to 120 characters."}}`.
Unknown/excluded routes return JSON 404. A stale-version error contains no
resource snapshot; reload through the authorized read endpoint.

## 2. Session and CSRF transport

- Browser fetch uses credentials: include, configured CLIENT_ORIGIN (default
  http://localhost:5173), and API http://localhost:3000. Use localhost consistently;
  browser cookies must not alternate between localhost and 127.0.0.1.
- GET /auth/csrf returns `{csrfToken}`. Reuse the token of an unexpired session;
  otherwise create a 10-minute pre-login Session with userId=null and a fresh
  session cookie. Such a session cannot authorize user operations.
  Rate-limit anonymous creation to 60/IP/15 minutes; clean expired sessions in
  bounded batches. Use the exact cookie name `toktickit.sid` throughout.
- POST login uses the pre-login cookie, exact allowed Origin and X-CSRF-Token.
  On success revoke the presented session and rotate both session/CSRF tokens.
- The 8-hour authenticated cookie is host-only, HttpOnly, Path=/, SameSite=Lax,
  Max-Age matching server expiry, Secure outside explicit local HTTP development.
  The raw authentication token appears only in that cookie, never JSON/storage.
- Every authenticated write, including multipart/logout/password, requires the
  matching Origin and session-bound X-CSRF-Token. Keep CSRF in client memory;
  recover it using auth/csrf on reload. GET performs no domain mutations.
- An ordinary protected request without a valid authenticated session is 401.
  A valid session with bad write Origin/CSRF is 403 without mutation.
  Initial-password sessions may use only auth/me, auth/csrf, auth/password,
  auth/logout and public auth/health endpoints; normal endpoints return 403
  PASSWORD_CHANGE_REQUIRED. Read role/active state from the database each time.
- Password change revokes all sessions and issues one new authenticated session.
  Admin reset/email/role change/deactivation revokes all target sessions. Logout
  revokes the presented session then expires its cookie with matching attributes.
- Expired/missing-session logout returns 401; UI clears already-unauthenticated
  state. A network/500 logout failure must show Retry, not claim revocation.
- No bearer fallback, localStorage credentials, wildcard credentialed CORS, or
  side-effecting GET endpoints.

## 3. Authentication and reference data

UserSummary: `{id,displayName,email,role,mustChangePassword}`.

| Method/path | Exact request | Success / access |
| --- | --- | --- |
| GET /health | None | Public 200 {status:"ok",service:"TokTickIT API"} (Lab 1 shape) |
| GET /auth/csrf | Existing cookie if present | 200 {csrfToken}; public/restricted |
| POST /auth/login | {email,password} + pre-login CSRF | 200 {user:UserSummary,csrfToken}; fresh cookie |
| GET /auth/me | Session cookie | 200 {user:UserSummary}; includes forced-change users |
| POST /auth/password | {currentPassword,newPassword,confirmPassword} + CSRF | 200 {user:UserSummary,csrfToken}; fresh cookie, forced-change cleared |
| POST /auth/logout | {} + CSRF | 204 |
| GET /categories | None | 200 [{id,name}], active only, id ASC; any completed role |
| GET /related-systems | None | 200 [{id,name}], active only, name ASC/id ASC; any completed role |

Login wrong/unknown/inactive/unprovisioned failures share BR-05's 401 message.
Malformed fields are 400; throttling is 429. Wrong current password is a safe
400 currentPassword field error. New password rules are BR-03; never trim passwords.
Session-store failures return 500. GET /development-requesters becomes safe 404.

## 4. Requester creation and list

POST /tickets is REQUESTER-only. Require Idempotency-Key UUID and exactly:
`{categoryId,relatedSystemId,summary,description,requestedPriority}`.
Validate BR-14; backend supplies requester, number/date, NEW, null owner and
IT Priority equal to requestedPriority. Return 201 TicketDetail. Matching replay
is 200; changed content with same requester/key is 409; concurrent matching
requests must produce one record and replay, not 500.

GET /tickets is REQUESTER-only, scoped to the session user.

| Query | Allowed / default |
| --- | --- |
| search | trimmed 1-120, number/summary, absent by default |
| categoryId, relatedSystemId | positive active reference IDs; unknown/inactive 400 |
| requestedPriority | LOW/MEDIUM/HIGH, absent by default |
| currentStatus | any of eight status enums, absent by default |
| sortBy | updatedAt (default), ticketDate, ticketNumber, summary |
| sortDir | desc (default), asc |
| page | 1 default; safe positive integer, computed offset <=1,000,000 |
| pageSize | 10 default; 10/25/50 |

Search is literal case-insensitive substring; escape SQL wildcard semantics
for percent/underscore. Add id tie-breaker in the requested direction.
Count/items must use a consistent DB snapshot. Return:
`{items,page,pageSize,totalItems,totalPages,hasPreviousPage,hasNextPage}`.
totalPages=ceil(totalItems/pageSize), including zero for empty; previous=page>1,
next=page<totalPages. Beyond-last page returns 200 empty items with correct totals.

List item: `{id,ticketNumber,ticketDate,summary,category:{id,name},
relatedSystem:{id,name},requestedPriority,itPriority,currentStatus,updatedAt,
owner:{id,displayName,role}|null,version}`.

## 5. Shared Detail and Attachment continuity

GET /tickets/:ticketId permits the owning Requester or any Staff/Admin.
TicketDetail contains all list fields plus:
`{requester:{id,displayName},description,requesterResolutionIndicatedAt,
resolvedAt,closedAt,cancelledAt,resolutionSummary,cancellationReason,attachments}`.
Nullable fields return null. Date/summary and all Lab 2 submission values retain
their meaning. Unlike Lab 2's empty placeholder, attachments contains the real
permitted current metadata. Communication is fetched separately; never include
Internal Notes/counts in a shared serializer.

| Method/path | Request | Success / access |
| --- | --- | --- |
| GET /tickets/:ticketId/attachments | None | 200 Attachment[]; owner Requester or Staff/Admin |
| POST /tickets/:ticketId/attachments | multipart one file only + CSRF | 201 Attachment; owner Requester only |
| GET /attachments/:attachmentId/download | Cookie, no requesterId | 200 active binary; owner Requester or Staff/Admin |
| DELETE /attachments/:attachmentId | {reason} + CSRF | 200 removed Attachment; owner Requester only |

Attachment: `{id,originalFilename,mimeType,sizeBytes,uploadedAt,state,canDownload}`.
Removed entries add `{removedAt,removalReason,removedBy:{id,displayName}|null}`.
No storageKey or seedKey. Removed downloads return generic 404 for every role.
File type/5 MiB/five active limits and compensation follow BR-17..19.
Download has safe Content-Disposition and X-Content-Type-Options: nosniff.
Removal reason is 5-250 trimmed characters. Mutations lock the parent Ticket,
advance its version/updatedAt and recheck ownership; no caller version required
for these atomic append/removal operations. Preserve removal audit references.

## 6. Queue and assignees

GET /staff/tickets permits IT_STAFF and read-only ADMIN; REQUESTER is forbidden.
Same page envelope and list fields, plus requester {id,displayName}.
Default updatedAt DESC/id DESC; includes every Ticket, not just current owner's.

| Query | Values |
| --- | --- |
| search | trimmed 1-120; number, summary, requester displayName |
| currentStatus | eight-status enum |
| requestedPriority, itPriority | LOW/MEDIUM/HIGH |
| categoryId, relatedSystemId | active reference IDs |
| owner | unassigned, me, or active eligible decimal User ID |
| sortBy | updatedAt, ticketDate, ticketNumber, summary, itPriority |
| sortDir, page, pageSize | same limits/defaults as requester list |

Omitted owner includes historical inactive owners. Priority DESC ranks HIGH,
MEDIUM, LOW; ASC reverses this, then id in the same direction. Unknown/repeated/
invalid fields are 400. GET /staff/assignees returns active IT_STAFF/ADMIN
`[{id,displayName,role}]`, displayName ASC/id ASC; Staff/Admin only.
No emails/hashes. Assignment targets are revalidated on writes.

## 7. Staff operations

IT_STAFF-only, CSRF and current version required. Return 200 TicketDetail.
Check version before no-op handling; reject stale input with 409 STALE_VERSION.

| Method/path | Exact body | Behavior |
| --- | --- | --- |
| POST /staff/tickets/:ticketId/claim | {version} | Unassigned -> actor; already-self no-op; other owner 409 |
| PATCH /staff/tickets/:ticketId/owner | {ownerId,version,confirmed:true} | Eligible User or null; null only NEW/OPEN |
| PATCH /staff/tickets/:ticketId/priority | {itPriority,version} | LOW/MEDIUM/HIGH; same value no-op |
| POST /staff/tickets/:ticketId/status | {currentStatus,version,confirmed:true,reason?} | Exact BR-23 transition matrix and BR-24 prerequisites |

CLOSED/CANCELLED reject owner/priority changes (409 TICKET_READ_ONLY).
Missing/inactive/wrong-role target is 409 INVALID_ASSIGNEE; owner prerequisite
is 409 OWNER_REQUIRED; invalid status pair/same status is 409 INVALID_TRANSITION.
Missing confirmation/invalid enum/reason length is 400. Require public reason
5-1000 for RESOLVED/CLOSED/REOPENED/CANCELLED. No arbitrary Ticket PATCH.

GET /tickets/:ticketId/status-history permits owning Requester or Staff/Admin:
`[{id,fromStatus,toStatus,reason,author:{id,displayName,role},createdAt}]`,
createdAt ASC/id ASC; reasons are public. Transitions and history commit together.

## 8. Comments, Notes and requester resolution indication

| Method/path | Body | Success / access |
| --- | --- | --- |
| GET /tickets/:ticketId/comments | None | 200 Entry[]; owner Requester or Staff/Admin |
| POST /tickets/:ticketId/comments | {body} + CSRF | 201 Entry; owner Requester or Staff |
| GET /tickets/:ticketId/notes | None | 200 Entry[]; Staff/Admin only |
| POST /tickets/:ticketId/notes | {body} + CSRF | 201 Entry; Staff only |
| POST /tickets/:ticketId/resolution-indication | {version,confirmed:true} + CSRF | 200 TicketDetail; owning Requester only |

Entry: `{id,body,author:{id,displayName,role},createdAt}`, ordered createdAt
ASC/id ASC; empty 200 []. Display author's current role, preserve stable author
ID. Public length 1-2000, internal 1-4000 after trimming. Render plain text.
Reject author/time input; no PATCH/DELETE routes. CLOSED/CANCELLED reject entry
creation with 409 TICKET_READ_ONLY. Requester notes access is 403 with no
content/count/existence information. Staff/Admin have separate public/internal
streams; Admin cannot post.

Entry append locks Ticket, rechecks status and advances version/updatedAt,
without requiring a caller version. Concurrent independent entries may both
succeed. After an ambiguous failed response reload the stream before manually
retrying; do not claim comment idempotency. Resolution indication follows BR-29:
only NEW/OPEN/IN_PROGRESS/WAITING_FOR_REQUESTER/REOPENED, confirmed, timestamp
set once, no formal status change; same-version repeated indication is no-op.

## 9. User administration

ADMIN-only, completed password change. UserAdmin:
`{id,displayName,email,role,isActive,mustChangePassword,version,createdAt,updatedAt}`.
No credentials or internal seed keys returned.

| Method/path | Exact request | Success |
| --- | --- | --- |
| GET /admin/users | search? 1-120 (name/email), role? | 200 {items:UserAdmin[],totalItems}; name ASC/id ASC |
| GET /admin/users/:userId | None | 200 UserAdmin; 404 missing |
| POST /admin/users | {displayName,email,role,isActive,initialPassword} | 201 UserAdmin, forced change true |
| PATCH /admin/users/:userId | {displayName,email,role,isActive,version}, all required | 200 UserAdmin, incremented version |
| POST /admin/users/:userId/initial-password | {initialPassword,version,confirmed:true} | 200 UserAdmin, forced change true; sessions revoked |

BR-02/03 validation applies. Normalize email before DB uniqueness; racing
duplicates return 409 DUPLICATE_EMAIL. Guards: SELF_DEACTIVATION,
LAST_ACTIVE_ADMIN (includes demotion), ACTIVE_ASSIGNMENTS and STALE_VERSION.
No-change edits do not touch version or revoke sessions. Reactivation retains
password-change state. Self-email/role/reset may revoke the caller session:
return the successful write, then require login. No user deletion/email
delivery/bulk/import/export/history endpoints or mandatory list pagination.

## 10. Transactions and integration

Preserve exported Express app separately from listen(). Extract reusable auth,
authorization, validation and safe serializers instead of enlarging app.ts.
For this small lab, all authenticated domain mutations and revocation/account
changes take the same PostgreSQL transaction advisory lock (key 334003), then
re-read acting session/user and target version, then lock relevant Ticket/User
rows. This serializes security-sensitive decisions and avoids reversed lock
order. Hash passwords before taking the lock, but recheck credential version/
hash when committing. Last-admin counts, owner eligibility, attachment caps,
idempotency, status/history and session revocation must be tested with the real
database. Read list/count uses a repeatable-read snapshot. This deliberately
simple concurrency policy is not a production scaling claim.

As auth changes existing endpoints, adapt affected earlier tests in the same
Issue. Requester UI and full regression finish in #36. Staging is incremental,
not a completed release. Choose any necessary cookie/rate-limit packages during
#34 and record versions; #32 changes no dependencies or runtime behavior.

After successful comment/note/file operations, refetch authorized Ticket Detail
to refresh version before another versioned write; preserve unrelated drafts.
