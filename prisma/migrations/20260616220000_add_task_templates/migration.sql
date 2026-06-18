-- CreateEnum
CREATE TYPE "WorkflowArea" AS ENUM (
    'INVENTORY',
    'ADVERTISING',
    'MARKETING',
    'SALES',
    'ADMIN',
    'COLLECTIONS',
    'SHOP',
    'GENERAL_MANAGER'
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "workflowArea" "WorkflowArea" NOT NULL,
    "defaultDueTime" TEXT NOT NULL,
    "requiresManagerApproval" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "roleId" TEXT,
    "dutyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskTemplate_workflowArea_idx" ON "TaskTemplate"("workflowArea");

-- CreateIndex
CREATE INDEX "TaskTemplate_roleId_idx" ON "TaskTemplate"("roleId");

-- CreateIndex
CREATE INDEX "TaskTemplate_dutyId_idx" ON "TaskTemplate"("dutyId");

-- CreateIndex
CREATE INDEX "TaskTemplate_isActive_idx" ON "TaskTemplate"("isActive");

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_dutyId_fkey" FOREIGN KEY ("dutyId") REFERENCES "Duty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
