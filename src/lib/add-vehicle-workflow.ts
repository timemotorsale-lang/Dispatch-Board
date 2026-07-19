export const ADD_VEHICLE_RELATIONSHIPS = ["DEALERSHIP_INVENTORY", "CUSTOMER_VEHICLE", "TRADE_ACQUISITION_CANDIDATE", "OWNERSHIP_NOT_CONFIRMED"] as const;
export const ADD_VEHICLE_REASONS = ["SERVICE_REPAIR", "INSPECTION_DIAGNOSIS", "TRADE_APPRAISAL", "CUSTOMER_APPOINTMENT", "INVENTORY_RECON", "ACQUISITION_REVIEW", "REFERENCE_ONLY", "OTHER"] as const;
export type AddVehicleRelationship = (typeof ADD_VEHICLE_RELATIONSHIPS)[number];
export type AddVehicleReason = (typeof ADD_VEHICLE_REASONS)[number];

export const ADD_VEHICLE_ALLOWED_REASONS: Record<AddVehicleRelationship, readonly AddVehicleReason[]> = {
  CUSTOMER_VEHICLE: ["SERVICE_REPAIR", "INSPECTION_DIAGNOSIS", "TRADE_APPRAISAL", "CUSTOMER_APPOINTMENT", "OTHER"],
  DEALERSHIP_INVENTORY: ["INVENTORY_RECON", "INSPECTION_DIAGNOSIS", "REFERENCE_ONLY", "OTHER"],
  TRADE_ACQUISITION_CANDIDATE: ["TRADE_APPRAISAL", "ACQUISITION_REVIEW", "OTHER"],
  OWNERSHIP_NOT_CONFIRMED: ["REFERENCE_ONLY", "INSPECTION_DIAGNOSIS", "OTHER"]
};

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
  if (input.relationship === "DEALERSHIP_INVENTORY" && input.reasonCode === "INVENTORY_RECON") {
    return { code: "REVIEW_INVENTORY_CONTROL", title: "Review Inventory Control", description: "Dealership-inventory intent routes to governed Inventory Unit eligibility before recon.", confidence: "MEDIUM" as const, commandLabel: "Add Vehicle & Review Inventory Control" };
  }
  return { code: "OPEN_VEHICLE_360", title: "Open Vehicle 360", description: "Create canonical identity and review the vehicle before starting a consequential workflow.", confidence: "MEDIUM" as const, commandLabel: "Add Vehicle & Open Vehicle 360" };
}
