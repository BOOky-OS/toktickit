BEGIN;
-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActionEvent" AS ENUM ('CREATE', 'EDIT', 'STATUS');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "workCycle" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ActionTaken" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "performedById" INTEGER NOT NULL,
    "assigneeId" INTEGER NOT NULL,
    "actionAt" TIMESTAMP(3) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "result" VARCHAR(2000) NOT NULL,
    "followUpRequired" BOOLEAN NOT NULL,
    "followUpNote" VARCHAR(1000) NOT NULL,
    "attachmentNotes" VARCHAR(1000) NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'PLANNED',
    "workCycle" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" VARCHAR(1000),
    "seedKey" VARCHAR(80),

    CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionRevision" (
    "id" SERIAL NOT NULL,
    "actionId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "event" "ActionEvent" NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionReceipt" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER NOT NULL,
    "key" UUID NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "path" VARCHAR(200) NOT NULL,
    "request" JSONB NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionTaken_seedKey_key" ON "ActionTaken"("seedKey");

-- CreateIndex
CREATE INDEX "ActionTaken_ticketId_createdAt_id_idx" ON "ActionTaken"("ticketId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ActionTaken_ticketId_workCycle_status_idx" ON "ActionTaken"("ticketId", "workCycle", "status");

-- CreateIndex
CREATE INDEX "ActionTaken_assigneeId_status_updatedAt_id_idx" ON "ActionTaken"("assigneeId", "status", "updatedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ActionRevision_actionId_version_key" ON "ActionRevision"("actionId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ActionReceipt_actorId_key_key" ON "ActionReceipt"("actorId", "key");

-- CreateIndex
CREATE INDEX "Ticket_requesterId_resolvedAt_id_idx" ON "Ticket"("requesterId", "resolvedAt", "id");

-- AddForeignKey
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionRevision" ADD CONSTRAINT "ActionRevision_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ActionTaken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionRevision" ADD CONSTRAINT "ActionRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionReceipt" ADD CONSTRAINT "ActionReceipt_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_workCycle_positive" CHECK ("workCycle" > 0);
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_versions_positive" CHECK (version > 0 AND "workCycle" > 0),
 ADD CONSTRAINT "ActionTaken_terminal_fields" CHECK (
 (status IN ('PLANNED','IN_PROGRESS') AND "completedAt" IS NULL AND "cancelledAt" IS NULL AND "cancellationReason" IS NULL)
 OR (status = 'COMPLETED' AND "completedAt" IS NOT NULL AND "cancelledAt" IS NULL AND "cancellationReason" IS NULL AND NOT "followUpRequired" AND length(trim(result)) >= 5)
 OR (status = 'CANCELLED' AND "completedAt" IS NULL AND "cancelledAt" IS NOT NULL AND length(trim("cancellationReason")) BETWEEN 5 AND 1000 AND "cancellationReason" IS NOT NULL));
ALTER TABLE "ActionRevision" ADD CONSTRAINT "ActionRevision_version_positive" CHECK (version > 0);
COMMIT;
