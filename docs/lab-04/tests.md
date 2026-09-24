# Lab 4 Test Plan and Traceability

Status: planned before implementation, Issue #56, 2026-09-24. This document describes tests to build and run. All Lab 4 runtime results are **Planned / Not run**; no previous lab count is reused as a Lab 4 pass. Baseline inspected: `754a81d`. Contract: [specification.md](specification.md), [api-spec.md](api-spec.md), [ui-spec.md](ui-spec.md).

## 1. Execution environments and safety

- Unit and client component tests use Vitest/Testing Library; mocks verify UI and pure logic only.
- API/integration tests use real Express, sessions and PostgreSQL for authorization, transactions, versions, seed, migration and query calculations. Do not substitute in-memory mocks for those proofs.
- Reuse the established dedicated local `toktickit_lab3_test` database allowlist and `TEST_DATABASE_URL` safety policy, with a new random owned schema prefix for Lab 4. The inherited Lab 3 database name is intentional; it is not the working database. Reject wrong host/database, a URL matching working DATABASE_URL, and unsafe schema cleanup. Never reset the working DB or delete its uploads.
- Migration tests load all pre-Lab-4 migrations/data, capture counts/IDs/content, apply the new migration, check integrity and schema drift, then dispose only owned fixtures. Recovery restores a backup into a separate isolated database/schema and checks representative data and attachments.
- Real browser tests start dedicated API/client services and owned temporary storage, use real login cookies and CSRF, and fail if their ports are occupied. Proposed Lab 4 ports: 3007/5177. Keep existing Lab 3 ports 3006/5176 intact. Setup/config is planned, not available yet.
- Freeze the backend clock for date-boundary tests. Use at least two Requesters, two Staff, one Admin and inactive/changed-role accounts. No credentials in evidence or public logs.
- Record environment versions, exact command, tested SHA, UTC time, result/counts/skips and evidence path for each execution. Distinguish feature branch, staging and final-main runs. Retain failure evidence until resolved.

## 2. Planned automated tests

Runtime test paths in this table are **planned new files and do not yet exist** in this documentation increment. DOC-01 references this existing plan and evidence records, not a missing automated test. They must be created in their implementation Issues and verified before replacing Planned with a final result. Multiple Test IDs may be distinct scenarios in one file; do not infer test-case counts from this table.

| Test ID | Type | FR / BR / AC | Scenario and expected result | Planned test file | Final |
| --- | --- | --- | --- | --- | --- |
| UNIT-01 | Unit | FR-01/02; BR-02..08; AC-01/02 | Boundary lengths, whitespace, explicit offsets, date limits, booleans, Result/follow-up requirements and all 16 action state pairs; invalid data rejected. | `server/tests/lab-04/action-validation.unit.test.ts` | Planned |
| UNIT-02 | Unit | FR-04; BR-11..15; AC-05/06 | All 64 Ticket state pairs, owner requirements, integer cycle changes including equal-timestamp reopening, legacy closure and unassigned NEW Ticket cancellation. | `server/tests/lab-04/workflow.unit.test.ts` | Planned |
| API-01 | API/integration | FR-01; BR-01..05/09/17; AC-01 | Create correctly parented action, default status, automatic creator, eligible different assignee, first revision and both versions; reject spoofed fields. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-02 | API/integration | FR-02; BR-04..09; AC-02 | Edit/assign/start/complete/cancel; invalid/inactive assignees; missing completion Result/follow-up; terminal parent/action and cross-parent IDs; no-op version/receipt handling and missing/invalid idempotency headers. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-03 | API/integration | FR-02/03; BR-09/10; AC-02/03 | More than one page; stable creation ordering after edits; all current terminal items visible; revisions ordered with immutable snapshots; no delete/history rewrite routes. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| AUTH-01 | API/integration | FR-03/09; BR-10; AC-03/04 | Three-role endpoint matrix, foreign Requester 404, write 403, missing CSRF, expired/revoked/forced-change sessions; no private data/count leaks. | `server/tests/lab-04/authorization.api.test.ts` | Planned |
| AUTH-02 | API/integration | FR-09/11; BR-10/19; AC-04/07 | Admin operational/comments/notes writes succeed; Staff cannot administer users; Requester-only file/create/indication restrictions remain; pending assignments block demotion/deactivation. | `server/tests/lab-04/authorization.api.test.ts` | Planned |
| API-04 | API/integration | FR-04; BR-11..16; AC-05/06 | Direct API tests for all Ticket pairs and gates; zero/all-cancelled/unfinished actions cannot resolve; valid current-cycle completed work can resolve; cancel with pending work fails atomically. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-05 | API/integration | FR-04/11; BR-13..16/20; AC-06 | Legacy resolved Ticket closes, reopened Ticket needs new-cycle work, indication is advisory, timestamps reset correctly, history append order/visibility preserved. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| CON-01 | Real DB concurrency | FR-09; BR-17/18; AC-07 | Two identical create/status retries yield one action/revision; changed payload/key conflict; stale edit loses safely; rollback fault creates no partial action/revision/receipt. | `server/tests/lab-04/concurrency.integration.test.ts` | Planned |
| CON-02 | Real DB concurrency | FR-04/09; BR-13/17/19; AC-07 | Race action create vs Resolve, complete vs Ticket cancel, reassignment vs account deactivation; final state respects gate/eligibility and loser receives conflict. | `server/tests/lab-04/concurrency.integration.test.ts` | Planned |
| MIG-01 | Migration/integration | FR-08; BR-20; AC-08 | Compare all old models/IDs/FKs/content, auth and attachment files before/after upgrade; no invented actions; current schema matches migrations; failed DDL rolls back. | `server/tests/lab-04/migration.integration.test.ts` | Planned |
| SEED-01 | Seed/integration | FR-08; BR-21; AC-08 | Run twice, preserve edits/password hashes, no duplicate seed keys/history; cover all Ticket/action statuses, priorities, ownership and zero/nonzero metrics. | `server/tests/lab-04/seed.integration.test.ts` | Planned |
| DB-01 | Recovery/integration | FR-08/09; BR-20/21; AC-08 | Backup/restore on isolated copy retains old data and file references; fixture cleanup rejects working DB and unsafe schema. | `server/tests/lab-04/recovery.integration.test.ts` | Planned |
| DASH-01 | API/integration | FR-05; BR-22..25; AC-09 | Independent SQL matches every Requester count/list, zero records, mixed owners, exact lower/upper instants, outside-window and Bangkok/UTC boundaries; IDs cannot override scope. | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| DASH-02 | API/integration | FR-06; BR-22..25; AC-10 | Independent SQL matches all eight statuses, three active priorities, null/me ownership, pending assigned actions, five-item limits/ties, urgent/recent ordering and inactive historical actors. | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| DASH-03 | API/integration | FR-07; BR-25; AC-11 | Card predicates equal list totals on a frozen fixture; new filters compose/reject invalid pairs; repeated/unknown params rejected; EXISTS prevents duplicate Ticket rows across action assignments. | `server/tests/lab-04/dashboard-drilldown.api.test.ts` | Planned |
| UI-01 | Component | FR-01/02/10; BR-02..09/17/18; AC-12 | Action list/create/assign/edit/status, conditional errors, inactive option, read-only fields, retained drafts, replay refresh, stale conflict and duplicate-click prevention. | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-02 | Component | FR-04/10; BR-10..16; AC-05/06/13 | Only allowed transitions/roles; gate hints, confirmation/reasons, public history, advisory indication and refresh after writes. | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-03 | Component | FR-06/07/10; BR-22..25; AC-10/11/13 | Staff/Admin cards, my actions, urgent/recent lists; busy/empty/forbidden/500; stale labels, correct links, no invented trends. | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-04 | Component | FR-05/07/10; BR-10/22..25; AC-09/11/13 | Requester cards/recent list, zero states, failure/retry, identity-switch clearing, route/query refresh/back and ownership restrictions. | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| STYLE-01 | Style/accessibility | FR-10; AC-13 | Zen tokens, text/contrast, required labels, landmarks, aria feedback, role controls, visible focus and no color-only meaning. | `client/tests/lab-04/StyleAccessibility.test.tsx` | Planned |
| E2E-01 | Real browser | FR-01/02/03/09; AC-01/02/03/07/12 | Real login, several actions and performers on one Ticket, assign/edit/start/complete/cancel, Requester read-only view, safe retry and conflict. | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | Real browser | FR-04/11; AC-05/06/14 | Create Ticket through work/resolve/close/reopen/new-cycle resolution; alternate cancellation flow; indication cannot bypass gate; stable public history. | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-03 | Real browser | FR-05/06/07; AC-09/10/11/13 | Three-role dashboards and links against real DB; filter paging, Back/Forward/refresh, mutation refresh and cross-user protection. | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-04 | Responsive/keyboard/visual | FR-10; AC-12/13 | All major screens at 1440x900, 834x1112, 390x844 and 320px; long content, overflow, dialogs, keyboard/focus, zoom/reflow, console errors. | `e2e/lab-04/responsive-accessibility.spec.ts` | Planned |
| PERF-01 | Performance smoke | FR-06/09; BR-22..25; AC-15 | 1000 Tickets/3000 actions, independent expected counts, <=10 read queries excluding auth, no N+1, five warm-ups then 30 requests with p95 <=1000ms on recorded machine. | `server/tests/lab-04/dashboard-performance.integration.test.ts` | Planned |
| REG-01 | Full regression | FR-11; BR-10/19/20; AC-04/14 | Existing suites below pass with narrowly documented Admin/gate/landing-page expectation changes; no disabled tests hiding regressions. | Existing suites plus `e2e/lab-04/regression.spec.ts` (new) | Planned |
| DOC-01 | Manual evidence audit | FR-12; AC-16 | Actual test paths/results/SHA, reviewer replies/approvals, AI prompts/reflection, README/ignore, screenshots, PDF parts/links and peer release/main proof complete. | `docs/lab-04/tests.md` and future release records | Planned |

## 3. Acceptance-criterion coverage

| AC | Planned tests |
| --- | --- |
| AC-01 | UNIT-01, API-01, E2E-01 |
| AC-02 | UNIT-01, API-02, API-03, E2E-01 |
| AC-03 | API-03, AUTH-01, E2E-01 |
| AC-04 | AUTH-01, AUTH-02, REG-01 |
| AC-05 | UNIT-02, API-04, UI-02, E2E-02 |
| AC-06 | UNIT-02, API-04, API-05, UI-02, E2E-02 |
| AC-07 | AUTH-02, CON-01, CON-02, E2E-01 |
| AC-08 | MIG-01, SEED-01, DB-01 |
| AC-09 | DASH-01, UI-04, E2E-03 |
| AC-10 | DASH-02, UI-03, E2E-03 |
| AC-11 | DASH-03, UI-03, UI-04, E2E-03 |
| AC-12 | UI-01, E2E-01, E2E-04 |
| AC-13 | UI-02, UI-03, UI-04, STYLE-01, E2E-03, E2E-04 |
| AC-14 | REG-01, E2E-02 |
| AC-15 | PERF-01 |
| AC-16 | DOC-01 |

## 4. Existing regression coverage to preserve

These locations exist in the inspected baseline; their prior results are historical, not current Lab 4 evidence.

| Area | Existing locations / required adaptation |
| --- | --- |
| Health/categories | `server/tests/lab-01/`, `client/tests/lab-01/` |
| Requester creation/list/attachments | `server/tests/lab-02/`, `client/tests/lab-02/`, `server/tests/lab-03/requester-regression.api.test.ts`, `attachments-regression.api.test.ts` in that directory |
| Auth/session/roles | `server/tests/lab-03/auth.api.test.ts`, `authorization.api.test.ts`, `authorization-matrix.api.test.ts`, `client/tests/lab-03/AuthFlow.test.tsx`, `AuthApi.test.tsx`; update only deliberate Admin/landing-route changes |
| Staff Queue/workflow | `server/tests/lab-03/staff-queue.api.test.ts`, `staff-ticket-detail.api.test.ts`, `workflow.unit.test.ts`; extend successful resolution fixtures with qualifying actions |
| Communication/indication | `server/tests/lab-03/comments-notes.api.test.ts`, `resolution-indication.api.test.ts`, `client/tests/lab-03/CommentsNotes.test.tsx`; retain append-only/privacy, extend Admin posting |
| User management | `server/tests/lab-03/users-admin.api.test.ts`, `client/tests/lab-03/UserManagement.test.tsx`; add active-action assignment guard |
| Real prior product flows | `e2e/lab-03/real/` via `playwright.lab3.config.ts`; retain auth/session, requester/files, queue, staff and administration coverage; adapt fixtures/expected gates explicitly |

Also retain earlier isolated seed/migration checks and mocked E2E scenarios; document their narrower proof. Default `npm run test:e2e` does not substitute for the new real Lab 4 suite. If prior fixtures need updated resolution work, change those fixtures in the relevant implementation Issue with an explanation, not by dropping assertions.

## 5. Commands and implementation gates

Scripts verified to exist in package.json on 2026-09-24:

```powershell
npm run prisma:validate
npm test
npm run build
npm run test:e2e
npm run test:e2e:lab3
npm run test:visual
```

Use the existing isolated TEST_DATABASE_URL setup before DB-dependent commands. The existing default/visual E2E commands include historical scenarios; inspect their config before interpreting results. No runtime test commands were run for this documentation-only increment.

Once corresponding files exist, targeted commands use existing Vitest scripts:

```powershell
npm run test --workspace server -- tests/lab-04/actions-taken.api.test.ts
npm run test --workspace client -- tests/lab-04/ActionsTaken.test.tsx
```

Implementation must add `playwright.lab4.config.ts` and the root `test:e2e:lab4` script; both are **planned and currently absent**. The eventual `npm run test:e2e:lab4` must use the isolated real server/database setup, not mocked network responses for persistence/security proof. Update this section with exact implemented commands and required non-secret environment configuration before recording a pass.

TDD sequence per implementation Issue: map its ACs; implement a meaningful failing test; record observed failure; implement the smallest coherent feature; run targeted unit/integration/UI tests; verify relevant earlier regression; review diff and update actual results. Finish cross-product, accessibility, performance and final-main verification in the hardening/release work packages. No claim of a red/green run without actual output.

## 6. Evidence and execution register

| Stage | Commit/environment | Result |
| --- | --- | --- |
| Baseline inspection | `754a81d`; Windows workspace; source/package scripts/GitHub inspected 2026-09-24 | Read-only inspection; no runtime pass inferred |
| Issue #56 contract | `docs/56-lab4-contract`; see PR head for exact documentation commit | Static contract checks recorded in PR; runtime suites Not run |
| Feature branches | Not implemented | Planned |
| Complete staging | Not reached | Planned |
| Final main | Not released | Planned |

For actual executions append `Test ID | command | environment | SHA | date | result/counts/skips | evidence`. Update the table's planned paths to real files after creation and retain precise failed/not-run explanations. Final-main evidence must name the actual peer-merged SHA and be rerun if relevant code changes.

Manual visual review uses the complete checklist in [ui-spec.md](ui-spec.md), records screenshot paths and observed limitations, and distinguishes assistant inspection from peer review. Submission audit checks Answer Parts 1-9, all links, readable screenshots and the final-main source of truth. Final Issue remains open until student documentation gate, peer merge, required main checks and submission evidence are complete.

## Document review

Review the Markdown files directly: check numbered requirements, API/UI consistency, relative links and each acceptance criterion's planned tests. Run `git diff --check` for whitespace. The optional Python validator was removed at the student's request; no Python tool is required for this contract. Earlier static-check results describe the historical audit, not an available script or runtime test result.
