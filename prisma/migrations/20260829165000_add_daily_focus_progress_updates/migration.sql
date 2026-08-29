ALTER TABLE "WorkdayDailyFocusItem"
ADD COLUMN "progressUpdate" TEXT NOT NULL DEFAULT '',
ADD COLUMN "lastProgressAt" TIMESTAMP(3);
