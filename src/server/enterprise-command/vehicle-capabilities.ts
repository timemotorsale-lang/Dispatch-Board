import type { AuthenticatedUser } from "@/server/auth/store";
import { isGeneralManager, isManager } from "@/server/policies/access";

export const VEHICLE_CAPABILITIES = [
  "VEHICLE_OPERATIONS_VIEW",
  "VEHICLE_COMMAND_EXECUTE",
  "VEHICLE_ROLLOUT_MANAGE",
  "VEHICLE_HEALTH_VIEW",
  "VEHICLE_CAPABILITY_MANAGE",
  "VEHICLE_DUPLICATE_RESOLVE",
  "INVENTORY_UNIT_VIEW",
  "INVENTORY_UNIT_MANAGE",
  "REPAIR_ORDER_VIEW",
  "REPAIR_ORDER_MANAGE",
  "PARTS_VIEW",
  "PARTS_MANAGE",
  "VEHICLE_EVIDENCE_VIEW",
  "VEHICLE_EVIDENCE_MANAGE",
  "VEHICLE_EVIDENCE_RESTRICTED_VIEW"
] as const;
export type VehicleCapability = (typeof VEHICLE_CAPABILITIES)[number];

export type VehicleCapabilityGrantRecord = {
  capability: string;
  constraints?: unknown;
  effect: "ALLOW" | "DENY";
  locationId: string | null;
  validFrom: Date;
  validTo: Date | null;
};

export function evaluateVehicleCapability(input: {
  actor: AuthenticatedUser | null;
  capability: VehicleCapability;
  grants?: VehicleCapabilityGrantRecord[];
  locationId: string | null;
  amountCents?: number | null;
  resourceOwnerUserId?: string | null;
  now?: Date;
}) {
  if (!input.actor?.isActive) return { allowed: false, reason: "AUTHENTICATION_REQUIRED" } as const;
  const now = input.now ?? new Date();
  const matching = (input.grants ?? []).filter((grant) => {
    if (grant.capability !== input.capability || (grant.locationId && grant.locationId !== input.locationId) || grant.validFrom > now || (grant.validTo && grant.validTo < now)) return false;
    const constraints = grant.constraints && typeof grant.constraints === "object" && !Array.isArray(grant.constraints) ? grant.constraints as Record<string, unknown> : {};
    if (constraints.ownResourcesOnly === true && input.resourceOwnerUserId !== input.actor?.id) return false;
    if (typeof constraints.maxAmountCents === "number" && typeof input.amountCents === "number" && input.amountCents > constraints.maxAmountCents) return false;
    return true;
  });
  if (matching.some((grant) => grant.effect === "DENY")) return { allowed: false, reason: "EXPLICIT_DENY" } as const;
  if (isGeneralManager(input.actor)) return { allowed: true, reason: "GENERAL_MANAGER" } as const;
  if (input.capability === "VEHICLE_ROLLOUT_MANAGE" || input.capability === "VEHICLE_CAPABILITY_MANAGE" || input.capability === "VEHICLE_DUPLICATE_RESOLVE" || input.capability === "VEHICLE_EVIDENCE_RESTRICTED_VIEW") {
    return matching.some((grant) => grant.effect === "ALLOW")
      ? { allowed: true, reason: "EXPLICIT_GRANT" } as const
      : { allowed: false, reason: "GENERAL_MANAGER_OR_GRANT_REQUIRED" } as const;
  }
  if (isManager(input.actor)) return { allowed: true, reason: "MANAGER_DEFAULT" } as const;
  return matching.some((grant) => grant.effect === "ALLOW")
    ? { allowed: true, reason: "EXPLICIT_GRANT" } as const
    : { allowed: false, reason: "CAPABILITY_REQUIRED" } as const;
}

export function assertVehicleCapability(input: Parameters<typeof evaluateVehicleCapability>[0]) {
  const decision = evaluateVehicleCapability(input);
  if (!decision.allowed) throw new Error(`Vehicle capability required: ${input.capability} (${decision.reason}).`);
  return decision;
}
