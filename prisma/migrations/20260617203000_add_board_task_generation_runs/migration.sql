-- CreateEnum
CREATE TYPE "BoardGenerationStatus" AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'GENERATED',
    'FAILED'
);

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'BLOCKED',
    'WAITING_ON_PARTS',
    'WAITING_ON_APPROVAL',
    'READY_FOR_REVIEW',
    'COMPLETED'
);

-- CreateEnum
CREATE TYPE "TaskSourceType" AS ENUM (
    'TEMPLATE',
    'MANAGER',
    'STAFF'
);

-- CreateEnum
CREATE TYPE "GenerationRunStatus" AS ENUM (
    'RUNNING',
    'SUCCEEDED',
    'FAILED'
);

-- CreateEnum
CREATE TYPE "GenerationTriggerType" AS ENUM (
    'SCHEDULED',
    'MANUAL'
);

-- CreateTable
CREATE TABLE "BoardDay" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "generationStatus" "BoardGenerationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "generatedAt" TIMESTAMP(3),
    "generatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "boardDayId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "assignedUserId" TEXT NOT NULL,
    "recommendedUserId" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "requiresManagerApproval" BOOLEAN NOT NULL DEFAULT false,
    "vehicleReference" TEXT,
    "customerReference" TEXT,
    "sourceType" "TaskSourceType" NOT NULL,
    "sourceTemplateId" TEXT,
    "sourceDutyId" TEXT,
    "workflowArea" "WorkflowArea" NOT NULL,
    "blockerReason" TEXT,
    "readyForReviewAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationRun" (
    "id" TEXT NOT NULL,
    "boardDate" DATE NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "GenerationRunStatus" NOT NULL DEFAULT 'RUNNING',
    "triggeredBy" "GenerationTriggerType" NOT NULL,
    "triggeredByUserId" TEXT,
    "summary" JSONB NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "GenerationRun_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BoardDay" ADD CONSTRAINT "BoardDay_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_boardDayId_fkey" FOREIGN KEY ("boardDayId") REFERENCES "BoardDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_recommendedUserId_fkey" FOREIGN KEY ("recommendedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "TaskTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sourceDutyId_fkey" FOREIGN KEY ("sourceDutyId") REFERENCES "Duty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
