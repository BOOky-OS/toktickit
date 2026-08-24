# Lab 2 Data Model Design

This is the implemented Lab 2 design in `server/prisma/schema.prisma`. Every
non-`?` field is required.

```prisma
model DevelopmentRequester {
  id                 Int          @id @default(autoincrement())
  displayName        String       @db.VarChar(120)
  email              String       @unique @db.VarChar(254)
  isActive           Boolean      @default(true)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  tickets            Ticket[]
  removedAttachments Attachment[] @relation("AttachmentRemovedBy")
}

model Category {
  id        Int      @id @default(autoincrement())
  name      String   @unique @db.VarChar(80)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tickets   Ticket[]
}

model RelatedSystem {
  id        Int      @id @default(autoincrement())
  name      String   @unique @db.VarChar(120)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tickets   Ticket[]
}

model Ticket {
  id                  Int                  @id @default(autoincrement())
  ticketNumber        String               @unique @db.VarChar(20)
  ticketDate          DateTime             @default(now())
  requesterId         Int
  categoryId          Int
  relatedSystemId     Int
  summary             String               @db.VarChar(120)
  description         String               @db.VarChar(4000)
  requestedPriority   RequestedPriority
  itPriority          ItPriority           @default(UNASSIGNED)
  currentStatus       TicketStatus         @default(NEW)
  clientSubmissionKey String               @db.Uuid
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
  requester           DevelopmentRequester @relation(fields: [requesterId], references: [id])
  category            Category             @relation(fields: [categoryId], references: [id])
  relatedSystem       RelatedSystem        @relation(fields: [relatedSystemId], references: [id])
  attachments         Attachment[]

  @@unique([requesterId, clientSubmissionKey])
  @@index([requesterId, updatedAt])
  @@index([requesterId, currentStatus])
  @@index([requesterId, requestedPriority])
  @@index([requesterId, categoryId])
}

model Attachment {
  id                   Int                   @id @default(autoincrement())
  ticketId             Int
  originalFilename     String                @db.VarChar(255)
  storageKey           String                @unique @db.VarChar(255)
  mimeType             String                @db.VarChar(100)
  sizeBytes            Int
  uploadedAt           DateTime              @default(now())
  removedAt            DateTime?
  removalReason        String?               @db.VarChar(250)
  removedByRequesterId Int?
  ticket               Ticket                @relation(fields: [ticketId], references: [id])
  removedByRequester   DevelopmentRequester? @relation("AttachmentRemovedBy", fields: [removedByRequesterId], references: [id])

  @@index([ticketId, removedAt])
}
```

The migration adds a PostgreSQL sequence used by the backend to issue the
unique `TKT-YYYY-NNNNNN` Ticket Number. The design keeps requester foreign keys
and removal audit history stable so Lab 3 can replace temporary requester
selection with real authentication without changing Ticket ownership.
