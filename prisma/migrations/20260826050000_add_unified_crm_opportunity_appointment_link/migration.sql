CREATE TABLE "UnifiedCrmOpportunityAppointmentLink" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "titleSnapshot" TEXT NOT NULL,
  "startsAtSnapshot" TIMESTAMP(3),
  "endsAtSnapshot" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "commandId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UnifiedCrmOpportunityAppointmentLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UnifiedCrmOpportunityAppointmentLink_opportunityId_appointmentId_key"
  ON "UnifiedCrmOpportunityAppointmentLink"("opportunityId", "appointmentId");

CREATE INDEX "UnifiedCrmOpportunityAppointmentLink_organizationId_createdAt_idx"
  ON "UnifiedCrmOpportunityAppointmentLink"("organizationId", "createdAt");

CREATE INDEX "UnifiedCrmOpportunityAppointmentLink_appointmentId_idx"
  ON "UnifiedCrmOpportunityAppointmentLink"("appointmentId");

CREATE INDEX "UnifiedCrmOpportunityAppointmentLink_createdByUserId_createdAt_idx"
  ON "UnifiedCrmOpportunityAppointmentLink"("createdByUserId", "createdAt");

ALTER TABLE "UnifiedCrmOpportunityAppointmentLink"
  ADD CONSTRAINT "UnifiedCrmOpportunityAppointmentLink_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "UnifiedCrmOpportunityRecord"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmOpportunityAppointmentLink"
  ADD CONSTRAINT "UnifiedCrmOpportunityAppointmentLink_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmOpportunityAppointmentLink"
  ADD CONSTRAINT "UnifiedCrmOpportunityAppointmentLink_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnifiedCrmOpportunityAppointmentLink"
  ADD CONSTRAINT "UnifiedCrmOpportunityAppointmentLink_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
