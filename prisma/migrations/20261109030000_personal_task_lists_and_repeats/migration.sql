CREATE TABLE "PersonalTaskList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "name" TEXT NOT NULL
);
CREATE UNIQUE INDEX "PersonalTaskList_userId_name_key" ON "PersonalTaskList"("userId", "name");
ALTER TABLE "PersonalCalendarTask"
    ADD COLUMN "listId" TEXT REFERENCES "PersonalTaskList"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD COLUMN "repeat" JSONB,
    ADD COLUMN "deadline" TEXT,
    ADD COLUMN "starredAt" TIMESTAMP(3),
    ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE TABLE "PersonalTaskOccurrence" (
    "taskId" TEXT NOT NULL REFERENCES "PersonalCalendarTask"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "localDate" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("taskId", "localDate")
);
