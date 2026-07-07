-- Add appointment automation operations console rules, executions, and audit events.

CREATE TYPE "AppointmentAutomationRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'RETIRED');
CREATE TYPE "AppointmentAutomationRuleAction" AS ENUM ('DRAFT_CREATED', 'DRAFT_UPDATED', 'ACTIVATED', 'PAUSED', 'RETIRED', 'SIMULATED');
CREATE TYPE "AppointmentAutomationExecutionStatus" AS ENUM ('PENDING', 'REVIEW_REQUIRED', 'SUCCEEDED', 'FAILED_RETRYABLE', 'FAILED_TERMINAL', 'SKIPPED', 'RESOLVED');
CREATE TYPE "AppointmentAutomationExecutionAction" AS ENUM ('QUEUED', 'SIMULATED', 'FAILED', 'RETRIED', 'REPLAYED', 'REVIEW_CREATED', 'RESOLVED', 'SKIPPED');

CREATE TABLE "AppointmentAutomationRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "catalogVersionId" TEXT,
    "ruleCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerCode" TEXT NOT NULL,
    "purposeCode" TEXT NOT NULL,
    "status" "AppointmentAutomationRuleStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "missingInputBehavior" TEXT NOT NULL,
    "validationSnapshot" JSONB NOT NULL,
    "simulationSnapshot" JSONB,
    "reason" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "activatedByUserId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentAutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentAutomationRuleChangeEvent" (
    "id" TEXT NOT NULL,
    "automationRuleId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AppointmentAutomationRuleAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "priorSnapshot" JSONB,
    "newSnapshot" JSONB NOT NULL,
    "validationSnapshot" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentAutomationRuleChangeEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentAutomationExecution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "automationRuleId" TEXT,
    "triggerCode" TEXT NOT NULL,
    "purposeCode" TEXT,
    "status" "AppointmentAutomationExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "sourceType" TEXT NOT NULL,
    "sourceReference" TEXT,
    "inputSnapshot" JSONB NOT NULL,
    "resultSnapshot" JSONB,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentAutomationExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentAutomationExecutionEvent" (
    "id" TEXT NOT NULL,
    "automationExecutionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AppointmentAutomationExecutionAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "priorSnapshot" JSONB,
    "newSnapshot" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentAutomationExecutionEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentAutomationRule_organizationId_ruleCode_key" ON "AppointmentAutomationRule"("organizationId", "ruleCode");
CREATE INDEX "AppointmentAutomationRule_organizationId_status_idx" ON "AppointmentAutomationRule"("organizationId", "status");
CREATE INDEX "AppointmentAutomationRule_triggerCode_status_idx" ON "AppointmentAutomationRule"("triggerCode", "status");
CREATE INDEX "AppointmentAutomationRule_purposeCode_status_idx" ON "AppointmentAutomationRule"("purposeCode", "status");
CREATE INDEX "AppointmentAutomationRule_catalogVersionId_idx" ON "AppointmentAutomationRule"("catalogVersionId");
CREATE INDEX "AppointmentAutomationRuleChangeEvent_automationRuleId_occurredAt_idx" ON "AppointmentAutomationRuleChangeEvent"("automationRuleId", "occurredAt");
CREATE INDEX "AppointmentAutomationRuleChangeEvent_organizationId_action_occurredAt_idx" ON "AppointmentAutomationRuleChangeEvent"("organizationId", "action", "occurredAt");
CREATE INDEX "AppointmentAutomationRuleChangeEvent_actorUserId_occurredAt_idx" ON "AppointmentAutomationRuleChangeEvent"("actorUserId", "occurredAt");
CREATE INDEX "AppointmentAutomationExecution_organizationId_status_createdAt_idx" ON "AppointmentAutomationExecution"("organizationId", "status", "createdAt");
CREATE INDEX "AppointmentAutomationExecution_automationRuleId_status_createdAt_idx" ON "AppointmentAutomationExecution"("automationRuleId", "status", "createdAt");
CREATE INDEX "AppointmentAutomationExecution_triggerCode_status_idx" ON "AppointmentAutomationExecution"("triggerCode", "status");
CREATE INDEX "AppointmentAutomationExecution_failureCode_status_idx" ON "AppointmentAutomationExecution"("failureCode", "status");
CREATE INDEX "AppointmentAutomationExecutionEvent_automationExecutionId_occurredAt_idx" ON "AppointmentAutomationExecutionEvent"("automationExecutionId", "occurredAt");
CREATE INDEX "AppointmentAutomationExecutionEvent_organizationId_action_occurredAt_idx" ON "AppointmentAutomationExecutionEvent"("organizationId", "action", "occurredAt");
CREATE INDEX "AppointmentAutomationExecutionEvent_actorUserId_occurredAt_idx" ON "AppointmentAutomationExecutionEvent"("actorUserId", "occurredAt");

ALTER TABLE "AppointmentAutomationRule" ADD CONSTRAINT "AppointmentAutomationRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentAutomationRule" ADD CONSTRAINT "AppointmentAutomationRule_catalogVersionId_fkey" FOREIGN KEY ("catalogVersionId") REFERENCES "AppointmentCatalogVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentAutomationRule" ADD CONSTRAINT "AppointmentAutomationRule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentAutomationRule" ADD CONSTRAINT "AppointmentAutomationRule_activatedByUserId_fkey" FOREIGN KEY ("activatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentAutomationRuleChangeEvent" ADD CONSTRAINT "AppointmentAutomationRuleChangeEvent_automationRuleId_fkey" FOREIGN KEY ("automationRuleId") REFERENCES "AppointmentAutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentAutomationRuleChangeEvent" ADD CONSTRAINT "AppointmentAutomationRuleChangeEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentAutomationRuleChangeEvent" ADD CONSTRAINT "AppointmentAutomationRuleChangeEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentAutomationExecution" ADD CONSTRAINT "AppointmentAutomationExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentAutomationExecution" ADD CONSTRAINT "AppointmentAutomationExecution_automationRuleId_fkey" FOREIGN KEY ("automationRuleId") REFERENCES "AppointmentAutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentAutomationExecutionEvent" ADD CONSTRAINT "AppointmentAutomationExecutionEvent_automationExecutionId_fkey" FOREIGN KEY ("automationExecutionId") REFERENCES "AppointmentAutomationExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentAutomationExecutionEvent" ADD CONSTRAINT "AppointmentAutomationExecutionEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentAutomationExecutionEvent" ADD CONSTRAINT "AppointmentAutomationExecutionEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
