ALTER TABLE "Task" ADD COLUMN "ownerUserId" TEXT;

-- Existing accountability stays with the current assignee; historical ownership cannot be inferred.
UPDATE "Task" SET "ownerUserId" = "assignedUserId";

ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Task_ownerUserId_status_idx" ON "Task"("ownerUserId", "status");

-- All creation and assignment paths retain an owner, including generated and specialist tasks.
CREATE FUNCTION initialize_task_accountable_owner() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW."ownerUserId" := COALESCE(NEW."ownerUserId", NEW."assignedUserId");
  ELSE
    NEW."ownerUserId" := COALESCE(NEW."ownerUserId", OLD."ownerUserId", OLD."assignedUserId");
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Task_initialize_accountable_owner"
BEFORE INSERT OR UPDATE OF "assignedUserId", "ownerUserId" ON "Task"
FOR EACH ROW EXECUTE FUNCTION initialize_task_accountable_owner();
