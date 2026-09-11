# Issue #34: authentication and backend authorization

This increment implements `/api/auth/csrf`, `/login`, `/me`, `/password` and
`/logout` under the auth prefix, and protects existing reference, Ticket and
Attachment endpoints. Follow [api-spec.md](api-spec.md) for exact bodies.
The development-requesters endpoint now returns JSON 404. The browser login
and role shell belong to #35; the existing selector-based client cannot use
these protected APIs until that increment. Requester response/query completion
is #36; Staff, communication and Admin routes remain unimplemented, with their
role boundaries already guarded. A permitted role sees 404 on those future
routes, not an invented successful response.

## Local setup and request flow

Apply migrations and provision local credentials deliberately using
[migration.md](migration.md). No working database is automatically upgraded or
seeded by the API. Existing `server/.env` files need the new settings from
`.env.example`; do not overwrite private local settings.

Set runtime variables explicitly before launching from PowerShell:

```powershell
$env:CLIENT_ORIGIN = 'http://localhost:5173'
$env:ALLOW_LOCAL_HTTP = 'true'
npm run dev:server
```

The HTTP opt-in applies only to a loopback HTTP CLIENT_ORIGIN and non-production
mode. Otherwise cookies are Secure. Use HTTPS outside local development.
Cookies are host-only, HttpOnly, SameSite=Lax, Path=/ and named `toktickit.sid`.
Use the same hostname for browser and API; do not mix localhost and 127.0.0.1.

1. GET `/api/auth/csrf` with credentials included, retaining the cookie and
   keeping the returned csrfToken in memory.
2. POST `/api/auth/login` with JSON `{email,password}`, that cookie, exact
   Origin and X-CSRF-Token. Successful login rotates the cookie and CSRF token.
3. If user.mustChangePassword is true, normal APIs return 403
   PASSWORD_CHANGE_REQUIRED. POST `/api/auth/password` with currentPassword,
   newPassword and confirmPassword; retain the rotated cookie/token.
4. GET `/api/auth/me` restores the current safe identity. GET csrf recovers
   the session-bound CSRF token without rotating an unexpired session.
5. POST logout with `{}` and valid Origin/CSRF; only 204 confirms revocation.
   A 500 keeps the cookie so the user can retry; an expired session returns 401.

Requester IDs are taken from the authenticated session. Never send requesterId
in JSON, query or multipart. This also applies to downloads. Staff/Admin can
read shared detail/files, but only Requesters can create Tickets or mutate files.
Admin is denied all Staff Ticket writes and comment/note creation.

## Security and integration decisions

- Node crypto generates 32-byte session/CSRF values. Only SHA-256 session
  digests are persisted; raw authentication tokens appear only in cookies.
  Pre-login sessions last 10 minutes and authenticated sessions 8 hours absolute.
- Existing async scrypt helpers retain the approved cost and Unicode rules.
  Unknown/unprovisioned login performs a full dummy scrypt verification.
  Login failures have the same status/message for absent/inactive/wrong credentials.
- `security.ts` centralizes safe identity, CSRF, role boundaries, transaction
  locks and revocation. `routes.ts` owns auth handlers; `rate-limit.ts` owns
  bounded throttles. No runtime dependency was added.
- Login attempts count by socket IP (30/15 min) and normalized email digest
  (10/15 min). Anonymous CSRF creation allows 60/IP/15 min. Each limiter has
  at most 10,000 live buckets, deletes expired buckets and refuses overflow
  rather than evicting a live throttle. Restart clears these process-local
  buckets; this single-process lab is not a distributed rate-limit design.
  Express trust proxy stays disabled; forwarded IP headers cannot bypass limits.
- Credential verification/hashing occurs before the shared PostgreSQL advisory
  lock 334003. Login/password recheck the session and credential version/hash
  under the lock. Password replacement revokes every old session atomically.
- Existing domain mutation services receive `mutationGuard` from every HTTP
  write route; it locks and rereads the acting session and current User before
  domain changes. If revocation wins after a file is staged, storage is compensated.
  Concurrent Ticket creation with the same idempotency key is serialized.
- Future Admin account mutations (#40) must take securityLock, reread actor,
  validate target/version, apply the change and call revokeUserSessions for
  reset/email/role/deactivation in the same transaction. The helper and persisted
  revocation are tested now; Admin endpoint behavior is not yet claimed complete.
- Safe JSON error envelopes, no-store, 32 KiB JSON limits, bounded multipart
  parsing, exact credentialed CORS and download nosniff are enforced.

## Verification scope

`auth.api.test.ts` uses real PostgreSQL for sessions, login, forced/voluntary
change, simultaneous replacement, expiry, revocation, CSRF and throttles.
`authorization.api.test.ts` uses real PostgreSQL ownership/transactions and
mocked file storage to observe denied reads and compensation; it does not
claim an end-to-end browser/filesystem test. The older domain API mock tests
now supply session persistence fixtures and real auth middleware still runs.
See [tests.md](tests.md) for observed command results and remaining test scope.
