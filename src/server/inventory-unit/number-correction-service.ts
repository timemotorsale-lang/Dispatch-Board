import type { PrismaClient } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError, hashEnterpriseCommand, normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { describeVehicleOperationsBlock, evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { executeInventoryMutation } from "./repository";

export type InventoryNumberCorrectionDependencies = { database?: PrismaClient; organizationId?: string; now?: () => Date; enforceRollout?: boolean };
export type InventoryNumberCorrectionResult = { id: string; inventoryNumber: string; version: number };

export class InventoryNumberCorrectionError extends Error {
  constructor(message: string, public readonly status: number = 400) { super(message); }
}

export function normalizeInventoryNumberCorrection(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InventoryNumberCorrectionError("Inventory number correction is required.");
  const data = value as Record<string, unknown>;
  const rawNumber = typeof data.inventoryNumber === "string" ? data.inventoryNumber.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/.test(rawNumber)) throw new InventoryNumberCorrectionError("Inventory number must contain 1–100 ASCII letters, digits, or hyphens and start with a letter or digit.");
  if (typeof data.expectedVersion !== "number" || !Number.isSafeInteger(data.expectedVersion) || data.expectedVersion < 0) throw new InventoryNumberCorrectionError("Expected version must be a non-negative integer.");
  if (typeof data.idempotencyKey !== "string" || !data.idempotencyKey.trim()) throw new InventoryNumberCorrectionError("Idempotency key is required.");
  if (typeof data.reason !== "string" || data.reason.trim().length < 10) throw new InventoryNumberCorrectionError("Inventory number corrections require a reason of at least 10 characters.");
  return { inventoryNumber: rawNumber.toUpperCase(), expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey.trim(), reason: data.reason.trim() };
}

export async function correctInventoryUnitNumber(actor: AuthenticatedUser | null, id: string, value: unknown, input: InventoryNumberCorrectionDependencies = {}): Promise<InventoryNumberCorrectionResult> {
  const user = assertAuthenticatedUser(actor);
  const data = normalizeInventoryNumberCorrection(value);
  const database = input.database ?? prisma;
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const now = input.now ?? (() => new Date());
  const foundation = createEnterpriseCommandRepository(database);
  const authorize = async (unit: { locationId: string; ownerUserId: string }) => {
    const grants = await foundation.listCapabilityGrants(user.id, organizationId);
    for (const capability of ["INVENTORY_UNIT_VIEW", "INVENTORY_ACQUISITION_MANAGE"] as const) {
      assertVehicleCapability({ actor: user, capability, grants, locationId: unit.locationId, resourceOwnerUserId: unit.ownerUserId, requestedFields: ["inventoryNumber"], now: now() });
    }
    if (input.enforceRollout ?? true) {
      const flags = await foundation.listFeatureFlags(organizationId);
      const decision = evaluateVehicleOperationsFeature(flags, "RETAIL_INVENTORY", user.id, unit.locationId);
      if (!decision.executable) throw new InventoryNumberCorrectionError(`Retail inventory mutations are not enabled. ${describeVehicleOperationsBlock(decision.reason)}`, 403);
    }
  };
  const selected = await database.inventoryUnit.findFirst({ where: { id, organizationId, closedAt: null }, select: { locationId: true, ownerUserId: true } });
  if (!selected) throw new InventoryNumberCorrectionError("Open inventory unit was not found.", 404);
  await authorize(selected);
  const command = normalizeEnterpriseCommand({ actorUserId: user.id, organizationId, locationId: selected.locationId, domain: "RETAIL_INVENTORY", subjectType: "INVENTORY_UNIT", subjectId: id, commandType: "CORRECT_INVENTORY_NUMBER", expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, reason: data.reason, payload: { inventoryNumber: data.inventoryNumber } });
  command.requestHash = hashEnterpriseCommand({ actorUserId: user.id, organizationId, domain: command.domain, subjectType: command.subjectType, subjectId: command.subjectId, commandType: command.commandType, ...data });
  const receipt = await database.$transaction(async (transaction) => {
    const retryScope = JSON.stringify([organizationId, command.domain, command.commandType, command.idempotencyKey]);
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${retryScope}))`;
    const transactionalDatabase = { $transaction: async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction) } as unknown as PrismaClient;
    return executeInventoryMutation(transactionalDatabase, command, async (tx, version) => {
      await tx.$executeRaw`SELECT 1 FROM "InventoryUnit" WHERE id = ${id} AND "organizationId" = ${organizationId} FOR UPDATE`;
      const unit = await tx.inventoryUnit.findFirst({ where: { id, organizationId, closedAt: null } });
      if (!unit) throw new InventoryNumberCorrectionError("Open inventory unit was not found.", 404);
      await authorize(unit);
      if (unit.version !== data.expectedVersion || unit.locationId !== selected.locationId) throw new EnterpriseCommandConflictError("Inventory changed; reload before correcting its number.", "VERSION_CONFLICT");
      const allocationScope = JSON.stringify([organizationId, "INVENTORY_NUMBER_ALLOCATION"]);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${allocationScope}))`;
      const collision = await tx.inventoryUnit.findFirst({ where: { organizationId, id: { not: id }, inventoryNumber: { equals: data.inventoryNumber, mode: "insensitive" } }, select: { id: true } });
      if (collision) throw new InventoryNumberCorrectionError("Inventory number is already in use. Choose another number.", 409);
      await tx.inventoryUnit.update({ where: { id: unit.id }, data: { inventoryNumber: data.inventoryNumber, version } });
      await tx.inventoryUnitStateEvent.create({ data: { organizationId, inventoryUnitId: unit.id, version, fromStage: unit.lifecycleStage, toStage: unit.lifecycleStage, fromOperatingState: unit.operatingState, toOperatingState: unit.operatingState, ownerUserId: unit.ownerUserId, locationId: unit.locationId, targetAt: unit.targetAt, nextAction: unit.nextAction, reason: `${data.reason} (${unit.inventoryNumber} → ${data.inventoryNumber})`, source: "USER", actorUserId: user.id, correlationId: command.correlationId } });
      return { previous: { id: unit.id, inventoryNumber: unit.inventoryNumber, version: unit.version }, result: { id: unit.id, inventoryNumber: data.inventoryNumber, version } };
    });
  });
  return receipt.result as InventoryNumberCorrectionResult;
}
