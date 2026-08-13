# TokTickIT

TokTickIT is an IT service desk application built for CPE334. Lab 1 delivers a
small full-stack vertical slice that connects a React user interface to an
Express REST API and a PostgreSQL database through Prisma.

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

The Lab 1 tests are located in:

- `server/tests/lab-01/` for Supertest API tests
- `client/tests/lab-01/` for Vitest UI tests

Feature tests remain red or marked TODO until their corresponding Issues are
implemented. Issue 1 validates the project setup, build commands, test runners,
database connectivity, and Prisma configuration.

## Repository structure

```text
toktickit/
|-- client/
|   |-- src/
|   `-- tests/lab-01/
|-- server/
|   |-- prisma/
|   |-- src/
|   `-- tests/lab-01/
|-- docs/lab-01/
|   |-- ai_use.md
|   |-- reviewer.md
|   `-- tests.md
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
4. open a pull request into `lab1-staging`, then move the Issue to `PR Review`;
5. move it to `Fixing` when review changes are required, then return it to
   `PR Review`; and
6. move it to `Done` only after approval, successful tests, and merge.

Do not commit directly to `main` or `lab1-staging`.
