# Issue #62 - Requester Dashboard evidence

Date: 2026-09-27. Branch: `feature/62-requester-dashboard`, based on peer-merged #61 / PR #68 at `604dd9ba67b0ebb0efe15815800517c8d9ac1b32`. This is feature-branch evidence, not final-main verification or student UI approval. All checks below were assistant-run.

Tested implementation commit: `9745355d028e69b6c0dd38f3c5bd994b2972cbca`. [PR #69](https://github.com/BOOky-OS/toktickit/pull/69) targets lab4-staging; peer review/merge pending. Later documentation-only metadata is not a runtime change.

## Delivered behavior

- `GET /api/dashboards/requester` permits eligible Requesters only, derives ownership from the session, rejects all caller scope/query inputs and returns four authoritative counts plus at most five safe recent summaries.
- Two SQL reads share a Repeatable Read snapshot. Active, waiting, updated and resolved predicates follow BR-22..25. Recently resolved includes currently Closed Tickets; reopening removes qualification. Both seven-day endpoints are inclusive and the response carries the exact UTC bounds and Bangkok presentation zone.
- My Tickets retains existing filters/sort/paging and adds active/date filters with matching list/count predicates. It rejects unsupported/repeated/malformed query values; ownership cannot be overridden. UI filters/page survive refresh, Back/Forward and return from Detail.
- Requester Dashboard is the normal Requester landing page. Four descriptive count links, recent Ticket links, Create Ticket, My Tickets, update time, loading/zero/failure/stale/forbidden feedback and keyboard navigation are implemented. Logout/identity changes discard the old snapshot; late unmounted requests cannot restore it.
- Existing working data was not reset. The existing `toktickit-lab4-test` container was started and reused, with allowlisted `toktickit_lab3_test` and invocation-owned disposable schemas.

## Test execution and corrections

Environment: Windows 11 (10.0.26200), Node 24.19.0, PostgreSQL test container, Vitest 4.1.10, Playwright with Chrome. Database setup follows [migration.md](migration.md). Commands require `TEST_DATABASE_URL`; full server recovery tests also use `LAB4_TEST_POSTGRES_CONTAINER=toktickit-lab4-test`.

| Command / evidence | Observed result |
| --- | --- |
| `npm run test --workspace server -- tests/lab-04/requester-dashboard.api.test.ts` | Initial red: 4 failed / 1 passed before the endpoint existed. Implementation run: all 5 passed. |
| `npm run test --workspace server` | 573 passed / 1 failed across 40 files. Only failure: new performance instrumentation counted zero queries because raw SQL began with whitespace. Endpoint timings/counts were correct. |
| `npm run test --workspace server -- tests/lab-04/requester-performance.integration.test.ts` | After trimming leading SQL whitespace in the observer: 1 passed, exactly two reads per request. No server implementation change after the full run. This is a targeted correction, not a claimed clean rerun of the entire suite. |
| `npm run test --workspace client` | 18 files / 115 tests passed. Old list/create/health fixtures explicitly open My Tickets; auth tests assert the newly approved Dashboard home. No assertions were disabled. |
| `npm run test:e2e:lab4` | 20 passed. New four-viewport tests cover real counts, filters, pagination, Detail return, keyboard activation, refresh failure/retry and identity switching. |
| `npm run test:e2e:lab3` | After updating obsolete role-home expectations: 13 passed / 1 failed. The remaining test exposed a real Queue bug: changing page size erased unapplied filters. |
| `npm run test:e2e:lab3 -- queue-query.spec.ts` | 1 passed after Queue page-size navigation was changed to preserve the current draft filters. Existing filtering/sorting/paging assertions retained. |
| `npm run test:e2e:lab4 -- dashboards.spec.ts requester-dashboard.spec.ts` | 8 passed after Queue fix and responsive button adjustment. |
| `npm run build`, `git diff --check` | Client/server build and whitespace validation passed. |

The first new browser run passed desktop/tablet/mobile but the narrow test navigated away before Logout finished. Its helper now waits for the actual Login screen before changing identity. The complete Lab 4 run then passed all 20 tests. Visual inspection also found excessive word wrapping in the small-screen Refresh button; the shared dashboard heading now stacks above a full-width button below 768px.

## Coverage and traceability

- AC-03/09, DASH-01: `server/tests/lab-04/requester-dashboard.api.test.ts` compares all metrics and recent ordering against independent owner-scoped SQL across two Requesters and all eight statuses; tests exact endpoints, +/-1ms, closed/reopened resolution, zero data and private-field exclusion.
- AC-11, DASH-03: that API file compares every card predicate to My Tickets totals, rejects scope overrides/invalid combinations and checks foreign Detail denial. `e2e/lab-04/requester-dashboard.spec.ts` exercises real URL/paging/back/refresh flows.
- AC-13, UI-04/E2E-03: `client/tests/lab-04/RequesterDashboard.test.tsx` verifies counts independent of recent-list length, exact links, initial loading/failure, stale recovery, denial clearing and a late response after identity unmount. Browser screenshots/checks cover desktop 1440x900, tablet 834x1112, mobile 390x844 and narrow 320x844.
- AC-14, REG-01: server regression suites passed; client auth/create/list/files/communication/workflow tests passed. Lab 3 real-browser results cover account administration, sessions, attachment bytes/private download/removal, Requester creation, Staff operations and responsive screens; the single Queue regression was corrected and rerun.
- AC-15, PERF-01: `server/tests/lab-04/requester-performance.integration.test.ts` uses 1000 Tickets and 3000 actions, expected owner-scoped counts, five warm-ups and 30 real HTTP requests.

## Performance and local artifacts

Measured p95: **41.42 ms**, against the <=1000 ms local smoke threshold. **Two dashboard SQL reads**, excluding authentication, against the <=10 budget. Machine: Intel Core i5-11400H 2.70GHz, 15.78 GiB RAM. Query plan for the recent owner-scoped list uses `Ticket_requesterId_updatedAt_idx`, backward index scan and incremental/top-N sorting; observed execution 0.376 ms. No schema/index migration was needed. This is local smoke evidence, not a production SLA.

Raw timings/query plan: ignored `output/lab4-requester-performance.json`. Logs: `output/lab4-requester-{red,api,server,perf-final,client-final,browser,browser-full,prior-browser,prior-browser-final,queue-final,dashboards-final,build-final}.txt`. Screenshots: ignored `artifacts/lab-04/screenshots/requester-dashboard/{desktop,tablet,mobile,narrow}/{zero,populated,stale}.png`. No generated output is committed.

## Remaining gates

Peer review and merge of #62 must precede #63. The student must inspect/correct the UI during #63 before peer handoff and before final documentation. A separate student document/report/review-record correction gate applies to #64. Product-wide contrast/actual browser zoom, final report/reflection/reciprocal evidence and final-main validation remain for #63/#64. These feature screenshots do not replace either student approval.
