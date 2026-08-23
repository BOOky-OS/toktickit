# Lab 2 - AI Use and Reflection

**LLM/agent used:** OpenAI Codex (GPT-5)

I used AI as a learning and troubleshooting assistant, not as a replacement for my own work.
I mainly asked it to summarize the lab, point me to the relevant files, explain technical problems, suggest small code examples or commands, and help me check my work.
I made the final decisions, adapted the suggestions to this project, ran the commands, reviewed the code, and verified the results with tests, the application, and GitHub.

## Representative prompts

The prompts below are short paraphrases of the kinds of questions I asked during the lab.

| # | Prompt I used | How AI helped | What I did and verified |
| --- | --- | --- | --- |
| 1 | Please summarize what Lab 2 requires. Tell me what I need to build, which documents are required, and where each part should be implemented. | AI turned the long lab sheet into a shorter checklist and mapped the requirements to the client, server, Prisma, tests, and documentation folders. | I compared the checklist with the original lab sheet and created Issues #11-#18 before starting the implementation. |
| 2 | For this Issue, explain the acceptance criteria in simple steps and tell me which files I should inspect or change. | AI helped break a large task into smaller steps and suggested relevant files to inspect. | I opened the files myself, decided which changes were appropriate, and checked the completed work against the Issue acceptance criteria. |
| 3 | Docker or PostgreSQL is not working. How do I check whether Docker Desktop, the container, port, database, and Prisma connection are running correctly? | AI explained diagnostic commands and possible causes such as a stopped Docker daemon, an unavailable container, a port conflict, or an incorrect database connection. | I checked Docker and PostgreSQL locally, ran the suggested commands one at a time, and confirmed the database with Prisma validation, migration, and seed commands. |
| 4 | Please explain the GitHub workflow for this lab, including feature branches, `lab2-staging`, Issues, Pull Requests, review, merge, and `main`. | AI explained the purpose and order of the workflow and helped turn it into a repeatable checklist. | I checked the branch and PR targets on GitHub, requested peer review, recorded the merge evidence, and closed each Issue only after its PR was merged. |
| 5 | This code or test is failing. Please explain the error, identify the likely cause, and suggest the smallest code change or a small example I can try. | AI helped interpret error messages, trace the related code path, and propose focused snippets instead of replacing the whole implementation. | I read the surrounding code, adapted only the relevant suggestion, reran the affected test, and then ran the wider test suite to check for regressions. |
| 6 | Please help me check whether the Requester ownership rules, Ticket API, filters, sorting, and Attachment behavior match the specification. | AI helped compare the implementation with the contract and highlighted cases that needed tests or additional verification. | I checked the API responses, database behavior, UI states, and automated tests against the specification and acceptance criteria. |
| 7 | The real Attachment upload returns HTTP 500 although the mocked tests pass. How can I trace the request and Prisma create data to find the mismatch? | AI helped narrow the problem to the data passed between authorization logic and Prisma persistence. | I confirmed that `requesterId` was incorrectly included in the Attachment create payload, applied a focused fix, added regression coverage, and reran server, client, build, and E2E checks. |
| 8 | Which commands should I run to verify unit, API, UI, responsive, and E2E behavior, and what evidence should I keep? | AI suggested an organized verification sequence and evidence checklist. | I ran Prisma validation, client and server tests, the production build, and Playwright at desktop, tablet, and mobile sizes. I kept the factual results and screenshots in the repository. |
| 9 | Please help me review my friend's Pull Request by explaining what code, tests, acceptance criteria, and risks I should check. Help me draft a clear review comment after I inspect it. | AI helped organize the review points and draft concise wording for review comments and replies. | I checked the actual PR diff and test evidence before submitting or adapting any comment. I only recorded reviews and responses that exist on GitHub. |
| 10 | Please check my Lab 2 documentation for missing evidence, broken links, stale status text, or statements that cannot be verified. | AI helped identify documentation gaps and organize the final evidence. | I checked the links, PR and Issue states, test results, screenshots, and merge commits before accepting the documentation changes. |

## Critical-thinking record

- I treated AI suggestions as possible approaches, not as proof that the work was correct.
- I used the lab sheet, Issue acceptance criteria, source code, terminal output, tests, screenshots, peer reviews, and merge commits as the evidence.
- I preferred small, understandable changes when troubleshooting code rather than copying a large replacement.
- I checked commands before running them and avoided destructive Git or database actions that were not required.
- When mocked tests did not reveal the real Attachment upload failure, I tested the integrated application with PostgreSQL and added a regression test for the actual defect.
- I did not create peer-review evidence that was not present in a real Pull Request or GitHub comment.

## Reflection

AI was most useful when I needed to understand a long requirement, find the likely location of a change, or investigate a technical problem step by step.
For Docker, PostgreSQL, Prisma, Git, and code errors, it gave me diagnostic ideas and small examples that I could try and understand.
This reduced the time spent guessing, but I still needed to decide whether each suggestion matched the project.

The most important lesson was that AI assistance does not replace verification.
The real Attachment upload failure passed isolated mocked tests, so I had to reproduce the problem with the integrated application, inspect the data flow, fix the specific mismatch, and rerun the tests.
Using AI as a guide while keeping the implementation, review, and validation under human control made the final result more reliable.
