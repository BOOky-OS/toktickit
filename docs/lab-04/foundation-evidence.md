# Issue #58 foundation evidence

Date: 2026-09-24. Assistant-run checks on `feature/58-actions-foundation`, based on peer-merged staging `b45c4f057a06ee400c9b7b249561e027de785663`. These are feature-branch results, not peer-run, staging-release or final-main results.

## Environment and commands

Windows PowerShell; Node 24.19.0; Prisma 5.22.0; Vitest 4.1.10; PostgreSQL 16.13 in the dedicated Docker container `toktickit-lab4-test`, bound to localhost:5544. Each suite owns a random schema in the allowlisted `toktickit_lab3_test` database. The working database and uploads were not migrated or reset. See [setup/recovery instructions](migration.md).

| Check | Observed result | Local ignored evidence |
| --- | --- | --- |
| `npm test`, initial combined run | Client: 13 files / 82 tests passed. Server: 8 files failed, 7 tests failed, 257 passed, 225 skipped after setup failures; shared-lock contention and timeouts required fixing the test runner. Not a passing combined run. | `output/lab4-tests.txt` |
| `npm run test --workspace server`, after runner correction | 34 files / 489 tests passed, no skips, 197.18 seconds; includes 43 Lab 4 cases and prior regression. | `output/lab4-server-tests.txt` |
| `npm run test --workspace server -- tests/lab-04/actions-taken.api.test.ts tests/lab-04/seed.integration.test.ts` | 2 files / 25 tests passed, no skips, 16.29 seconds; checks latest ID handling and CLI seed change. | `output/lab4-final-targeted.txt` |
| `npm run build` | Client and server passed; server build passed again after final corrections. | Terminal execution |
| `npm run prisma:validate` | Passed. | Terminal execution |
| `git diff --check` | Passed before implementation commit. | Terminal execution |

Runtime results describe the source checked in this increment. The full regression preceded the final small ID/seed CLI corrections; the affected suites and server build are rerun after those corrections. The evidence commit adds documentation only. No browser, responsive, performance or final-main pass is claimed.

## Coverage of #58

| Test ID | Implemented evidence |
| --- | --- |
| UNIT-01 | `server/tests/lab-04/action-validation.unit.test.ts`: required fields, text boundaries, explicit-offset/calendar dates, IDs/paging and confirmation/reasons. All 16 state pairs are exercised against PostgreSQL in actions-taken.api.test.ts. |
| API-01/02/03 | `server/tests/lab-04/actions-taken.api.test.ts`: creator/assignee/owner separation, safe DTO, revisions and captured names, lifecycle/terminal restrictions, completion/follow-up, inactive assignment cancellation, spoofing, dates, stale/no-op edits, receipts, paging and cross-parent/history access. |
| AUTH-01/02 | `server/tests/lab-04/authorization.api.test.ts`: real HTTP login, role/ownership/CSRF, missing headers, expired/revoked/forced sessions, assignment guard and assignment/deactivation race. Existing Lab 3 matrix/comments/staff suites verify the approved Admin extensions while preserving Requester-only restrictions. |
| CON-01 | `server/tests/lab-04/concurrency.integration.test.ts`: simultaneous identical create/status retries, changed method/path/payload conflicts, competing edits and an injected receipt-write failure with atomic rollback. |
| MIG-01 | `server/tests/lab-04/migration.integration.test.ts`: pre-Lab-4 rows, identities, credentials, sessions, file hashes, FKs and sequence values survive; zero invented actions; drift check; failed DDL rolls back. Earlier Lab 2 -> current migration regression also passes. |
| SEED-01 | `server/tests/lab-04/seed.integration.test.ts`: local opt-in guard, all specified fixture scenarios, repeat seed preserves profile/password/action edits and revisions; CLI rerun checked separately after the final CLI correction. |
| DB-01 | `server/tests/lab-04/recovery.integration.test.ts`: actual pg_dump/psql restore into a different owned schema and attachment-backup hash comparison. Database allowlist and owned-schema cleanup guards are also inspected in the fixture helper. |

The assignment/deactivation portion of CON-02 is covered here. Resolve/cancel races depend on the final gates in #60 and remain planned. UI/real browser acceptance portions of AC-01..04 remain for #59/hardening; passing the backend foundation does not complete all product ACs.

## Failures found and corrected

1. The first Actions API run had 25 passing and one failing test: page=2 was rejected by the old global query guard. Explicitly permit Actions/history read paging while retaining unknown/repeated-field rejection. The subsequent Lab 4 run passed.
2. The initial full server run competed across otherwise isolated schemas for database-wide advisory lock 334003. Authentication transactions failed/timed out while unrelated suites held the same lock. Configure server suites to run serially; Promise.all concurrency tests still send simultaneous requests inside a suite. Keep application transaction limits unchanged. The complete server rerun passed.
3. Final inspection found that safe integer IDs can exceed PostgreSQL Int storage and that Prisma's internal .env loading does not populate process.env for the seed guard. Handle unavailable large IDs safely and load server/.env explicitly at the seed CLI entry point, preserving shell overrides. Rerun affected tests and build.

The initial implementation preceded its first new test run; this is not recorded as a strict test-first cycle. No tests were disabled to obtain a pass. Logs remain under ignored output/ as requested; no Python validator was reintroduced.

## Remaining scope

Actions UI (#59), final Ticket resolution/cancel gates (#60), dashboards (#61/#62), product hardening (#63), student reflection/reciprocal review, final report and main release (#64). Atip-Infa must review and merge this increment into lab4-staging before #59 begins. The Project-wide listing discrepancy remains documented separately in [workflow.md](workflow.md).
