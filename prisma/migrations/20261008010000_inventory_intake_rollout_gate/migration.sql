-- Provision a separate, disabled intake gate without inheriting a retail cohort.
INSERT INTO "VehicleOperationsFeatureFlag"
  ("id", "organizationId", "locationId", "code", "mode", "rolloutPercent", "allowedUserIds", "version", "updatedAt")
SELECT 'vo-flag-intake-' || "id", "id", NULL, 'INVENTORY_INTAKE',
  'OFF'::"VehicleOperationsRolloutMode", 0, '[]'::jsonb, 1, CURRENT_TIMESTAMP
FROM "Organization"
WHERE NOT EXISTS (
  SELECT 1 FROM "VehicleOperationsFeatureFlag" AS flag
  WHERE flag."organizationId" = "Organization"."id"
    AND flag."locationId" IS NULL AND flag."code" = 'INVENTORY_INTAKE'
);
