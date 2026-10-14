CREATE TABLE "StaffInvite" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "roleNames" JSONB NOT NULL,
  "workspaceKey" TEXT,
  "tokenHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "invitedByUserId" TEXT,
  "acceptedByUserId" TEXT,
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StaffInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffInvite_tokenHash_key" ON "StaffInvite"("tokenHash");
CREATE INDEX "StaffInvite_email_idx" ON "StaffInvite"("email");
CREATE INDEX "StaffInvite_status_expiresAt_idx" ON "StaffInvite"("status", "expiresAt");
CREATE INDEX "StaffInvite_invitedByUserId_idx" ON "StaffInvite"("invitedByUserId");
CREATE INDEX "StaffInvite_acceptedByUserId_idx" ON "StaffInvite"("acceptedByUserId");
