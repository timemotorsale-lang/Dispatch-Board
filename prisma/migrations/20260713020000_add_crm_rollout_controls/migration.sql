CREATE TABLE "CustomerCrmFeatureFlag" ("id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"code" TEXT NOT NULL,"enabled" BOOLEAN NOT NULL DEFAULT false,"rolloutPercent" INTEGER NOT NULL DEFAULT 0,"allowedUserIds" JSONB NOT NULL,"updatedByUserId" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "CustomerCrmFeatureFlag_pkey" PRIMARY KEY ("id"));
CREATE TABLE "CustomerCrmRolloutEvent" ("id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"actorUserId" TEXT NOT NULL,"action" TEXT NOT NULL,"reason" TEXT NOT NULL,"priorState" JSONB NOT NULL,"nextState" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "CustomerCrmRolloutEvent_pkey" PRIMARY KEY ("id"));
CREATE TABLE "CustomerCrmCalibrationSnapshot" ("id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"windowStart" TIMESTAMP(3) NOT NULL,"windowEnd" TIMESTAMP(3) NOT NULL,"metrics" JSONB NOT NULL,"readiness" TEXT NOT NULL,"blockers" JSONB NOT NULL,"createdByUserId" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "CustomerCrmCalibrationSnapshot_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "CustomerCrmFeatureFlag_organizationId_code_key" ON "CustomerCrmFeatureFlag"("organizationId","code");
CREATE INDEX "CustomerCrmFeatureFlag_organizationId_enabled_idx" ON "CustomerCrmFeatureFlag"("organizationId","enabled");
CREATE INDEX "CustomerCrmRolloutEvent_organizationId_createdAt_idx" ON "CustomerCrmRolloutEvent"("organizationId","createdAt");
CREATE INDEX "CustomerCrmCalibrationSnapshot_organizationId_windowEnd_idx" ON "CustomerCrmCalibrationSnapshot"("organizationId","windowEnd");
ALTER TABLE "CustomerCrmFeatureFlag" ADD CONSTRAINT "CustomerCrmFeatureFlag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerCrmRolloutEvent" ADD CONSTRAINT "CustomerCrmRolloutEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerCrmCalibrationSnapshot" ADD CONSTRAINT "CustomerCrmCalibrationSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "CustomerCrmFeatureFlag" ("id","organizationId","code","enabled","rolloutPercent","allowedUserIds","updatedAt") VALUES
('crm-flag-master','org-time-motor-sales','CRM_MASTER',false,0,'[]'::jsonb,CURRENT_TIMESTAMP),
('crm-flag-leads','org-time-motor-sales','CRM_LEADS',false,0,'[]'::jsonb,CURRENT_TIMESTAMP),
('crm-flag-cases','org-time-motor-sales','CRM_CASES',false,0,'[]'::jsonb,CURRENT_TIMESTAMP),
('crm-flag-sla','org-time-motor-sales','CRM_SLA',false,0,'[]'::jsonb,CURRENT_TIMESTAMP),
('crm-flag-360','org-time-motor-sales','CRM_CUSTOMER_360',false,0,'[]'::jsonb,CURRENT_TIMESTAMP);
