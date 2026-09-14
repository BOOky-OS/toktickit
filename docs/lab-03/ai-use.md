# Lab 3 - AI Use and Reflection

**LLM/agent used:** OpenAI Codex (GPT-6)

I use AI as an assistant to summarize lab documents, help write code, and solve technical problems. I ask it to explain what the lab requires, organize the work into smaller steps, and help with code that involves unfamiliar programming concepts. I also use it to explain errors, suggest fixes, check the implementation, and organize documentation within the GitHub workflow.

For Lab 3, AI assisted with both the specification and the implementation. It read the lab sheet and existing project, helped draft the requirements, and implemented changes and automated checks in the workspace. I provided the project decisions and workflow requirements, including the Admin and IT Staff permissions and the requirement to finish documentation before moving to main. The technical checks linked in tests.md and quality-audit.md were run by the assistant; independent peer reviews are recorded separately in [reviewer.md](reviewer.md).

## Representative prompts

The prompts below are English paraphrases of actual requests and answers from this Lab 3 conversation, rather than verbatim English quotations.

| # | Prompt I used | How AI helped | My decision or use of the answer |
| --- | --- | --- | --- |
| 1 | Please read the Lab 3 sheet and the workspace code carefully before doing anything. | AI summarized the requirements and inspected the existing project before implementation. | I asked it to understand the original sheet and project first, then authorized implementation later. |
| 2 | Please summarize what Lab 3 requires and how many Issues we need. | AI organized the requirements into ten work packages and explained the proposed sequence. | I used this breakdown to guide the work and asked the assistant to continue step by step. |
| 3 | Please read the root `skill.md` before continuing, follow its GitHub workflow, and remind me whenever a GitHub step is required so that we can avoid workflow mistakes. | AI used the guide to check the branch, Issue, PR, reviewer, sidebar metadata, approval, and merge steps, and reminded me when I needed to comment or take action. | I required AI to read `skill.md` first and remind me throughout the workflow so that we would not work directly on `main`, miss required PR information, or release before the documentation was complete. |
| 4 | Admin should manage users and view Tickets; IT Staff should edit Tickets. | AI translated this answer into the permission specification, implementation, and authorization checks. | I chose this separation of responsibilities when the assistant asked about the role ambiguity. |
| 5 | Does the specification follow the first lab sheet I provided? | AI checked the specification against the original requirements. | I asked for this confirmation before telling it to continue implementation. |
| 6 | Please find the part of the code causing the error and help me fix it. | AI investigated the error, explained its cause, changed the related code, and reran the relevant checks after the fix. | I reviewed the explanation and used the fix after confirming that it matched the Lab 3 requirements and did not break the related workflow. |
| 7 | Please check whether anything is still missing before we continue. | AI reviewed code, tests, documentation, and release evidence, and identified remaining work. | I used the progress explanation to understand what still needed attention before the final stage. |
| 8 | Please finish the documentation before moving to main and ask whether I want any changes first. | AI recorded a documentation confirmation step before release. | I required this checkpoint and requested changes to the AI-use document before proceeding. |

## Critical-thinking

I use AI to make long instructions easier to understand and to help with coding and technical troubleshooting. Its suggestions still need to match the lab sheet, the existing code, and the agreed requirements. For example, I clarified that Admin should manage users and view Tickets while IT Staff handles Ticket changes, instead of leaving the permission decision to the assistant.

Technical results also need evidence. During the final audit, real browser tests exposed a long-description layout problem that earlier checks had not resolved. AI helped fix the layout and rerun the affected checks. This showed why checking the working application matters in addition to reading code or relying on mocked tests. Detailed commands and results are recorded in [tests.md](tests.md) and [quality-audit.md](quality-audit.md).

## My Reflection

AI is useful for turning the lab sheet into a clearer summary and a sequence of tasks. As a specification assistant, it helps connect the requirements to the existing project and brings up unclear points for me to decide. This makes it easier to follow what needs to be built.

As a coding assistant, AI helps write and adjust code, explain errors, and troubleshoot technical problems involving Docker, PostgreSQL, Prisma, authentication, tests, and responsive layouts. It also helps organize the documentation and GitHub workflow. I still need to decide whether the proposed behavior matches the assignment and whether the documents describe the work the way I intend. For this lab, I asked to finish and check the documentation before moving to main.
