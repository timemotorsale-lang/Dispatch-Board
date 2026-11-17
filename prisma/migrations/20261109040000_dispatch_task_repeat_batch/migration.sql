CREATE TABLE "DispatchTaskRepeatBatch" (
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "firstTaskId" TEXT,
    "taskCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DispatchTaskRepeatBatch_pkey" PRIMARY KEY ("userId", "requestId"),
    CONSTRAINT "DispatchTaskRepeatBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
