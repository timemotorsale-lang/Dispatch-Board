-- CreateEnum
CREATE TYPE "SchedulerFailureStage" AS ENUM (
    'PREFLIGHT',
    'GENERATION_RUN',
    'POST_RUN_FINALIZE'
);

-- AlterTable
ALTER TABLE "SchedulerAttempt"
ADD COLUMN "failureStage" "SchedulerFailureStage",
ADD COLUMN "failureDiagnostic" JSONB;
