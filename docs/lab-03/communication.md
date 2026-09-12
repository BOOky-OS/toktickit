# Ticket communication and resolution indication — Issue #39

Ticket Detail now has independent Public Comments and Internal Notes streams.
The owning Requester reads/posts public comments; IT Staff reads/posts both;
Admin reads both without composers. Requester UI does not mount or fetch Notes.
Backend authorization denies Requester Notes access before exposing existence,
content or counts. Shared Ticket serializers continue to exclude note fields.

Messages are append-only. The backend derives author and time, rejects forged
fields, trims content and enforces 1–2000 public / 1–4000 internal UTF-16 code
units. Reads order by createdAt then ID, expose the author's current name/role,
and omit storage/internal metadata. React renders content as literal text with
line breaks. Closed/Cancelled Tickets remain readable but reject new entries.

Appends revalidate session/role under the shared security lock and lock the
Ticket before checking ownership/status. Entry creation and Ticket version
increment commit together. Independent concurrent messages may both succeed.
There is no claimed message idempotency: uncertain errors retain the draft and
require reloading the stream before the user manually decides whether to retry.
Public and internal drafts never share state; posting one clears only that draft.

The owning Requester can confirm **Problem Appears Resolved** in New, Open,
In Progress, Waiting for Requester or Reopened. The action checks the current
version, sets the indication timestamp once and advances version on change.
It does not change formal status, owner or status history. Current-version
repeats are no-ops; stale versions conflict. Existing Staff reopening logic clears
the indication. Staff/Admin see its timestamp in the shared Detail fields.

## Reproduce checks

Use the isolated TEST_DATABASE_URL described in tests.md; never reset the working DB.

```powershell
npm test --workspace server -- --maxWorkers=1
npm test --workspace client -- --maxWorkers=1
npm run build
npm run prisma:validate
npx playwright test --config playwright.communication.config.ts
```

New real PostgreSQL API suites cover role/ownership boundaries, direct Notes
denial, serializer privacy, content/forged-field checks, terminal/append-only
rules, concurrent appends, rollback, indication states, no-op/stale behavior and
concurrent indications. Component tests cover independent drafts, literal text,
role visibility, terminal controls, uncertain retries and confirmation/reload.

Chrome tests at 1440x900, 834x1112 and 390x844 use explicit mocked APIs to verify
Staff/Admin/Requester layouts, public/internal separation, uncertain retry,
confirmation Escape/focus and unchanged formal status after indication.
Local screenshots: `artifacts/lab-03/screenshots/communication/{desktop,tablet,mobile}/`
with `staff.png` and `requester.png`. These captures and DOM assertions are not
manual visual inspection or real authenticated database E2E; those remain in
the final audit. Actual command results are recorded in tests.md.

User administration remains #40. Peer review, reviewer merge, completed-document
confirmation and final-main checks remain pending. No working database migration,
reset, seed or provisioning was performed.
