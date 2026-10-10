import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";

export const EDIT_ACQUISITION_INTAKE_DUTY_NAME = "Edit acquisition intake";

export function evaluateIntakeAccess(input: Omit<Parameters<typeof evaluateVehicleCapability>[0], "capability">) {
  const decision = evaluateVehicleCapability({ ...input, capability: "INVENTORY_UNIT_MANAGE" });
  if (decision.allowed) return decision;
  if (decision.reason === "CAPABILITY_REQUIRED" && input.actor?.duties.all.includes(EDIT_ACQUISITION_INTAKE_DUTY_NAME)) {
    return { allowed: true, reason: "ASSIGNED_INTAKE_FUNCTION" } as const;
  }
  return decision;
}

export function assertIntakeAccess(input: Parameters<typeof evaluateIntakeAccess>[0]) {
  const decision = evaluateIntakeAccess(input);
  if (!decision.allowed) throw new Error(`Vehicle capability required: ${EDIT_ACQUISITION_INTAKE_DUTY_NAME} (${decision.reason}).`);
  return decision;
}
