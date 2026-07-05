CREATE TYPE "TaskChecklistItemKind" AS ENUM ('DEFINITION_OF_DONE', 'SUBTASK');

CREATE TABLE "TaskChecklistItem" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "kind" "TaskChecklistItemKind" NOT NULL,
    "label" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskChecklistItem_taskId_kind_sortOrder_idx" ON "TaskChecklistItem"("taskId", "kind", "sortOrder");
CREATE INDEX "TaskChecklistItem_taskId_completed_idx" ON "TaskChecklistItem"("taskId", "completed");

ALTER TABLE "TaskChecklistItem"
ADD CONSTRAINT "TaskChecklistItem_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
