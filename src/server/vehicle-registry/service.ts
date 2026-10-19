import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { normalizeLicensePlate, normalizeVehicleIdentity, odometerDisposition, previewVehicleImportRows } from "./domain";
import { createVehicleRegistryRepository, type RegistryCreationDetails, type VehicleRegistryRepository } from "./repository";

type Dependencies = { now?: () => Date; organizationId?: string; repository?: VehicleRegistryRepository; foundationRepository?: EnterpriseCommandRepository; enforceRollout?: boolean };
function deps(input: Dependencies) { return { now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createVehicleRegistryRepository(), foundationRepository: input.foundationRepository ?? createEnterpriseCommandRepository(), enforceRollout: input.enforceRollout ?? true }; }
function record(value: unknown, label = "Request") { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`); return value as Record<string, unknown>; }
function required(value: unknown, label: string, max = 500) { const result = typeof value === "string" ? value.trim() : ""; if (!result) throw new Error(`${label} is required.`); if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`); return result; }
function expected(value: unknown) { const result = Number(value); if (!Number.isInteger(result) || result < 0) throw new Error("Expected vehicle version must be a non-negative whole number."); return result; }
function date(value: unknown, label: string) { const result = new Date(required(value, label)); if (Number.isNaN(result.getTime())) throw new Error(`${label} must be a valid date and time.`); return result; }
function enumValue<T extends string>(value: unknown, label: string, allowed: readonly T[]) { const result = String(value ?? "") as T; if (!allowed.includes(result)) throw new Error(`${label} is invalid.`); return result; }

async function authorize(actor: AuthenticatedUser | null, capability: VehicleCapability, locationId: string | null, input: ReturnType<typeof deps>, mutation = false) {
  const user = assertAuthenticatedUser(actor);
  const foundation = input.foundationRepository;
  const grants = await foundation.listCapabilityGrants(user.id, input.organizationId);
  assertVehicleCapability({ actor: user, capability, grants, locationId, now: input.now() });
  if (mutation && input.enforceRollout) {
    const flags = await foundation.listFeatureFlags(input.organizationId);
    const decision = evaluateVehicleOperationsFeature(flags, "VEHICLE_REGISTRY", user.id, locationId);
    if (!decision.executable) throw new Error(`Vehicle registry mutations are not enabled (${decision.reason}).`);
  }
  return user;
}

function command(input: { actorUserId: string; commandType: string; expectedVersion: number; idempotencyKey: string; locationId: string | null; organizationId: string; payload: Record<string, unknown>; reason: string; subjectId: string }) {
  return normalizeEnterpriseCommand({ actorUserId: input.actorUserId, commandType: input.commandType, domain: "VEHICLE_REGISTRY", expectedVersion: input.expectedVersion, idempotencyKey: input.idempotencyKey, locationId: input.locationId, organizationId: input.organizationId, payload: input.payload, reason: input.reason, subjectId: input.subjectId, subjectType: "VEHICLE" });
}

export async function listVehicleRegistry(actor: AuthenticatedUser | null, query: { page?: unknown; pageSize?: unknown; query?: unknown }, input: Dependencies = {}) {
  const context = deps(input); await authorize(actor, "VEHICLE_OPERATIONS_VIEW", null, context);
  const page = Math.max(1, Number(query.page) || 1); const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
  return context.repository.search(context.organizationId, { page, pageSize, query: typeof query.query === "string" ? query.query : "" });
}

export async function getVehicleRegistryCreateOptions(actor: AuthenticatedUser | null, input: Dependencies = {}) {
  const context = deps(input); await authorize(actor, "VEHICLE_OPERATIONS_VIEW", null, context);
  return { locations: await context.repository.getCreateOptions(context.organizationId) };
}

export async function getVehicleRegistryDetail(actor: AuthenticatedUser | null, vehicleId: string, input: Dependencies = {}) {
  const context = deps(input); await authorize(actor, "VEHICLE_OPERATIONS_VIEW", null, context);
  const vehicle = await context.repository.getDetail(context.organizationId, required(vehicleId, "Vehicle ID", 100));
  if (!vehicle) throw new Error("Vehicle was not found.");
  return vehicle;
}

export async function createRegistryVehicle(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}, trustedCreation: RegistryCreationDetails = {}) {
  const context = deps(input); const raw = record(value, "Vehicle create request"); const id = randomUUID();
  const normalized = normalizeVehicleIdentity({ ...raw, vehicleNumber: typeof raw.vehicleNumber === "string" && raw.vehicleNumber.trim() ? raw.vehicleNumber : `VEH-${id.slice(0, 8).toUpperCase()}` });
  const { idempotencyKey, locationId, reason, ...identity } = normalized;
  const user = await authorize(actor, "VEHICLE_IDENTITY_CREATE", locationId, context, true);
  const workflowContext = raw.workflowContext && typeof raw.workflowContext === "object" && !Array.isArray(raw.workflowContext) ? raw.workflowContext as Record<string, unknown> : null;
  const payload = workflowContext ? { ...identity, workflowContext } : identity;
  const createCommand = command({ actorUserId: user.id, commandType: "CREATE_VEHICLE", expectedVersion: 0, idempotencyKey, locationId, organizationId: context.organizationId, payload: { ...payload, canonicalOrigins: trustedCreation.canonicalOrigins ?? {}, specificationSource: trustedCreation.specificationSnapshot ? "NHTSA_VPIC" : null, initialOdometer: trustedCreation.initialOdometer ? { reading: trustedCreation.initialOdometer.reading, unit: trustedCreation.initialOdometer.unit } : null }, reason, subjectId: id });
  return trustedCreation.rejectDuplicateIdentity || trustedCreation.canonicalOrigins || trustedCreation.specificationSnapshot || trustedCreation.initialOdometer ? context.repository.createVehicle(createCommand, identity, trustedCreation) : context.repository.createVehicle(createCommand, identity);
}

export async function findVehicleRegistryByPlate(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const context = deps(input); await authorize(actor, "VEHICLE_OPERATIONS_VIEW", null, context);
  const raw = record(value, "Plate lookup request"); const plate = normalizeLicensePlate(raw.licensePlate, raw.licensePlateState);
  if (!plate.raw || !plate.normalized || !plate.state) throw new Error("License plate and issuing state are required.");
  return context.repository.findByPlate(context.organizationId, plate.state, plate.normalized, plate.raw);
}

export async function correctRegistryVehicle(actor: AuthenticatedUser | null, vehicleId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input); const raw = record(value, "Vehicle correction request"); const normalized = normalizeVehicleIdentity(raw);
  const { idempotencyKey, locationId, reason, ...identity } = normalized;
  const user = await authorize(actor, "VEHICLE_COMMAND_EXECUTE", locationId, context, true);
  return context.repository.correctIdentity(command({ actorUserId: user.id, commandType: "CORRECT_VEHICLE_IDENTITY", expectedVersion: expected(raw.expectedVersion), idempotencyKey, locationId, organizationId: context.organizationId, payload: identity, reason, subjectId: required(vehicleId, "Vehicle ID") }), identity);
}

export async function correctRegistryVehicleColor(actor: AuthenticatedUser | null, vehicleId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input); const raw = record(value, "Vehicle color correction request"); const locationId = typeof raw.locationId === "string" ? raw.locationId : null;
  const color = required(raw.color, "Vehicle color", 100);
  const reason = typeof raw.reason === "string" && raw.reason.trim() ? raw.reason.trim() : "Record vehicle color from staff observation.";
  const user = await authorize(actor, "VEHICLE_COMMAND_EXECUTE", locationId, context, true);
  return context.repository.correctColor(command({ actorUserId: user.id, commandType: "CORRECT_VEHICLE_COLOR", expectedVersion: expected(raw.expectedVersion), idempotencyKey: required(raw.idempotencyKey, "Idempotency key"), locationId, organizationId: context.organizationId, payload: { color }, reason, subjectId: required(vehicleId, "Vehicle ID") }), color);
}

export async function addVehicleRelationship(actor: AuthenticatedUser | null, vehicleId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input); const raw = record(value); const locationId = typeof raw.locationId === "string" ? raw.locationId : null;
  const user = await authorize(actor, "VEHICLE_COMMAND_EXECUTE", locationId, context, true); const reason = required(raw.reason, "Business reason");
  const relationshipType = enumValue(raw.relationshipType, "Relationship type", ["CUSTOMER_OWNER", "CUSTOMER_DRIVER", "DEALERSHIP_OWNED", "TRADE_IN", "CONSIGNMENT", "SOLD_TO_CUSTOMER", "SERVICE_ONLY", "OTHER"] as const);
  const customerId = typeof raw.customerId === "string" && raw.customerId.trim() ? raw.customerId.trim() : null;
  if (["CUSTOMER_OWNER", "CUSTOMER_DRIVER", "SOLD_TO_CUSTOMER", "SERVICE_ONLY"].includes(relationshipType) && !customerId) throw new Error("This relationship type requires a customer.");
  const effectiveFrom = date(raw.effectiveFrom, "Effective from"); const effectiveTo = raw.effectiveTo ? date(raw.effectiveTo, "Effective to") : null;
  if (effectiveTo && effectiveTo < effectiveFrom) throw new Error("Effective to cannot be before effective from.");
  const payload = { customerId, effectiveFrom: effectiveFrom.toISOString(), effectiveTo: effectiveTo?.toISOString() ?? null, relationshipType, sourceCode: required(raw.sourceCode, "Source code", 100) };
  const cmd = command({ actorUserId: user.id, commandType: "ADD_VEHICLE_RELATIONSHIP", expectedVersion: expected(raw.expectedVersion), idempotencyKey: required(raw.idempotencyKey, "Idempotency key"), locationId, organizationId: context.organizationId, payload, reason, subjectId: vehicleId });
  return context.repository.addRelationship(cmd, { organizationId: context.organizationId, vehicleId, customerId, relationshipType, effectiveFrom, effectiveTo, sourceCode: payload.sourceCode, sourceReference: typeof raw.sourceReference === "string" ? raw.sourceReference.trim() || null : null, notes: typeof raw.notes === "string" ? raw.notes.trim() || null : null });
}

export async function addVehicleExternalIdentity(actor: AuthenticatedUser | null, vehicleId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input); const raw = record(value); const locationId = typeof raw.locationId === "string" ? raw.locationId : null; const user = await authorize(actor, "VEHICLE_COMMAND_EXECUTE", locationId, context, true); const reason = required(raw.reason, "Business reason");
  const payload = { authority: required(raw.authority, "Identity authority", 100), externalId: required(raw.externalId, "External ID", 200), mappingVersion: Number(raw.mappingVersion ?? 1), systemCode: required(raw.systemCode, "System code", 100).toUpperCase() };
  if (!Number.isInteger(payload.mappingVersion) || payload.mappingVersion < 1) throw new Error("Mapping version must be a positive whole number.");
  const cmd = command({ actorUserId: user.id, commandType: "ADD_EXTERNAL_VEHICLE_IDENTITY", expectedVersion: expected(raw.expectedVersion), idempotencyKey: required(raw.idempotencyKey, "Idempotency key"), locationId, organizationId: context.organizationId, payload, reason, subjectId: vehicleId });
  return context.repository.addExternalIdentity(cmd, { organizationId: context.organizationId, vehicleId, ...payload, lastSyncedAt: raw.lastSyncedAt ? date(raw.lastSyncedAt, "Last synced at") : null, conflictStatus: "CLEAR" });
}

export async function addVehicleOdometerObservation(actor: AuthenticatedUser | null, vehicleId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input); const raw = record(value); const locationId = typeof raw.locationId === "string" ? raw.locationId : null; const user = await authorize(actor, "VEHICLE_COMMAND_EXECUTE", locationId, context, true); const reason = required(raw.reason, "Business reason");
  const reading = Number(raw.reading); const observedAt = date(raw.observedAt, "Observed at"); const correctionOfId = typeof raw.correctionOfId === "string" ? raw.correctionOfId.trim() || null : null;
  const latest = await context.repository.latestOdometer(context.organizationId, vehicleId); const disposition = odometerDisposition({ correctionOfId, latest, observedAt, reading });
  const payload = { correctionOfId, observedAt: observedAt.toISOString(), reading, sourceCode: required(raw.sourceCode, "Source code", 100), status: disposition.status, unit: enumValue(raw.unit ?? "MILES", "Odometer unit", ["MILES", "KILOMETERS"] as const) };
  const cmd = command({ actorUserId: user.id, commandType: correctionOfId ? "CORRECT_ODOMETER" : "RECORD_ODOMETER", expectedVersion: expected(raw.expectedVersion), idempotencyKey: required(raw.idempotencyKey, "Idempotency key"), locationId, organizationId: context.organizationId, payload, reason, subjectId: vehicleId });
  return context.repository.addOdometer(cmd, { organizationId: context.organizationId, vehicleId, reading, observedAt, unit: payload.unit, sourceCode: payload.sourceCode, sourceReference: typeof raw.sourceReference === "string" ? raw.sourceReference.trim() || null : null, status: disposition.status, exceptionReason: disposition.exceptionReason, correctionOfId, recordedByUserId: user.id });
}

export async function addVehicleCustodyEvent(actor: AuthenticatedUser | null, vehicleId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input); const raw = record(value); const locationId = typeof raw.locationId === "string" && raw.locationId.trim() ? raw.locationId.trim() : null; const user = await authorize(actor, "VEHICLE_COMMAND_EXECUTE", locationId, context, true); const reason = required(raw.reason, "Business reason");
  const payload = { custodianType: required(raw.custodianType, "Custodian type", 100), eventType: enumValue(raw.eventType, "Custody event type", ["CHECK_IN", "CHECK_OUT", "LOT_MOVE", "BAY_MOVE", "TRANSPORT_PICKUP", "TRANSPORT_DELIVERY", "CUSTOMER_DELIVERY", "CORRECTION"] as const), locationId, occurredAt: date(raw.occurredAt, "Occurred at").toISOString(), sourceCode: required(raw.sourceCode, "Source code", 100) };
  const cmd = command({ actorUserId: user.id, commandType: "RECORD_CUSTODY_EVENT", expectedVersion: expected(raw.expectedVersion), idempotencyKey: required(raw.idempotencyKey, "Idempotency key"), locationId, organizationId: context.organizationId, payload, reason, subjectId: vehicleId });
  return context.repository.addCustody(cmd, { organizationId: context.organizationId, vehicleId, locationId, eventType: payload.eventType, custodianType: payload.custodianType, custodianId: typeof raw.custodianId === "string" ? raw.custodianId.trim() || null : null, positionLabel: typeof raw.positionLabel === "string" ? raw.positionLabel.trim() || null : null, occurredAt: new Date(payload.occurredAt), sourceCode: payload.sourceCode, sourceReference: typeof raw.sourceReference === "string" ? raw.sourceReference.trim() || null : null, reason, recordedByUserId: user.id });
}

export async function resolveVehicleDuplicate(actor: AuthenticatedUser | null, vehicleId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input); const raw = record(value); const user = await authorize(actor, "VEHICLE_DUPLICATE_RESOLVE", null, context, true); const reason = required(raw.reason, "Resolution reason");
  const resolution = enumValue(raw.resolution, "Duplicate resolution", ["CONFIRMED_DISTINCT", "MERGED", "DISMISSED"] as const); const caseId = required(raw.caseId, "Duplicate case ID");
  const cmd = command({ actorUserId: user.id, commandType: "RESOLVE_VEHICLE_DUPLICATE", expectedVersion: expected(raw.expectedVersion), idempotencyKey: required(raw.idempotencyKey, "Idempotency key"), locationId: null, organizationId: context.organizationId, payload: { caseId, resolution }, reason, subjectId: vehicleId });
  return context.repository.resolveDuplicate(cmd, { caseId, resolution, reason, resolvedByUserId: user.id });
}

export async function previewVehicleRegistryImport(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const context = deps(input); await authorize(actor, "VEHICLE_OPERATIONS_VIEW", null, context); const raw = record(value, "Import preview request"); if (!Array.isArray(raw.rows)) throw new Error("Import preview rows must be an array.");
  const rows = previewVehicleImportRows(raw.rows);
  const evaluated = await Promise.all(rows.map(async (row) => row.status === "INVALID" ? row : { ...row, potentialDuplicate: await context.repository.findPotentialDuplicate(context.organizationId, row.normalized) }));
  return { rows: evaluated, summary: { total: evaluated.length, invalid: evaluated.filter((row) => row.status === "INVALID").length, potentialDuplicates: evaluated.filter((row) => "potentialDuplicate" in row && row.potentialDuplicate).length } };
}
