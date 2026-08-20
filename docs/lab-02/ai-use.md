# Lab 2 AI Use Record

**LLM/agent used:** OpenAI Codex (GPT-5)

| # | Actual prompt/task | AI assistance | Human-verifiable evidence |
| --- | --- | --- | --- |
| 1 | Read and reread the complete Lab 2 sheet. | Extracted deliverables, constraints, UI states, and workflow requirements. | Contract documents were reviewed before implementation. |
| 2 | Read the GitHub workflow guide. | Applied branch, Project, PR, reviewer, and merge sequence. | Issues #1;�u���S#17 and PRs #19�w^~)�w#25 show the resulting history. |
| 3 | Complete Issue #11. | Drafted the specification, API/UI contracts, data decisions, and test plan. | PR #19 was peer-approved and merged. |
| 4 | Continue Issues #12�w^~)�w#14. | Implemented Requester/reference data, Ticket creation, and Attachment APIs. | PRs #20�w^~)�w#22, migrations, and server tests. |
| 5 | Continue Issues #16��y��y�#17. | Implemented Create Ticket, My Tickets, Ticket Detail, and Attachment controls. | PRs #22��y��y�#25, client tests, and peer reviews. |
| 6 | Keep providing review/reply/post-merge comments. | Drafted three factual comment templates at each review point. | GitHub review and Issue history. |
| 7 | Continue Issue #18. | Added Playwright responsive/E2E evidence and final traceability. | `e2e/lab-02/responsive-visual.spec.ts` and nine screenshots. |
| 8 | Audit the real integrated application. | Diagnosed an upload 500 that isolated mocks missed. | Fixed invalid Prisma Attachment create data and added regression coverage. |

## Critical-thinking record

- Contract decisions such as validation limits, pagination, Ticket Number format, idempotency, error statuses, and Attachment compensation were recorded before implementation.
- The Development Requester selector is explicitly a test context, not authentication.
- AI statements were not treated as completion evidence; local database runs, automated tests, browser E2E, screenshots, peer approvals, and merge commits were checked.
- A real-database upload failure demonstrated the limitation of mock-only tests. The payload fix was accepted only after unit/API/UI/build/E2E reruns.

## Reflection

AI accelerated requirements analysis, implementation, and workflow bookkeeping, but verification remained essential. The final integration pass found a schema/payload mismatch that TypeScript and mocked API tests did not expose. Combining peer review with real PostgreSQL, browser automation, responsive screenshots, and regression assertions produced stronger evidence than any single tool or AI response.
