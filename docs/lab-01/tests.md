# Lab 1 - Test Plan and Evidence

All test files live under `server/tests/lab-01/` and `client/tests/lab-01/`.

| # | Tool | Test | Test file | Result |
|---|---|---|---|---|
| 1 | Supertest | `GET /api/health` returns HTTP 200 with `status = ok` and the service name | `server/tests/lab-01/health.test.ts` | Passed |
| 2 | Supertest | `GET /api/categories` returns the four seeded categories in ID order | `server/tests/lab-01/categories.test.ts` | Passed |
| 3 | Vitest | TokTickIT heading renders | `client/tests/lab-01/App.test.tsx` | Passed |
| 4 | Vitest | Success state shows Online and the four API-provided categories | `client/tests/lab-01/App.test.tsx` | Passed |
| 5 | Vitest | Loading state disables the button and displays Loading | `client/tests/lab-01/App.test.tsx` | Passed |
| 6 | Vitest | API failure shows Offline and a useful error message | `client/tests/lab-01/App.test.tsx` | Passed |
| 7 | Vitest | Client calls health first and categories second | `client/tests/lab-01/api.test.tsx` | Passed |

## Final verification on `lab1-staging`

Commands:

```text
npm run prisma:migrate --workspace server
npm run prisma:seed --workspace server
npm test
npm run build
```

Passing test output:

```text
Client
Test Files  2 passed (2)
Tests       6 passed (6)

Server
Test Files  2 passed (2)
Tests       2 passed (2)
```

Build output:

```text
toktickit-client build: passed (TypeScript and Vite)
toktickit-server build: passed (TypeScript)
```

Live integration checks also confirmed:

- `GET /api/health` returned HTTP 200 with the required JSON.
- `GET /api/categories` returned the four database categories in ID order.
- With PostgreSQL stopped, `GET /api/categories` returned HTTP 500 with the safe message `Unable to load request categories`.
