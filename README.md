# TokTickIT

TokTickIT is an IT service desk application built for CPE334. Lab 1 established
the React, Express, Prisma, and PostgreSQL foundation. Lab 2 delivers the
responsive requester-owned Ticketing MVP.

## Lab 2 requester MVP

Lab 2 adds Development Requester context, Ticket creation, requester-owned My Tickets search/filter/sort/pagination, read-only Ticket Detail, and Attachment upload/download/soft removal. The selector is a testing mechanism and is not authentication.

Apply and seed the Lab 2 database after initial setup:

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

Playwright uses the installed Chrome channel and stores desktop, tablet, and mobile evidence under `artifacts/lab-02/screenshots/`. Final traceability is in `docs/lab-02/tests.md`.

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

## Build and test

```bash
npm run build
npm test
```

Automated tests are located in:

- `server/tests/lab-01/` for Supertest API tests
- `client/tests/lab-01/` for Vitest UI tests
- `server/tests/lab-02/` for Ticket, ownership, and Attachment API/unit tests
- `client/tests/lab-02/` for requester workflow and UI state tests
- `e2e/lab-02/` for the desktop, tablet, and mobile Playwright workflow

The complete Lab 2 suite is implemented. Final counts and Acceptance-Criterion
traceability are recorded in `docs/lab-02/tests.md`.

## Repository structure

```text
toktickit/
|-- client/
|   |-- src/
|   `-- tests/
|       |-- lab-01/
|       `-- lab-02/
|-- server/
|   |-- prisma/
|   |-- src/
|   `-- tests/
|       |-- lab-01/
|       `-- lab-02/
|-- docs/
|   |-- lab-01/
|   `-- lab-02/
|       |-- specification.md
|       |-- tests.md
|       |-- ui-spec.md
|       |-- api-spec.md
|       |-- data-model.md
|       |-- reviewer.md
|       `-- ai-use.md
|-- e2e/lab-02/
|-- artifacts/lab-02/screenshots/
|-- output/pdf/
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
3. create the required feature branch from an up-to-date `main`, then move the
   Issue to `Started`;
4. open a pull request into the active lab staging branch, then move the Issue
   to `PR Review`;
5. move it to `Fixing` when review changes are required, then return it to
   `PR Review`; and
6. move it to `Done` only after approval, successful tests, and merge.

Lab 1 used `lab1-staging`; Lab 2 used `lab2-staging` and one reviewed release
PR into `main`. Post-release evidence corrections also use an Issue, branch,
reviewed PR, and passing verification. Do not commit directly to `main` or a
staging branch.
