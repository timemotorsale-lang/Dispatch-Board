-- CreateEnum
CREATE TYPE "AppointmentEventActorType" AS ENUM (
  'HUMAN',
  'SYSTEM',
  'AUTOMATION',
  'IMPORT'
);

-- CreateEnum
CREATE TYPE "AppointmentHistoryEventType" AS ENUM (
  'CREATED',
  'DRAFT_UPDATED',
  'APPROVED',
  'SCHEDULED',
  'RESCHEDULED',
  'CANCELLED',
  'CONFIRMED',
  'DECLINED',
  'CHECKED_IN',
  'NO_SHOW_RECORDED',
  'STARTED',
  'WAITING',
  'FINISHED',
  'COMPLETED',
  'OUTCOME_RECORDED',
  'OWNER_CHANGED',
  'FIELD_UPDATED',
  'WARNING_OVERRIDDEN',
  'CONFLICT_DETECTED',
  'TASK_LINKED',
  'TASK_UNLINKED',
  'AUTOMATION_EVALUATED',
  'AUTOMATION_FAILED',
  'NOTIFICATION_QUEUED',
  'BULK_ACTION_PREVIEWED',
  'BULK_ACTION_APPLIED',
  'NOTE_ADDED'
);

-- CreateTable
CREATE TABLE "AppointmentHistoryEvent" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "actorType" "AppointmentEventActorType" NOT NULL,
  "actorUserId" TEXT,
  "taskId" TEXT,
  "appointmentTaskLinkId" TEXT,
  "eventType" "AppointmentHistoryEventType" NOT NULL,
  "message" TEXT NOT NULL,
  "reasonCode" TEXT,
  "reasonNotes" TEXT,
  "correlationId" TEXT NOT NULL,
  "causationId" TEXT,
  "automationRuleCode" TEXT,
  "automationRuleVersion" INTEGER,
  "priorValue" JSONB,
  "newValue" JSONB,
  "metadata" JSONB NOT NULL,
  "notificationIntent" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AppointmentHistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentHistoryEvent_appointmentId_occurredAt_idx"
  ON "AppointmentHistoryEvent"("appointmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "AppointmentHistoryEvent_eventType_occurredAt_idx"
  ON "AppointmentHistoryEvent"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "AppointmentHistoryEvent_actorUserId_occurredAt_idx"
  ON "AppointmentHistoryEvent"("actorUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "AppointmentHistoryEvent_taskId_occurredAt_idx"
  ON "AppointmentHistoryEvent"("taskId", "occurredAt");

-- CreateIndex
CREATE INDEX "AppointmentHistoryEvent_appointmentTaskLinkId_idx"
  ON "AppointmentHistoryEvent"("appointmentTaskLinkId");

-- CreateIndex
CREATE INDEX "AppointmentHistoryEvent_correlationId_idx"
  ON "AppointmentHistoryEvent"("correlationId");

-- CreateIndex
CREATE INDEX "AppointmentHistoryEvent_automationRuleCode_automationRuleVersion_idx"
  ON "AppointmentHistoryEvent"("automationRuleCode", "automationRuleVersion");

-- AddForeignKey
ALTER TABLE "AppointmentHistoryEvent"
  ADD CONSTRAINT "AppointmentHistoryEvent_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentHistoryEvent"
  ADD CONSTRAINT "AppointmentHistoryEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentHistoryEvent"
  ADD CONSTRAINT "AppointmentHistoryEvent_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentHistoryEvent"
  ADD CONSTRAINT "AppointmentHistoryEvent_appointmentTaskLinkId_fkey"
  FOREIGN KEY ("appointmentTaskLinkId") REFERENCES "AppointmentTaskLink"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "AppointmentHistoryEvent"
  ADD CONSTRAINT "AppointmentHistoryEvent_message_not_blank_check"
  CHECK (NULLIF(BTRIM("message"), '') IS NOT NULL);

ALTER TABLE "AppointmentHistoryEvent"
  ADD CONSTRAINT "AppointmentHistoryEvent_correlation_not_blank_check"
  CHECK (NULLIF(BTRIM("correlationId"), '') IS NOT NULL);

ALTER TABLE "AppointmentHistoryEvent"
  ADD CONSTRAINT "AppointmentHistoryEvent_human_actor_check"
  CHECK ("actorType" <> 'HUMAN' OR "actorUserId" IS NOT NULL);

ALTER TABLE "AppointmentHistoryEvent"
  ADD CONSTRAINT "AppointmentHistoryEvent_automation_version_check"
  CHECK (
    ("automationRuleCode" IS NULL AND "automationRuleVersion" IS NULL)
    OR
    ("automationRuleCode" IS NOT NULL AND "automationRuleVersion" IS NOT NULL AND "automationRuleVersion" > 0)
  );
