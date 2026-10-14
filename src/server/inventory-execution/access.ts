import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";

export async function authorizeInventoryRecon(actor: AuthenticatedUser | null, input: { foundationRepository?: EnterpriseCommandRepository; organizationId?: string; now?: () => Date } = {}) {
  const user = assertAuthenticatedUser(actor);
  if (!user.isActive) throw new Error("Active staff account is required.");
  const grants = await (input.foundationRepository ?? createEnterpriseCommandRepository()).listCapabilityGrants(user.id, input.organizationId ?? INITIAL_ORGANIZATION.id);
  assertVehicleCapability({ actor: user, capability: "INVENTORY_RECON_MANAGE", grants, locationId: null, now: (input.now ?? (() => new Date()))() });
  return user;
}
