import type { AuthenticatedUser } from "@/server/auth/store";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";

export async function assertRepairLocationRead(actor: AuthenticatedUser | null, organizationId: string, locationId: string, foundation: Pick<EnterpriseCommandRepository, "listCapabilityGrants">, now = new Date()) {
  const grants = await foundation.listCapabilityGrants(actor?.id ?? "", organizationId);
  assertVehicleCapability({ actor, grants, locationId, capability: "REPAIR_ORDER_VIEW", now });
}
