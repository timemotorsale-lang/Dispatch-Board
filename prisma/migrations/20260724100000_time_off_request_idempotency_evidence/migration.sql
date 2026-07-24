ALTER TABLE "TimeOffRequest" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "TimeOffRequest" ADD COLUMN "requestHash" TEXT;
ALTER TABLE "TimeOffRequest" ADD COLUMN "evidence" JSONB NOT NULL DEFAULT '{"source":"LEGACY_BACKFILL"}';

UPDATE "TimeOffRequest"
SET "idempotencyKey" = 'legacy-time-off-request-' || "id",
    "requestHash" = 'legacy-time-off-request-' || "id";

ALTER TABLE "TimeOffRequest" ALTER COLUMN "idempotencyKey" SET NOT NULL;
ALTER TABLE "TimeOffRequest" ALTER COLUMN "requestHash" SET NOT NULL;

CREATE UNIQUE INDEX "TimeOffRequest_organizationId_requesterUserId_idempotencyKey_key"
  ON "TimeOffRequest"("organizationId", "requesterUserId", "idempotencyKey");

ALTER TABLE "TimeOffRequest" ALTER COLUMN "evidence" DROP DEFAULT;
