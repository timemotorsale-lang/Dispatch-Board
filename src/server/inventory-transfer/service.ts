import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { normalizeVehicleIdentity } from "@/server/vehicle-registry/domain";
import { createRegistryVehicle } from "@/server/vehicle-registry/service";
import { EXPORT_FIELDS, inventoryCsv, mapInventoryCsv, type ImportPreview, type Mapping, type TransferRow } from "@/lib/inventory-transfer";

const organizationId = INITIAL_ORGANIZATION.id;
const foundation = createEnterpriseCommandRepository();
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Transfer request must be an object.");
  return value as Record<string, unknown>;
}
async function authorize(actor: AuthenticatedUser | null, capability: VehicleCapability, locationId: string, requestedFields?: string[]) {
  const user = assertAuthenticatedUser(actor);
  const grants = await foundation.listCapabilityGrants(user.id, organizationId);
  for (const required of ["VEHICLE_OPERATIONS_VIEW", capability] as VehicleCapability[]) assertVehicleCapability({ actor: user, capability: required, grants, locationId, requestedFields, now: new Date() });
  if (!locationId || !await prisma.location.findFirst({ where: { id: locationId, organizationId }, select: { id: true } })) throw new Error("Select a valid location.");
  return user;
}
async function authorizeImport(actor: AuthenticatedUser | null, locationId: string) {
  const user = await authorize(actor, "VEHICLE_IDENTITY_CREATE", locationId);
  const decision = evaluateVehicleOperationsFeature(await foundation.listFeatureFlags(organizationId), "VEHICLE_REGISTRY", user.id, locationId);
  if (!decision.executable) throw new Error(`Vehicle registry imports are not enabled (${decision.reason}).`);
  return user;
}
async function audit(user: AuthenticatedUser, locationId: string, batchId: string, eventType: string, data: unknown) {
  return prisma.enterpriseAuditEvent.create({ data: { organizationId, actorUserId: user.id, locationId, domain: "VEHICLE_REGISTRY", subjectType: "INVENTORY_TRANSFER", subjectId: batchId, eventType, reason: "Staff inventory data transfer", metadata: json(data), correlationId: batchId } });
}
async function duplicate(values: Record<string, string>) {
  const normalized = normalizeVehicleIdentity({ ...values, reason: "Inventory import", idempotencyKey: "duplicate-check" });
  return prisma.vehicle.findFirst({ where: { organizationId, OR: [
    { vehicleNumber: normalized.vehicleNumber },
    ...(normalized.vin ? [{ vin: normalized.vin }] : []),
    ...(normalized.stockNumberNormalized ? [{ stockNumberNormalized: normalized.stockNumberNormalized }] : []),
  ] }, select: { id: true, vehicleNumber: true } });
}

export async function previewInventoryImport(actor: AuthenticatedUser | null, value: unknown): Promise<ImportPreview> {
  const input = object(value);
  const locationId = typeof input.locationId === "string" ? input.locationId : "";
  const user = await authorizeImport(actor, locationId);
  if (typeof input.csv !== "string") throw new Error("Choose a CSV file.");
  const mapping = object(input.mapping) as Mapping;
  const mapped = mapInventoryCsv(input.csv, mapping);
  const batchId = randomUUID();
  const seen = new Set<string>();
  const rows: TransferRow[] = [];
  for (const [index, source] of mapped.entries()) {
    const values = { ...source, vehicleNumber: source.vehicleNumber || `IMP-${batchId.slice(0, 8)}-${index + 1}`, locationId, vehicleId: randomUUID() };
    try {
      const normalized = normalizeVehicleIdentity({ ...values, reason: "Inventory CSV import", idempotencyKey: `${batchId}:${index + 1}` });
      const keys = [`NUMBER:${normalized.vehicleNumber}`, ...(normalized.vin ? [`VIN:${normalized.vin}`] : []), ...(normalized.stockNumberNormalized ? [`STOCK:${normalized.stockNumberNormalized}`] : [])];
      const repeated = keys.some(key => seen.has(key));
      keys.forEach(key => seen.add(key));
      const existing = await duplicate(values);
      rows.push({ row: index + 2, vehicle: normalized.vin || normalized.vehicleNumber, values,
        status: repeated || existing ? "DUPLICATE" : "READY", message: repeated ? "Repeated vehicle in this file." : existing ? `Already recorded as ${existing.vehicleNumber}.` : "Ready to create vehicle record." });
    } catch (error) {
      rows.push({ row: index + 2, vehicle: source.vin || source.vehicleNumber || "Unknown vehicle", status: "INVALID", message: error instanceof Error ? error.message : "Invalid vehicle row." });
    }
  }
  const preview = { batchId, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), rows };
  await audit(user, locationId, batchId, "INVENTORY_IMPORT_PREVIEW", preview);
  return preview;
}

export async function applyInventoryImport(actor: AuthenticatedUser | null, value: unknown) {
  const input = object(value);
  const user = assertAuthenticatedUser(actor);
  if (typeof input.batchId !== "string") throw new Error("Preview the file before importing.");
  const saved = await prisma.enterpriseAuditEvent.findFirst({ where: { organizationId, actorUserId: user.id, subjectType: "INVENTORY_TRANSFER", subjectId: input.batchId, eventType: "INVENTORY_IMPORT_PREVIEW" } });
  if (!saved?.locationId) throw new Error("Import preview was not found for this staff account.");
  await authorizeImport(user, saved.locationId);
  const preview = saved.metadata as unknown as ImportPreview;
  if (Date.parse(preview.expiresAt) <= Date.now()) throw new Error("Preview expired. Preview the file again before importing.");
  const rows: TransferRow[] = [];
  for (const row of preview.rows) {
    if (row.status !== "READY" || !row.values) { rows.push(row); continue; }
    const idempotencyKey = `inventory-import:${preview.batchId}:${row.row}`;
    try {
      // The saved preview is actor-bound. Stable command keys make retries safe.
      const prior = await prisma.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId, domain: "VEHICLE_REGISTRY", commandType: "CREATE_VEHICLE", idempotencyKey } } });
      if (prior) {
        const result = prior.resultSnapshot as { id: string; duplicateReviewId?: string };
        rows.push({ ...row, status: result.duplicateReviewId ? "REVIEW" : "CREATED", vehicleId: result.id, message: "Previously imported by this batch." });
        continue;
      }
      const existing = await duplicate(row.values);
      if (existing) { rows.push({ ...row, status: "DUPLICATE", message: `Already recorded as ${existing.vehicleNumber}.` }); continue; }
      const result = await createRegistryVehicle(user, { ...row.values, idempotencyKey, reason: `Inventory CSV batch ${preview.batchId}` }, {}, { canonicalOrigins: { inventoryImportBatch: preview.batchId, csvRow: row.row }, vehicleId: row.values.vehicleId });
      const record = result.result as { id: string; duplicateReviewId?: string };
      rows.push({ ...row, status: record.duplicateReviewId ? "REVIEW" : "CREATED", vehicleId: record.id, message: record.duplicateReviewId ? "Duplicate review required." : "Vehicle record created." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      rows.push({ ...row, status: "FAILED", message: message.startsWith("Vehicle capability required") || message.startsWith("Vehicle registry mutations") ? message : "Could not create this row. Retry this batch or contact your administrator." });
    }
  }
  await audit(user, saved.locationId, preview.batchId, "INVENTORY_IMPORT_RESULT", { rows });
  return { batchId: preview.batchId, rows };
}

export async function exportInventory(actor: AuthenticatedUser | null, value: unknown, download = false) {
  const input = object(value);
  const locationId = typeof input.locationId === "string" ? input.locationId : "";
  const user = await authorize(actor, "VEHICLE_OUTPUT_CREATE", locationId);
  await authorize(user, "INVENTORY_UNIT_VIEW", locationId);
  const columns = Array.isArray(input.columns) ? input.columns.filter((item): item is string => typeof item === "string") : [];
  if (!columns.length || new Set(columns).size !== columns.length || columns.some(key => !EXPORT_FIELDS.some(([field]) => field === key))) throw new Error("Choose valid export columns.");
  await authorize(user, "VEHICLE_OUTPUT_CREATE", locationId, columns);
  const query = typeof input.query === "string" ? input.query.trim().slice(0, 100) : "";
  const items = await prisma.inventoryUnit.findMany({ where: { organizationId, locationId, closedAt: null, vehicle: { mergedIntoVehicleId: null, ...(query ? { OR: [{ vin: { contains: query.toUpperCase() } }, { stockNumber: { contains: query, mode: "insensitive" } }, { make: { contains: query, mode: "insensitive" } }, { model: { contains: query, mode: "insensitive" } }] } : {}) } }, take: 5001, orderBy: { inventoryNumber: "asc" }, select: { inventoryNumber: true, lifecycleStage: true, operatingState: true, financialAcquiredAt: true, location: { select: { name: true } }, vehicle: { select: { vin: true, stockNumber: true, vehicleNumber: true, year: true, make: true, model: true, color: true } } } });
  if (items.length > 5000) throw new Error("Export exceeds 5,000 vehicles. Narrow the search.");
  const headers = columns.map(key => EXPORT_FIELDS.find(([field]) => field === key)![1]);
  const rows = items.map(item => {
    const record: Record<string, string | number | null> = { ...item.vehicle, inventoryNumber: item.inventoryNumber, lifecycleStage: item.lifecycleStage, operatingState: item.operatingState, location: item.location?.name ?? "", financialAcquiredAt: item.financialAcquiredAt.toISOString() };
    return columns.map(key => record[key] ?? "");
  });
  if (!download) return { headers, rows: rows.slice(0, 25), total: rows.length };
  await audit(user, locationId, randomUUID(), "INVENTORY_EXPORT_GENERATED", { columns, query, count: rows.length });
  return { csv: inventoryCsv(headers, rows), total: rows.length };
}
