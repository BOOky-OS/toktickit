# Lab 2 REST API Contract

## 1. Conventions

- Base path: `/api`.
- JSON endpoints accept and return `application/json`; Attachment upload uses
  `multipart/form-data`.
- Times are ISO 8601 UTC strings.  Enum values are uppercase in API payloads.
- Lab 2 sends the temporary selected `requesterId` with every requester-scoped
  request.  It is testing context, not a credential.
- Validation failures use HTTP 400 and the shape below.  Existing Lab 1
  reference-data safe errors may keep their established `{ "error": "..." }`
  message while all new fields remain non-sensitive.

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "fieldErrors": {
    "summary": "Summary must contain 5 to 120 characters."
  }
}
```

- A resource that is missing, belongs to another requester, or has been soft
  removed where an active resource is required returns `404` with a safe
  message.  Server/database/storage failures return `500` without internals.

## 2. Reference Data

### `GET /api/development-requesters`

Returns active Development Requesters in display-name order.

**200 response**

```json
[
  { "id": 1, "displayName": "Jennifer Anderson", "email": "jennifer.anderson@example.test" }
]
```

Returns `200 []` when no active Requesters exist.  Returns `500` with a safe
message if reference data cannot load.

### `GET /api/categories`

Returns active Categories in ID order.  The response preserves the Lab 1 shape.

```json
[{ "id": 1, "name": "Account and Access" }]
```

### `GET /api/related-systems`

Returns active Related Systems in name order.

```json
[{ "id": 3, "name": "Campus Wi-Fi" }]
```

## 3. Create a Ticket

### `POST /api/tickets`

Header: `Idempotency-Key: <UUID>`.

**Request**

```json
{
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 7,
  "summary": "Laptop battery drains quickly",
  "requestedPriority": "MEDIUM",
  "description": "The battery drops from full charge to empty within one hour."
}
```

The backend trims Summary/Description, validates all IDs against active
reference records, validates the selected active Requester, gets the official
number from its database sequence, and persists the Ticket atomically.

**201 response**

```json
{
  "id": 42,
  "ticketNumber": "TKT-2026-000042",
  "ticketDate": "2026-08-20T08:15:00.000Z",
  "requester": { "id": 1, "displayName": "Jennifer Anderson" },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
  "summary": "Laptop battery drains quickly",
  "requestedPriority": "MEDIUM",
  "itPriority": "UNASSIGNED",
  "currentStatus": "NEW",
  "description": "The battery drops from full charge to empty within one hour.",
  "attachments": []
}
```

A successful identical retry with the same key returns the original saved
Ticket with `200`.  The same key with different content returns `409`.  Invalid
body/query values return `400`; a missing/inactive requester/reference record
returns `400`; an unexpected failure returns `500`.

## 4. List a Requester's Tickets

### `GET /api/tickets`

Required query: `requesterId` positive integer.

Optional query parameters:

| Parameter | Values | Default |
| --- | --- | --- |
| `search` | trimmed 1-120 character text; Ticket Number/Summary match | absent |
| `categoryId`, `relatedSystemId` | positive active reference ID | absent |
| `requestedPriority` | `LOW`, `MEDIUM`, `HIGH` | absent |
| `currentStatus` | `NEW` | absent |
| `sortBy` | `updatedAt`, `ticketDate`, `ticketNumber`, `summary` | `updatedAt` |
| `sortDir` | `asc`, `desc` | `desc` |
| `page` | positive integer | `1` |
| `pageSize` | `10`, `25`, `50` | `10` |

Invalid parameters return `400`.  A page beyond the last page returns `200`
with `items: []` and correct metadata rather than an error.

**200 response**

```json
{
  "items": [
    {
      "id": 42,
      "ticketNumber": "TKT-2026-000042",
      "ticketDate": "2026-08-20T08:15:00.000Z",
      "summary": "Laptop battery drains quickly",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
      "requestedPriority": "MEDIUM",
      "itPriority": "UNASSIGNED",
      "currentStatus": "NEW",
      "updatedAt": "2026-08-20T08:15:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 10,
  "totalItems": 1,
  "totalPages": 1,
  "hasPreviousPage": false,
  "hasNextPage": false
}
```

Only the supplied active Requester's Tickets are queried.  The endpoint never
uses client filters to broaden ownership.

## 5. Retrieve an Owned Ticket

### `GET /api/tickets/:ticketId?requesterId=<id>`

Returns the full read-only Ticket and safe Attachment metadata for an owned
Ticket.  `ticketId` and `requesterId` must be positive integers.

**200 response** is the Create Ticket response plus Attachment metadata:

```json
{
  "attachments": [
    {
      "id": 9,
      "originalFilename": "battery-photo.jpg",
      "mimeType": "image/jpeg",
      "sizeBytes": 234123,
      "uploadedAt": "2026-08-20T08:16:00.000Z",
      "state": "ACTIVE",
      "canDownload": true
    }
  ]
}
```

Returns `404` for missing/non-owned Ticket and `500` for a safe unexpected
failure.

## 6. Attachment Metadata

### `GET /api/tickets/:ticketId/attachments?requesterId=<id>`

Returns all permitted metadata for an owned Ticket, including soft-removed
records.  Active records have `state: "ACTIVE"` and `canDownload: true`.
Removed records have `state: "REMOVED"`, `canDownload: false`, `removedAt`, and
`removalReason`; no storage path or download URL is exposed.  Missing/non-owned
Ticket returns `404`.

## 7. Upload an Attachment

### `POST /api/tickets/:ticketId/attachments`

Content type: `multipart/form-data` with fields:

| Field | Required | Rule |
| --- | --- | --- |
| `requesterId` | yes | selected active requester, positive integer |
| `file` | yes | one JPG/JPEG, PNG, WEBP, or PDF no larger than 5 MiB |

The backend checks ticket ownership and counts active Attachments in the same
transactional decision that persists metadata.  The storage key is generated
server-side; no caller-supplied path is accepted.

**201 response**

```json
{
  "id": 9,
  "originalFilename": "battery-photo.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 234123,
  "uploadedAt": "2026-08-20T08:16:00.000Z",
  "state": "ACTIVE",
  "canDownload": true
}
```

Errors: `400` malformed/missing fields, `404` missing/non-owned Ticket, `409`
five active Attachments, `413` oversized file, `415` unsupported type, and
`500` safe storage/database failure.  On a storage failure no active Attachment
metadata remains; on a metadata failure the uploaded object is deleted or made
unreachable by compensation.

## 8. Download an Active Attachment

### `GET /api/attachments/:attachmentId/download?requesterId=<id>`

Returns the active file stream using its stored MIME type and a safe attachment
download filename.  It returns `404` for missing, removed, or non-owned files;
it does not leak which condition applies.  Storage failure returns `500` with a
safe message.

## 9. Soft-remove an Attachment

### `DELETE /api/attachments/:attachmentId`

**Request**

```json
{ "requesterId": 1, "reason": "The screenshot contains sensitive information." }
```

The reason is trimmed and must contain 5-250 characters.  The backend verifies
the active Attachment belongs to a Ticket owned by the supplied active
Requester, then sets removal audit fields without deleting metadata.

**200 response**

```json
{
  "id": 9,
  "originalFilename": "battery-photo.jpg",
  "state": "REMOVED",
  "removedAt": "2026-08-20T08:20:00.000Z",
  "removalReason": "The screenshot contains sensitive information.",
  "canDownload": false
}
```

Returns `400` for bad body/reason, `404` for missing, already removed, or
non-owned Attachment, and `500` for a safe unexpected failure.

## 10. Status Summary

| Status | Use |
| --- | --- |
| `200` | successful retrieval, idempotent create replay, or soft removal |
| `201` | Ticket or Attachment created |
| `400` | malformed input, invalid validation/query/reference values |
| `404` | missing, removed where active is required, or non-owned resource |
| `409` | duplicate idempotency-key conflict or active Attachment limit |
| `413` | Attachment exceeds 5 MiB |
| `415` | Attachment type is not allowed |
| `500` | safe unexpected database, storage, or server error |
