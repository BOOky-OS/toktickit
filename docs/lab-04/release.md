# Lab 4 release preparation

## Current state - 2026-10-05

Atip-Infa approved PR #73 head 2d13733 and merged it into main at `50b84924de3c265a9ae587257afea92d52b22a1c` at 2026-10-05T03:57:26Z (UTC). The student accepted the separate follow-up pre-main gate on 2026-10-04. All six required runtime commands were run freshly on that integrated main and passed. PR #73 is Done. GitHub auto-closed #64 again; it was reopened and kept Started for final evidence completion. Final tracked-document corrections are prepared on docs/64-lab4-submission-record; no final all-Done or submission claim is made before those gates pass.

## Reviewable package

- [Report source: Answer Part 1 through Answer Part 9](report.md).
- [Actual peer reviews and replies](reviewer.md).
- [AI use and reflection](ai-use.md): eight real paraphrased prompts; personal reflection accepted by the student on 2026-10-04.
- [Contract](specification.md), [API](api-spec.md), [UI/checklist](ui-spec.md), [test traceability](tests.md).
- [Migration, seed and recovery](migration.md), [UI audit](ui-audit.md), [preview instructions](ui-review.md), [README](../../README.md).
- Generated report: `output/pdf/toktickit-lab4-review.pdf`. It is a review draft, not a final submission. Output, screenshots and temporary files remain ignored.

The report generator is `node scripts/lab4-report.cjs`. It reads the Markdown sources and existing local screenshots. Install project dependencies and Chrome first. Missing screenshots fail generation rather than silently disappearing. Rebuild and inspect the PDF whenever evidence changes.

## Historical staging evidence

Assistant-run verification on 2026-09-30 passed against application/test code at e484d28. Only documentation/report preparation changed in this branch. Environment: Windows, Node 24.19.0, PostgreSQL 16.13 in the existing local test container, Chrome through Playwright. Previous feature-branch results stay in [hardening evidence](hardening-evidence.md); they must not be renamed final-main results.

The first staging attempt passed 116 client tests, then encountered database connection failures because the existing `toktickit-lab4-test` container was stopped. Its output is retained in `output/release-staging-unit-api.txt`. The existing container was restarted; no replacement container or working-database reset was used. The failed attempt is not a passing result.

| Command | Result | Local ignored evidence |
| --- | --- | --- |
| npm test (client portion) | 19 files, 116 passed | output/release-staging-unit-api.txt |
| npm run test --workspace server (rerun after container restart) | 40 files, 574 passed | output/release-staging-server-rerun.txt |
| npm run test:e2e | 18 passed; includes historical mocked UI cases | output/release-staging-browser.txt |
| npm run test:e2e:lab3 | 14 real-browser tests passed | output/release-staging-browser3.txt |
| npm run test:e2e:lab4 | 20 real-browser tests passed | output/release-staging-browser4.txt |
| npm run build | Client and server passed | output/release-staging-build.txt |
| npm run prisma:validate | Passed | output/release-staging-prisma.txt |

Browser configs ran sequentially to avoid sharing their service ports. The Lab 4 run refreshed Actions Taken and Ticket workflow screenshots used by the report. The cross-page UI gallery remains the 2026-09-29 audit at a36b6ac, whose application code is identical to e484d28. Results above are staging evidence, not final-main checks. The client did not require a second run because its successful execution was independent of the stopped PostgreSQL service.

## Historical first-release main verification, 2026-10-04

Assistant-run final-main verification on 2026-10-04 used `6d2b37d2a96d42e30f88d40f3e8699fd9eb926a3`, the actual peer-merged release commit. Environment: Windows, Node v24.19.0, postgres (PostgreSQL) 16.13, Chrome via the existing Playwright configs. Docker Desktop was stopped initially; it was started and the existing toktickit-lab4-test container was restarted. No replacement test container or working-database reset was used. All six commands exited 0. Fixtures use owned random schemas and temporary storage in the allowlisted local test database.

| Command | Observed result | Start UTC | Finish UTC | Local ignored full output |
| --- | --- | --- | --- | --- |
| npm test | 19 client files / 116 passed; 40 server files / 574 passed | 2026-10-04T15:23:41.785Z | 2026-10-04T15:31:24.620Z | output/release-main-unit-api.txt |
| npm run test:e2e | 18 passed; includes historical mocked cases | 2026-10-04T15:31:24.623Z | 2026-10-04T15:33:16.640Z | output/release-main-browser.txt |
| npm run test:e2e:lab3 | 14 real-browser tests passed | 2026-10-04T15:33:16.643Z | 2026-10-04T15:35:15.348Z | output/release-main-browser3.txt |
| npm run test:e2e:lab4 | 20 real-browser tests passed | 2026-10-04T15:35:15.350Z | 2026-10-04T15:38:22.566Z | output/release-main-browser4.txt |
| npm run build | Passed | 2026-10-04T15:38:22.570Z | 2026-10-04T15:38:37.218Z | output/release-main-build.txt |
| npm run prisma:validate | Passed | 2026-10-04T15:38:37.223Z | 2026-10-04T15:38:40.176Z | output/release-main-prisma.txt |

Browser configurations ran sequentially. The real Lab 3/Lab 4 suites refreshed screenshots on this main commit. The earlier 144-capture cross-page gallery is explicitly historical (2026-09-29); application code is identical, but its screenshots are not renamed as freshly captured main evidence. The default browser suite includes mocked cases; the dedicated Lab 3/Lab 4 suites use actual login/API/database fixtures.

These checks verify main application behavior; they do not claim physical-device, Safari/iOS, real browser zoom, or complete screen-reader testing. Current documentation/PDF review and final all-Done Project evidence remain separate completion gates.

## Evidence register

Assistant-run integrated-main verification on 2026-10-05 used `50b84924de3c265a9ae587257afea92d52b22a1c`, the actual peer-merged PR #73 commit. Client/server/E2E application files are identical to the earlier tested main 6d2b37d; the reviewed preview cleanup correction and reporting evidence are now integrated. All six commands below were nevertheless run freshly on this main commit and exited 0. Environment: Windows, Node v24.19.0, PostgreSQL 16.13 in the existing toktickit-lab4-test container, Chrome through the repository Playwright configurations. Docker Desktop and that existing container were started; no replacement container or working-database reset was used.

| Command | Observed result | Start UTC | Finish UTC | Local ignored full output |
| --- | --- | --- | --- | --- |
| npm test | 19 client files / 116 passed; 40 server files / 574 passed | 2026-10-05T04:06:28.628Z | 2026-10-05T04:12:42.888Z | output/release-final-main-unit-api.txt |
| npm run test:e2e | 18 passed; includes historical mocked cases | 2026-10-05T04:12:42.890Z | 2026-10-05T04:14:01.031Z | output/release-final-main-browser.txt |
| npm run test:e2e:lab3 | 14 real-browser tests passed | 2026-10-05T04:14:01.034Z | 2026-10-05T04:15:40.977Z | output/release-final-main-browser3.txt |
| npm run test:e2e:lab4 | 20 real-browser tests passed | 2026-10-05T04:15:40.979Z | 2026-10-05T04:18:30.575Z | output/release-final-main-browser4.txt |
| npm run build | Client and server passed | 2026-10-05T04:18:30.576Z | 2026-10-05T04:18:40.053Z | output/release-final-main-build.txt |
| npm run prisma:validate | Passed | 2026-10-05T04:18:40.055Z | 2026-10-05T04:18:42.116Z | output/release-final-main-prisma.txt |

Browser configurations ran sequentially and refreshed the real Lab 3/Lab 4 screenshots. Dedicated real suites use actual authentication/API/database fixtures; the default browser suite includes historical mocked cases. The earlier 144-capture cross-page audit remains historical, with physical-device, Safari/iOS, real browser zoom and complete screen-reader limitations stated explicitly.

## Completion gates

- [x] #63 student UI approval, peer approval and merge verified.
- [x] #63 Issue closed; Issue and PR Project items Done.
- [x] #64 scope/AC read; branch created from updated staging; status Started.
- [x] Student confirmed the edited reflection on 2026-10-04.
- [x] Actual reciprocal Lab 4 review links/account/replies verified on 2026-10-04: Atip-Infa/toktickit PRs #61-#70, reviewer/merger zerotwobook; exact comments, responses and commits in reviewer.md.
- [x] Student accepted document/review-record corrections and authorized continuation on 2026-10-04.
- [x] Documentation [PR #71](https://github.com/BOOky-OS/toktickit/pull/71) opened into lab4-staging with Atip-Infa requested, author assigned, documentation label, Lab 4 milestone, Project PR Review status and real Development link to #64.
- [x] Atip-Infa approved current documentation head b860122 and merged PR #71 at e2f9979 on 2026-10-04; PR item Done verified.
- [x] Updated pre-release documents and report prepared for student inspection after documentation merge.
- [x] Student answered the exact pre-main question on 2026-10-04: "ไม่มีแล้วไปต่อได้เลย" (no further document changes; proceed).
- [x] Release [PR #72](https://github.com/BOOky-OS/toktickit/pull/72) opened into main with Atip-Infa requested, BOOky-OS assigned, enhancement/documentation labels, Lab 4 milestone, real Development link to #64, and both Project items in PR Review.
- [x] Atip-Infa approved current head 530eead and merged release PR #72 into main at 6d2b37d; PR item Done verified.
- [x] Required checks passed on actual main SHA 6d2b37d on 2026-10-04; complete logs, review and merge evidence recorded.
- [x] Student accepted the follow-up pre-main gate on 2026-10-04; [PR #73](https://github.com/BOOky-OS/toktickit/pull/73) opened with complete sidebar metadata and both Project items PR Review.
- [x] Atip-Infa approved 2d13733 and merged PR #73 at 50b8492 on 2026-10-05; PR item Done.
- [x] All six required commands passed freshly on integrated main 50b8492; full outputs and refreshed screenshots recorded.
- [ ] Final tracked-document completion record is accepted and integrated through the authorized workflow.
- [ ] Final PDF is regenerated, every page inspected, links checked and final Project evidence captured.
- [ ] #64 is closed and Done only after its release/evidence AC are complete.

Documentation PR #71 and release PR #72 are both peer-approved and merged. Their author approval and post-merge replies already exist; duplicate comments are unnecessary. The evidence follow-up PR #73 is also peer-approved and merged; its actual replies already exist. The final post-merge completion record and submission audit are the remaining gates.

## Historical documentation merge handoff, before release PR #72

PR #71 is merged into lab4-staging at e2f9979, with approval covering b860122. Its Project item is Done; #64 remains open and Started for release preparation. Review/comment links and exact replies are in reviewer.md. The updated report is still a pre-release draft: final-main tests, release review/merge and final all-Done board evidence can only be recorded after those events.

## Student confirmations and Issue closure

Before release PR #72, the assistant asked: "เอกสารเสร็จครบแล้วหรือยัง มีอะไรต้องการแก้ก่อนขึ้น main ไหม?" The student answered: "ไม่มีแล้วไปต่อได้เลย" on 2026-10-04. The peer then approved and merged the release.

GitHub closed #64 automatically on that merge, despite the requested manual completion gate. The assistant reopened it before final verification and kept it Started. PR #73 also auto-closed #64; it was reopened for the final audit. Before any further closing-reference PR merge, check Settings > General > Issues > Auto-close issues with merged linked pull requests is OFF. No change to that setting is claimed. Close #64 only after the remaining documentation/submission evidence passes.

## Preview shutdown correction found during evidence capture, 2026-10-04

The main runtime suites passed before this additional preview check. Starting the isolated preview succeeded, but stopping it failed because the script left DATABASE_URL pointing at its disposable fixture before calling fixture.dispose(). The safety guard correctly rejected treating that database as the working database. The preview script now retains the initial DATABASE_URL and restores/deletes it before cleanup, matching the existing E2E cleanup pattern.

A real start, login/capture and Ctrl+C stop was repeated after the fix. The new owned schema was removed, all pre-existing schemas were preserved, and ports 3008/5178 were released. The Windows terminal returned an interruption exit status of 1; there was no application cleanup exception. The first failed preview fixture was identified using the exact captured seed timestamp and 16-Ticket/6-user fingerprint, then only that owned test schema was removed. Local evidence: output/preview-cleanup-evidence.json and output/preview-cleanup-evidence.txt. The student accepted this correction; Atip-Infa approved and merged it into main through PR #73 at 50b8492 on 2026-10-05. Client/server/E2E application files are unchanged from verified main 6d2b37d.
