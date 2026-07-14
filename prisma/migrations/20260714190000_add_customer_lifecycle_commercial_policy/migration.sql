-- Wave 4: customer lifecycle, warranty, commercial handoffs, portal, and policy administration.
CREATE TABLE "CustomerServicePromise" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL, "customerId" TEXT, "locationId" TEXT NOT NULL,
  "arrivalWindowStart" TIMESTAMP(3), "arrivalWindowEnd" TIMESTAMP(3), "completionWindowStart" TIMESTAMP(3) NOT NULL, "completionWindowEnd" TIMESTAMP(3) NOT NULL,
  "transportMode" TEXT NOT NULL, "transportStatus" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "breachReason" TEXT, "recoveryAction" TEXT,
  "ownerUserId" TEXT NOT NULL, "createdByUserId" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1, "effectiveAt" TIMESTAMP(3) NOT NULL, "fulfilledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerServicePromise_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomerServicePromise_repairOrderId_version_key" ON "CustomerServicePromise"("repairOrderId", "version");
CREATE INDEX "CustomerServicePromise_organizationId_status_completionWindowEnd_idx" ON "CustomerServicePromise"("organizationId", "status", "completionWindowEnd");
CREATE INDEX "CustomerServicePromise_customerId_effectiveAt_idx" ON "CustomerServicePromise"("customerId", "effectiveAt");

CREATE TABLE "CustomerCommunicationPreference" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "customerId" TEXT NOT NULL, "channel" TEXT NOT NULL, "purpose" TEXT NOT NULL, "status" TEXT NOT NULL,
  "source" TEXT NOT NULL, "sourceReference" TEXT, "quietStartLocal" TEXT, "quietEndLocal" TEXT, "timezone" TEXT NOT NULL, "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3), "recordedByUserId" TEXT NOT NULL, "reason" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerCommunicationPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomerCommunicationPreference_customerId_channel_purpose_version_key" ON "CustomerCommunicationPreference"("customerId", "channel", "purpose", "version");
CREATE INDEX "CustomerCommunicationPreference_org_customer_channel_purpose_effective_idx" ON "CustomerCommunicationPreference"("organizationId", "customerId", "channel", "purpose", "effectiveFrom");

CREATE TABLE "CustomerEstimateApprovalRequest" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL, "customerId" TEXT NOT NULL, "estimateVersionId" TEXT NOT NULL,
  "estimateVersionNumber" INTEGER NOT NULL, "tokenHashSha256" TEXT NOT NULL, "channel" TEXT NOT NULL, "destinationMasked" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "deliveredAt" TIMESTAMP(3), "deliveryEvidence" JSONB NOT NULL, "failureEvidence" JSONB NOT NULL, "viewedAt" TIMESTAMP(3), "decidedAt" TIMESTAMP(3),
  "approvedLineKeys" JSONB NOT NULL, "declinedLineKeys" JSONB NOT NULL, "decisionName" TEXT, "decisionEvidence" JSONB NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdByUserId" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerEstimateApprovalRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomerEstimateApprovalRequest_tokenHashSha256_key" ON "CustomerEstimateApprovalRequest"("tokenHashSha256");
CREATE INDEX "CustomerEstimateApprovalRequest_org_repair_status_idx" ON "CustomerEstimateApprovalRequest"("organizationId", "repairOrderId", "status");
CREATE INDEX "CustomerEstimateApprovalRequest_customerId_expiresAt_idx" ON "CustomerEstimateApprovalRequest"("customerId", "expiresAt");
CREATE INDEX "CustomerEstimateApprovalRequest_estimateVersionId_status_idx" ON "CustomerEstimateApprovalRequest"("estimateVersionId", "status");

CREATE TABLE "CustomerServiceStatusEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL, "customerId" TEXT, "code" TEXT NOT NULL, "headline" TEXT NOT NULL,
  "customerMessage" TEXT NOT NULL, "promiseSummary" TEXT, "delaySummary" TEXT, "actionNeeded" TEXT, "contactName" TEXT, "contactMethod" TEXT,
  "sourceType" TEXT NOT NULL, "sourceId" TEXT NOT NULL, "publishedByUserId" TEXT NOT NULL, "publishedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerServiceStatusEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CustomerServiceStatusEvent_org_repair_published_idx" ON "CustomerServiceStatusEvent"("organizationId", "repairOrderId", "publishedAt");
CREATE INDEX "CustomerServiceStatusEvent_customerId_publishedAt_idx" ON "CustomerServiceStatusEvent"("customerId", "publishedAt");

CREATE TABLE "VehicleWarrantyCoverage" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL, "providerCode" TEXT NOT NULL, "contractReference" TEXT NOT NULL,
  "coverageType" TEXT NOT NULL, "coveredComponents" JSONB NOT NULL, "exclusions" JSONB NOT NULL, "deductibleCents" INTEGER NOT NULL, "mileageLimit" INTEGER,
  "effectiveFrom" TIMESTAMP(3) NOT NULL, "effectiveTo" TIMESTAMP(3), "status" TEXT NOT NULL DEFAULT 'ACTIVE', "evidenceObjectIds" JSONB NOT NULL,
  "createdByUserId" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleWarrantyCoverage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VehicleWarrantyCoverage_org_provider_contract_version_key" ON "VehicleWarrantyCoverage"("organizationId", "providerCode", "contractReference", "version");
CREATE INDEX "VehicleWarrantyCoverage_vehicleId_status_effectiveTo_idx" ON "VehicleWarrantyCoverage"("vehicleId", "status", "effectiveTo");

CREATE TABLE "VehicleWarrantyClaim" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL, "repairOrderId" TEXT NOT NULL, "coverageId" TEXT NOT NULL,
  "claimNumber" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT', "eligibilitySnapshot" JSONB NOT NULL, "authorizationReference" TEXT, "authorizedAt" TIMESTAMP(3),
  "laborLineKeys" JSONB NOT NULL, "partLineKeys" JSONB NOT NULL, "evidenceObjectIds" JSONB NOT NULL, "submittedAmountCents" INTEGER NOT NULL,
  "approvedAmountCents" INTEGER, "paidAmountCents" INTEGER, "recoveredAmountCents" INTEGER, "decisionReason" TEXT, "submittedAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3), "paidAt" TIMESTAMP(3), "createdByUserId" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleWarrantyClaim_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VehicleWarrantyClaim_organizationId_claimNumber_key" ON "VehicleWarrantyClaim"("organizationId", "claimNumber");
CREATE INDEX "VehicleWarrantyClaim_repairOrderId_status_idx" ON "VehicleWarrantyClaim"("repairOrderId", "status");
CREATE INDEX "VehicleWarrantyClaim_coverageId_status_idx" ON "VehicleWarrantyClaim"("coverageId", "status");

CREATE TABLE "ServiceInvoiceReconciliation" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "invoicePackageId" TEXT NOT NULL, "externalSystemCode" TEXT NOT NULL, "externalReference" TEXT NOT NULL,
  "returnedSubtotalCents" INTEGER NOT NULL, "returnedTaxCents" INTEGER NOT NULL, "returnedTotalCents" INTEGER NOT NULL, "expectedTotalCents" INTEGER NOT NULL,
  "discrepancyCents" INTEGER NOT NULL, "discrepancyCodes" JSONB NOT NULL, "status" TEXT NOT NULL, "reconciledByUserId" TEXT NOT NULL,
  "reconciledAt" TIMESTAMP(3) NOT NULL, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceInvoiceReconciliation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServiceInvoiceReconciliation_invoice_system_reference_key" ON "ServiceInvoiceReconciliation"("invoicePackageId", "externalSystemCode", "externalReference");
CREATE INDEX "ServiceInvoiceReconciliation_org_status_reconciled_idx" ON "ServiceInvoiceReconciliation"("organizationId", "status", "reconciledAt");

CREATE TABLE "VehicleCommercialHandoff" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL, "inventoryUnitId" TEXT, "customerId" TEXT, "handoffType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN', "agreedPriceReference" TEXT, "agreedPriceCents" INTEGER, "readinessSnapshot" JSONB NOT NULL,
  "dependencySnapshot" JSONB NOT NULL, "evidenceObjectIds" JSONB NOT NULL, "externalSystemCode" TEXT, "externalReference" TEXT, "ownerUserId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL, "completedAt" TIMESTAMP(3), "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleCommercialHandoff_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VehicleCommercialHandoff_org_vehicle_type_version_key" ON "VehicleCommercialHandoff"("organizationId", "vehicleId", "handoffType", "version");
CREATE INDEX "VehicleCommercialHandoff_org_status_type_idx" ON "VehicleCommercialHandoff"("organizationId", "status", "handoffType");
CREATE INDEX "VehicleCommercialHandoff_inventoryUnitId_status_idx" ON "VehicleCommercialHandoff"("inventoryUnitId", "status");

CREATE TABLE "VehiclePortalGrant" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "subjectType" TEXT NOT NULL, "customerId" TEXT, "partnerReference" TEXT, "vehicleId" TEXT NOT NULL,
  "tokenHashSha256" TEXT NOT NULL, "scopes" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3), "revokedByUserId" TEXT, "createdByUserId" TEXT NOT NULL, "lastAccessedAt" TIMESTAMP(3), "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehiclePortalGrant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VehiclePortalGrant_tokenHashSha256_key" ON "VehiclePortalGrant"("tokenHashSha256");
CREATE INDEX "VehiclePortalGrant_org_status_expires_idx" ON "VehiclePortalGrant"("organizationId", "status", "expiresAt");
CREATE INDEX "VehiclePortalGrant_customer_vehicle_status_idx" ON "VehiclePortalGrant"("customerId", "vehicleId", "status");

CREATE TABLE "VehiclePortalAccessEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "portalGrantId" TEXT NOT NULL, "action" TEXT NOT NULL, "allowed" BOOLEAN NOT NULL,
  "scope" TEXT, "requestHash" TEXT NOT NULL, "reasonCode" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehiclePortalAccessEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VehiclePortalAccessEvent_portalGrantId_occurredAt_idx" ON "VehiclePortalAccessEvent"("portalGrantId", "occurredAt");
CREATE INDEX "VehiclePortalAccessEvent_organizationId_occurredAt_idx" ON "VehiclePortalAccessEvent"("organizationId", "occurredAt");

CREATE TABLE "VehiclePolicyVersion" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "policyCode" TEXT NOT NULL, "domain" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', "configuration" JSONB NOT NULL, "simulationSnapshot" JSONB NOT NULL, "pilotScope" JSONB NOT NULL,
  "outcomeSnapshot" JSONB NOT NULL, "effectiveFrom" TIMESTAMP(3), "effectiveTo" TIMESTAMP(3), "supersedesId" TEXT, "rollbackTargetId" TEXT,
  "createdByUserId" TEXT NOT NULL, "approvedByUserId" TEXT, "approvedAt" TIMESTAMP(3), "activatedByUserId" TEXT, "activatedAt" TIMESTAMP(3),
  "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehiclePolicyVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VehiclePolicyVersion_organizationId_policyCode_version_key" ON "VehiclePolicyVersion"("organizationId", "policyCode", "version");
CREATE INDEX "VehiclePolicyVersion_organizationId_domain_status_idx" ON "VehiclePolicyVersion"("organizationId", "domain", "status");

CREATE TABLE "VehiclePolicyEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "policyVersionId" TEXT NOT NULL, "actorUserId" TEXT NOT NULL, "eventType" TEXT NOT NULL,
  "reason" TEXT NOT NULL, "snapshot" JSONB NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehiclePolicyEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VehiclePolicyEvent_policyVersionId_occurredAt_idx" ON "VehiclePolicyEvent"("policyVersionId", "occurredAt");
CREATE INDEX "VehiclePolicyEvent_organizationId_occurredAt_idx" ON "VehiclePolicyEvent"("organizationId", "occurredAt");

INSERT INTO "VehicleOperationsFeatureFlag" ("id", "organizationId", "locationId", "code", "mode", "rolloutPercent", "allowedUserIds", "version", "createdAt", "updatedAt")
SELECT 'vo-flag-customer-lifecycle-' || "id", "id", NULL, 'CUSTOMER_LIFECYCLE', 'OFF', 0, '[]'::jsonb, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Organization" ON CONFLICT DO NOTHING;
