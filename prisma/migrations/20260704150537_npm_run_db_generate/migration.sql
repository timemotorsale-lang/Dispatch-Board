-- AlterTable
ALTER TABLE "TaskTemplate" ALTER COLUMN "approvalRules" DROP DEFAULT,
ALTER COLUMN "checklistItems" DROP DEFAULT,
ALTER COLUMN "completionCriteria" DROP DEFAULT,
ALTER COLUMN "defaultStatusRules" DROP DEFAULT,
ALTER COLUMN "intelligenceSignalType" DROP DEFAULT,
ALTER COLUMN "requiredUpdateFields" DROP DEFAULT,
ALTER COLUMN "taskCardDisplayHints" DROP DEFAULT;
