# Lab 4 Workflow and Audit

Current work: Issue #59, feature/59-actions-ui -> lab4-staging.
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

Future Issues have scope, acceptance criteria, planned tests, assignee BOOky-OS, Lab 4 milestone and labels. Issue #59 is Started; #60-#64 remain Backlog. Branches for future work are planned, not created. One active Issue at a time; peer merges into staging before the next begins.

## Project listing discrepancy, 2026-09-24

Project: [TokTickIT Individual Sprints](https://github.com/users/BOOky-OS/projects/2).
Individual PR/Issue queries show Project membership and field values, but GraphQL items and REST Project list return only 39 older entries ending at #56. PR #57 and new #58-#64 are absent from that collection. Both saved views have no filter.

Attempts: inspect archive state; re-add PR card; restore PR Review; explicitly reposition; independently recreate using REST. Each mutation succeeded and individual lookup worked, but collection readback did not confirm repair. No Issue/PR content or reviews were deleted. At that time this was an unresolved listing discrepancy, not evidence that the PR was visible. Do not create duplicate Issues/PRs or mark work Done to work around it.

### Continuation verification

A fresh Project collection query after opening PR #65 returned 48 items, including #57, all #58-#64 and #65. The earlier collection omission is no longer reproduced by the API. Individual #58 and #65 items both report PR Review, and #56/#57 are Done. This is an API readback verification; no browser screenshot inspection is claimed. The cause of the earlier delayed listing is unknown.

## Review and release

Review templates are drafts only; no comments are posted as the student. Record actual reviews/replies in reviewer.md after they occur. The contract review and merge are verified in [reviewer.md](reviewer.md). Issue #58 is also verified complete. Issue #59 requires its own peer review/merge before #60 begins.

For #64, present complete pre-release artifacts and ask the exact documentation gate from root skill.md before creating a main PR. Peer reviews/merges release; final-main test/evidence verification precedes closing #64. This contract PR does not authorize main release.
