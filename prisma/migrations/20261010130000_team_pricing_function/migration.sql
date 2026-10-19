INSERT INTO "Duty" ("id", "name", "workflowArea", "description", "updatedAt")
VALUES ('duty-edit-inventory-pricing', 'Edit inventory pricing', 'INVENTORY',
  'View pricing comparisons and edit selling-price proposals, pack and margin settings, and provisional intake prices. Does not authorize publishing or final release.', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
