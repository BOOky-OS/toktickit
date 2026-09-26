# Issue #61 Staff/Admin dashboard evidence

Assistant-run work on `feature/61-staff-dashboard`, based on the verified peer merge of PR #67 (`93d205335899d669728aca46adc2dbc7cf7b5ef2`). These are feature-branch results, not final-main or independent peer execution.

## Delivered scope

- Staff/Admin dashboard with authoritative counts: unassigned active Tickets, own active Tickets, own pending actions, all eight status buckets and three active-priority buckets, including zeros.
- Bounded recent Tickets, urgent active HIGH-priority Tickets and own pending actions, at most five per list; deterministic updatedAt/id ordering and 120-character action summaries. Own means current actor as owner/assignee, independently of performer.
- Four explicit SQL reads in one RepeatableRead transaction. Responses use selected public fields; private notes, revisions, receipts and credentials are absent. Recent bounds are inclusive UTC instants for exactly seven days; display uses Asia/Bangkok.
- Queue statusGroup, actionAssignee and updated/resolved date filters with invalid/unknown/repeated-query rejection. Action matching uses EXISTS through Prisma relation `some`, so a Ticket with multiple matching actions is counted once.
- Queue URL state survives refresh/back and the Detail return button. Cards reset paging; action links focus their item. Staff/Admin now land on Dashboard, with existing Queue and Admin Users navigation preserved. Requester dashboard remains #62.
- Loading/initial-error/empty states, explicit stale snapshot on failed refresh, clearing protected data on authorization denial, Refresh retry and keyboard links. Counts are never derived from the five displayed rows.

## Checks

Environment: Windows, Node 24.19.0, local Chrome, PostgreSQL in the existing dedicated `toktickit-lab4-test` container. Tests use owned isolated schemas in `toktickit_lab3_test`; no working database reset/migration. Logs and screenshots stay ignored.

| Scope | Command / evidence | Result |
| --- | --- | --- |
| API first red | `staff-dashboard.api.test.ts`, output/lab4-dashboard-red.txt | Both initial cases failed while endpoint was absent. |
| Dashboard and drill-down API | `npm run test --workspace server -- tests/lab-04/staff-dashboard.api.test.ts tests/lab-04/dashboard-drilldown.api.test.ts` | 7 passed. |
| Full server | `npm run test --workspace server` | 38 files / 568 tests passed; output/lab4-dashboard-server.txt. |
| Full client | `npm run test --workspace client` | 17 files / 111 tests passed; output/lab4-dashboard-client.txt. |
| Dashboard browser | `npm run test:e2e:lab4 -- dashboards.spec.ts` | 4 passed (27.0s); output/lab4-dashboard-browser.txt. |
| Full Lab 4 browser | `npm run test:e2e:lab4` | 16 tests passed (2.1m); output/lab4-dashboard-browser-full.txt. |
| Affected previous browser flow | `npm run test:e2e:lab3 -- staff-ticket-flow.spec.ts` | 1 test passed (23.2s); output/lab4-dashboard-prior-browser.txt. |
| Build | `npm run build` | Client and server passed. |

API scenarios compare counts against independent SQL/fixture predicates, zero datasets, all statuses/priorities, inactive historical owners, creator-versus-assignee, list limits/ties, inclusive exact recent boundaries and one millisecond outside them. They also exercise forbidden/expired/forced users, safe database failure, owner/action filters, date validation and distinct Ticket paging.

Component scenarios cover authoritative zero/count links, exact date URLs, safe action text, initial loading/error, stale retry/recovery and authorization clearing. Real browser scenarios use actual login/API/database: database count comparison, multiple actions on one Ticket, keyboard card activation, deep-link focus, queue URL refresh/back/detail return, date-filter labels and injected refresh failure/recovery. Admin navigation and Requester direct-access denial are checked.

## Performance smoke

`server/tests/lab-04/dashboard-performance.integration.test.ts` runs real HTTP requests after five warm-ups against 1000 Tickets and 3000 actions. It independently asserts 500 unassigned, 500 actor-owned and 3000 actor-assigned pending actions. All lists remain capped at five. The query event listener counts the four dashboard reads, excluding session checks; no query count grows with dataset size.

First passing measured run: p95 37.42 ms, range 31.87-37.96 ms over 30 sequential requests; four dashboard reads each. Machine: Windows 10.0.26200, Intel Core i5-11400H 2.70GHz, 15.78 GiB RAM, Node v24.19.0. This is local smoke evidence, not a production SLA. The latest full-suite run may replace raw timings in ignored `output/lab4-dashboard-performance.json`; final values are recorded below.

Raw timings, environment, query counts and `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` for the pending-action EXISTS drill-down are in that local JSON. No extra index migration was required for this measured dataset. The existing parent/assignee indexes are retained.

## Corrections and visual inspection

- Initial client regression exposed the old Staff/Admin landing-route expectations and a Queue test mock missing the newly used real navigation export. Updated only those deliberate assumptions and reset each Queue fixture URL; all client tests passed.
- Initial performance fixture used text for a UUID field. Corrected fixture generation to valid UUIDs, then reran successfully; application validation/schema were unchanged.
- Previous real-browser repair flow now expects Staff/Admin dashboard landing and explicitly navigates to Queue, preserving its workflow assertions.
- The assistant inspected desktop/tablet/mobile populated captures under `artifacts/lab-04/screenshots/staff-dashboard/`. Cards and lists wrap without horizontal overflow, with a single-column mobile layout requiring vertical scrolling. The tests separately assert page bounds and capture empty-personal-work states. Full-product contrast/zoom and student UI inspection remain #63.

## Remaining scope and student gates

Requester dashboard and its My Tickets filters are #62; shared Staff Queue filter helpers do not claim that scope complete. Full hardening, final report, personal reflection/reciprocal review and main verification remain #63/#64.

The student's two mandatory review gates are recorded in root skill.md and workflow.md: stop for student UI corrections in #63 before peer handoff/final documentation; stop for student document/report/review-record corrections in #64 before peer handoff. Existing pre-main approval is also required. Neither gate has been passed by this increment.

Final full-suite performance result: p95 53.02 ms over 30 measured HTTP requests, four dashboard reads each. The inspected plan uses the action-assignee index, a hashed distinct aggregation, Ticket primary-key lookups and top-N sorting; EXPLAIN execution time was 2.52 ms. This plan is specific to the synthetic dataset. Whitespace validation passed before commit.
