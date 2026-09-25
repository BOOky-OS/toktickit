# Issue #60 Ticket workflow evidence

Assistant-run implementation on `feature/60-ticket-workflow`, based on the verified Atip-Infa merge of PR #66 (`99bedd09ee4c0091003df2e843a7aba4f2795bb5`). These are feature-branch checks, not final-main or independent peer execution.

## Implemented behavior

- Preserve all eight statuses and the reviewed transition matrix. Staff/Admin writes retain role/session, confirmation, reason, active-owner and version checks.
- Within the existing security/parent-row transaction locks, Resolve requires a completed action in the current integer work cycle and zero pending actions across all cycles. Failure is `409 RESOLUTION_BLOCKED`.
- Cancel requires zero pending actions, otherwise `409 ACTIVE_ACTIONS`. It never silently changes child actions. Gate checks precede history/status writes.
- Existing reopen increments the cycle and clears current resolution/advisory fields; old actions/history remain. Legacy resolved Tickets can close without invented work. Requester indications remain advisory.
- UI explains both gates, preserves failed drafts, links to Actions Taken and requires reload before another explicit save. Confirmation has focus containment, focus restoration and a synchronous duplicate-save guard.

## Test evidence

Environment: Windows, Node 24.19.0, PostgreSQL in the existing dedicated `toktickit-lab4-test` container; owned random schemas in the allowlisted `toktickit_lab3_test` database. No working database migration/reset was performed. Screenshots/logs remain ignored.

| Scope | Command / files | Result |
| --- | --- | --- |
| API/unit first red | `server/tests/lab-04/ticket-workflow.api.test.ts` | 66 passed, 2 failed before gates were implemented: missing work and old-cycle work were incorrectly accepted. `output/lab4-workflow-red.txt`. |
| Targeted API plus existing staff regression | `npm run test --workspace server -- tests/lab-04/ticket-workflow.api.test.ts tests/lab-03/staff-ticket-detail.api.test.ts` | 77 passed at initial green checkpoint. Later scenarios are included in the full server run below. |
| Component first red | `client/tests/lab-04/TicketWorkflow.test.tsx` | 3 failures before UI changes: two gate messages and keyboard focus containment. |
| Full client | `npm run test --workspace client` | 16 files, 107 tests passed. `output/lab4-workflow-client.txt`. |
| Full server | `npm run test --workspace server` | 35 files, 560 tests passed; output/lab4-workflow-server.txt. |
| Real browser | `npm run test:e2e:lab4 -- ticket-resolution.spec.ts` | 4 passed (41.9s) in the targeted run; output/lab4-workflow-browser.txt. |
| Build | `npm run build` | Client and server passed after correcting a test-only TypeScript status type. |

UNIT-02/API-04/API-05/CON-02 scenarios use the real API/PostgreSQL fixture in `ticket-workflow.api.test.ts`: all 64 pairs plus the pure transition predicate; zero/cancelled-only/old-cycle/pending work; legacy close, reopen and equal timestamps; advisory idempotence; public history ordering/ownership; authorization and stale writes; create versus Resolve/Cancel, competing Ticket transitions and completion versus Cancel. Existing Lab 3 tests also retain the history-insertion rollback check. No assertions were disabled.

UI-02 uses `client/tests/lab-04/TicketWorkflow.test.tsx` plus prior StaffTicketDetail/CommentsNotes coverage. E2E-02 uses `e2e/lab-04/ticket-resolution.spec.ts` with real login, API and database: Requester creates and indicates; Staff work/resolution; Admin closure/reopen/new-cycle resolution; pending-action cancellation and keyboard confirmation at three viewports.

## Regression and inspection notes

- Existing Lab 3 matrix/timestamp fixtures now include actual qualifying completed actions. The old browser repair flow now performs an action before resolving. The first old-flow browser run also found the obsolete Admin read-only assertions. They now verify visible status controls and a real Admin note post; all other outcome assertions remain. The corrected affected flow passed (1 test, 21.0s; output/lab4-workflow-prior-browser-final.txt). This is the deliberate Lab 4 contract change.
- Browser setup advances the owned fixture Ticket ID/number sequences after explicit seed IDs, allowing real Requester creation without duplicate-key collisions.
- Desktop/tablet/mobile screenshots belong under `artifacts/lab-04/screenshots/ticket-workflow/`. The assistant inspected the six-image overview: gate feedback and confirmations wrap within desktop/tablet/mobile layouts, with both confirmation controls visible. Automated tests additionally assert dialog bounds, keyboard focus/return and no horizontal page overflow. Long mobile pages still require vertical scrolling.
- Dashboards #61/#62, broad visual/accessibility hardening #63, personal reflection/reciprocal review, one final report and main verification #64 remain outstanding. This increment is not a final Product Definition of Done claim.

The first combined Lab 4 browser run passed 10 and failed 2 login checks after repeated use of one Staff account reached its per-account login budget. The setup now creates separate Staff accounts for the three workflow viewport cases; application rate limiting is unchanged. The final combined result is recorded below.

Final combined Lab 4 browser run: `npm run test:e2e:lab4` passed all 12 tests in 1.5m (`output/lab4-workflow-browser-final.txt`). Regenerated confirmation screenshots were visually inspected again at all three viewports. `git diff --check` passed before commit. Runtime code was unchanged after the passing full server/client/build checks; subsequent changes corrected browser fixtures and documentation.
