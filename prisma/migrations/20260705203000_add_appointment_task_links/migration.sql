-- CreateEnum
CREATE TYPE "AppointmentTaskLinkType" AS ENUM (
  'SOURCE',
  'PREPARATION',
  'DEPENDENCY',
  'DURING_APPOINTMENT',
  'APPROVAL',
  'FOLLOW_UP',
  'OUTCOME',
  'REFERENCE'
);

-- CreateTable
CREATE TABLE "AppointmentTaskLink" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "linkType" "AppointmentTaskLinkType" NOT NULL,
  "linkCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "explanation" TEXT,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "blocksAppointment" BOOLEAN NOT NULL DEFAULT false,
  "blocksTask" BOOLEAN NOT NULL DEFAULT false,
  "automationRuleCode" TEXT,
  "templateVersion" INTEGER,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppointmentTaskLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentTaskLink_appointmentId_taskId_linkCode_key"
  ON "AppointmentTaskLink"("appointmentId", "taskId", "linkCode");

-- CreateIndex
CREATE INDEX "AppointmentTaskLink_appointmentId_linkType_idx"
  ON "AppointmentTaskLink"("appointmentId", "linkType");

-- CreateIndex
CREATE INDEX "AppointmentTaskLink_taskId_linkType_idx"
  ON "AppointmentTaskLink"("taskId", "linkType");

-- CreateIndex
CREATE INDEX "AppointmentTaskLink_automationRuleCode_templateVersion_idx"
  ON "AppointmentTaskLink"("automationRuleCode", "templateVersion");

-- CreateIndex
CREATE INDEX "AppointmentTaskLink_createdByUserId_idx"
  ON "AppointmentTaskLink"("createdByUserId");

-- AddForeignKey
ALTER TABLE "AppointmentTaskLink"
  ADD CONSTRAINT "AppointmentTaskLink_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentTaskLink"
  ADD CONSTRAINT "AppointmentTaskLink_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentTaskLink"
  ADD CONSTRAINT "AppointmentTaskLink_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
