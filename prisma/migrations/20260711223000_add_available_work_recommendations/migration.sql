CREATE TYPE "WorkRecommendationStatus" AS ENUM ('SHOWN', 'CLAIMED', 'DISMISSED', 'EXPIRED');

ALTER TABLE "Task"
ADD COLUMN "isClaimable" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "WorkRecommendation" (
  "id" TEXT NOT NULL,
  "staffDayId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "rank" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "scoreBreakdown" JSONB NOT NULL,
  "explanation" TEXT NOT NULL,
  "status" "WorkRecommendationStatus" NOT NULL DEFAULT 'SHOWN',
  "dismissalReasonCode" TEXT,
  "claimedAt" TIMESTAMP(3),
  "claimedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkRecommendation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkRecommendation" ADD CONSTRAINT "WorkRecommendation_staffDayId_fkey" FOREIGN KEY ("staffDayId") REFERENCES "StaffDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkRecommendation" ADD CONSTRAINT "WorkRecommendation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkRecommendation" ADD CONSTRAINT "WorkRecommendation_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "WorkRecommendation_staffDayId_taskId_key" ON "WorkRecommendation"("staffDayId", "taskId");
CREATE INDEX "WorkRecommendation_staffDayId_status_rank_idx" ON "WorkRecommendation"("staffDayId", "status", "rank");
CREATE INDEX "WorkRecommendation_taskId_status_idx" ON "WorkRecommendation"("taskId", "status");
CREATE INDEX "Task_boardDayId_isClaimable_status_idx" ON "Task"("boardDayId", "isClaimable", "status");
