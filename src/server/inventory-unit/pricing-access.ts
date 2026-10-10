import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";

export const EDIT_INVENTORY_PRICING_DUTY_NAME = "Edit inventory pricing";

export function evaluatePricingAccess(input: Omit<Parameters<typeof evaluateVehicleCapability>[0], "capability">) {
  return evaluateVehicleCapability({ ...input, capability: "INVENTORY_PRICING_MANAGE" });
}

export function assertPricingAccess(input: Parameters<typeof evaluatePricingAccess>[0]) {
  const decision = evaluatePricingAccess(input);
  if (!decision.allowed) throw new Error(`Vehicle capability required: ${EDIT_INVENTORY_PRICING_DUTY_NAME} (${decision.reason}).`);
  return decision;
}
