# Lab 3 Test Plan and Traceability

Status: planned before implementation in Issue #32. No Lab 3 feature test has
been run or passed. Historical Lab 2 counts are not current Lab 3 evidence.
Source requirements: [specification.md](specification.md), [api-spec.md](api-spec.md),
[ui-spec.md](ui-spec.md). Current documentation checks are recorded separately.

## 1. Strategy and environments

Use existing Vitest, Testing Library, Supertest and Playwright. Start each
feature with its planned failing tests, confirm the failure is for the missing
behavior, implement, then refactor and rerun relevant regression. Record actual
commands/results against the feature PR. Add tests alongside their feature;
#41 verifies coverage and final evidence, not the first opportunity to test.

Unit tests cover pure policy with boundaries. API tests cover real Express
middleware/serialization; database integrity, migration, session revocation and
concurrency additionally require real isolated PostgreSQL integration tests.
Mocks cannot prove uniqueness, locking, SQL migration or persisted sessions.
UI tests test visible interactions and accessibility; style assertions and
real-browser screenshots complement them. E2E includes real server/DB flows and
explicit fault injection only for failure scenarios.

Use dedicated TEST_DATABASE_URL and E2E_DATABASE_URL, never the user's working
DATABASE_URL. Before destructive fixture setup verify each test DB name is
explicitly allowed and differs from the working database; refuse otherwise.
Apply migrations to test databases only, use fixture-local attachment storage
and clean only owned test fixtures. Never run migrate reset against working data.
One fresh migration fixture starts at actual Lab 2 migrations with seeded legacy
rows; verify pre/post IDs, sequences, snapshots and binary file digests.
Existing Lab 1 category integration tests must also use the isolated test DB.

Freeze clocks/inject clock for expiry/throttling tests instead of long sleeps.
Run concurrency via separate DB connections and barriers, not sequential mocked
calls. Clear bounded test rate-limit buckets between cases. Session/cookie/CSRF
helpers must exercise actual login for integration/E2E; never bypass auth to
claim authorization coverage. Avoid flaky arbitrary sleeps in browser tests.

## 2. Planned tests

Every row is Planned until the referenced test exists and its result is recorded.
Paths below are intended repository paths; they do not yet exist. Parameterized
rows represent all named cases and should report exact counts during implementation.

| ID | Type | Requirement / AC | Scenario and expected result | Intended automated file | Final |
| --- | --- | --- | --- | --- | --- |
| UNIT-01 | Unit | BR-02..04; AC-03,05,22 | Password 11/12/128/129 code points, 512-byte limit, Unicode, whitespace, no trimming, confirmation/same-password; hashing salts differ, verify valid/invalid, malformed hashes fail safely | server/tests/lab-03/password.unit.test.ts | Planned |
| UNIT-02 | Unit | BR-02,30; AC-21,22 | Name/email normalization and inclusive limits; role allowlist, boolean/type errors, duplicate normalized email semantics | server/tests/lab-03/user-validation.unit.test.ts | Planned |
| UNIT-03 | Unit | BR-16,30; AC-11,13,21 | Query defaults, repeated/unknown keys, arrays, invalid enums/IDs, wildcard literal handling, safe page offsets and deterministic priority ranking | server/tests/lab-03/query-validation.unit.test.ts | Planned |
| UNIT-04 | Unit | BR-20..29; AC-14,15,16,20 | All 64 status pairs, owner eligibility, reasons/confirmation, same-status denial, allowed indication states and no-op rules | server/tests/lab-03/workflow.unit.test.ts | Planned |
| UNIT-05 | Unit | BR-10..12,28; AC-08,09,19 | Table-driven role/resource decisions including Admin read-only, historical requester IDs and no internal fields in requester serializer | server/tests/lab-03/authorization.unit.test.ts | Planned |
| MIG-01 | DB migration | FR-01; AC-01 | Upgrade actual Lab 2 schema with active/inactive users, Tickets, active/removed Attachments; preserve IDs/text/number/date/ownership/removal authors/file bytes and references | server/tests/lab-03/migration.integration.test.ts | Planned |
| MIG-02 | DB migration | BR-02,13; AC-01 | Case-fold email collisions/invalid existing email abort before partial mutation; sequence remains above preserved IDs/numbers; UNASSIGNED backfills but set priorities remain | server/tests/lab-03/migration.integration.test.ts | Planned |
| MIG-03 | DB integration | FR-02; AC-02,24 | Provision only null hashes; inactive users stay inactive; required role/30-ticket/status fixtures; seed twice yields no duplicates and preserves edited name/role/activation/password/entries | server/tests/lab-03/seed.integration.test.ts | Planned |
| MIG-04 | DB integration | BR-04,31; AC-02,03 | Invalid/missing provisioning secret or production seed refuses; only hashes stored; newly provisioned users require password change | server/tests/lab-03/seed.integration.test.ts | Planned |
| API-01 | API/DB | FR-03; AC-03 | Valid active login across all roles returns safe UserSummary, rotates session, never exposes auth token/hash | server/tests/lab-03/auth.api.test.ts | Planned |
| API-02 | API | BR-05; AC-04 | Wrong/unknown/inactive/unprovisioned uniform 401; malformed input 400; IP/email limit boundaries and Retry-After; expiry clears throttle | server/tests/lab-03/auth.api.test.ts | Planned |
| API-03 | API/DB | FR-04; AC-05 | Initial-password session can use auth-only routes; every protected route rejects until valid confirmed different password, then old sessions fail | server/tests/lab-03/auth.api.test.ts | Planned |
| API-04 | API/DB | FR-05; AC-06 | me/reload, absolute expiry boundary, logout, revoked token, voluntary change and account change invalidate old sessions; DB failure is safe 500 | server/tests/lab-03/auth.api.test.ts | Planned |
| API-05 | API | BR-06..09; AC-07 | HttpOnly/SameSite/Secure/path/expiry and no-store; anonymous CSRF cannot authorize; missing/wrong/cross-session token and hostile/missing Origin deny JSON/multipart writes; rotation enforced | server/tests/lab-03/csrf.api.test.ts | Planned |
| API-06 | API/DB | FR-06; AC-08 | Parameterize every protected endpoint/method for anonymous, forced-change, Requester, Staff, Admin; matrix grants/denials including all Admin Ticket mutations | server/tests/lab-03/authorization.api.test.ts | Planned |
| API-07 | API/DB | BR-11,12; AC-09 | A's session plus B's ticket/file IDs, requesterId in query/JSON/multipart and forged author/role; reject without disclosing/changing B; legacy selector safe 404 | server/tests/lab-03/requester-regression.api.test.ts | Planned |
| API-08 | API/DB | FR-08; AC-10 | Valid create stores authenticated ID, numbered NEW/matching priority; input/reference/boundary rejection; matching replay and changed-body conflict preserve original snapshot | server/tests/lab-03/requester-regression.api.test.ts | Planned |
| API-09 | API/DB | FR-09; AC-11 | Requester search/filters/all eight statuses/sort/page, literal wildcard terms, stable tie-breaker, out-of-range/empty metadata, no cross-user results | server/tests/lab-03/requester-regression.api.test.ts | Planned |
| API-10 | API/DB | FR-10; AC-12 | Valid MIME/signature/extension; 5 MiB exact/+1; fifth/sixth active; owned upload/list/download/remove, all statuses; removed bytes unavailable to every role and audit retained | server/tests/lab-03/attachments-regression.api.test.ts | Planned |
| API-11 | API | BR-19,35; AC-12,31 | Storage/metadata failures compensate safely; ticket survives partial uploads; missing file/reason limits/download header sanitation and safe error envelopes | server/tests/lab-03/attachments-regression.api.test.ts | Planned |
| API-12 | API/DB | FR-11; AC-13 | Staff/Admin Queue all query combinations/defaults/priority order/ties/count snapshot; requester denial; inactive historical owner remains visible; assignees active Staff/Admin only | server/tests/lab-03/staff-queue.api.test.ts | Planned |
| API-13 | API/DB | FR-12,13; AC-14 | Staff Detail, claim, already-self no-op, other-owner conflict, confirmed reassign, null restrictions, inactive/wrong-role rejection, Admin candidate with read-only permissions | server/tests/lab-03/staff-ticket-detail.api.test.ts | Planned |
| API-14 | API/DB | FR-14; AC-15 | Priority LOW/MEDIUM/HIGH, no UNASSIGNED, immutable Requested Priority, no-op and terminal/role denial | server/tests/lab-03/staff-ticket-detail.api.test.ts | Planned |
| API-15 | API/DB | FR-15; AC-16 | Every permitted/forbidden status pair; owner, confirmation and public reason prerequisites; timestamps/history/reopen clearing and transaction rollback on history failure | server/tests/lab-03/staff-ticket-detail.api.test.ts | Planned |
| API-16 | DB concurrency | BR-15,17,25,32; AC-10,12,17,25 | Racing identical creates -> one Ticket; simultaneous fifth/sixth uploads -> cap; claims/stale versions/admin demotions -> valid winner/conflict; owner deactivation race cannot produce invalid active assignment | server/tests/lab-03/concurrency.integration.test.ts | Planned |
| API-17 | API/DB | FR-16; AC-18 | Public read/post roles, owned isolation, whitespace/1/2000/2001 limits, author/time injection denial, terminal and PATCH/DELETE denial, stable ordering | server/tests/lab-03/comments-notes.api.test.ts | Planned |
| API-18 | API/DB | FR-17; AC-19 | Notes Staff append/Admin read-only, Requester forbidden including guessed IDs; no note/count leaks in detail/list/errors; 1/4000/4001 limits and append-only/terminal rules | server/tests/lab-03/comments-notes.api.test.ts | Planned |
| API-19 | API/DB | FR-18; AC-20 | Own eligible confirmed indication sets time/version without status change; repeat no-op, stale/cross-user/ineligible status denial; staff reopen clears it | server/tests/lab-03/resolution-indication.api.test.ts | Planned |
| API-20 | API/DB | FR-19; AC-21 | Users fields/list/default order/search/optional role/empty/invalid query; non-Admin denial | server/tests/lab-03/users-admin.api.test.ts | Planned |
| API-21 | API/DB | FR-20; AC-22 | Create active/inactive single-role user, hash/forced-change defaults; normalized duplicate/racing duplicate and malformed input rejection | server/tests/lab-03/users-admin.api.test.ts | Planned |
| API-22 | API/DB | FR-20,22; AC-23 | Name/email/role/active edits, no-op/stale behavior, revocation, active-assignment guard and retained historical authors; old-session mutation after revocation denied | server/tests/lab-03/users-admin.api.test.ts | Planned |
| API-23 | API/DB | FR-21; AC-24 | Admin initial reset: old credential/session denied, new login restricted until change, reset not undone by seed | server/tests/lab-03/users-admin.api.test.ts | Planned |
| API-24 | API/DB | FR-22; AC-25 | Self-deactivation, final active Admin deactivation/demotion forbidden; different Admin edit allowed; UI-disabled actions also rejected by direct API | server/tests/lab-03/users-admin.api.test.ts | Planned |
| API-25 | API | BR-35; AC-31 | Malformed JSON/content-type/upload/unknown endpoints, session/query/database/storage failure; no stack/hash/path/connection/private data, documented error envelopes | server/tests/lab-03/errors.api.test.ts | Planned |
| UI-01 | UI | FR-03,07; AC-26 | Login labels, busy, safe invalid/inactive/rate-limit/network feedback, email retention/password clearing and redirect | client/tests/lab-03/Login.test.tsx | Planned |
| UI-02 | UI | FR-04,05; AC-05,26 | Forced and voluntary change, paste/autocomplete, limits/mismatch/same-password, pending/failure/success, no bypass | client/tests/lab-03/ChangePassword.test.tsx | Planned |
| UI-03 | UI | FR-06,07; AC-08,26 | Boot loading/me, role menus, forbidden routes, expiry/logout failure/retry, no stale data via Back/reload, old storage key removed | client/tests/lab-03/RoleNavigation.test.tsx | Planned |
| UI-04 | UI | FR-08..10; AC-10,27 | Authenticated requester Create/List/Detail, filters/statuses/empty/retry, key retained across ambiguous failure, partial file recovery, no selector | client/tests/lab-03/RequesterRegression.test.tsx | Planned |
| UI-05 | UI | FR-11; AC-13,28 | Staff/Admin Queue fields/search/filters/sort/page/card links, loading/empty/no-results/forbidden/failure, read-only Admin context | client/tests/lab-03/StaffTicketQueue.test.tsx | Planned |
| UI-06 | UI | FR-12..15; AC-14,15,16,28 | Staff owner/priority/status/reason dialogs, busy/conflict/reload, terminal controls, immutable submissions, Admin no mutation controls | client/tests/lab-03/StaffTicketDetail.test.tsx | Planned |
| UI-07 | UI | FR-16..18; AC-18,19,20,28 | Separate public/internal drafts, safe literal HTML text, permissions, empty/failed/terminal posting, requester resolution action/indicator and no note metadata | client/tests/lab-03/CommentsNotes.test.tsx | Planned |
| UI-08 | UI | FR-19..22; AC-21..25,29 | User list/search/create/edit/reset, field validation/conflict/safe failure, draft retention/password clearing, safety reasons, self-session invalidation | client/tests/lab-03/UserManagement.test.tsx | Planned |
| STYLE-01 | UI style | BR-36; AC-30 | Shared Zen tokens/classes, required markers, read-only/invalid states, aria labels, non-colour badges and button states | client/tests/lab-03/StyleAccessibility.test.tsx | Planned |
| E2E-01 | E2E | FR-03..07; AC-03..08,26 | Real role logins/invalid/inactive/expiry/logout and direct API access after logout; navigation matrix | e2e/lab-03/authentication.spec.ts | Planned |
| E2E-02 | E2E | FR-04; AC-05,24,26 | Initial-password login -> forced screen/API denial -> valid change -> permitted home; Admin reset repeats forced flow | e2e/lab-03/first-login.spec.ts | Planned |
| E2E-03 | E2E | FR-08..10; AC-09..12,27 | A creates/uploads/searches/views/removes, B cannot read/download; failure recovery with real persisted Ticket/Attachment | e2e/lab-03/requester-regression.spec.ts | Planned |
| E2E-04 | E2E | FR-11..18; AC-13..20,28 | Staff Queue -> claim/reassign/priority -> comments/notes -> Requester indication -> Staff resolve/close/reopen; Admin read-only and direct role denials | e2e/lab-03/staff-ticket-flow.spec.ts | Planned |
| E2E-05 | E2E | FR-19..22; AC-21..25,29 | Admin search/create/edit/activate/deactivate/reset; duplicate/safety rules and old-session invalidation with multiple browser contexts | e2e/lab-03/user-administration.spec.ts | Planned |
| RWD-01 | Browser/style | FR-23; AC-30 | All screen groups at 1440x900, 834x1112, 390x844; long text, overflow/visibility, keyboard/dialog focus, zoom and screenshots | e2e/lab-03/responsive-visual.spec.ts | Planned |
| DOC-01 | Manual/document | FR-24; AC-32 | Cross-check FR/BR/AC/API/UI/tests, all intended paths and 10 Issue dependencies; no fabricated results | docs/lab-03/tests.md (this checklist) | Planned |
| REL-01 | Full suite/manual | FR-24; AC-32 | Final-main unit/API/integration/UI/E2E/build results, reviewed documents, explicit student main gate, reviewer merge and one ordered evidence PDF | docs/lab-03/workflow.md and actual test files above | Planned |

## 3. AC-to-test index

| AC | Planned evidence |
| --- | --- |
| AC-01 | MIG-01, MIG-02 |
| AC-02 | MIG-03, MIG-04 |
| AC-03 | UNIT-01, API-01, E2E-01 |
| AC-04 | API-02, E2E-01 |
| AC-05 | UNIT-01, API-03, UI-02, E2E-02 |
| AC-06 | API-04, API-22, API-23, E2E-01 |
| AC-07 | API-05, E2E-01 |
| AC-08 | UNIT-05, API-06, UI-03, E2E-01, E2E-04 |
| AC-09 | API-07, E2E-03 |
| AC-10 | API-08, API-16, UI-04, E2E-03 |
| AC-11 | UNIT-03, API-09, E2E-03 |
| AC-12 | API-10, API-11, API-16, E2E-03 |
| AC-13 | UNIT-03, API-12, UI-05, E2E-04 |
| AC-14 | UNIT-04, API-13, UI-06, E2E-04 |
| AC-15 | API-14, UI-06, E2E-04 |
| AC-16 | UNIT-04, API-15, UI-06, E2E-04 |
| AC-17 | API-16, API-22 |
| AC-18 | API-17, UI-07, E2E-04 |
| AC-19 | UNIT-05, API-18, UI-07, E2E-04 |
| AC-20 | UNIT-04, API-19, UI-07, E2E-04 |
| AC-21 | UNIT-02, API-20, UI-08, E2E-05 |
| AC-22 | UNIT-01, UNIT-02, API-21, UI-08, E2E-05 |
| AC-23 | API-22, UI-08, E2E-05 |
| AC-24 | MIG-03, API-23, UI-08, E2E-02, E2E-05 |
| AC-25 | API-16, API-24, UI-08, E2E-05 |
| AC-26 | UI-01, UI-02, UI-03, E2E-01, E2E-02 |
| AC-27 | UI-04, E2E-03 |
| AC-28 | UI-05, UI-06, UI-07, E2E-04 |
| AC-29 | UI-08, E2E-05 |
| AC-30 | STYLE-01, RWD-01, visual checklist |
| AC-31 | API-11, API-25 and failure cases in UI-01..08 |
| AC-32 | DOC-01, REL-01, complete suite and workflow evidence |

## 4. TDD and regression evidence by Issue

| Issue | Main planned coverage |
| --- | --- |
| #32 Contract | DOC-01; only docs checks now, student confirmed; peer review pending |
| #33 Data migration | MIG-01..04; actual legacy-schema upgrade and fixture safety |
| #34 Auth/API | UNIT-01, UNIT-05, API-01..07, API-25; adapt earlier API auth expectations |
| #35 Auth UI | UI-01..03, E2E-01..02 auth portions; remove selector UI/state |
| #36 Requester | API-08..11, requester parts API-16, UI-04, E2E-03 |
| #37 Queue | UNIT-03, API-12, UI-05 |
| #38 Staff operations | UNIT-04, API-13..16, UI-06 |
| #39 Communication | API-17..19, UI-07, E2E-04 |
| #40 Admin | UNIT-02, API-20..24, admin parts API-16, UI-08, E2E-05 |
| #41 Final evidence | Full suite, STYLE-01/RWD-01 final audit, REL-01 and final-main rerun |

Old Lab 1/2 tests remain regression evidence where behavior is unchanged.
Selector-based tests must be replaced/adapted to real auth rather than skipped;
new ACs supersede old NEW-only/UNASSIGNED-only expectations. Keep validation,
numbering, list and file-lifecycle coverage. Record any change to old test intent.

## 5. Commands and result recording

Existing commands: npm test, npm run build, npm run prisma:validate,
npm run test:e2e, npm run test:visual. They currently represent the Lab 2 setup;
test:visual currently targets only Lab 2 and must be updated to include Lab 3.

Planned commands added by the owning implementation Issues (not available yet):
- npm run test:integration --workspace server (isolated migration/DB tests)
- npm run lab3:provision --workspace server (explicit local credential provisioning)
- npm run test:e2e:lab3 (all Lab 3 browser flows in the isolated E2E environment)

#41 must document the final exact working commands, Node/npm/PostgreSQL versions,
environment selection, commit SHA, file/test counts, failures and final status.
Do not run unimplemented scripts or relabel a build as an authorization test.
Baseline requirements for all checks pass on main after reviewer release merge.
Capture pre-release staging evidence first and append final-main observations
after merge as specified in workflow.md.

## 6. Current results

- Application feature tests: Not run; no Lab 3 implementation in #32.
- Migration, runtime, screenshots: Not run for Lab 3.
- Documentation consistency/link checks (2026-09-10): Pass for 11 specification
  sections, 24 FRs, 37 BRs, all 32 AC mappings, 51 unique planned-test rows,
  Markdown local links/fences/whitespace, all 10 Issue links and the 60-point rubric.
  These are document checks only; they do not prove feature behavior.
- Student approval of full contract: confirmed on 2026-09-10; see reviewer.md.
- Peer review/merge of contract: pending.

This is intentionally an honest plan, not a table of assumed passes.

## 7. Visual checklist and deferred scope

Complete the ui-spec.md checklist with screenshot paths, observed results and
reviewer notes during implementation/#41. No required Lab 3 test is deliberately
deferred; Planned means its owning Issue has not yet implemented it. Excluded
Actions Taken, email delivery and production infrastructure are not counted as
missing Lab 3 coverage. Concurrency/session/migration tests are required.
