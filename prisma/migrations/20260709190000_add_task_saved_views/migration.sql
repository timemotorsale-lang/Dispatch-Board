CREATE TABLE "TaskSavedView" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskSavedView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskSavedView_createdAt_idx" ON "TaskSavedView"("createdAt");
CREATE INDEX "TaskSavedView_createdByUserId_idx" ON "TaskSavedView"("createdByUserId");

ALTER TABLE "TaskSavedView"
ADD CONSTRAINT "TaskSavedView_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
