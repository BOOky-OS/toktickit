# TokTickIT

TokTickIT is an IT service desk application built for CPE334. Lab 1 established
the React, Express, Prisma, and PostgreSQL foundation. Lab 2 delivers the
responsive requester-owned Ticketing MVP.

## Lab 3 implementation in progress

Lab 3 begins with the [engineering contract](docs/lab-03/specification.md),
[API contract](docs/lab-03/api-spec.md), [UI specification](docs/lab-03/ui-spec.md)
and [planned tests](docs/lab-03/tests.md). These documents describe target
behavior. Issues #33-#36 implement migration/seed, authentication, the browser
role shell and authenticated Requester regression. Issue #37 adds the responsive
[Staff/Admin Ticket Queue](docs/lab-03/staff-queue.md) and read-only Detail navigation.
Issue #38 adds [Staff Ticket operations](docs/lab-03/staff-operations.md).
Issue #39 adds [Ticket communication and resolution indication](docs/lab-03/communication.md).
See [authentication setup](docs/lab-03/authentication.md). User administration remains #40.

Follow [the Lab 3 workflow and release gate](docs/lab-03/workflow.md): Issues
#32-#41 use individual feature branches into `lab3-staging`, with reviewer merges.
The student must review completed documents and explicitly confirm readiness
before a release PR to `main` is prepared. Do not treat permission to start the
lab as release approval.

## Lab 2 requester MVP (historical baseline)

Lab 2 adds Development Requester context, Ticket creation, requester-owned My Tickets search/filter/sort/pagination, read-only Ticket Detail, and Attachment upload/download/soft removal. The selector is a testing mechanism and is not authentication.

The commands below describe the historical Lab 2 baseline. On lab3-staging,
follow [the guarded Lab 3 migration/seed setup](docs/lab-03/migration.md) instead:

```bash
npm exec --workspace server prisma migrate deploy
npm run prisma:seed --workspace server
```

Run the complete verification suite:

```bash
npm run prisma:validate
npm test
npm run build
npm run test:e2e
npm run test:visual
```

Playwright uses the installed Chrome channel and generates desktop, tablet, and mobile evidence locally under `artifacts/lab-02/screenshots/`. Generated artifacts are not committed; final traceability is in `docs/lab-02/tests.md`.

## Lab 1 scope

The completed Lab 1 application will provide a **Check System** action that:

1. checks the TokTickIT API health endpoint;
2. loads the supported request categories from PostgreSQL; and
3. displays loading, success, and useful error states.

Authentication, ticket creation, file uploads, and the final role-based
screens are outside the Lab 1 scope.

## Technology stack

- Client: React, TypeScript, Vite, and Bootstrap
- Server: Node.js, Express, and TypeScript
- Database: PostgreSQL with Prisma ORM
- Tests: Vitest, Testing Library, and Supertest

## Prerequisites

- Node.js 20 or newer
- npm
- Docker Desktop with Docker Compose, or a local PostgreSQL instance
- Git and GitHub CLI for the course workflow

## Initial setup

Install all client and server dependencies from the repository root:

```bash
npm install
```

Create local environment files from the committed templates.

PowerShell:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Bash:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

The example credentials are only for the local development database. Never
commit a real `.env` file.

## Start PostgreSQL

The included Compose configuration starts PostgreSQL on port `5432` with the
same local-development values as `server/.env.example`:

```bash
npm run db:up
npm run db:status
```

If port `5432` is already used, use that PostgreSQL instance or update both the
Compose port and `DATABASE_URL`.

Validate the initialized Prisma schema:

```bash
npm run prisma:validate
```

The Category model, Prisma Client generation, migration, and category seed are
implemented in Issue 3.

## Run the applications

Open two terminals from the repository root.

Terminal 1 - API at `http://localhost:3000`:

```bash
npm run dev:server
```

Terminal 2 - web app at `http://localhost:5173`:

```bash
npm run dev:client
```

## Lab 3 database increment

See [Lab 3 migration and local setup](docs/lab-03/migration.md) for the
transactional upgrade, guarded demonstration seed and one-time password
provisioning. Issue #35 adds Login, mandatory/voluntary password change and the
role-aware application shell. Issue #36 preserves authenticated Requester create/list/detail and Attachment workflows; operational Staff/Admin screens remain later increments.
The default seed requires explicit local opt-in and retains existing edits.

## Build and test

```bash
npm run build
npm test
```

Server integration tests require the dedicated local `toktickit_lab3_test`
database and `TEST_DATABASE_URL`; follow the [isolated test setup](docs/lab-03/migration.md).
The fixture guard refuses the working database.

Automated tests are located in:

- `server/tests/lab-01/` for Supertest API tests
- `client/tests/lab-01/` for Vitest UI tests
- `server/tests/lab-02/` for Ticket, ownership, and Attachment API/unit tests
- `server/tests/lab-03/` for migration, seed, provisioning, authentication and authorization checks
- `client/tests/lab-02/` for requester workflow regression tests
- `client/tests/lab-03/` for authentication transport, Login, password change, role-shell and authenticated Requester regression tests
- `e2e/lab-02/` for the desktop, tablet, and mobile Playwright workflow

The complete Lab 2 suite is implemented. Final counts and Acceptance-Criterion
traceability are recorded in `docs/lab-02/tests.md`.

## Repository structure

```text
toktickit/
|-- client/src/ and client/tests/lab-01/, lab-02/
|-- server/src/ and server/tests/lab-01/, lab-02/, lab-03/
|-- server/prisma/schema.prisma and migrations/
|-- server/prisma/seed.ts, lab3-seed.ts, lab3-provision.ts
|-- docs/lab-01/, lab-02/, lab-03/
|-- e2e/lab-02/, lab-03/
|-- output/pdf/
|-- skill.md
|-- compose.yaml
|-- package.json
|-- .gitignore
`-- README.md
```

## Git workflow

Every Issue is implemented on its required feature branch and enters the
Kanban workflow in this order:

1. add the Issue to `Backlog`;
2. move it to `Specified` only after its requirements are understood;
3. create the required feature branch from the current lab's documented base
   (`lab3-staging` for Lab 3, so completed prerequisites are included), then
   move the Issue to `Started`;
4. open a pull request into the active lab staging branch, then move the Issue
   to `PR Review`;
5. move it to `Fixing` when review changes are required, then return it to
   `PR Review`; and
6. move it to `Done` only after approval, successful tests, and merge.

Lab 1 used `lab1-staging`; Lab 2 used `lab2-staging` and one reviewed release
PR into `main`. Post-release evidence corrections also use an Issue, branch,
reviewed PR, and passing verification. Do not commit directly to `main` or a
staging branch.
