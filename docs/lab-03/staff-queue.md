# Lab 3 Staff Ticket Queue — Issue #37

The Queue now reads all Tickets for authenticated IT Staff and Admin. Requesters
cannot use either Queue or assignee endpoints. Admin retains read-only Ticket
access under the student's confirmed permission decision.

Search matches Ticket number, summary and requester name without case sensitivity;
SQL wildcard characters are literal. Filters cover all eight statuses, both
priorities, active category/system references and eligible owners, including Me
and Unassigned. Unfiltered results retain historical inactive owners.

Ordering is allowlisted, with a same-direction ID tie-breaker. IT priority follows
LOW/MEDIUM/HIGH urgency order. Pagination accepts 10/25/50 rows, rejects unsafe
offsets and returns rows/count from one repeatable-read database transaction.
Unknown, repeated, nested, invalid and forged identity query controls are rejected.

Desktop uses a table; tablet/mobile use labelled cards. Loading, empty,
no-results, unavailable and retry states retain usable controls. Ticket links
open the existing URL-backed Detail, including reload and return navigation.
This increment hides upload/removal for Staff/Admin; Staff mutation controls
belong to #38. Comments/internal notes belong to #39 and Users to #40.

## Reproduce verification

Use only the allowlisted isolated database described in tests.md. API fixtures
create and remove their own schemas; do not reset or seed the working database.

```powershell
$env:TEST_DATABASE_URL='postgresql://toktickit:toktickit@localhost:5432/toktickit_lab3_test?schema=public'
npm test --workspace server -- --maxWorkers=1
npm test --workspace client -- --maxWorkers=1
npm run build
npm run prisma:validate
npx playwright test --config playwright.queue.config.ts
```

The dedicated Playwright configuration runs installed Chrome at 1440x900,
834x1112 and 390x844, starts Vite on port 5175, and mocks API fixtures. It verifies
responsive table/card visibility, page overflow, no-results/failure/retry,
read-only Detail navigation and reload. It is a browser UI integration check,
not real login/database end-to-end evidence.

Generated screenshots: `artifacts/lab-03/screenshots/staff-queue/{desktop,tablet,mobile}/queue.png`.
These ignored local artifacts can be regenerated. Screenshot capture and DOM
assertions passed; manual image inspection could not be completed in this tool
session and remains pending with the broader visual checklist in ui-spec.md.
Real authenticated E2E and final-main evidence remain assigned to the later audit.
