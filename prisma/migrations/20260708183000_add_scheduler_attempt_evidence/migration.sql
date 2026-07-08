-- CreateEnum
CREATE TYPE "SchedulerAttemptState" AS ENUM (
    'RECEIVED',
    'UNAUTHORIZED',
    'STARTED',
    'SKIPPED',
    'SUCCEEDED',
    'FAILED'
);

-- CreateEnum
CREATE TYPE "SchedulerAuthorizationOutcome" AS ENUM (
    'PENDING',
    'AUTHORIZED',
    'UNAUTHORIZED',
    'SYSTEM_MISCONFIGURED'
);

-- CreateEnum
CREATE TYPE "SchedulerTriggerSource" AS ENUM (
    'PLATFORM_CRON',
    'EXTERNAL_SCHEDULER',
    'MANUAL_HTTP_TEST',
    'UNKNOWN'
);

-- CreateTable
CREATE TABLE "SchedulerAttempt" (
    "id" TEXT NOT NULL,
    "boardDate" DATE NOT NULL,
    "triggerType" "GenerationTriggerType" NOT NULL DEFAULT 'SCHEDULED',
    "triggerSource" "SchedulerTriggerSource" NOT NULL DEFAULT 'UNKNOWN',
    "routePath" TEXT NOT NULL,
    "requestMethod" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "attemptState" "SchedulerAttemptState" NOT NULL DEFAULT 'RECEIVED',
    "authorizationOutcome" "SchedulerAuthorizationOutcome" NOT NULL DEFAULT 'PENDING',
    "generationRunId" TEXT,
    "managerMessage" TEXT NOT NULL,
    "unauthorizedReasonCode" TEXT,
    "failureCode" TEXT,
    "safeErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulerAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchedulerAttempt_boardDate_receivedAt_idx" ON "SchedulerAttempt"("boardDate", "receivedAt");

-- CreateIndex
CREATE INDEX "SchedulerAttempt_attemptState_receivedAt_idx" ON "SchedulerAttempt"("attemptState", "receivedAt");

-- CreateIndex
CREATE INDEX "SchedulerAttempt_authorizationOutcome_receivedAt_idx" ON "SchedulerAttempt"("authorizationOutcome", "receivedAt");

-- CreateIndex
CREATE INDEX "SchedulerAttempt_generationRunId_idx" ON "SchedulerAttempt"("generationRunId");
