---
name: toktickit-github-workflow
description: Follow the user's GitHub workflow for TokTickIT course labs, including issue branches, complete PR metadata, peer review and merge, and the documentation confirmation gate before main.
---

# กฎ GitHub ที่ผู้ใช้กำหนดสำหรับ TokTickIT

อ่านส่วนนี้ก่อนเริ่มหรือทำงาน Lab ต่อ แล้วอ่านคู่มือเดิมด้านล่างและข้อกำหนดของ Lab ปัจจุบัน
ไฟล์นี้บันทึกกฎการทำงาน ไม่ใช่หลักฐานว่า review, test หรือ merge เกิดขึ้นแล้ว
ตรวจสถานะจริงจาก GitHub ทุกครั้งก่อนเปลี่ยนสถานะหรือเริ่ม Issue ถัดไป

## ลำดับคำสั่งและขอบเขต

- ทำตามคำสั่งล่าสุดที่ผู้ใช้ระบุโดยตรง หากขัดกับคู่มือ ให้แจ้งความต่างอย่างชัดเจน
- แยกข้อกำหนดใน labsheet ออกจากสิ่งที่ AI เสนอและการตัดสินใจของผู้ใช้
- คู่มือเดิมด้านล่างใช้จัดลำดับแหล่งข้อมูลของวิชา ไม่ใช้ลบล้างคำสั่งผู้ใช้
- สำหรับ Lab ใหม่ ให้อ่าน labsheet ใหม่และตรวจ repo ก่อนกำหนด branch, Issue, reviewer และเอกสาร อย่ายกข้อยกเว้นจาก Lab เก่ามาใช้เอง
- ถ้ามีความไม่แน่ใจที่กระทบ specification หรือขั้นตอนสำคัญ ให้ถามผู้ใช้ก่อนทำส่วนที่ขึ้นกับคำตอบ และทำส่วนที่เป็นอิสระต่อได้

## บริบทที่ผู้ใช้ตกลงสำหรับ Lab 3

| รายการ | ค่าที่ใช้ |
| --- | --- |
| Repository | BOOky-OS/toktickit |
| ผู้รับผิดชอบงาน / Assignee | BOOky-OS |
| เพื่อนผู้รีวิว | Atip-Infa |
| Project | TokTickIT Individual Sprints (Project #2) |
| Milestone | Lab 3 |
| Integration branch | lab3-staging |
| Issue | #32 ถึง #41 รวม 10 งานตามแผนที่ผู้ใช้ตกลง ไม่ใช่จำนวนบังคับจาก labsheet |
| ลำดับงาน | ทีละ Issue ตาม dependency |
| รายละเอียดแผน | [Lab 3 workflow](docs/lab-03/workflow.md) |

ผู้ใช้สั่งให้เพิ่มเพื่อนเป็น reviewer และเติมช่องด้านขวาของ PR ให้ครบแล้ว
สำหรับ PR ของ Lab 3 ให้ดำเนินการนี้เป็นส่วนหนึ่งของการเตรียม PR โดยไม่ต้องถามซ้ำทุกครั้ง
การอนุญาตนี้ครอบคลุมคำขอรีวิวใน GitHub ไม่ใช่การส่งข้อความอื่นแทนผู้ใช้หรือการใช้บัญชีเพื่อน

## Branch, Issue และเอกสาร

1. ตรวจ branch, working tree, Issue/AC, dependency, PR/review และ Project ก่อนแก้ไข
2. Lab 3 ต้องมี branch ใหม่: ใช้ lab3-staging เป็นฐานรวมงาน และสร้าง branch แยกของแต่ละ Issue จาก staging ที่อัปเดตแล้ว
3. ใช้ชื่อ branch ตามตารางใน Lab 3 workflow ห้ามเขียนงานหรือ push โดยตรงบน main หรือ staging
4. แก้โค้ด เอกสาร และ review feedback ของ Issue ที่ยังเปิดบน branch เดิมและ PR เดิม
5. หากงานเดิม merge แล้ว ให้ใช้ branch และ PR ใหม่สำหรับเอกสารหรือการแก้ไข ห้ามแทรก commit ลง main โดยตรง
6. ตรวจ AC และรัน checks ที่เหมาะกับสิ่งที่เปลี่ยน บันทึกสิ่งที่ตรวจจริง แยก Planned, Not run และ Pass
7. เริ่ม Issue ถัดไปเมื่อ Issue ก่อนหน้าตอบ review ครบ ผ่านการอนุมัติ ผู้รีวิว merge แล้ว และตรวจว่า Done จริง
8. อย่าตีความคำว่า “เริ่มทำต่อได้เลย” ว่าเป็นการยกเลิก peer review หรืออนุญาตให้ขึ้น main

## ต้องเติมช่องด้านขวาของ PR และตรวจผลจริง

| ช่อง | สิ่งที่ต้องทำ |
| --- | --- |
| Reviewers | ส่ง review request ให้ Atip-Infa ใน GitHub จริง การพิมพ์ชื่อใน PR body อย่างเดียวไม่พอ |
| Assignees | ใส่ BOOky-OS เป็นผู้รับผิดชอบ |
| Labels | ใส่ label ที่ตรงกับงาน เช่น documentation สำหรับเอกสาร หรือ enhancement สำหรับฟีเจอร์ ไม่เติม label ที่ไม่เกี่ยวข้อง |
| Projects | เพิ่ม PR เข้า TokTickIT Individual Sprints และตั้งสถานะให้ตรงกับงาน ตรวจ Issue ที่เชื่อมด้วย |
| Milestone | ใช้ Lab 3 ให้ตรงกับ Issue ห้ามเดาวันส่ง |
| Development | เชื่อม PR กับ Issue ที่ถูกต้อง เช่น PR #42 กับ Issue #32 ตรวจความสัมพันธ์จริง ไม่อาศัยเพียง Closes/Fixes ในข้อความ |

ตรวจ head/base branch ให้ถูกต้องด้วย: PR ของแต่ละ Issue เข้า lab3-staging ส่วน release เข้า main ต้องผ่านเงื่อนไขด้านล่าง
หลังแก้ข้อมูล ให้เรียกอ่านข้อมูลกลับหรือเปิดหน้า PR ตรวจทุกช่องก่อนบอกผู้ใช้ว่าเรียบร้อย
หากช่อง Development มี Issue ถูกต้องอยู่แล้ว ให้คงลิงก์และยืนยันผล ไม่สร้าง Issue ซ้ำ
หากคำขอ reviewer หายไป ให้ตรวจ reviews ก่อน เพราะเพื่อนอาจส่ง review แล้ว

## Kanban และ peer review

- ใช้ Backlog → Specified → Started → PR Review → Done ตามงานจริง
- หาก reviewer ขอแก้หรือ required checks ล้มเหลว ให้เข้า Fixing แล้วแก้ branch/PR เดิม ก่อนกลับ PR Review
- อย่าให้ PR อยู่ PR Review ทั้งที่ยังไม่มี PR หรือ Development link และอย่าให้ Done ก่อน reviewer merge
- ผู้รีวิวต้องตรวจงานจริงและเป็นผู้ merge ผู้เขียน PR/AI ห้าม self-merge หรือสลับบัญชีเพื่ออนุมัติแทนเพื่อน
- ตอบทุก review comment โดยระบุสิ่งที่แก้หรือเหตุผล หากผู้ใช้ต้องเป็นผู้โพสต์ ให้ร่างคำตอบให้และตรวจว่าตอบจริงก่อนปิดงาน
- เมื่อผู้ใช้ขอข้อความคอมเมนต์ ให้ส่งร่างสำหรับนำไปวาง ระบุว่าข้อความ reviewer ใช้หลังตรวจจริง และคำขอบคุณใช้หลังมีผล review จริง
- ไม่แต่งผล review หรืออ้างว่าผู้ใช้/เพื่อนรัน tests ที่ยังไม่ได้รัน การส่งคอมเมนต์แทนผู้ใช้ต้องได้รับอนุญาต
- ตรวจว่า approval ครอบคลุมการเปลี่ยนแปลงล่าสุด หากมีการแก้หลัง approval ให้แจ้งส่วนที่เปลี่ยนและขอ review อีกครั้งเมื่อจำเป็นก่อน merge
- ตรวจผู้ merge, commit และผลจริงก่อนปิด Issue/ย้าย Done โดยเฉพาะ PR เข้า staging ที่อาจไม่ปิด Issue อัตโนมัติ

## เอกสารต้องเสร็จและถามผู้ใช้ก่อนขึ้น main

นี่คือคำสั่งโดยตรงของผู้ใช้สำหรับ Issue ที่ 10 หรือ Issue สุดท้าย แม้ภายหลังเลข Issue เปลี่ยน
สำหรับแผนปัจจุบันคือ Issue #41

1. ทำเอกสารและหลักฐานที่จัดเตรียมได้ก่อน release ให้เสร็จและตรงกับงานจริง รวม specification, API/UI specs, tests, reviewer record, ai-use/reflection, README, screenshots และร่าง PDF ตาม labsheet
2. ให้ผู้ใช้ตรวจผลงานที่พร้อมอ่านจริงด้วยลิงก์ไฟล์ และระบุส่วนที่ต้องรอหลักฐานจาก main หลัง merge โดยไม่แต่งผลล่วงหน้า
3. ก่อนเตรียม release PR จาก lab3-staging ไป main ต้องถามผู้ใช้ตรง ๆ ว่า:

> เอกสารเสร็จครบแล้วหรือยัง มีอะไรต้องการแก้ก่อนขึ้น main ไหม?

4. รอคำยืนยันชัดเจนจากผู้ใช้ก่อนดำเนิน release คำว่า “เริ่มทำต่อ”, tests ผ่าน, เพื่อน Approve, หรือเวลาที่ผ่านไป ไม่ใช่คำยืนยันนี้
5. หากผู้ใช้ขอแก้ ให้แก้ให้เสร็จผ่าน branch/PR ตาม flow อัปเดตเอกสารที่ให้ตรวจ แล้วถามยืนยันอีกครั้ง
6. หลังผู้ใช้ยืนยัน จึงเตรียม release PR พร้อมข้อมูลด้านขวาครบและ peer review ผู้รีวิวเป็นคน merge เข้า main
7. หลัง merge ตรวจ main commit จริง รันการตรวจที่ labsheet กำหนด และเติมหลักฐาน final-main ลงเอกสารส่ง ห้ามอ้างผลล่วงหน้า
8. หากต้องเปลี่ยนไฟล์ tracked เพิ่มหลัง release ให้ผ่าน branch/PR/review และคำยืนยันก่อนเข้า main สำหรับการแก้นั้นด้วย

การยืนยัน specification กับการยืนยันเอกสารก่อน main เป็นคนละขั้นตอน ต้องบันทึกแยกกัน

---

# คู่มือเดิมที่ผู้ใช้นำมาไว้ในไฟล์นี้

คงเนื้อหาด้านล่างไว้เป็นรายละเอียดอ้างอิง ใช้กฎเฉพาะจากผู้ใช้ด้านบนประกอบเสมอ

# CPE 334 / TokTickIT — GitHub Workflow Guide for AI (All Future Labs)

> **Purpose**
> This file is a persistent operating guide for any AI assistant helping with this course/project from **Lab 2 onward and in future labs**. It defines how the AI should inspect the current lab, work with Issues and branches, prepare Pull Requests, handle reviews, update documentation, and keep the GitHub Project/Kanban board consistent.
>
> **Important:** This guide is intentionally **lab-agnostic**. Do not hard-code Lab 1 branch names, Issue numbers, submission headings, or exceptions into future work.

---

## 0. Source priority — what to follow when instructions conflict

For every new lab, the AI must follow instructions in this order:

1. **Newest instructor announcement / clarification for the current lab**
2. **Current lab sheet / assignment specification**
3. **Repository-specific instructions** such as `README.md`, `CONTRIBUTING.md`, Issue text, PR template, or course-provided files
4. **This workflow guide**

If a higher-priority source conflicts with this file, follow the higher-priority source and explicitly note the difference.

**Never guess a lab-specific rule when it can be checked.**

---

# 1. Rules that carry forward to future labs

Unless a newer instructor instruction explicitly changes them, treat these as mandatory from Lab 2 onward.

## 1.1 Reviewer merges the Pull Request

- The **PR author must not merge their own PR**.
- The author opens the PR and requests/assigns the reviewer.
- After the PR is approved and ready, the **reviewer clicks `Merge pull request`**.

## 1.2 Review comments must be answered

- Every reviewer comment must receive a reply from the PR author.
- The reply should say either:
  - what was changed, or
  - why the author disagrees / why no change was made.
- Do not silently fix a comment and leave the review thread unanswered.
- Do not treat `Approve` alone as a complete review if earlier comments were never addressed.

## 1.3 Every PR must be linked to its Issue

- The required relationship is **Pull Request ↔ Issue**.
- Linking a branch to an Issue is useful, but **branch linkage alone is not enough**.
- Verify the PR-to-Issue link from the PR's **Development** section.

## 1.4 Use the Project / Kanban board as part of the workflow

The board should reflect the real state of the work rather than being updated only at the end.

## 1.5 Do not develop directly on shared integration branches

Unless the current lab explicitly says otherwise:

- do not implement directly on `main`,
- do not implement directly on the lab's staging/base/integration branch,
- use a working branch and a Pull Request for code and documentation changes.

---

# 2. Start-of-lab initialization — do this before Issue 1

At the beginning of **every new lab**, the AI must first establish the current lab context.

## 2.1 Read the current lab instructions

Before suggesting commands or editing files, identify:

- Lab number / lab name
- Repository being used
- Required Project/Kanban board
- Issues required for the lab
- Issue dependency or required order
- Whether any Issues may be worked in parallel
- Required base/staging/integration branch for PRs
- Branch naming requirements, if specified
- Required reviewer / teammate workflow
- Required tests or acceptance checks
- Required documentation in `/docs` or elsewhere
- Required `ai-use.md`, reflection, reviewer record, report, screenshots, or evidence
- Final submission format and checklist

## 2.2 Resolve these variables for the current lab

The AI should internally establish the following before implementation:

```text
LAB_ID           = current lab number/name
REPO             = current repository
DEFAULT_BRANCH   = repository default branch, often main
BASE_BRANCH      = branch PRs for this lab must target
ISSUE_ORDER      = sequential / dependency-based / explicitly parallel
ISSUE_ID         = current Issue number
WORK_BRANCH      = branch used for the current Issue
REVIEWER         = assigned teammate/reviewer
DOCS_REQUIRED    = required docs/report/ai-use files
TESTS_REQUIRED   = tests/checks required by the current Issue/lab
SUBMISSION_RULES = current labsheet/LEB2 checklist
```

### Never assume values from a previous lab

For example:

- Do **not** assume the base branch is `lab1-staging`.
- Do **not** assume Issue 2 and Issue 3 can run in parallel.
- Do **not** assume the same branch naming convention.
- Do **not** assume the same PDF/report headings.

If the current lab does not specify a value and it cannot be verified from the repository, ask for the missing information before doing anything destructive or structurally important.

---

# 3. Standard Project / Kanban board

The workflow uses these **6 statuses in this order**:

1. `Backlog`
2. `Specified`
3. `Started`
4. `PR Review`
5. `Fixing`
6. `Done`

## 3.1 Status definitions

| Status | Meaning |
|---|---|
| **Backlog** | The Issue exists but has not yet been fully read and understood. |
| **Specified** | Requirements and acceptance criteria are understood and the Issue is ready to implement. |
| **Started** | A working branch exists and implementation has begun. |
| **PR Review** | A PR is open, linked to the Issue, and waiting for / undergoing peer review. |
| **Fixing** | Review changes are required or tests failed; corrections are being made on the same branch. |
| **Done** | Acceptance criteria pass, review is complete, the reviewer has merged the PR, and the Issue is finished. |

## 3.2 Movement rules

```text
Backlog
   ↓ understand requirements
Specified
   ↓ create/start work branch
Started
   ↓ open PR + link PR to Issue
PR Review
   ├─ changes requested / tests fail → Fixing
   │                                  ↓ push fixes on same branch
   │                                  └────────────→ PR Review
   └─ approved + reviewer merges → Done
```

### Rules

- New real Issues start in `Backlog`.
- Move to `Specified` only after requirements are understood.
- Move to `Started` when implementation actually begins.
- Move to `PR Review` **only after the PR exists and is linked to the Issue**.
- Move to `Fixing` when changes are requested or required checks fail.
- Return to `PR Review` after fixes are pushed and the review thread is answered.
- Move to `Done` only after the work is truly complete and merged.

---

# 4. Board setup for a new sprint/lab

If a Project board already exists and the current lab says to reuse it, reuse it. Otherwise:

1. Repository → **Projects** → **New project**.
2. Choose the **Kanban** template.
3. Use the board name required by the current lab/course instructions.
4. Do not import repository items automatically unless instructed.
5. Rename the template columns so the board becomes:
   - `Backlog`
   - `Specified`
   - `Started`
   - `PR Review`
   - `Fixing`
   - `Done`
6. Add missing `Fixing` between `PR Review` and `Done`.
7. Add work as **real GitHub Issues**, not draft cards, when the work must be linked to PRs.
8. Confirm each Issue is assigned to the correct Project.

---

# 5. Standard workflow for every Issue

Use this process for each Issue unless the current lab explicitly defines a different process.

## Step 1 — Read and understand the Issue

Before editing code:

- Read the title and full description.
- Extract every acceptance criterion.
- Identify required files, tests, docs, screenshots, or reports.
- Check dependencies on earlier Issues.
- Check whether the previous Issue must be completed first.

Then move:

```text
Backlog → Specified
```

### AI rule

Do not implement based only on the Issue title. The acceptance criteria are the real target.

---

## Step 2 — Create or switch to the correct work branch

Use the branch required by the current lab/repository.

If no exact naming rule exists, use a descriptive branch associated with one Issue, for example:

```text
feature/<issue-number>-<short-topic>
```

This is a fallback convention only; **current lab instructions override it**.

Then move:

```text
Specified → Started
```

### Optional branch linkage

You may link the branch to the Issue from:

```text
Issue → Development → gear icon → select branch
```

This helps show that work has started, but it does **not** replace PR linkage later.

---

## Step 3 — Implement only the current Issue scope

While working:

- Keep the implementation focused on the current Issue.
- Avoid unrelated refactors unless necessary.
- If an unrelated change is unavoidable, document why.
- Update Issue-related documentation on the **same branch**.
- Follow the repository's coding style and file structure.
- Run relevant tests/checks before opening the PR.
- Compare the result against every acceptance criterion.

### AI rule

Do not declare the Issue complete merely because the program runs.

---

## Step 4 — Pre-PR check

Before opening a PR, verify:

- [ ] Current branch is the intended work branch.
- [ ] No accidental edits are present.
- [ ] Required code is complete.
- [ ] Required docs are included.
- [ ] Required tests/checks were run.
- [ ] Acceptance criteria have been checked one by one.
- [ ] Changes were committed meaningfully.
- [ ] Branch was pushed to GitHub.

---

## Step 5 — Open the Pull Request

Open the PR from the current Issue branch into the current lab's `BASE_BRANCH`.

### Never copy the previous lab's base branch blindly

Before creating the PR, verify the base branch from the current lab/repository.

### Recommended PR description structure

```md
## Related Issue
Issue #<number>

## Summary
- What this PR changes

## Acceptance Criteria
- [x] Criterion 1
- [x] Criterion 2

## Testing
- What was tested
- Commands/checks used

## Documentation
- Files updated, if any

## Notes
- Limitations, assumptions, or anything the reviewer should know
```

If the repository already has a PR template, use that template instead.

---

# 6. Mandatory PR ↔ Issue linking

After the PR is created, **link it to the Issue immediately**.

## Preferred method

1. Open the Pull Request.
2. Find **Development** in the right sidebar.
3. Click the gear icon.
4. Search for the correct Issue.
5. Select it.
6. Verify that the Issue is now shown in the PR's Development section.

### Verification rule

If the Development section still says something like:

```text
None yet
```

then the PR is **not linked correctly**.

Do not move the card to `PR Review` until the link is verified.

## About `Closes`, `Fixes`, and `Resolves`

Examples:

```text
Closes #18
Fixes #18
Resolves #18
```

These are useful in a PR description, but when a PR targets a **non-default branch**, they may behave only as a mention rather than creating the relationship expected by the lab workflow.

Therefore:

> **Do not rely on the keyword alone. Always verify the PR ↔ Issue relationship in the Development panel.**

---

# 7. Enter PR Review

Only after all of the following are true:

- PR is open.
- PR targets the correct base branch.
- PR is linked to the correct Issue.
- Required checks are ready for review.

Move:

```text
Started → PR Review
```

Then request/assign the correct reviewer.

---

# 8. Reviewer workflow

The reviewer should:

1. Open the PR.
2. Read the Issue and its acceptance criteria.
3. Open **Files changed**.
4. Review code and docs against the acceptance criteria.
5. Check tests and evidence.
6. Add line comments when necessary.
7. Submit the review using the correct outcome:

| Review action | Use when |
|---|---|
| **Comment** | Questions or suggestions, but no final decision yet. |
| **Approve** | Acceptance criteria are satisfied and the PR is ready to merge. |
| **Request changes** | The author must fix something before merge. |

## Reviewer rule after approval

> **The reviewer, not the PR author, performs the merge.**

---

# 9. Author workflow when review comments arrive

The author must answer **every** review comment.

## If the reviewer requests changes

Move:

```text
PR Review → Fixing
```

Then:

1. Fix the issue on the **same branch**.
2. Push the new commit(s) to the same branch.
3. Let the existing PR update automatically.
4. Reply to the review comment/thread with what changed.
5. Resolve the conversation only after it has been answered and truly addressed.
6. Move:

```text
Fixing → PR Review
```

7. Wait for the reviewer to check again.

### Never do this

- Do not open a second PR just to fix review feedback.
- Do not delete/recreate the branch unless genuinely necessary.
- Do not self-merge after making the fix.

---

# 10. Merge and Issue completion

After approval:

1. **Reviewer merges the PR.**
2. Confirm merge succeeded.
3. Confirm acceptance criteria and required checks are satisfied.
4. Move the card to `Done`.
5. Confirm the Issue is closed when appropriate.

## If the Issue does not close automatically

This can happen when the PR was merged into a non-default staging/integration branch.

In that case:

- refresh the Project/Issue,
- move to `Done`,
- close the Issue manually if the workflow requires it.

---

# 11. Starting the next Issue

The AI must first check the **current lab's dependency/order rule**.

## If the lab requires sequential Issues

Do not start the next Issue until the previous one has:

- completed review,
- had all comments answered,
- been approved,
- been merged by the reviewer,
- reached `Done`,
- had required docs/evidence updated.

## If the lab explicitly permits parallel work

Only the named Issues may be worked in parallel, and each Issue still requires its **own correct branch/PR/review/linkage** unless the current lab says otherwise.

## If the lab is silent about order

Use the safer default of **one active Issue at a time** unless repository dependencies clearly require another approach.

---

# 12. Documentation workflow

Documentation must follow Git workflow too.

This includes files such as:

- `/docs/*.md`
- lab report files
- reflections
- reviewer records
- `ai-use.md`
- screenshots/evidence documentation
- README updates required by the Issue

## Case A — Docs belong to an Issue still in progress

Edit the docs on the **same Issue branch** and include them in the same PR.

Do not create a second docs branch for documentation that belongs to an active Issue.

## Case B — Code is already merged and a substantial docs update is required

Create a docs-only branch and PR.

Fallback naming convention when no current rule exists:

```text
docs/<lab>-<topic>
```

Examples:

```text
docs/lab2-report
docs/lab3-ai-use
```

If the docs belong to an existing Issue, link the PR to that Issue as usual.

If no Issue exists for the docs-only change, state that clearly in the PR description.

## Case C — Small typo / broken link / tiny docs fix

Still use:

- a branch,
- a Pull Request,
- a review.

The review can be quick, but do not push directly into the shared base branch unless the current lab explicitly allows it.

---

# 13. `ai-use.md` — critical thinking record

When the current lab requires `ai-use.md`, it should show **how AI was evaluated**, not only that AI was used.

Include actual example prompts.

Recommended structure:

```md
## AI Use Record

### Task
What I was trying to accomplish.

### Prompt used
> Actual prompt sent to the AI.

### AI suggestion
Brief summary of the AI output.

### My verification / critical thinking
- What I checked myself
- What was correct
- What was incomplete, wrong, or risky
- What I changed and why

### Final decision
What I actually used in the project.
```

### AI rule

Do not fabricate prompts, verification, or decisions that the student did not actually perform.

---

# 14. Final report / PDF / LEB2 submission

For every lab, submission requirements must be re-read from the **current labsheet**.

The AI must not copy a previous lab's report structure automatically.

Before final submission:

- [ ] Read the current submission checklist.
- [ ] Use the exact required headings/order.
- [ ] Include required screenshots/evidence.
- [ ] Give screenshots clear captions/descriptions when required.
- [ ] Confirm GitHub Project/Kanban evidence is included if required.
- [ ] Confirm Issue/PR/review evidence is included if required.
- [ ] Confirm `ai-use.md` or reflection requirements are satisfied.
- [ ] Compare the final PDF/report to the checklist item by item.

---

# 15. AI operating procedure when asked to continue the project

When the user says things like:

- “ทำ Issue ต่อไป”
- “ทำ Lab นี้ต่อ”
- “ช่วยเปิด PR”
- “แก้ review”
- “ทำ docs ต่อ”
- “เช็กว่าพร้อม merge หรือยัง”

follow this process.

## Phase A — Inspect before acting

- [ ] Identify the current Lab.
- [ ] Read the current lab instructions and Issue.
- [ ] Identify `BASE_BRANCH`.
- [ ] Identify current Git branch.
- [ ] Check the Project/Kanban status.
- [ ] Check Issue dependencies/order.
- [ ] Check current PR/review state if one exists.
- [ ] Check required docs/tests.

## Phase B — Decide the correct next action

Possible next actions include:

```text
read requirements
create/switch branch
implement
run tests
update docs
commit/push
open PR
link PR to Issue
request review
reply to review
fix on same branch
wait for reviewer
reviewer merge
move Done / close Issue
```

Do **not** skip ahead simply because the user asks for the final step if prerequisites are missing.

## Phase C — Before any GitHub state-changing action

Check:

- [ ] Correct repository
- [ ] Correct Lab
- [ ] Correct Issue
- [ ] Correct work branch
- [ ] Correct base branch
- [ ] Correct reviewer
- [ ] PR ↔ Issue linkage requirement
- [ ] No self-merge

---

# 16. Stop conditions — AI must not proceed blindly

The AI should stop and verify/ask before proceeding if any of these are unknown and necessary:

- Current lab cannot be identified.
- Required base/staging branch is unclear.
- User appears to be on `main` or a shared base branch while trying to implement.
- Issue acceptance criteria are missing or unread.
- A PR is about to be opened against an uncertain base branch.
- The PR is not linked to the Issue.
- The author is about to self-merge.
- Review comments remain unanswered.
- The next Issue is being started while the current lab requires sequential completion.
- Submission format is being guessed from an older lab.

---

# 17. Things the AI must never assume from an earlier lab

Do not carry these forward without verification:

- exact base/staging branch name,
- exact Issue numbers,
- Issue 2/3 parallel exception,
- branch naming pattern,
- number of Issues,
- reviewer identity,
- report/PDF section names,
- screenshot requirements,
- test commands,
- docs filenames,
- final submission packaging.

The **workflow principles** may carry forward; the **lab-specific values** must be re-read each time.

---

# 18. Historical Lab 1 notes — reference only

These notes exist only to understand earlier work and must not be treated as future-lab defaults.

- Lab 1 used `lab1-staging` as the integration target.
- Lab 1 had a special allowance for Issue 2 and Issue 3 to be worked in parallel.
- A one-time Lab 1 clarification allowed an already-merged PR where the author had self-merged after only receiving a comment; this was not the intended rule going forward.
- From Lab 2 onward, the reviewer merges after approval.
- Lab 1 had recovery guidance for missing `/docs` after Issues were already finished.

---

# 19. Compact decision tree

```text
NEW LAB
  ↓
Read newest instructions + labsheet + repo rules
  ↓
Resolve LAB_ID / BASE_BRANCH / ISSUE_ORDER / DOCS / TESTS
  ↓
Create/read real Issue → Backlog
  ↓ understand acceptance criteria
Specified
  ↓ create Issue branch
Started
  ↓ implement + test + docs
Open PR to CURRENT LAB BASE_BRANCH
  ↓
LINK PR ↔ ISSUE in Development and verify
  ↓
PR Review
  ├─ reviewer requests changes
  │      ↓
  │   Fixing
  │      ↓ same branch + same PR + reply to comments
  │   PR Review
  │
  └─ reviewer approves
         ↓
     REVIEWER merges
         ↓
       Done
         ↓
Close Issue if needed
         ↓
Check current lab rules before starting next Issue
```

---

# 20. Non-negotiable rules to remember

> **1. Read the current lab first — never copy lab-specific assumptions forward.**
> **2. Reviewer merges — the PR author does not self-merge.**
> **3. Reply to every review comment.**
> **4. Link the Pull Request to its Issue and verify the link.**
> **5. Keep the Kanban board synchronized with the actual work.**
> **6. Use the same branch/PR for review fixes.**
> **7. Code and documentation changes should go through Pull Requests.**
> **8. Re-read the current labsheet before final submission.**

---

## Suggested instruction for an AI assistant

When starting a future session, the user can say:

```text
Read GITHUB_WORKFLOW_AI_GUIDE.md first.
Then inspect the current lab instructions, repository state, Issue, branch, PR/review status,
and Project board before making changes.
Follow the guide, but always prioritize the newest current-lab instructions over older rules.
Do not assume branch names, Issue order, or submission requirements from previous labs.
```
