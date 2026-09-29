# Lab 4 Workflow and Audit

## Current handoff status (2026-09-29)

Student explicitly confirmed UI completion and authorized the #63 PR in chat on 2026-09-29 after reviewing corrections through a36b6ac. The UI gate is satisfied; peer approval/merge, #64 document review and the separate pre-main gate remain pending. Earlier preparation entries below are dated history.

Current work: Issue #63, feature/63-final-hardening -> lab4-staging, based on peer merge 26cf6e3. Student UI approval is recorded; preparing the #63 peer-review handoff. Prerequisite #62 / PR #69 is approved/merged by Atip-Infa, Issue closed and both Project items Done.
Prerequisite #58 / PR #65 is approved and peer-merged at `3c303e6`; Issue #58 and PR #65 items are Done. Author replies already exist; no duplicates are needed.
Author: BOOky-OS. Student-confirmed peer: Atip-Infa. Main remains the eventual submission branch.

## Eight accepted work packages

| Order | Issue | Work | Dependency | Branch when work begins |
| --- | --- | --- | --- | --- |
| 1 | [#56](https://github.com/BOOky-OS/toktickit/issues/56) | Engineering contract | Lab 3 baseline | docs/56-lab4-contract |
| 2 | [#58](https://github.com/BOOky-OS/toktickit/issues/58) | Actions foundation | #56 Done | feature/58-actions-foundation |
| 3 | [#59](https://github.com/BOOky-OS/toktickit/issues/59) | Actions UI | #58 Done | feature/59-actions-ui |
| 4 | [#60](https://github.com/BOOky-OS/toktickit/issues/60) | Ticket workflow | #59 Done | feature/60-ticket-workflow |
| 5 | [#61](https://github.com/BOOky-OS/toktickit/issues/61) | Staff dashboard | #60 Done | feature/61-staff-dashboard |
| 6 | [#62](https://github.com/BOOky-OS/toktickit/issues/62) | Requester dashboard | #61 Done | feature/62-requester-dashboard |
| 7 | [#63](https://github.com/BOOky-OS/toktickit/issues/63) | Regression/hardening | #62 Done | feature/63-final-hardening |
| 8 | [#64](https://github.com/BOOky-OS/toktickit/issues/64) | Documentation/release | #63 Done | docs/64-lab4-release |

Future Issues have scope, acceptance criteria, planned tests, assignee BOOky-OS, Lab 4 milestone and labels. Issue #62 / PR #69 are Done; #63 is ready for peer review after student UI approval and #64 remains Backlog. Branches for future work are planned, not created. One active Issue at a time; peer merges into staging before the next begins.

## Project listing discrepancy, 2026-09-24

Project: [TokTickIT Individual Sprints](https://github.com/users/BOOky-OS/projects/2).
Individual PR/Issue queries show Project membership and field values, but GraphQL items and REST Project list return only 39 older entries ending at #56. PR #57 and new #58-#64 are absent from that collection. Both saved views have no filter.

Attempts: inspect archive state; re-add PR card; restore PR Review; explicitly reposition; independently recreate using REST. Each mutation succeeded and individual lookup worked, but collection readback did not confirm repair. No Issue/PR content or reviews were deleted. At that time this was an unresolved listing discrepancy, not evidence that the PR was visible. Do not create duplicate Issues/PRs or mark work Done to work around it.

### Continuation verification

A fresh Project collection query after opening PR #65 returned 48 items, including #57, all #58-#64 and #65. The earlier collection omission is no longer reproduced by the API. Individual #58 and #65 items both report PR Review, and #56/#57 are Done. This is an API readback verification; no browser screenshot inspection is claimed. The cause of the earlier delayed listing is unknown.

## Review and release

Review templates are drafts only; no comments are posted as the student. Record actual reviews/replies in reviewer.md after they occur. The contract review and merge are verified in [reviewer.md](reviewer.md). Issue #58 is also verified complete. Issue #59 is verified complete; Issue #60 is verified complete; #61 is verified complete; #62 is complete; #63 must pass the student UI gate before peer handoff.

For #64, present complete pre-release artifacts and ask the exact documentation gate from root skill.md before creating a main PR. Peer reviews/merges release; final-main test/evidence verification precedes closing #64. This contract PR does not authorize main release.

PR #66 continuation: real Development link to #59, reviewer, author assignee, enhancement label, Lab 4 milestone and both PR Review Project items were verified on 2026-09-25.

## Student review gates before peer review (direct instruction, 2026-09-26)

These two additional gates are required by the student and take precedence over automatic PR/reviewer handoff:

1. **#63 Final Regression and Hardening:** prepare the implementation, checks and a runnable UI preview/screenshots, then pause for the student to inspect the UI and request changes. Apply requested changes and obtain explicit confirmation before requesting peer review or handing this increment to Atip-Infa. Complete this student review before proceeding to the final documentation package (#64).
2. **#64 Documentation and Release:** prepare the actual documents/report and review records/comment drafts for the student to inspect. Pause for their corrections, apply them and obtain explicit confirmation before requesting peer review or handing this increment to Atip-Infa. Do not treat completion of the drafts as permission to send them for peer review.

Do authorized preparation before each pause so the student can review a concrete result. A general request to continue, a prior peer approval, or approval at the other gate does not satisfy either gate. Do not open a ready-for-review PR, request a reviewer, or move to PR Review for these increments before their respective student confirmation. If a draft PR is used for preview, keep it draft with no peer review request.

The existing explicit documentation gate before any main-target PR remains required as well. These gates preserve the sequential workflow; #62 peer merge precedes #63 preparation.
