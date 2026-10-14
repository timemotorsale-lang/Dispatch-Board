CREATE TYPE "TimeCardCorrectionRequestStatus" AS ENUM ('SUBMITTED', 'RETURNED', 'APPROVED', 'DENIED', 'WITHDRAWN', 'APPLIED');

CREATE TABLE "TimeCardCorrectionRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "staffUserId" TEXT NOT NULL,
  "timeCardId" TEXT,
  "relatedEventId" TEXT,
  "status" "TimeCardCorrectionRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "idempotencyKey" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestedChangeType" TEXT NOT NULL,
  "requestedDate" DATE NOT NULL,
  "requestedStartAt" TIMESTAMP(3),
  "requestedEndAt" TIMESTAMP(3),
  "employeeExplanation" TEXT NOT NULL,
  "managerUserId" TEXT,
  "managerDecisionAt" TIMESTAMP(3),
  "managerDecision" TEXT,
  "managerReason" TEXT,
  "evidence" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeCardCorrectionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TimeCardCorrectionRequest_org_location_status_requestedAt_idx"
  ON "TimeCardCorrectionRequest"("organizationId", "locationId", "status", "requestedAt");

CREATE UNIQUE INDEX "TimeCardCorrectionRequest_org_staff_idempotency_key"
  ON "TimeCardCorrectionRequest"("organizationId", "staffUserId", "idempotencyKey");

CREATE INDEX "TimeCardCorrectionRequest_staff_date_status_idx"
  ON "TimeCardCorrectionRequest"("staffUserId", "requestedDate", "status");

CREATE INDEX "TimeCardCorrectionRequest_timeCard_status_idx"
  ON "TimeCardCorrectionRequest"("timeCardId", "status");

CREATE INDEX "TimeCardCorrectionRequest_relatedEventId_idx"
  ON "TimeCardCorrectionRequest"("relatedEventId");

ALTER TABLE "TimeCardCorrectionRequest"
  ADD CONSTRAINT "TimeCardCorrectionRequest_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TimeCardCorrectionRequest"
  ADD CONSTRAINT "TimeCardCorrectionRequest_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TimeCardCorrectionRequest"
  ADD CONSTRAINT "TimeCardCorrectionRequest_staffUserId_fkey"
  FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TimeCardCorrectionRequest"
  ADD CONSTRAINT "TimeCardCorrectionRequest_timeCardId_fkey"
  FOREIGN KEY ("timeCardId") REFERENCES "TimeCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TimeCardCorrectionRequest"
  ADD CONSTRAINT "TimeCardCorrectionRequest_relatedEventId_fkey"
  FOREIGN KEY ("relatedEventId") REFERENCES "TimeAttendanceEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TimeCardCorrectionRequest"
  ADD CONSTRAINT "TimeCardCorrectionRequest_managerUserId_fkey"
  FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
