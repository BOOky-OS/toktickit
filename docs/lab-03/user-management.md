# Administrator User Management — Issue #40

Admin now has a minimal User Management page: name/email search, one role filter,
user list, create/edit form and a confirmed initial-password reset. The list
shows name, email, role, activation and password-change state. Desktop separates
list/editor; tablet/mobile stack them. There are no delete, bulk, import/export
or email-delivery operations.

API validation trims display names, trims/lowercases email, requires one role
and a boolean activation state, and rejects unsupported query/body controls.
Email uniqueness includes inactive users and concurrent creates. Passwords use
the established scrypt policy and are never returned; new/reset users must change
their initial password at next login. Reset passwords must differ from the
current password. Hashing happens before the security lock, followed by current
session, target version and password-hash checks inside the transaction.

All account mutations share advisory lock 334003 with Ticket operations. Edits
reject stale versions, own deactivation, removal of the last active Admin and
deactivation/loss of eligible role for a nonterminal Ticket owner. Historical
terminal owners remain intact. Email/role/activation changes and password resets
revoke target sessions; name-only changes and no-ops do not. Reactivation retains
the password-change requirement. Self-security changes return success before the
client clears its identity and requires login.

The editor preserves non-password drafts for validation/conflict/failure and
clears submitted passwords on success or API failure. Conflicts and uncertain
writes require explicit reload/review before manual retry. Reset uses a native
confirmation dialog; cancellation and switching/closing the editor are available.
The UI disables own deactivation and a known last Admin's removal, while backend
checks remain authoritative even when a filtered list hides other users.

## Reproduce verification

Use the isolated TEST_DATABASE_URL described in tests.md, not the working DB.

```powershell
npm test --workspace server -- --maxWorkers=1
npm test --workspace client -- --maxWorkers=1
npm run build
npm run prisma:validate
npx playwright test --config playwright.users.config.ts
```

Unit/API coverage includes normalization and boundaries, role/query denial,
safe serializers, real hashes, duplicate races, stale/no-op edits, session
revocation, self/last-Admin guards, concurrent demotions, active/historical
ownership, password reset and claim/deactivation races. Component coverage
includes search/filter, creation, reset confirmation, duplicate/stale drafts,
password clearing, self-session expiration and safe retry states.

Chrome tests use mocked APIs at 1440x900, 834x1112 and 390x844 for edit conflict,
reload, reset Escape/focus, password clearing, creation and page overflow.
Screenshots: `artifacts/lab-03/screenshots/user-management/{desktop,tablet,mobile}/edit.png`.
These are local captures and DOM assertions, not completed manual visual review
or real authenticated database E2E. Final audit/release is #41.

No working database migration, reset, seed or provisioning occurred. Peer review
and the student's completed-document confirmation before main remain pending.
