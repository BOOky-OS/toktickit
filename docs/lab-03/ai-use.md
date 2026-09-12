# Lab 3 AI Use Record

Assistant used in this session: Codex (GPT-6).
Status: factual preparation and Issues #33-#36 implementation record.
Prompts below are actual short excerpts or exact answers from this conversation,
not invented historical prompts. Dates of earlier excerpts are not inferred.

## Selected prompts and decisions

| # | Actual prompt excerpt / response | AI contribution | Observed verification or student decision |
| --- | --- | --- | --- |
| 1 | "อ่านให้เข้าใจทุกอย่างก่อนทำนะและอย่าพึ่งทำนะ" | Read all 18 Lab 3 pages, sample images, source, migrations, tests and prior docs | Assistant read files; no implementation then. This does not claim the student ran tests. |
| 2 | "ลองอ่านอันนี้ไว้ด้วย" (with GITHUB_WORKFLOW_AI_GUIDE(1).md) | Read workflow guide and compare local Git history | Established reviewer merge, replies, actual PR linkage and live Kanban rules. |
| 3 | "สรุปมาให้หน่อยได้ไหมว่า Lab 3 ต้องทำอะไรบ้างมีกี่ issue" | Explained that the handout fixes no Issue count and proposed ten work packages | Student subsequently authorized starting that plan. |
| 4 | "ขอทำเอกสารให้เสร็จก่อนที่ขึ้นไปบนmain" | Added a distinct student documentation confirmation gate | Recorded in Issue #41 and workflow.md; release approval has not occurred. |
| 5 | "อย่าลืมกฎการทำให้ดีว่าต้องสร้าง branch ใหม่ในการทำ lab 3" | Checked repo/account/board/reviewer history; created staging and contract branches and real Issues | GitHub creation output and local Git state are tool evidence, not peer approvals. |
| 6 | "Admin จัดการผู้ใช้และดู Ticket; IT Staff แก้ไข Ticket" | Resolved handout ambiguity by drafting read-only Admin Ticket permissions | This was an explicit student answer; matrices and tests use this decision. |
| 7 | "โอเคนั้นเริ่มทำต่อได้เลย" | Recorded full-contract confirmation after the student asked whether it follows the original Lab 3 sheet | Student confirmation received at that point; later contract approval/merge is recorded in reviewer.md. The main gate remains pending. |
| 8 | "โอเคเพื่อน merge แล้ว" | Verified the peer merge and author response, closed #32, then implemented #33 on a new branch | Real PostgreSQL migration/seed tests and client/server regression passed; no working database reset or user-performed testing is claimed. |

## Critical evaluation during preparation

- Explicit handout exclusions override sample screenshots containing Service
  Actions or email reset controls. Those controls are excluded from the contract.
- The source code, not only README claims, establishes the baseline. Existing
  client submission retries regenerate keys; existing mocked tests alone do
  not prove concurrent DB behavior. Planned regression adds explicit evidence.
- Admin's read-only role was asked about rather than silently granting staff
  privileges. Assignment eligibility and authorization are documented separately.
- Password/session proposals were checked against Node crypto and OWASP primary
  documentation linked in specification.md. Specific lab durations/limits are
  student-confirmed decisions; the peer subsequently approved the contract and merged it.
- Planned tests are not marked Pass. No Lab 3 runtime, DB upgrade, peer review
  or final-main verification is claimed at the specification stage.
- The final-main documentation gate remains pending regardless of earlier
  permission to start coding.

## Issue #33 observed verification and decisions

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

## Issue #34 observed verification and decisions

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

## Issue #35 observed verification and decisions

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
## Issue #36 observed verification and decisions

- Actual continuation prompt: "เน€เธเธทเนเธญเธ merge เน€เธชเธฃเนเธเนเธฅเนเธงเนเธเธ•เนเธญเนเธ”เนเน€เธฅเธข". The AI first
  verified PR #45 approval/merge and continued on the dedicated Issue #36 branch
  from the peer-merged `lab3-staging` head.
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

## My Reflection

Pending the student's own reflection after using and reviewing the work.
Do not turn this placeholder into first-person claims about tests, decisions
or reviews the student has not actually performed. Final submission requires
a brief student-authored or student-confirmed reflection on specification-agent
and coding-agent use.

## Record maintenance

Update on the same Issue branch as the related work. Keep 6-10 representative
real prompts for final submission; replace repetitive examples if needed while
preserving accuracy. Separate assistant tool checks, student decisions and
independent peer-review evidence.

## Issue #37 observed verification and decisions

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

## Issue #38 observed implementation and decisions

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
## Issue #39 observed implementation and decisions

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
## Issue #40 observed implementation and decisions

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