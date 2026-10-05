# Lab 4 Workflow and Audit

## Current handoff status (2026-10-05)

Atip-Infa approved PR #73 head 2d13733 and merged it into main at `50b84924de3c265a9ae587257afea92d52b22a1c`. All six commands were freshly rerun there and passed: client 116, server 574, browser 18, real Lab 3 browser 14, real Lab 4 browser 20; build and Prisma validation. Actual #73 review and author replies are in reviewer.md. PR #73 is Done.

GitHub auto-closed #64 again; it was reopened and set Started for final evidence completion. Current work: docs/64-lab4-submission-record, containing the post-merge review, latest main output, refreshed screenshots and observed product checklist. No application changes are introduced. Final tracked-document integration and final all-Done Project/PDF evidence remain pending. Earlier dated entries below are historical.

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

Issues #56 and #58-#63 are complete. Issue #64 is Started after reading its scope and AC, verifying #63 peer merge and creating the documentation branch. One active Issue at a time.

## Project listing discrepancy, 2026-09-24

Project: [TokTickIT Individual Sprints](https://github.com/users/BOOky-OS/projects/2).
Individual PR/Issue queries show Project membership and field values, but GraphQL items and REST Project list return only 39 older entries ending at #56. PR #57 and new #58-#64 are absent from that collection. Both saved views have no filter.

Attempts: inspect archive state; re-add PR card; restore PR Review; explicitly reposition; independently recreate using REST. Each mutation succeeded and individual lookup worked, but collection readback did not confirm repair. No Issue/PR content or reviews were deleted. At that time this was an unresolved listing discrepancy, not evidence that the PR was visible. Do not create duplicate Issues/PRs or mark work Done to work around it.

### Continuation verification

A fresh Project collection query after opening PR #65 returned 48 items, including #57, all #58-#64 and #65. The earlier collection omission is no longer reproduced by the API. Individual #58 and #65 items both report PR Review, and #56/#57 are Done. This is an API readback verification; no browser screenshot inspection is claimed. The cause of the earlier delayed listing is unknown.

## Review and release

Review templates are drafts only; no comments are posted as the student. Record actual reviews/replies in reviewer.md after they occur. The contract review and merge are verified in [reviewer.md](reviewer.md). Issue #58 is also verified complete. Issue #59 is verified complete; Issue #60 is verified complete; #61 is verified complete; #62 is complete; #63 passed student UI inspection and peer review; its merge is verified.

For #64, present complete pre-release artifacts and ask the exact documentation gate from root skill.md before creating a main PR. Peer reviews/merges release; final-main test/evidence verification precedes closing #64. This contract PR does not authorize main release.

PR #66 continuation: real Development link to #59, reviewer, author assignee, enhancement label, Lab 4 milestone and both PR Review Project items were verified on 2026-09-25.

## Student review gates before peer review (direct instruction, 2026-09-26)

These two additional gates are required by the student and take precedence over automatic PR/reviewer handoff:

1. **#63 Final Regression and Hardening:** prepare the implementation, checks and a runnable UI preview/screenshots, then pause for the student to inspect the UI and request changes. Apply requested changes and obtain explicit confirmation before requesting peer review or handing this increment to Atip-Infa. Complete this student review before proceeding to the final documentation package (#64).
2. **#64 Documentation and Release:** prepare the actual documents/report and review records/comment drafts for the student to inspect. Pause for their corrections, apply them and obtain explicit confirmation before requesting peer review or handing this increment to Atip-Infa. Do not treat completion of the drafts as permission to send them for peer review.

Do authorized preparation before each pause so the student can review a concrete result. A general request to continue, a prior peer approval, or approval at the other gate does not satisfy either gate. Do not open a ready-for-review PR, request a reviewer, or move to PR Review for these increments before their respective student confirmation. If a draft PR is used for preview, keep it draft with no peer review request.

The existing explicit documentation gate before any main-target PR remains required as well. These gates preserve the sequential workflow; #62 peer merge precedes #63 preparation.

## PR #70 handoff, 2026-09-29

[PR #70](https://github.com/BOOky-OS/toktickit/pull/70) links Issue #63 through the verified Development relationship. Target lab4-staging; reviewer Atip-Infa requested, BOOky-OS assigned, enhancement label, Lab 4 milestone and both Project items PR Review verified. Student UI approval is recorded above. Tested code a36b6ac; subsequent commits record documentation/handoff only. Peer verdict, author review replies and merge are pending; no comments posted by the assistant. #64 remains Backlog until peer merge and completion of #63.

## Reciprocal review evidence update, 2026-10-04

The student supplied ten screenshots identifying Atip-Infa/toktickit PRs #61-#70. Live GitHub verification confirms all ten approvals and merges by zerotwobook into lab4-staging, closed linked Issues #51-#60, matching approved/final heads and no inline review threads. Exact comments, partner responses, permalinks and commits are recorded in [reviewer.md](reviewer.md). The report source and PDF are updated with the reciprocal summary. This evidence update does not satisfy the separate student document gate or authorize a main PR. Issue #64 remains Started. No new review/comment was posted.

## Student documentation gate accepted, 2026-10-04

After editing AI-use prompts/reflection and the review-record format, the student said the documents were ready and authorized continuation. This satisfies the #64 student correction gate and permits a documentation PR into lab4-staging. The separate explicit pre-main gate has not been answered. No main PR is authorized by this acceptance. Runtime evidence remains the recorded 2026-09-30 staging run; this increment changes documentation/report tooling only.

## Documentation peer handoff, 2026-10-04

Opened [PR #71](https://github.com/BOOky-OS/toktickit/pull/71) from `docs/64-lab4-release` into `lab4-staging` after the student accepted the document corrections. Atip-Infa is the requested reviewer; BOOky-OS is assigned. The documentation label, Lab 4 milestone, actual Development link to #64 and Project membership were verified. Both #64 and #71 are in PR Review. The PR is open and awaits peer review/merge. Issue #64 remains open for the final release and evidence. The separate pre-main student confirmation is still required.

Documentation checks: whitespace check passed; the pre-release PDF was generated as 27 pages, rendered and visually inspected in full. No application code changed and runtime suites were not rerun for this handoff; the recorded staging results are dated 2026-09-30. Generated PDF/images/logs remain ignored.

## Documentation merge verified, 2026-10-04

Atip-Infa approved documentation PR #71 at b860122 and merged it into lab4-staging at e2f9979. The approval matches the final head. Review/comment pagination is complete, no inline threads were found, and both author replies already exist. PR #71 is Done; #64 is open and Started for release preparation. The local staging branch was fast-forwarded safely; `docs/64-lab4-final-release` was created from the updated staging for release evidence. Exact review and response links are recorded in reviewer.md.

The report is refreshed with documentation merge evidence. Application code is unchanged and the 2026-09-30 staging results remain historical. The separate pre-main confirmation has not yet been answered; no main PR is created at this point.

## Pre-main student confirmation accepted, 2026-10-04

After being shown the updated reviewable documents and PDF, the student answered the exact required question, "เอกสารเสร็จครบแล้วหรือยัง มีอะไรต้องการแก้ก่อนขึ้น main ไหม?", with "ไม่มีแล้วไปต่อได้เลย". The release gate is satisfied. The release branch contains the verified staging history and documentation follow-up; opening its PR into main is authorized. Atip-Infa must review and merge. Issue #64 remains open until actual final-main verification and submission evidence are complete. See release.md for the repository auto-close setting that must be checked before merge.

## Release PR opened, 2026-10-04

Opened [PR #72](https://github.com/BOOky-OS/toktickit/pull/72) from `docs/64-lab4-final-release` into main after the student answered the exact pre-main question. The branch contains the peer-integrated staging history plus documentation evidence follow-up. Reviewer Atip-Infa, author assignment, enhancement/documentation labels, Lab 4 milestone, Project membership and actual Development link to #64 were verified. Issue #64 and PR #72 are in PR Review. Approval/merge and final-main checks are pending. The user must check the repository auto-close setting before merging because browser automation failed to start; no change to that setting is claimed.

## Actual main release and verification, 2026-10-04

Atip-Infa approved PR #72 at 530eead and merged it into main at 6d2b37d2a96d42e30f88d40f3e8699fd9eb926a3. Approval matches the release head, author approval/post-merge replies exist, and review/comment pagination is complete with no inline threads. The assistant fast-forwarded local main and ran all six required commands there: client 116 (19 files), server 574 (40 files), default browser 18, real Lab 3 browser 14, real Lab 4 browser 20; build and Prisma validation passed. Full outputs and UTC timestamps are retained under output/release-main-*.txt. Docker Desktop and the existing test container were started before database checks; no new container or working-database reset was used.

GitHub auto-closed #64 on main merge. It was reopened and returned to Started for remaining evidence. PR #72 is Done. Post-release documentation uses docs/64-lab4-main-evidence from verified main. Its student pre-main gate and peer review/merge, final latest-main check and final all-Done submission evidence remain pending. Existing PR #72 replies already exist and need no duplicate post-merge message.

## Preview shutdown correction found during evidence capture, 2026-10-04

The main runtime suites passed before this additional preview check. Starting the isolated preview succeeded, but stopping it failed because the script left DATABASE_URL pointing at its disposable fixture before calling fixture.dispose(). The safety guard correctly rejected treating that database as the working database. The preview script now retains the initial DATABASE_URL and restores/deletes it before cleanup, matching the existing E2E cleanup pattern.

A real start, login/capture and Ctrl+C stop was repeated after the fix. The new owned schema was removed, all pre-existing schemas were preserved, and ports 3008/5178 were released. The Windows terminal returned an interruption exit status of 1; there was no application cleanup exception. The first failed preview fixture was identified using the exact captured seed timestamp and 16-Ticket/6-user fingerprint, then only that owned test schema was removed. Local evidence: output/preview-cleanup-evidence.json and output/preview-cleanup-evidence.txt. This correction is on docs/64-lab4-main-evidence, awaiting student acceptance and peer review; it is not claimed as already merged into main. Client/server/E2E application files are unchanged from verified main 6d2b37d.
