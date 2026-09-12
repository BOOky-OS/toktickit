# Lab 3 Peer Review Record

Status: student confirmed the contract in Issue #32. Atip-Infa approved contract
commit a0a53e6, then merged final head b6933ce through PR #42 on 2026-09-11.
Issues #33-#35 were approved at their final heads and merged by Atip-Infa.
Issue #36 authenticated Requester workflow is awaiting its own peer review.

Author: Supapanya Yathip, 67070503443, repository account
[BOOky-OS](https://github.com/BOOky-OS).
Prior partner: Atip Infa-Udom, 67070503446,
[Atip-Infa](https://github.com/Atip-Infa).
Identity comes from existing course records; current collaborator/PR #31 history
was checked on 2026-09-10. Current review and merge evidence is recorded below.

## Student decisions actually received

- Approved starting the proposed ten-Issue Lab 3 workflow.
- Confirmed Admin manages users and reads Tickets; IT Staff edits Tickets.
- Required a completed-document review and explicit question before release to main.

Full proposed contract confirmation: received on 2026-09-10. After asking whether
the specification follows the original Lab 3 sheet and receiving clarification,
the student said "โอเคนั้นเริ่มทำต่อได้เลย". This authorizes continuing
under the agreed workflow; independent peer review and the later main gate remain required.
Contract peer review: Atip-Infa approved a0a53e6 on 2026-09-10 at 14:46:24 UTC.
[Approval record](https://github.com/BOOky-OS/toktickit/pull/42#pullrequestreview-5168577727).
That approval preceded the later review-request/sidebar documentation updates.
Contract merge: Atip-Infa merged PR #42 on 2026-09-11 at 03:06:37 UTC;
merge commit f16f27b1ad4d1fbb17a4abc7253944371777a87c.
No separate approval of final head b6933ce is claimed; the peer performed its merge.
Release-to-main documentation confirmation: pending.

## Authored PRs

[PR #42 - Lab 3 engineering contract and test plan](https://github.com/BOOky-OS/toktickit/pull/42)
was merged from feature/32-lab3-contract into lab3-staging and linked through
Development to [Issue #32](https://github.com/BOOky-OS/toktickit/issues/32).
Both the Issue and PR Project items are Done; Issue #32 is closed.
The peer reviewed the permission, API/UI, migration and test contracts.
[Author reply](https://github.com/BOOky-OS/toktickit/pull/42#issuecomment-5620601224)
and [post-merge response](https://github.com/BOOky-OS/toktickit/pull/42#issuecomment-5628843379)
are present. No inline review comments remain. Actual review commit and later
reviewer merge are distinguished above rather than inventing a second approval.

[PR #43 - Issue #33 user migration and guarded local seed](https://github.com/BOOky-OS/toktickit/pull/43)
uses feature/33-lab3-user-migration from that verified integration commit and
targets lab3-staging. Implementation commit e6b6f3a passed the checks in tests.md.
Development links Issue #33. Required reviewer: Atip-Infa; assignee: BOOky-OS;
labels: enhancement/documentation; Project: TokTickIT Individual Sprints;
milestone: Lab 3. Atip-Infa [approved final head 8321ca8](https://github.com/BOOky-OS/toktickit/pull/43#pullrequestreview-5175753084)
and merged it into lab3-staging at a5e23e127642398a4a7c4b08fbcf712e2b3be822.
[Author approval reply](https://github.com/BOOky-OS/toktickit/pull/43#issuecomment-5630650685)
and [post-merge reply](https://github.com/BOOky-OS/toktickit/pull/43#issuecomment-5630653388)
are present. No inline review comments exist. Issue #33 is closed and both
Project items are Done.

[PR #44](https://github.com/BOOky-OS/toktickit/pull/44) for Issue #34 uses
feature/34-lab3-auth-api from a5e23e1, targeting lab3-staging.
Development links #34. Assignee: BOOky-OS; reviewer: Atip-Infa; labels:
enhancement/documentation; Project: TokTickIT Individual Sprints; milestone: Lab 3.
Review focus: persisted session/CSRF rotation, forced change, uniform login
failures, throttles, transaction-time revocation, role/ownership boundaries,
compensated uploads and real PostgreSQL test evidence.
Atip-Infa [approved final head ac03ae4](https://github.com/BOOky-OS/toktickit/pull/44#pullrequestreview-5175986095)
and merged it into lab3-staging as 968c19b994710b05143b40bb73d9854003693088.
[Author approval reply](https://github.com/BOOky-OS/toktickit/pull/44#issuecomment-5630970403)
and [post-merge reply](https://github.com/BOOky-OS/toktickit/pull/44#issuecomment-5630972652)
are present. No inline review comments exist. Issue #34 is closed and its Issue/PR
Project items are Done.

[PR #45](https://github.com/BOOky-OS/toktickit/pull/45) for Issue #35 uses
feature/35-lab3-auth-ui from verified integration commit 968c19b and targets
lab3-staging. Development links #35. Assignee: BOOky-OS; requested reviewer:
Atip-Infa; labels: enhancement/documentation; Project: TokTickIT Individual
Sprints; milestone: Lab 3. It implements Login, password change, the role-aware
shell and session-owned requester transport; actual checks are in tests.md.
Atip-Infa approved final head `cf3d0c1` and merged it into `lab3-staging` as
`a97f02087eb64b16b2b5be3966d4dfb54124b11e`. The
[author approval reply](https://github.com/BOOky-OS/toktickit/pull/45#issuecomment-5636466482)
and [post-merge reply](https://github.com/BOOky-OS/toktickit/pull/45#issuecomment-5636472474)
are present. Issue #35 is closed and both Project items are Done.

[PR #46](https://github.com/BOOky-OS/toktickit/pull/46) for Issue #36 uses
`feature/36-lab3-requester-regression` from the peer-merged Issue #35 commit
`a97f020` and targets `lab3-staging`. Runtime/test implementation commit
`ff4b2e9` and evidence commit `6ecf9cd` passed the checks recorded in tests.md.
Development links #36. Assignee: BOOky-OS; requested reviewer: Atip-Infa;
labels: enhancement/documentation; Project: TokTickIT Individual Sprints with
Issue and PR in PR Review; milestone: Lab 3. Review focus: session-owned
Requester boundaries, stable submission keys, list/Detail contract, Attachment
row locking/version/removal audit and partial-upload retry. Peer approval,
author reply and reviewer merge remain pending.

For each completed review, record the actual PR/Issue, head/base branch, reviewer,
comment/review URL, author's response URL, resolution, approval and reviewer merge
commit. Answer every review comment; a bare approval does not erase open feedback.

## Reviews of partner work

No Lab 3 partner PR review has been performed in this session. Do not copy
Lab 2 partner reviews or use another account to approve one's own work.

## Outstanding human review

Review Issue #36 authenticated Requester create/list/detail and Attachment
workflows, concurrency boundaries and test/evidence records. Give specific
changes where needed; use Approve only after checking the actual branch head.
The reviewer, not the PR author, merges into lab3-staging when ready.
