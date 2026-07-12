-- CreateEnum
CREATE TYPE "TaskAssignmentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "TaskAssignmentRequest" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "status" "TaskAssignmentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestReason" TEXT,
    "decisionReason" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TaskAssignmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskAssignmentRequest_requesterUserId_status_createdAt_idx" ON "TaskAssignmentRequest"("requesterUserId", "status", "createdAt");
CREATE INDEX "TaskAssignmentRequest_status_createdAt_idx" ON "TaskAssignmentRequest"("status", "createdAt");
CREATE INDEX "TaskAssignmentRequest_taskId_status_idx" ON "TaskAssignmentRequest"("taskId", "status");

ALTER TABLE "TaskAssignmentRequest" ADD CONSTRAINT "TaskAssignmentRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAssignmentRequest" ADD CONSTRAINT "TaskAssignmentRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAssignmentRequest" ADD CONSTRAINT "TaskAssignmentRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
