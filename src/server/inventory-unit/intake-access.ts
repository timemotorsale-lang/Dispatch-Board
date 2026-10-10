import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";

export const EDIT_ACQUISITION_INTAKE_DUTY_NAME = "Edit acquisition intake";

export function evaluateIntakeAccess(input: Omit<Parameters<typeof evaluateVehicleCapability>[0], "capability">) {
  return evaluateVehicleCapability({ ...input, capability: "INVENTORY_INTAKE_EDIT" });
}

export function assertIntakeAccess(input: Parameters<typeof evaluateIntakeAccess>[0]) {
  const decision = evaluateIntakeAccess(input);
  if (!decision.allowed) throw new Error(`Vehicle capability required: ${EDIT_ACQUISITION_INTAKE_DUTY_NAME} (${decision.reason}).`);
  return decision;
}
