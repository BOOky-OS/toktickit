# Lab 4 release preparation

## Current state - 2026-10-04

Issue #64 is open and Started for release preparation on `docs/64-lab4-final-release`, based on staging `e2f997942f8d3dc55a11ecede0c036021f78b8fd`. Atip-Infa approved documentation head `b860122` and merged PR #71 on 2026-10-04. The PR Project item is Done. Application/test code is unchanged from `e484d28`; staging suites were last run on 2026-09-30. The student accepted the edited documents and reflection before the documentation peer handoff. No Lab 4 release to main is claimed.

## Reviewable package

- [Report source: Answer Part 1 through Answer Part 9](report.md).
- [Actual peer reviews and replies](reviewer.md).
- [AI use and reflection](ai-use.md): eight real paraphrased prompts; personal reflection accepted by the student on 2026-10-04.
- [Contract](specification.md), [API](api-spec.md), [UI/checklist](ui-spec.md), [test traceability](tests.md).
- [Migration, seed and recovery](migration.md), [UI audit](ui-audit.md), [preview instructions](ui-review.md), [README](../../README.md).
- Generated report: `output/pdf/toktickit-lab4-review.pdf`. It is a review draft, not a final submission. Output, screenshots and temporary files remain ignored.

The report generator is `node scripts/lab4-report.cjs`. It reads the Markdown sources and existing local screenshots. Install project dependencies and Chrome first. Missing screenshots fail generation rather than silently disappearing. Rebuild and inspect the PDF whenever evidence changes.

## Evidence register

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
- [ ] Student answers the separate explicit pre-main question in skill.md.
- [ ] Atip-Infa reviews and merges the release PR into main.
- [ ] Required checks execute on the actual final-main SHA; final logs and review/merge evidence replace draft status.
- [ ] Final PDF is regenerated, every page inspected, links checked and final Project evidence captured.
- [ ] #64 is closed and Done only after its release/evidence AC are complete.

The documentation peer review and merge are complete. Actual #71 author approval and post-merge replies already exist; duplicate comments are unnecessary. The separate pre-main student confirmation remains pending.

## Documentation merge handoff

PR #71 is merged into lab4-staging at e2f9979, with approval covering b860122. Its Project item is Done; #64 remains open and Started for release preparation. Review/comment links and exact replies are in reviewer.md. The updated report is still a pre-release draft: final-main tests, release review/merge and final all-Done board evidence can only be recorded after those events.
