-- CreateEnum
CREATE TYPE "AppointmentCommandType" AS ENUM (
  'CREATE_DRAFT',
  'SCHEDULE',
  'RESCHEDULE',
  'CANCEL',
  'COMPLETE',
  'CONFIRM',
  'DECLINE',
  'CHECK_IN',
  'NO_SHOW',
  'START',
  'WAIT',
  'FINISH',
  'TRANSFER_OWNER',
  'OVERRIDE_WARNING',
  'LINK_TASK',
  'UNLINK_TASK',
  'AUTOMATION_RUN',
  'BULK_RESCHEDULE',
  'IMPORT'
);

-- CreateEnum
CREATE TYPE "AppointmentCommandStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED_RETRYABLE',
  'FAILED_TERMINAL',
  'CONFLICT',
  'DUPLICATE_RETURNED',
  'CANCELLED'
);

-- CreateTable
CREATE TABLE "AppointmentCommandLedger" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT,
  "appointmentId" TEXT,
  "actorUserId" TEXT,
  "commandType" "AppointmentCommandType" NOT NULL,
  "status" "AppointmentCommandStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "causationId" TEXT,
  "expectedAppointmentVersion" INTEGER,
  "currentAppointmentVersion" INTEGER,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "resultSnapshot" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppointmentCommandLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentCommandLedger_organizationId_commandType_idempotencyKey_key"
  ON "AppointmentCommandLedger"("organizationId", "commandType", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AppointmentCommandLedger_appointmentId_commandType_createdAt_idx"
  ON "AppointmentCommandLedger"("appointmentId", "commandType", "createdAt");

-- CreateIndex
CREATE INDEX "AppointmentCommandLedger_locationId_status_createdAt_idx"
  ON "AppointmentCommandLedger"("locationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AppointmentCommandLedger_actorUserId_createdAt_idx"
  ON "AppointmentCommandLedger"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AppointmentCommandLedger_correlationId_idx"
  ON "AppointmentCommandLedger"("correlationId");

-- CreateIndex
CREATE INDEX "AppointmentCommandLedger_status_nextRetryAt_idx"
  ON "AppointmentCommandLedger"("status", "nextRetryAt");

-- AddForeignKey
ALTER TABLE "AppointmentCommandLedger"
  ADD CONSTRAINT "AppointmentCommandLedger_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentCommandLedger"
  ADD CONSTRAINT "AppointmentCommandLedger_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentCommandLedger"
  ADD CONSTRAINT "AppointmentCommandLedger_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentCommandLedger"
  ADD CONSTRAINT "AppointmentCommandLedger_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "AppointmentCommandLedger"
  ADD CONSTRAINT "AppointmentCommandLedger_idempotency_key_not_blank_check"
  CHECK (NULLIF(BTRIM("idempotencyKey"), '') IS NOT NULL);

ALTER TABLE "AppointmentCommandLedger"
  ADD CONSTRAINT "AppointmentCommandLedger_request_hash_not_blank_check"
  CHECK (NULLIF(BTRIM("requestHash"), '') IS NOT NULL);

ALTER TABLE "AppointmentCommandLedger"
  ADD CONSTRAINT "AppointmentCommandLedger_correlation_not_blank_check"
  CHECK (NULLIF(BTRIM("correlationId"), '') IS NOT NULL);

ALTER TABLE "AppointmentCommandLedger"
  ADD CONSTRAINT "AppointmentCommandLedger_version_positive_check"
  CHECK (
    ("expectedAppointmentVersion" IS NULL OR "expectedAppointmentVersion" > 0)
    AND
    ("currentAppointmentVersion" IS NULL OR "currentAppointmentVersion" > 0)
  );

ALTER TABLE "AppointmentCommandLedger"
  ADD CONSTRAINT "AppointmentCommandLedger_attempts_check"
  CHECK (
    "attemptCount" >= 0
    AND
    "maxAttempts" >= 0
    AND
    "attemptCount" <= "maxAttempts"
  );

ALTER TABLE "AppointmentCommandLedger"
  ADD CONSTRAINT "AppointmentCommandLedger_running_locked_check"
  CHECK ("status" <> 'RUNNING' OR "lockedAt" IS NOT NULL);

ALTER TABLE "AppointmentCommandLedger"
  ADD CONSTRAINT "AppointmentCommandLedger_success_completed_check"
  CHECK ("status" <> 'SUCCEEDED' OR "completedAt" IS NOT NULL);

ALTER TABLE "AppointmentCommandLedger"
  ADD CONSTRAINT "AppointmentCommandLedger_failure_documented_check"
  CHECK (
    "status" NOT IN ('FAILED_RETRYABLE', 'FAILED_TERMINAL', 'CONFLICT')
    OR
    ("failedAt" IS NOT NULL AND NULLIF(BTRIM("errorCode"), '') IS NOT NULL)
  );

ALTER TABLE "AppointmentCommandLedger"
  ADD CONSTRAINT "AppointmentCommandLedger_retry_schedule_check"
  CHECK ("status" <> 'FAILED_RETRYABLE' OR "nextRetryAt" IS NOT NULL);
