-- CreateEnum
CREATE TYPE "SchedulerSkipReasonCode" AS ENUM (
    'NON_BUSINESS_DAY',
    'BEFORE_GENERATION_TIME',
    'ALREADY_GENERATED',
    'CONFIGURATION_MISSING',
    'CONFIGURATION_INVALID'
);

-- AlterTable
ALTER TABLE "SchedulerAttempt"
ADD COLUMN "skipReasonCode" "SchedulerSkipReasonCode";
