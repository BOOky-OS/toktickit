# Lab 2 - Peer Review Record

**Author:** Supapanya Yathip - 67070503443

- Repository and authored PR account: [@BOOky-OS](https://github.com/BOOky-OS)
- Account used to review the partner's PRs: [@zerotwobook](https://github.com/zerotwobook)

**Peer reviewer:** Atip Infa-Udom - 67070503446 - GitHub: [@Atip-Infa](https://github.com/Atip-Infa)

All review comments and responses below are copied from, or linked directly to, the GitHub review history.

## Pull Requests I authored and my partner reviewed

| Issue | Pull Request | Branch | Reviewer | Verdict |
| --- | --- | --- | --- | --- |
| #11 | [#19 - Lab 2 engineering contract](https://github.com/BOOky-OS/toktickit/pull/19) | `feature/11-lab2-contract` | `@Atip-Infa` | Approved and merged |
| #12 | [#20 - Development Requester context](https://github.com/BOOky-OS/toktickit/pull/20) | `feature/12-requester-context` | `@Atip-Infa` | Approved and merged |
| #13 | [#21 - Ticket creation API](https://github.com/BOOky-OS/toktickit/pull/21) | `feature/13-ticket-creation-api` | `@Atip-Infa` | Approved and merged |
| #14 | [#22 - Attachment lifecycle API](https://github.com/BOOky-OS/toktickit/pull/22) | `feature/14-attachment-lifecycle-api` | `@Atip-Infa` | Approved and merged |
| #15 | [#23 - Responsive Create Ticket UI](https://github.com/BOOky-OS/toktickit/pull/23) | `feature/15-create-ticket-ui` | `@Atip-Infa` | Approved and merged |
| #16 | [#24 - Requester My Tickets](https://github.com/BOOky-OS/toktickit/pull/24) | `feature/16-my-tickets` | `@Atip-Infa` | Approved and merged |
| #17 | [#25 - Ticket Detail and attachment controls](https://github.com/BOOky-OS/toktickit/pull/25) | `feature/17-ticket-detail-ui` | `@Atip-Infa` | Approved and merged |
| #18 | [#26 - Lab 2 quality evidence](https://github.com/BOOky-OS/toktickit/pull/26) | `feature/18-lab2-quality-evidence` | `@Atip-Infa` | Approved and merged |
| Release | [#27 - Lab 2 Requester Ticketing MVP](https://github.com/BOOky-OS/toktickit/pull/27) | `lab2-staging` -> `main` | `@Atip-Infa` | Approved and merged |

## Review comments I received and how I responded

### PR #19 - Issue #11

Reviewer comment:

> Reviewed Issue #11 and the Lab 2 engineering contract.
>
> The specification, business rules, acceptance criteria, data-model design, API/UI contracts, and test traceability are consistent with the Lab 2 requirements.
>
> Approved.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/19#pullrequestreview-4981684625)

My response:

> Thank you for reviewing and approving Issue #11. I confirm that the Lab 2 engineering contract covers the required specification, API/UI contracts, data model, acceptance criteria, and planned tests. Please merge this PR into lab2-staging when ready.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/19#issuecomment-5354785386) | [Post-merge record](https://github.com/BOOky-OS/toktickit/pull/19#issuecomment-5356829427)

### PR #20 - Issue #12

Reviewer comment:

> Reviewed the Lab 2 Development Requester implementation.
>
> I verified the active/inactive seed data, database-backed reference APIs, testing-only requester selection, retained requester context, Change Requester flow, accessible UI states, migration safety, and automated tests.
>
> The implementation matches the Issue #12 acceptance criteria. Approved.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/20#pullrequestreview-4983543994)

My response:

> Thank you for reviewing the implementation. I confirmed the requester filtering, retained context, error states, migration, and test coverage based on your review. The implementation is ready to merge into lab2-staging.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/20#issuecomment-5356946988) | [Post-merge record](https://github.com/BOOky-OS/toktickit/pull/20#issuecomment-5356972932)

### PR #21 - Issue #13

Reviewer comment:

> Reviewed the Issue #13 Ticket creation API implementation.
>
> I verified:
>
> - The Ticket model has the required Requester, Category, and Related System relationships, enums, constraints, and indexes.
> - Official Ticket Numbers use the backend database sequence and TKT-YYYY-NNNNNN format.
> - New Tickets belong to the selected Requester and default to Current Status NEW and IT Priority UNASSIGNED.
> - POST /api/tickets validates active reference data, required fields, trimming, and length boundaries.
> - Identical Idempotency-Key retries return the original Ticket, while changed-content reuse returns 409.
> - Validation, malformed input, inactive references, and unexpected database failures return safe responses.
> - The automated tests cover uniqueness, defaults, requester ownership, validation, and idempotency.
>
> The implementation matches the Issue #13 acceptance criteria. Approved.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/21#pullrequestreview-4983742761)

My response:

> Thank you for reviewing the Ticket creation API. I confirmed the Ticket model, database-backed numbering, requester ownership, active reference validation, defaults, idempotency behavior, and safe error responses based on your review. The implementation is ready to merge into lab2-staging.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/21#issuecomment-5357203500) | [Post-merge record](https://github.com/BOOky-OS/toktickit/pull/21#issuecomment-5357211607)

### PR #22 - Issue #14

Reviewer comment:

> Reviewed the Issue #14 Attachment lifecycle API implementation.
>
> I verified:
>
> - Attachment metadata, Ticket ownership, audit fields, soft-removal fields, and database indexes are implemented.
> - Upload accepts only JPG/JPEG, PNG, WEBP, and PDF files up to 5 MiB.
> - The backend validates MIME type, extension, and file signature.
> - Storage keys are generated by the server and are not exposed in API responses.
> - Upload, list, download, and soft removal enforce selected Requester ownership.
> - A Ticket cannot have more than five active attachments.
> - Removed attachments retain permitted metadata but cannot be downloaded.
> - Upload failures, unsupported files, ownership failures, file limits, and removal validation return safe responses.
> - Automated tests cover the attachment policy and lifecycle API paths.
>
> The implementation matches the Issue #14 acceptance criteria. Approved.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/22#pullrequestreview-4983911141)

My response:

> Thank you for reviewing the Attachment lifecycle API. I confirmed the ownership checks, storage-key protection, file validation, size and active-file limits, compensation behavior, soft removal, and safe error responses based on your review. The implementation is ready to merge into lab2-staging.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/22#issuecomment-5357396276) | [Post-merge record](https://github.com/BOOky-OS/toktickit/pull/22#issuecomment-5357413737)

### PR #23 - Issue #15

Reviewer comment:

> Reviewed Issue #15: Create Ticket UI.
>
> Verified selected requester is read-only and submitted as its matching ID. Checked Categories and Related Systems load from the APIs. Checked field validation, busy state, safe API failure preservation, success ticket number, attachment validation, Zen Green responsive layout, and test coverage.
>
> Approved.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/23#pullrequestreview-4984085422)

My response:

> Thank you for reviewing Issue #15. I confirmed the requested Create Ticket flow, validation states, attachment feedback, and responsive Zen Green UI are covered. Ready to merge.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/23#issuecomment-5357616512) | [Post-merge record](https://github.com/BOOky-OS/toktickit/pull/23#issuecomment-5357624456)

### PR #24 - Issue #16

Reviewer comment:

> Reviewed Issue #16: My Tickets.
>
> Verified the list API scopes every query to the selected requester. Checked search, filters, sort, pagination, validation, response metadata, safe cross-requester access, and the My Tickets loading, empty, filter, error, and requester-switch states.
>
> Approved.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/24#pullrequestreview-4984248122)

My response:

> Thank you for reviewing Issue #16. I confirmed the requester ownership rules, list query controls, pagination metadata, and My Tickets UI states are covered. Ready to merge.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/24#issuecomment-5357776711) | [Post-merge record](https://github.com/BOOky-OS/toktickit/pull/24#issuecomment-5357784456)

### PR #25 - Issue #17

Reviewer comment:

> Reviewed Issue #17: Ticket Detail and Attachment Controls.
>
> Verified Ticket Detail displays only requester-owned read-only information. Checked permitted attachment upload and active-file download, reason-required soft removal, retained removed metadata without download controls, safe unavailable/error states, and responsive attachment controls.
>
> Approved.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/25#pullrequestreview-4984407198)

My response:

> Thank you for reviewing Issue #17. I confirmed the requester-owned read-only detail, attachment lifecycle, removed-file restrictions, and responsive states are covered. Ready to merge.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/25#issuecomment-5357936144) | [Post-merge record](https://github.com/BOOky-OS/toktickit/pull/25#issuecomment-5357943300)

### PR #26 - Issue #18

Reviewer comment:

> Reviewed and verified PR #26.
>
> The Lab 2 test traceability and documentation are complete. Desktop, tablet, and mobile Playwright evidence is included. The attachment create-payload fix correctly separates authorization data from persisted data. Unit, API, UI, build, and E2E validation results are documented and passing.
>
> Approved. Ready to merge into lab2-staging.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/26#pullrequestreview-4984693367)

My response:

> Thank you for reviewing and approving PR #26. The quality evidence, responsive E2E coverage, and attachment payload fix have been verified. This is ready to merge into lab2-staging.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/26#issuecomment-5358276397) | [Post-merge record](https://github.com/BOOky-OS/toktickit/pull/26#issuecomment-5358282669)

### PR #27 - Lab 2 release

Reviewer comment:

> Reviewed the complete Lab 2 release integration.
>
> Issues #11-#18 are integrated into lab2-staging. The Requester Ticketing MVP scope and ownership rules are complete. Unit, API, UI, responsive, build, and E2E evidence has been verified. The release is ready to merge into main.
>
> Approved.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/27#pullrequestreview-4984886824)

My response:

> Thank you for reviewing and approving the Lab 2 release. All completed work and quality evidence are ready to merge into main.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/27#issuecomment-5358522253) | [Post-merge record](https://github.com/BOOky-OS/toktickit/pull/27#issuecomment-5358535573)

### PR #29 - Issue #28 documentation evidence correction

Reviewer comment:

> Reviewed Issue #28 documentation updates.
>
> - The Lab 2 peer-review record follows the Lab 1 evidence structure.
> - Authored PRs #19-#27 include the actual review focus and linked responses.
> - Reviews submitted through zerotwobook for Atip-Infa PRs #19-#26 are recorded with real GitHub evidence.
> - The AI-use record clearly distinguishes AI assistance from human implementation, decisions, and verification.
> - Corrupted characters and stale status text have been removed.
>
> Approved. Ready to merge into main.

[Review evidence](https://github.com/BOOky-OS/toktickit/pull/29#pullrequestreview-5002637013)

My response:

> Thank you for reviewing Issue #28. I confirmed the peer-review links, AI-use record, UTF-8 cleanup, and completed Lab 2 release status are factual. Ready to merge into main.

[Response evidence](https://github.com/BOOky-OS/toktickit/pull/29#issuecomment-5386583859) | [Post-merge record](https://github.com/BOOky-OS/toktickit/pull/29#issuecomment-5386585608)

## Pull Requests I reviewed for my partner

I reviewed the following Lab 2 PRs in [Atip-Infa/toktickit](https://github.com/Atip-Infa/toktickit/pulls) using the `zerotwobook` account.

| Issue | Partner Pull Request | Branch | My verdict |
| --- | --- | --- | --- |
| #11 | [#19 - Engineering contract and test plan](https://github.com/Atip-Infa/toktickit/pull/19) | `feature/11-sprint-specification-test-plan` | Approved |
| #12 | [#20 - Development Requester context](https://github.com/Atip-Infa/toktickit/pull/20) | `feature/12-development-requester` | Approved |
| #13 | [#21 - Ticket model and create-ticket API](https://github.com/Atip-Infa/toktickit/pull/21) | `feature/13-ticket-create` | Approved |
| #14 | [#22 - Attachment lifecycle API](https://github.com/Atip-Infa/toktickit/pull/22) | `feature/14-attachment-api` | Approved |
| #15 | [#23 - Responsive Create Ticket experience](https://github.com/Atip-Infa/toktickit/pull/23) | `feature/15-create-ticket-ui` | Approved |
| #16 | [#24 - My Tickets search, filters, sorting, and pagination](https://github.com/Atip-Infa/toktickit/pull/24) | `feature/16-my-tickets` | Approved |
| #17 | [#25 - Ticket Detail and attachment controls](https://github.com/Atip-Infa/toktickit/pull/25) | `feature/17-ticket-detail` | Approved |
| #18 | [#26 - Quality evidence and release integration](https://github.com/Atip-Infa/toktickit/pull/26) | `feature/18-quality-release` | Approved |

## Comments I submitted on my partner's Pull Requests

### Partner PR #19 - Issue #11

My review comment:

> Reviewed Lab 2 Issue #11. I verified the engineering contract, test plan, UI specification, and API specification against the Lab 2 requirements. The documents cover the required requester workflow, business rules, acceptance criteria, validation, ownership, attachments, UI states, responsive behavior, API contracts, and planned automated tests. I also verified that no application features or Issues #12-#18 were implemented.
>
> Approved.

[My review](https://github.com/Atip-Infa/toktickit/pull/19#pullrequestreview-5002024323) | [Partner response](https://github.com/Atip-Infa/toktickit/pull/19#issuecomment-5385155864) | [Partner post-merge response](https://github.com/Atip-Infa/toktickit/pull/19#issuecomment-5385169530)

### Partner PR #20 - Issue #12

My review comment:

> Reviewed Lab 2 Issue #12. I verified the Development Requester context, required reference data, seed data, validation behavior, and related tests against the Lab 2 requirements.
>
> The implementation is limited to Issue #12 and does not introduce the functionality from Issues #13-#18. The required Issue #12 acceptance criteria are satisfied.
>
> Approved.

[My review](https://github.com/Atip-Infa/toktickit/pull/20#pullrequestreview-5002074212) | [Partner response](https://github.com/Atip-Infa/toktickit/pull/20#issuecomment-5385273609) | [Partner post-merge response](https://github.com/Atip-Infa/toktickit/pull/20#issuecomment-5385275507)

### Partner PR #21 - Issue #13

My review comment:

> Reviewed Lab 2 Issue #13. I verified the Ticket model, required relationships, official Ticket Number generation, default status and IT priority, Create Ticket API, validation, requester ownership, duplicate/idempotency handling, and safe failure behavior against the Lab 2 requirements.
>
> The Issue #13 acceptance criteria are satisfied. I also verified that this PR is limited to Issue #13 and does not implement Issues #14-#18.
>
> Approved.

[My review](https://github.com/Atip-Infa/toktickit/pull/21#pullrequestreview-5002104131) | [Partner response](https://github.com/Atip-Infa/toktickit/pull/21#issuecomment-5385349097) | [Partner post-merge response](https://github.com/Atip-Infa/toktickit/pull/21#issuecomment-5385351166)

### Partner PR #22 - Issue #14

My review comment:

> Reviewed Lab 2 Issue #14. I verified the attachment upload, download, and soft-removal lifecycle against the Lab 2 requirements. I also verified the required file types, 5 MB file-size limit, maximum of 5 active attachments per Ticket, ownership protection, validation, and failure handling.
>
> The Issue #14 acceptance criteria are satisfied. I also verified that this PR is limited to Issue #14 and does not implement Issues #15-#18.
>
> Approved.

[My review](https://github.com/Atip-Infa/toktickit/pull/22#pullrequestreview-5002127992) | [Partner response](https://github.com/Atip-Infa/toktickit/pull/22#issuecomment-5385407009) | [Partner post-merge response](https://github.com/Atip-Infa/toktickit/pull/22#issuecomment-5385408306)

### Partner PR #23 - Issue #15

My review comment:

> Reviewed Lab 2 Issue #15. I verified the Create Ticket experience, Development Requester selection, form validation, attachment controls, loading and error states, Zen Green UI/theme, responsive behavior, accessibility, and related tests against the Lab 2 requirements.
>
> The Issue #15 acceptance criteria are satisfied. I also verified that this PR is limited to Issue #15 and does not implement Issues #16-#18.
>
> Approved.

[My review](https://github.com/Atip-Infa/toktickit/pull/23#pullrequestreview-5002148429) | [Partner response](https://github.com/Atip-Infa/toktickit/pull/23#issuecomment-5385457326) | [Partner post-merge response](https://github.com/Atip-Infa/toktickit/pull/23#issuecomment-5385458577)

### Partner PR #24 - Issue #16

My review comment:

> Reviewed Lab 2 Issue #16. I verified the My Tickets page, search, filtering, sorting, pagination, requester ownership, loading, empty, no-results, error states, responsive behavior, and automated tests against the Lab 2 requirements.
>
> The Issue #16 acceptance criteria are satisfied. I also verified that this PR is limited to Issue #16 and does not implement Issues #17-#18.
>
> Approved.

[My review](https://github.com/Atip-Infa/toktickit/pull/24#pullrequestreview-5002177489) | [Partner response](https://github.com/Atip-Infa/toktickit/pull/24#issuecomment-5385529275) | [Partner post-merge response](https://github.com/Atip-Infa/toktickit/pull/24#issuecomment-5385530973)

### Partner PR #25 - Issue #17

My review comment:

> Reviewed Lab 2 Issue #17. I verified the Requester Ticket Detail view, Ticket information, ownership protection, attachment listing, download, and soft-removal functionality against the Lab 2 requirements.
>
> I also verified the loading, empty, error, responsive, accessibility, and automated test coverage. The Issue #17 acceptance criteria are satisfied. This PR is limited to Issue #17 and does not implement Issue #18.
>
> Approved.

[My review](https://github.com/Atip-Infa/toktickit/pull/25#pullrequestreview-5002277696) | [Partner response](https://github.com/Atip-Infa/toktickit/pull/25#issuecomment-5385761817) | [Partner post-merge response](https://github.com/Atip-Infa/toktickit/pull/25#issuecomment-5385763151)

### Partner PR #26 - Issue #18

My review comment:

> Reviewed Lab 2 Issue #18. I verified the required quality evidence, repository documentation, automated test results, production builds, acceptance criteria, and release integration against the Lab 2 requirements.
>
> The required Lab 2 quality and submission checks are satisfied. I also verified that this PR is limited to Issue #18.
>
> Approved.

[My review](https://github.com/Atip-Infa/toktickit/pull/26#pullrequestreview-5002303631) | [Partner response](https://github.com/Atip-Infa/toktickit/pull/26#issuecomment-5385822745) | [Partner post-merge response](https://github.com/Atip-Infa/toktickit/pull/26#issuecomment-5385824494)
