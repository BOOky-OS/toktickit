# Lab 3 UI Specification - Zen Green

Status: proposed contract, Issue #32. Refer to [specification.md](specification.md)
for business permissions and [api-spec.md](api-spec.md) for transport.
Mockups in the handout guide appearance; excluded pictured controls are omitted.

## 1. Existing visual foundation

Reuse client/src/theme.css and the existing Bootstrap/system-font foundation.

| Token | Value / purpose |
| --- | --- |
| --zen-green-900 | #006B3C, primary buttons/strong emphasis |
| --zen-green-700 | #0B7A46, links/active navigation/focus |
| --zen-green-100 | #EAF6EF, selected/success surfaces |
| --zen-page | #F5F7F6, page background |
| --zen-surface | #FFFFFF, cards |
| --zen-text | #20342B, text |
| --zen-readonly | #F1F4EF, read-only fields |
| --zen-border | #C9D4CD, borders |
| --zen-error | #8B1E2D, invalid/danger |
| warning surface/text | #FFF5DB / #65420D, caution, already used in Lab 2 |

Body 16px/1.5, system font, 4/8px spacing increments, restrained shadows,
0.4rem field/button radii and existing card style. Avoid a second visual system.
Reuse zen-field, zen-field--readonly/--invalid, zen-button and primary/secondary/
danger/busy/disabled modifiers, zen-badge and zen-empty-state.

Extract shared labelled Field, Button, Badge, Notice, Pagination, ConfirmationDialog,
ApplicationShell and Ticket information/attachment components as needed by each
Issue. Screens use the same actual components where practical; no unrelated
refactor before a component is needed. Error styling includes aria-invalid and
aria-describedby, not just red borders.

## 2. Navigation, routes and access

| Destination | Roles / behavior |
| --- | --- |
| /login | Anonymous; authenticated users redirect to forced-change or role home |
| /change-password | Authenticated; mandatory when flagged, otherwise voluntary |
| /my-tickets | Requester home |
| /tickets/new | Requester |
| /tickets/:id | Own Requester Ticket; Staff operational Detail; Admin read-only Detail |
| /staff/tickets | Staff home; Admin read-only Queue |
| /admin/users | Admin home |

URLs support reload/back navigation without losing identity checks. Query state
may be in the URL but credentials and requester identity are never URL inputs.
On boot show a labelled session-loading screen, load current user/CSRF, then
choose the allowed screen. Do not briefly render cached previous-user data.

Shell: TokTickIT identity, current displayName, text role badge, active navigation,
Change Password and Logout. Requester sees My Tickets/Create Ticket; Staff sees
Ticket Queue; Admin sees Users and Ticket Queue labelled read-only on entry.
No development selector or Change Requester; remove its storage key at startup.
Forced-change shell has only identity, password form and Logout.

401 clears in-memory user, cached private data and password fields and routes
to login with a safe expired-session notice. A completed-role 403 presents
Access unavailable with a permitted-home link. Password-change-required 403
goes to the mandatory screen. Logout busy disables repeat action; failure says
logout could not be completed and provides Retry. No false logout success.
No protected content is restored through Back after logout.

## 3. Login and password change

Login: centered max-width 520px card; email/password, visible labels, optional
accessible show/hide password, Sign in. Explain that accounts/initial passwords
come from an administrator; no registration/reset-email links. Email autocomplete
username, password current-password; allow paste/password managers.

Modes: initial, submitting and authenticated redirect. Required field/type/maximum
validation appears beside fields. Uniform credential/inactive error:
"Unable to sign in. Check your credentials or contact your administrator."
429 shows retry time. Network/500 is safe with Retry. Keep email after failure;
clear password after a server authentication failure. Never show/log passwords.

Change Password: current password, new password, confirmation, concise 12-128
character/512-byte/non-whitespace/different-password guidance matching BR-03.
Use current-password/new-password autocomplete. Mandatory mode explains why
normal navigation is unavailable. New password and confirmation remain masked.
Do not trim passwords. Show mismatch/boundary/current-password messages near fields.
Disable duplicate save; successful rotation clears password inputs and goes to
role home. Voluntary mode permits Cancel back to role home; mandatory mode does
not offer a bypass. Password fields clear on exit/session expiry.

## 4. Requester workflow continuity

Create: existing Category/System references, Summary/Description limits, priority,
read-only requester/number/date/status. IT Priority preview follows selected
Requested Priority; saved values come from API. Retain one submission key for
the same request snapshot across uncertain failures. Disable pending duplicate
submit. Preserve normal form/file state on safe create failure. Successful
Ticket remains saved after partial upload failure, with per-file failure details
and a Detail retry action; never automatically create another Ticket to retry files.

My Tickets: preserve search, filters, stable sorting, range/Previous/Next and
detail links; add all eight statuses. Keep draft vs applied filters and reset
page to 1 on applying changes. Empty means no owned Tickets; no-results means
active query matched none. Failure preserves filters, Retry reloads. Label
ownership as the signed-in user's Tickets, removing development wording.

Detail: grouped read-only submission fields, both priority badges, status,
assigned owner/unassigned, public resolution summary/status history, Public
Comments, Attachments. No Internal Note tab, count, placeholder or metadata for
Requester. Eligible status shows Problem Appears Resolved, explicit confirmation,
and success timestamp/notice explaining IT Staff still decides formal resolution.
After indication disable repeat action; staff reopening clears the indicator.

Attachments reuse existing type/size/count/help, active Download/Remove, upload
busy and reason-required removal dialog. Removed metadata stays visible without
Download. Staff/Admin views display metadata and active Download only. No new
preview or upload privilege is implied by sharing the component.

## 5. Staff/Admin Ticket Queue

Heading Ticket Queue, brief context, search, filter panel and sort controls.
Search number/summary/requester; filters status, category/system, requested/IT
priority and owner (All, Unassigned, Me, eligible names). Apply/Clear, explicit
sort and direction, page-size 10/25/50, result range and Previous/Next.
Badge texts use readable names, e.g. Waiting for Requester, not enum underscores.

Desktop columns: Ticket Number, Created Date, Summary (with Requester/System
secondary text), Category, Requested Priority, IT Priority, Status, Owner,
Last Updated. Number and summary open Detail. Avoid duplicate long text in
adjacent columns; allow wrapping. Page size change resets page.

Tablet/mobile use labelled cards with number, summary, Requester, owner, status,
both priorities and an Open action; secondary dates/category/system remain
accessible in the card. No unreadable full-width grid or hidden primary action.

Loading announces work; empty and no-results have distinct copy/actions; safe
failure preserves query; forbidden offers permitted home. Admin sees read-only
context and no mutation shortcuts. Counts are list totals, not KPI analytics.

## 6. Operational Detail and communication

Use shared Ticket information. Only IT Staff sees Claim (unassigned), owner
select + confirmed Assign/Reassign/Unassign, IT Priority + Save, and permitted
next-status select + Change status. Requested Priority, requester identity,
category/system, summary and description remain read-only.

Show current version implicitly through freshness handling, not as an end-user
field. Confirm every status change; require a public reason for Resolve, Close,
Reopen and Cancel. Explain owner prerequisites near disabled state. When owner
is an Admin, responsibility is displayed but Admin has no editing controls.
Closed/Cancelled disable assignment and priority; Closed still permits Staff
Reopen, Cancelled has no transition.

Separate Public Comments and Internal Notes panels/tabs and composer labels:
"Visible to the requester" versus "Internal - visible to IT Staff and administrators".
Use distinct supporting treatment, not only colour. Never reuse composer text
when switching public/internal panels. Admin sees both streams with no composer.
Each entry shows author, current role and backend time; render plain text and
preserve line breaks, never HTML. No edit/delete menus. Disable posting in
Closed/Cancelled; preserve draft on safe posting failure, reload after uncertain
response before retrying. Empty streams have clear labels. Status reasons and
history are explicitly public.

Saving operations disable the relevant controls. On 409 retain draft text,
announce that Ticket changed, offer Reload, and require user review of fresh
values before resubmitting. No silent overwrite or automatic destructive retry.
404 shows Ticket unavailable with role-appropriate Back action; 500 provides Retry.
Announcement of requester resolution indication is visible to Staff/Admin and
never automatically selects Resolved.

## 7. Minimal Administrator Users screen

One responsive page, list on left and create/edit panel on desktop; stacked or
full-width panel on mobile. List fields: Name, Email, Role, Active/Inactive, Edit.
Search name/email; one optional role filter; default name ASC. No pagination,
bulk checkboxes, advanced sorting, delete/import/export/account-history UI.

Create: displayName, email, single role select, active boolean, initial password,
Save/Cancel. Edit: same basic fields except password; show Set new initial password
as a separate confirmed action with masked input and forced-change explanation.
No email-send checkbox. Explain manual local delivery; never echo the password
after save. Success resets password controls.

Prevent duplicate email/invalid role/required limits on API; client provides
early feedback. Disable self-deactivation and last-admin invalid actions when
known, with text reasons; backend remains authoritative. If account has active
assigned Tickets and cannot be deactivated/demoted, say Staff must reassign them.
A stale edit gets conflict/reload feedback. Self-email/role/reset may sign the
Admin out; explain this before confirming, then require login.

Modes: list/view, create, edit, reset confirmation; processing, validation,
success, empty/no-results, forbidden, not-found, conflict and safe failure.
Keep basic non-password drafts after safe errors. Never claim an unsuccessful
account edit was saved.

## 8. Responsive and accessibility requirements

Desktop >=992px, tablet 768-991px, mobile <768px. Forms: two/three columns on
desktop, two where useful on tablet, one on mobile. Long text spans full width.
Shell/filter/action controls wrap; primary touch controls >=44px.
No document horizontal overflow, clipped labels, overlap or inaccessible names.

Semantic header/nav/main/form/table, skip link, visible active-page state and
one main heading. Labels above controls, required asterisk plus programmatic
required state. Error-summary links and nearby field errors; aria-live status,
role=alert for failures, readable editable/read-only contrast. Consistent visible
focus ring; no colour-only priority/status/role indicators. Dialog traps focus,
focuses its first meaningful control, supports safe Escape/Cancel when not
saving and restores trigger focus. Destructive actions have explicit labels.
Busy fields/buttons expose disabled/aria-busy appropriately.

At 200% zoom content remains usable. Keyboard reaches all controls. Mobile
cards retain data labels. File names/long comments/emails wrap safely. Status
badge palette groups neutral (New/Open), work (In Progress/Reopened), warning
(Waiting), success (Resolved/Closed) and muted danger (Cancelled), always with
text. Verify contrast for every chosen foreground/background pair.

## 9. Visual and E2E evidence

Screenshots under artifacts/lab-03/screenshots/:
authentication, requester-regression, staff-queue, staff-ticket-detail,
user-management; each has desktop/tablet/mobile subdirectories.
Viewports: 1440x900, 834x1112 and 390x844. Include initial, meaningful validation,
busy, success, safe failure, forbidden/conflict and empty/no-results examples.
Screenshots must use local demo data; exclude visible secrets.

The checklist remains Planned until inspected:

| Inspection | Required evidence / current status |
| --- | --- |
| Tokens, typography, spacing, component consistency | Each screen group; Planned |
| Role navigation and no unauthorized controls | Three roles/direct denial; Planned |
| Editable/read-only, required labels and nearby errors | Create/change/Detail/Users; Planned |
| Focus, keyboard, dialog behavior, non-colour badges | Keyboard checks plus screenshots; Planned |
| Busy, failure, conflict and retained drafts | Relevant operations; Planned |
| Mobile cards, long filenames/emails/comments, 200% zoom | All three viewports; Planned |
| No clipping, overlap or page horizontal overflow | DOM assertions and human visual inspection; Planned |

Do not treat screenshot capture alone as visual review. Actual images and
test results are produced during their feature Issues and audited in #41.
