CREATE TYPE "DiagnosticKnowledgeSourceClass" AS ENUM ('ENGINEERING', 'SHOP_PROCEDURE', 'OEM_LICENSED', 'REGULATORY', 'STANDARD', 'COMMERCIAL', 'TOOL_EVIDENCE', 'VERIFIED_CASE', 'COMMUNITY_ADVISORY');
CREATE TYPE "DiagnosticKnowledgeRightsStatus" AS ENUM ('HOLD', 'AUTHORIZED', 'WITHDRAWN', 'EXPIRED', 'PROHIBITED');
CREATE TYPE "DiagnosticKnowledgeReleaseState" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'SHADOW', 'ACTIVE', 'SUSPENDED', 'RETIRED');

CREATE TABLE "DiagnosticKnowledgeSourceVersion" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "sourceKey" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "sourceClass" "DiagnosticKnowledgeSourceClass" NOT NULL, "rightsStatus" "DiagnosticKnowledgeRightsStatus" NOT NULL,
  "ownerName" TEXT NOT NULL, "sourceReference" TEXT NOT NULL, "revision" TEXT NOT NULL,
  "usageRights" JSONB NOT NULL, "applicability" JSONB NOT NULL, "retrievedAt" TIMESTAMP(3) NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3), "withdrawnAt" TIMESTAMP(3),
  "withdrawalReasonCode" TEXT, "checksum" TEXT NOT NULL, "authoredByUserId" TEXT NOT NULL,
  "technicalReviewedByUserId" TEXT, "rightsReviewedByUserId" TEXT, "approvedAt" TIMESTAMP(3),
  "supersedesId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticKnowledgeSourceVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticKnowledgeSource_identity_check" CHECK (BTRIM("sourceKey") <> '' AND BTRIM("ownerName") <> '' AND BTRIM("sourceReference") <> '' AND BTRIM("revision") <> '' AND "version" > 0),
  CONSTRAINT "DiagnosticKnowledgeSource_checksum_check" CHECK ("checksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "DiagnosticKnowledgeSource_time_check" CHECK (("expiresAt" IS NULL OR "expiresAt" > "effectiveAt") AND ("withdrawnAt" IS NULL OR "withdrawnAt" >= "effectiveAt")),
  CONSTRAINT "DiagnosticKnowledgeSource_withdrawal_check" CHECK (("rightsStatus" = 'WITHDRAWN' AND "withdrawnAt" IS NOT NULL AND BTRIM(COALESCE("withdrawalReasonCode", '')) <> '') OR ("rightsStatus" <> 'WITHDRAWN' AND "withdrawnAt" IS NULL AND "withdrawalReasonCode" IS NULL)),
  CONSTRAINT "DiagnosticKnowledgeSource_review_check" CHECK (("rightsStatus" = 'AUTHORIZED' AND "technicalReviewedByUserId" IS NOT NULL AND "rightsReviewedByUserId" IS NOT NULL AND "approvedAt" IS NOT NULL AND "authoredByUserId" <> "technicalReviewedByUserId" AND "authoredByUserId" <> "rightsReviewedByUserId") OR "rightsStatus" <> 'AUTHORIZED')
);

CREATE TABLE "DiagnosticRuleSetVersion" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "ruleSetKey" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "releaseState" "DiagnosticKnowledgeReleaseState" NOT NULL, "purpose" TEXT NOT NULL, "ontologyGraph" JSONB NOT NULL,
  "applicability" JSONB NOT NULL, "rules" JSONB NOT NULL, "testDefinitionKeys" JSONB NOT NULL,
  "calculationVersions" JSONB NOT NULL, "checksum" TEXT NOT NULL, "authoredByUserId" TEXT NOT NULL,
  "reviewedByUserId" TEXT, "approvedAt" TIMESTAMP(3), "effectiveAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3), "supersedesId" TEXT, "rollbackPredecessorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticRuleSetVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticRuleSet_identity_check" CHECK (BTRIM("ruleSetKey") <> '' AND LENGTH(BTRIM("purpose")) >= 10 AND "version" > 0),
  CONSTRAINT "DiagnosticRuleSet_checksum_check" CHECK ("checksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "DiagnosticRuleSet_time_check" CHECK ("expiresAt" IS NULL OR "expiresAt" > "effectiveAt"),
  CONSTRAINT "DiagnosticRuleSet_review_check" CHECK (("releaseState" IN ('APPROVED', 'SHADOW', 'ACTIVE') AND "reviewedByUserId" IS NOT NULL AND "approvedAt" IS NOT NULL AND "authoredByUserId" <> "reviewedByUserId") OR "releaseState" NOT IN ('APPROVED', 'SHADOW', 'ACTIVE')),
  CONSTRAINT "DiagnosticRuleSet_lineage_check" CHECK (("supersedesId" IS NULL OR "supersedesId" <> "id") AND ("rollbackPredecessorId" IS NULL OR "rollbackPredecessorId" <> "id"))
);

CREATE TABLE "DiagnosticRuleSetSourceLink" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "ruleSetVersionId" TEXT NOT NULL,
  "knowledgeSourceVersionId" TEXT NOT NULL, "citation" JSONB NOT NULL, "purpose" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticRuleSetSourceLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticRuleSetSourceLink_purpose_check" CHECK (BTRIM("purpose") <> '')
);

CREATE UNIQUE INDEX "DiagnosticKnowledgeSource_org_key_version_key" ON "DiagnosticKnowledgeSourceVersion"("organizationId", "sourceKey", "version");
CREATE UNIQUE INDEX "DiagnosticKnowledgeSource_id_org_key" ON "DiagnosticKnowledgeSourceVersion"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticKnowledgeSource_supersedes_key" ON "DiagnosticKnowledgeSourceVersion"("supersedesId");
CREATE INDEX "DiagnosticKnowledgeSource_org_rights_effective_idx" ON "DiagnosticKnowledgeSourceVersion"("organizationId", "sourceKey", "rightsStatus", "effectiveAt");
CREATE INDEX "DiagnosticKnowledgeSource_org_expiry_withdrawal_idx" ON "DiagnosticKnowledgeSourceVersion"("organizationId", "expiresAt", "withdrawnAt");
CREATE UNIQUE INDEX "DiagnosticRuleSet_org_key_version_key" ON "DiagnosticRuleSetVersion"("organizationId", "ruleSetKey", "version");
CREATE UNIQUE INDEX "DiagnosticRuleSet_id_org_key" ON "DiagnosticRuleSetVersion"("id", "organizationId");
CREATE UNIQUE INDEX "DiagnosticRuleSet_supersedes_key" ON "DiagnosticRuleSetVersion"("supersedesId");
CREATE INDEX "DiagnosticRuleSet_org_state_effective_idx" ON "DiagnosticRuleSetVersion"("organizationId", "ruleSetKey", "releaseState", "effectiveAt");
CREATE INDEX "DiagnosticRuleSet_org_expiry_idx" ON "DiagnosticRuleSetVersion"("organizationId", "expiresAt");
CREATE UNIQUE INDEX "DiagnosticRuleSetSource_unique" ON "DiagnosticRuleSetSourceLink"("ruleSetVersionId", "knowledgeSourceVersionId", "purpose");
CREATE UNIQUE INDEX "DiagnosticRuleSetSource_id_org_key" ON "DiagnosticRuleSetSourceLink"("id", "organizationId");
CREATE INDEX "DiagnosticRuleSetSource_org_source_idx" ON "DiagnosticRuleSetSourceLink"("organizationId", "knowledgeSourceVersionId");

ALTER TABLE "DiagnosticKnowledgeSourceVersion" ADD CONSTRAINT "DiagnosticKnowledgeSource_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticKnowledgeSourceVersion" ADD CONSTRAINT "DiagnosticKnowledgeSource_author_fkey" FOREIGN KEY ("authoredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticKnowledgeSourceVersion" ADD CONSTRAINT "DiagnosticKnowledgeSource_technical_reviewer_fkey" FOREIGN KEY ("technicalReviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticKnowledgeSourceVersion" ADD CONSTRAINT "DiagnosticKnowledgeSource_rights_reviewer_fkey" FOREIGN KEY ("rightsReviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticKnowledgeSourceVersion" ADD CONSTRAINT "DiagnosticKnowledgeSource_supersedes_fkey" FOREIGN KEY ("supersedesId") REFERENCES "DiagnosticKnowledgeSourceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRuleSetVersion" ADD CONSTRAINT "DiagnosticRuleSet_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRuleSetVersion" ADD CONSTRAINT "DiagnosticRuleSet_author_fkey" FOREIGN KEY ("authoredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRuleSetVersion" ADD CONSTRAINT "DiagnosticRuleSet_reviewer_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRuleSetVersion" ADD CONSTRAINT "DiagnosticRuleSet_supersedes_fkey" FOREIGN KEY ("supersedesId") REFERENCES "DiagnosticRuleSetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRuleSetVersion" ADD CONSTRAINT "DiagnosticRuleSet_rollback_fkey" FOREIGN KEY ("rollbackPredecessorId") REFERENCES "DiagnosticRuleSetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRuleSetSourceLink" ADD CONSTRAINT "DiagnosticRuleSetSource_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRuleSetSourceLink" ADD CONSTRAINT "DiagnosticRuleSetSource_ruleset_tenant_fkey" FOREIGN KEY ("ruleSetVersionId", "organizationId") REFERENCES "DiagnosticRuleSetVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticRuleSetSourceLink" ADD CONSTRAINT "DiagnosticRuleSetSource_source_tenant_fkey" FOREIGN KEY ("knowledgeSourceVersionId", "organizationId") REFERENCES "DiagnosticKnowledgeSourceVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION validate_diagnostic_knowledge_lineage() RETURNS trigger AS $$
DECLARE prior_org TEXT; prior_key TEXT;
BEGIN
  IF TG_TABLE_NAME = 'DiagnosticKnowledgeSourceVersion' AND NEW."supersedesId" IS NOT NULL THEN
    SELECT "organizationId", "sourceKey" INTO prior_org, prior_key FROM "DiagnosticKnowledgeSourceVersion" WHERE "id" = NEW."supersedesId";
    IF prior_org <> NEW."organizationId" OR prior_key <> NEW."sourceKey" THEN RAISE EXCEPTION 'knowledge source lineage must remain within one tenant and key'; END IF;
  ELSIF TG_TABLE_NAME = 'DiagnosticRuleSetVersion' THEN
    IF NEW."supersedesId" IS NOT NULL THEN
      SELECT "organizationId", "ruleSetKey" INTO prior_org, prior_key FROM "DiagnosticRuleSetVersion" WHERE "id" = NEW."supersedesId";
      IF prior_org <> NEW."organizationId" OR prior_key <> NEW."ruleSetKey" THEN RAISE EXCEPTION 'rule-set lineage must remain within one tenant and key'; END IF;
    END IF;
    IF NEW."rollbackPredecessorId" IS NOT NULL THEN
      SELECT "organizationId", "ruleSetKey" INTO prior_org, prior_key FROM "DiagnosticRuleSetVersion" WHERE "id" = NEW."rollbackPredecessorId";
      IF prior_org <> NEW."organizationId" OR prior_key <> NEW."ruleSetKey" THEN RAISE EXCEPTION 'rule-set rollback must remain within one tenant and key'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DiagnosticKnowledgeSource_lineage" BEFORE INSERT ON "DiagnosticKnowledgeSourceVersion" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_knowledge_lineage();
CREATE TRIGGER "DiagnosticRuleSet_lineage" BEFORE INSERT ON "DiagnosticRuleSetVersion" FOR EACH ROW EXECUTE FUNCTION validate_diagnostic_knowledge_lineage();
CREATE TRIGGER "DiagnosticKnowledgeSource_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticKnowledgeSourceVersion" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
CREATE TRIGGER "DiagnosticRuleSet_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticRuleSetVersion" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
CREATE TRIGGER "DiagnosticRuleSetSource_immutable" BEFORE UPDATE OR DELETE ON "DiagnosticRuleSetSourceLink" FOR EACH ROW EXECUTE FUNCTION prevent_diagnostic_immutable_mutation();
