-- CreateEnum
CREATE TYPE "RequestedPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ItPriority" AS ENUM ('UNASSIGNED', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NEW');

-- Enforce the reference-data limits approved in the Lab 2 contract.
ALTER TABLE "Category" ALTER COLUMN "name" SET DATA TYPE VARCHAR(80);
ALTER TABLE "DevelopmentRequester"
  ALTER COLUMN "displayName" SET DATA TYPE VARCHAR(120),
  ALTER COLUMN "email" SET DATA TYPE VARCHAR(254);
ALTER TABLE "RelatedSystem" ALTER COLUMN "name" SET DATA TYPE VARCHAR(120);

-- Database-backed numbering stays unique under concurrent creation.
CREATE SEQUENCE "ticket_number_seq"
  AS BIGINT
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "ticketNumber" VARCHAR(20) NOT NULL,
    "ticketDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requesterId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "relatedSystemId" INTEGER NOT NULL,
    "summary" VARCHAR(120) NOT NULL,
    "description" VARCHAR(4000) NOT NULL,
    "requestedPriority" "RequestedPriority" NOT NULL,
    "itPriority" "ItPriority" NOT NULL DEFAULT 'UNASSIGNED',
    "currentStatus" "TicketStatus" NOT NULL DEFAULT 'NEW',
    "clientSubmissionKey" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");
CREATE INDEX "Ticket_requesterId_updatedAt_idx" ON "Ticket"("requesterId", "updatedAt");
CREATE INDEX "Ticket_requesterId_currentStatus_idx" ON "Ticket"("requesterId", "currentStatus");
CREATE INDEX "Ticket_requesterId_requestedPriority_idx" ON "Ticket"("requesterId", "requestedPriority");
CREATE INDEX "Ticket_requesterId_categoryId_idx" ON "Ticket"("requesterId", "categoryId");
CREATE UNIQUE INDEX "Ticket_requesterId_clientSubmissionKey_key"
  ON "Ticket"("requesterId", "clientSubmissionKey");

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "DevelopmentRequester"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_relatedSystemId_fkey"
  FOREIGN KEY ("relatedSystemId") REFERENCES "RelatedSystem"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
