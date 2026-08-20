# Lab 2 - AI Use Record

**LLM/agent used:** OpenAI Codex (GPT-5)

## Current record

AI is being used to interpret the Lab 2 sheet, cross-check the persistent
GitHub workflow, inspect the repository, and draft a testable engineering
contract. The student must review source material, repository state, generated
documents, test results, and GitHub review rather than treating an AI statement
as proof of completion.

| # | Actual prompt / task | AI assistance | Verification and decision |
| --- | --- | --- | --- |
| 1 | "ลองไฟล์นี้แล้วสรุปเก็บไว้เองว่าต้องทำอะไรบ้าง" | Read and summarized the Lab 2 sheet. | The full 22-page PDF was reread before planning. |
| 2 | "ลองอ่านอีกรอบได้ไหมเผื่อตกพลาดจุดไหนไป" | Performed a second requirements and UI-reference audit. | Added the missing evidence, responsive, reviewer, and Attachment details to the checklist. |
| 3 | "อ่านไฟล์อันนี้ไว้ด้วยนะ" | Read the persistent GitHub workflow guide. | Applied its stated priority: current Lab sheet overrides generic workflow rules. |
| 4 | "โอเคบอกมาสิว่าขั้นแรกต้องทำอะไรบ้าง" | Proposed a no-code-first setup sequence. | Repository/GitHub state was then inspected before creating Lab 2 work. |
| 5 | "โอเคทำให้หน่อยที่บอกมา" | Created the Issue breakdown and drafted the engineering contract. | `main`, Project statuses, closed Lab 1 work, and the current branch were verified first. |

## Critical-thinking record

- The contract makes explicit choices the handout leaves open, including
  validation limits, pagination values, Ticket Number format, idempotency,
  error statuses, and Attachment compensation.
- The choices are recorded in the contract documents before implementation and
  must be reviewed against the Lab sheet before feature work begins.
- The Development Requester selector remains visibly separate from real
  authentication. Later tests still prove requester data isolation.
- Expand this table to 6-10 selected actual prompts as Lab 2 progresses. Do not
  invent prompts, verification, reviews, or results.

## Reflection (in progress)

AI reduced a long specification into a traceable contract and exposed decisions
that need deliberate review. Its output still requires human verification
against actual code, tests, GitHub review, and visual evidence.
