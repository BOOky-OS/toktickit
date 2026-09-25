# Lab 4 - AI Use and Reflection

LLM/agent used: OpenAI Codex (GPT-6). Status: contract, foundation and Issue #59 UI implementation record, 2026-09-24. The foundation was peer-approved/merged in PR #65; UI peer review remains pending.

AI read the assignment and existing project, explained the workflow, drafted the four contracts, inspected GitHub metadata and prepared the Issues/PR. The student selected eight work packages, confirmed Atip-Infa and requested corrections when comments and Project visibility were incomplete. The assistant then implemented the Actions Taken database/API foundation, isolated tests, demo seed and recovery checks. The assistant continued with Actions Taken forms, draft/retry handling, Admin controls and component/real-browser tests. Actual check results are recorded in tests.md; they are assistant-run, not student-run.

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
| 9 | I deleted the Python validator; do not upload output files. | Removed the optional validator and excluded generated output from Git. | Chose the repository cleanup and corrected unnecessary tooling. |
| 10 | Continue and read the lab and skill again. | Verified peer merges, completed prerequisite metadata and continued #58/#59 on their own branches with database and UI/browser tests. | Authorized the next implementation step under the existing workflow. |

## Critical-thinking

The student identified that the PR was not visible in the Project despite the assistant reporting complete metadata. Readback showed individual Project membership but no corresponding entry in the Project-wide collection. Re-adding/repositioning through GraphQL and REST did not prove visibility repaired. A later continuation query returned all #57-#65 cards in the Project collection. The assistant records this API evidence and does not claim a browser visual check or a known cause for the earlier omission.

The branch initially used example number 42, while the real contract Issue was #56. The assistant created docs/56-lab4-contract without deleting the old branch. The handout also leaves action lifecycle and resolution details open; the contract labels those choices as design proposals. Atip-Infa later explicitly approved the contract in PR #57; this is peer approval, not a new instructor requirement.

During #58, a real paginated action-list test failed because the old global query guard rejected page=2. The assistant corrected the guard while retaining unknown/repeated-query rejection and reran the suite. Tests also exercise simultaneous requests and a forced database failure; mocks alone would not prove persistence or atomic rollback. The initial implementation preceded the first new test run, so this record does not claim a strict test-first sequence.

During #59, component tests were drafted before the UI; the first run failed because the component did not yet exist. Real browser keyboard checks then exposed Tab escaping the cancellation dialog. The assistant added focus containment and reran the checks. The student also requested shorter review comments and asked why tests used a separate Docker container; the explanation distinguished the working database from disposable test fixtures.

## My Reflection

Pending student confirmation. The conversation establishes use of AI for assignment explanations, work planning, specification drafting and workflow corrections. The student has not yet supplied a personal reflection on what they learned. The coding agent has now implemented and tested #58/#59; the student's personal coding-stage reflection is still pending; do not reuse a prior lab's experience or describe planned tests as executed.
