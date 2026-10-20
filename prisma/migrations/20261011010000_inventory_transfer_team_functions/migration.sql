INSERT INTO "Duty" ("id", "name", "workflowArea", "description", "updatedAt") VALUES
('duty-import-inventory-records', 'Import inventory records', 'INVENTORY', 'Import new vehicle identity records without approving acquisition, pricing or release.', CURRENT_TIMESTAMP),
('duty-export-inventory-data', 'Export inventory data', 'INVENTORY', 'Download inventory data for authorized locations.', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
