# Lab 3 identity migration and local sample data

Issue #33 implements the database increment on `feature/33-lab3-user-migration`.
It does not implement Login or the staff/Admin screens; those have their own
Issues. The legacy development selector remains temporarily, restricted to
active REQUESTER users, until the authenticated increment removes it.

## Upgrade behavior

`20260911040000_lab3_users_workflow/migration.sql` is a transaction. It rejects
invalid/colliding normalized legacy emails before DDL. Correct the reported
legacy data and retry through Prisma's failed-migration recovery procedure;
never reset the working database or merge identities to hide a collision.

The migration renames DevelopmentRequester to User and the attachment removal
author column to removedByUserId. IDs, active flags, historical dates/text,
Ticket ownership, reference rows, storage keys/bytes and sequence positions
are retained. A lagging renamed User sequence is moved above existing IDs.
Existing users become REQUESTER with a null password hash and forced-change
flag. Null hashes cannot authenticate once authentication is implemented.

Only UNASSIGNED IT Priority is backfilled from Requested Priority. Existing
LOW/MEDIUM/HIGH values remain unchanged; the UNASSIGNED enum value is removed.
Ticket creation now supplies Requested Priority as IT Priority explicitly.
The schema adds users/roles, sessions, assignment, eight statuses, resolution
fields, versions, separate public comments/private notes, and status history.
Historical user references use RESTRICT, including removed-file attribution.

An internal nullable unique User.seedKey complements the Ticket/comment/note
seed keys. It identifies demo users after an email edit so re-seeding does not
create a second account or revert that edit. It is not a public profile field.

## Local upgrade and provisioning

From the repository root, with dependencies installed and PostgreSQL running:

```powershell
npm run db:up
npx prisma migrate deploy --schema server/prisma/schema.prisma
npx prisma generate --schema server/prisma/schema.prisma
```

These commands target the configured working DATABASE_URL. During Issue #33,
the assistant applied migrations only to the isolated test database, not the
student's working database. Review the target and preserve its backup before
performing an actual local upgrade.

To initialize only users whose passwordHash is still null, supply a private
initial password in LAB3_MIGRATION_INITIAL_PASSWORD and run:

```powershell
npm run lab3:provision --workspace server
```

Passwords must contain 12-128 Unicode code points, at most 512 UTF-8 bytes and
non-whitespace text. Whitespace is not trimmed. Each user receives an independent
random salt and asynchronous scrypt hash (N=131072, r=8, p=1, key length 64).
Hashing is sequential to bound memory. The transaction rechecks null hashes
under the shared advisory lock so concurrent provisioning cannot overwrite a
completed password change/reset. Inactive accounts remain inactive. Repeating
the command does not reset already-provisioned users. Only counts are printed.
Remove the password environment variable after provisioning. Production mode
is refused; this is a local migration tool, not an admin reset endpoint.

## Opt-in demonstration seed

```powershell
$env:LAB3_ALLOW_DEMO_SEED = 'true'
npm run lab3:seed --workspace server
```

The existing `prisma:seed` command also runs this guarded seed. Both refuse
production mode or missing explicit opt-in. The fresh dataset contains four
active/one inactive Requesters, three active/one inactive IT Staff, one active
Admin, four Categories, seven Related Systems and 32 Tickets covering all eight
statuses and three priorities, assigned/unassigned cases, comments, notes and
status history. It includes requester resolution indications.

Fresh demo users use the deliberately public local-only initial password
`TokTickIT-Lab3-Initial!`, stored only as independently salted hashes. Every new
demo account must change it when Login is implemented.

| Role | Demo emails |
| --- | --- |
| Requester | jennifer.anderson@example.test, michael.brown@example.test, sarah.johnson@example.test, david.lee@example.test |
| Inactive Requester | olivia.martin@example.test |
| IT Staff | alex.chen@example.test, priya.patel@example.test, daniel.kim@example.test |
| Inactive IT Staff | sam.wilson@example.test |
| Admin | morgan.admin@example.test |

Re-seeding does not overwrite existing names, emails, roles, activation,
credentials, password-change flags, Ticket edits or communication/history.
Matching legacy users are linked to a seed identity but keep null hashes until
explicit provisioning. Reference-data activation edits are also preserved.
Counts above describe a fresh seed; deliberate user edits are not undone to
force those counts. Missing Ticket fixtures require eligible active demo users;
if none remain, the seed refuses instead of reactivating or changing roles.

## Isolated verification

Create a dedicated database once (if it does not already exist):

```powershell
docker compose exec -T postgres createdb -U toktickit toktickit_lab3_test
$env:TEST_DATABASE_URL = 'postgresql://toktickit:toktickit@localhost:5432/toktickit_lab3_test?schema=public'
npm test
npm run build
npm run prisma:validate
```

The fixture guard permits only the named local test database and refuses a
working DATABASE_URL with the same database name. Each fixture gets a random
owned schema, applies real checked-in migration SQL and removes only that
schema afterward. The old Lab 1 category API test also uses this isolated
database. Missing configuration/database causes a test failure, not a skip or
fallback to working data. Tests keep attachment bytes in an owned temporary
directory and compare digests before/after migration.

Current commands/results and the AC mapping are recorded in [tests.md](tests.md).
