import type { Prisma } from "@prisma/client";

export function inventoryNumberBase(vin: string | null | undefined, vehicleId: string) {
  const normalized = vin?.trim().toUpperCase();
  if (normalized && /^[A-HJ-NPR-Z0-9]{17}$/.test(normalized)) return normalized.slice(-6);
  const fallback = vehicleId.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase();
  if (!fallback) throw new Error("A canonical vehicle identity is required to assign an inventory number.");
  return `INV-${fallback}`;
}

export async function allocateInventoryNumber(transaction: Pick<Prisma.TransactionClient, "$executeRaw" | "inventoryUnit">, organizationId: string, vehicle: { id: string; vin?: string | null }, requested: string | null) {
  const scope = JSON.stringify([organizationId, "INVENTORY_NUMBER_ALLOCATION"]);
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scope}))`;
  if (requested) {
    const duplicate = await transaction.inventoryUnit.findFirst({ where: { organizationId, inventoryNumber: { equals: requested, mode: "insensitive" } }, select: { id: true } });
    if (duplicate) throw new Error("Inventory number is already in use. Choose another number or leave it blank for automatic assignment.");
    return requested;
  }
  const base = inventoryNumberBase(vehicle.vin, vehicle.id);
  const existing = await transaction.inventoryUnit.findMany({ where: { organizationId, inventoryNumber: { startsWith: base, mode: "insensitive" } }, select: { inventoryNumber: true } });
  const used = new Set(existing.map(unit => unit.inventoryNumber.toUpperCase()));
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${base}-${suffix++}`;
  return candidate;
}
