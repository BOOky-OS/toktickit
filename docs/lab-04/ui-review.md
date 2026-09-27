# Lab 4 - Student UI review before peer handoff

Issue #63 is **Started, awaiting student inspection/corrections**. This is the first mandatory student gate from `skill.md` and [workflow.md](workflow.md). No #63 peer review has been requested. The separate #64 document/review-record gate remains required later.

## Open the preview

URL: **http://localhost:5178**. The preview API uses localhost:3008. It runs this branch with a newly seeded, disposable schema in the existing isolated test database, not the working database.

| Role / scenario | Email |
| --- | --- |
| Requester | requester@lab4.example.test |
| Staff / Ticket ownership | staff@lab4.example.test |
| Staff with assigned pending actions | second-staff@lab4.example.test |
| Administrator | admin@lab4.example.test |
| Requester with no Tickets | empty-requester@lab4.example.test |
| Staff with no personal assignments | empty-staff@lab4.example.test |

All preview accounts use the public local-demo password **TokTickIT-Lab4-Initial!**. Only these freshly generated disposable accounts bypass initial password replacement so the student can inspect each role. Authentication and API authorization remain active. Do not use these accounts/passwords for a deployed system.

Changes made here are temporary and are discarded when the preview is stopped. To restart, start Docker Desktop and the existing test container, then run from the repository root:

```powershell
docker start toktickit-lab4-test
$env:TEST_DATABASE_URL = 'postgresql://labtest:labtest@127.0.0.1:5544/toktickit_lab3_test'
npm run preview:lab4
```

The command creates its own schema, runs the additive migrations there and starts the API/frontend on dedicated ports. Ctrl+C cleans up only that invocation's schema and temporary upload directory. It does not migrate/reset the working database. Stop an existing preview before restarting on the same ports.

## What to inspect and send back

1. **Requester:** Dashboard card labels/counts, My Tickets filtering, Create Ticket, Detail, read-only Actions Taken, comments and attachments. Check the empty-requester account too.
2. **Staff:** Dashboard and Queue, action assignment/create/edit/status, public versus internal content, Ticket resolution guidance and confirmation dialogs. `second-staff` has pending actions to inspect on its Dashboard.
3. **Admin:** shared Staff screens plus Users. Inspect account forms and role navigation.
4. **Layout:** desktop, tablet and mobile; spacing, font sizes, wording, card density, long Ticket Detail pages, buttons and keyboard focus.

Send a screenshot or page/role name plus the change wanted. Examples: "Staff Dashboard cards are too tall" or "Requester Detail: move Actions Taken above attachments." The assistant will apply the changes on the same #63 branch and rerun affected checks.

## Local visual evidence

- Full preview screenshots: `artifacts/lab-04/screenshots/hardening/` (role-screen-viewport filenames).
- Existing action forms/dialogs: `artifacts/lab-04/screenshots/actions-taken/`.
- Workflow confirmations: `artifacts/lab-04/screenshots/ticket-workflow/`.
- Local gallery: `output/lab4-ui-review.html`.
- All generated screenshots/logs/gallery files remain ignored by Git.

## Approval status

- [ ] Student inspected UI and supplied corrections or explicitly confirmed no corrections.
- [ ] Requested corrections applied and affected checks rerun.
- [ ] Student explicitly confirmed #63 may be handed to Atip-Infa.

General "continue" instructions do not satisfy this gate. #63 stays open/Started until this review is complete; peer handoff and #64 are not authorized by preparation alone.
