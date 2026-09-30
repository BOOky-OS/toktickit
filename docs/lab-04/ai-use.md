# Lab 4 - AI Use and Reflection

LLM/agent used: OpenAI Codex (GPT-6). Updated 2026-09-30. The engineering contract and implementation/hardening PRs #57 and #65-#70 are peer-approved and merged into lab4-staging. Issue #64 prepares documentation and the gated release.

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
| 10 | Check and improve the UI on desktop/mobile; let me correct the UI and final documents before peer review. | Polished shared controls, dashboards, account screens, Users and Queue; checked Chromium viewports and recorded two student gates. | Requested specific visual fixes and accepted the UI before PR #70; document acceptance is still pending. |

## Critical-thinking

The student identified that the PR was not visible in the Project despite the assistant reporting complete metadata. Readback showed individual Project membership but no corresponding entry in the Project-wide collection. Re-adding/repositioning through GraphQL and REST did not prove visibility repaired. A later continuation query returned all #57-#65 cards in the Project collection. The assistant records this API evidence and does not claim a browser visual check or a known cause for the earlier omission.

The branch initially used example number 42, while the real contract Issue was #56. The assistant created docs/56-lab4-contract without deleting the old branch. The handout also leaves action lifecycle and resolution details open; the contract labels those choices as design proposals. Atip-Infa later explicitly approved the contract in PR #57; this is peer approval, not a new instructor requirement.

During #58, a real paginated action-list test failed because the old global query guard rejected page=2. The assistant corrected the guard while retaining unknown/repeated-query rejection and reran the suite. Tests also exercise simultaneous requests and a forced database failure; mocks alone would not prove persistence or atomic rollback. The initial implementation preceded the first new test run, so this record does not claim a strict test-first sequence.

During #59, component tests were drafted before the UI; the first run failed because the component did not yet exist. Real browser keyboard checks then exposed Tab escaping the cancellation dialog. The assistant added focus containment and reran the checks. The student also requested shorter review comments and asked why tests used a separate Docker container; the explanation distinguished the working database from disposable test fixtures.

During #60, new API tests first demonstrated that missing work and old-cycle work were incorrectly accepted for resolution. UI tests first exposed missing gate-specific feedback and dialog focus containment. The assistant then added the guards and reran the checks. Existing regression fixtures were updated to include qualifying completed work while retaining their assertions.

During #61, the assistant compared dashboard metrics with independent database queries, measured real request timings and bounded query count, and tested URL/back navigation in the browser. The student added two explicit review gates for #63 UI and #64 documents/review records before peer handoff; both were saved in skill.md and workflow.md.

During #62, new API tests failed before the endpoint existed, then passed after implementation. Existing regression tests assumed the old role landing pages; their fixtures/navigation were updated to the approved Dashboard destinations while preserving their feature assertions. A browser test initially navigated away before Logout completed; the test now waits for the real Login screen before switching identity. Broader regression also exposed a real Staff Queue bug: changing page size discarded unapplied filters. The assistant fixed the component and reran the unchanged behavioral assertions. Generated evidence stays ignored, and the existing isolated test container was reused.

During #63 preparation, the assistant repaired historical browser setup/fixtures without removing their behavioral assertions, separated suite trace directories after a concurrent-run artifact collision, and added a failing accessibility test showing metric values were missing from Staff link names. The link names were corrected and the test passed. A disposable preview was prepared for the student's requested UI correction gate; student approval was later explicitly given on 2026-09-29, followed by Atip-Infa approval and merge of PR #70.

## My Reflection

Pending student confirmation. The conversation establishes use of AI for assignment explanations, work planning, specification drafting and workflow corrections. The student has not yet supplied a personal reflection on what they learned. The coding agent has now implemented and tested #58 through #63; the student's personal coding-stage reflection is still pending; do not reuse a prior lab's experience or describe planned tests as executed.
