INSERT INTO "Duty" ("id", "name", "workflowArea", "description", "updatedAt") VALUES
('duty-work-on-inventory', 'Work on inventory', 'INVENTORY', 'Access inventory vehicles and lifecycle workspaces.', CURRENT_TIMESTAMP),
('duty-manage-inventory-acquisition', 'Manage inventory acquisition', 'INVENTORY', 'Manage acquisition, receiving, inventory cycles and intake confirmation.', CURRENT_TIMESTAMP),
('duty-execute-inventory-recon', 'Execute inventory recon', 'INVENTORY', 'Coordinate inspections, repairs, parts, outside vendors and recon work.', CURRENT_TIMESTAMP),
('duty-verify-inventory-readiness', 'Verify inventory readiness', 'INVENTORY', 'Verify quality, safety, title and delivery readiness evidence.', CURRENT_TIMESTAMP),
('duty-publish-inventory-listings', 'Publish inventory listings', 'INVENTORY', 'Approve merchandising and reconcile observed listing publication.', CURRENT_TIMESTAMP),
('duty-authorize-inventory-release', 'Authorize inventory release', 'INVENTORY', 'Authorize frontline release and execute retail completion, delivery, disposition and unwind.', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
