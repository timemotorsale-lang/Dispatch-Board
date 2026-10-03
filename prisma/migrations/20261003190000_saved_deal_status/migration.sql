ALTER TABLE "DealDeskDraft"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
ADD COLUMN "statusHistory" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "DealDeskDraft" ADD CONSTRAINT "DealDeskDraft_status_check"
CHECK ("status" IN ('IN_PROGRESS', 'PENDING', 'SOLD', 'LOST', 'COMPLETED', 'CANCELLED', 'ARCHIVED'));

CREATE INDEX "DealDeskDraft_organizationId_ownerUserId_status_updatedAt_idx"
ON "DealDeskDraft"("organizationId", "ownerUserId", "status", "updatedAt");
