ALTER TABLE "VehicleOperationsFeatureFlag"
ADD COLUMN "targetAt" TIMESTAMP(3);

UPDATE "VehicleOperationsFeatureFlag"
SET
  "mode" = 'GENERAL',
  "rolloutPercent" = 100,
  "targetAt" = TIMESTAMP '2026-07-22 12:00:00',
  "version" = "version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "organizationId" = 'org-time-motor-sales'
  AND "locationId" IS NULL
  AND "code" IN ('DIAGNOSTICS_MASTER', 'DIAGNOSTIC_CASES');

INSERT INTO "VehicleOperationsRolloutEvent"
  ("id", "organizationId", "actorUserId", "action", "reason", "priorState", "nextState", "correlationId", "createdAt")
SELECT
  CONCAT('diag-rollout-20260722-', LOWER(REPLACE(flag."code", '_', '-'))),
  flag."organizationId",
  actor."id",
  'FEATURE_FLAG_UPDATED',
  'Approved basic diagnostic case creation for general use with a July 22, 2026 rollout target; downstream capabilities remain held.',
  jsonb_build_object('code', flag."code", 'mode', 'OFF', 'rolloutPercent', 0, 'version', flag."version" - 1),
  jsonb_build_object('code', flag."code", 'mode', flag."mode", 'rolloutPercent', flag."rolloutPercent", 'targetAt', flag."targetAt", 'version', flag."version"),
  CONCAT('diagnostics-case-rollout-20260722-', LOWER(flag."code")),
  CURRENT_TIMESTAMP
FROM "VehicleOperationsFeatureFlag" flag
JOIN "User" actor ON actor."email" = 'morgan.manager@local.test'
WHERE flag."organizationId" = 'org-time-motor-sales'
  AND flag."locationId" IS NULL
  AND flag."code" IN ('DIAGNOSTICS_MASTER', 'DIAGNOSTIC_CASES')
ON CONFLICT ("id") DO NOTHING;
