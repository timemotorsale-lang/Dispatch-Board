CREATE FUNCTION "prevent_pending_service_handoff_completion"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."status" = 'COMPLETED' AND OLD."status" IS DISTINCT FROM NEW."status"
    AND EXISTS (
      SELECT 1 FROM "TaskRepairHandoff"
      WHERE "taskId" = NEW."id" AND "repairOrderId" IS NULL
    )
  THEN
    RAISE EXCEPTION 'Service handoff is pending. Accept it into a repair order or cancel it before completing this task.'
      USING ERRCODE = '23514', CONSTRAINT = 'Task_pending_service_handoff_completion';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Task_pending_service_handoff_completion"
BEFORE UPDATE OF "status" ON "Task"
FOR EACH ROW EXECUTE FUNCTION "prevent_pending_service_handoff_completion"();
