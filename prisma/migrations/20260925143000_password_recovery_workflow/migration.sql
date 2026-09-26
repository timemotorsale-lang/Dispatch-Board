CREATE TABLE "PasswordResetRequest" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "userId" TEXT,
  "tokenHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetRequest_tokenHash_key" ON "PasswordResetRequest"("tokenHash");
CREATE INDEX "PasswordResetRequest_email_idx" ON "PasswordResetRequest"("email");
CREATE INDEX "PasswordResetRequest_userId_idx" ON "PasswordResetRequest"("userId");
CREATE INDEX "PasswordResetRequest_status_requestedAt_idx" ON "PasswordResetRequest"("status", "requestedAt");
CREATE INDEX "PasswordResetRequest_approvedByUserId_idx" ON "PasswordResetRequest"("approvedByUserId");
