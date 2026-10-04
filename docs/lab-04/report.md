# TokTickIT - Lab 4 review draft

Supapanya Yathip | 67070503443 | BOOky-OS

Prepared 2026-09-30; review record updated 2026-10-04 after documentation PR #71. Documentation integration baseline: e2f9979; application/test baseline: e484d28. The student accepted the edited documents and reflection on 2026-10-04. The student also approved proceeding to main on 2026-10-04 with no further document changes. This remains a pre-release report; release/main test output and final Project evidence remain pending.

## Answer Part 1

### Git use and engineering workflow

The work uses individual Issue branches into lab4-staging. Atip-Infa reviewed and merged PR #57 and #65-#71. The contract was merged before the implementation PRs. #64 is the only active work package. Documentation PR #71 is approved and merged; release preparation remains active. The final all-Done Project and main release history cannot yet be supplied.

[Repository](https://github.com/BOOky-OS/toktickit) | [Project](https://github.com/users/BOOky-OS/projects/2) | [Staging history](https://github.com/BOOky-OS/toktickit/commits/lab4-staging/) | [Full reviewer record](reviewer.md)

{{excerpt:reviewer.md:**Author:## Contents}}

{{excerpt:reviewer.md:## Pull Requests I authored:## Review comments I received and how I responded}}

{{excerpt:reviewer.md:### PR #71 - Documentation:## Reciprocal reviews}}

README includes application/test setup, the disposable preview, migration/recovery and release links. `.gitignore` excludes dependencies, environment secrets, build files, screenshots, output and test artifacts. The PDF remains local for submission rather than being committed.

```text
client/src/                  React application
client/tests/lab-01..04/     UI and component tests
server/src/                  API, authorization and business rules
server/prisma/               schema, migrations and guarded seeds
server/tests/lab-01..04/     unit, API and integration tests
e2e/lab-02..04/             browser tests
docs/lab-04/                contract, evidence and release documentation
artifacts/lab-04/           ignored screenshots
output/pdf/                ignored generated report
```

{{excerpt:reviewer.md:## Reciprocal reviews:### Reciprocal review comments and partner responses}}

The [complete reciprocal review record](reviewer.md#reciprocal-review-comments-and-partner-responses) contains all ten exact review comments, partner replies before/after merge, review/comment permalinks, approved SHAs and merge SHAs.

### Required final updates

Add the verified release PR and main merge SHA, and final all-Done board evidence after the real release events occur. Reciprocal-review evidence is now recorded for all ten partner PRs. Existing PR comments/replies are linked in reviewer.md and must not be replaced by example approvals.

## Answer Part 2

### Specification driven development

[Complete engineering contract](specification.md) | [API contract](api-spec.md). The contract PR #57 was merged on 2026-09-24 at b45c4f0, before foundation PR #65 was merged at 3c303e6. Later refinements are recorded in the same contract and implementation evidence.

Rendered excerpts below show numbered requirements, workflow and completion criteria. The Definition of Done is the original contract checklist, not a claim that release is complete; current completion status is in release.md. The full linked specification includes 25 numbered business rules, exact dashboard queries, the authorization matrix, four database decisions, migration and recovery.

{{excerpt:specification.md:## 4. Functional Requirements:## 5. Business Rules}}

{{excerpt:specification.md:### Ticket workflow:### Concurrency, migration and safe failure}}

{{excerpt:specification.md:## 9. Acceptance Criteria:## 11. Assumptions and Decisions}}

## Answer Part 3

### Test driven development and traceability

[Full test plan](tests.md) | [Hardening evidence](hardening-evidence.md) | [Current release evidence](release.md). All counts are assistant-run unless explicitly attributed otherwise. Peer approval reviewed the reported results; the peer did not independently rerun the suites.

{{excerpt:tests.md:## 3.:## 4. Existing regression}}

Representative real paths include `server/tests/lab-04/actions-taken.api.test.ts`, `ticket-workflow.api.test.ts`, `requester-dashboard.api.test.ts` and `staff-dashboard.api.test.ts`; `client/tests/lab-04/ActionsTaken.test.tsx`, `TicketWorkflow.test.tsx`, `StaffDashboard.test.tsx` and `RequesterDashboard.test.tsx`; and `e2e/lab-04/actions-taken-flow.spec.ts`, `ticket-resolution.spec.ts`, `dashboards.spec.ts` and `requester-dashboard.spec.ts`.

The linked plan lists each Test ID, expected outcome, file and AC. Real database tests cover persistence, concurrency, migration/recovery, role/ownership and independent dashboard queries. Component tests and historical mocked browser scenarios provide narrower UI evidence. TDD red/green examples and actual failures are recorded in each feature evidence file; the foundation is not claimed as strictly test-first.

{{excerpt:release.md:## Evidence register:## Completion gates}}

Final-main output is pending release. The final submission must embed the complete passing main test output, actual SHA/environment and final AC statuses here; staging evidence cannot substitute for it.

## Answer Part 4

### AI use and reflection

[Complete AI-use record](ai-use.md). The following prompt table is rendered from the source. Critical-thinking examples include detecting incomplete Project metadata, rejecting an unnecessary validator, fixing keyboard focus and filter preservation, and requiring student UI/document review gates.

{{excerpt:ai-use.md:LLM/agent used:## My Reflection}}

{{excerpt:ai-use.md:## My Reflection:END}}

## Answer Part 5

### Working IT Staff Dashboard

[Dashboard evidence](staff-dashboard-evidence.md) | [Calculations and rules](specification.md). Staff/Admin see unassigned Tickets, their owned Tickets, pending actions, status/priority distributions and recent/urgent work. Metric links preserve defined filters and open Queue or Ticket Detail.

Independent database queries exercise counts, mixed ownership, zero cases and date boundaries. Browser scenarios exercise loading, safe failure/retry, forbidden access, refresh/back navigation and responsive cards. My pending actions counts actions; its drill-down lists distinct Tickets, so these counts intentionally differ.

![Staff dashboard - desktop, reviewed UI code a36b6ac](../../artifacts/lab-04/screenshots/ui-review/staff-dashboard-desktop.png)

![Staff dashboard - tablet, Chromium viewport](../../artifacts/lab-04/screenshots/ui-review/staff-dashboard-tablet.png)

![Staff dashboard - mobile, Chromium viewport](../../artifacts/lab-04/screenshots/ui-review/staff-dashboard-mobile.png)

## Answer Part 6

### Working Actions Taken UI

[Actions UI evidence](actions-ui-evidence.md) | [Foundation evidence](foundation-evidence.md). One Ticket contains multiple independently assigned actions. The authenticated recorder is automatic; the Ticket Owner remains separate from the action assignee.

Staff/Admin can create, edit, start, complete and cancel eligible work. Completion requires its result and required follow-up note. Terminal action revisions are retained. Requesters see permitted data read-only; inactive or invalid assignees are rejected by the backend. Validation, stale updates, retry safety and cancellation keyboard focus are covered by component/API/real-browser tests.

The following screenshots were refreshed by the passing real Lab 4 browser suite on 2026-09-30 at staging code e484d28. The list crop shows one action; multiple-action scenarios are covered by the linked tests. Final-main screenshots must be refreshed after release.

![Actions list - desktop, current action on its parent Ticket](../../artifacts/lab-04/screenshots/actions-taken/desktop/list.png)

![Create action - tablet](../../artifacts/lab-04/screenshots/actions-taken/tablet/create.png)

![Cancel action - mobile](../../artifacts/lab-04/screenshots/actions-taken/mobile/cancel.png)

## Answer Part 7

### Working Ticket workflow

[Workflow evidence](workflow-evidence.md). The backend enforces every allowed/rejected pair in the contract matrix. Requester resolution indications remain advisory. A current-cycle completed action is required for resolution; pending work blocks it. Reopening starts a new work cycle. Public status history remains append-only and stable, and private operational information remains role protected.

Direct API and concurrency scenarios verify that bypassing the UI cannot bypass the gates. Real browser tests exercise blocked transitions, confirmations, reopen behavior and keyboard containment. The linked evidence separates requester-visible history from internal notes and action revision details.

![Workflow blocked feedback - desktop](../../artifacts/lab-04/screenshots/ticket-workflow/desktop/blocked.png)

![Workflow confirmation - tablet](../../artifacts/lab-04/screenshots/ticket-workflow/tablet/confirmation.png)

![Workflow confirmation - mobile](../../artifacts/lab-04/screenshots/ticket-workflow/mobile/confirmation.png)

## Answer Part 8

### Requester Dashboard and regression

[Requester evidence](requester-dashboard-evidence.md) | [Regression plan](tests.md). Requester dashboard metrics and recent rows are scoped to the signed-in requester. Independent SQL checks verify mixed ownership and date boundaries; API/browser scenarios reject another requester's data and unauthorized operational actions.

Regression covers sign in/session/password change, My Tickets, creation/detail, attachments, public comments, Staff operations, private notes and Admin users. Historical mocked suites are retained alongside real Lab 3/Lab 4 browser suites. Final-main verification remains pending.

![Requester dashboard - desktop](../../artifacts/lab-04/screenshots/ui-review/requester-dashboard-desktop.png)

![Requester dashboard - tablet](../../artifacts/lab-04/screenshots/ui-review/requester-dashboard-tablet.png)

![Requester dashboard - mobile](../../artifacts/lab-04/screenshots/ui-review/requester-dashboard-mobile.png)

## Answer Part 9

### Zen Green UI, responsive behavior and accessibility

[Full UI specification and checklist](ui-spec.md) | [Cross-page audit](ui-audit.md). The student requested corrections to status chips, date-filter controls, navigation, dashboards, sign in/password change, Users and Queue, then accepted the UI before PR #70.

The audit includes 144 captures across desktop, tablet and narrow/mobile Chromium viewports. Checks include geometry/overflow, labels, status text, focus and keyboard/dialog behavior. Selected captures were inspected visually; physical devices, Safari/iOS, virtual keyboards and a complete screen-reader audit were not verified. A 720px capture approximates reflow and is not proof of actual browser 200% zoom.

{{excerpt:ui-spec.md:## 8. Planned visual evidence checklist:## Issue #63 student inspection}}

![Admin dashboard - desktop](../../artifacts/lab-04/screenshots/ui-review/admin-dashboard-desktop.png)

![Ticket Queue - tablet](../../artifacts/lab-04/screenshots/ui-review/staff-list-tablet.png)

![Admin Users - mobile](../../artifacts/lab-04/screenshots/ui-review/admin-users-mobile.png)

Additional account, creation, list, detail and administration captures are available in the local output/ui-review-gallery.html. Report crops are labelled; the gallery retains their complete source images. Generated screenshots remain outside Git. Regenerate the final report after release so captions, checklist, commit and main test results remain consistent.
