ALTER TABLE "Task"
ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "acceptedByUserId" TEXT;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_acceptedByUserId_fkey"
FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Task_acceptedByUserId_acceptedAt_idx"
ON "Task"("acceptedByUserId", "acceptedAt");
