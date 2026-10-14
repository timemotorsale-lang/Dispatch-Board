ALTER TABLE "User"
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN "passwordResetAt" TIMESTAMP(3),
ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lockedUntil" TIMESTAMP(3),
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

UPDATE "User"
SET "passwordChangedAt" = COALESCE("passwordChangedAt", "createdAt")
WHERE "passwordChangedAt" IS NULL;

CREATE INDEX "User_lockedUntil_idx" ON "User"("lockedUntil");
CREATE INDEX "User_mustChangePassword_idx" ON "User"("mustChangePassword");
