# Lab 3 AI Use Record

Assistant used in this session: Codex (GPT-6).
Status: factual preparation record; feature implementation has not started.
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
| 7 | "โอเคนั้นเริ่มทำต่อได้เลย" | Recorded full-contract confirmation after the student asked whether it follows the original Lab 3 sheet | Student confirmation received; independent peer approval/merge and the later main gate remain pending. |

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
  student-confirmed decisions, still subject to independent peer contract review.
- Planned tests are not marked Pass. No Lab 3 runtime, DB upgrade, peer review
  or final-main verification is claimed at the specification stage.
- The final-main documentation gate remains pending regardless of earlier
  permission to start coding.

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
