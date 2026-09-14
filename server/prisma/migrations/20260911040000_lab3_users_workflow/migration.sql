BEGIN;

-- Validate before any schema change. Do not merge or discard conflicting identities.
DO $$
DECLARE invalid_count integer;
BEGIN
  SELECT count(*) INTO invalid_count FROM "DevelopmentRequester"
  WHERE length(lower(regexp_replace(email, '^[[:space:]]+|[[:space:]]+$', '', 'g'))) NOT BETWEEN 3 AND 254
     OR lower(regexp_replace(email, '^[[:space:]]+|[[:space:]]+$', '', 'g')) !~ '^[^[:space:]@]+@[^[:space:]@]+$'
     OR position('.' in split_part(lower(regexp_replace(email, '^[[:space:]]+|[[:space:]]+$', '', 'g')), '@', 2)) <= 1
     OR right(regexp_replace(email, '^[[:space:]]+|[[:space:]]+$', '', 'g'), 1) = '.';
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Lab 3 migration preflight: % invalid email(s). Correct legacy addresses before retrying.', invalid_count;
  END IF;
  IF EXISTS (SELECT 1 FROM "DevelopmentRequester"
    GROUP BY lower(regexp_replace(email, '^[[:space:]]+|[[:space:]]+$', '', 'g')) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Lab 3 migration preflight: normalized email collision. Resolve legacy addresses without merging identities.';
  END IF;
END $$;

ALTER TABLE "DevelopmentRequester" RENAME TO "User";
ALTER TABLE "User" RENAME CONSTRAINT "DevelopmentRequester_pkey" TO "User_pkey";
ALTER INDEX "DevelopmentRequester_email_key" RENAME TO "User_email_key";
ALTER SEQUENCE "DevelopmentRequester_id_seq" RENAME TO "User_id_seq";
UPDATE "User" SET email = lower(regexp_replace(email, '^[[:space:]]+|[[:space:]]+$', '', 'g'));

CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMIN');
ALTER TABLE "User"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'REQUESTER',
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "seedKey" VARCHAR(80);

ALTER TYPE "TicketStatus" ADD VALUE 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "TicketStatus" ADD VALUE 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE 'RESOLVED';
ALTER TYPE "TicketStatus" ADD VALUE 'CLOSED';
ALTER TYPE "TicketStatus" ADD VALUE 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE 'CANCELLED';

ALTER TABLE "Ticket" ALTER COLUMN "itPriority" DROP DEFAULT;
ALTER TYPE "ItPriority" RENAME TO "ItPriority_legacy";
CREATE TYPE "ItPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" TYPE "ItPriority"
  USING (CASE WHEN "itPriority"::text = 'UNASSIGNED'
    THEN "requestedPriority"::text ELSE "itPriority"::text END)::"ItPriority";
DROP TYPE "ItPriority_legacy";

ALTER TABLE "Ticket"
  ADD COLUMN "ownerId" INTEGER,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "requesterResolutionIndicatedAt" TIMESTAMP(3),
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "closedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "resolutionSummary" VARCHAR(1000),
  ADD COLUMN "cancellationReason" VARCHAR(1000),
  ADD COLUMN "seedKey" VARCHAR(80);

ALTER TABLE "Attachment" RENAME COLUMN "removedByRequesterId" TO "removedByUserId";
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_removedByRequesterId_fkey";
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_removedByUserId_fkey"
  FOREIGN KEY ("removedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" INTEGER,
    "tokenHash" CHAR(64) NOT NULL,
    "csrfToken" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicComment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seedKey" VARCHAR(80),

    CONSTRAINT "PublicComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternalNote" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seedKey" VARCHAR(80),

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketStatusChange" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "fromStatus" "TicketStatus" NOT NULL,
    "toStatus" "TicketStatus" NOT NULL,
    "reason" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketStatusChange_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_seedKey_key" ON "User"("seedKey");

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");

CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE UNIQUE INDEX "Ticket_seedKey_key" ON "Ticket"("seedKey");

CREATE INDEX "Ticket_currentStatus_updatedAt_id_idx" ON "Ticket"("currentStatus", "updatedAt", "id");

CREATE INDEX "Ticket_ownerId_updatedAt_id_idx" ON "Ticket"("ownerId", "updatedAt", "id");

CREATE INDEX "Ticket_itPriority_updatedAt_id_idx" ON "Ticket"("itPriority", "updatedAt", "id");

CREATE UNIQUE INDEX "PublicComment_seedKey_key" ON "PublicComment"("seedKey");

CREATE INDEX "PublicComment_ticketId_createdAt_id_idx" ON "PublicComment"("ticketId", "createdAt", "id");

CREATE UNIQUE INDEX "InternalNote_seedKey_key" ON "InternalNote"("seedKey");

CREATE INDEX "InternalNote_ticketId_createdAt_id_idx" ON "InternalNote"("ticketId", "createdAt", "id");

CREATE INDEX "TicketStatusChange_ticketId_createdAt_id_idx" ON "TicketStatusChange"("ticketId", "createdAt", "id");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TicketStatusChange" ADD CONSTRAINT "TicketStatusChange_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TicketStatusChange" ADD CONSTRAINT "TicketStatusChange_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve a sequence already ahead of the data; repair a lagging legacy sequence.
-- Run last, after all fallible DDL; setval itself is not rolled back by PostgreSQL.
DO $$
DECLARE highest_id bigint; sequence_value bigint; already_called boolean;
BEGIN
  SELECT COALESCE(MAX(id),0) INTO highest_id FROM "User";
  SELECT last_value,is_called INTO sequence_value,already_called FROM "User_id_seq";
  PERFORM setval('"User_id_seq"', GREATEST(highest_id,sequence_value), already_called OR highest_id >= sequence_value);
END $$;
COMMIT;
