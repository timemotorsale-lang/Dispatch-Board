CREATE TABLE "IntegrationCredentialReference" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "partnerId" TEXT NOT NULL, "systemCode" TEXT NOT NULL,
  "keyId" TEXT NOT NULL, "secretRef" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'SANDBOX_ACTIVE', "scopes" JSONB NOT NULL,
  "allowedOrigins" JSONB NOT NULL, "rateLimit" INTEGER NOT NULL DEFAULT 60, "ownerUserId" TEXT NOT NULL, "createdByUserId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1, "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationCredentialReference_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "IntegrationWebhookSubscription" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "credentialReferenceId" TEXT NOT NULL, "url" TEXT NOT NULL,
  "eventTypes" JSONB NOT NULL, "apiVersion" TEXT NOT NULL, "secretRef" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "allowedOrigins" JSONB NOT NULL,
  "timestampToleranceSec" INTEGER NOT NULL DEFAULT 300, "status" TEXT NOT NULL DEFAULT 'SANDBOX_ACTIVE', "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "IntegrationWebhookSubscription_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "IntegrationWebhookDelivery" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "subscriptionId" TEXT NOT NULL, "deliveryId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL, "apiVersion" TEXT NOT NULL, "origin" TEXT NOT NULL, "bodyHash" TEXT NOT NULL,
  "signatureKeyId" TEXT NOT NULL, "status" TEXT NOT NULL, "rejectionCode" TEXT, "receivedAt" TIMESTAMP(3) NOT NULL,
  "eventTimestamp" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationWebhookDelivery_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "IntegrationPartnerRequest" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "credentialReferenceId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL, "requiredScope" TEXT NOT NULL, "apiVersion" TEXT NOT NULL, "method" TEXT NOT NULL,
  "resource" TEXT NOT NULL, "status" TEXT NOT NULL, "responseHash" TEXT, "correlationId" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL, "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationPartnerRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IntegrationCredentialReference_organizationId_partnerId_keyId_key" ON "IntegrationCredentialReference"("organizationId","partnerId","keyId");
CREATE UNIQUE INDEX "IntegrationCredentialReference_organizationId_idempotencyKey_key" ON "IntegrationCredentialReference"("organizationId","idempotencyKey");
CREATE INDEX "IntegrationCredentialReference_organizationId_status_expiresAt_idx" ON "IntegrationCredentialReference"("organizationId","status","expiresAt");
CREATE INDEX "IntegrationCredentialReference_partnerId_status_idx" ON "IntegrationCredentialReference"("partnerId","status");
CREATE INDEX "IntegrationWebhookSubscription_organizationId_status_updatedAt_idx" ON "IntegrationWebhookSubscription"("organizationId","status","updatedAt");
CREATE UNIQUE INDEX "IntegrationWebhookSubscription_organizationId_idempotencyKey_key" ON "IntegrationWebhookSubscription"("organizationId","idempotencyKey");
CREATE INDEX "IntegrationWebhookSubscription_credentialReferenceId_status_idx" ON "IntegrationWebhookSubscription"("credentialReferenceId","status");
CREATE UNIQUE INDEX "IntegrationWebhookDelivery_organizationId_subscriptionId_deliveryId_key" ON "IntegrationWebhookDelivery"("organizationId","subscriptionId","deliveryId");
CREATE INDEX "IntegrationWebhookDelivery_organizationId_status_receivedAt_idx" ON "IntegrationWebhookDelivery"("organizationId","status","receivedAt");
CREATE INDEX "IntegrationWebhookDelivery_subscriptionId_receivedAt_idx" ON "IntegrationWebhookDelivery"("subscriptionId","receivedAt");
CREATE UNIQUE INDEX "IntegrationPartnerRequest_credentialReferenceId_idempotencyKey_key" ON "IntegrationPartnerRequest"("credentialReferenceId","idempotencyKey");
CREATE INDEX "IntegrationPartnerRequest_organizationId_credentialReferenceId_requestedAt_idx" ON "IntegrationPartnerRequest"("organizationId","credentialReferenceId","requestedAt");
CREATE INDEX "IntegrationPartnerRequest_correlationId_idx" ON "IntegrationPartnerRequest"("correlationId");
ALTER TABLE "IntegrationWebhookDelivery" ADD CONSTRAINT "IntegrationWebhookDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "IntegrationWebhookSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationWebhookSubscription" ADD CONSTRAINT "IntegrationWebhookSubscription_credentialReferenceId_fkey" FOREIGN KEY ("credentialReferenceId") REFERENCES "IntegrationCredentialReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationPartnerRequest" ADD CONSTRAINT "IntegrationPartnerRequest_credentialReferenceId_fkey" FOREIGN KEY ("credentialReferenceId") REFERENCES "IntegrationCredentialReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
