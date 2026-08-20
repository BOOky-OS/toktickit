# Lab 2 Test Plan and Final Results

## Test strategy

Lab 2 uses Vitest unit/UI tests, Supertest API tests, and a Playwright browser flow. Ownership checks are data-isolation tests for the temporary Development Requester context, not authentication claims.

## Final automated evidence

| ID | Coverage | Actual file | Result |
| --- | --- | --- | --- |
| UNIT-01 | Official Ticket Number formatting and sequence boundaries | `server/tests/lab-02/ticket-number.unit.test.ts` | Pass |
| UNIT-02 | Create validation, trimming, and length boundaries | `server/tests/lab-02/ticket-validation.unit.test.ts` | Pass |
| UNIT-03 | Idempotent replay and changed-content conflict | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| UNIT-04 | Attachment type/signature/size and removal-reason policy | `server/tests/lab-02/attachment-policy.unit.test.ts` | Pass |
| API-01 | Active Requester and reference-data APIs | `server/tests/lab-02/requester-context.api.test.ts` | Pass |
| API-02 | Ticket create, defaults, validation, ownership, and safe errors | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-03 | Owned list search/filter/sort/page and cross-Requester detail denial | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-04 | Attachment upload/list/download/remove, limits, ownership, compensation | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| UI-01 | Requester selection states, retention, and switching | `client/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Pass |
| UI-02 | Create form references, validation, success, safe failure, and file feedback | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| UI-03 | My Tickets list, filters, empty state, and Requester reload | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| UI-04 | Read-only Detail, upload, removal confirmation/reason, removed restriction | `client/tests/lab-02/TicketDetail.test.tsx` | Pass |
| E2E-01 | Select Requester, invalid create, create, list, owned Detail, upload/remove, switch Requester | `e2e/lab-02/responsive-visual.spec.ts` | Pass: desktop/tablet/mobile |
| RWD-01 | Visibility and no page-level horizontal overflow at required viewports | `e2e/lab-02/responsive-visual.spec.ts` | Pass |

Final run on `feature/18-lab2-quality-evidence`:

- `npm run prisma:validate`: valid schema.
- `npm test`: client 21/21 and server 45/45 passed; no skipped/disabled tests found.
- `npm run build`: client and server passed.
- `npm run test:e2e`: 3/3 Playwright projects passed using Chrome.
- `npm run test:visual`: 3/3 projects passed and refreshed nine screenshots.

## Acceptance-criterion traceability

| AC | Evidence |
| --- | --- |
| AC-01–AC-03 | API-01, UI-01, E2E-01 |
| AC-04–AC-06 | UNIT-01–UNIT-03, API-02, UI-02, E2E-01 |
| AC-07–AC-09 | API-03, UI-03–UI-04, E2E-01 |
| AC-10–AC-13 | UNIT-04, API-04, UI-04, E2E-01 |
| AC-14–AC-15 | UI-01–UI-04, RWD-01, screenshot evidence |

## Responsive and visual evidence

Screenshots are committed under `artifacts/lab-02/screenshots/` for Create Ticket validation, My Tickets list, and Ticket Detail with removed Attachment metadata:

- desktop: 1440 x 900;
- tablet: 834 x 1112;
- mobile: 390 x 844.

The automated visual flow asserts headings/actions are visible, removed files have no Download link, Requester switching removes the previous Requester's Ticket from view, and document width does not exceed the viewport. The screenshots provide review evidence for Zen Green tokens, cards, labels, read-only fields, validation, badges, controls, and responsive stacking.

## Commands

```text
npm run db:up
npm exec --workspace server prisma migrate deploy
npm run prisma:seed --workspace server
npm run prisma:validate
npm test
npm run build
npm run test:e2e
npm run test:visual
```

## Deliberate scope

Real authentication, IT Staff workflow, comments, internal notes, Actions Taken, and post-New status transitions remain outside Lab 2.
