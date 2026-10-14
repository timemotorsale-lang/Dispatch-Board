ALTER TABLE "RepairOrder"
  DROP CONSTRAINT IF EXISTS "RepairOrder_planning_stage_check";

ALTER TABLE "RepairOrder"
  ADD CONSTRAINT "RepairOrder_planning_stage_check"
  CHECK (
    (
      "closedAt" IS NULL
      AND "stage" IN (
        'INTAKE',
        'DIAGNOSIS',
        'ESTIMATE',
        'AUTHORIZATION',
        'READY_FOR_REPAIR',
        'REPAIR',
        'QUALITY_CONTROL',
        'ADVISOR_REVIEW',
        'HANDOFF'
      )
      AND "operatingState" IN ('ACTIVE', 'WAITING', 'BLOCKED')
    )
    OR
    (
      "closedAt" IS NOT NULL
      AND "stage" IN ('CLOSED', 'CANCELLED')
      AND "operatingState" = 'CLOSED'
    )
  );

ALTER TABLE "RepairOrder"
  DROP CONSTRAINT IF EXISTS "RepairOrder_state_reason_check";

ALTER TABLE "RepairOrder"
  ADD CONSTRAINT "RepairOrder_state_reason_check"
  CHECK (
    ("operatingState" = 'ACTIVE' AND "stateReason" IS NULL)
    OR ("operatingState" IN ('WAITING', 'BLOCKED', 'CLOSED') AND length(trim("stateReason")) >= 10)
  );
