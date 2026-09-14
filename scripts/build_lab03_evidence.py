"""Build the Lab 3 verified-main evidence report.

Run after npm run test:e2e:lab3 has generated the real browser screenshots.
Dependencies: reportlab, pillow. All source data is local, with explicit links.
"""
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/pdf/Lab_03_Evidence_Supapanya_Yathip_67070503443_FINAL.pdf"
SHOTS = ROOT / "artifacts/lab-03/screenshots/real"
REPO = "https://github.com/BOOky-OS/toktickit"
GREEN = colors.HexColor("#006b3c")
LIGHT = colors.HexColor("#eaf6ef")
styles = getSampleStyleSheet()
styles["Title"].textColor = GREEN
styles["Heading1"].textColor = GREEN
styles["Heading2"].textColor = GREEN
styles["BodyText"].fontSize = 9
styles["BodyText"].leading = 12
styles.add(ParagraphStyle(name="SmallNote", parent=styles["BodyText"], fontSize=8, leading=10))
story = []


def p(text, style="BodyText"):
    return Paragraph(text, styles[style])


def add(text, style="BodyText"):
    story.extend([p(text, style), Spacer(1, 3 * mm)])


def link(title, url):
    return f'<a href="{escape(url)}" color="#006b3c"><u>{escape(title)}</u></a>'


def document(name):
    return link(name, f"{REPO}/blob/main/docs/lab-03/{name}")


def table(headers, rows, widths):
    result = Table([[p(escape(str(x)), "SmallNote") for x in row] for row in [headers, *rows]],
                   colWidths=[w * mm for w in widths], repeatRows=1, hAlign="LEFT")
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), .4, colors.HexColor("#c9d4cd")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.extend([result, Spacer(1, 4 * mm)])


def shot(name, width=174, max_height=145, bottom=False):
    path = SHOTS / name
    if not path.is_file():
        raise FileNotFoundError(f"Run the real browser suite first: {path}")
    picture = PILImage.open(path).convert("RGB")
    buffer = BytesIO()
    picture.save(buffer, format="PNG")
    buffer.seek(0)
    scale = min(width * mm / picture.width, max_height * mm / picture.height)
    story.append(Image(buffer, width=picture.width * scale, height=picture.height * scale))
    add(f"Real application capture: {escape(name)} (complete captured region, no image cropping).", "SmallNote")


def part(number, title):
    if number > 1:
        story.append(PageBreak())
    add(f"Answer Part {number}", "Heading1")
    add(title, "Heading2")


part(1, "Git workflow and peer review")
add("TokTickIT - Lab 3 release evidence", "Title")
add("Supapanya Yathip | 67070503443<br/>Partner reviewer: Atip Infa-Udom | Atip-Infa")
add("<b>MAIN RELEASE VERIFIED.</b> Atip-Infa merged PR #54 on 2026-09-14. "
    "The implementation was tested at main commit f401341. Final documentation is prepared for peer review; Issue #41 remains open until that integration is complete.")
add("Verified implementation: f40134124261d2861d7f480adec34f074561fc94.", "SmallNote")
add(link("Repository", REPO) + " | " + link("Project board", "https://github.com/users/BOOky-OS/projects/2") +
    " | " + link("Final audit Issue #41", REPO + "/issues/41"))
table(["Issue", "Increment", "PR to lab3-staging"], [
    [32, "Engineering contract", 42], [33, "Migration and seed", 43], [34, "Authentication API", 44],
    [35, "Authentication UI", 45], [36, "Requester regression", 46], [37, "Staff queue", 47],
    [38, "Staff operations", 48], [39, "Comments and notes", 49], [40, "User administration", 50],
    [41, "Audit and main release verified", 51],
], [20, 99, 55])
add("PRs #42-#51 were peer-merged into staging. Atip-Infa approved PR #51 at e0a9c75 and merged it as 75bd6d3.")
add("PR #52 documentation was approved at 75d65ff and peer-merged as 4fc4859. " + link("PR #52 review and responses", REPO + "/pull/52") + ".")
add("PR #53 was approved at b3242ba and merged as e233f8e. PR #54 was approved at e233f8e and merged to main as f401341. " + link("Release approval", REPO + "/pull/54#pullrequestreview-5194876098") + ".")
add(link("PR #51 approval", REPO + "/pull/51#pullrequestreview-5191031280") + " | " +
    link("Author after approval", REPO + "/pull/51#issuecomment-5653949998") + " | " +
    link("Author after merge", REPO + "/pull/51#issuecomment-5653963007"))
add("Nine reciprocal reviews of Atip-Infa PRs #37-#45, submitted and merged by zerotwobook, include both partner responses in " + document("reviewer.md") +
    ". Partner PR #41 has a recorded title/review versus Issue/branch mismatch. PR #42 in our repository approved an earlier head; its later merge is recorded separately.")
add("Document links target main. This final-main evidence update is prepared on docs/41-final-main-evidence and awaits documentation review and integration.", "SmallNote")

part(2, "Specification-driven development")
add("The engineering contract preceded feature implementation in Issue #32 / PR #42. "
    "The student explicitly selected Admin user management and read-only Ticket access, with IT Staff performing Ticket mutations.")
table(["Contract area", "Implemented boundary"], [
    ["Identity and roles", "One role per user; real password login; mandatory initial-password change; inactive accounts denied."],
    ["Requester", "Session-owned Tickets and files, public comments, advisory resolution indication; no formal resolution."],
    ["IT Staff", "Queue, claim/reassign, IT Priority, eight-state workflow, public history/comments and private notes."],
    ["Administrator", "User create/edit/activation/password reset. Ticket/comments/notes are read-only."],
    ["Data evolution", "Preserve existing Ticket/Attachment identity; evolve Development Requesters into Users; repeatable guarded seed."],
    ["Excluded", "No self-registration, email delivery, multiple roles, user deletion, bulk operations or Actions Taken."],
], [39, 135])
add("Source contracts: " + " | ".join(document(name) for name in ["specification.md", "api-spec.md", "ui-spec.md", "migration.md"]))
add("FR/BR/AC, exact API schemas, safe errors, role matrix, workflow transitions and Definition of Done remain linked to actual test files in " + document("tests.md") + ".")

part(3, "Test-driven development and verification")
add("The plan was reviewed with the contract before implementation. Tests distinguish unit/component checks, "
    "real PostgreSQL API/concurrency checks, mocked browser checks and real-browser E2E.")
table(["Observed execution", "Result and limits"], [
    ["Server regression", "445/445 in 27 files, 114.80 s on 2026-09-14; no failures or skips. Includes the new matrix and safe-error suites."],
    ["Traceability correction", "API-06: 195 role/method checks using real HTTP login. API-25: 16 safe-error cases. API-04/07 now link completed Admin/Requester tests."],
    ["Client regression", "82/82 in 13 files, 54.97 s on verified main."],
    ["Real browser suite", "14/14 passed in 1.0 min on verified main with queue, upload recovery, user safety and responsive additions."],
    ["Build", "Client and server production builds passed; Prisma schema validation passed on verified main."],
    ["Long-text regression", "Initially failed all three roles. Detail grid wrapping corrected; responsive tests then passed."],
    ["Mocked browser regressions", "Queue, operations, communication and users: 3/3 each across desktop, tablet and mobile. These complement real E2E."],
    ["Final main", "Passed at f401341. Node 24.19.0; npm 11.17.0; PostgreSQL 16.13. Documentation integration is separate."],
], [49, 125])
add("Latest server command: <b>npm test --workspace server -- --maxWorkers=1</b>; build: <b>npm run build</b>. Client: <b>npm test --workspace client -- --maxWorkers=1</b>. All were rerun on released main.")
add("Reproduce with TEST_DATABASE_URL set to the isolated local toktickit_lab3_test database and "
    "<b>npm run test:e2e:lab3</b>. Dedicated ports 3006/5176, owned random schema and temporary file storage "
    "prevent tests from reusing the working app. Existing database contents are not reset.")
add("Matrix grants reach expected read/validation/lookup handlers; successful mutations are covered separately by the domain suites. Safe-error checks inject database/storage failures and verify JSON envelopes without sensitive data.")
add("The upload recovery case aborts the first HTTP upload as deliberate fault injection. "
    "Retry, database persistence, download bytes and authorization use the real system. "
    "The expiry case changes only its owned session's persisted expiration.")
add("Commands, file-level traceability and remaining limitations: " + document("tests.md") + " and " +
    link("Final evidence branch", REPO + "/tree/docs/41-final-main-evidence") + ".")

part(4, "AI use and My Reflection")
ai_use = (ROOT / "docs/lab-03/ai-use.md").read_text(encoding="utf-8")
add("<b>Assistant:</b> OpenAI Codex (GPT-6). I use AI to summarize lab documents, help write and fix code, explain errors, and troubleshoot technical problems. It also helps organize documentation and the GitHub workflow.")
add("These are concise English paraphrases of eight actual requests/answers, following the current " + document("ai-use.md") + ". Technical checks were assistant-run; my role included project decisions and workflow requirements.", "SmallNote")
table(["#", "Representative prompt", "How AI helped / my decision"], [
    [1, "Read the Lab 3 sheet and project carefully before implementing.", "Understand requirements and existing code before I authorized work."],
    [2, "Summarize Lab 3 and the Issues we need.", "Organize ten work packages to guide implementation."],
    [3, "Read skill.md and remind me at each GitHub workflow step.", "Apply branches, linked Issues, peer review and complete PR metadata."],
    [4, "Admin manages users and views Tickets; IT Staff edits Tickets.", "Apply my chosen role separation in the contract and code."],
    [5, "Does the specification follow the original lab sheet?", "Check alignment before I asked it to continue."],
    [6, "Find the code causing the error and help fix it.", "Explain the cause, fix related code and rerun relevant checks."],
    [7, "Check what is still missing before continuing.", "Audit tests, code and documents; explain remaining work."],
    [8, "Finish documents and ask me before going to main.", "Keep a documentation checkpoint before release."],
], [9, 83, 82])
add("<b>Critical-thinking.</b> I clarified the Admin/IT Staff role decision. Real-browser checks later exposed a long-text layout problem; AI fixed it and reran the checks. This illustrates why the working application and test evidence matter alongside suggestions.")
add("My Reflection", "Heading2")
reflection = ai_use.split("## My Reflection", 1)[1].split("\n## ", 1)[0].strip()
for paragraph in reflection.split("\n\n"):
    add(escape(" ".join(paragraph.splitlines())))

part(5, "Login and mandatory password change")
add("Actual email/password login routes three roles to their permitted home. Invalid and inactive credentials "
    "produce the same safe failure. Password fields clear after failure. Initial/reset passwords require a change "
    "before protected API access. Logout and persisted expiry deny the old session.")
shot("login-region.png", width=80, max_height=82)
shot("mandatory-password-region.png", width=85, max_height=100)

part(6, "IT Staff Ticket Queue")
add("The real queue supports combined search, status, owner and priority filtering, stable sorting, pagination "
    "and no-results recovery. The browser test verifies 12 matching rows split into pages of 10 and 2, "
    "ordered by Summary. Small screens use labelled cards.")
shot("staff-home-desktop.png", max_height=155)
add("Priority/status badges now use the shared Zen styling. Queue query validation, unauthorized access "
    "and safe failures are also covered by API/component tests; see " + document("staff-queue.md") + ".")

part(7, "Ticket operations, communication and requester regression")
add("Real E2E covers Requester creation, Staff search/claim/reassign/priority, public comments, internal notes, "
    "Requester indication, Staff resolve/close/reopen, and read-only Admin detail. Reopen clears obsolete "
    "resolution/closure/indication fields. Requesters cannot read private notes, another requester's Ticket or file.")
shot("staff-detail-region.png", max_height=140)
add("Requester regression checks a failed first upload and manual retry against the same saved Ticket, "
    "search, identical downloaded bytes after reload, cross-user denial, and removed-file denial after reload.")
add("Detailed constraints and historical tests: " + document("staff-operations.md") + " | " + document("communication.md") + ".")

part(8, "Administrator user management")
add("The real browser flow creates a user, changes the initial password, edits the display name, resets the password, "
    "verifies old-session revocation and forced change, deactivates/reactivates the account and searches by name/role. "
    "Duplicate email is rejected; the current/last Administrator cannot be disabled through the UI. "
    "The API additionally enforces these guards against direct requests and concurrent changes.")
shot("admin-create-region.png", width=95, max_height=78)
shot("admin-edit-reset-region.png", width=95, max_height=85)

part(9, "Zen Green, responsive layout and accessibility")
add("Shared cards, fields, buttons, readable badges and role navigation continue the Lab 2 theme. "
    "The final audit checks 1440x900, 834x1112 and 390x844 CSS viewports and 720x450 reflow "
    "equivalent to 200% of a 1440x900 viewport; this is not an OS/browser chrome zoom assertion.")
shot("requester-detail-region.png", max_height=90)
shot("login-mobile.png", width=52, max_height=112)
add("Long persisted Description text wraps inside the detail grid. Keyboard checks cover Login tab order, "
    "create-user initial password before Save, and Staff dialog Escape/focus restoration. "
    "Full screenshot inspection/checklist is recorded separately in " + document("ui-spec.md") + ".")
add("<b>Release evidence:</b> PR #54 peer approval and main merge are recorded; final-main automated checks passed on 2026-09-14. Final documentation review and board completion remain before submission. The older DRAFT PDF is historical; use this report for final documentation review.")


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GREEN)
    canvas.drawString(18 * mm, 12 * mm, "TokTickIT | Lab 3 | VERIFIED MAIN")
    canvas.drawRightString(A4[0] - 18 * mm, 12 * mm, str(doc.page))
    canvas.restoreState()


if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
                      topMargin=17 * mm, bottomMargin=20 * mm,
                      title="Lab 3 release evidence - Supapanya Yathip", author="Supapanya Yathip").build(
        story, onFirstPage=footer, onLaterPages=footer)
    print(OUT)
