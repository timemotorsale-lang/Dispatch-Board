import { prisma } from "../src/server/db/client";
import { toAuthenticatedUser } from "../src/server/auth/store";
import { createEnterpriseCommandRepository } from "../src/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature, describeVehicleOperationsBlock } from "../src/server/enterprise-command/service";
import { evaluateVehicleCapability, type VehicleCapability } from "../src/server/enterprise-command/vehicle-capabilities";
import { INVENTORY_TEAM_FUNCTIONS } from "../src/lib/inventory-team-functions";
import { INITIAL_ORGANIZATION } from "../src/server/appointments/location-foundation";

async function main() {
  const args = process.argv.slice(2);
  const option = (name: string) => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1]?.trim() || null; };
  const userId = option("--user-id"), locationId = option("--location-id");
  if (!userId) throw new Error("Provide --user-id and optionally --location-id. This check is read-only.");
  const target = new URL(process.env.DATABASE_URL!);
  console.log(JSON.stringify({ target: { host: target.hostname, port: target.port, database: target.pathname }, userId, locationId, readOnly: true }));
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { userRoles: { include: { role: { include: { roleDuties: { include: { duty: true } } } } } }, userDuties: { include: { duty: true } } } });
  if (!user) throw new Error("Staff account was not found in this database.");
  const actor = toAuthenticatedUser(user), repository = createEnterpriseCommandRepository();
  const [flags, grants, functions] = await Promise.all([
    repository.listFeatureFlags(INITIAL_ORGANIZATION.id),
    repository.listCapabilityGrants(userId, INITIAL_ORGANIZATION.id),
    prisma.duty.count({ where: { name: { in: INVENTORY_TEAM_FUNCTIONS.map(item => item.name) } } })
  ]);
  const rollout = (["INVENTORY_INTAKE", "RETAIL_INVENTORY", "SHOP_OPERATIONS", "PARTS_OPERATIONS"] as const).map(code => {
    const decision = evaluateVehicleOperationsFeature(flags, code, userId, locationId);
    return { code, executable: decision.executable, reason: decision.reason, ...(decision.executable ? {} : { action: describeVehicleOperationsBlock(decision.reason) }) };
  });
  const permissions = (["INVENTORY_UNIT_VIEW", "INVENTORY_INTAKE_EDIT", "INVENTORY_ACQUISITION_MANAGE", "INVENTORY_RECON_MANAGE", "INVENTORY_READINESS_VERIFY", "INVENTORY_PRICING_MANAGE", "INVENTORY_PUBLISH_MANAGE", "INVENTORY_RELEASE_MANAGE"] satisfies VehicleCapability[]).map(capability => ({ capability, ...evaluateVehicleCapability({ actor, capability, grants, locationId }) }));
  console.log(JSON.stringify({ functionsAvailable: functions, rollout, permissions }, null, 2));
  if (functions !== INVENTORY_TEAM_FUNCTIONS.length || rollout.some(item => !item.executable) || permissions.some(item => !item.allowed)) process.exitCode = 1;
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Inventory access check failed."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
