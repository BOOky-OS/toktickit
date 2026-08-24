# Lab 2 Test Plan and Final Results

## Test strategy

Lab 2 uses Vitest unit/UI tests, Supertest API tests, and a Playwright browser flow. Ownership checks are data-isolation tests for the temporary Development Requester context, not authentication claims.

## Planned tests and final automated evidence

| ID      | Coverage                                                                                                                                        | Actual file                                                  | Result                      |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------- |
| UNIT-01 | Official Ticket Number formatting and sequence boundaries                                                                                       | `server/tests/lab-02/ticket-number.unit.test.ts`             | Pass                        |
| UNIT-02 | Create validation, trimming, and length boundaries                                                                                              | `server/tests/lab-02/ticket-validation.unit.test.ts`         | Pass                        |
| UNIT-03 | Idempotent replay and changed-content conflict                                                                                                  | `server/tests/lab-02/create-ticket.api.test.ts`              | Pass                        |
| UNIT-04 | Attachment type/signature/size and removal-reason policy                                                                                        | `server/tests/lab-02/attachment-policy.unit.test.ts`         | Pass                        |
| API-01  | Active Requester and reference-data APIs                                                                                                        | `server/tests/lab-02/requester-context.api.test.ts`          | Pass                        |
| API-02  | Ticket create, defaults, validation, ownership, and safe errors                                                                                 | `server/tests/lab-02/create-ticket.api.test.ts`              | Pass                        |
| API-03  | Owned list search/filter/sort/page and cross-Requester detail denial                                                                            | `server/tests/lab-02/my-tickets.api.test.ts`                 | Pass                        |
| API-04  | Attachment upload/list/active download/remove, limits, compensation, safe storage failure, removed denial, and cross-Requester ownership        | `server/tests/lab-02/attachments.api.test.ts`                | Pass                        |
| UI-01   | Requester selection states, retention, switching, and skip navigation                                                                           | `client/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Pass                        |
| UI-02   | Create system fields, validation, backend success/failure preservation, create-time uploads, partial upload failure, and Detail next action     | `client/tests/lab-02/CreateTicket.test.tsx`                  | Pass                        |
| UI-03   | My Tickets loading, list, complete filters/sort, empty/no-results, retry, pagination, Summary navigation, and Requester reload                  | `client/tests/lab-02/MyTickets.test.tsx`                     | Pass                        |
| UI-04   | Read-only Detail, upload/invalid/failure feedback, five-file limit, removal success/failure/reason, load retry, and unavailable ownership state | `client/tests/lab-02/TicketDetail.test.tsx`                  | Pass                        |
| E2E-01  | Select Requester, invalid create, create-time Attachment, success-to-Detail, list, owned Detail upload/remove, and switch Requester             | `e2e/lab-02/responsive-visual.spec.ts`                       | Pass: desktop/tablet/mobile |
| RWD-01  | Visibility and no page-level horizontal overflow at required viewports                                                                          | `e2e/lab-02/responsive-visual.spec.ts`                       | Pass                        |

Final verification on `fix/30-lab2-final-conformance-evidence`:

- `npm run prisma:validate`: valid schema.
- `npm test`: client 32/32 and server 49/49 passed; no skipped/disabled tests found.
- `npm run build`: client and server passed.
- `npm run test:e2e`: 6/6 Playwright tests passed across desktop, tablet, and mobile Chrome projects.
- `npm run test:visual`: 6/6 Playwright tests passed and refreshed 39 screenshots.

## Acceptance-criterion traceability

| AC          | Evidence                                 |
| ----------- | ---------------------------------------- |
| AC-01–AC-03 | API-01, UI-01, E2E-01                    |
| AC-04–AC-06 | UNIT-01–UNIT-03, API-02, UI-02, E2E-01   |
| AC-07–AC-09 | API-03, UI-03–UI-04, E2E-01              |
| AC-10–AC-13 | UNIT-04, API-04, UI-04, E2E-01           |
| AC-14–AC-15 | UI-01–UI-04, RWD-01, screenshot evidence |

## Responsive and visual evidence

Thirty-nine screenshots are committed under `artifacts/lab-02/screenshots/` and cover Requester selection/loading/failure/switching, Create Ticket initial/validation/invalid-attachment/API-failure/submitting/success states, My Tickets list/no-results states, and Ticket Detail with active and removed Attachment metadata:

- desktop: 1440 x 900;
- tablet: 834 x 1112;
- mobile: 390 x 844.

The automated visual flow asserts system fields, headings, and actions are
visible; create-time Attachments persist; removed files lose their Download
control; Requester switching removes the previous Requester's Ticket from view;
and document width does not exceed the viewport. The screenshots provide review
evidence for Zen Green tokens, cards, labels, read-only fields, validation,
badges, controls, and responsive stacking.

| Evidence group | States captured per required viewport |
| -------------- | ------------------------------------- |
| Development Requester | selection, loading, safe API failure, switch |
| Create Ticket | initial, validation, invalid attachment, safe API failure, submitting, success |
| My Tickets | populated list, no results |
| Ticket Detail | owned read-only detail, active attachment, removed attachment |

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

## Known limitations or deferred tests

No required automated test is skipped or deferred. Real authentication and
post-`NEW` Ticket lifecycle behavior remain intentionally deferred to later
labs rather than counted as Lab 2 test gaps.
