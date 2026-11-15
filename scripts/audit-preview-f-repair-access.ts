import { PrismaClient } from "@prisma/client";
import { evaluateVehicleCapability, type VehicleCapability } from "../src/server/enterprise-command/vehicle-capabilities";
import { evaluateVehicleOperationsFeature, evaluateDiagnosticsFeature } from "../src/server/enterprise-command/service";
import { isManager } from "../src/server/policies/access";

async function main() {
  const target = new URL(process.env.DATABASE_URL ?? "http://invalid");
  if (target.protocol !== "postgresql:" || target.hostname !== "127.0.0.1" || target.port !== "55439" || target.pathname !== "/postgres" || target.searchParams.get("schema") !== "dispatch_board_e2e_history_20261114_f" || target.searchParams.get("connection_limit") !== "2" || [...target.searchParams.keys()].some(key => !["schema", "connection_limit", "pool_timeout"].includes(key))) throw new Error("Only the explicit read-only preview F audit target is permitted.");
  const db = new PrismaClient();
  try {
    const snapshot = await db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const users = await tx.user.findMany({ where: { OR: ["Brock", "Ancilla", "Baraka", "Evelyn", "Eva", "Eli"].flatMap(name => [{ name: { contains: name, mode: "insensitive" as const } }, { email: { contains: name, mode: "insensitive" as const } }]) }, select: { id: true, name: true, email: true, isActive: true, userRoles: { select: { role: { select: { name: true, roleDuties: { select: { duty: { select: { name: true } } } } } } } }, userDuties: { select: { duty: { select: { name: true } } } } } });
      const organizationId = "org-time-motor-sales";
      const locations = await tx.location.findMany({ where: { organizationId }, select: { id: true, name: true } });
      const grants = await tx.vehicleCapabilityGrant.findMany({ where: { organizationId, userId: { in: users.map(user => user.id) } }, select: { userId: true, capability: true, effect: true, locationId: true, constraints: true, validFrom: true, validTo: true } });
      const flags = await tx.vehicleOperationsFeatureFlag.findMany({ where: { organizationId } });
      return { users, locations, grants, flags };
    });
    const now = new Date();
    const capabilities: VehicleCapability[] = ["REPAIR_ORDER_VIEW", "REPAIR_ORDER_MANAGE", "SERVICE_BILLING_VIEW", "SERVICE_BILLING_MANAGE", "PARTS_VIEW", "PARTS_MANAGE", "DIAGNOSTIC_CASE_VIEW", "DIAGNOSTIC_ESTIMATE_ADVISOR_REVIEW"];
    const result = snapshot.users.map(user => {
      const direct = user.userDuties.map(item => item.duty.name), roleDefaults = user.userRoles.flatMap(item => item.role.roleDuties.map(item => item.duty.name));
      const actor = { id: user.id, name: user.name, email: user.email, isActive: user.isActive, roles: user.userRoles.map(item => item.role.name), duties: { direct, roleDefaults, all: [...new Set([...direct, ...roleDefaults])] } };
      const grants = snapshot.grants.filter(grant => grant.userId === user.id);
      return { ...actor, manager: isManager(actor), grants, locations: snapshot.locations.map(location => ({ ...location, capabilities: Object.fromEntries(capabilities.map(capability => [capability, evaluateVehicleCapability({ actor, capability, grants, locationId: location.id, now })])), rollout: { shop: evaluateVehicleOperationsFeature(snapshot.flags, "SHOP_OPERATIONS", actor.id, location.id), parts: evaluateVehicleOperationsFeature(snapshot.flags, "PARTS_OPERATIONS", actor.id, location.id), diagnosticsPublishing: evaluateDiagnosticsFeature(snapshot.flags, "DIAGNOSTIC_PUBLISHING", actor.id, location.id) } })) };
    });
    console.log(JSON.stringify({ evaluatedAt: now.toISOString(), schema: target.searchParams.get("schema"), users: result, flags: snapshot.flags.filter(flag => ["VEHICLE_OPERATIONS_MASTER", "SHOP_OPERATIONS", "PARTS_OPERATIONS", "DIAGNOSTICS_MASTER", "DIAGNOSTIC_PUBLISHING"].includes(flag.code)).map(({ code, locationId, mode, allowedUserIds, rolloutPercent }) => ({ code, locationId, mode, allowedUserIds, rolloutPercent })) }, null, 2));
  } finally { await db.$disconnect(); }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "Access audit failed"); process.exitCode = 1; });
