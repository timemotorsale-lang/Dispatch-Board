CREATE TYPE "EnterpriseCommandStatus" AS ENUM ('SUCCEEDED', 'FAILED');
CREATE TYPE "EnterpriseOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'DEAD_LETTER');
CREATE TYPE "CapabilityEffect" AS ENUM ('ALLOW', 'DENY');
CREATE TYPE "VehicleOperationsRolloutMode" AS ENUM ('OFF', 'SHADOW', 'PILOT', 'GENERAL');

CREATE UNIQUE INDEX "Location_id_organizationId_key" ON "Location"("id", "organizationId");

CREATE TABLE "EnterpriseAggregateVersion" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "locationId" TEXT,
  "domain" TEXT NOT NULL, "subjectType" TEXT NOT NULL, "subjectId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "EnterpriseAggregateVersion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EnterpriseCommandLedger" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "locationId" TEXT, "actorUserId" TEXT NOT NULL,
  "domain" TEXT NOT NULL, "subjectType" TEXT NOT NULL, "subjectId" TEXT NOT NULL, "commandType" TEXT NOT NULL,
  "status" "EnterpriseCommandStatus" NOT NULL, "idempotencyKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL, "expectedVersion" INTEGER NOT NULL, "resultingVersion" INTEGER,
  "resultSnapshot" JSONB, "errorCode" TEXT, "errorMessage" TEXT, "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnterpriseCommandLedger_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EnterpriseDomainEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "locationId" TEXT, "commandId" TEXT NOT NULL,
  "domain" TEXT NOT NULL, "aggregateType" TEXT NOT NULL, "aggregateId" TEXT NOT NULL,
  "aggregateVersion" INTEGER NOT NULL, "eventType" TEXT NOT NULL, "payload" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnterpriseDomainEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EnterpriseAuditEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "locationId" TEXT, "actorUserId" TEXT NOT NULL,
  "commandId" TEXT, "domain" TEXT NOT NULL, "subjectType" TEXT NOT NULL, "subjectId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL, "reason" TEXT NOT NULL, "priorValue" JSONB, "newValue" JSONB,
  "metadata" JSONB NOT NULL, "correlationId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnterpriseAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EnterpriseOutboxMessage" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "locationId" TEXT, "domainEventId" TEXT NOT NULL,
  "topic" TEXT NOT NULL, "messageKey" TEXT NOT NULL, "payload" JSONB NOT NULL,
  "status" "EnterpriseOutboxStatus" NOT NULL DEFAULT 'PENDING', "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5, "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3), "publishedAt" TIMESTAMP(3), "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnterpriseOutboxMessage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VehicleCapabilityGrant" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "locationId" TEXT, "userId" TEXT NOT NULL,
  "capability" TEXT NOT NULL, "effect" "CapabilityEffect" NOT NULL DEFAULT 'ALLOW', "constraints" JSONB NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "validTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleCapabilityGrant_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VehicleOperationsFeatureFlag" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "locationId" TEXT, "code" TEXT NOT NULL,
  "mode" "VehicleOperationsRolloutMode" NOT NULL DEFAULT 'OFF', "rolloutPercent" INTEGER NOT NULL DEFAULT 0,
  "allowedUserIds" JSONB NOT NULL, "version" INTEGER NOT NULL DEFAULT 1, "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleOperationsFeatureFlag_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VehicleOperationsRolloutEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "actorUserId" TEXT NOT NULL, "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL, "priorState" JSONB NOT NULL, "nextState" JSONB NOT NULL, "correlationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleOperationsRolloutEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EnterpriseProjectionCheckpoint" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "locationId" TEXT, "projectionCode" TEXT NOT NULL,
  "lastEventOccurredAt" TIMESTAMP(3), "lastSuccessAt" TIMESTAMP(3), "lastFailureAt" TIMESTAMP(3),
  "lastError" TEXT, "lagSeconds" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnterpriseProjectionCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnterpriseAggregateVersion_organizationId_domain_subjectType_subjectId_key" ON "EnterpriseAggregateVersion"("organizationId","domain","subjectType","subjectId");
CREATE INDEX "EnterpriseAggregateVersion_locationId_domain_subjectType_idx" ON "EnterpriseAggregateVersion"("locationId","domain","subjectType");
CREATE UNIQUE INDEX "EnterpriseCommandLedger_organizationId_domain_commandType_idempotencyKey_key" ON "EnterpriseCommandLedger"("organizationId","domain","commandType","idempotencyKey");
CREATE INDEX "EnterpriseCommandLedger_subjectType_subjectId_createdAt_idx" ON "EnterpriseCommandLedger"("subjectType","subjectId","createdAt");
CREATE INDEX "EnterpriseCommandLedger_locationId_status_createdAt_idx" ON "EnterpriseCommandLedger"("locationId","status","createdAt");
CREATE INDEX "EnterpriseCommandLedger_correlationId_idx" ON "EnterpriseCommandLedger"("correlationId");
CREATE UNIQUE INDEX "EnterpriseDomainEvent_organizationId_domain_aggregateType_aggregateId_aggregateVersion_key" ON "EnterpriseDomainEvent"("organizationId","domain","aggregateType","aggregateId","aggregateVersion");
CREATE INDEX "EnterpriseDomainEvent_commandId_idx" ON "EnterpriseDomainEvent"("commandId");
CREATE INDEX "EnterpriseDomainEvent_eventType_occurredAt_idx" ON "EnterpriseDomainEvent"("eventType","occurredAt");
CREATE INDEX "EnterpriseAuditEvent_subjectType_subjectId_occurredAt_idx" ON "EnterpriseAuditEvent"("subjectType","subjectId","occurredAt");
CREATE INDEX "EnterpriseAuditEvent_actorUserId_occurredAt_idx" ON "EnterpriseAuditEvent"("actorUserId","occurredAt");
CREATE INDEX "EnterpriseAuditEvent_correlationId_idx" ON "EnterpriseAuditEvent"("correlationId");
CREATE UNIQUE INDEX "EnterpriseOutboxMessage_domainEventId_topic_key" ON "EnterpriseOutboxMessage"("domainEventId","topic");
CREATE INDEX "EnterpriseOutboxMessage_status_nextAttemptAt_idx" ON "EnterpriseOutboxMessage"("status","nextAttemptAt");
CREATE INDEX "EnterpriseOutboxMessage_organizationId_locationId_createdAt_idx" ON "EnterpriseOutboxMessage"("organizationId","locationId","createdAt");
CREATE UNIQUE INDEX "VehicleCapabilityGrant_organizationId_locationId_userId_capability_key" ON "VehicleCapabilityGrant"("organizationId","locationId","userId","capability");
CREATE UNIQUE INDEX "VehicleCapabilityGrant_org_global_user_capability_key" ON "VehicleCapabilityGrant"("organizationId","userId","capability") WHERE "locationId" IS NULL;
CREATE INDEX "VehicleCapabilityGrant_userId_capability_validFrom_validTo_idx" ON "VehicleCapabilityGrant"("userId","capability","validFrom","validTo");
CREATE UNIQUE INDEX "VehicleOperationsFeatureFlag_organizationId_locationId_code_key" ON "VehicleOperationsFeatureFlag"("organizationId","locationId","code");
CREATE UNIQUE INDEX "VehicleOperationsFeatureFlag_org_global_code_key" ON "VehicleOperationsFeatureFlag"("organizationId","code") WHERE "locationId" IS NULL;
CREATE INDEX "VehicleOperationsFeatureFlag_organizationId_mode_idx" ON "VehicleOperationsFeatureFlag"("organizationId","mode");
CREATE INDEX "VehicleOperationsRolloutEvent_organizationId_createdAt_idx" ON "VehicleOperationsRolloutEvent"("organizationId","createdAt");
CREATE INDEX "VehicleOperationsRolloutEvent_correlationId_idx" ON "VehicleOperationsRolloutEvent"("correlationId");
CREATE UNIQUE INDEX "EnterpriseProjectionCheckpoint_organizationId_locationId_projectionCode_key" ON "EnterpriseProjectionCheckpoint"("organizationId","locationId","projectionCode");
CREATE UNIQUE INDEX "EnterpriseProjectionCheckpoint_org_global_projectionCode_key" ON "EnterpriseProjectionCheckpoint"("organizationId","projectionCode") WHERE "locationId" IS NULL;
CREATE INDEX "EnterpriseProjectionCheckpoint_organizationId_lastFailureAt_idx" ON "EnterpriseProjectionCheckpoint"("organizationId","lastFailureAt");

ALTER TABLE "EnterpriseAggregateVersion" ADD CONSTRAINT "EnterpriseAggregateVersion_version_check" CHECK ("version" >= 0);
ALTER TABLE "EnterpriseCommandLedger" ADD CONSTRAINT "EnterpriseCommandLedger_version_check" CHECK ("expectedVersion" >= 0 AND ("resultingVersion" IS NULL OR "resultingVersion" > "expectedVersion"));
ALTER TABLE "EnterpriseCommandLedger" ADD CONSTRAINT "EnterpriseCommandLedger_required_text_check" CHECK (BTRIM("domain") <> '' AND BTRIM("subjectType") <> '' AND BTRIM("subjectId") <> '' AND BTRIM("commandType") <> '' AND BTRIM("idempotencyKey") <> '' AND BTRIM("requestHash") <> '' AND BTRIM("correlationId") <> '');
ALTER TABLE "EnterpriseOutboxMessage" ADD CONSTRAINT "EnterpriseOutboxMessage_attempt_check" CHECK ("attemptCount" >= 0 AND "maxAttempts" > 0 AND "attemptCount" <= "maxAttempts");
ALTER TABLE "VehicleCapabilityGrant" ADD CONSTRAINT "VehicleCapabilityGrant_validity_check" CHECK ("validTo" IS NULL OR "validTo" >= "validFrom");
ALTER TABLE "VehicleOperationsFeatureFlag" ADD CONSTRAINT "VehicleOperationsFeatureFlag_rollout_check" CHECK ("rolloutPercent" BETWEEN 0 AND 100 AND "version" > 0);
ALTER TABLE "EnterpriseProjectionCheckpoint" ADD CONSTRAINT "EnterpriseProjectionCheckpoint_lag_check" CHECK ("lagSeconds" >= 0);

ALTER TABLE "EnterpriseAggregateVersion" ADD CONSTRAINT "EnterpriseAggregateVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseAggregateVersion" ADD CONSTRAINT "EnterpriseAggregateVersion_location_tenant_fkey" FOREIGN KEY ("locationId","organizationId") REFERENCES "Location"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseCommandLedger" ADD CONSTRAINT "EnterpriseCommandLedger_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseCommandLedger" ADD CONSTRAINT "EnterpriseCommandLedger_location_tenant_fkey" FOREIGN KEY ("locationId","organizationId") REFERENCES "Location"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseCommandLedger" ADD CONSTRAINT "EnterpriseCommandLedger_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseDomainEvent" ADD CONSTRAINT "EnterpriseDomainEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseDomainEvent" ADD CONSTRAINT "EnterpriseDomainEvent_location_tenant_fkey" FOREIGN KEY ("locationId","organizationId") REFERENCES "Location"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseDomainEvent" ADD CONSTRAINT "EnterpriseDomainEvent_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "EnterpriseCommandLedger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseAuditEvent" ADD CONSTRAINT "EnterpriseAuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseAuditEvent" ADD CONSTRAINT "EnterpriseAuditEvent_location_tenant_fkey" FOREIGN KEY ("locationId","organizationId") REFERENCES "Location"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseAuditEvent" ADD CONSTRAINT "EnterpriseAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseAuditEvent" ADD CONSTRAINT "EnterpriseAuditEvent_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "EnterpriseCommandLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EnterpriseOutboxMessage" ADD CONSTRAINT "EnterpriseOutboxMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseOutboxMessage" ADD CONSTRAINT "EnterpriseOutboxMessage_location_tenant_fkey" FOREIGN KEY ("locationId","organizationId") REFERENCES "Location"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseOutboxMessage" ADD CONSTRAINT "EnterpriseOutboxMessage_domainEventId_fkey" FOREIGN KEY ("domainEventId") REFERENCES "EnterpriseDomainEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleCapabilityGrant" ADD CONSTRAINT "VehicleCapabilityGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleCapabilityGrant" ADD CONSTRAINT "VehicleCapabilityGrant_location_tenant_fkey" FOREIGN KEY ("locationId","organizationId") REFERENCES "Location"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleCapabilityGrant" ADD CONSTRAINT "VehicleCapabilityGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleOperationsFeatureFlag" ADD CONSTRAINT "VehicleOperationsFeatureFlag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleOperationsFeatureFlag" ADD CONSTRAINT "VehicleOperationsFeatureFlag_location_tenant_fkey" FOREIGN KEY ("locationId","organizationId") REFERENCES "Location"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleOperationsFeatureFlag" ADD CONSTRAINT "VehicleOperationsFeatureFlag_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleOperationsRolloutEvent" ADD CONSTRAINT "VehicleOperationsRolloutEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleOperationsRolloutEvent" ADD CONSTRAINT "VehicleOperationsRolloutEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnterpriseProjectionCheckpoint" ADD CONSTRAINT "EnterpriseProjectionCheckpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseProjectionCheckpoint" ADD CONSTRAINT "EnterpriseProjectionCheckpoint_location_tenant_fkey" FOREIGN KEY ("locationId","organizationId") REFERENCES "Location"("id","organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "VehicleOperationsFeatureFlag" ("id","organizationId","locationId","code","mode","rolloutPercent","allowedUserIds","version","updatedAt") VALUES
('vo-flag-master','org-time-motor-sales',NULL,'VEHICLE_OPERATIONS_MASTER','OFF',0,'[]'::jsonb,1,CURRENT_TIMESTAMP),
('vo-flag-command','org-time-motor-sales',NULL,'ENTERPRISE_COMMANDS','SHADOW',100,'[]'::jsonb,1,CURRENT_TIMESTAMP),
('vo-flag-registry','org-time-motor-sales',NULL,'VEHICLE_REGISTRY','OFF',0,'[]'::jsonb,1,CURRENT_TIMESTAMP);
