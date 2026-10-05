# TokTickIT - Lab 4 post-release evidence review

Supapanya Yathip | 67070503443 | BOOky-OS

Updated 2026-10-05 after Atip-Infa approved and merged PR #73. All six checks passed freshly on integrated main `50b84924de3c265a9ae587257afea92d52b22a1c`. Actual peer reviews, author responses, accepted student gates and final-main output are recorded. This is the final completion-record review draft; final tracked-document integration and final Project/PDF completion remain pending.

## Answer Part 1

### Git use and engineering workflow

The work uses individual Issue branches into lab4-staging. Atip-Infa reviewed and merged eight staging PRs, then approved and merged release PR #72 and evidence/preview PR #73 into main. The contract was merged before implementation. Issue #64 remains open for integration of this completion record and the final submission audit. Main commit history is linked below; the final all-Done Project is pending those completion gates.

[Repository](https://github.com/BOOky-OS/toktickit) | [Project](https://github.com/users/BOOky-OS/projects/2) | [Staging history](https://github.com/BOOky-OS/toktickit/commits/lab4-staging/) | [Main history](https://github.com/BOOky-OS/toktickit/commits/main/) | [Full reviewer record](reviewer.md)

{{excerpt:reviewer.md:**Author:## Contents}}

{{excerpt:reviewer.md:## Pull Requests I authored:## Review comments I received and how I responded}}

{{excerpt:reviewer.md:### PR #72 - Main release:## Reciprocal reviews}}

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

### Final completion record

Release PR #72 and evidence PR #73 are peer-approved and merged. Fresh checks on integrated main 50b8492 passed on 2026-10-05. PR #73 is Done; #64 stays open until the completion record and final submission evidence pass. The live Project and Issue are authoritative for current workflow state. Reciprocal-review evidence is now recorded for all ten partner PRs. Existing PR comments/replies are linked in reviewer.md and must not be replaced by example approvals.

![Live Project before final Issue completion - 2026-10-05; seven Lab 4 Issues Done, #64 Started](../../output/playwright/lab4-project-before-completion.png)

## Answer Part 2

### Specification driven development

[Complete engineering contract](specification.md) | [API contract](api-spec.md). The contract PR #57 was merged on 2026-09-24 at b45c4f0, before foundation PR #65 was merged at 3c303e6. Later refinements are recorded in the same contract and implementation evidence.

Rendered excerpts below show numbered requirements, workflow and completion criteria. The Definition of Done records observed product checks while keeping final document/Project/submission completion unchecked; current evidence is in release.md. The full linked specification includes 25 numbered business rules, exact dashboard queries, the authorization matrix, four database decisions, migration and recovery.

{{excerpt:specification.md:## 4. Functional Requirements:## 5. Business Rules}}

{{excerpt:specification.md:## 5. Business Rules:## 6. UI Specification Summary}}

{{excerpt:specification.md:## 7. Data Changes:## 8. API Contract}}

{{excerpt:specification.md:## 9. Acceptance Criteria:## 11. Assumptions and Decisions}}

## Answer Part 3

### Test driven development and traceability

[Full test plan](tests.md) | [Hardening evidence](hardening-evidence.md) | [Current release evidence](release.md). All counts are assistant-run unless explicitly attributed otherwise. Peer approval reviewed the reported results; the peer did not independently rerun the suites.

{{excerpt:tests.md:## 2. Planned automated tests:## 4. Existing regression}}

Representative real paths include `server/tests/lab-04/actions-taken.api.test.ts`, `ticket-workflow.api.test.ts`, `requester-dashboard.api.test.ts` and `staff-dashboard.api.test.ts`; `client/tests/lab-04/ActionsTaken.test.tsx`, `TicketWorkflow.test.tsx`, `StaffDashboard.test.tsx` and `RequesterDashboard.test.tsx`; and `e2e/lab-04/actions-taken-flow.spec.ts`, `ticket-resolution.spec.ts`, `dashboards.spec.ts` and `requester-dashboard.spec.ts`.

The linked plan lists each Test ID, expected outcome, file and AC. Real database tests cover persistence, concurrency, migration/recovery, role/ownership and independent dashboard queries. Component tests and historical mocked browser scenarios provide narrower UI evidence. TDD red/green examples and actual failures are recorded in each feature evidence file; the foundation is not claimed as strictly test-first.

{{excerpt:release.md:## Evidence register:## Completion gates}}

The complete suites passed freshly on integrated main 50b8492. The preview shutdown URL-restoration correction was tested separately and approved/merged through PR #73; earlier first-release results remain historical (see release.md). The complete passing main output is rendered below. Every log records the actual tested SHA, exact command, UTC time and exit code. Staging results remain separately labelled historical.

### npm test

{{log:release-final-main-unit-api.txt}}

### npm run test:e2e

{{log:release-final-main-browser.txt}}

### npm run test:e2e:lab3

{{log:release-final-main-browser3.txt}}

### npm run test:e2e:lab4

{{log:release-final-main-browser4.txt}}

### npm run build

{{log:release-final-main-build.txt}}

### npm run prisma:validate

{{log:release-final-main-prisma.txt}}

## Answer Part 4

### AI use and reflection

[Complete AI-use record](ai-use.md). The following prompt table is rendered from the source. Critical-thinking examples include detecting incomplete Project metadata, rejecting an unnecessary validator, fixing keyboard focus and filter preservation, and requiring student UI/document review gates.

{{excerpt:ai-use.md:LLM/agent used:## My Reflection}}

{{excerpt:ai-use.md:## My Reflection:END}}

## Answer Part 5

### Working IT Staff Dashboard

[Dashboard evidence](staff-dashboard-evidence.md) | [Calculations and rules](specification.md). Staff/Admin see unassigned Tickets, their owned Tickets, pending actions, status/priority distributions and recent/urgent work. Metric links preserve defined filters and open Queue or Ticket Detail.

Independent database queries exercise counts, mixed ownership, zero cases and date boundaries. Browser scenarios exercise loading, safe failure/retry, forbidden access, refresh/back navigation and responsive cards. My pending actions counts actions; its drill-down lists distinct Tickets, so these counts intentionally differ.

![Staff dashboard - desktop, main 50b8492](../../artifacts/lab-04/screenshots/staff-dashboard/desktop/populated.png)

![Staff dashboard - tablet, main 50b8492](../../artifacts/lab-04/screenshots/staff-dashboard/tablet/populated.png)

![Staff dashboard - mobile, main 50b8492](../../artifacts/lab-04/screenshots/staff-dashboard/mobile/populated.png)

## Answer Part 6

### Working Actions Taken UI

[Actions UI evidence](actions-ui-evidence.md) | [Foundation evidence](foundation-evidence.md). One Ticket contains multiple independently assigned actions. The authenticated recorder is automatic; the Ticket Owner remains separate from the action assignee.

Staff/Admin can create, edit, start, complete and cancel eligible work. Completion requires its result and required follow-up note. Terminal action revisions are retained. Requesters see permitted data read-only; inactive or invalid assignees are rejected by the backend. Validation, stale updates, retry safety and cancellation keyboard focus are covered by component/API/real-browser tests.

The following screenshots were refreshed by the passing real Lab 4 browser suite on 2026-10-05 at integrated main 50b8492. The list crop shows one action; the additional main-preview capture below shows multiple actions, statuses and performers on the same Ticket. These captures use isolated browser fixtures on the verified main commit.

![Actions list - desktop, current action on its parent Ticket](../../artifacts/lab-04/screenshots/actions-taken/desktop/list.png)

![Create action - tablet](../../artifacts/lab-04/screenshots/actions-taken/tablet/create.png)

![Cancel action - mobile](../../artifacts/lab-04/screenshots/actions-taken/mobile/cancel.png)

![Action 5 on TKT-2026-000003 - main application code 6d2b37d, isolated preview](../../artifacts/lab-04/screenshots/main-evidence/action-one.png)

![Action 6 on the same TKT-2026-000003 - different performer and status](../../artifacts/lab-04/screenshots/main-evidence/action-two.png)

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

Regression covers sign in/session/password change, My Tickets, creation/detail, attachments, public comments, Staff operations, private notes and Admin users. Historical mocked suites are retained alongside real Lab 3/Lab 4 browser suites. Fresh final-main checks passed on 50b8492 on 2026-10-05.

![Requester dashboard - desktop, main 50b8492](../../artifacts/lab-04/screenshots/requester-dashboard/desktop/populated.png)

![Requester dashboard - tablet, main 50b8492](../../artifacts/lab-04/screenshots/requester-dashboard/tablet/populated.png)

![Requester dashboard - mobile, main 50b8492](../../artifacts/lab-04/screenshots/requester-dashboard/mobile/populated.png)

### Regression screens captured from main

The following captures were refreshed by the passing real Lab 3 browser suite on main 50b8492 on 2026-10-05. API/browser output above also verifies attachment bytes, public/private communication and role restrictions. The full-page mobile captures retain more content than the report crops.

![Sign in - main 50b8492](../../artifacts/lab-03/screenshots/real/login-region.png)

![Mandatory password change - main 50b8492](../../artifacts/lab-03/screenshots/real/mandatory-password-region.png)

![Requester creation - main 50b8492](../../artifacts/lab-03/screenshots/real/requester-create-tablet.png)

![Requester Ticket description - main 50b8492](../../artifacts/lab-03/screenshots/real/requester-detail-region.png)

![Staff operations - main 50b8492](../../artifacts/lab-03/screenshots/real/staff-detail-region.png)

![Admin user editing - main 50b8492](../../artifacts/lab-03/screenshots/real/admin-edit-reset-region.png)

## Answer Part 9

### Zen Green UI, responsive behavior and accessibility

[Full UI specification and checklist](ui-spec.md) | [Cross-page audit](ui-audit.md). The student requested corrections to status chips, date-filter controls, navigation, dashboards, sign in/password change, Users and Queue, then accepted the UI before PR #70.

The audit includes 144 captures across desktop, tablet and narrow/mobile Chromium viewports. Checks include geometry/overflow, labels, status text, focus and keyboard/dialog behavior. Selected captures were inspected visually; physical devices, Safari/iOS, virtual keyboards and a complete screen-reader audit were not verified. A 720px capture approximates reflow and is not proof of actual browser 200% zoom.

{{excerpt:ui-spec.md:## 8. Planned visual evidence checklist:## Issue #63 student inspection}}

![Admin dashboard - desktop](../../artifacts/lab-04/screenshots/ui-review/admin-dashboard-desktop.png)

![Ticket Queue - tablet](../../artifacts/lab-04/screenshots/ui-review/staff-list-tablet.png)

![Admin Users - mobile](../../artifacts/lab-04/screenshots/ui-review/admin-users-mobile.png)

Additional account, creation, list, detail and administration captures are available in the local output/ui-review-gallery.html. Report crops are labelled; the gallery retains their complete source images. Generated screenshots remain outside Git. Main tests and refreshed Lab 3/Lab 4 captures are recorded above. After the documentation follow-up, recheck latest main and capture the final all-Done Project before producing the submission copy.
