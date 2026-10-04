# Lab 4 database setup and recovery

Issue #58 adds `ActionTaken`, `ActionRevision`, `ActionReceipt`, their enums/indexes/FKs and `Ticket.workCycle` in migration `20260924060000_lab4_actions`. Existing rows are retained; legacy Tickets get workCycle=1 and zero actions. No password/session/file rewrite or reset is performed. The migration is one PostgreSQL transaction and checks positive cycles/versions and terminal action fields.

## Apply to a local development copy

1. Stop writes and back up the existing PostgreSQL database and the configured attachment storage directory together. Record the current commit and migration status. Keep backups outside Git.
2. Install dependencies with `npm ci` if needed, then run `npx prisma generate --schema server/prisma/schema.prisma`.
3. With `server/.env` pointing at the intended local development database, run `npm exec --workspace server -- prisma migrate status`, then `npm exec --workspace server -- prisma migrate deploy`.
4. Verify the old users/Tickets/communications/attachments and login. Existing records must remain unchanged, apart from the additive workCycle field. Run the isolated suite below before reviewing the change.

The assistant applied migrations only to disposable test schemas. The student's working database has not been upgraded by this task. UI work is Issue #59; final resolution/cancellation gates are Issue #60. Reopen already increments workCycle here so newly recorded actions cannot inherit an old cycle.

## Optional local demonstration data

From the server workspace, set `LAB4_ALLOW_DEMO_SEED=true` and run `npm run lab4:seed --workspace server`. The configured `DATABASE_URL` must name a localhost PostgreSQL database `toktickit`, `toktickit_lab4_demo` or `toktickit_lab3_test`; production mode and remote URLs are rejected.

This creates six dedicated `@lab4.example.test` accounts and 16 Tickets with all eight Ticket statuses, three priorities, assigned/unassigned ownership, zero/one/many actions, every action status, two performers and follow-up work. The empty-requester and empty-staff accounts have no Tickets/assignments. The deliberately public local initial password is `TokTickIT-Lab4-Initial!`; login requires changing it. Never use these credentials for deployed accounts.

Stable seed keys identify fixtures. A repeat run skips each existing Ticket and its entire action/revision collection, and retains user profile/password changes. An email conflict or ineligible fixture identity fails safely instead of taking over a real account. This is demo fixture creation, not a replacement for audited API mutations.

## Isolated automated tests

Prerequisites: Docker Desktop running, installed dependencies and generated Prisma client. Create the dedicated disposable service once (do not recreate an existing container with the same name):

```powershell
docker run --name toktickit-lab4-test -e POSTGRES_USER=labtest -e POSTGRES_PASSWORD=labtest -e POSTGRES_DB=toktickit_lab3_test -p 127.0.0.1:5544:5432 -d postgres:16-alpine
$env:TEST_DATABASE_URL = 'postgresql://labtest:labtest@127.0.0.1:5544/toktickit_lab3_test'
$env:LAB4_TEST_POSTGRES_CONTAINER = 'toktickit-lab4-test'
npm test
npm run build
npm run prisma:validate
```

The password above belongs only to this disposable local service. TEST_DATABASE_URL must differ from the working DATABASE_URL. Lab 4 fixtures use random `lab4_test_<32 hex characters>` schemas; older regression fixtures retain `lab3_test_...`. Fixtures remove only their owned schemas. The existing Lab 3 legacy migration test now applies every later migration too, so its schema-drift check compares against the current schema.

Recovery tests require this named service because they use its PostgreSQL 16 `pg_dump` and `psql` binaries. They export a pre-Lab-4 schema, copy attachment bytes, migrate the source, restore into a different owned empty schema and compare all legacy rows plus file hashes. An injected failed DDL transaction must leave the old schema/data intact. Neither test restores over the working database. Server test files run serially because the inherited security advisory lock is database-wide even across isolated schemas. Concurrency scenarios still issue simultaneous requests within a test. Logs and generated artifacts stay in ignored `output/`.

## If an upgrade must be recovered

Stop application writes. Restore the verified pre-upgrade database backup into a separate recovery database and restore the matching attachment backup into separate storage. Check counts, IDs, references, file hashes and authentication before switching the old application commit to that recovered copy. Keep the failed copy for diagnosis. Do not drop the new tables in place or use `prisma migrate reset` as a recovery shortcut; that could discard work created after the backup. Reconcile any post-backup work before resuming service.
