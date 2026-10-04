---
name: github-lab-workflow
description: Run course labs through a verified GitHub Issue, branch, PR, peer-review, documentation, testing, and release workflow without carrying lab-specific assumptions forward.
---

# GitHub Lab Workflow

Read this file completely before continuing any lab or GitHub work. It consolidates the user's standing instructions, the course workflow guide, and lessons from earlier labs. It is a workflow guide, not evidence that the current lab passed tests, review, or release.

## 1. Instruction priority and authority

Follow sources in this order:

1. The user's latest direct instruction.
2. The newest instructor announcement for the current lab.
3. The current lab sheet and rubric.
4. Repository instructions, current Issue/PR, and required templates.
5. This reusable guide.

State material conflicts and follow the higher-priority source. Separate assignment requirements, AI proposals, and student decisions. When the user says to read only or not implement yet, inspect and explain without changing anything.

Routine reversible Git/GitHub work in this project is already authorized: inspect state, create/switch branches, commit, push, open PRs, and fill Issue/PR metadata. Do not repeatedly ask permission. This does not authorize self-merging or posting comments as the user; provide ready-to-paste English comments unless the user explicitly asks the AI to post them.

## 2. Resolve every lab from current evidence

Before implementation, read the current lab sheet, rubric, repository instructions, specification, relevant code, tests, and live GitHub state. Resolve:

| Variable | Required evidence |
| --- | --- |
| `LAB_ID`, `LAB_NAME` | Current assignment/instructor material |
| `REPO`, `AUTHOR_ACCOUNT` | Git remote and authenticated account |
| `ASSIGNEE`, `REVIEWER` | Current lab/user instruction and access |
| `PROJECT`, `MILESTONE` | Live GitHub metadata |
| `MAIN_BRANCH` | Actual submission branch |
| `BASE_BRANCH` | Current integration/staging target, if any |
| `WORK_BRANCH` | Branch for the current Issue |
| `ISSUE_ORDER`, dependencies | Lab sheet, specification, and Issues |
| `ISSUE_ID`, `PR_ID` | Real GitHub numbers; never infer |
| `FINAL_ISSUE_ID` | Actual audit/docs/release Issue, if used |
| `DOCS_REQUIRED`, `TESTS_REQUIRED` | Current requirements and scripts |
| `SUBMISSION_RULES` | Current rubric, format, evidence, and channel |

Never inherit branch names, Issue count/order, parallel exceptions, reviewer, commands, screenshots, PDF structure, or submission packaging from an older lab. If Issue count is unspecified, propose work packages from scope/dependencies and obtain the student's decision. Default to one active Issue at a time unless parallel work is explicitly allowed.

## 3. Inspect before acting or continuing

1. Preserve all working-tree changes; do not overwrite unrelated work.
2. Check branch, remote, authenticated account, Issue/AC, dependencies, open PR, base/head, Project state, and required docs/tests.
3. Read reviews, comments, inline threads, latest head, checks, merge state, and sidebar metadata. An empty review request may mean review already happened. “Ready” is not merged. No CI is not proof that tests passed.
4. Verify whether a peer merged while the AI was away.
5. Resume the correct existing Issue branch/PR after interruption instead of restarting.

Useful read-only checks, with current values substituted:

```text
git status --short --branch
git remote get-url origin
gh api user --jq .login
gh issue view {ISSUE_ID} --repo {REPO} --json body,state,assignees,labels,milestone,projectItems,comments
gh pr view {PR_ID} --repo {REPO} --json state,headRefName,baseRefName,headRefOid,mergedAt,mergedBy,mergeCommit,reviewRequests,reviews,comments,closingIssuesReferences,assignees,labels,milestone,projectItems,statusCheckRollup
gh api repos/{REPO}/pulls/{PR_ID}/comments
```

Use paginated GraphQL `reviewThreads` when needed to verify inline replies and resolution.

## 4. Issue, branch, and Kanban workflow

Reuse the current Project when required. Otherwise create only what the lab asks for. Use real Issues rather than draft cards when PR linkage is required.

| State | Move when |
| --- | --- |
| `Backlog` | Real Issue exists but is not fully understood |
| `Specified` | Scope, AC, dependencies, and evidence are understood |
| `Started` | Correct work branch exists and implementation began |
| `PR Review` | Correct PR is open, linked to the Issue, and ready |
| `Fixing` | Review changes are required or checks fail |
| `Done` | AC/checks pass, feedback is answered, peer merged, and evidence is complete |

For every Issue:

1. Read the full Issue and every AC; do not implement from the title alone.
2. Move `Backlog -> Specified` only when understood.
3. Update `BASE_BRANCH` safely, then create a new branch. Use the lab rule; fallback: `feature/{ISSUE_ID}-{topic}` or `docs/{ISSUE_ID}-{topic}`.
4. Move to `Started` when work begins.
5. Keep code, tests, docs, and evidence for that Issue on the same branch.
6. Run relevant checks and compare every AC before commit/push.
7. Never implement directly on `main` or staging. Even small tracked documentation fixes use a branch and PR unless explicitly allowed.
8. If sequential, wait until the previous Issue is reviewed, answered, peer-merged, verified, closed if needed, and Done.

Do not force-push, rewrite shared history, delete branches, or reset user data based on an old example. Never reset the working database for tests; use an allowlisted isolated test database and owned fixtures.

## 5. Pull Request completeness

Before opening a PR, verify branch, diff, scope, docs, AC, actual test results, commits, push, and current `BASE_BRANCH`. Use the repository template when present. Otherwise include:

```md
## Related Issue
Issue #<number>

## Summary
- Resulting behavior

## Acceptance Criteria
- [x] Verified criterion

## Testing
- Exact commands and observed results

## Documentation
- Updated files/evidence

## Review focus / Notes
- Risks, limitations, assumptions, or areas to inspect
```

Immediately complete and verify every applicable PR sidebar field:

- Reviewer: actual peer requested for the lab.
- Assignee: actual author/account.
- Labels.
- Project and correct status.
- Milestone.
- Development: real related Issue.

`Closes #N` may not create the expected relationship for a PR into a non-default branch. Always verify the Issue appears in Development. Do not move to `PR Review` while it says `None yet`.

## 6. Peer review, replies, and merge

The reviewer reads the Issue/AC, diff, docs, tests, and evidence, then chooses Comment, Approve, or Request changes. The reviewer, never the PR author, merges an approved PR.

For review feedback:

1. Move `PR Review -> Fixing` when changes are required.
2. Fix on the same branch/PR; never open a replacement PR for feedback.
3. Reply to every comment with what changed or why no change was made.
4. Resolve only after answering and addressing the thread.
5. Push, rerun affected checks, return to `PR Review`, and request another look when needed.
6. Check whether approval covers the current head. Record approved and merged commits separately.

After peer merge, verify `MERGED`, `mergedBy`, merge commit, Issue/Project state, and author replies. Close the Issue manually when a staging merge does not auto-close it and AC are complete. Fast-forward the local base safely before the next Issue.

Every completed work handoff must include a concise, immediately copyable English GitHub comment without waiting for the user to ask:

- Ready for review: scope, head/commit, actual checks, review focus, target, and request that the peer review and merge after approval.
- After feedback: exact fix, commit, affected checks, and re-review request.
- After approval: thanks, unresolved-thread/current-head check, and request that the reviewer merge.
- After merge: thanks, integrated result, verified Issue/Project actions, and next step.

Do not invent or post a review, approval, response, or merge. Do not request duplicate comments when a required response already exists.

## 7. Documentation and evidence

Keep lab-specific progress in that lab's docs, not this guide. Update stale `Pending`/`Planned` statements when work exists, while keeping dated records clearly historical. Never claim the student or peer ran checks performed by AI.

### `reviewer.md`

Use simple student-level English and the style of `docs/lab-01/reviewer.md` and `docs/lab-02/reviewer.md`, while rechecking live evidence:

- Identify Author and Peer reviewer with name, student ID, and verified account. Separate authored-PR and reciprocal-review accounts if different.
- Add `Issue | Pull Request | Branch | Reviewer | Verdict` for authored PRs.
- For each PR, include actual reviewer comment, review link, author response, post-merge response, approved commit, merger, and merge commit. Exact GitHub text may be quoted; label a paraphrase as a summary.
- Separate authored PRs reviewed by the partner from partner PRs reviewed by the student.
- For reciprocal reviews, record repository, PR, branch, actual account, verdict, review URL, partner response, and post-merge response.
- If reciprocal evidence is missing, mark it pending and say what was checked. Never reuse an older lab review or fabricate one.
- Put outstanding audit/release work separately. Old review test counts describe that PR, not current results.

### `ai-use.md`

Use simple student-level English and prior labs only as style examples:

- Start with the Lab and actual LLM/agent. Describe AI assistance with document/lab summaries, code writing/fixes, error explanations, technical troubleshooting, documentation, and GitHub workflow only when those occurred.
- Default structure: overview, `Representative prompts`, `Critical-thinking`, and `My Reflection`. Adapt to the rubric.
- Prompt table: `# | Prompt I used | How AI helped | My decision or use of the answer`.
- Use representative real prompts. Mark translated/shortened Thai prompts as English paraphrases.
- Critical thinking needs a real check, correction, decision, limitation, or test discovery.
- Reflection briefly covers what AI helped understand/build/fix and what the student decided. Address specification and coding agents if the rubric distinguishes them. Draft from the student's stated or confirmed experience; ask only for personal details that cannot be inferred.
- Separate assistant-run work, student decisions, and peer review. Keep long technical logs in a linked supporting record.

### `tests.md`

Map each requirement/AC to a real test file/scenario, command, environment, commit, and result. Distinguish `Planned`, `Not run`, `Pass`, `Fail`, and Issue-branch vs final-main results. Verify every referenced file and script exists. Never copy old counts.

Mock tests do not prove database concurrency, persistence, filesystem behavior, or real authentication. Use integration/E2E evidence where required and state limits. Cover relevant failure/loading/empty/validation/ownership, keyboard/focus, and responsive cases. If an audit finds a runtime bug, fix it with a meaningful regression test within the authorized Issue.

### Reports, screenshots, and PDFs

Re-read the current rubric for file type/count, headings/order, screenshots, captions, links, Project/review evidence, AI-use, and submission channel. Never copy a prior PDF layout automatically.

When source evidence changes, update duplicate report text and its generator, regenerate the artifact, reopen it, render every page, and visually inspect legibility, clipping, links, order, headings, captions, and stale placeholders. If only Markdown changed, say the PDF/report is still old. Label pre-release and final-main evidence accurately.

### Encoding and repository hygiene

Use UTF-8, verify Thai readback, avoid literal escaped newlines/CR duplication, and run `git diff --check`. Use UTF-8 body files or structured arguments for multiline GitHub text. Check README/setup, `.gitignore`, tracked files, secrets, `.env`, dependencies, and unwanted generated output.

## 8. Mandatory documentation gate before main

This user rule applies to every lab and the actual release Issue, regardless of Issue number.

1. Complete the current rubric's pre-release package: required specifications, API/UI/migration docs, tests/traceability, staging results, reviewer record, AI-use/reflection, README, screenshots/checklist, and report/PDF.
2. Give the user links to real reviewable files. Identify only evidence that can exist after release, such as final-main tests and merge proof.
3. Before creating any PR into `MAIN_BRANCH`, ask exactly:

> เอกสารเสร็จครบแล้วหรือยัง มีอะไรต้องการแก้ก่อนขึ้น main ไหม?

4. Wait for an explicit answer to this release question. “Continue,” specification approval, tests, peer approval, or general authorization does not satisfy the gate.
5. If changes are requested, update the current branch/PR, regenerate affected artifacts, and ask again.
6. After approval, prepare the release PR with complete sidebar metadata. The peer reviews and merges it.
7. Verify the latest `MAIN_BRANCH` SHA, run required checks there, and record release review, merge, board, and final-main results. Recheck if main changes.
8. A later tracked-document update also uses a reviewed PR and this gate before entering main.
9. Keep the final Issue open until the gate, peer release merge, final-main verification, and required submission evidence are complete.

## 9. End-of-turn handoff

Report current Lab, Issue/PR, branch, pushed commit, checks actually run, reviewer/merge/Project state, pending evidence, and next valid step. Never say the lab is finished when only one Issue is complete.

Always include the stage-appropriate English copy/paste comment, including after approval and after merge. If no comment is needed, say why.

Suggested next-session instruction:

```text
Read skill.md at the workspace root completely. Resolve the current lab from the lab sheet, repository, GitHub, and live Issue/PR/Project state. Continue existing work without carrying forward lab-specific assumptions. Follow the branch, Development-link, complete-sidebar, peer-review, English-comment, documentation, and pre-main gate rules in skill.md.
```

This root `skill.md` is the user's workspace guide. Do not claim it is automatically installed or loaded as a Codex skill in a new session; the user should explicitly ask the AI to read it.


## Student review before peer handoff

Before requesting peer review, check the current lab workflow for explicit student review gates. For Lab 4, the student's 2026-09-26 instruction requires two separate pauses: #63 UI inspection/corrections before peer handoff and before final documentation; #64 document/report/review-record inspection/corrections before peer handoff. Prepare concrete reviewable results, apply corrections, and wait for explicit confirmation at each gate. Full details are in docs/lab-04/workflow.md. The separate pre-main documentation gate still applies.
