# Lab 1 - AI Use and Reflection

**LLM/agent used:** OpenAI Codex (GPT-5)

Essentially, I use AI to summarize lab instructions, explain unfamiliar Git and GitHub concepts, troubleshoot technical issues, and assist with code verification.
I manually execute and validate the work using the lab documentation, terminal output, tests, and the live state on GitHub.

## Selected key prompts

| # | Prompt I used | How I used the answer |
|---|---|---|
| 1 | Please read the Lab 1 PDF files and tell me what I need to do for Issues 1-4. Make a simple checklist for each issue. | I used the checklist to complete Issues 1-4. I also checked the original lab sheet to make sure I did not miss anything. |
| 2 | Please explain what the `main`, `lab1-staging`, and feature branches are used for. Also explain how Issues and Pull Requests work with these branches. | I used the answer to understand the Git workflow. After that, I created the branches and Pull Requests by myself. |
| 3 | Why do I get the error `remote origin already exists`? Please show me how to check the current GitHub remote without changing or deleting it. | I ran `git remote -v` to check the remote. The URL was correct, so I kept it and did not add another remote. |
| 4 | Please help me fix Docker errors. Docker says the daemon is not running, and I also get an EOF error when pulling PostgreSQL. | I checked Docker Desktop, the Linux engine, and the network settings. When Docker was working again, I tried pulling the PostgreSQL image again. |
| 5 | Why does my backend show `Cannot GET /`? How can I test the health endpoint required by the lab? | I learned that the backend did not need a home page. I tested `/api/health` to check that the backend was working. |
| 6 | Please check my work for Issues 1-4 against the acceptance criteria. Tell me what is complete and what is still missing. | I used the answer as a checklist. I also checked the files and ran the backend and frontend tests to confirm the results. |
| 7 | Please help me review my friend's Pull Requests. Check the code and test results, then help me write simple review comments and replies. | I checked the code and test results first. I changed some of the suggested words and submitted the final reviews by myself. |
| 8 | Please tell me what evidence is still missing for my Lab 1 report. Organise the evidence into Answer Parts 1-4. | I used the answer to plan the screenshots I needed, including GitHub, tests, AI use, and the application. I also checked the original lab sheet. |

## Reflection

AI is very useful in transforming long instructions into shorter checklists.
It explains the concept of Git and suggests possible causes of various technical errors.
It also helps troubleshoot Docker issues, and I followed the AI's instructions step by step. When I encountered a technical problem, I let the AI help resolve it, which might be related to Docker.
