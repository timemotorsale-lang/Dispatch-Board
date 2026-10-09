export const ADD_VEHICLE_RELATIONSHIPS = ["DEALERSHIP_INVENTORY", "CUSTOMER_VEHICLE", "TRADE_ACQUISITION_CANDIDATE", "OWNERSHIP_NOT_CONFIRMED"] as const;
export const ADD_VEHICLE_REASONS = ["SERVICE_REPAIR", "INSPECTION_DIAGNOSIS", "TRADE_APPRAISAL", "CUSTOMER_APPOINTMENT", "INVENTORY_RECON", "ACQUISITION_REVIEW", "REFERENCE_ONLY", "OTHER"] as const;
export type AddVehicleRelationship = (typeof ADD_VEHICLE_RELATIONSHIPS)[number];
export type AddVehicleReason = (typeof ADD_VEHICLE_REASONS)[number];

export const ADD_VEHICLE_ACQUISITION_SOURCES = ["AUCTION", "TRADE", "DIRECT_PURCHASE", "DEALER_TRANSFER", "CONSIGNMENT", "OTHER"] as const;
export type AddVehicleAcquisitionSource = (typeof ADD_VEHICLE_ACQUISITION_SOURCES)[number];

export const ADD_VEHICLE_WHEREABOUTS = ["AT_DEALERSHIP", "AUCTION_FACILITY", "REPAIR_FACILITY", "IN_TRANSIT", "OTHER_OFFSITE"] as const;
export type AddVehicleWhereabouts = (typeof ADD_VEHICLE_WHEREABOUTS)[number];

export const ADD_VEHICLE_ALLOWED_REASONS: Record<AddVehicleRelationship, readonly AddVehicleReason[]> = {
  CUSTOMER_VEHICLE: ["SERVICE_REPAIR", "INSPECTION_DIAGNOSIS", "TRADE_APPRAISAL", "CUSTOMER_APPOINTMENT", "OTHER"],
  DEALERSHIP_INVENTORY: ["INVENTORY_RECON", "INSPECTION_DIAGNOSIS", "REFERENCE_ONLY", "OTHER"],
  TRADE_ACQUISITION_CANDIDATE: ["TRADE_APPRAISAL", "ACQUISITION_REVIEW", "OTHER"],
  OWNERSHIP_NOT_CONFIRMED: ["REFERENCE_ONLY", "INSPECTION_DIAGNOSIS", "OTHER"]
};

export function addVehicleEntryRelationship(returnTo?: string): AddVehicleRelationship {
  if (!returnTo) return "DEALERSHIP_INVENTORY";
  if (!returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.includes("\\")) return "CUSTOMER_VEHICLE";
  const path = new URL(returnTo, "http://local.invalid").pathname;
  const inventoryPages = ["/vehicles", "/vehicles/inventory", "/vehicles/inventory/units", "/vehicles/control-tower", "/vehicles/coo-workbook", "/vehicles/inventory-to-frontline", "/vehicles/workflows", "/vehicles/workflows/add-vehicle", "/vehicles/registry"];
  return inventoryPages.includes(path) || /^\/vehicles\/[^/]+\/(intake|journey|costs|pricing|inventory-planning)$/.test(path) ? "DEALERSHIP_INVENTORY" : "CUSTOMER_VEHICLE";
}

export function recommendAddVehicleWorkflow(input: { description: string; reasonCode: AddVehicleReason; relationship: AddVehicleRelationship }) {
  if (input.relationship === "CUSTOMER_VEHICLE" && ["SERVICE_REPAIR", "INSPECTION_DIAGNOSIS"].includes(input.reasonCode)) {
    return { code: "CREATE_SERVICE_INTAKE", title: "Create Service Intake", description: "Customer vehicle and service intent prepare a walk-in repair-order intake.", confidence: "HIGH" as const, commandLabel: "Add Vehicle & Create Service Intake" };
  }
  if (input.relationship === "CUSTOMER_VEHICLE" && input.reasonCode === "CUSTOMER_APPOINTMENT") {
    return { code: "SCHEDULE_APPOINTMENT", title: "Schedule Appointment", description: "Customer appointment intent prepares scheduling with the canonical vehicle.", confidence: "HIGH" as const, commandLabel: "Add Vehicle & Schedule Appointment" };
  }
  if (input.relationship === "TRADE_ACQUISITION_CANDIDATE" || input.reasonCode === "TRADE_APPRAISAL" || input.reasonCode === "ACQUISITION_REVIEW") {
    return { code: "START_ACQUISITION_APPRAISAL", title: "Start Trade / Acquisition Appraisal", description: "Trade or acquisition intent prepares appraisal without creating dealership ownership or a purchase commitment.", confidence: "HIGH" as const, commandLabel: "Add Vehicle & Start Appraisal" };
  }
  if (input.relationship === "DEALERSHIP_INVENTORY") {
    return { code: "REVIEW_INVENTORY_CONTROL", title: "Acquisition & Intake", description: "Capture purchase and arrival details before the recon lifecycle.", confidence: "HIGH" as const, commandLabel: "Add Vehicle & Continue Intake" };
  }
  return { code: "OPEN_VEHICLE_360", title: "Open Vehicle 360", description: "Create canonical identity and review the vehicle before starting a consequential workflow.", confidence: "MEDIUM" as const, commandLabel: "Add Vehicle & Open Vehicle 360" };
}
