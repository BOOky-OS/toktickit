# Lab 3 - AI Use and Reflection

**LLM/agent used:** OpenAI Codex (GPT-6)

I use AI as an assistant to summarize lab documents, help write code, and solve technical problems. I ask it to explain what the lab requires, organize the work into smaller steps, and help with code that involves unfamiliar programming concepts. I also use it to explain errors, suggest fixes, check the implementation, and organize documentation within the GitHub workflow.

For Lab 3, AI assisted with both the specification and the implementation. It read the lab sheet and existing project, helped draft the requirements, and implemented changes and automated checks in the workspace. I provided the project decisions and workflow requirements, including the Admin and IT Staff permissions and the requirement to finish documentation before moving to main. The technical checks recorded below were run by the assistant; independent peer reviews are recorded separately in [reviewer.md](reviewer.md).

## Representative prompts

The prompts below are English paraphrases of actual requests and answers from this Lab 3 conversation, rather than verbatim English quotations.

| # | Prompt I used | How AI helped | My decision or use of the answer |
| --- | --- | --- | --- |
| 1 | Please read the Lab 3 sheet and the workspace code carefully before doing anything. | AI summarized the requirements and inspected the existing project before implementation. | I asked it to understand the original sheet and project first, then authorized implementation later. |
| 2 | Please summarize what Lab 3 requires and how many Issues we need. | AI organized the requirements into ten work packages and explained the proposed sequence. | I used this breakdown to guide the work and asked the assistant to continue step by step. |
| 3 | Please read the GitHub workflow guide and follow the workflow used in previous labs. | AI checked the guide and repository history and helped organize branches, Issues, PRs, and review steps. | I required a separate Lab 3 branch, peer review, and complete PR sidebar information, including the linked Issue. |
| 4 | Admin should manage users and view Tickets; IT Staff should edit Tickets. | AI translated this answer into the permission specification, implementation, and authorization checks. | I chose this separation of responsibilities when the assistant asked about the role ambiguity. |
| 5 | Does the specification follow the first lab sheet I provided? | AI checked the specification against the original requirements. | I asked for this confirmation before telling it to continue implementation. |
| 6 | Please continue the work from where the previous session stopped. | AI checked the existing branch and progress, continued code changes, and investigated technical failures encountered during implementation and testing. | I directed it to continue the existing work and preserve the agreed GitHub workflow. |
| 7 | Please check whether anything is still missing before we continue. | AI reviewed code, tests, documentation, and release evidence, and identified remaining work. | I used the progress explanation to understand what still needed attention before the final stage. |
| 8 | Please finish the documentation before moving to main and ask whether I want any changes first. | AI recorded a documentation confirmation step before release. | I required this checkpoint and requested changes to the AI-use document before proceeding. |

## Critical-thinking

I use AI to make long instructions easier to understand and to help with coding and technical troubleshooting. Its suggestions still need to match the lab sheet, the existing code, and the agreed requirements. For example, I clarified that Admin should manage users and view Tickets while IT Staff handles Ticket changes, instead of leaving the permission decision to the assistant.

Technical results also need evidence. During the final audit, real browser tests exposed a long-description layout problem that earlier checks had not resolved. AI helped fix the layout and rerun the affected checks. This showed why checking the working application matters in addition to reading code or relying on mocked tests. Detailed commands and results are recorded in [tests.md](tests.md) and [quality-audit.md](quality-audit.md).

## My Reflection

AI is useful for turning the lab sheet into a clearer summary and a sequence of tasks. As a specification assistant, it helps connect the requirements to the existing project and brings up unclear points for me to decide. This makes it easier to follow what needs to be built.

As a coding assistant, AI helps write and adjust code, explain errors, and troubleshoot technical problems involving Docker, PostgreSQL, Prisma, authentication, tests, and responsive layouts. It also helps organize the documentation and GitHub workflow. I still need to decide whether the proposed behavior matches the assignment and whether the documents describe the work the way I intend. For this lab, I asked to finish and check the documentation before moving to main.

## Supporting implementation record

The entries below preserve assistant-run checks and decisions from each increment. Statements about pending work describe the stage when that entry was written; see [quality-audit.md](quality-audit.md) and [reviewer.md](reviewer.md) for the consolidated evidence. They do not imply that I or my peer personally ran the assistant's checks.

### Issue #33 observed verification and decisions

- The AI used the actual Lab 2 migration files and separate random schemas in
  an allowlisted test database. The original working database was not migrated.
- Initial positive upgrade tests failed on the missing migration. Negative
  cases were tightened to require the actual preflight diagnostic so a missing
  file cannot produce a false passing test.
- User.seedKey was added as an internal fixture identity to retain email edits.
  Real-DB tests confirm migrated demo users keep their profile, activation and
  null hash; repeat seed retains later password changes and communication.
- The schema change necessarily adapts existing Prisma delegates/removal authors
  and Ticket priority creation. The selector remains temporary until the auth
  increment; this PR does not claim to implement role-based Login or screens.
- The review record distinguishes an existing peer approval of a0a53e6 from the peer's later
  merge of b6933ce. No latest-head re-approval or reciprocal review is invented.

### Issue #34 observed verification and decisions

- Actual continuation prompt: "โอเคไปต่อได้เลย". The AI checked GitHub before
  starting: Atip-Infa approved PR #43 at 8321ca8 and merged a5e23e1; the
  author had posted both approval and post-merge replies. No duplicate reply
  was requested. Issue #33 and both Project items were completed before #34.
- The AI implemented auth and current endpoint guards on the new Issue #34
  branch. No browser login, Staff UI, Admin endpoint or final-main result is
  claimed in this increment.
- Initial DB tests could not connect because Docker was off. After starting
  Docker, the isolated database tests passed. No working database was reset.
- A revocation-between-upload-and-transaction case exposed the need to run
  file compensation before returning typed authorization errors. The fix is
  covered by a real-DB test with observable mocked storage.
- Final checks: server 100/100, client 32/32, both builds and Prisma validation
  passed. Concurrent password changes leave exactly one fresh valid session.
  These are assistant-run checks, not claims that the student or peer ran them.

### Issue #35 observed verification and decisions

- Actual continuation prompts included "โอเคเพื่อนmerge แล้วไปต่อเลย" and
  "ทำต่อจากที่โทเคนหมดให้หน่อย". The AI verified PR #44 approval/merge,
  completed #34 board/Issue evidence, and continued only on the existing #35 branch.
- The client now restores the server identity, keeps CSRF only in module memory,
  uses cookie credentials and removes the old requester selector/context/storage
  path. Requester API functions no longer accept or transport requesterId.
- Reviewing the approved UI spec exposed two edge cases before submission: the
  mandatory password screen needed Logout, and a Login 401 must remain credential
  feedback rather than emit a false expired-session event. Both received tests.
- Client tests passed 48/48 in seven files. Server regression passed 100/100 in
  14 files against only the isolated test database; client/server builds and
  Prisma validation passed. These are assistant-run checks, not student/peer claims.
- Real browser E2E and screenshots remain planned and are not represented as
  passing. No working database migration, reset, seed or provisioning was run.
### Issue #36 observed verification and decisions

- Actual continuation request (English translation): "My friend has finished
  merging; please continue." The AI first verified PR #45 approval/merge and
  continued on the dedicated Issue #36 branch from the peer-merged
  `lab3-staging` head.
- Test-first real PostgreSQL evidence initially produced 11 expected failures
  among 14 focused cases. The implementation then added all-status/literal-search
  queries, complete safe Detail metadata, stable idempotency, row-locked Attachment
  limits, version/audit updates and safe download names.
- Requester browser state now hands failed `File` objects to URL-backed Detail
  for individual retry. It does not claim files survive a full browser refresh.
  The Ticket itself remains persisted and visible after partial upload failure.
- Final assistant-run checks passed: server 114/114, client 54/54, both builds
  and Prisma validation. Server DB tests used only the allowlisted isolated test
  database. Browser E2E/screenshots and final-main verification remain pending.

### Issue #37 observed verification and decisions

- Actual continuation prompt: "ไปต่อได้เลย". Verified PR #46 approval at final
  head fdff03a, peer merge 24b4dd5 and both author replies before beginning #37.
- The assistant implemented Queue queries, active assignees, responsive controls,
  read-only Detail navigation and tests on feature/37-lab3-staff-queue.
- The first focused database attempt failed because Docker was stopped; this is
  an environment failure, not evidence of test-first application failures.
- Review caught a TypeScript-incompatible test query option; it was removed.
  Numeric Queue controls now reject non-decimal forms and have unit coverage.
- Real PostgreSQL API checks and component checks are separate from the three
  Chrome viewport tests, which mock API fixtures. No working DB migration,
  reset, seed or provisioning occurred. Screenshot capture is not manual review.
- Independent peer review and the user's final completed-document/main gate
  remain pending. No comments have been posted on the user's behalf.

### Issue #38 observed implementation and decisions

- Actual prompt: "ไปต่อได้เลย". Verified PR #47 final-head approval, peer merge
  ed33913 and existing author replies; closed #37 and moved both Project items
  Done before branching feature/38-lab3-staff-operations from updated staging.
- The assistant implemented Staff-only mutations, transactional optimistic
  version checks, the eight-state matrix, public history and operational UI.
  Admin remains read-only under the student's confirmed permission choice.
- Actual validation includes all 64 pairs in both unit and real PostgreSQL API
  checks, concurrent claims, rollback on history failure, component conflict
  drafts and Chrome confirmation/reload flows at three viewport sizes.
- Browser fixtures mock API responses; they are not real authenticated DB E2E.
  Screenshot captures are not represented as manual visual inspection.
- No working database migration/reset/seed/provisioning or user-authored comments
  were performed. Peer review and the completed-document/main gate remain pending.
### Issue #39 observed implementation and decisions

- Actual prompt: "ไปต่อเลย". Verified PR #48 approval at dc48634, peer merge
  790a99c and both author replies. Closed #38 and moved its Issue/PR to Done
  before creating feature/39-lab3-comments-notes from updated staging.
- Implemented public/internal streams, backend actor/time, append-only limits,
  atomic entry/version writes, and requester-owned resolution indication.
- UI drafts are independent and content is literal text. Uncertain post failures
  require stream reload before manual retry; no comment idempotency is claimed.
- The first full client run exposed three old Attachment tests without the new
  Comments API fixture. Added an empty stream mock, preserving their assertions.
- Real-DB API checks and mocked browser checks are recorded separately. Browser
  tests exercise all three roles and viewport sizes; screenshot capture is not
  manual visual inspection. No working DB migration/reset/seed/provisioning ran.
- Peer review and the completed-document/main confirmation gate remain pending.
### Issue #40 observed implementation and decisions

- Actual prompt: "ไปต่อเลย". Verified PR #49 approval at 658535f, peer merge
  711f20f and both author replies. Closed #39 and moved its Issue/PR Done
  before creating feature/40-lab3-user-management from updated staging.
- Added minimal Admin users API/UI, normalization, initial password hashing and
  reset, version checks, session revocation and self/last-Admin/active-owner guards.
- Password hashing runs before locking; reset rechecks target version/hash in the
  transaction. Shared advisory locking serializes account and Ticket decisions.
- Added real PostgreSQL concurrent duplicate, Admin-demotion and owner-deactivation
  checks; component/browser checks cover drafts, confirmation and password clearing.
- Browser API fixtures and screenshot captures are not real authenticated DB E2E
  or manual visual inspection. Those remain in the final audit.
- No working DB migration/reset/seed/provisioning or user-authored comments ran.
  Independent peer review and completed-document confirmation before main remain.
### Issue #41 observed audit and decisions

- Actual continuation prompt: "ทำต่อให้หน่อยก่อนหน้านี้โทเคนหมด". The assistant
  retained the existing feature/41-lab3-quality-release work and verified PR #50
  approval/peer merge and author replies. No duplicate author comments were sent.
- Real Chrome tests now use migrated isolated PostgreSQL schemas, actual Express
  sessions and temporary disk storage. Deliberate first-upload network failure
  is distinguished from the successful real retry and persisted byte checks.
- Long unbroken Description text failed the first responsive checks in all roles.
  The assistant corrected detail-grid shrinking/wrapping and reran the regression.
- Required priority/status badges were made consistent in queue/detail displays.
  Initial password now precedes Save inside the create-user form; keyboard checks
  verify that order. These are assistant changes, not invented student actions.
- Representative prompts and a reflection drafted from the student's stated AI use
  appear above. Reciprocal Lab 3 review evidence remains outstanding.
- The ordered PDF is explicitly a pre-release draft. No final-main test result,
  all-Done board, student gate approval or future peer review is claimed.
