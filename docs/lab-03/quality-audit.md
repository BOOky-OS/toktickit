# Lab 3 quality and release audit (#41)

## Final-main verification - 2026-09-14

Atip-Infa approved [release PR #54](https://github.com/BOOky-OS/toktickit/pull/54) at `e233f8e8a03fc759497f0a75ec12905a9b9e776c` and merged it on 2026-09-14 at 07:11:43 UTC.
The assistant ran server, client, build, schema and real E2E checks on clean released main `f40134124261d2861d7f480adec34f074561fc94`. Mocked browser suites were repeated while preparing documentation to recover complete output; application and test code remained identical to that commit.

| Command | Observed result |
| --- | --- |
| `npm test --workspace server -- --maxWorkers=1` | 445/445 passed; 27 files; 114.80 s |
| `npm test --workspace client -- --maxWorkers=1` | 82/82 passed; 13 files; 54.97 s |
| `npm run build` | Client and server builds passed |
| `npm run prisma:validate` | Schema valid |
| `npm run test:e2e:lab3` | 14/14 passed; 1.0 min; 36 full-page captures plus six report regions regenerated |
| `npx playwright test --config playwright.queue.config.ts` | 3/3 passed; 8.3 s; mocked API |
| `npx playwright test --config playwright.operations.config.ts` | 3/3 passed; 9.0 s; mocked API |
| `npx playwright test --config playwright.communication.config.ts` | 3/3 passed; 10.4 s; mocked API |
| `npx playwright test --config playwright.users.config.ts` | 3/3 passed; 8.8 s; mocked API |

Environment: Windows, Node 24.19.0, npm 11.17.0, PostgreSQL 16.13, Vitest 4.1.10.
Database tests used isolated `toktickit_lab3_test`; real E2E used its own schema, storage and ports 3006/5176. No working database reset or provisioning occurred.

The default legacy `npm run test:e2e` was not run: its Lab 2 visual suite expects the retired Development Requester selector. Lab 3 authenticated Requester regression is covered by the real E2E command above. Historical dated results below remain evidence of their earlier commits, not additional executions on main.

Final documentation is prepared on `docs/41-final-main-evidence`. PR #54 is Done. Issue #41 was reopened after automatic closure and remains Open / Started until this evidence is reviewed and integrated. No final all-Done board or actual coursework submission is claimed.

## Final report verification - 2026-09-14

Generated `output/pdf/Lab_03_Evidence_Supapanya_Yathip_67070503443_FINAL.pdf` from the latest evidence and regenerated real-browser screenshots. All nine pages were rendered and visually inspected: Answer Parts 1-9 remain ordered, text and tables fit, and report regions are readable. All 36 full-page captures were also inspected using six contact sheets. The older DRAFT PDF is historical.

Remaining: student gate for this documentation update, peer integration, and final completed Project evidence. The release itself and application verification are complete. Do not claim final coursework submission or an all-Done board before they exist.

## Historical audit checkpoints

Current documentation branch: `docs/41-final-reflection-evidence`, based on peer-merged staging `75bd6d3`.
Implementation audit history below was recorded on `feature/41-lab3-quality-release`.
This is an in-progress audit, not release approval or final-main evidence.

## Documentation follow-up - 2026-09-14

Latest release checkpoint: the student explicitly approved proceeding to main on 2026-09-14, including addition of the PR #52 review record. PR #52 was approved at `75d65ff` and peer-merged as `4fc4859`. The latest record is on `docs/41-release-review-record` for peer integration before the release becomes ready. The regenerated PDF has nine visually inspected pages and 20 link annotations. No new application execution is claimed. Earlier gate-pending statements below describe the previous checkpoint; workflow.md records the current authorization.

PR #51 was approved at e0a9c75 and peer-merged as 75bd6d3. The revised reviewer record includes ten authored PRs and nine reciprocal reviews, with both partner responses grouped under each partner PR. Partner PR #41 retains a factual note about its title/review and Issue/branch mismatch.

AI-use prompts 3 and 6 now describe reading skill.md for workflow reminders and requesting help fixing errors. The PDF was regenerated on 2026-09-14 and all nine pages were rendered and visually inspected. Parts 1-9 remain in order with current review evidence and AI-use prompts. No application tests were rerun for this documentation-only change.

The historical updater at artifacts/update-lab3-audit-docs.py now exits before writing files, preventing stale data from overwriting current documents. That helper is ignored local tooling.

Remaining prerequisites are peer integration of these documentation corrections, then the explicit student gate before any main PR. Final-main checks and submission evidence must be recorded after the actual release.

## Real browser execution details

Run from the repository root with an explicitly supplied, isolated
`TEST_DATABASE_URL` pointing to the local `toktickit_lab3_test` database:

```powershell
npm run test:e2e:lab3
```

`playwright.lab3.config.ts` starts a dedicated Vite instance on port 5176.
`e2e/lab-03/real/setup.ts` applies the real migrations to an owned random schema,
creates test-only credentials, starts the real Express app on port 3006, and
uses an owned temporary attachment directory. Teardown disconnects the app,
drops only that schema and removes only that directory. Existing services are
never reused. The legacy Playwright configuration excludes this suite.

These tests use browser cookies, the actual HTTP endpoints, Prisma/PostgreSQL
and disk storage. They do not fulfill API calls with mocked success responses.
The expiry test deliberately changes only its own persisted session expiry.
Test credentials are disposable fixtures, not student passwords or provisioning
instructions for the working database.

## Observed checks (2026-09-12)

| Check | Observed result |
| --- | --- |
| Final expanded real Chrome suite | 14/14 passed, 1.4 min; no skips |
| Server regression after resuming the interrupted session | 220/220 in 24 files, 125.29 s |
| Added authorization contract suite | 14/14 separately, 944 ms; not claimed as one combined 234-test run |
| Client regression including status contrast | 82/82 in 13 files, 53.57 s; contrast case rerun after type/import adjustment: 1/1, 1.05 s |
| Client/server production builds | Passed after fixing TypeScript test imports and conditional password labels |
| Prisma validation | Passed |
| Initial responsive regression before fix | Failed for long unbroken Description in all three roles |
| Responsive checks in final E2E | Pass: three screen sizes, long text, keyboard/focus and 200%-equivalent CSS reflow |

These checks run on the audit working tree, not main. The latest tiny
programmatic-required attribute is validated with the focused final checks.
The previous server process result was unavailable after interruption; a new
full server execution established the result above.

## Corrections found by the audit

- Long unbroken Ticket descriptions overflowed the detail grid. Shared detail
  cells now allow shrinking and wrap text while retaining line breaks. The real
  browser regression uses a long persisted description for all three roles.
- The create-user Initial password was outside the form after Save. It now sits
  before Save inside the form and is programmatically required.
- Requested Priority and IT Priority used plain text in the Staff desktop queue
  and Ticket Detail; smaller queue cards also lacked status badges. These now
  reuse the existing readable Zen badge styling. All eight statuses use the
  specified palette groups, with contrast of at least 4.5:1 and visible text.

## Screenshot evidence

Generated images: `artifacts/lab-03/screenshots/real/` (ignored runtime evidence).
Screen groups: login, mandatory password, Requester home/create/detail, Staff
home/detail/confirmation, Administrator home/create/edit-reset/detail. Each has
desktop (1440x900), tablet (834x1112), and mobile (390x844) images.

All 36 regenerated captures were reopened and inspected individually. The
desktop workspace now uses the available width, the Staff Queue ticket number
stays on one line, Ticket Detail uses distinct operational/communication/file
panels, and paired Staff/Admin communication panels share a desktop row.
Requester mobile results fit as a three-column table. The Admin editor appears
before the user list on tablet/mobile, and user cards use a compact two-column
fact layout. The checklist in ui-spec.md distinguishes native-dialog stitched
captures and 200%-equivalent reflow from true OS zoom.
This is assistant visual inspection. Atip-Infa subsequently approved PR #51 at `e0a9c75` and merged it into staging as `75bd6d3`.

The PDF draft is generated by `scripts/build_lab03_evidence.py` from local
captures and factual records. It is explicitly incomplete for submission until
the documentation corrections are peer-integrated and later release evidence exists. The AI-use
reflection now follows the student's stated usage and is included in the PDF.

## Remaining work before the documentation gate

- Reciprocal reviews of Atip-Infa PRs #37-#45 are verified under `zerotwobook` and recorded in reviewer.md, including both partner replies.
- Commit/push and peer-integrate the current local document/test/report updates;
  the PDF explicitly identifies GitHub document links as staging snapshots.
- Complete and peer-review the documentation follow-up PR, including the real Development
  Issue link, reviewer, assignee, labels, milestone and Project information.
- Ask the student the explicit documentation/main question and wait before
  preparing the staging-to-main release PR. Issue #41 remains open until the
  subsequent reviewed release, final-main verification and submission evidence.

The standing gate is: **เอกสารเสร็จครบแล้วหรือยัง มีอะไรต้องการแก้ก่อนขึ้น main ไหม?**
It has not been approved for this release. No release PR or main merge is
authorized by the test results above.

## Final local artifact checks

The PDF has nine pages with Answer Part 1 through Answer Part 9 in order and 19
link annotations. Every rendered page was inspected; form captures were changed
to complete element regions to avoid clipped controls. It remains a draft, with
explicit missing human and final-main evidence. Focused final UI checks passed
8/8 (6.79 s). After the proportional-layout revision, the client suite passed
82/82 in 13 files and the responsive/region-capture run passed 4/4 in 18.7 s.
That run regenerated all 36 desktop/tablet/mobile full-page captures.

The earlier search under BOOky-OS missed reciprocal reviews. Direct partner PR links subsequently verified nine approvals and merges under zerotwobook; see reviewer.md.

## Traceability follow-up - 2026-09-13

Corrected API-04/API-07 references to the implemented Admin and Requester tests.
Added a real-login domain authorization matrix (195 cases) and safe-error
regressions (16 cases) for API-06/API-25. The matrix distinguishes allowed
validation/lookup responses from successful mutations in the domain suites.

Full server regression on `b32dd4b` plus the local audit changes passed
**445/445 in 27 files, 134.25 s**, with no skips. Server TypeScript build and
Markdown whitespace checks passed; every traceability-table evidence path exists.
See [tests.md](tests.md) for named cases, commands, environment and initial test
fixture corrections. No application code changed in this follow-up. These results
supersede the earlier separate server counts for this working tree, not for main.
The PDF was subsequently regenerated with these results; see the synchronization record below.

## Historical PDF synchronization - 2026-09-13

Regenerated the stable `output/pdf/Lab_03_Evidence_Supapanya_Yathip_67070503443_DRAFT.pdf`.
Answer Part 1 reflects the verified PR #42-#50 review/response evidence and the
PR #42 approval-head distinction. Part 3 records 445/445 server tests and the
API-04/06/07/25 correction, with earlier client/browser results kept separate.
Part 4 follows the current eight AI-use paraphrases and reads My Reflection
directly from `ai-use.md` to avoid a stale placeholder.

All nine rendered pages were visually inspected after generation. Verified
Answer Parts 1-9 in order, 19 PDF links, current test counts and removal of the
old reflection placeholder. Screenshots retain their original capture evidence;
no new browser execution is claimed. The PDF remains a pre-release draft because
reciprocal review, peer integration, the explicit main gate and final-main
release/verification evidence are still outstanding.
