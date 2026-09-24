# Lab 4 - AI Use and Reflection

LLM/agent used: OpenAI Codex (GPT-6). Status: initial specification-stage record, 2026-09-24. No Lab 4 application implementation or runtime test execution is claimed.

AI read the assignment and existing project, explained the workflow, drafted the four contracts, inspected GitHub metadata and prepared the Issues/PR. The student selected eight work packages, confirmed Atip-Infa and requested corrections when comments and Project visibility were incomplete. Checks described in tests.md were run by the assistant.

## Representative prompts

These are English paraphrases of actual Thai requests, not verbatim English quotations.

| # | Prompt I used | How AI helped | My decision or use of the answer |
| --- | --- | --- | --- |
| 1 | Read the Lab 4 PDF and skill.md before helping me later. | Summarized the assignment and workflow. | Requested reading before implementation. |
| 2 | Explain the first step in detail. | Explained the engineering contract and repository checks. | Asked for practical steps. |
| 3 | How many Issues and branches should this lab have? | Proposed eight work packages and staging flow. | Accepted the eight-Issue plan. |
| 4 | Please do the steps you described. | Drafted specification, API, UI and test-plan files and PR #57. | Authorized the contract work. |
| 5 | Keep Atip-Infa as reviewer. | Requested the confirmed peer on the PR. | Chose the reviewer. |
| 6 | Give me complete review comments as required by skill.md. | Supplied stage-specific copy/paste text. | Corrected an incomplete handoff; templates are not actual reviews. |
| 7 | Why is the PR missing from the Project? | Checked individual membership and collection listings. | Challenged a completion claim based only on PR metadata. |
| 8 | Check anything else missing and fix it; continue after the usage interruption. | Audited contracts/evidence and completed the eight-Issue backlog. | Requested verification rather than assuming successful API writes prove visible results. |

## Critical-thinking

The student identified that the PR was not visible in the Project despite the assistant reporting complete metadata. Readback showed individual Project membership but no corresponding entry in the Project-wide collection. Re-adding/repositioning through GraphQL and REST did not prove visibility repaired. This remains an explicit external-state limitation.

The branch initially used example number 42, while the real contract Issue was #56. The assistant created docs/56-lab4-contract without deleting the old branch. The handout also leaves action lifecycle and resolution details open; the contract labels chosen rules as proposals for review, not already confirmed student decisions.

## My Reflection

Pending student confirmation. The conversation establishes use of AI for assignment explanations, work planning, specification drafting and workflow corrections. The student has not yet supplied a personal reflection on what they learned. Coding-agent reflection will be added after actual implementation; do not reuse a prior lab's experience or describe planned tests as executed.
