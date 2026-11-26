import type { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { requireUnifiedCrmCustomerNotePolicy } from "@/server/unified-crm/customer-note-access";
import { resolveCustomerToolsOrganization } from "./customer-wishlist";
import { addVehicleRelationship, getVehicleRegistryDetail } from "@/server/vehicle-registry/service";

export class CustomerVehicleToolError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

async function vehicleToolScope(actor: AuthenticatedUser, customerId: string) {
  const writeScope = requireUnifiedCrmCustomerNotePolicy(actor);
  const organizationId = await resolveCustomerToolsOrganization(actor, customerId);
  if (!organizationId) throw new CustomerVehicleToolError("Customer record unavailable.", 404);
  if (writeScope.kind === "OWNER" && !await prisma.customer.findFirst({ where: { id: customerId, organizationId, ownerUserId: writeScope.ownerUserId, archivedAt: null, mergedIntoCustomerId: null }, select: { id: true } })) {
    throw new CustomerVehicleToolError("Only the owner can link a vehicle to this customer.", 403);
  }
  const foundationRepository = createEnterpriseCommandRepository();
  const [grants, flags] = await Promise.all([foundationRepository.listCapabilityGrants(actor.id, organizationId), foundationRepository.listFeatureFlags(organizationId)]);
  const now = new Date();
  if (!(["VEHICLE_OPERATIONS_VIEW", "VEHICLE_COMMAND_EXECUTE"] as const).every(capability => evaluateVehicleCapability({ actor, capability, grants, now, locationId: null }).allowed)) {
    throw new CustomerVehicleToolError("Your role cannot link vehicles. Ask an authorized vehicle registry user.", 403);
  }
  if (!evaluateVehicleOperationsFeature(flags, "VEHICLE_REGISTRY", actor.id, null).executable) {
    throw new CustomerVehicleToolError("Vehicle linking is not enabled for this workspace.", 403);
  }
  return { organizationId, foundationRepository, writeScope };
}

export async function customerVehicleToolsEnabled(actor: AuthenticatedUser, customerId: string) {
  return Boolean(await vehicleToolScope(actor, customerId));
}

async function assertNoVinConflict(db: Prisma.TransactionClient, organizationId: string, vin: string) {
  if (await db.vehicle.findFirst({ where: { organizationId, duplicateKey: `VIN:${vin}`, mergedIntoVehicleId: null }, select: { id: true } })) {
    throw new CustomerVehicleToolError("This VIN has an unresolved registry duplicate. Ask the vehicle registry team to review it.", 409);
  }
}

async function assertNotOpenInventory(db: Prisma.TransactionClient, organizationId: string, vehicleId: string) {
  if (await db.inventoryUnit.findFirst({ where: { organizationId, vehicleId, closedAt: null }, select: { id: true } })) {
    throw new CustomerVehicleToolError("This vehicle is in inventory. Select it on the deal instead of adding a customer service link.", 409);
  }
}

function currentLegacyVehicleLink(db: Prisma.TransactionClient, customerId: string, vehicleId: string, at: Date) {
  return db.customerVehicle.findFirst({ where: { customerId, vehicleId, effectiveFrom: { lte: at }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }] }, select: { id: true } });
}

async function selection(actor: AuthenticatedUser, customerId: string, vehicleId: string, scope: Awaited<ReturnType<typeof vehicleToolScope>>) {
  const row = await prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId: scope.organizationId, status: "ACTIVE", mergedIntoVehicleId: null }, select: { id: true } });
  if (!row) throw new CustomerVehicleToolError("An active matching vehicle was not found. Use the existing service check-in if it still needs to be registered.", 404);
  const vehicle = await getVehicleRegistryDetail(actor, row.id, scope);
  await assertNotOpenInventory(prisma, scope.organizationId, vehicleId);
  const now = new Date();
  const active = await prisma.vehicleRelationship.findMany({ where: { organizationId: scope.organizationId, vehicleId, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }, select: { customerId: true, relationshipType: true } });
  const linked = Boolean(await currentLegacyVehicleLink(prisma, customerId, vehicleId, now)) || active.some(link => link.customerId === customerId && ["CUSTOMER_OWNER", "CUSTOMER_DRIVER", "SERVICE_ONLY", "SOLD_TO_CUSTOMER"].includes(link.relationshipType));
  if (!linked && active.some(link => ["DEALERSHIP_OWNED", "TRADE_IN", "CONSIGNMENT"].includes(link.relationshipType))) {
    throw new CustomerVehicleToolError("This vehicle is in inventory. Select it on the deal instead of adding a customer service link.", 409);
  }
  return { id: vehicle.id, label: [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber, vin: vehicle.vin, version: vehicle.version, linked };
}

export async function lookupCustomerVehicle(actor: AuthenticatedUser, customerId: string, vin: string | null) {
  const scope = await vehicleToolScope(actor, customerId);
  const query = vin?.trim().toUpperCase() ?? "";
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(query)) throw new CustomerVehicleToolError("Enter the exact 17-character VIN.");
  await assertNoVinConflict(prisma, scope.organizationId, query);
  const rows = await prisma.vehicle.findMany({ where: { organizationId: scope.organizationId, vin: query, status: "ACTIVE", mergedIntoVehicleId: null }, take: 2, select: { id: true } });
  if (!rows.length) throw new CustomerVehicleToolError("No active vehicle matched that VIN. Use service check-in to review or register it.", 404);
  if (rows.length > 1) throw new CustomerVehicleToolError("More than one record matches. Ask the vehicle registry team to resolve the duplicate.", 409);
  return selection(actor, customerId, rows[0].id, scope);
}

export async function linkCustomerVehicle(actor: AuthenticatedUser, customerId: string, input: { vehicleId?: unknown; version?: unknown; vin?: unknown }) {
  const scope = await vehicleToolScope(actor, customerId);
  if (typeof input.vehicleId !== "string" || !input.vehicleId || input.vehicleId.length > 100 || typeof input.version !== "number" || !Number.isInteger(input.version)) throw new CustomerVehicleToolError("Find and review the vehicle first.");
  const vin = typeof input.vin === "string" ? input.vin.trim().toUpperCase() : "";
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new CustomerVehicleToolError("Find and review the vehicle VIN first.");
  const vehicle = await selection(actor, customerId, input.vehicleId, scope);
  if (vehicle.vin !== vin) throw new CustomerVehicleToolError("This VIN changed after review. Find the vehicle again.", 409);
  await assertNoVinConflict(prisma, scope.organizationId, vin);
  if (vehicle.linked) return { duplicate: true };
  if (vehicle.version !== input.version) throw new CustomerVehicleToolError("This vehicle changed after review. Find it again before linking.", 409);
  await addVehicleRelationship(actor, vehicle.id, {
    customerId, expectedVersion: vehicle.version, effectiveFrom: new Date().toISOString(),
    relationshipType: "SERVICE_ONLY", sourceCode: "CRM_NEXT_CUSTOMER_360",
    idempotencyKey: crypto.randomUUID(), reason: "Staff confirmed the customer service relationship from Customer 360."
  }, { ...scope, validateRelationship: async tx => {
    await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${customerId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${vehicle.id} AND "organizationId" = ${scope.organizationId} FOR UPDATE`;
    const customer = await tx.customer.findFirst({ where: { id: customerId, organizationId: scope.organizationId, archivedAt: null, mergedIntoCustomerId: null,
      ...(scope.writeScope.kind === "OWNER" ? { ownerUserId: scope.writeScope.ownerUserId } : {}) }, select: { id: true } });
    if (!customer) throw new CustomerVehicleToolError("This customer is no longer available to you. Reopen the record.", 403);
    const current = await tx.vehicle.findFirst({ where: { id: vehicle.id, organizationId: scope.organizationId, status: "ACTIVE", mergedIntoVehicleId: null, vin, version: vehicle.version }, select: { id: true } });
    if (!current) throw new CustomerVehicleToolError("The vehicle changed. Find it again before linking.", 409);
    await assertNoVinConflict(tx, scope.organizationId, vin);
    await assertNotOpenInventory(tx, scope.organizationId, vehicle.id);
    const now = new Date();
    const currentLink = await tx.vehicleRelationship.findFirst({
      where: { organizationId: scope.organizationId, vehicleId: vehicle.id, effectiveFrom: { lte: now }, AND: [
        { OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
        { OR: [{ relationshipType: { in: ["DEALERSHIP_OWNED", "TRADE_IN", "CONSIGNMENT"] } }, { customerId }] }
      ] }, select: { id: true }
    });
    if (currentLink || await currentLegacyVehicleLink(tx, customerId, vehicle.id, now)) throw new CustomerVehicleToolError("This vehicle relationship changed. Find it again before linking.", 409);
  } });
  return { duplicate: false };
}
