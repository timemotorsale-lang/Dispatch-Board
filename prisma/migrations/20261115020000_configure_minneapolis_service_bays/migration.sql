INSERT INTO "SchedulableResource" (
  "id", "organizationId", "locationId", "resourceTypeId", "code", "name",
  "capacityMode", "capacity", "conflictPolicy", "effectiveFrom", "updatedAt"
)
SELECT location."id" || '-bay-' || bay.number, location."organizationId", location."id",
       resource_type."id", 'BAY-' || bay.number, 'Bay ' || bay.number,
       'EXCLUSIVE', 1, 'HARD_BLOCK', DATE '2026-01-01', CURRENT_TIMESTAMP
FROM "Location" AS location
JOIN "Organization" AS organization ON organization."id" = location."organizationId"
JOIN "SchedulableResourceType" AS resource_type
  ON resource_type."organizationId" = organization."id"
  AND resource_type."code" = 'SERVICE_BAY'
  AND resource_type."kind" = 'SERVICE_BAY'
CROSS JOIN (VALUES (1), (2)) AS bay(number)
WHERE organization."code" = 'TIME_MOTOR_SALES'
  AND location."code" = 'TMS-MSP-01'
ON CONFLICT ("locationId", "code") DO NOTHING;
