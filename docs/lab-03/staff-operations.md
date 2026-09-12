# Staff Ticket operations — Issue #38

IT Staff can claim an unassigned Ticket, confirm assignment/reassignment,
change IT Priority, and confirm a permitted status transition. Admin retains
read-only Ticket access. Requester-submitted fields and Attachment permissions
are preserved. The UI no longer displays the internal version as a user field.

Every write revalidates the persisted session and IT_STAFF role under the shared
security lock, locks the Ticket row, and checks the supplied version before
evaluating no-ops. A real change increments version; current self-claim and
unchanged assignment/priority do not. Closed/Cancelled reject owner/priority
changes; Closed can still be reopened through the approved transition matrix.

Status transitions enforce all eight-state rules, eligible-owner prerequisites,
explicit confirmation and trimmed public reasons. Status, timestamps, resolution
fields and public history commit together. Reopening clears the current
resolution/closure data and requester indication while retaining prior history.
History is visible to Staff/Admin and the owning Requester through its API.
The operational Staff/Admin Detail displays that public history.

The UI offers only permitted next states, explains missing eligible owners,
uses a native modal confirmation dialog, and retains draft text after conflicts
or uncertain writes. Users must explicitly reload and review before resubmitting;
the fresh version is used without automatically sending the retained draft.
Admin receives no operational controls. Comments/notes are Issue #39.

## Validation scope

- Unit tests exercise all 64 status pairs and exact body/reason validation.
- Real PostgreSQL API tests cover concurrent claims, stale/no-op behavior,
  invalid/inactive owners, terminal restrictions, all 64 pairs, timestamps,
  public-history ownership and transaction rollback on forced history failure.
- Component tests cover Admin read-only rendering, claim/priority transport,
  assignment confirmation/cancel/focus, public reasons, conflict draft/reload,
  terminal controls, owner prerequisites and safe history retry.
- Chrome tests at 1440x900, 834x1112 and 390x844 verify Escape/focus, confirmed
  status changes, conflict/reload/draft retention, history and Admin controls.
  APIs are mocked; these are browser UI integration tests, not authenticated DB E2E.

Run the database tests with the isolated TEST_DATABASE_URL described in tests.md:

```powershell
npm test --workspace server -- --maxWorkers=1
npm test --workspace client -- --maxWorkers=1
npm run build
npm run prisma:validate
npx playwright test --config playwright.operations.config.ts
```

Screenshots are generated locally under
`artifacts/lab-03/screenshots/staff-ticket-detail/{desktop,tablet,mobile}/`
as `conflict.png` and `resolved.png`. Capture and page-overflow assertions are
automated evidence; manual visual inspection remains pending in the final audit.
No working database migration, reset, seed or provisioning was performed.
Independent peer review and the completed-document confirmation before main
remain required. See tests.md for actual command results.
