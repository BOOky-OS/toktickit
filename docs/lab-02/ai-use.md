# Lab 2 - AI Use and Reflection

**LLM/agent used:** OpenAI Codex (GPT-5)

I use AI as a coding assistant and problem solver. Mostly, I ask it to summarize the lab content and what needs to be done, then I have it work on the code parts where I'm not very proficient in the programming language. I also ask it to explain the technical problems, suggest small code examples or commands, and help check my work. I run commands and check the results by testing and mostly working within a GitHub workflow.

## Representative prompts

The prompts below are short paraphrases of the kinds of questions I asked during the lab.

| # | Prompt I used | How AI helped | What I did and verified |
| --- | --- | --- | --- |
| 1 | Please summarize what Lab 2 requires. Tell me what I need to do and what steps I need to take. Could you please explain it step by step. | AI turned the long lab sheet into a shorter checklist and mapped the requirements to the client, server, Prisma, tests, and documentation folders. | I compared the checklist with the original lab sheet and created Issues #11-#18 before starting the implementation. |
| 2 | Regarding this issue, please explain the acceptance criteria in simple steps. | AI helped break a large task into smaller steps and suggested relevant files to inspect. | I opened the files myself, decided which changes were appropriate, and checked the completed work against the Issue acceptance criteria. |
| 3 | Docker or PostgreSQL is not working. How can I check what's broken in Docker and get advice on how to fix it? | AI explained diagnostic commands and possible causes such as a stopped Docker daemon, an unavailable container, a port conflict, or an incorrect database connection. | I checked Docker and PostgreSQL locally, ran the suggested commands one at a time, and confirmed the database with Prisma validation, migration, and seed commands. |
| 4 | Please explain the GitHub workflow for this lab, including what features should be included. | AI explained the purpose and order of the workflow and helped turn it into a repeatable checklist. | I checked the branch and PR targets on GitHub, requested peer review, recorded the merge evidence, and closed each Issue only after its PR was merged. |
| 5 | This test code failed. Please explain the error and tell me how to fix it. | AI helped interpret error messages, trace the related code path, and propose focused snippets instead of replacing the whole implementation. | I read the surrounding code, adapted only the relevant suggestion, reran the affected test, and then ran the wider test suite to check for regressions. |
| 6 | Request commands to test the unit's functionality, API, UI, responses, and E2E. | AI suggested an organized verification sequence and evidence checklist. | I ran Prisma validation, client and server tests, the production build, and Playwright at desktop, tablet, and mobile sizes. I kept the factual results and screenshots in the repository. |
| 7 | Please help review my friend's pull request to check if his code is correct and what comments should be added. | AI helped organize the review points and draft concise wording for review comments and replies. | I checked the actual PR diff and test evidence before submitting or adapting any comment. I only recorded reviews and responses that exist on GitHub. |
| 8 | Please review my documentation for experiment 2 and let me know if anything needs to be added. | AI helped identify documentation gaps and organize the final evidence. | I checked the links, PR and Issue states, test results, screenshots, and merge commits before accepting the documentation changes. |

## Critical-thinking

I mainly used AI as an assistant to help summarize documents, support code writing, review and check code for errors, and troubleshoot technical problems. I treated its suggestions as guidance rather than final answers, and I verified the results using the lab sheet, source code, terminal output, tests, screenshots, and other available evidence. I also used AI to help identify possible causes of issues and suggest small, understandable fixes, while checking commands before running them and avoiding unnecessary or destructive actions.


## Reflection

AI is most useful when I need to understand complex requirements, locate likely changes, or examine technical issues step-by-step for Docker, PostgreSQL, Prisma, Git, and code errors. AI provides diagnostic ideas and small examples that I can try out and understand. This significantly reduces the time spent guessing, but I still need to decide if each suggestion is appropriate for the project.
