---
name: github-lab-workflow
description: Apply the user's GitHub workflow across course labs by resolving each lab's repository, branches, reviewers, issues, tests and submission rules, while preserving peer review and the documentation confirmation gate before release.
---

# คู่มือ GitHub สำหรับ AI: ใช้กับทุก Lab

อ่านไฟล์นี้ก่อนทำงาน GitHub หรือทำ Lab ต่อ ใช้กฎร่วมกับทุก Lab โดยกำหนดบริบทใหม่จากโจทย์และ repo ปัจจุบัน
รวมคำสั่งผู้ใช้ คู่มือ GITHUB_WORKFLOW_AI_GUIDE(1).md และบทเรียนจากประวัติ GitHub ที่ตรวจเมื่อ 2026-09-10
กฎในไฟล์นี้ไม่ใช่หลักฐานว่า tests, review หรือ merge ของงานปัจจุบันผ่านแล้ว ต้องอ่านสถานะจริงก่อนลงมือ

## 1. ลำดับคำสั่งและสิ่งที่ต้องอ่าน

- ทำตามคำสั่งล่าสุดที่ผู้ใช้ระบุโดยตรง หากขัดกับคู่มือหรือโจทย์ ให้บอกความต่างและถามเฉพาะเรื่องที่จำเป็นต่อการทำงาน
- สำหรับข้อกำหนดวิชา ใช้ประกาศล่าสุดของอาจารย์สำหรับ Lab นั้น → labsheet ปัจจุบัน → กฎเฉพาะ repo/Issue → คู่มือนี้
- แยกข้อบังคับในโจทย์ สิ่งที่ AI เสนอ และการตัดสินใจของผู้ใช้ อย่าอ้างว่าเลข Issue หรือ engineering choice ที่เสนอเองเป็นข้อบังคับของโจทย์
- อ่าน labsheet และโค้ดจริงก่อนกำหนด specification; ถ้า Lab กำหนด specification/test plan ให้ยืนยันตาม flow ก่อนเริ่ม implementation
- เมื่อผู้ใช้ให้ “อ่านอย่างเดียว/อย่าเพิ่งทำ” ให้ตรวจและอธิบายเท่านั้น จนกว่าจะอนุญาตให้เริ่ม
- อย่าคัดลอก branch, จำนวน Issue, ลำดับงาน, test counts หรือรูปแบบส่งงานจาก Lab เก่าโดยไม่ตรวจ
- ถ้าผู้ใช้ถามสถานะหรือแทรกคำถามระหว่างงาน ให้ตอบและรักษางานเดิมไว้ ไม่ถือว่ายกเลิกงานอัตโนมัติ

## 2. กำหนดบริบทใหม่ทุก Lab

อ่านโจทย์และ repo แล้วบันทึกตารางบริบทในเอกสารของ Lab นั้น ใช้ค่าที่ตรวจได้จริง
ห้ามใช้ชื่อคน repo เลข Issue จำนวนงาน หรือ branch จากตัวอย่างย้อนหลังเป็นค่าเริ่มต้น

| ตัวแปร | วิธีระบุ |
| --- | --- |
| LAB_ID / LAB_NAME | เลขและชื่อ Lab จากโจทย์หรือคำสั่งผู้ใช้ล่าสุด |
| REPO / AUTHOR_ACCOUNT | owner/repo และบัญชีผู้เขียนที่ตรวจจาก remote และ GitHub |
| ASSIGNEE / REVIEWER | ผู้รับผิดชอบและเพื่อนผู้รีวิวของ Lab นั้น ตรวจบัญชี สิทธิ์และคำสั่งผู้ใช้ |
| PROJECT / MILESTONE | Project และ milestone ที่ Lab ใช้ ตรวจของเดิมก่อนสร้างหรือเลือกใหม่ |
| MAIN_BRANCH | สาขาปลายทางส่งงาน ตรวจจาก repo/โจทย์ ไม่เดาว่าชื่อ main เสมอ |
| BASE_BRANCH | ฐาน PR ของงานตามโจทย์ เช่น lab{LAB_ID}-staging ถ้ากำหนด staging; ถ้าไม่กำหนด ตรวจ flow ของ repo ก่อนเลือก |
| WORK_BRANCH | branch ใหม่ของ Issue ตาม naming rule ของ Lab หรือชื่อที่สื่อเลข Issue และงาน |
| ISSUE_ORDER / DEPENDENCIES | sequential หรือ parallel เฉพาะที่อนุญาต พร้อม dependency จริง |
| ISSUE_ID / PR_ID | เลขจริงจาก GitHub ไม่คำนวณต่อจาก Lab เก่าหรือสมมติว่า PR เลขเดียวกับ Issue |
| FINAL_ISSUE_ID | Issue ที่รับผิดชอบการตรวจสุดท้าย/เอกสาร/release ไม่กำหนดว่าต้องเป็น Issue ที่ 10 |
| DOCS_ROOT / DOCS_REQUIRED | ที่เก็บและรายการเอกสารตาม Lab เช่น docs/lab-XX |
| TESTS_REQUIRED | checks/commands/environments ที่สัมพันธ์กับ AC และเทคโนโลยีปัจจุบัน |
| SUBMISSION_RULES | รูปแบบ/จำนวนไฟล์ หัวข้อ ลำดับ หลักฐาน คะแนน และช่องทางส่งตาม labsheet |

- จำนวน Issue ให้ยึดโจทย์ ถ้าโจทย์ไม่กำหนด ให้แบ่งตาม scope/dependency และแผนที่ผู้ใช้ตกลง ไม่บังคับสิบ Issue
- ถ้าโจทย์ไม่ระบุลำดับ ใช้ทีละ Issue เป็นค่าเริ่มต้น; parallel ต้องมีคำสั่งหรือข้อกำหนดที่ชัดเจน
- ใช้ Project เดิมเมื่อโจทย์ให้ reuse; สร้างใหม่เมื่อจำเป็นต่อ Lab ห้าม import ทุก Issue หรือเปลี่ยน board โดยไม่ตรวจขอบเขต
- หากยังไม่มี milestone ให้ใช้ชื่อ Lab ที่ยืนยันแล้วตาม flow ของ repo ไม่กำหนดวันส่งเอง
- สร้าง integration branch แยกของ Lab เมื่อโจทย์/flow กำหนด ห้ามสร้างชื่อ staging ตายตัวให้ทุก repo
- หากไม่มี integration branch ให้ระบุ BASE_BRANCH ตามจริง; PR ใดเข้า MAIN_BRANCH ต้องผ่านเงื่อนไขเอกสารและคำยืนยันในข้อ 8
- เก็บการตัดสินใจด้านฟีเจอร์ไว้ใน specification ของ Lab นั้น ไม่ใส่สิทธิ์/สถานะ/ข้อมูล seed ของ Lab หนึ่งเป็นกฎทุก Lab
- ตรวจชื่อและบทบาทบัญชีผู้เขียน/ผู้รีวิวใหม่ ไม่สลับบัญชีหรือส่งข้อความแทนผู้ใช้โดยอาศัยประวัติเก่าเป็นคำอนุญาต
- ถ้าข้อมูลที่จำเป็นยังหาไม่ได้ ให้ถามเฉพาะส่วนที่ขาด และทำงานที่เป็นอิสระจากคำตอบต่อได้

## 3. เริ่มรอบใหม่: ตรวจข้อเท็จจริงก่อนแก้ไข

1. อ่านไฟล์นี้, labsheet ปัจจุบัน, repo instructions/specification ที่ Lab กำหนด และ Issue/AC ที่กำลังทำ
2. ตรวจ working tree และไฟล์ที่ผู้ใช้แก้ค้างไว้ ห้ามลบหรือเขียนทับงานที่ไม่เกี่ยวข้อง
3. ตรวจ repo/remote, บัญชี GitHub, branch, open PR, base/head, dependencies และ Project
4. อ่านทั้ง PR comments, review verdicts และ inline review threads ไม่ดูเพียงคำว่า Approved
5. ตรวจว่างานเดิมยังเปิดหรือ merge แล้วก่อน commit/push เพราะเพื่อนอาจ merge ระหว่างที่ AI ทำงาน
6. สรุปขั้นตอนถัดไปจากสถานะจริง ทำงานที่ได้รับอนุญาตต่อได้โดยไม่ถามซ้ำ; ถ้ายังต้องรอ peer review ให้ระบุ PR และสิ่งที่เพื่อนต้องทำอย่างชัดเจน

แม่แบบคำสั่งอ่านสถานะ แทนค่าทุกช่องจากบริบทที่ตรวจแล้วก่อนรัน ไม่ใช้เลขหรือชื่อจาก Lab เก่า:
```text
git status --short --branch
git remote get-url origin
gh api user --jq .login
gh pr view {PR_ID} --repo {REPO} --json state,headRefName,baseRefName,headRefOid,mergedAt,mergedBy,mergeCommit,reviewRequests,reviews,comments,closingIssuesReferences,assignees,labels,milestone,projectItems,statusCheckRollup
gh issue view {ISSUE_ID} --repo {REPO} --json body,state,assignees,labels,milestone,projectItems,comments
gh api repos/{REPO}/pulls/{PR_ID}/comments
```

ใช้ GraphQL reviewThreads เมื่อต้องตรวจการตอบและการ resolve ของ inline threads และอ่านทุกหน้าหากมี pagination
คำว่า Ready to merge ใน comment ไม่เท่ากับ merged; checkbox เก่าใน PR body ไม่ใช่สถานะจริง
reviewRequests ว่างอาจหมายถึงเพื่อนส่ง review แล้ว ต้องตรวจ reviews ก่อนส่งคำขอซ้ำ
ไม่มี CI checks ไม่เท่ากับ tests ผ่าน ต้องมีหลักฐานการรันในเครื่องหรือระบบทดสอบที่ใช้จริง

## 4. Issue, branch และ Kanban

ใช้สถานะมาตรฐานด้านล่าง หาก Lab ปัจจุบันกำหนดชื่อหรือ flow ต่างกัน ให้บันทึกการเทียบสถานะตามโจทย์ก่อนเปลี่ยน Project

| สถานะ | เปลี่ยนเมื่อ |
| --- | --- |
| Backlog | สร้าง Issue จริงและใส่ Project แล้ว ยังไม่เริ่มตรวจรายละเอียด |
| Specified | อ่าน scope/AC/dependency และเข้าใจครบ |
| Started | สร้าง branch ถูกต้องและเริ่มทำ |
| PR Review | งาน/checks/docs พร้อม PR เปิดและเชื่อม Issue จริง พร้อมข้อมูลด้านขวาครบ |
| Fixing | reviewer ขอแก้หรือ required checks ไม่ผ่าน; แก้ branch/PR เดิม |
| Done | AC ผ่าน ตอบ review ครบ reviewer อนุมัติและ merge แล้ว ตรวจหลักฐานครบ |

- สร้าง real GitHub Issue ไม่ใช้ draft card แทนงานที่ต้องมี PR linkage และกำหนด AC/dependency/ผู้รับผิดชอบ
- ห้ามพัฒนา commit หรือ push โดยตรงบน main หรือ staging ใช้ branch และ PR สำหรับโค้ดและเอกสาร แม้แก้ typo
- สร้าง WORK_BRANCH ใหม่ตามแผนของ Lab จาก BASE_BRANCH ที่อัปเดต ถ้าไม่มี naming rule ใช้ feature/{ISSUE_ID}-{topic} หรือ docs/{ISSUE_ID}-{topic} ตามงาน
- ถ้าแก้ Issue ที่ยังเปิด ใช้ branch เดิม PR เดิม ไม่เปิด PR ซ้ำเพื่อแก้ feedback
- ถ้างานเดิม merge แล้ว การแก้ใหม่ต้องมี branch/PR ใหม่ ระบุ Issue ที่เกี่ยวข้องหรือระบุว่าเป็น follow-up docs ที่ไม่มี Issue เดิม อย่าสร้าง Issue ซ้ำโดยไม่ตรวจ
- รัน checks ที่เหมาะกับสิ่งที่เปลี่ยน ตรวจ diff และ AC ก่อน commit/push เก็บ docs ของงานไว้บน branch เดียวกัน
- รักษา Project ของ Issue และ PR ให้ตรงกัน ไม่เปลี่ยนเป็น Done เพียงเพราะเปิด PR หรือได้รับ Approve
- ถ้า ISSUE_ORDER เป็น sequential ให้รอ Issue ก่อนหน้าผ่าน review ตอบครบ reviewer merge และ Done; ถ้าอนุญาต parallel อย่างชัดเจน ให้เริ่มเฉพาะงานที่อนุญาตและ dependency พร้อม แยก branch/PR ต่อ Issue
- หลัง reviewer merge ให้อัปเดต local BASE_BRANCH แบบ fast-forward ที่ปลอดภัยก่อนแตก branch ถัดไป อย่า reset ทับงานผู้ใช้
- อย่า force-push, rebase ประวัติที่แชร์, ลบ branch หรือเปลี่ยน merge strategy โดยอาศัยตัวอย่างเก่า; ตรวจข้อกำหนดและขอบเขตงานก่อน

## 5. เตรียม PR ให้ครบตั้งแต่ครั้งแรก

PR body ต้องบอกปัญหาและผลที่เปลี่ยน, Issue, AC, tests/checks ที่รันจริง, เอกสาร และจุดที่ต้องการให้เพื่อนตรวจ
ใช้ template ของ repo หากมี; เลข tests, paths และข้อจำกัดต้องเป็นของงานปัจจุบัน
ไม่ติ๊ก peer review/merge ว่าเสร็จก่อนเกิดจริง

| ช่องด้านขวา | สิ่งที่ต้องทำสำหรับ Lab ปัจจุบัน |
| --- | --- |
| Reviewers | ส่ง review request ให้ REVIEWER ที่ยืนยันแล้วจริง การพิมพ์ชื่อใน body ไม่พอ |
| Assignees | ใส่ ASSIGNEE ที่รับผิดชอบ Issue/PR จริง |
| Labels | ใช้ label ที่เกี่ยวข้อง เช่น documentation หรือ enhancement ไม่เติมสิ่งที่ไม่ตรงงาน |
| Projects | เพิ่ม PR เข้า PROJECT ของ Lab ปัจจุบัน และตั้งสถานะให้ตรงกับ Issue |
| Milestone | ใส่ MILESTONE ของ Lab ปัจจุบันให้ PR และ Issue ตรงกัน ไม่เดาชื่อหรือวันส่ง |
| Development | เชื่อม PR_ID ↔ ISSUE_ID ที่ถูกต้องจริง และตรวจผลหลังบันทึก |

- PR ของแต่ละ Issue เข้า BASE_BRANCH; PR ใดที่เข้า MAIN_BRANCH ต้องผ่านข้อ 8 แม้ Lab นั้นไม่มี staging
- ผู้ใช้กำหนดให้เพิ่ม reviewer และเติม sidebar เป็น flow ร่วมทุก Lab แล้ว เมื่อยืนยันบริบทและมีสิทธิ์ดำเนินงาน ให้ทำเป็นขั้นตอนปกติโดยไม่ถามซ้ำ; ถ้า reviewer ยังไม่ทราบ ให้ถามเฉพาะข้อมูลที่ขาด
- การอนุญาตส่ง review request ไม่ใช่การอนุญาตส่ง comment, email หรือข้อความอื่นแทนผู้ใช้
- Closes/Fixes/Resolves ใน body โดยเฉพาะ PR เข้า staging อาจไม่สร้าง Development link ตรวจผ่านหน้า PR หรือ closingIssuesReferences
- ลิงก์ branch ↔ Issue และการอยู่ Project เดียวกันไม่ทดแทน PR ↔ Issue
- ถ้ามีลิงก์ถูกต้องอยู่แล้ว ให้คงไว้และตรวจยืนยัน ไม่สร้างรายการซ้ำ
- อ่านข้อมูลกลับหลังแก้ทุกช่อง ถ้าคำสั่งล้มเหลวบางส่วน ให้แก้เฉพาะส่วนที่ขาดก่อนรายงานว่าเสร็จ

## 6. Review และคอมเมนต์: ใช้ข้อเท็จจริงตามจังหวะงาน

ผู้รีวิวตรวจ Issue/AC และ Files changed, tests/docs แล้วเลือก Comment, Request changes หรือ Approve ตามสิ่งที่พบ
ผู้รีวิวเป็นผู้ merge ผู้เขียน PR/AI ห้าม self-merge หรือใช้บัญชีอื่นอนุมัติงานตัวเอง

| จังหวะ | เนื้อหาที่ควรเตรียม |
| --- | --- |
| พร้อมขอรีวิว | PR/Issue, สิ่งที่เปลี่ยน, จุดที่ต้องตรวจ, checks ที่มีจริง และ base branch |
| ผู้รีวิวตัดสิน | สิ่งที่ผู้รีวิวตรวจจริงและ verdict อย่าเขียนว่ารัน tests ถ้าเพียงอ่านผล |
| ตอบ feedback | ตอบทุก comment ว่าแก้อะไร/อยู่ commit ไหน หรือเหตุผลที่ไม่แก้ พร้อมผลตรวจที่เกี่ยวข้อง |
| หลัง Approve | ขอบคุณและตอบประเด็นรีวิว ยืนยันความพร้อมตามจริง ขอให้เพื่อน merge เข้า base ที่ถูกต้อง |
| หลัง merge | ระบุ PR, ผู้ merge, merge commit, ผล checks และสถานะ Issue ที่ตรวจแล้ว |

- เมื่อผู้ใช้ขอข้อความเหมือน PR ก่อน ๆ ให้ร่างเป็นภาษาอังกฤษตามรูปแบบเดิม พร้อมคำอธิบายไทยว่าควรใช้เมื่อใด
- ข้อความร่างไม่ใช่หลักฐานว่าโพสต์แล้ว; โพสต์แทนผู้ใช้เมื่อได้รับอนุญาตเท่านั้น อย่าบังคับให้มี duplicate comment ทุกจุดเพื่อให้ครบ template
- ข้อความเก่า “I will merge” จาก Lab 1 ไม่ใช่แบบที่ใช้ต่อ ให้ขอ reviewer เป็นผู้ merge
- การแก้ตาม feedback ต้องอยู่ branch/PR เดิม ตอบ thread ก่อน resolve และกลับ PR Review เมื่อพร้อม
- Approve ไม่ลบภาระตอบ comments เก่าที่ยังค้าง; ตรวจทั้ง review body และ inline threads
- ตรวจ review commit เทียบ head ล่าสุด หากมีการแก้หลัง review ให้บอกสิ่งที่เพิ่มและขอ review ใหม่เมื่อจำเป็นก่อน merge
- รวมการแก้เอกสารที่ทราบแล้วให้ครบก่อนขอ review รอบใหม่ ไม่สร้าง commit เพิ่มเพียงเพื่อบันทึกคำขอรีวิวซ้ำวนไปมา
- หากรอเพื่อนอยู่ ให้ส่งลิงก์และขั้นตอนที่ต้องทำ ห้าม self-merge หรือเริ่มงานที่ dependency ยังไม่ผ่าน; ทำงานอื่นได้เฉพาะที่ลำดับ Lab และผู้ใช้อนุญาต
- สถานะ MERGED และ mergedBy จาก GitHub ใช้ตรวจการ merge; หาก Issue ไม่ปิดอัตโนมัติเมื่อเข้า staging ให้ตรวจ AC แล้วปิด/ย้าย Done
- อัปเดต checkbox และหลักฐานที่ล้าสมัยตามจริงโดยไม่แก้ข้อความ review ของคนอื่น

## 7. เอกสารและหลักฐานที่ต้องเก็บระหว่างงาน

ใช้ชื่อและที่เก็บเอกสารตาม DOCS_REQUIRED ของ Lab ปัจจุบัน ชื่อ reviewer.md, ai-use.md และ tests.md ด้านล่างเป็นตัวอย่างหน้าที่เอกสาร ไม่บังคับให้ทุก Lab ใช้ชื่อเหล่านี้

เอกสาร peer review ต้องแยกสองส่วนเมื่อ labsheet กำหนดการรีวิวงานเพื่อน:

1. PR ที่เราเขียนและเพื่อนรีวิว: Issue/PR, branch/base, reviewer/verdict, สิ่งที่ตรวจ, URL review, คำตอบของเรา, ผู้ merge และ commit
2. PR ของเพื่อนที่เรารีวิว: repo/PR/branch, บัญชีที่ใช้จริง, สิ่งที่ตรวจ, verdict, URL review และคำตอบของเพื่อนที่มีจริง

ตรวจ repo ของเพื่อนเฉพาะเมื่อจำเป็นต่อหลักฐานหรือผู้ใช้ขอ ประวัติรีวิว Lab เก่าไม่ใช่หลักฐานว่ารีวิว Lab ปัจจุบันแล้ว
ถ้ายังไม่มี PR/review/คำตอบ ให้บันทึกว่ายังไม่มี อย่าสร้างข้อความย้อนหลังหรือแอบใช้บัญชีอื่น

ai-use.md บันทึก prompt จริง, สิ่งที่ AI ช่วย, การตัดสินใจ/การตรวจของผู้ใช้ที่เกิดจริง และ reflection ที่ผู้ใช้เขียนหรือยืนยัน
อย่าเปลี่ยนงานที่ AI ทำให้เป็นคำกล่าวอ้างว่าผู้ใช้ทำเอง หรือยก prompts/reflection ของ Lab เก่ามาเป็นหลักฐานรอบใหม่

tests.md เชื่อม AC → test file/scenario → command/result/environment/commit แยก Planned, Not run, Pass และ Fail
- อย่ายึด counts เก่าหรือคำว่า “all passed” ใน comment เป็นผลของ commit ล่าสุด
- อ่าน test scripts/config ของเทคโนโลยีที่ใช้จริงก่อนรัน เช่น package.json สำหรับ Node อย่าสรุปว่าชื่อคำสั่งเดิมครอบคลุม Lab ปัจจุบัน ตรวจ test paths/projects และสิ่งที่ถูก include/exclude
- Mock tests ไม่พิสูจน์ database/concurrency/file persistence; เลือก integration/E2E ตาม AC และบันทึกขอบเขตที่ตรวจได้จริง
- ถ้าพบ implementation bug ระหว่าง quality audit ให้แก้พร้อม regression ที่เกี่ยวข้องและบอก scope ใน PR ไม่แก้แค่รายงานให้ดูผ่าน
- ถ้า Lab มี UI ให้ตรวจ failure/loading/empty/validation/ownership, keyboard/focus และขนาดหน้าจอตาม scope ไม่เก็บเพียง happy path
- ถ้า Lab ต้องส่ง screenshots/PDF ให้ตรวจสิ่งที่ render จริง ข้อความอ่านได้ paths/links ถูกต้อง และหัวข้อครบ ถ้าใช้รูปแบบอื่น ให้ตรวจ artifact ตาม SUBMISSION_RULES
- ตรวจ README/setup, repository structure, .gitignore และไฟล์ tracked ไม่ให้มี credentials, .env, node_modules หรือ output ที่ไม่ควรส่ง
- ไม่ reset working database หรือทับข้อมูลผู้ใช้เพื่อให้ tests ผ่าน ใช้ฐานข้อมูลทดสอบตาม contract

การบันทึกภาษาไทยและ Markdown:
- เขียนและอ่านกลับเป็น UTF-8 ตรวจทั้งอักขระเสียและเครื่องหมายคำถามที่มาแทนภาษาไทย
- บน Windows อย่าคิดว่า PowerShell pipeline เข้า Python รองรับ UTF-8 โดยอัตโนมัติ ใช้ UTF-8 pipeline ที่ตั้งชัดเจนหรือ JSON ที่ escape Unicode
- PR/Issue body หลายบรรทัดใช้ UTF-8 file กับ --body-file หรือ structured tool argument ตรวจเนื้อหาหลังส่ง
- ตรวจ newlines ไม่ให้กลายเป็นข้อความ backslash-n หรือ CR ซ้ำ และรัน git diff --check
- ถ้าตัวตรวจเอกสารขาด dependency ให้รายงาน checks ที่ทำได้จริง ไม่ระบุว่าตัวตรวจนั้นผ่าน

## 8. เอกสารต้องเสร็จและถามผู้ใช้ก่อนขึ้น main

กฎนี้ใช้กับทุก Lab ตามคำสั่งผู้ใช้: ทำเอกสารให้เสร็จและถามยืนยันก่อนขึ้น main
ใช้กับ FINAL_ISSUE_ID/ขั้น release ที่ตรวจจาก Lab ปัจจุบัน ไม่ผูกกับ Issue ที่ 10 หรือเลขใด
MAIN_BRANCH หมายถึงสาขาปลายทางส่งงานจริง ซึ่งมักชื่อ main; ถ้าชื่ออื่นให้ใช้ชื่อที่ยืนยันแล้วในคำถามและ PR

1. ทำ pre-release package ตาม DOCS_REQUIRED/SUBMISSION_RULES ให้เสร็จก่อนขออนุมัติ เช่น specification, API/UI specs, tests/traceability และผล BASE_BRANCH, reviewer record, ai-use/reflection, README, screenshots/checklist และร่างรายงาน หาก Lab ไม่กำหนดรายการใด ไม่สร้างข้อบังคับเพิ่มเอง
2. ให้ลิงก์ไฟล์ที่พร้อมอ่านจริง ระบุเฉพาะหลักฐาน final-main ที่ต้องเติมหลัง merge และยังไม่สามารถเกิดขึ้นตอนนี้ อย่าแต่งล่วงหน้า
3. ก่อนเตรียม release PR จาก BASE_BRANCH ไป MAIN_BRANCH ถามผู้ใช้ตรง ๆ; ถ้าไม่มี staging ให้ถามก่อนเตรียม PR จาก WORK_BRANCH เข้า MAIN_BRANCH:

> เอกสารเสร็จครบแล้วหรือยัง มีอะไรต้องการแก้ก่อนขึ้น main ไหม?

4. รอคำตอบยืนยันชัดเจนก่อนดำเนิน release การยืนยัน specification, “เริ่มทำต่อ”, tests ผ่าน, เพื่อน Approve หรือเวลาที่ผ่านไป ไม่แทนคำยืนยันนี้
5. ถ้าขอแก้ ให้แก้ผ่าน branch/PR ของงาน อัปเดตเอกสารและหลักฐาน แล้วถามยืนยันใหม่
6. หลังผู้ใช้ยืนยัน จึงเตรียม PR เข้า MAIN_BRANCH พร้อม sidebar ครบ ให้เพื่อน review และเป็นผู้ merge
7. ตรวจ MAIN_BRANCH SHA หลัง merge และรัน checks ที่ Lab กำหนดบน commit นั้น เก็บผลและหลักฐาน merge/board/review จริง
8. ถ้า MAIN_BRANCH เปลี่ยนหลังทดสอบ ต้องประเมินและตรวจผลกับ SHA ใหม่ก่อนเรียกว่า final-main ไม่ใช้ merge SHA เก่าแทน latest main
9. เติมหลักฐานหลัง merge ลง artifact ส่งงานตาม SUBMISSION_RULES ส่วน tracked files ที่ต้องแก้ต้องผ่าน branch/PR/review และคำยืนยันก่อนเข้า MAIN_BRANCH สำหรับการแก้นั้น
10. FINAL_ISSUE_ID ที่รับผิดชอบ release ยังไม่ Done เพียงเพราะ PR ฟีเจอร์เข้า staging; ต้องผ่าน user gate, reviewer release merge, checks และเอกสารตาม AC ให้ครบก่อน

อ่าน rubric ต้นฉบับก่อนส่งทุก Lab ตรวจชนิด/จำนวนไฟล์ หัวข้อ ลำดับ คะแนน หลักฐานและช่องทางส่งตาม SUBMISSION_RULES
ไม่กำหนดตายตัวว่าต้องเป็น PDF เดียว, Answer Part 1–9 หรือจำนวนหน้า/ภาพ/tests เท่ากับ Lab ใดในอดีต

## 9. ประวัติที่ตรวจแล้วและบทเรียนที่ใช้ต่อ

ตรวจ PR ของ BOOky-OS/toktickit ทั้ง 18 รายการที่มีในวันที่ 2026-09-10:
#5–#10, #19–#27, #29, #31 และ #42 รวม body, review verdicts, comments และ inline threads
ตรวจรายละเอียด Issue #28/#30 และประวัติ main ประกอบ
ตารางนี้เป็นตัวอย่างย้อนหลังจาก TokTickIT เท่านั้น ไม่ใช่ค่าเริ่มต้นหรือสถานะสดของ Lab ปัจจุบัน
ชื่อบัญชี repo เลข Issue/PR และรูปแบบส่งงานในตารางห้ามใช้แทนการกำหนดบริบทข้อ 2

| หลักฐาน | สิ่งที่พบและวิธีใช้ |
| --- | --- |
| [PR #5](https://github.com/BOOky-OS/toktickit/pull/5) และ [PR #10](https://github.com/BOOky-OS/toktickit/pull/10) | Lab 1 มี author merge จริง จึงห้ามคัดลอก “I will merge” เป็นกฎของ Lab ใหม่ |
| [PR #19](https://github.com/BOOky-OS/toktickit/pull/19) | มี contract/test plan ก่อน implementation พร้อม review และ author reply; Atip-Infa เป็นผู้ merge |
| [PR #26](https://github.com/BOOky-OS/toktickit/pull/26) | พบ attachment persistence payload bug ตอน integration audit; ต้องตรวจระบบจริง ไม่สรุปจาก mock tests อย่างเดียว |
| [Issue #28](https://github.com/BOOky-OS/toktickit/issues/28) / [PR #29](https://github.com/BOOky-OS/toktickit/pull/29) | ต้องเติม review focus, response links, งานที่รีวิวให้เพื่อน, บทบาทบัญชี และแก้ UTF-8/สถานะ pending เก่า ใช้เป็นรายการตรวจเอกสารตั้งแต่ระหว่างงาน |
| [Issue #30](https://github.com/BOOky-OS/toktickit/issues/30) / [PR #31](https://github.com/BOOky-OS/toktickit/pull/31) | มีงาน conformance/tests/screenshots/PDF เพิ่มหลัง release; ใช้เป็นบทเรียนให้เตรียมเอกสารที่ Lab ปัจจุบันกำหนดก่อนถามขึ้น main |
| [PR #31](https://github.com/BOOky-OS/toktickit/pull/31) | ณ วันที่ตรวจ PR merge แล้วแต่ body ยังมี peer-review checkbox ค้าง; ให้ตรวจ reviews/mergedBy/mergeCommit และปรับ records ตามจริง |
| [ประวัติ main](https://github.com/BOOky-OS/toktickit/commits/main/) | มี commits หลัง merge #31; ยืนยัน final-main ด้วย SHA ที่ตรวจจริง ไม่สรุปว่า release merge commit คือ main ล่าสุดเสมอ |
| [PR #42](https://github.com/BOOky-OS/toktickit/pull/42) | ต้องเติม reviewer/sidebar และมี review เกิดระหว่างแก้เอกสาร; อ่านสถานะกลับ ตรวจ approval commit และเตรียมการแก้ให้ครบก่อนขอ review รอบใหม่ |

ประวัติ Lab 1 ที่เคยอนุญาต Issue 2/3 ทำขนานหรือการแก้เอกสารย้อนหลัง เป็นข้อยกเว้นเก่า
ไม่ใช้อนุญาต parallel work, self-merge หรือข้าม main gate ใน Lab ปัจจุบัน
รูปแบบที่เคยเกิดขึ้นไม่เท่ากับข้อกำหนดที่ต้องทำตามทุกครั้ง

## 10. ส่งต่องานให้ AI รอบถัดไป

ก่อนจบงาน แจ้ง Issue/PR/branch, commit ที่ push, checks ที่รันจริง, reviewer/status,
สิ่งที่ยังรอ และขั้นตอนถัดไปที่ทำได้ ไม่บอกว่าเสร็จทั้ง Lab หากเสร็จเพียง Issue
เก็บกฎถาวรไว้ที่ไฟล์นี้ ส่วนบริบท progress และหลักฐานแต่ละ Lab ไว้ใน DOCS_ROOT ที่ Lab กำหนด เช่น docs/lab-XX และ GitHub
ปรับคู่มือตามคำสั่งใหม่หรือบทเรียนที่ตรวจได้จริง อย่าเพิ่มข้อห้ามทั่วไปจากเหตุการณ์ที่ยังไม่เคยพบ

ไฟล์ root skill.md เป็นคู่มือที่ผู้ใช้เลือกให้ AI อ่าน ไม่อ้างว่าติดตั้งเป็น skill ที่ทุก session จะโหลดให้อัตโนมัติ
ข้อความเริ่มรอบใหม่ที่ผู้ใช้คัดลอกได้:

```text
อ่าน skill.md ที่ root ของ workspace ให้ครบก่อน
ระบุ Lab ปัจจุบันและกำหนดค่าบริบทตามข้อ 2 จากโจทย์ repo และ GitHub จริง ห้ามใช้ค่า Lab เก่าเป็นค่าเริ่มต้น
แล้วตรวจ labsheet/specification โค้ด Issue/AC branch PR/review และ Project ของ Lab นั้น
ทำงานต่อจากสถานะล่าสุดตาม flow โดยรักษางานที่แก้ค้างไว้และใช้ branch/PR ให้ถูกต้อง
เติม reviewer และข้อมูลด้านขวา PR ให้ครบ ตอบ review และให้เพื่อนเป็นผู้ merge
ก่อนขึ้น main ให้ทำเอกสารให้พร้อมตรวจ แล้วถามและรอฉันยืนยันก่อนเสมอ
```
