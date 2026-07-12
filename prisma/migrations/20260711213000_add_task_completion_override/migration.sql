ALTER TABLE "Task"
ADD COLUMN "completionOverrideAt" TIMESTAMP(3),
ADD COLUMN "completionOverrideByUserId" TEXT,
ADD COLUMN "completionOverrideReason" TEXT;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_completionOverrideByUserId_fkey"
FOREIGN KEY ("completionOverrideByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Task_completionOverrideByUserId_completionOverrideAt_idx"
ON "Task"("completionOverrideByUserId", "completionOverrideAt");
