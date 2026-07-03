<<<<<<< HEAD
-- This migration was reserved before its schema changes were implemented.
-- Keep the migration history valid without applying unrelated database changes.
=======
ALTER TABLE "Task"
ADD COLUMN "recommendationReasonCode" TEXT,
ADD COLUMN "recommendationReasonText" TEXT,
ADD COLUMN "recommendationReviewNeeded" BOOLEAN;
>>>>>>> main
