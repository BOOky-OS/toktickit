# Lab 2 UI Specification - Zen Green

## 1. Design Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--zen-green-900` | `#006B3C` | application header, primary action, strong emphasis |
| `--zen-green-700` | `#0B7A46` | active navigation, links, focus accent, hover |
| `--zen-green-100` | `#EAF6EF` | selected/success/subtle section background |
| `--zen-page` | `#F5F7F6` | page background |
| `--zen-surface` | `#FFFFFF` | cards and form surfaces |
| `--zen-text` | `#20342B` | primary text, never pure black |
| `--zen-readonly` | `#F1F4EF` | read-only field fill |
| `--zen-border` | `#C9D4CD` | neutral borders |
| `--zen-error` | `#8B1E2D` | invalid border/text/message |
| `--zen-warning` | `#9A5B00` | amber warning/badge only |

Use the system font stack, 16 px body text, 1.5 line height, 4 px/8 px spacing
increments, white cards with a subtle border and restrained shadow.  The shared
CSS classes are `zen-field`, `zen-field--readonly`, `zen-field--invalid`,
`zen-button`, `zen-button--primary`, `zen-button--secondary`,
`zen-button--danger`, `zen-button--busy`, `zen-badge`, and `zen-empty-state`.
Tests assert these state classes and semantic controls rather than pixel-only
snapshots.

## 2. Shared Components and Accessibility

- The application shell has TokTickIT identity, My Tickets, Create Ticket,
  visible active-page indication, selected Requester name, and Change Requester.
- Labels sit above controls.  Required labels show a red asterisk and all
  validation text appears immediately below its related field.
- Inputs have one consistent height; Description is a sufficiently tall textarea
  and is resizable only if it does not break the layout.
- Read-only fields use `zen-field--readonly`, retain readable contrast, and are
  not mistaken for disabled editable fields.
- Buttons always have visible text.  Icon-only controls have an accessible name
  and tooltip.  Disabled/busy controls cannot be activated and remain visibly
  distinct.
- Keyboard focus uses a 3 px `--zen-green-700` outline with offset.  Status,
  priority, error, warning, and removal states use text/icon in addition to
  colour.  Alerts use appropriate `role="status"` or `role="alert"`.
- Use a skip link to main content and semantic landmarks (`header`, `nav`,
  `main`, `form`, `table`).

## 3. Development Requester Selection

The first protected route opens a centered responsive card:

1. TokTickIT title and a short statement: "Select a Development Requester to
   test requester-specific ticket behavior. This is not a login screen."
2. Development Requester select labelled as required; only active users from
   PostgreSQL appear.
3. A supporting information callout that real authentication arrives in Lab 3.
4. Continue primary button; it is disabled until a valid selection exists.
5. Loading uses a skeleton or labelled spinner.  Empty state explains that no
   active test Requesters are available.  API failure has Retry and no technical
   internals.

After Continue, the shell displays the Requester name.  Change Requester clears
requester-scoped cache, returns to this screen, and reloads data after the new
selection.  It does not imitate logout or secure login.

## 4. Create Ticket

Desktop (`>=992px`) uses a centered maximum-width card and a two/three-column
grid where appropriate:

- Top system row: Ticket Number "Generated after submission", Ticket Date "Set
  when saved", and read-only Requester.
- Classification row: Category, Related System, Requested Priority.  Read-only
  IT Priority (`Unassigned`) and Current Status (`New`) may appear as badges but
  have no staff control.
- Summary spans sufficient width; Description spans the full main form width.
- Attachment section sits after the text fields and before actions.  It includes
  type/size/count help, selected-file list, invalid-file feedback, and remove
  selection controls before upload.
- Bottom actions contain a secondary Clear/Cancel action and a primary Submit
  Ticket action.  Submit becomes `zen-button--busy`, says "Submitting ticket…",
  and is disabled while the request is pending.

Initial state has empty editable fields and distinct system values.  Invalid
state keeps entered values, marks each invalid field, and gives field-level
messages.  Success shows the official Ticket Number returned by the backend
and actions for My Tickets or Ticket Detail.  API-failure state preserves all
form values and selected valid files and exposes Retry.  It never claims that a
Ticket was saved without the successful backend response.

## 5. My Tickets

The page contains title/description, Create Ticket action, then a filter card:

- search by Ticket Number or Summary;
- Category, Related System, Requested Priority, and Current Status selects;
- sort control and Clear filters control;
- server-backed pagination with current-range text and Previous/Next buttons.

Desktop table columns are Ticket Number, Created Date, Summary, Category,
Related System, Requested Priority, IT Priority, Current Status, and Last
Updated.  Ticket Number/Summary opens Detail.  Priority badges state Low,
Medium, High; IT Priority states Unassigned/Low/Medium/High; status badge states
New.  Badges always include text.

An empty list says the selected Requester has no Tickets and provides Create
Ticket.  No-results says active filters/search found no matching Tickets and
provides Clear filters.  Loading uses table/card skeletons; failure provides a
safe message and Retry without losing filter selections.

## 6. Ticket Detail and Attachments

Ticket Detail starts with breadcrumb/back link to My Tickets, official Ticket
Number, status badge, and a grouped read-only information card.  It presents
Ticket Date, Requester, Category, Related System, Summary, Description,
Requested Priority, read-only IT Priority, and Current Status.  It contains no
editable Ticket fields, comments, internal notes, actions taken, staff controls,
or lifecycle buttons.

The separate Attachment section shows a labelled count of active files and:

- active item: safe filename, type, size, uploaded time, Download, Remove;
- uploading item: progress/busy text and non-duplicable controls;
- invalid item: nearby error and a way to remove the selection;
- removed item: filename/metadata, removal timestamp/reason, `Removed` label,
  and no preview/download control;
- unavailable/failure item: safe error and retry guidance.

Removal opens an accessible confirmation dialog requiring a reason before the
destructive action is enabled.  The button has explicit destructive text.  The
client updates from the API response and never treats a failed removal as done.

## 7. Responsive Rules

| Viewport | Required behavior |
| --- | --- |
| Desktop `>=992px` | centered max width; multi-column forms; full My Tickets table |
| Tablet `768-991px` | two-column fields where useful; controls wrap without overlap |
| Mobile `<768px` | all form fields stack; shell navigation remains usable; filters stack; My Tickets becomes labelled Ticket cards or an accessible responsive table; touch targets are at least 44 px |

At every size there is no horizontal page scrolling, clipped labels, overlapped
messages, hidden actions, or unreadable Attachment names.  Tables must not hide
the Ticket Number or action to open Detail.

## 8. Visual Inspection and Screenshot Evidence

Playwright screenshots are captured at desktop 1440 x 900, tablet 834 x 1112,
and mobile 390 x 844.  Inspect and record:

- colours, typography, whitespace, read-only/editable distinction, and button
  hierarchy;
- validation placement, focus, disabled/busy controls, and non-colour states;
- header/navigation, filters, pagination, badges, lists/cards, and all
  Attachment states;
- clipping, overlap, unintended overflow, or inconsistency with this spec.

Store evidence under:

```text
artifacts/lab-02/screenshots/
  create-ticket/{desktop,tablet,mobile}/
  my-tickets/{desktop,tablet,mobile}/
  ticket-detail/{desktop,tablet,mobile}/
```
