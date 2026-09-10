# Lab 3 GitHub Workflow and Release Gate

Status: initialized on 2026-09-10. This file records the student's workflow
requirements for this sprint and must be read before continuing any Lab 3 Issue.

## 1. Verified sprint context

- Repository: [BOOky-OS/toktickit](https://github.com/BOOky-OS/toktickit).
- Project: [TokTickIT Individual Sprints](https://github.com/users/BOOky-OS/projects/2).
- Lab: Lab 3, Users, Roles, IT Staff Ticketing and Admin Screens.
- Verified baseline main: 2fc1fe3; no open Issues/PRs before sprint initialization.
- Integration branch: lab3-staging, created from current main.
- Current contract branch: feature/32-lab3-contract.
- Prior peer reviewer: [Atip-Infa](https://github.com/Atip-Infa), verified as a
  collaborator and the approver/merger of prior PR #31. This does not mean a
  Lab 3 review has happened or that a review request has been sent.
- Current-lab assignment/new instructor clarification takes precedence over
  historical lab assumptions; follow the student's explicit instructions.
- Sources read: Lab_3_sheet.pdf, referenced Lab 2 branch/agent/completion rules,
  GITHUB_WORKFLOW_AI_GUIDE(1).md, current repository source and prior review record.

## 2. Ten actual Issues and order

The handout does not prescribe exactly ten Issues. The following decomposition
was proposed to the student and authorized as the sprint starting plan.

| Order | GitHub Issue | Work branch | Prerequisite |
| --- | --- | --- | --- |
| 1 | [#32 Contract and test plan](https://github.com/BOOky-OS/toktickit/issues/32) | feature/32-lab3-contract | Verified Lab 2 main |
| 2 | [#33 User migration and seed](https://github.com/BOOky-OS/toktickit/issues/33) | feature/33-lab3-user-migration | #32 confirmed, reviewed, merged, Done |
| 3 | [#34 Authentication and authorization API](https://github.com/BOOky-OS/toktickit/issues/34) | feature/34-lab3-auth-api | #33 Done |
| 4 | [#35 Authentication UI and role shell](https://github.com/BOOky-OS/toktickit/issues/35) | feature/35-lab3-auth-ui | #34 Done |
| 5 | [#36 Requester regression](https://github.com/BOOky-OS/toktickit/issues/36) | feature/36-lab3-requester-regression | #35 Done |
| 6 | [#37 Staff Queue](https://github.com/BOOky-OS/toktickit/issues/37) | feature/37-lab3-staff-queue | #36 Done |
| 7 | [#38 Staff Ticket operations](https://github.com/BOOky-OS/toktickit/issues/38) | feature/38-lab3-staff-operations | #37 Done |
| 8 | [#39 Comments/Notes/resolution indication](https://github.com/BOOky-OS/toktickit/issues/39) | feature/39-lab3-comments-notes | #38 Done |
| 9 | [#40 Minimal User Management](https://github.com/BOOky-OS/toktickit/issues/40) | feature/40-lab3-user-management | #39 Done |
| 10 | [#41 Verification, documents and gated release](https://github.com/BOOky-OS/toktickit/issues/41) | feature/41-lab3-quality-release | #40 Done |

One active Issue at a time. Later Issues remain Backlog until their requirements
are actively reviewed. Actual board state is authoritative, not this table.
A new Issue branch starts from updated lab3-staging, which contains prerequisites.
For Lab 3 this clarifies older README wording about always branching from main.

## 3. Required per-Issue flow

1. Read full Issue/AC and dependencies; Backlog -> Specified only after understood.
2. Create the correct branch; Specified -> Started when work begins.
3. Implement only the Issue with planned tests and related documents on that
   same branch. No direct implementation/commit on main or lab3-staging.
4. Check every AC, required tests/docs, diff, meaningful commit and push.
5. Open PR to lab3-staging and establish an actual PR-to-Issue Development link.
   Verify the relationship; Closes/Fixes text alone is not sufficient for staging.
6. Move to PR Review only after PR/link/checks are ready. Student arranges peer
   review or explicitly authorizes sending a request; no fabricated review.
7. If changes are requested/checks fail: Fixing; fix on same branch/PR, run checks,
   answer every review comment, then return to PR Review.
8. Reviewer approves and merges. The PR author/assistant must not self-merge,
   including through another account used to imitate the reviewer.
9. Verify actual merge and criteria, then Done and close Issue if needed.
   Do not begin the next Issue before this sequence finishes.

The contract Issue also requires student confirmation of the proposed engineering
decisions before implementation. Peer approval and student confirmation are
distinct; record both factually in reviewer.md and the PR.

## 4. Mandatory documentation gate before main

This is the student's explicit instruction, not a guessed course rule:

> Issue 10 or the final Issue must finish documents before work goes to main.
> Ask whether documents are complete or anything needs changing before main.

Before preparing the release PR from lab3-staging to main, ask the student:

> ????????????????????????? ???????????????????????? main ????

**Wait for an explicit answer confirming readiness.** Passing tests, elapsed time,
peer approval, or the earlier instruction to start Lab 3 is not this confirmation.

Before asking, complete the concrete pre-release documents and evidence for
review: specification, API/UI specs, tests/traceability and staging outputs,
reviewer record, real AI-use record and student reflection, README/setup,
screenshots/visual checklist and the draft Answer Part 1-9 PDF. Provide links
and identify only final-main facts that cannot exist before release.
The student must have a complete reviewable package, not an unfinished promise.

If changes are requested, make them through the active Issue branch/PR, review,
refresh evidence and ask again. Only after confirmation prepare the release PR;
the reviewer performs its merge after approval. Never merge or push directly
to main. This gate also applies to a changed final Issue number.

After release, rerun required tests on the exact final main commit and capture
the real final merge/board/review evidence. These observations cannot be invented
before main exists. Append them to the final submission PDF; do not silently edit
tracked source/docs on main. If tracked changes are necessary, use another
reviewed branch/PR with student main confirmation before that change proceeds.

Issue #41 is not Done merely because its feature PR was merged into staging.
Its remaining acceptance criteria include student confirmation, reviewer release
merge, final-main tests and finished submission evidence. Close it only after
those actual results are available.

Gate state: **Pending; not requested or granted for release.**

## 5. Repository records and submission

docs/lab-03 contains specification.md, api-spec.md, ui-spec.md, tests.md,
reviewer.md and ai-use.md; this workflow.md preserves the additional user gate.
Record actual reviewer comments/responses/approval/merge links, not templates
presented as evidence. AI-use distinguishes AI suggestions, tool checks and
student decisions. Student reflection cannot be written as if unverified actions
were personally performed.

| Required PDF heading | Evidence | Points |
| --- | --- | --- |
| Answer Part 1 | Git graph, staged PRs, final Done board, reviewer identity/comments/replies/approvals, README/.gitignore and repository structure | 10 |
| Answer Part 2 | Rendered specification, FR/BR/AC/matrices/migration/DoD and proof it preceded implementation | 5 |
| Answer Part 3 | Planned tests, AC mapping, actual paths and complete final-main passing unit/API/integration/UI/security/regression/E2E output | 10 |
| Answer Part 4 | Named LLM, 6-10 real selected prompts and student-confirmed My Reflection | 5 |
| Answer Part 5 | Login/invalid/inactive/busy/failure, mandatory change, identity/role, logout and direct-access denial | 5 |
| Answer Part 6 | Staff Queue realistic data/query/assignment/badges/pagination/states/responsiveness | 5 |
| Answer Part 7 | Detail assignment/priority/status/public/private communication/attachments/indication, validation and direct authorization evidence | 10 |
| Answer Part 8 | Minimal Users search/create/edit/role/activation/reset/safety/forbidden/responsive evidence | 5 |
| Answer Part 9 | Rendered UI spec, screenshots at all sizes and completed visual checklist | 5 |

Exactly one concise PDF, headings in that order, working links and readable
screenshots. Final repository/main is the source of truth. Do not inherit
Lab 2 report assertions or counts as new evidence.
