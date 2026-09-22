CREATE TABLE "DocumentLibraryDocument" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT,
  "ownerType" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "ownerLabel" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "sensitivity" TEXT NOT NULL DEFAULT 'INTERNAL',
  "source" TEXT NOT NULL DEFAULT 'MANUAL_UPLOAD',
  "retentionCategory" TEXT NOT NULL,
  "legalHold" BOOLEAN NOT NULL DEFAULT false,
  "storageProvider" TEXT NOT NULL,
  "storageReference" TEXT NOT NULL,
  "storageVersion" INTEGER NOT NULL DEFAULT 1,
  "currentVersionId" TEXT,
  "checksumSha256" TEXT,
  "sizeBytes" INTEGER,
  "contentType" TEXT,
  "classificationSnapshot" JSONB,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentLibraryDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentLibraryObjectVersion" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "storageProvider" TEXT NOT NULL,
  "storageReference" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT,
  "sizeBytes" INTEGER,
  "checksumSha256" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DocumentLibraryObjectVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentLibraryPacket" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT,
  "ownerType" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "ownerLabel" TEXT NOT NULL,
  "packetType" TEXT NOT NULL,
  "workflow" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'MISSING',
  "requirementTemplateKey" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentLibraryPacket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentLibraryPacketRequirement" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "packetId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'MISSING',
  "waivedByUserId" TEXT,
  "waiverReason" TEXT,
  "waivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentLibraryPacketRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentLibraryPacketDocument" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "packetId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "relationship" TEXT NOT NULL DEFAULT 'REQUIRED',
  "linkedByUserId" TEXT,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,

  CONSTRAINT "DocumentLibraryPacketDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentLibraryProviderReference" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "family" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "health" TEXT NOT NULL DEFAULT 'READY_REVIEW',
  "readOnly" BOOLEAN NOT NULL DEFAULT true,
  "url" TEXT,
  "payload" JSONB,
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentLibraryProviderReference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentLibraryPacketTemplate" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "workflow" TEXT NOT NULL,
  "packetType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "requirements" JSONB NOT NULL,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentLibraryPacketTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentLibraryAuditEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT,
  "documentId" TEXT,
  "packetId" TEXT,
  "actorUserId" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "priorValue" JSONB,
  "newValue" JSONB,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DocumentLibraryAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentLibraryReleaseGate" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "gateKey" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "checklist" JSONB NOT NULL,
  "evidence" JSONB NOT NULL,
  "evaluatedByUserId" TEXT,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentLibraryReleaseGate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentLibraryDocument_organizationId_ownerType_ownerId_idx" ON "DocumentLibraryDocument"("organizationId", "ownerType", "ownerId");
CREATE INDEX "DocumentLibraryDocument_organizationId_documentType_status_idx" ON "DocumentLibraryDocument"("organizationId", "documentType", "status");
CREATE INDEX "DocumentLibraryDocument_organizationId_legalHold_status_idx" ON "DocumentLibraryDocument"("organizationId", "legalHold", "status");
CREATE INDEX "DocumentLibraryDocument_organizationId_updatedAt_idx" ON "DocumentLibraryDocument"("organizationId", "updatedAt");
CREATE INDEX "DocumentLibraryDocument_storageProvider_storageReference_idx" ON "DocumentLibraryDocument"("storageProvider", "storageReference");

CREATE UNIQUE INDEX "DocumentLibraryObjectVersion_documentId_version_key" ON "DocumentLibraryObjectVersion"("documentId", "version");
CREATE INDEX "DocumentLibraryObjectVersion_organizationId_documentId_createdAt_idx" ON "DocumentLibraryObjectVersion"("organizationId", "documentId", "createdAt");
CREATE INDEX "DocumentLibraryObjectVersion_storageProvider_storageReference_idx" ON "DocumentLibraryObjectVersion"("storageProvider", "storageReference");

CREATE INDEX "DocumentLibraryPacket_organizationId_ownerType_ownerId_idx" ON "DocumentLibraryPacket"("organizationId", "ownerType", "ownerId");
CREATE INDEX "DocumentLibraryPacket_organizationId_workflow_status_idx" ON "DocumentLibraryPacket"("organizationId", "workflow", "status");
CREATE INDEX "DocumentLibraryPacket_organizationId_updatedAt_idx" ON "DocumentLibraryPacket"("organizationId", "updatedAt");

CREATE INDEX "DocumentLibraryPacketRequirement_organizationId_packetId_status_idx" ON "DocumentLibraryPacketRequirement"("organizationId", "packetId", "status");
CREATE INDEX "DocumentLibraryPacketRequirement_organizationId_documentType_idx" ON "DocumentLibraryPacketRequirement"("organizationId", "documentType");

CREATE UNIQUE INDEX "DocumentLibraryPacketDocument_packetId_documentId_key" ON "DocumentLibraryPacketDocument"("packetId", "documentId");
CREATE INDEX "DocumentLibraryPacketDocument_organizationId_documentId_idx" ON "DocumentLibraryPacketDocument"("organizationId", "documentId");
CREATE INDEX "DocumentLibraryPacketDocument_organizationId_packetId_linkedAt_idx" ON "DocumentLibraryPacketDocument"("organizationId", "packetId", "linkedAt");

CREATE UNIQUE INDEX "DocumentLibraryProviderReference_organizationId_provider_externalId_key" ON "DocumentLibraryProviderReference"("organizationId", "provider", "externalId");
CREATE INDEX "DocumentLibraryProviderReference_organizationId_documentId_idx" ON "DocumentLibraryProviderReference"("organizationId", "documentId");
CREATE INDEX "DocumentLibraryProviderReference_organizationId_family_health_idx" ON "DocumentLibraryProviderReference"("organizationId", "family", "health");

CREATE UNIQUE INDEX "DocumentLibraryPacketTemplate_organizationId_templateKey_key" ON "DocumentLibraryPacketTemplate"("organizationId", "templateKey");
CREATE INDEX "DocumentLibraryPacketTemplate_organizationId_workflow_status_idx" ON "DocumentLibraryPacketTemplate"("organizationId", "workflow", "status");

CREATE UNIQUE INDEX "DocumentLibraryAuditEvent_organizationId_action_idempotencyKey_key" ON "DocumentLibraryAuditEvent"("organizationId", "action", "idempotencyKey");
CREATE INDEX "DocumentLibraryAuditEvent_organizationId_subjectType_subjectId_occurredAt_idx" ON "DocumentLibraryAuditEvent"("organizationId", "subjectType", "subjectId", "occurredAt");
CREATE INDEX "DocumentLibraryAuditEvent_organizationId_documentId_occurredAt_idx" ON "DocumentLibraryAuditEvent"("organizationId", "documentId", "occurredAt");
CREATE INDEX "DocumentLibraryAuditEvent_organizationId_packetId_occurredAt_idx" ON "DocumentLibraryAuditEvent"("organizationId", "packetId", "occurredAt");

CREATE UNIQUE INDEX "DocumentLibraryReleaseGate_organizationId_gateKey_key" ON "DocumentLibraryReleaseGate"("organizationId", "gateKey");
CREATE INDEX "DocumentLibraryReleaseGate_organizationId_status_evaluatedAt_idx" ON "DocumentLibraryReleaseGate"("organizationId", "status", "evaluatedAt");

ALTER TABLE "DocumentLibraryObjectVersion" ADD CONSTRAINT "DocumentLibraryObjectVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentLibraryDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentLibraryPacketRequirement" ADD CONSTRAINT "DocumentLibraryPacketRequirement_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "DocumentLibraryPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentLibraryPacketDocument" ADD CONSTRAINT "DocumentLibraryPacketDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentLibraryDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentLibraryPacketDocument" ADD CONSTRAINT "DocumentLibraryPacketDocument_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "DocumentLibraryPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentLibraryProviderReference" ADD CONSTRAINT "DocumentLibraryProviderReference_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentLibraryDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentLibraryAuditEvent" ADD CONSTRAINT "DocumentLibraryAuditEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentLibraryDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentLibraryAuditEvent" ADD CONSTRAINT "DocumentLibraryAuditEvent_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "DocumentLibraryPacket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
