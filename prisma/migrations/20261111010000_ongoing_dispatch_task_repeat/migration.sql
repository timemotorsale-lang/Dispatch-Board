ALTER TABLE "DispatchTaskRepeatBatch"
ADD COLUMN "ongoing" JSONB,
ADD COLUMN "nextDate" TEXT,
ADD COLUMN "lastAttemptAt" TIMESTAMP(3);

CREATE INDEX "DispatchTaskRepeatBatch_nextDate_lastAttemptAt_idx"
ON "DispatchTaskRepeatBatch"("nextDate", "lastAttemptAt");
