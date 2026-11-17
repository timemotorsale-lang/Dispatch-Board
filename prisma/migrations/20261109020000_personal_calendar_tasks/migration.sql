CREATE TABLE "PersonalCalendarTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "localDate" TEXT,
    "localTime" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonalCalendarTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonalCalendarTask_userId_requestId_key" ON "PersonalCalendarTask"("userId", "requestId");
CREATE INDEX "PersonalCalendarTask_userId_localDate_idx" ON "PersonalCalendarTask"("userId", "localDate");
ALTER TABLE "PersonalCalendarTask" ADD CONSTRAINT "PersonalCalendarTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
