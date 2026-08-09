ALTER TABLE "RepairOrder"
  DROP CONSTRAINT IF EXISTS "RepairOrder_planning_stage_check";

ALTER TABLE "RepairOrder"
  ADD CONSTRAINT "RepairOrder_planning_stage_check"
  CHECK (
    "stage" IN (
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
    AND "closedAt" IS NULL
  );
