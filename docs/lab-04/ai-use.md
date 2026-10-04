# Lab 4 - AI Use and Reflection

LLM/agent used: **OpenAI Codex (GPT-6)**

I used AI to summarize the Lab 4 instructions, explain the required steps, troubleshoot technical problems, and help write and fix code. The lab continued the application from earlier labs, so I asked AI to read the existing project and the workflow instructions before starting new work.

For document work, AI helped summarize the requirements for Actions Taken, Ticket status rules and role-based dashboards. It also helped prepare the specification, API documentation, UI documentation and test plan. I asked for explanations of the steps and requested corrections when information was missing or unclear.

For technical work, AI helped inspect code, explain errors and investigate problems with Docker, the test database and GitHub metadata. It helped write backend and frontend code, add tests and fix issues found during verification. AI also helped improve the appearance of the application on desktop and mobile, including the dashboards, buttons, status labels, navigation and account pages.

My role was to ask for checks, point out problems and request changes before continuing. I reviewed the UI and revised the documents and wording that I wanted to change. The automated test results in [tests.md](tests.md) were produced by the assistant unless stated otherwise. The actual peer reviews and responses are recorded separately in [reviewer.md](reviewer.md).

## Selected key prompts

These are English paraphrases of my Thai requests, with wording revised for this record.

| # | Prompt I used | How I used the answer |
| --- | --- | --- |
| 1 | Read the Lab 4 PDF and skill.md before helping me later. | I used the summary to see the main requirements, including Actions Taken, Ticket workflow, dashboards and regression testing. I asked for explanations before starting so the work would follow the lab instructions and the project workflow. |
| 2 | Explain the first step in detail. | I used the explanation to follow the first step and asked for practical details. AI helped explain why the specification and test plan needed to be prepared before continuing with implementation. |
| 3 | Could you review the code before we continue? | I requested a code check before moving to the next task. I used the reported findings to decide what needed correction and asked AI to continue with the fixes before proceeding. |
| 4 | Could you check the code and see whether there are any problems right now? | I used the findings to request fixes for problems in the current implementation. AI explained the affected behavior and reported the results after changing the code and rerunning the relevant checks. |
| 5 | Why is the PR missing from the Project? | I asked AI to check the Project again because the PR was not visible. The follow-up found a difference between the individual PR metadata and the Project listing. A later check confirmed that the cards appeared. |
| 6 | Check anything else missing and fix it; continue after the usage interruption. | I used the findings to request corrections to missing work, documentation and GitHub metadata. After an interruption, I asked AI to read the lab and workflow instructions again and check the existing progress before continuing. |
| 7 | Could you help check the Docker code that is causing problems? | I asked about the Docker setup and why tests needed a separate container. AI explained how the test database is kept separate from the working database. Later, it found that the existing test container was stopped, restarted it and reran the tests. |
| 8 | Check and improve the UI on desktop/mobile; let me correct the UI and final documents before peer review. | I inspected the UI and requested changes to status labels, buttons, navigation, dashboards and account pages. I also asked for checks at desktop and mobile sizes. I approved the UI before peer review and asked to review the final documents separately. |

## My Reflection

For specification work, AI helped turn the long lab instructions into a summary and smaller steps to follow. It helped organize the required behavior into the specification, API, UI and test documents. I could ask for more explanation when a step was unclear and request changes before moving on to implementation.

For coding work, AI helped write and fix both backend and frontend code. It also helped investigate technical problems, explain the Docker and database setup, and prepare tests for the new features and earlier functionality. When a problem was found, AI helped explain the cause, make a correction and report the results of the next check.

AI was also useful when improving the UI. I could point to a page or control that I wanted to change, such as a status label, button or dashboard, and ask for a clearer layout. I requested several rounds of changes for desktop and mobile before accepting the UI.

Overall, I used AI as support for understanding documents, solving technical problems and developing the application. I still asked for checks, questioned incomplete results and requested corrections when the work did not match what I wanted. The GitHub Project issue and the UI revisions are examples of why my own review remained necessary alongside AI assistance and peer review.
