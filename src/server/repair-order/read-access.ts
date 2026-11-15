import type { AuthenticatedUser } from "@/server/auth/store";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability, evaluateVehicleCapability, type VehicleCapabilityGrantRecord } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";

// A location grant permits resolving a record's location, not reading other stores.
// Callers must still authorize the actual location before returning record data.
export function assertRepairReadCandidate(actor: AuthenticatedUser | null, grants: VehicleCapabilityGrantRecord[], now = new Date()) {
  const user = assertAuthenticatedUser(actor);
  const locations = [null, ...new Set(grants.flatMap(grant => grant.locationId ? [grant.locationId] : []))];
  if (!locations.some(locationId => evaluateVehicleCapability({ actor: user, grants, locationId, capability: "REPAIR_ORDER_VIEW", now }).allowed)) {
    assertVehicleCapability({ actor: user, grants, locationId: null, capability: "REPAIR_ORDER_VIEW", now });
  }
  return user;
}

export async function assertRepairReadEntry(actor: AuthenticatedUser | null, organizationId: string, foundation: Pick<EnterpriseCommandRepository, "listCapabilityGrants">, now = new Date()) {
  const user = assertAuthenticatedUser(actor);
  const grants = await foundation.listCapabilityGrants(user.id, organizationId);
  assertRepairReadCandidate(user, grants, now);
  return { user, grants };
}

export function readableRepairLocations(actor: AuthenticatedUser, grants: VehicleCapabilityGrantRecord[], locations: { id: string }[], now = new Date(), allowEmptyForGlobalReader = false) {
  const allowed = locations.filter(location => evaluateVehicleCapability({ actor, grants, locationId: location.id, capability: "REPAIR_ORDER_VIEW", now }).allowed).map(location => location.id);
  if (!allowed.length && !(allowEmptyForGlobalReader && evaluateVehicleCapability({ actor, grants, locationId: null, capability: "REPAIR_ORDER_VIEW", now }).allowed)) throw new Error("Vehicle capability required: REPAIR_ORDER_VIEW (NO_ACCESSIBLE_LOCATION).");
  return allowed;
}

export async function assertRepairLocationRead(actor: AuthenticatedUser | null, organizationId: string, locationId: string, foundation: Pick<EnterpriseCommandRepository, "listCapabilityGrants">, now = new Date()) {
  const grants = await foundation.listCapabilityGrants(actor?.id ?? "", organizationId);
  assertVehicleCapability({ actor, grants, locationId, capability: "REPAIR_ORDER_VIEW", now });
}
