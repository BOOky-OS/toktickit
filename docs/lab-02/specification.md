# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal

Deliver a professional, responsive Requester-facing TokTickIT MVP.  A selected
Development Requester can create and locate their own IT support Tickets,
inspect an owned Ticket, and manage permitted supporting Attachments.  This
sprint establishes a reusable Zen Green UI foundation and a testable PostgreSQL,
Prisma, REST, and React design that Lab 3 can later connect to real
authentication.

## 2. Stakeholder Request Interpretation

Lab 2 simulates a requester session without implementing login.  The user first
chooses one active Development Requester for testing.  That selection scopes
Ticket creation, My Tickets, Ticket Detail, and Attachment actions.  The
application must make the selected identity visible, keep one Requester's data
out of another Requester's view, generate official Ticket Numbers in the
backend, and present all required screens and feedback states consistently.

## 3. Scope

### Included

- Development Requester Selection and Change Requester testing context.
- Active Categories and Related Systems from PostgreSQL.
- Create Ticket, backend-generated Ticket Number, validation, and duplicate
  submission protection.
- Requester-owned My Tickets, including search, filters, sorting, pagination,
  loading, empty, no-results, and failure states.
- Requester-owned read-only Ticket Detail.
- Attachment upload, metadata, download of active files, and soft removal.
- PostgreSQL/Prisma changes, idempotent seed data, REST APIs, Zen Green UI,
  accessibility, responsive design, tests, screenshots, and Lab 2 documents.

### Explicitly excluded

- Real authentication, passwords, sessions, tokens, secure identities, and
  role-based authorization.
- IT Staff queue/dashboard, ticket claiming/reassignment, or changing IT
  Priority.
- Public Comments, Internal Notes, Service/Actions Taken, and collaboration.
- Ticket lifecycle changes after creation: resolving, closing, reopening,
  cancelling, or requester confirmation.
- Administrator management of users, reference data, or roles.

## 4. Functional Requirements

- **FR-01** The application shall load active Development Requesters from
  PostgreSQL and require one before Requester ticket screens are usable.
- **FR-02** The selector shall state that it is a Lab 2 testing mechanism and
  not authentication, and shall support loading, empty, and safe failure states.
- **FR-03** The selected Requester shall be retained in the client context,
  displayed in the application shell, changeable, and used to reload
  requester-scoped data.
- **FR-04** The application shall retrieve active Categories and Related Systems
  from the backend for ticket creation and filtering.
- **FR-05** A selected Requester shall be able to submit a valid Ticket with a
  Category, Related System, Summary, Requested Priority, and Description.
- **FR-06** The backend shall persist the Ticket, generate its official Ticket
  Number, assign its Ticket Date, set Current Status to New, and return the
  saved values.
- **FR-07** The Create Ticket screen shall perform immediate field-level client
  validation and the backend shall repeat all authoritative validation.
- **FR-08** The application shall prevent accidental duplicate Ticket creation
  while a submission is pending and on a retried request.
- **FR-09** My Tickets shall return and display only the selected Requester's
  Tickets with search, filtering, sorting, pagination, and response metadata.
- **FR-10** A selected Requester shall be able to retrieve only an owned Ticket
  Detail; a request for another Requester's Ticket shall not disclose it.
- **FR-11** A selected Requester shall be able to add permitted Attachments to
  an owned Ticket at creation time or from Ticket Detail.
- **FR-12** A selected Requester shall be able to download an active owned
  Attachment and inspect its permitted metadata.
- **FR-13** A selected Requester shall be able to soft-remove an owned active
  Attachment with a reason; its metadata remains visible but preview/download
  is blocked.
- **FR-14** The UI shall use the Zen Green design system, work at desktop,
  tablet, and mobile breakpoints, and be keyboard accessible.
- **FR-15** Required success, validation, loading, empty, no-results, upload,
  unavailable, and safe API-failure states shall be implemented and tested.

## 5. Business Rules

- **BR-01** Only the backend generates the official Ticket Number.  It uses the
  immutable format `TKT-YYYY-NNNNNN` and a database-backed sequence so the value
  is unique even under concurrent creation.
- **BR-02** A newly created Ticket has Current Status `NEW` (shown to users as
  `New`) and no Lab 2 endpoint changes that status.
- **BR-03** Development Requester selection is testing context only.  A supplied
  `requesterId` is not authentication and must never be represented as secure
  authorization.
- **BR-04** Only active Development Requesters appear in the selector.  A stale,
  missing, or inactive selected requester is rejected by the backend and the
  client returns to selection with a clear message.
- **BR-05** The selected requester ID is stored under
  `toktickit.developmentRequesterId` in browser local storage and is retained
  only to improve Lab 2 testing.  Changing it clears requester-scoped list and
  detail state before refetching.
- **BR-06** A Ticket belongs to exactly one Development Requester.  Every
  Ticket/Attachment operation receives the selected `requesterId` and verifies
  ownership in the backend.  A non-owned Ticket or Attachment is returned as
  HTTP 404 to avoid revealing whether it exists.
- **BR-07** Active Categories and Related Systems are the only valid reference
  values.  The backend rejects missing, inactive, or unknown IDs.
- **BR-08** Ticket Summary is required after trimming, must be 5-120 characters,
  and has leading/trailing whitespace removed before persistence.
- **BR-09** Description is required after trimming, must be 20-4,000 characters,
  and has leading/trailing whitespace removed before persistence.
- **BR-10** Requested Priority is exactly `LOW`, `MEDIUM`, or `HIGH`.  It is a
  requester-selected value.  IT Priority is a separate read-only future-workflow
  field and defaults to `UNASSIGNED` in Lab 2.
- **BR-11** Ticket Date, Requester, official Ticket Number, Current Status, and
  IT Priority are system/read-only values.  Ticket Number and Ticket Date are
  populated after successful creation.
- **BR-12** The client disables Submit while creating a Ticket.  Each new form
  also sends a UUID `Idempotency-Key`; a repeated matching request returns the
  already-created Ticket rather than a duplicate.  A reused key with different
  content returns HTTP 409.
- **BR-13** My Tickets search is case-insensitive over official Ticket Number and
  Summary.  It supports documented filters, allowlisted sorts, and pagination;
  it never searches another Requester's data.
- **BR-14** The default Ticket-list order is `updatedAt DESC, id DESC`.  Page is
  one-based with a default page size of 10 and permitted sizes 10, 25, or 50.
- **BR-15** An empty list means the Requester owns no Tickets.  A no-results
  state means filters/search produced no matches.  These states use different
  wording and actions.
- **BR-16** Allowed Attachment types are JPG/JPEG, PNG, WEBP, and PDF.  The
  server validates MIME type and file signature/extension policy; client checks
  are usability aids only.
- **BR-17** One file is at most 5 MiB (5 x 1024 x 1024 bytes).  A Ticket may have
  at most five active Attachments; soft-removed Attachments do not count.
- **BR-18** Attachment storage keys are server-generated UUID-based keys.  The
  original filename is displayed only after stripping path/control characters
  and limiting it to 255 characters; it is never used as a filesystem path.
- **BR-19** Soft removal records `removedAt`, `removedByRequesterId`, and a
  trimmed removal reason of 5-250 characters.  It does not delete the metadata.
  A removed Attachment is never previewable or downloadable.
- **BR-20** Create Ticket persists the Ticket before individual file uploads.
  If a subsequent Attachment upload fails, the Ticket remains valid; the UI
  preserves the failure detail and directs the Requester to retry from Detail.
  No failed file is exposed as active metadata.
- **BR-21** Backend failures use safe messages and must not expose stack traces,
  database URLs, storage paths, or another Requester's data.  Client form values
  remain after a safe API failure.
- **BR-22** Required fields, validation text, busy state, icons, focus state, and
  non-colour status indicators are accessible by keyboard and assistive
  technology.
- **BR-23** Screens must not add comments, notes, Actions Taken, staff actions,
  status-change controls, or authentication controls.
- **BR-24** Lab 3 can replace the temporary requester context with an
  authenticated User/Requester mapping without changing Ticket ownership or
  Attachment audit history; therefore Ticket and Attachment store requester
  foreign keys, not browser-session identifiers.

## 6. UI Specification Summary

The UI is specified in [ui-spec.md](ui-spec.md).  It defines the Zen Green
tokens, application shell, field and button states, status badges, Create
Ticket, My Tickets, Ticket Detail, Attachment lifecycle, accessibility, and
desktop/tablet/mobile behavior.  All pages use the selected Requester context;
the selector is intentionally labelled as a testing screen rather than login.

## 7. Data Changes

| Model | Key fields and rules |
| --- | --- |
| `DevelopmentRequester` | `id`, `displayName`, unique `email`, `isActive`, timestamps.  One requester owns many Tickets. |
| `Category` | Extend the Lab 1 model with `isActive` and `updatedAt`; keep unique `name`. |
| `RelatedSystem` | `id`, unique `name`, `isActive`, timestamps.  One system relates to many Tickets. |
| `Ticket` | `id`, unique `ticketNumber`, `ticketDate`, `requesterId`, `categoryId`, `relatedSystemId`, trimmed `summary`/`description`, `requestedPriority`, read-only `itPriority`, `currentStatus`, idempotency key, timestamps. |
| `Attachment` | `id`, `ticketId`, sanitized `originalFilename`, unique server `storageKey`, `mimeType`, `sizeBytes`, upload time, and nullable soft-removal/audit fields. |

Prisma enums are `RequestedPriority { LOW MEDIUM HIGH }`,
`ItPriority { UNASSIGNED LOW MEDIUM HIGH }`, and `TicketStatus { NEW }`.
`Ticket.ticketNumber` is unique; `(requesterId, clientSubmissionKey)` is unique
for idempotency.  Indexes support requester-owned list queries on
`(requesterId, updatedAt)`, `(requesterId, currentStatus)`,
`(requesterId, requestedPriority)`, `(requesterId, categoryId)`, and
`(ticketId, removedAt)` for active Attachment checks.  The migration also adds
the PostgreSQL sequence used for Ticket Number generation.

Seed data is idempotent and includes the required four Categories, at least six
realistic Related Systems (Email, Campus Wi-Fi, VPN, LEB2 App, Grade Submission
App, Printer, and Corporate Laptop), four or more active Development Requesters,
and at least one inactive Development Requester.

## 8. API Contract

The full contract is in [api-spec.md](api-spec.md).  It covers reference data,
Ticket creation/list/detail, Attachment metadata/upload/download/soft removal,
request/response shapes, query validation, pagination, ownership, and safe
errors.  The API is REST/JSON except for multipart Attachment upload.

## 9. Acceptance Criteria

- **AC-01** Given active Development Requesters exist, when the selector loads,
  then it displays only active Requesters with an accessible Continue action and
  testing-only explanation.
- **AC-02** Given no requester is selected, when a user opens My Tickets or
  Create Ticket, then the selector is shown instead of requester data.
- **AC-03** Given a requester is changed, when Continue is used, then the shell
  shows the new requester and requester-scoped data is reloaded.
- **AC-04** Given valid Ticket data and an active selected requester, when the
  form is submitted, then one Ticket is persisted with the matching requester,
  status New, and backend-generated official Ticket Number.
- **AC-05** Given invalid Ticket input, when the user submits, then nearby field
  messages appear and no create API request is made until client validation
  passes; invalid server input is also rejected safely.
- **AC-06** Given the same valid create request is retried with the same
  idempotency key, when it reaches the backend, then no duplicate Ticket is
  created.
- **AC-07** Given an owned Ticket list, when search, filters, sorting, or page
  controls change, then only matching owned Tickets and correct pagination
  metadata are displayed.
- **AC-08** Given Requester B is selected, when Requester A's Ticket list,
  Ticket Detail, or Attachment is requested directly, then no protected data is
  returned.
- **AC-09** Given an owned Ticket, when Detail opens, then all Ticket fields are
  clearly read-only and no out-of-scope staff/collaboration controls appear.
- **AC-10** Given a permitted file under the size limit and fewer than five
  active Attachments, when it is uploaded to an owned Ticket, then safe metadata
  is returned and it appears as active.
- **AC-11** Given an invalid type, oversize file, sixth active file, or unowned
  Ticket, when upload is attempted, then the Attachment is not activated and a
  documented safe error is returned.
- **AC-12** Given an active owned Attachment, when it is downloaded, then its
  file is returned; a removed or unowned Attachment is not returned.
- **AC-13** Given an active owned Attachment and a valid removal reason, when
  removal is confirmed, then metadata remains marked Removed and the file is no
  longer downloadable or previewable.
- **AC-14** Given a loading, empty, no-results, validation, upload, submit,
  success, or API-failure condition, when its screen is rendered, then the user
  receives clear, accessible feedback and preserved values where applicable.
- **AC-15** Given desktop, tablet, and mobile viewports, when each required
  screen is rendered, then no label/message/button/file name is clipped,
  overlapped, hidden, or forced into horizontal page scrolling.

## 10. Definition of Done

- All included FRs, BRs, and ACs are implemented without excluded Lab 2 scope.
- The Prisma migration, generated client, and idempotent seed are current and
  documented.
- API, UI, accessibility, responsive, visual, and E2E tests are present,
  traceable, and pass from documented commands; no required test is skipped.
- Backend ownership checks and safe error paths are covered by tests.
- Zen Green screens match [ui-spec.md](ui-spec.md), including visual inspection
  at desktop, tablet, and mobile sizes.
- `api-spec.md`, `tests.md`, README, screenshot evidence, `reviewer.md`, and
  factual `ai-use.md` are current.
- Each Issue uses its own branch and linked PR into `lab2-staging`; all review
  comments are answered and the reviewer, not the author, merges approved PRs.
- The final release PR from `lab2-staging` to `main` passes the full verification
  and the single evidence PDF uses Answer Part 1 through Answer Part 9 exactly.

## 11. Assumptions and Decisions

1. Lab 2 explicitly lacks authentication, so `requesterId` is transported in
   query/body/form data for test context.  This is intentionally replaceable in
   Lab 3 and is not security.
2. A non-owned resource returns 404 rather than 403 to avoid exposing its
   existence within the temporary test context.
3. Ticket creation and file storage use compensation rather than a cross-service
   transaction: a saved Ticket survives a failed later upload and users can
   retry on Detail.
4. The current Lab 1 `GET /api/categories` route remains available.  Its
   implementation is extended to return active records while preserving the
   Lab 1 response fields and safe-error compatibility.
5. IT Priority is stored/read-only as `UNASSIGNED` for consistent future UI
   badges; Lab 2 provides no control or API to alter it.
