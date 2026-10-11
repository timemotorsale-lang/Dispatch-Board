export const INVENTORY_TEAM_FUNCTIONS = [
  { name: "Import inventory records", capability: "VEHICLE_IDENTITY_CREATE", description: "Import new vehicle identity records without approving acquisition, pricing or release." },
  { name: "Export inventory data", capability: "VEHICLE_OUTPUT_CREATE", description: "Download inventory data for authorized locations." },
  { name: "Work on inventory", capability: "INVENTORY_UNIT_VIEW", description: "Access inventory vehicles and their lifecycle workspaces." },
  { name: "Manage inventory acquisition", capability: "INVENTORY_ACQUISITION_MANAGE", description: "Manage acquisition, receiving, inventory cycles and intake confirmation." },
  { name: "Execute inventory recon", capability: "INVENTORY_RECON_MANAGE", description: "Coordinate inspections, repairs, parts, outside vendors and recon work." },
  { name: "Verify inventory readiness", capability: "INVENTORY_READINESS_VERIFY", description: "Verify quality, safety, title and delivery readiness evidence." },
  { name: "Publish inventory listings", capability: "INVENTORY_PUBLISH_MANAGE", description: "Approve merchandising packages and reconcile observed listing publication." },
  { name: "Authorize inventory release", capability: "INVENTORY_RELEASE_MANAGE", description: "Authorize frontline release and manage retail completion, delivery, disposition and unwind." }
] as const;

export const FRONTLINE_ACTION_FUNCTIONS = {
  PLAN_TRANSPORT: "INVENTORY_ACQUISITION_MANAGE", RECORD_DELIVERY: "INVENTORY_ACQUISITION_MANAGE", RECORD_RECEIPT: "INVENTORY_ACQUISITION_MANAGE",
  RECORD_INSPECTION: "INVENTORY_RECON_MANAGE", APPROVE_RECON_PLAN: "INVENTORY_RECON_MANAGE", RECORD_RECON_SCOPE_CHANGE: "INVENTORY_RECON_MANAGE", VERIFY_EXECUTION: "INVENTORY_RECON_MANAGE",
  VERIFY_QUALITY: "INVENTORY_READINESS_VERIFY", RECORD_QUALITY_FAILURE: "INVENTORY_READINESS_VERIFY", VERIFY_TITLE: "INVENTORY_READINESS_VERIFY", RECORD_TITLE_READY: "INVENTORY_READINESS_VERIFY", RECORD_TITLE_HOLD: "INVENTORY_READINESS_VERIFY",
  VERIFY_MERCHANDISING: "INVENTORY_PUBLISH_MANAGE", RECORD_PUBLICATION_EXCEPTION: "INVENTORY_PUBLISH_MANAGE",
  AUTHORIZE_RELEASE: "INVENTORY_RELEASE_MANAGE", POST_RELEASE_VERIFY: "INVENTORY_RELEASE_MANAGE", SUSPEND: "INVENTORY_RELEASE_MANAGE", REOPEN_FOR_CORRECTION: "INVENTORY_RELEASE_MANAGE", ROUTE_ALTERNATE_DISPOSITION: "INVENTORY_RELEASE_MANAGE"
} as const;
