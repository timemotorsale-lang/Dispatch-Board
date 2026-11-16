-- CreateEnum
CREATE TYPE "CollectionAccountType" AS ENUM ('LEASE_TO_OWN', 'BHPH');

-- CreateEnum
CREATE TYPE "CollectionAccountStatus" AS ENUM ('CURRENT', 'GRACE', 'PAST_DUE', 'PROMISE_ACTIVE', 'PLAN_ACTIVE', 'DISABLE_ELIGIBLE', 'STARTER_DISABLED', 'REPO_REVIEW', 'REPO_ASSIGNED', 'REPOSSESSED', 'REDEEMED', 'BANKRUPTCY_FROZEN', 'PAID_OFF', 'CLOSED');

-- CreateEnum
CREATE TYPE "CollectionPaymentFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CollectionLanguage" AS ENUM ('EN', 'ES', 'SO', 'SW');

-- CreateEnum
CREATE TYPE "CollectionBucket" AS ENUM ('CURRENT', 'GRACE_1_5', 'LATE_6_14', 'D15_30', 'D31_60', 'D61_PLUS');

-- CreateEnum
CREATE TYPE "CollectionsImportStatus" AS ENUM ('PREVIEW', 'COMMITTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CollectionContactChannel" AS ENUM ('CALL_OUT', 'CALL_IN', 'TEXT_OUT', 'TEXT_IN', 'EMAIL_OUT', 'EMAIL_IN', 'IN_PERSON', 'LETTER', 'VOICEMAIL');

-- CreateEnum
CREATE TYPE "CollectionContactOutcome" AS ENUM ('NO_ANSWER', 'LEFT_MESSAGE', 'SPOKE_WITH_CUSTOMER', 'WRONG_NUMBER', 'DISCONNECTED', 'PROMISE_MADE', 'PLAN_MADE', 'PAYMENT_REPORTED', 'REFUSED', 'DISPUTE', 'HARDSHIP', 'REQUESTED_NO_CONTACT', 'ATTORNEY_REFERRED', 'BANKRUPTCY_REPORTED', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentPromiseSource" AS ENUM ('MANUAL', 'IMPORTED_FROM_DMS', 'PLAN_INSTALLMENT');

-- CreateEnum
CREATE TYPE "PaymentPromiseStatus" AS ENUM ('OPEN', 'KEPT', 'PARTIALLY_KEPT', 'BROKEN', 'CANCELLED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "PaymentPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'BROKEN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerReportedPaymentMethod" AS ENUM ('ONLINE', 'IN_PERSON', 'PHONE', 'CASH_AT_STORE', 'ZELLE', 'OTHER');

-- CreateEnum
CREATE TYPE "CustomerReportedPaymentStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED_BY_IMPORT', 'NOT_FOUND', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CollectionFlagType" AS ENUM ('BANKRUPTCY', 'ATTORNEY_REPRESENTED', 'CONTACT_RESTRICTED', 'DISPUTE', 'DECEASED', 'SKIP', 'DO_NOT_REPO_REVIEW_HOLD');

-- CreateEnum
CREATE TYPE "CollectionContactScope" AS ENUM ('NO_TEXT', 'NO_CALL', 'NO_EMAIL', 'NO_CONTACT', 'ATTORNEY_ONLY');

-- CreateEnum
CREATE TYPE "CollectionMessageChannel" AS ENUM ('SMS', 'EMAIL', 'VOICE');

-- CreateEnum
CREATE TYPE "CollectionConsentStatus" AS ENUM ('GRANTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CollectionConsentSource" AS ENUM ('CONTRACT', 'VERBAL', 'WRITTEN', 'KEYWORD_START', 'KEYWORD_STOP', 'OWNER_ENTRY');

-- CreateEnum
CREATE TYPE "CollectionTemplateStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "CollectionOutboundStatus" AS ENUM ('QUEUED', 'DRY_RUN', 'SENT', 'DELIVERED', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CollectionInsuranceSource" AS ENUM ('CARD_PHOTO', 'INSURER_DOCUMENT', 'PHONE', 'DMS_IMPORT');

-- CreateEnum
CREATE TYPE "CollectionInsuranceStatus" AS ENUM ('VERIFIED', 'EXPIRING_SOON', 'EXPIRED', 'MISSING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "StarterDisableActionType" AS ENUM ('DISABLE', 'ENABLE');

-- CreateEnum
CREATE TYPE "StarterDisableActionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DONE_IN_PORTAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StarterWarningMethod" AS ENUM ('TEXT', 'CALL', 'DEVICE_BEEP', 'NONE');

-- CreateEnum
CREATE TYPE "RepossessionCaseStatus" AS ENUM ('REVIEW', 'APPROVED', 'ASSIGNED', 'LOCATED', 'RECOVERED', 'IN_STORAGE', 'REDEEMED', 'RETURNED_TO_INVENTORY', 'SENT_TO_AUCTION', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CollectionLetterTemplateKey" AS ENUM ('PRE_REPO_NOTICE', 'POST_REPO_NOTICE', 'OTHER');

-- CreateEnum
CREATE TYPE "CollectionLetterSentMethod" AS ENUM ('FIRST_CLASS', 'CERTIFIED', 'HAND_DELIVERED', 'EMAIL');

-- CreateEnum
CREATE TYPE "CollectionTaskLinkStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterEnum
ALTER TYPE "TaskSourceType" ADD VALUE 'COLLECTIONS';

-- CreateTable
CREATE TABLE "CollectionAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "dealNumber" TEXT,
    "contractDate" DATE,
    "accountType" "CollectionAccountType" NOT NULL DEFAULT 'LEASE_TO_OWN',
    "customerId" TEXT,
    "suggestedCustomerId" TEXT,
    "vehicleId" TEXT,
    "buyerNameRaw" TEXT NOT NULL,
    "vehicleDescriptionRaw" TEXT,
    "stockNumberRaw" TEXT,
    "status" "CollectionAccountStatus" NOT NULL DEFAULT 'CURRENT',
    "bucket" "CollectionBucket" NOT NULL DEFAULT 'CURRENT',
    "daysPastDue" INTEGER NOT NULL DEFAULT 0,
    "amountDueCents" INTEGER NOT NULL DEFAULT 0,
    "totalBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "paymentAmountCents" INTEGER,
    "paymentFrequency" "CollectionPaymentFrequency" NOT NULL DEFAULT 'UNKNOWN',
    "assignedCollectorUserId" TEXT,
    "primaryPhone" TEXT,
    "primaryEmail" TEXT,
    "mailingAddress" TEXT,
    "preferredLanguage" "CollectionLanguage" NOT NULL DEFAULT 'EN',
    "vin" TEXT,
    "gpsProvider" TEXT NOT NULL DEFAULT 'Advantage GPS',
    "gpsDeviceSerial" TEXT,
    "gpsDisclosedInContract" BOOLEAN,
    "consentSource" TEXT NOT NULL DEFAULT 'CONTRACT',
    "consentDate" DATE,
    "nextActionAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "lastImportedAt" TIMESTAMP(3),
    "lastImportRunId" TEXT,
    "missingFromImportAt" TIMESTAMP(3),
    "missingFromImportRunId" TEXT,
    "closedStatus" "CollectionAccountStatus",
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionAccountSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "importRunId" TEXT NOT NULL,
    "asOfDate" DATE NOT NULL,
    "downCents" INTEGER NOT NULL DEFAULT 0,
    "principalCents" INTEGER NOT NULL DEFAULT 0,
    "interestCents" INTEGER NOT NULL DEFAULT 0,
    "otherCents" INTEGER NOT NULL DEFAULT 0,
    "lateCents" INTEGER NOT NULL DEFAULT 0,
    "sideNoteCents" INTEGER NOT NULL DEFAULT 0,
    "creditCents" INTEGER NOT NULL DEFAULT 0,
    "totalBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "amountDueCents" INTEGER NOT NULL DEFAULT 0,
    "paymentAmountCents" INTEGER,
    "paymentDueDate" DATE,
    "daysPastDue" INTEGER NOT NULL DEFAULT 0,
    "paymentsRemaining" INTEGER,
    "promiseDateFromDms" DATE,
    "dmsAccountStatus" TEXT,
    "dmsRepoStatus" TEXT,
    "dmsInsuranceStatus" TEXT,
    "dmsAutopayStatus" TEXT,
    "dmsCollectorName" TEXT,
    "dmsLenderType" TEXT,
    "bucket" "CollectionBucket" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionAccountSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionsImportRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "profileKey" TEXT NOT NULL DEFAULT 'DEALERCENTER_ACTIVE_ACCOUNTS',
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileDocumentId" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "asOfDate" DATE NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "needsReviewCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "missingCount" INTEGER NOT NULL DEFAULT 0,
    "totalBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "previewRows" JSONB,
    "summary" JSONB,
    "errorDetails" JSONB,
    "unknownColumns" JSONB,
    "status" "CollectionsImportStatus" NOT NULL DEFAULT 'PREVIEW',
    "committedByUserId" TEXT,
    "committedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionsImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionContactAttempt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" "CollectionContactChannel" NOT NULL,
    "outcome" "CollectionContactOutcome" NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "contactPoint" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionContactAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPromise" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "promisedAmountCents" INTEGER NOT NULL,
    "promisedDate" DATE NOT NULL,
    "takenByUserId" TEXT,
    "source" "PaymentPromiseSource" NOT NULL DEFAULT 'MANUAL',
    "planId" TEXT,
    "installmentNumber" INTEGER,
    "status" "PaymentPromiseStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "baselineAmountDueCents" INTEGER,
    "baselineDaysPastDue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentPromise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "PaymentPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalCatchUpCents" INTEGER NOT NULL,
    "supersededByPlanId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerReportedPayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "CustomerReportedPaymentMethod" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidDate" DATE NOT NULL,
    "referenceNumber" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "enteredByUserId" TEXT,
    "status" "CustomerReportedPaymentStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "baselineAmountDueCents" INTEGER,
    "baselineDaysPastDue" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerReportedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionFlag" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "CollectionFlagType" NOT NULL,
    "scope" "CollectionContactScope",
    "attorneyName" TEXT,
    "attorneyFirm" TEXT,
    "attorneyPhone" TEXT,
    "attorneyEmail" TEXT,
    "bankruptcyChapter" TEXT,
    "bankruptcyCaseNumber" TEXT,
    "bankruptcyFilingDate" DATE,
    "bankruptcyCourt" TEXT,
    "setByUserId" TEXT,
    "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "setReason" TEXT NOT NULL,
    "clearedByUserId" TEXT,
    "clearedAt" TIMESTAMP(3),
    "clearReason" TEXT,
    "clearDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactConsent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "channel" "CollectionMessageChannel" NOT NULL,
    "address" TEXT NOT NULL,
    "status" "CollectionConsentStatus" NOT NULL,
    "source" "CollectionConsentSource" NOT NULL,
    "evidence" TEXT NOT NULL DEFAULT '',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByUserId" TEXT,

    CONSTRAINT "ContactConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "CollectionMessageChannel" NOT NULL,
    "language" "CollectionLanguage" NOT NULL,
    "version" INTEGER NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "CollectionTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewNote" TEXT,
    "createdByUserId" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "channel" "CollectionMessageChannel" NOT NULL,
    "to" TEXT NOT NULL,
    "templateKey" TEXT,
    "templateId" TEXT,
    "language" "CollectionLanguage" NOT NULL DEFAULT 'EN',
    "languageFallback" BOOLEAN NOT NULL DEFAULT false,
    "subject" TEXT,
    "renderedBody" TEXT NOT NULL,
    "status" "CollectionOutboundStatus" NOT NULL DEFAULT 'QUEUED',
    "blockedReason" TEXT,
    "overrideReason" TEXT,
    "providerMessageId" TEXT,
    "automationRuleKey" TEXT,
    "dedupeKey" TEXT,
    "sentByUserId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT,
    "channel" "CollectionMessageChannel" NOT NULL DEFAULT 'SMS',
    "from" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mediaDocumentIds" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerMessageId" TEXT,
    "keyword" TEXT,
    "readAt" TIMESTAMP(3),
    "readByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "carrier" TEXT,
    "policyNumber" TEXT,
    "effectiveDate" DATE,
    "expirationDate" DATE,
    "lienholderListed" BOOLEAN,
    "proofDocumentId" TEXT,
    "source" "CollectionInsuranceSource" NOT NULL,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "status" "CollectionInsuranceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT NOT NULL DEFAULT '',
    "enteredByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarterDisableAction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "action" "StarterDisableActionType" NOT NULL,
    "status" "StarterDisableActionStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedByUserId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "warningMethod" "StarterWarningMethod",
    "warningSentAt" TIMESTAMP(3),
    "warningMessageId" TEXT,
    "performedInPortalAt" TIMESTAMP(3),
    "performedByUserId" TEXT,
    "deviceSerial" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StarterDisableAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepossessionCase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "vendorId" TEXT,
    "taskId" TEXT,
    "status" "RepossessionCaseStatus" NOT NULL DEFAULT 'REVIEW',
    "openedByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "locatedAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "storageLocation" TEXT,
    "storageFeeCents" INTEGER,
    "repoFeeCents" INTEGER,
    "personalPropertyNotes" TEXT,
    "outcomeAt" TIMESTAMP(3),
    "outcomeNotes" TEXT,
    "inventoryTaskId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepossessionCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionLetter" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "repoCaseId" TEXT,
    "templateKey" "CollectionLetterTemplateKey" NOT NULL,
    "generatedDocumentId" TEXT,
    "isDraftWording" BOOLEAN NOT NULL DEFAULT true,
    "sentMethod" "CollectionLetterSentMethod",
    "certifiedTrackingNumber" TEXT,
    "sentAt" TIMESTAMP(3),
    "generatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionAccountEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT,
    "type" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "userId" TEXT,
    "reason" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionAccountEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionsSetting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "values" JSONB NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionsSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionsSettingHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "values" JSONB NOT NULL,
    "changedByUserId" TEXT,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionsSettingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionsDailyMetric" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "metricDate" DATE NOT NULL,
    "importRunId" TEXT,
    "totalAccounts" INTEGER NOT NULL DEFAULT 0,
    "totalBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "pastDueAccounts" INTEGER NOT NULL DEFAULT 0,
    "pastDueAmountCents" INTEGER NOT NULL DEFAULT 0,
    "bucketCounts" JSONB NOT NULL,
    "bucketCents" JSONB NOT NULL,
    "promisesMade" INTEGER NOT NULL DEFAULT 0,
    "promisesKept" INTEGER NOT NULL DEFAULT 0,
    "promisesPartiallyKept" INTEGER NOT NULL DEFAULT 0,
    "promisesBroken" INTEGER NOT NULL DEFAULT 0,
    "disableCount" INTEGER NOT NULL DEFAULT 0,
    "repoCounts" JSONB NOT NULL,
    "insuranceCounts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionsDailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionTaskLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT,
    "reason" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "openKey" TEXT,
    "status" "CollectionTaskLinkStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionTaskLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionAccount_organizationId_status_idx" ON "CollectionAccount"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CollectionAccount_organizationId_daysPastDue_idx" ON "CollectionAccount"("organizationId", "daysPastDue");

-- CreateIndex
CREATE INDEX "CollectionAccount_organizationId_nextActionAt_idx" ON "CollectionAccount"("organizationId", "nextActionAt");

-- CreateIndex
CREATE INDEX "CollectionAccount_organizationId_bucket_idx" ON "CollectionAccount"("organizationId", "bucket");

-- CreateIndex
CREATE INDEX "CollectionAccount_organizationId_dealNumber_idx" ON "CollectionAccount"("organizationId", "dealNumber");

-- CreateIndex
CREATE INDEX "CollectionAccount_organizationId_assignedCollectorUserId_idx" ON "CollectionAccount"("organizationId", "assignedCollectorUserId");

-- CreateIndex
CREATE INDEX "CollectionAccount_organizationId_primaryPhone_idx" ON "CollectionAccount"("organizationId", "primaryPhone");

-- CreateIndex
CREATE INDEX "CollectionAccount_customerId_idx" ON "CollectionAccount"("customerId");

-- CreateIndex
CREATE INDEX "CollectionAccount_vehicleId_idx" ON "CollectionAccount"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionAccount_organizationId_externalAccountId_key" ON "CollectionAccount"("organizationId", "externalAccountId");

-- CreateIndex
CREATE INDEX "CollectionAccountSnapshot_accountId_asOfDate_idx" ON "CollectionAccountSnapshot"("accountId", "asOfDate");

-- CreateIndex
CREATE INDEX "CollectionAccountSnapshot_organizationId_asOfDate_idx" ON "CollectionAccountSnapshot"("organizationId", "asOfDate");

-- CreateIndex
CREATE INDEX "CollectionAccountSnapshot_importRunId_idx" ON "CollectionAccountSnapshot"("importRunId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionAccountSnapshot_accountId_importRunId_key" ON "CollectionAccountSnapshot"("accountId", "importRunId");

-- CreateIndex
CREATE INDEX "CollectionsImportRun_organizationId_status_createdAt_idx" ON "CollectionsImportRun"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionsImportRun_organizationId_fileHash_idx" ON "CollectionsImportRun"("organizationId", "fileHash");

-- CreateIndex
CREATE INDEX "CollectionsImportRun_organizationId_asOfDate_idx" ON "CollectionsImportRun"("organizationId", "asOfDate");

-- CreateIndex
CREATE INDEX "CollectionContactAttempt_accountId_occurredAt_idx" ON "CollectionContactAttempt"("accountId", "occurredAt");

-- CreateIndex
CREATE INDEX "CollectionContactAttempt_organizationId_occurredAt_idx" ON "CollectionContactAttempt"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "CollectionContactAttempt_organizationId_userId_occurredAt_idx" ON "CollectionContactAttempt"("organizationId", "userId", "occurredAt");

-- CreateIndex
CREATE INDEX "PaymentPromise_accountId_status_idx" ON "PaymentPromise"("accountId", "status");

-- CreateIndex
CREATE INDEX "PaymentPromise_organizationId_status_promisedDate_idx" ON "PaymentPromise"("organizationId", "status", "promisedDate");

-- CreateIndex
CREATE INDEX "PaymentPromise_planId_idx" ON "PaymentPromise"("planId");

-- CreateIndex
CREATE INDEX "PaymentPlan_accountId_status_idx" ON "PaymentPlan"("accountId", "status");

-- CreateIndex
CREATE INDEX "PaymentPlan_organizationId_status_idx" ON "PaymentPlan"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CustomerReportedPayment_accountId_status_idx" ON "CustomerReportedPayment"("accountId", "status");

-- CreateIndex
CREATE INDEX "CustomerReportedPayment_organizationId_status_idx" ON "CustomerReportedPayment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CollectionFlag_accountId_type_clearedAt_idx" ON "CollectionFlag"("accountId", "type", "clearedAt");

-- CreateIndex
CREATE INDEX "CollectionFlag_organizationId_type_clearedAt_idx" ON "CollectionFlag"("organizationId", "type", "clearedAt");

-- CreateIndex
CREATE INDEX "ContactConsent_accountId_channel_address_recordedAt_idx" ON "ContactConsent"("accountId", "channel", "address", "recordedAt");

-- CreateIndex
CREATE INDEX "ContactConsent_organizationId_address_idx" ON "ContactConsent"("organizationId", "address");

-- CreateIndex
CREATE INDEX "MessageTemplate_organizationId_key_channel_language_idx" ON "MessageTemplate"("organizationId", "key", "channel", "language");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_organizationId_key_channel_language_version_key" ON "MessageTemplate"("organizationId", "key", "channel", "language", "version");

-- CreateIndex
CREATE UNIQUE INDEX "OutboundMessage_providerMessageId_key" ON "OutboundMessage"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboundMessage_dedupeKey_key" ON "OutboundMessage"("dedupeKey");

-- CreateIndex
CREATE INDEX "OutboundMessage_accountId_createdAt_idx" ON "OutboundMessage"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundMessage_organizationId_status_scheduledFor_idx" ON "OutboundMessage"("organizationId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "OutboundMessage_organizationId_automationRuleKey_createdAt_idx" ON "OutboundMessage"("organizationId", "automationRuleKey", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InboundMessage_providerMessageId_key" ON "InboundMessage"("providerMessageId");

-- CreateIndex
CREATE INDEX "InboundMessage_organizationId_receivedAt_idx" ON "InboundMessage"("organizationId", "receivedAt");

-- CreateIndex
CREATE INDEX "InboundMessage_organizationId_from_idx" ON "InboundMessage"("organizationId", "from");

-- CreateIndex
CREATE INDEX "InboundMessage_accountId_receivedAt_idx" ON "InboundMessage"("accountId", "receivedAt");

-- CreateIndex
CREATE INDEX "InboundMessage_organizationId_readAt_idx" ON "InboundMessage"("organizationId", "readAt");

-- CreateIndex
CREATE INDEX "InsuranceRecord_accountId_createdAt_idx" ON "InsuranceRecord"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "InsuranceRecord_organizationId_status_idx" ON "InsuranceRecord"("organizationId", "status");

-- CreateIndex
CREATE INDEX "StarterDisableAction_accountId_createdAt_idx" ON "StarterDisableAction"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "StarterDisableAction_organizationId_status_idx" ON "StarterDisableAction"("organizationId", "status");

-- CreateIndex
CREATE INDEX "RepossessionCase_accountId_status_idx" ON "RepossessionCase"("accountId", "status");

-- CreateIndex
CREATE INDEX "RepossessionCase_organizationId_status_idx" ON "RepossessionCase"("organizationId", "status");

-- CreateIndex
CREATE INDEX "RepossessionCase_vendorId_idx" ON "RepossessionCase"("vendorId");

-- CreateIndex
CREATE INDEX "RepossessionCase_taskId_idx" ON "RepossessionCase"("taskId");

-- CreateIndex
CREATE INDEX "CollectionLetter_accountId_createdAt_idx" ON "CollectionLetter"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionLetter_repoCaseId_idx" ON "CollectionLetter"("repoCaseId");

-- CreateIndex
CREATE INDEX "CollectionAccountEvent_accountId_occurredAt_idx" ON "CollectionAccountEvent"("accountId", "occurredAt");

-- CreateIndex
CREATE INDEX "CollectionAccountEvent_organizationId_type_occurredAt_idx" ON "CollectionAccountEvent"("organizationId", "type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionsSetting_organizationId_key" ON "CollectionsSetting"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionsSettingHistory_organizationId_version_key" ON "CollectionsSettingHistory"("organizationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionsDailyMetric_organizationId_metricDate_key" ON "CollectionsDailyMetric"("organizationId", "metricDate");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionTaskLink_taskId_key" ON "CollectionTaskLink"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionTaskLink_openKey_key" ON "CollectionTaskLink"("openKey");

-- CreateIndex
CREATE INDEX "CollectionTaskLink_organizationId_status_reason_idx" ON "CollectionTaskLink"("organizationId", "status", "reason");

-- CreateIndex
CREATE INDEX "CollectionTaskLink_accountId_status_idx" ON "CollectionTaskLink"("accountId", "status");

-- AddForeignKey
ALTER TABLE "CollectionAccount" ADD CONSTRAINT "CollectionAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAccount" ADD CONSTRAINT "CollectionAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAccount" ADD CONSTRAINT "CollectionAccount_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAccountSnapshot" ADD CONSTRAINT "CollectionAccountSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAccountSnapshot" ADD CONSTRAINT "CollectionAccountSnapshot_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "CollectionsImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionsImportRun" ADD CONSTRAINT "CollectionsImportRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionContactAttempt" ADD CONSTRAINT "CollectionContactAttempt_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPromise" ADD CONSTRAINT "PaymentPromise_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPromise" ADD CONSTRAINT "PaymentPromise_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PaymentPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReportedPayment" ADD CONSTRAINT "CustomerReportedPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionFlag" ADD CONSTRAINT "CollectionFlag_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactConsent" ADD CONSTRAINT "ContactConsent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundMessage" ADD CONSTRAINT "InboundMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundMessage" ADD CONSTRAINT "InboundMessage_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceRecord" ADD CONSTRAINT "InsuranceRecord_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarterDisableAction" ADD CONSTRAINT "StarterDisableAction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepossessionCase" ADD CONSTRAINT "RepossessionCase_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepossessionCase" ADD CONSTRAINT "RepossessionCase_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepossessionCase" ADD CONSTRAINT "RepossessionCase_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionLetter" ADD CONSTRAINT "CollectionLetter_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionLetter" ADD CONSTRAINT "CollectionLetter_repoCaseId_fkey" FOREIGN KEY ("repoCaseId") REFERENCES "RepossessionCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAccountEvent" ADD CONSTRAINT "CollectionAccountEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionsSetting" ADD CONSTRAINT "CollectionsSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionsDailyMetric" ADD CONSTRAINT "CollectionsDailyMetric_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTaskLink" ADD CONSTRAINT "CollectionTaskLink_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CollectionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTaskLink" ADD CONSTRAINT "CollectionTaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

