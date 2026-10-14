CREATE TABLE "DiagnosticPilotEvidenceSnapshot" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "evidenceSetId" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL,
  "recordedBy" TEXT NOT NULL,
  "requestedMode" TEXT NOT NULL,
  "operationalReadiness" JSONB,
  "reviewApproval" JSONB,
  "replay" JSONB,
  "evidenceRecords" JSONB NOT NULL,
  "acceptanceSignedBy" JSONB NOT NULL,
  "unresolvedRisks" JSONB NOT NULL,
  "repositoryChecksum" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DiagnosticPilotEvidenceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiagnosticPilotEvidenceSnapshot_org_evidenceSet_key"
  ON "DiagnosticPilotEvidenceSnapshot"("organizationId", "evidenceSetId");

CREATE UNIQUE INDEX "DiagnosticPilotEvidenceSnapshot_org_checksum_key"
  ON "DiagnosticPilotEvidenceSnapshot"("organizationId", "repositoryChecksum");

CREATE INDEX "DiagnosticPilotEvidenceSnapshot_org_recordedAt_idx"
  ON "DiagnosticPilotEvidenceSnapshot"("organizationId", "recordedAt");

CREATE INDEX "DiagnosticPilotEvidenceSnapshot_recordedBy_recordedAt_idx"
  ON "DiagnosticPilotEvidenceSnapshot"("recordedBy", "recordedAt");

ALTER TABLE "DiagnosticPilotEvidenceSnapshot"
  ADD CONSTRAINT "DiagnosticPilotEvidenceSnapshot_organization_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DiagnosticPilotEvidenceSnapshot"
  ADD CONSTRAINT "DiagnosticPilotEvidenceSnapshot_recordedBy_fkey"
  FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
