CREATE TABLE IF NOT EXISTS "ActivityEvent" (
    "id" TEXT NOT NULL,
    "boardDayId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "taskId" TEXT,
    "eventType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ActivityEvent_boardDayId_createdAt_idx" ON "ActivityEvent"("boardDayId", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityEvent_taskId_idx" ON "ActivityEvent"("taskId");

ALTER TABLE "ActivityEvent"
ALTER COLUMN "eventType" TYPE TEXT USING "eventType"::text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ActivityEvent_boardDayId_fkey'
    ) THEN
        ALTER TABLE "ActivityEvent"
        ADD CONSTRAINT "ActivityEvent_boardDayId_fkey"
        FOREIGN KEY ("boardDayId") REFERENCES "BoardDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ActivityEvent_actorUserId_fkey'
    ) THEN
        ALTER TABLE "ActivityEvent"
        ADD CONSTRAINT "ActivityEvent_actorUserId_fkey"
        FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ActivityEvent_taskId_fkey'
    ) THEN
        ALTER TABLE "ActivityEvent"
        ADD CONSTRAINT "ActivityEvent_taskId_fkey"
        FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
