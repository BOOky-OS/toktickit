# Lab 3 - Peer Review Record

**Author:** Supapanya Yathip - 67070503443 - GitHub: [@BOOky-OS](https://github.com/BOOky-OS)

**Peer reviewer:** Atip Infa-Udom - 67070503446 - GitHub: [@Atip-Infa](https://github.com/Atip-Infa)

Review comments and author responses below are taken directly from GitHub, checked on 2026-09-13. Quoted test results describe the corresponding PR at review time; current audit results are in [tests.md](tests.md).

## Pull Requests I authored and my partner reviewed

All PRs below target `lab3-staging` and were merged by `Atip-Infa`.

| Issue | Pull Request | Branch | Reviewer | Verdict |
| --- | --- | --- | --- | --- |
| [#32](https://github.com/BOOky-OS/toktickit/issues/32) | [#42 - Engineering contract and test plan](https://github.com/BOOky-OS/toktickit/pull/42) | `feature/32-lab3-contract` | `@Atip-Infa` | Approved earlier head; merged final head |
| [#33](https://github.com/BOOky-OS/toktickit/issues/33) | [#43 - User migration and guarded seed](https://github.com/BOOky-OS/toktickit/pull/43) | `feature/33-lab3-user-migration` | `@Atip-Infa` | Approved and merged |
| [#34](https://github.com/BOOky-OS/toktickit/issues/34) | [#44 - Authentication API](https://github.com/BOOky-OS/toktickit/pull/44) | `feature/34-lab3-auth-api` | `@Atip-Infa` | Approved and merged |
| [#35](https://github.com/BOOky-OS/toktickit/issues/35) | [#45 - Login and password-change UI](https://github.com/BOOky-OS/toktickit/pull/45) | `feature/35-lab3-auth-ui` | `@Atip-Infa` | Approved and merged |
| [#36](https://github.com/BOOky-OS/toktickit/issues/36) | [#46 - Requester regression](https://github.com/BOOky-OS/toktickit/pull/46) | `feature/36-lab3-requester-regression` | `@Atip-Infa` | Approved and merged |
| [#37](https://github.com/BOOky-OS/toktickit/issues/37) | [#47 - Staff Ticket Queue](https://github.com/BOOky-OS/toktickit/pull/47) | `feature/37-lab3-staff-queue` | `@Atip-Infa` | Approved and merged |
| [#38](https://github.com/BOOky-OS/toktickit/issues/38) | [#48 - Staff Ticket operations](https://github.com/BOOky-OS/toktickit/pull/48) | `feature/38-lab3-staff-operations` | `@Atip-Infa` | Approved and merged |
| [#39](https://github.com/BOOky-OS/toktickit/issues/39) | [#49 - Public Comments and Internal Notes](https://github.com/BOOky-OS/toktickit/pull/49) | `feature/39-lab3-comments-notes` | `@Atip-Infa` | Approved and merged |
| [#40](https://github.com/BOOky-OS/toktickit/issues/40) | [#50 - Administrator User Management](https://github.com/BOOky-OS/toktickit/pull/50) | `feature/40-lab3-user-management` | `@Atip-Infa` | Approved and merged |

## Review comments I received and how I responded

### PR #42 - Issue #32

Reviewer comment:

> Reviewed Issue #32: Lab 3 engineering contract and test plan.The specification covers authentication, role permissions, staff ticket operations, comments/internal notes, and minimal user management. Admin manages users and has read-only Ticket access; IT Staff performs Ticket updates.The API/UI specifications and planned tests align with the contract, including migration safety and preservation of Lab 2 behavior. The test plan distinguishes planned coverage from actual passing results.The workflow requires completed documentation and explicit student confirmation before release to main.
> Approved. Ready to merge into lab3-staging.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/42#pullrequestreview-5168577727)

My response:

> Thank you for reviewing and approving Issue #32.
>
> The student has confirmed the specification. Documentation consistency, test traceability, local links, and UTF-8 checks passed. Application tests have not been run because this PR contains documentation only.
>
> Ready for you to merge into lab3-staging. Issue #33 will begin after the merge is verified and Issue #32 is marked Done.
>
> The documentation confirmation gate before release to main remains required.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/42#issuecomment-5620601224) | [Post-merge response](https://github.com/BOOky-OS/toktickit/pull/42#issuecomment-5628843379)

Approved commit: `a0a53e6`. Merged by `@Atip-Infa` into `lab3-staging` at [`f16f27b`](https://github.com/BOOky-OS/toktickit/commit/f16f27b1ad4d1fbb17a4abc7253944371777a87c).

The approval was for `a0a53e6`, before the later documentation/sidebar updates. The peer subsequently merged final head `b6933ce`; a separate final-head approval is not recorded.

### PR #43 - Issue #33

Reviewer comment:

> Reviewed Issue #33, including the User migration, guarded seed/provisioning, recorded test results, and workflow documentation.
>
> The migration preserves existing data, and the seed/provisioning safeguards protect existing user changes and passwords.
>
> Approved for merging into lab3-staging.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/43#pullrequestreview-5175753084)

My response:

> Thank you for reviewing and approving PR #43.
>
> The migration, guarded seed/provisioning, tests, and documentation are ready. Please merge this PR into lab3-staging when ready.
>
> The required documentation must be completed and confirmed before release to main.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/43#issuecomment-5630650685) | [Post-merge response](https://github.com/BOOky-OS/toktickit/pull/43#issuecomment-5630653388)

Approved commit: `8321ca8`. Merged by `@Atip-Infa` into `lab3-staging` at [`a5e23e1`](https://github.com/BOOky-OS/toktickit/commit/a5e23e127642398a4a7c4b08fbcf712e2b3be822).

### PR #44 - Issue #34

Reviewer comment:

> Reviewed Issue #34, including session authentication, password changes, CSRF protection, backend role and ownership checks, and the recorded test results.
>
> The implementation and documentation meet the scope of this increment. Browser authentication and the remaining workflows are tracked in later issues.
>
> Approved for merging into lab3-staging.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/44#pullrequestreview-5175986095)

My response:

> Thank you for reviewing and approving PR #44.
>
> The server tests passed 100/100 and client tests passed 32/32. Both builds and Prisma validation passed.
>
> Please merge this PR into lab3-staging when ready.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/44#issuecomment-5630970403) | [Post-merge response](https://github.com/BOOky-OS/toktickit/pull/44#issuecomment-5630972652)

Approved commit: `ac03ae4`. Merged by `@Atip-Infa` into `lab3-staging` at [`968c19b`](https://github.com/BOOky-OS/toktickit/commit/968c19b994710b05143b40bb73d9854003693088).

### PR #45 - Issue #35

Reviewer comment:

> Reviewed Issue #35, including the Login and Change Password flows, mandatory first-password change, session restoration, role-specific navigation, logout and expiry behavior, and the removal of the development requester selector.
>
> The client now uses the authenticated server session for requester ownership, keeps CSRF only in memory, and does not send requesterId from the browser. I also reviewed the recorded client 48/48 and server 100/100 test results, builds, Prisma validation, and updated documentation.
>
> The implementation and documentation meet the scope of this increment. Real browser E2E and final screenshots remain correctly tracked for the later isolated E2E and final-evidence work.
>
> Approved for merging into lab3-staging.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/45#pullrequestreview-5180204380)

My response:

> Thank you for reviewing and approving PR #45.
>
> The client tests passed 48/48 and the server tests passed 100/100. Client and server builds and Prisma validation also passed.
>
> Please merge this PR into lab3-staging when ready.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/45#issuecomment-5636466482) | [Post-merge response](https://github.com/BOOky-OS/toktickit/pull/45#issuecomment-5636472474)

Approved commit: `cf3d0c1`. Merged by `@Atip-Infa` into `lab3-staging` at [`a97f020`](https://github.com/BOOky-OS/toktickit/commit/a97f02087eb64b16b2b5be3966d4dfb54124b11e).

### PR #46 - Issue #36

Reviewer comment:

> Reviewed PR #46 at commit fdff03a against Issue #36.
>
> I checked the authenticated Requester ownership boundaries, stable submission-key behavior, all eight Ticket statuses, Ticket Detail metadata, Attachment row locking/version increments, removal audit data, safe download headers, and partial-upload retry flow. I also reviewed the recorded server, client, build, and Prisma validation results.
>
> No blocking issues found. Approved for merge into lab3-staging.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/46#pullrequestreview-5185338624)

My response:

> Thank you for reviewing and approving PR #46.
>
> I have checked the review and confirmed that there are no unresolved comments. The final reviewed head is fdff03a, and all recorded checks are passing.
>
> Please merge PR #46 into lab3-staging when ready.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/46#issuecomment-5643679603) | [Post-merge response](https://github.com/BOOky-OS/toktickit/pull/46#issuecomment-5643682420)

Approved commit: `fdff03a`. Merged by `@Atip-Infa` into `lab3-staging` at [`24b4dd5`](https://github.com/BOOky-OS/toktickit/commit/24b4dd5117f5a804c28c2a2094ff01543712395f).

### PR #47 - Issue #37

Reviewer comment:

> Reviewed PR #47 at commit a5b100b against the acceptance criteria for Issue #37.
>
> The Queue implementation covers Staff/Admin access, query validation, filtering, sorting, stable pagination, responsive layouts, and read-only Ticket Detail navigation. I also reviewed the documented test results and their limitations.
>
> No blocking issues found within this PR's scope. Approved for merging into lab3-staging.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/47#pullrequestreview-5185541205)

My response:

> Thank you for reviewing and approving PR #47.
>
> Please proceed with merging into lab3-staging when all review feedback is resolved and the approved head is still current. I will verify the merge and update the Issue #37 records before continuing with Issue #38.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/47#issuecomment-5644074049) | [Post-merge response](https://github.com/BOOky-OS/toktickit/pull/47#issuecomment-5644075985)

Approved commit: `a5b100b`. Merged by `@Atip-Infa` into `lab3-staging` at [`ed33913`](https://github.com/BOOky-OS/toktickit/commit/ed33913925692417925d1f71b3f6111a19510bfa).

### PR #48 - Issue #38

Reviewer comment:

> Reviewed PR #48 at commit dc48634 against Issue #38.
>
> Checked Staff permissions, ownership and priority rules, the status transition matrix, version handling, public history, and confirmation/conflict behavior. Reviewed the recorded test results and their stated limitations.
>
> No blocking issues found within this PR's scope. Approved for merging into lab3-staging.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/48#pullrequestreview-5185613150)

My response:

> Thank you for reviewing and approving PR #48.
>
> Please proceed with merging into lab3-staging once all review feedback is resolved and the approved head is current. I will verify the merge and complete the Issue #38 records before starting Issue #39.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/48#issuecomment-5644194798) | [Post-merge response](https://github.com/BOOky-OS/toktickit/pull/48#issuecomment-5644198030)

Approved commit: `dc48634`. Merged by `@Atip-Infa` into `lab3-staging` at [`790a99c`](https://github.com/BOOky-OS/toktickit/commit/790a99c670827545d5bbd94e35fff015997b22d3).

### PR #49 - Issue #39

Reviewer comment:

> Reviewed PR #49 at commit 658535f against Issue #39.
>
> Checked Public Comments and Internal Notes permissions, requester privacy, append-only behavior, content validation, resolution indication, and separate draft/retry handling. Reviewed the documented test results and their limitations.
>
> No blocking issues found within this PR's scope. Approved for merging into lab3-staging.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/49#pullrequestreview-5186228933)

My response:

> Thank you for reviewing and approving PR #49.
>
> Please proceed with merging into lab3-staging once all review feedback is resolved and the approved head is current. I will verify the merge and complete the Issue #39 records before starting Issue #40.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/49#issuecomment-5645478768) | [Post-merge response](https://github.com/BOOky-OS/toktickit/pull/49#issuecomment-5645481200)

Approved commit: `658535f`. Merged by `@Atip-Infa` into `lab3-staging` at [`711f20f`](https://github.com/BOOky-OS/toktickit/commit/711f20f6ceb28e42dc553788dae4df0714e0c861).

### PR #50 - Issue #40

Reviewer comment:

> Reviewed PR #50 at commit cf788ca against Issue #40.
>
> Checked Admin access, user validation, initial-password handling, session revocation, last-Admin and active-owner protection, and create/edit/reset behavior. Reviewed the documented test results and their limitations.
>
> No blocking issues found within this PR's scope. Approved for merging into lab3-staging.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/50#pullrequestreview-5186273018)

My response:

> Thank you for reviewing and approving PR #50.
>
> Please proceed with merging into lab3-staging once all review feedback is resolved and the approved head is current. I will verify the merge and complete the Issue #40 records before starting the final audit in Issue #41.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/50#issuecomment-5645571107) | [Post-merge response](https://github.com/BOOky-OS/toktickit/pull/50#issuecomment-5645572981)

Approved commit: `cf788ca`. Merged by `@Atip-Infa` into `lab3-staging` at [`7831409`](https://github.com/BOOky-OS/toktickit/commit/7831409181d8728c765216f64d747148ad1d8d01).

## Pull Requests I reviewed for my partner

Lab 3 reciprocal-review evidence is still pending. A GitHub search on 2026-09-13 for reviews in `Atip-Infa/toktickit` under `zerotwobook` and `BOOky-OS` returned earlier-lab reviews only. No Lab 3 partner review was identified in those results.

When the Lab 3 review is available, record the partner PR, branch, actual reviewing account, verdict, review URL, and the partner's response. Earlier Lab 1 or Lab 2 reviews are not Lab 3 evidence.

## Remaining review and release steps

- Issue #41 final quality audit and documentation are in progress. No staging PR is open as of this check; peer review is pending.
- Complete the reciprocal-review evidence for the partner's Lab 3 work.
- Finish the documentation and obtain the student's explicit confirmation before preparing the release to `main`.
- After approval, the peer reviewer merges the release. Record the actual merge and final-main verification afterward.

## Confirmed project decisions

The student authorized the ten-Issue plan and confirmed that Admin manages users and reads Tickets while IT Staff performs Ticket updates. The student also required completed documentation and an explicit confirmation before release to `main`. Specification confirmation and earlier implementation approvals do not replace that release confirmation.
