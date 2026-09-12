"""Build the pre-release Lab 3 evidence draft; never imply final-main completion.

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
OUT = ROOT / "output/pdf/Lab_03_Evidence_Supapanya_Yathip_67070503443_DRAFT.pdf"
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
    return link(name, f"{REPO}/blob/lab3-staging/docs/lab-03/{name}")


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
add("TokTickIT - Lab 3 evidence draft", "Title")
add("Supapanya Yathip | 67070503443<br/>Partner reviewer: Atip Infa-Udom | Atip-Infa")
add("<b>PRE-RELEASE DRAFT - NOT READY FOR SUBMISSION.</b> Issue #41 is in progress. "
    "Student reflection, reciprocal peer-review evidence, final audit review and the explicit "
    "documentation gate remain outstanding. Main merge and final-main results do not yet exist for this release.")
add(link("Repository", REPO) + " | " + link("Project board", "https://github.com/users/BOOky-OS/projects/2") +
    " | " + link("Final audit Issue #41", REPO + "/issues/41"))
table(["Issue", "Increment", "PR to lab3-staging"], [
    [32, "Engineering contract", 42], [33, "Migration and seed", 43], [34, "Authentication API", 44],
    [35, "Authentication UI", 45], [36, "Requester regression", 46], [37, "Staff queue", 47],
    [38, "Staff operations", 48], [39, "Comments and notes", 49], [40, "User administration", 50],
    [41, "Final audit and release", "Not yet opened"],
], [20, 99, 55])
add("Issues #32-#40 entered staging through feature PRs. Current audit branch: "
    "feature/41-lab3-quality-release, based on 7831409. PR #50 was approved by Atip-Infa "
    "at cf788ca and merged by that reviewer as 7831409181d8728c765216f64d747148ad1d8d01.")
add(link("PR #50 review", REPO + "/pull/50") + " | " +
    link("Author after approval", REPO + "/pull/50#issuecomment-5645571107") + " | " +
    link("Author after merge", REPO + "/pull/50#issuecomment-5645572981"))
add("The full historical review record is in " + document("reviewer.md") +
    ". All-Issues-Done board capture and main release history are pending; this draft does not substitute old Lab 2 evidence.")

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
    ["Server regression", "220/220 in 24 files, 125.29 s after session resume; separate new authorization cases recorded in audit."],
    ["Client regression", "82/82 in 13 files, 53.57 s; contrast case also passed after the test-import adjustment."],
    ["Real browser suite", "14/14 passed in 1.4 min with queue, upload recovery, user safety and responsive additions."],
    ["Build", "Client and server builds passed after final TypeScript corrections; Prisma schema validation passed."],
    ["Long-text regression", "Initially failed all three roles. Detail grid wrapping corrected; responsive tests then passed."],
    ["Final main", "Pending reviewer merge and checks on the actual final-main SHA. No main pass claimed."],
], [49, 125])
add("Reproduce with TEST_DATABASE_URL set to the isolated local toktickit_lab3_test database and "
    "<b>npm run test:e2e:lab3</b>. Dedicated ports 3006/5176, owned random schema and temporary file storage "
    "prevent tests from reusing the working app. Existing database contents are not reset.")
add("The upload recovery case aborts the first HTTP upload as deliberate fault injection. "
    "Retry, database persistence, download bytes and authorization use the real system. "
    "The expiry case changes only its owned session's persisted expiration.")
add("Commands, file-level traceability and remaining limitations: " + document("tests.md") + " and " +
    link("Current local audit branch", REPO + "/tree/feature/41-lab3-quality-release") + ".")

part(4, "AI use and My Reflection")
add("Assistant: Codex (GPT-6). The following are English translations of eight actual Thai prompt excerpts; "
    "the original text and observed decisions are preserved in " + document("ai-use.md") + ".")
table(["#", "Translated actual prompt excerpt", "Result"], [
    [1, "Read and understand everything first; do not implement yet.", "Read the sheet and workspace before implementation."],
    [2, "Read this too (GitHub workflow guide).", "Apply reviewer merge, responses and project tracking."],
    [3, "Summarize what Lab 3 requires and how many Issues.", "Propose ten work packages, not a mandated Issue count."],
    [4, "Finish documents before going to main.", "Preserve an explicit student documentation gate."],
    [5, "Do not forget a new branch for Lab 3.", "Feature branches and reviewed staging integration."],
    [6, "Admin manages users and views Tickets; IT Staff edits Tickets.", "Use the agreed permission matrix."],
    [7, "Okay, continue implementing.", "Continue after contract confirmation."],
    [8, "My friend has merged it.", "Verify GitHub merge and replies before the next Issue."],
], [9, 88, 77])
add("<b>My Reflection - student contribution pending.</b> The student has been asked what AI helped with, "
    "what they personally checked or changed, and what they learned. No first-person reflection is fabricated here.")
add("Observed AI critique: mocked UI tests were insufficient to prove persistence. Real E2E exposed a long-text "
    "overflow and an awkward create-user password order. The assistant corrected these and ran regression checks. "
    "These are assistant-performed activities, not claims about student or peer testing.")

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
add("<b>Before submission:</b> finish the student reflection and reciprocal-review evidence, resolve remaining "
    "audit checklist items, review the staging PR, obtain explicit document approval before main, then add "
    "actual reviewer merge, final-main tests and completed board evidence. This draft must be regenerated afterward.")


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GREEN)
    canvas.drawString(18 * mm, 12 * mm, "TokTickIT | Lab 3 | PRE-RELEASE DRAFT")
    canvas.drawRightString(A4[0] - 18 * mm, 12 * mm, str(doc.page))
    canvas.restoreState()


if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
                      topMargin=17 * mm, bottomMargin=20 * mm,
                      title="Lab 3 evidence draft - Supapanya Yathip", author="Supapanya Yathip").build(
        story, onFirstPage=footer, onLaterPages=footer)
    print(OUT)
