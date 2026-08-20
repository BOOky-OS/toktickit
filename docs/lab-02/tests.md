# Lab 2 Test Plan and Results

## 1. Test Strategy

Tests are designed before implementation from `specification.md` and executed
through the final `main` branch before submission.  They cover happy paths,
validation/boundaries, ownership, server and client failures, loading/empty
states, Attachment lifecycle, keyboard/accessibility behavior, visual style,
responsive layouts, and an end-to-end multi-Requester flow.  A planned test is
not counted as complete until it has an actual path and final passing result.

## 2. Planned Tests

| ID | Type | AC | What it tests / expected result | Automated test file | Final |
| --- | --- | --- | --- | --- | --- |
| UNIT-01 | Unit | AC-04 | Database sequence formatter returns unique `TKT-YYYY-NNNNNN` values. | `server/tests/lab-02/ticket-number.unit.test.ts` | Planned |
| UNIT-02 | Unit | AC-05 | Summary/Description trimming and inclusive length boundaries. | `server/tests/lab-02/ticket-validation.unit.test.ts` | Planned |
| UNIT-03 | Unit | AC-06 | Same idempotency key/body maps to one result; changed body conflicts. | `server/tests/lab-02/ticket-idempotency.unit.test.ts` | Planned |
| UNIT-04 | Unit | AC-10, AC-11 | Attachment type, 5 MiB boundary, five-active limit, and removal-reason policy. | `server/tests/lab-02/attachment-policy.unit.test.ts` | Planned |
| API-01 | API | AC-01 | Active requester API returns active records only; inactive seed is absent. | `server/tests/lab-02/requester-context.api.test.ts` | Planned |
| API-02 | API | AC-03 | Reference-data APIs return active Category/System records with stable order. | `server/tests/lab-02/requester-context.api.test.ts` | Planned |
| API-03 | API | AC-04 | Valid create returns 201, one saved Ticket, matching requester ID, New, and official number. | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-04 | API | AC-05 | Missing, whitespace-only, boundary-invalid, inactive, and unknown create input returns 400 with safe field errors. | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-05 | API | AC-06 | Retried creation does not persist a second Ticket; mismatched replay returns 409. | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-06 | API | AC-07 | List search/filter/sort/page returns only matching owned Tickets and correct metadata. | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-07 | API | AC-08 | Requester B cannot list A's Tickets or retrieve A's Ticket Detail. | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-08 | API | AC-09 | Owned Ticket Detail returns read-only data and Attachment metadata; missing/non-owned returns 404. | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-09 | API | AC-10 | Each permitted type uploads under 5 MiB and produces active safe metadata. | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-10 | API | AC-11 | Invalid MIME, 5 MiB + 1 byte, sixth active file, and unowned Ticket upload are rejected. | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-11 | API | AC-12 | Active owned file downloads; removed and non-owned downloads return 404. | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-12 | API | AC-13 | Valid soft removal retains metadata/reason and blocks repeat removal/download. | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| UI-01 | UI | AC-01, AC-02 | Selector shows explanation, loading/empty/error states, active options, and disabled Continue. | `client/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Planned |
| UI-02 | UI | AC-03 | Changing Requester updates shell and clears/refetches requester-scoped state. | `client/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Planned |
| UI-03 | UI | AC-04, AC-05 | Create form loads references, renders field labels/asterisks, and blocks invalid submit locally. | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-04 | UI | AC-05, AC-14 | Submit busy/success/API-failure states are accessible; API failure preserves values. | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-05 | UI | AC-07, AC-14 | My Tickets search/filter/sort/page controls, loading, empty, no-results, and failure states. | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-06 | UI | AC-09 | Detail renders Ticket information as read-only and omits prohibited workflow controls. | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| UI-07 | UI | AC-10-AC-13 | Attachment selected/uploading/invalid/active/removed states, confirmation, and disabled removed download. | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| STYLE-01 | UI style | AC-14, AC-15 | Required Zen classes, field states, labels, asterisks, busy buttons, badges, and visible focus hooks. | `client/tests/lab-02/ZenGreenStyle.test.tsx` | Planned |
| RWD-01 | Responsive | AC-15 | Create form stacks and keeps fields/actions visible at desktop/tablet/mobile. | `e2e/lab-02/responsive-visual.spec.ts` | Planned |
| RWD-02 | Responsive | AC-15 | My Tickets table/card and filters/pagination remain usable without horizontal overflow. | `e2e/lab-02/responsive-visual.spec.ts` | Planned |
| E2E-01 | E2E | AC-01, AC-04, AC-07, AC-09 | Requester A selects context, creates Ticket, finds it, and opens owned Detail. | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-03, AC-08 | Switching from A to B removes A's list data; direct A Ticket access is rejected. | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-03 | E2E | AC-10-AC-13 | Create/upload/download/soft-remove/blocked-download Attachment lifecycle. | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

## 3. Acceptance-Criterion Traceability

| Acceptance criterion | Planned evidence |
| --- | --- |
| AC-01 | API-01, UI-01, E2E-01 |
| AC-02 | UI-01 |
| AC-03 | UI-02, E2E-02 |
| AC-04 | UNIT-01, API-03, UI-03, E2E-01 |
| AC-05 | UNIT-02, API-04, UI-03, UI-04 |
| AC-06 | UNIT-03, API-05 |
| AC-07 | API-06, UI-05, E2E-01 |
| AC-08 | API-07, API-08, E2E-02 |
| AC-09 | API-08, UI-06, E2E-01 |
| AC-10 | UNIT-04, API-09, UI-07, E2E-03 |
| AC-11 | UNIT-04, API-10, UI-07 |
| AC-12 | API-11, UI-07, E2E-03 |
| AC-13 | API-12, UI-07, E2E-03 |
| AC-14 | UI-01, UI-04, UI-05, UI-07, STYLE-01 |
| AC-15 | STYLE-01, RWD-01, RWD-02 |

## 4. Responsive and Visual Checklist

- [ ] Screenshots exist at 1440 x 900, 834 x 1112, and 390 x 844 for Create
  Ticket, My Tickets, and Ticket Detail.
- [ ] Zen Green tokens, surface/card treatment, readable text, button hierarchy,
  badges, editable/read-only distinction, validation placement, and disabled/
  busy states match `ui-spec.md`.
- [ ] No clipping, overlap, hidden button, unreadable Attachment filename, or
  horizontal page overflow occurs at any required viewport.
- [ ] Desktop table and mobile card/responsive-table behavior keep Ticket Number
  and Detail access visible.
- [ ] Keyboard focus, labels, required markers, icon labels/tooltips, alerts,
  and non-colour status indicators are verified.

## 5. Test Commands

The existing commands remain the baseline:

```text
npm run prisma:validate
npm test
npm run build
```

Before Lab 2 is complete, the repository must add documented scripts for its
Playwright E2E/visual checks (planned names: `npm run test:e2e` and
`npm run test:visual`).  The final version of this file records the exact output
and command results from `main`; no result is claimed here before execution.

## 6. Final Results

Pending implementation.  Update each Planned row with `Pass`, the actual test
path, and concise evidence only after the relevant Issue is merged and the test
runs successfully.

## 7. Known Limitations or Deferred Tests

Lab 2 deliberately has no real authentication/authorization test because the
Development Requester selector is not security.  Ownership checks are still
tested as Lab 2 data-isolation behavior.  IT Staff workflow, comments, notes,
Actions Taken, and post-New status transitions are deferred to later labs.
