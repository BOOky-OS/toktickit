from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf/Lab_02_Evidence_Supapanya_Yathip_67070503443.pdf'
SHOTS = ROOT / 'artifacts/lab-02/screenshots'
REPO = 'https://github.com/BOOky-OS/toktickit'
PROJECT = 'https://github.com/users/BOOky-OS/projects/2'
G900 = colors.HexColor('#006B3C')
G700 = colors.HexColor('#0B7A46')
G100 = colors.HexColor('#EAF6EF')
INK = colors.HexColor('#20342B')
MUTED = colors.HexColor('#5B6F64')
BORDER = colors.HexColor('#C9D4CD')

ss = getSampleStyleSheet()
ss['Title'].textColor = G900
ss['Title'].fontSize = 24
ss['Title'].leading = 29
ss['Heading1'].textColor = G900
ss['Heading1'].fontSize = 20
ss['Heading1'].leading = 24
ss['Heading2'].textColor = G700
ss['Heading2'].fontSize = 13
ss['BodyText'].textColor = INK
ss['BodyText'].fontSize = 8.5
ss['BodyText'].leading = 11.2
ss.add(ParagraphStyle(name='Caption', parent=ss['BodyText'], fontName='Helvetica-Oblique', fontSize=7.5, textColor=MUTED, alignment=TA_CENTER))

def p(text, style='BodyText'):
    return Paragraph(text, ss[style])

def link(label, url):
    return '<a href=\'' + url + '\' color=\'#0B7A46\'><u>' + label + '</u></a>'

def box(title, body):
    result = Table([[p('<b>' + title + '</b>')], [p(body)]], colWidths=[174*mm])
    result.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), G100),
        ('BOX', (0,0), (-1,-1), .7, BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    return result

def table(headers, rows, widths):
    data = [[p('<b>' + item + '</b>') for item in headers]]
    data += [[p(str(cell)) for cell in row] for row in rows]
    result = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
    result.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), G900),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('GRID', (0,0), (-1,-1), .45, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    return result

def shot(relative, caption, max_h=165*mm):
    image = Image(str(SHOTS / relative))
    scale = min(174*mm/image.imageWidth, max_h/image.imageHeight)
    image.drawWidth = image.imageWidth*scale
    image.drawHeight = image.imageHeight*scale
    image.hAlign = 'CENTER'
    return KeepTogether([image, p(caption, 'Caption')])

def grid(items, max_h=115*mm):
    width = 55*mm if len(items) == 3 else 84*mm
    images = []
    captions = []
    for relative, caption in items:
        image = Image(str(SHOTS / relative))
        scale = min(width/image.imageWidth, max_h/image.imageHeight)
        image.drawWidth = image.imageWidth*scale
        image.drawHeight = image.imageHeight*scale
        images.append(image)
        captions.append(p(caption, 'Caption'))
    result = Table([images, captions], colWidths=[width+3*mm]*len(items), hAlign='CENTER')
    result.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    return result

def decor(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 8*mm, 'Supapanya Yathip - 67070503443')
    canvas.drawRightString(A4[0]-18*mm, 8*mm, 'Page ' + str(canvas.getPageNumber()))
    canvas.restoreState()

s = [Spacer(1, 25*mm), p('Lab 2 Evidence Report', 'Title')]
s += [p('TokTickIT Requester Ticketing MVP with UI Foundation', 'Heading2')]
s += [box('Student', 'Supapanya Yathip - 67070503443')]
s += [Spacer(1, 5*mm), box('Reviewer', 'Atip-Infa')]
s += [Spacer(1, 5*mm), box('Source of truth', link('BOOky-OS/toktickit', REPO))]
s += [PageBreak()]

s += [p('Answer Part 1', 'Heading1'), p('Git Use with Engineering Workflow', 'Heading2')]
s += [p('Contract PR #19 preceded feature PRs #20-#26 into lab2-staging. Release PR #27 merged staging into main. Issues #11-#18 are Done in ' + link('Project #2', PROJECT) + '.')]
s += [table(['Issue', 'Branch / PR', 'Outcome'], [
    ('#11', 'feature/11-lab2-contract / #19', 'Contract'),
    ('#12', 'feature/12-requester-context / #20', 'Requester context'),
    ('#13', 'feature/13-ticket-creation-api / #21', 'Create API'),
    ('#14', 'feature/14-attachment-lifecycle-api / #22', 'Attachment API'),
    ('#15', 'feature/15-create-ticket-ui / #23', 'Create UI'),
    ('#16', 'feature/16-my-tickets / #24', 'My Tickets'),
    ('#17', 'feature/17-ticket-detail-ui / #25', 'Detail UI'),
    ('#18', 'feature/18-lab2-quality-evidence / #26', 'Quality'),
    ('Release', 'lab2-staging / #27', 'Merged main'),
], [20*mm, 91*mm, 63*mm])]
s += [table(['Required evidence', 'Working link'], [
    ('Review comments, replies, approvals', link('reviewer.md', REPO + '/blob/main/docs/lab-02/reviewer.md')),
    ('Setup, tests, directory structure', link('README.md', REPO + '/blob/main/README.md')),
    ('Ignored secrets/dependencies', link('.gitignore', REPO + '/blob/main/.gitignore')),
], [80*mm, 94*mm])]
s += [box('Commit graph proof', 'Feature merge commits 0a83616 through 3553a92 entered lab2-staging; release merge e962eb7 entered main.'), PageBreak()]

s += [p('Answer Part 2', 'Heading1'), p('Spec-Driven Development', 'Heading2')]
s += [p('Rendered source: ' + link('specification.md', REPO + '/blob/main/docs/lab-02/specification.md'))]
s += [table(['Section', 'Approved content'], [
    ('FR-01 to FR-17', 'Selection, create, ownership, list/query, detail, attachments, errors, accessibility and responsiveness.'),
    ('BR-01 to BR-30', 'Backend values, validation, idempotency, ownership, pagination, attachment policy and safe errors.'),
    ('AC-01 to AC-15', 'Testable Given/When/Then criteria.'),
    ('Definition of Done', 'Traceable tests, docs, visual inspection, peer review, staging and main release.'),
], [48*mm, 126*mm])]
s += [box('Specification-before-implementation proof', 'Contract commit ccfe731 and PR #19 merged as 0a83616 before implementation PRs #20-#26.'), PageBreak()]

s += [p('Answer Part 3', 'Heading1'), p('Test-Driven Development and Traceability', 'Heading2')]
s += [p('Rendered source: ' + link('tests.md', REPO + '/blob/main/docs/lab-02/tests.md'))]
s += [table(['Layer', 'Actual evidence', 'Result'], [
    ('Unit/API', 'server/tests/lab-02', '49/49 passed'),
    ('UI', 'client/tests/lab-02', '32/32 passed'),
    ('E2E/RWD', 'e2e/lab-02/responsive-visual.spec.ts', '6/6 passed'),
    ('Build/schema', 'client/server build and Prisma validate', 'Passed/valid'),
], [30*mm, 105*mm, 39*mm])]
s += [box('Final output', 'Client 32/32, server 49/49, Playwright 6/6 at three viewports, both production builds passed, Prisma schema valid, and 39 screenshots refreshed. No required test is skipped or disabled.')]
s += [table(['AC range', 'Traceable tests'], [
    ('AC-01 - AC-03', 'Requester API, UI and E2E'),
    ('AC-04 - AC-06', 'Ticket unit/API/UI/E2E'),
    ('AC-07 - AC-09', 'Owned list/detail API/UI/E2E'),
    ('AC-10 - AC-13', 'Attachment unit/API/UI/E2E'),
    ('AC-14 - AC-15', 'Accessibility, responsive and screenshots'),
], [48*mm, 126*mm]), PageBreak()]

s += [p('Answer Part 4', 'Heading1'), p('AI Use with Reflection', 'Heading2')]
s += [p('Rendered source: ' + link('ai-use.md', REPO + '/blob/main/docs/lab-02/ai-use.md'))]
s += [p('<b>LLM/agent:</b> OpenAI Codex (GPT-5). AI assisted; human decisions and verification remained required.')]
s += [table(['#', 'Selected prompt', 'Verification'], [
    ('1', 'Summarize Lab 2 and steps.', 'Compared with labsheet.'),
    ('2', 'Explain Issue acceptance criteria.', 'Inspected files and Issue.'),
    ('3', 'Diagnose Docker/PostgreSQL.', 'Validated Prisma/migration/seed.'),
    ('4', 'Explain GitHub workflow.', 'Checked branches/PRs/reviews.'),
    ('5', 'Explain failed test and fix.', 'Reran focused/full tests.'),
    ('6', 'Give unit/API/UI/E2E commands.', 'Ran final validation.'),
    ('7', 'Help review partner PR.', 'Checked real diff/tests.'),
    ('8', 'Audit Lab 2 documents.', 'Checked links and evidence.'),
], [9*mm, 91*mm, 74*mm])]
s += [p('My Reflection', 'Heading2')]
s += [box('Reflection', 'AI reduced guessing on requirements and technical problems. I decided whether suggestions fit the contract and verified results with the labsheet, source, tests, screenshots and GitHub.'), PageBreak()]

s += [p('Answer Part 5', 'Heading1'), p('Development Requester Select Screen', 'Heading2')]
s += [grid([
    ('create-ticket/desktop/requester-loading.png', 'Loading'),
    ('create-ticket/desktop/requester-selection.png', 'Active-user dropdown'),
], 93*mm)]
s += [grid([
    ('create-ticket/desktop/requester-failure.png', 'Safe failure and Retry'),
    ('create-ticket/desktop/requester-switch.png', 'Change Requester'),
], 93*mm)]
s += [box('Verified', 'The selector is a testing mechanism, not authentication. Only active users appear. Selection is shown in the shell and switching reloads requester-scoped data.'), PageBreak()]

s += [p('Answer Part 6', 'Heading1'), p('Working Ticket Screen: Create Mode', 'Heading2')]
s += [shot('create-ticket/desktop/initial.png', 'Initial: database references and read-only system fields.', 151*mm), PageBreak()]
s += [p('Validation and attachments', 'Heading2')]
s += [grid([
    ('create-ticket/desktop/validation.png', 'Field validation'),
    ('create-ticket/desktop/invalid-attachment.png', 'Invalid type rejected'),
], 121*mm)]
s += [box('Attachment policy', 'JPG/JPEG, PNG, WEBP and PDF up to 5 MB; at most five active files. Valid files remain selected when an invalid file is rejected.'), PageBreak()]
s += [p('Failure and submitting', 'Heading2')]
s += [grid([
    ('create-ticket/desktop/api-failure.png', 'Safe API failure; values preserved'),
    ('create-ticket/desktop/submitting.png', 'Busy; duplicate submit disabled'),
], 121*mm)]
s += [box('Failure proof', 'Simulated HTTP 500 exposes no internals, preserves values/files and permits retry.'), PageBreak()]
s += [p('Successful backend/database result', 'Heading2')]
s += [shot('create-ticket/desktop/success.png', 'Official backend-generated Ticket Number and next actions.', 147*mm)]
s += [box('Persistence proof', 'POST /api/tickets validates requesterId/reference IDs, persists through Prisma/PostgreSQL, applies NEW/Unassigned defaults, returns a unique number and uploads create-time attachments.'), PageBreak()]

s += [p('Answer Part 7', 'Heading1'), p('Working My Tickets Screen', 'Heading2')]
s += [shot('my-tickets/desktop/list.png', 'Requester A owned list with filters, sorting and pagination.', 148*mm), PageBreak()]
s += [p('No-results, mobile and isolation', 'Heading2')]
s += [grid([
    ('my-tickets/desktop/no-results.png', 'No-results can be cleared'),
    ('my-tickets/mobile/list.png', 'Mobile responsive table'),
], 118*mm)]
s += [shot('create-ticket/desktop/requester-switch.png', 'Switching clears old requester-scoped state.', 70*mm)]
s += [box('Cross-requester proof', 'API tests return safe 404 without leaked data. Playwright switches user and asserts the previous Ticket Number disappears.'), PageBreak()]

s += [p('Answer Part 8', 'Heading1'), p('Working Ticket Screen: View Mode and Attachments', 'Heading2')]
s += [shot('ticket-detail/desktop/detail.png', 'Owned read-only Detail with active and removed Attachment states.', 143*mm)]
s += [table(['Required behavior', 'Evidence'], [
    ('Owned detail', 'Requester-scoped GET renders read-only values.'),
    ('Add attachment', 'Permitted upload refreshes active count.'),
    ('Download active', 'Safe filename, MIME and body returned.'),
    ('Soft removal', 'Reason required; metadata retained.'),
    ('Removed download', 'Safe 404; storage not read.'),
    ('Unauthorized access', 'Cross-requester operations return 404.'),
    ('Storage failure', 'Safe 500 without internals.'),
], [54*mm, 120*mm])]
s += [box('Automated proof', 'attachments.api.test.ts covers active/removed/cross-user download, cross-user list/remove, storage failure, upload policy, limit and compensation. TicketDetail.test.tsx covers invalid, failure, retry and unavailable states.'), PageBreak()]

s += [p('Answer Part 9', 'Heading1'), p('Zen Green UI and Responsive Evidence', 'Heading2')]
s += [p('Rendered source: ' + link('ui-spec.md', REPO + '/blob/main/docs/lab-02/ui-spec.md'))]
s += [table(['Token', 'Value', 'Purpose'], [
    ('--zen-green-900', '#006B3C', 'Header/primary'),
    ('--zen-green-700', '#0B7A46', 'Links/focus'),
    ('--zen-green-100', '#EAF6EF', 'Success/subtle'),
    ('--zen-page', '#F5F7F6', 'Page'),
    ('--zen-surface', '#FFFFFF', 'Cards/forms'),
    ('--zen-text', '#20342B', 'Text'),
    ('--zen-readonly', '#F1F4EF', 'Read-only'),
    ('--zen-error', '#8B1E2D', 'Invalid'),
], [47*mm, 29*mm, 98*mm])]
s += [p('Completed visual checklist', 'Heading2')]
s += [table(['Inspection', 'Result'], [
    ('Colours, typography, hierarchy, contrast', 'Pass'),
    ('Editable/read-only and required markers', 'Pass'),
    ('Validation and safe feedback', 'Pass'),
    ('Button states and hierarchy', 'Pass'),
    ('Skip link, focus and landmarks', 'Pass'),
    ('Filters, pagination, badges, attachments', 'Pass'),
    ('No page clipping, overlap or overflow', 'Pass'),
    ('Desktop, tablet and mobile', 'Pass'),
], [142*mm, 32*mm]), PageBreak()]
s += [p('Desktop, tablet and mobile', 'Heading2')]
s += [grid([
    ('create-ticket/desktop/initial.png', 'Desktop 1440 x 900'),
    ('create-ticket/tablet/initial.png', 'Tablet 834 x 1112'),
    ('create-ticket/mobile/initial.png', 'Mobile 390 x 844'),
], 177*mm)]
s += [box('Responsive result', 'All 6 Playwright checks passed; forms stack, touch targets remain usable, the table has a labelled scroll region and document width stays within the viewport.'), PageBreak()]
s += [p('Responsive Ticket screens', 'Heading2')]
s += [grid([
    ('my-tickets/tablet/list.png', 'Tablet My Tickets'),
    ('ticket-detail/mobile/detail.png', 'Mobile Ticket Detail'),
], 179*mm)]
s += [box('Inventory', '39 screenshots cover selection/loading/failure/switching; Create states; My Tickets list/no-results; and Detail active/removed states at all viewports.')]

def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=18*mm, bottomMargin=18*mm, title='Lab 2 Evidence Report', author='Supapanya Yathip')
    doc.build(s, onFirstPage=decor, onLaterPages=decor)
    print(OUT)

if __name__ == '__main__':
    build()
