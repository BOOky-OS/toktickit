# Lab 4 - Issue #63 regression preparation

## Scope and source

Assistant-run checks on 2026-09-27, branch `feature/63-final-hardening`, based on staging merge `26cf6e316331d4f0753f68e425ecacb9642b31df` (PR #69). The implementation and test changes are in the commit introducing this record; `git log --format=fuller -- docs/lab-04/hardening-evidence.md` identifies that commit. Tests were run on the working tree before commit. Backend code is unchanged from that staging merge. Documentation changes after the checks do not change the tested product.

**Preparation only:** #63 remains Started. Student UI inspection/corrections and explicit confirmation are pending before peer handoff. No #63 peer review has been requested. #64 documentation/release and final-main verification remain pending. See [UI review](ui-review.md) for the running preview, accounts and checklist.

## Environment and isolation

- Windows 11, build 10.0.26200; Node 24.19.0; PostgreSQL 16.13; Vitest 4.1.10; Playwright Chromium.
- Intel Core i5-11400H 2.70 GHz, 15.78 GiB RAM.
- Existing Docker container `toktickit-lab4-test`, allowlisted test database on localhost:5544. Tests create owned disposable schemas and temporary upload directories. The working database was not reset.
- Default historical browser and real Lab 3 suites use API 3006/frontend 5176: run them sequentially. Lab 4 uses 3007/5177; student preview uses 3008/5178.
- Browser artifact directories are now separate: `test-results/legacy`, `test-results/lab3`, `test-results/lab4`. Logs, reports and screenshots remain ignored by Git.

Set `TEST_DATABASE_URL` as described in [migration.md](migration.md), and `LAB4_TEST_POSTGRES_CONTAINER=toktickit-lab4-test` for container-dependent migration/recovery checks.

## Observed checks

| Command | Observed result | Local ignored evidence |
| --- | --- | --- |
| `npm test` | Server: 40 files, 574 passed; client at this point: 18 files, 115 passed | `output/lab4-hardening-unit-api.txt` |
| `npm run test --workspace client` after the accessibility fix | 19 files, 116 passed | `output/lab4-hardening-client-final.txt` |
| `npm run test:e2e:lab4` | 20 passed | `output/lab4-hardening-browser4.txt` |
| `npm run test:e2e:lab4 -- dashboards.spec.ts` after the accessibility fix | 4 affected scenarios passed | `output/lab4-hardening-staff-a11y.txt` |
| `npm run test:e2e:lab3` after artifact isolation | 14 passed | `output/lab4-hardening-browser3-final.txt` |
| `npm run test:e2e` after historical fixture corrections | 18 passed across desktop, tablet and mobile | `output/lab4-hardening-legacy-pass.txt` |
| `npm run build` | Client and server passed | `output/lab4-hardening-build.txt` |
| `npm run prisma:validate` | Passed | `output/lab4-hardening-prisma.txt` |
| `git diff --check` | Passed | Terminal output |

These counts are separate executions, not a sum of unique scenarios. The default browser suite includes mocked Lab 3 UI scenarios; it is not proof of real persistence or authorization. Real API/database coverage comes from server integration tests and the dedicated real Lab 3/Lab 4 suites. No student or peer execution is claimed.

## Failures investigated and corrections

1. Staff metric links used an `aria-label` containing only their title, hiding the visible numeric count from the accessible name. A new rendered-component test failed before the fix (`output/lab4-hardening-style-red.txt`). Links now expose both title and value; the complete client suite and affected real dashboard browser scenarios passed afterward.
2. The historical browser configuration discovered dedicated Lab 4 scenarios and depended on working application ports. It now excludes dedicated suites and starts the existing isolated real test API on 3006 and frontend on 5176.
3. Older browser fixtures referenced the removed development identity selector, omitted the Actions Taken paginated response, expected Admin controls to be hidden, and looked for an outdated status-history heading. Fixtures now use real sign-in where appropriate and the documented Lab 4 permissions/response shape. Required-field, validation, draft retention, attachments, privacy and operational assertions remain covered. The final historical suite passed all 18 scenarios.
4. An overlapping Playwright invocation removed a different run's shared trace directory, producing one artifact failure after 13 passing Lab 3 scenarios. Separate output directories fixed this harness issue; the complete real Lab 3 rerun passed 14/14. A port-busy startup was also rejected before retrying sequentially. These were not product regression passes.

## AC traceability and remaining gates

The Test-ID-to-file mapping remains in [tests.md](tests.md). The fresh complete server/client runs include the implemented tests below; browser evidence supplements them where listed.

| Acceptance criteria | Evidence | Current status |
| --- | --- | --- |
| AC-01, AC-02, AC-03, AC-04 | Actions Taken API/unit/UI, authorization matrix; real action lifecycle and role browser scenarios | Automated checks passed |
| AC-05, AC-06 | Ticket workflow API/UI; real ticket-resolution browser scenarios and earlier workflow regressions | Automated checks passed |
| AC-07 | Real action/workflow concurrency, retry and account-change integration tests | Automated checks passed |
| AC-08 | Additive migration, preservation, repeatable seed and isolated recovery integration tests | Automated checks passed |
| AC-09 | Requester dashboard independent SQL, owner/date boundaries and real drill-down browser scenarios | Automated checks passed |
| AC-10, AC-11 | Staff dashboard and drill-down API/independent SQL; real navigation/filter/refresh scenarios | Automated checks passed |
| AC-12 | Actions Taken UI and real form/lifecycle scenarios, including failure/conflict/drafts | Automated checks passed |
| AC-13 | UI state tests, accessible metric-name regression, responsive browser scenarios and screenshot inspection below | Automated preparation passed; student visual inspection/corrections pending |
| AC-14 | Full Labs 1-4 server/client regression, 18 historical browser and 14 real Lab 3 browser scenarios | Automated checks passed; fixture changes explained above |
| AC-15 | Fresh dashboard performance integration results below | Lab smoke budget passed |
| AC-16 | Peer review, release, final-main evidence, completed documents and one nine-part PDF | Pending #63 student gate and subsequent #64/release work |

## Performance smoke results

Each dashboard used 1,000 Tickets, 3,000 Actions, five warm-up requests and 30 sequential measured requests. The documented budget is p95 <=1,000 ms and <=10 dashboard data reads; authentication reads are excluded from that count.

| Dashboard | p95 | Data reads | Evidence |
| --- | --- | --- | --- |
| Staff | 69.3023 ms | 4 | `output/lab4-dashboard-performance.json` |
| Requester | 20.0464 ms | 2 | `output/lab4-requester-performance.json` |

These are local lab smoke measurements, not production load or concurrent-user guarantees. Dataset/query-plan interpretation is documented in the separate dashboard evidence records.

## Preview and visual preparation

`npm run preview:lab4` seeds its own disposable schema, starts the branch on http://localhost:5178 and provides real sessions for Requester, Staff and Admin. See [ui-review.md](ui-review.md) for all six accounts and restart steps.

The assistant captured 11 role/page combinations at four sizes (44 captures): desktop 1440x900, tablet 834x1112, mobile 390x844 and 720x450 CSS reflow. Pages include dashboards, lists, detail, Requester creation and Admin users. The audit observed no page errors or horizontal page overflow. The 720x450 check approximates reduced CSS space at 200% zoom; it is not an actual browser-zoom test.

Selected desktop and mobile contact sheets were visually inspected. Metric-link foreground/background contrast measured at least 8.4266:1; this measures those metric texts only, not full-product accessibility certification. Long mobile detail/dashboard pages, wording, spacing, card density and real browser zoom still need student inspection. Existing action/dialog and workflow screenshots supplement these page captures.

- Screenshots: `artifacts/lab-04/screenshots/hardening/`.
- Local gallery: `output/lab4-ui-review.html`.
- Audit command: `node output/lab4-preview-audit.cjs` (local ignored evidence helper).
- Audit results: `output/lab4-preview-audit.json`, `output/lab4-preview-audit.txt`.

Generated artifacts are intentionally local and are not committed. The final report package is not complete. Any requested UI corrections will be made on this same Issue branch with affected checks rerun before student confirmation and peer handoff.

## Student UI feedback: status presentation, 2026-09-29

The student supplied a Queue screenshot showing status text split over several lines and requested improved desktop/mobile presentation. On the same #63 branch, the assistant changed shared status styling, Queue column sizing/card status rows, and the narrow My Tickets layout. Staff dashboard and Actions Taken badges now include their actual status attribute, and creation feedback uses readable status text. Backend behavior is unchanged.

- Client suite: 19 files, 116 passed ('output/status-polish-client.txt').
- Historical browser suite: 18 passed ('output/status-polish-e2e.txt'), including mobile Requester creation/list/detail and Staff Queue/operations. Mocked cases retain the limits stated above.
- Client/server build passed ('output/status-polish-build.txt'); whitespace check passed.
- Preview audit: 66 captures across 11 role/page combinations at 1366, 1024, 834, 720, 390 and 320 CSS-pixel widths. No page errors, horizontal page overflow or clipped/offscreen visible status text were detected. Narrow desktop tables may scroll within their container. The 720px case remains a reflow approximation, not actual browser zoom.
- Assistant visually inspected desktop Queue and mobile Queue/My Tickets, including a full waiting-status card at 320px. Screenshots: 'artifacts/lab-04/screenshots/status-polish/'; detailed audit: 'output/status-polish-audit.json'. Generated outputs remain ignored.

These are UI-branch checks, not final-main results. Student inspection/confirmation is still pending; #63 remains Started with no peer handoff.
