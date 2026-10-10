import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";

export const EDIT_INVENTORY_PRICING_DUTY_NAME = "Edit inventory pricing";

export function evaluatePricingAccess(input: Omit<Parameters<typeof evaluateVehicleCapability>[0], "capability">) {
  const decision = evaluateVehicleCapability({ ...input, capability: "INVENTORY_PRICING_MANAGE" });
  if (decision.allowed) return decision;
  if (decision.reason === "CAPABILITY_REQUIRED" && input.actor?.duties.all.includes(EDIT_INVENTORY_PRICING_DUTY_NAME)) {
    return { allowed: true, reason: "ASSIGNED_PRICING_FUNCTION" } as const;
  }
  return decision;
}

export function assertPricingAccess(input: Parameters<typeof evaluatePricingAccess>[0]) {
  const decision = evaluatePricingAccess(input);
  if (!decision.allowed) throw new Error(`Vehicle capability required: ${EDIT_INVENTORY_PRICING_DUTY_NAME} (${decision.reason}).`);
  return decision;
}
