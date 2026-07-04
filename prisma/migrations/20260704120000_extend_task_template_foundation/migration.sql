-- CreateEnum
CREATE TYPE "TaskTemplatePriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

-- AlterTable
ALTER TABLE "TaskTemplate"
ADD COLUMN "approvalRules" JSONB NOT NULL DEFAULT '{"mode":"none","readyForReviewRequired":false}',
ADD COLUMN "checklistItems" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "completionCriteria" JSONB NOT NULL DEFAULT '{"mode":"manual","requiredChecklistKeys":[],"requiredFieldKeys":[]}',
ADD COLUMN "defaultStatusRules" JSONB NOT NULL DEFAULT '{"allowedStatuses":["NOT_STARTED","IN_PROGRESS","BLOCKED","WAITING_ON_PARTS","WAITING_ON_APPROVAL","READY_FOR_REVIEW","COMPLETED"],"blockedReasonRequired":true,"waitingReasonRequiredStatuses":[]}',
ADD COLUMN "intelligenceSignalType" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN "priority" "TaskTemplatePriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "requiredUpdateFields" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "taskCardDisplayHints" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "templateCategory" TEXT;
