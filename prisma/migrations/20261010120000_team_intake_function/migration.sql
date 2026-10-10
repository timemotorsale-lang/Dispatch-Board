INSERT INTO "Duty" ("id", "name", "workflowArea", "description", "updatedAt")
VALUES ('duty-edit-acquisition-intake', 'Edit acquisition intake', 'INVENTORY',
  'View and edit acquisition intake drafts. Inventory confirmation and pricing approval require their existing permissions.', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
