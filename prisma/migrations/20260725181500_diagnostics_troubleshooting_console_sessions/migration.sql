CREATE TABLE "DiagnosticTroubleshootingSession" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "diagnosticCaseId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "consoleVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "intakeRefinement" JSONB NOT NULL,
  "vehicleIntelligenceAcknowledgements" JSONB NOT NULL,
  "selectedTestKey" TEXT,
  "overrideReason" TEXT,
  "advisorDraftPacket" JSONB NOT NULL,
  "learningProposal" JSONB NOT NULL,
  "knownIssueSnapshot" JSONB NOT NULL,
  "rulePackSnapshot" JSONB NOT NULL,
  "sessionChecksum" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "supersedesId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticTroubleshootingSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticTroubleshootingSession_checksum_check" CHECK (length("sessionChecksum") >= 32)
);

CREATE UNIQUE INDEX "DiagnosticTroubleshootingSession_case_version_key" ON "DiagnosticTroubleshootingSession"("diagnosticCaseId", "version");
CREATE UNIQUE INDEX "DiagnosticTroubleshootingSession_id_org_key" ON "DiagnosticTroubleshootingSession"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticTroubleshootingSession_supersedes_key" ON "DiagnosticTroubleshootingSession"("supersedesId");
CREATE INDEX "DiagnosticTroubleshootingSession_org_case_time_idx" ON "DiagnosticTroubleshootingSession"("organizationId", "diagnosticCaseId", "occurredAt");
CREATE INDEX "DiagnosticTroubleshootingSession_org_status_time_idx" ON "DiagnosticTroubleshootingSession"("organizationId", "status", "occurredAt");

ALTER TABLE "DiagnosticTroubleshootingSession" ADD CONSTRAINT "DiagnosticTroubleshootingSession_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTroubleshootingSession" ADD CONSTRAINT "DiagnosticTroubleshootingSession_case_fkey" FOREIGN KEY ("diagnosticCaseId") REFERENCES "DiagnosticCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTroubleshootingSession" ADD CONSTRAINT "DiagnosticTroubleshootingSession_author_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTroubleshootingSession" ADD CONSTRAINT "DiagnosticTroubleshootingSession_supersedes_fkey" FOREIGN KEY ("supersedesId") REFERENCES "DiagnosticTroubleshootingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTroubleshootingSession" ADD CONSTRAINT "DiagnosticTroubleshootingSession_case_tenant_fkey" FOREIGN KEY ("diagnosticCaseId", "organizationId") REFERENCES "DiagnosticCase"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION validate_diagnostic_troubleshooting_session_lineage() RETURNS trigger AS $$
BEGIN
  IF NEW."supersedesId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "DiagnosticTroubleshootingSession"
    WHERE "id" = NEW."supersedesId"
      AND "organizationId" = NEW."organizationId"
      AND "diagnosticCaseId" = NEW."diagnosticCaseId"
  ) THEN
    RAISE EXCEPTION 'troubleshooting session lineage must remain within one tenant and case';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DiagnosticTroubleshootingSession_lineage" BEFORE INSERT ON "DiagnosticTroubleshootingSession" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_troubleshooting_session_lineage();
CREATE TRIGGER "DiagnosticTroubleshootingSession_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticTroubleshootingSession" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
