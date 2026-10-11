import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability, evaluateVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { normalizeEvidenceGovernance, normalizeEvidenceUpload, stableEvidenceId } from "./domain";
import { createVehicle360Repository, type Vehicle360Repository } from "./repository";

type Dependencies = { now?: () => Date; organizationId?: string; repository?: Vehicle360Repository; foundationRepository?: EnterpriseCommandRepository; enforceRollout?: boolean };
function deps(input: Dependencies) { return { now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createVehicle360Repository(), foundationRepository: input.foundationRepository ?? createEnterpriseCommandRepository(), enforceRollout: input.enforceRollout ?? true }; }
function required(value: unknown, label: string, max = 500) { const result = typeof value === "string" ? value.trim() : ""; if (!result) throw new Error(`${label} is required.`); if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`); return result; }
function record(value: unknown): Record<string, unknown> { return value != null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }

export function projectVehicleSpecifications(vehicle: { canonicalOrigins?: unknown; color?: string | null; licensePlate?: string | null; licensePlateState?: string | null; make?: string | null; model?: string | null; specificationSnapshot?: unknown; vin?: string | null; year?: number | null }) {
  const snapshot = record(vehicle.specificationSnapshot), specifications = record(snapshot.specifications), fieldOrigins = record(snapshot.fieldOrigins), canonicalOrigins = record(vehicle.canonicalOrigins);
  const warnings = Array.isArray(snapshot.warnings) ? snapshot.warnings.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  return {
    available: Object.values(specifications).some((value) => value != null && value !== ""),
    addMode: typeof snapshot.addMode === "string" ? snapshot.addMode : null,
    canonical: { color: vehicle.color ?? null, licensePlate: vehicle.licensePlate ?? null, licensePlateState: vehicle.licensePlateState ?? null, make: vehicle.make ?? null, model: vehicle.model ?? null, vin: vehicle.vin ?? null, year: vehicle.year ?? null },
    canonicalOrigins,
    decodedAt: typeof snapshot.decodedAt === "string" ? snapshot.decodedAt : null,
    fieldOrigins,
    mappingVersion: typeof snapshot.mappingVersion === "number" ? snapshot.mappingVersion : null,
    provider: typeof snapshot.provider === "string" ? snapshot.provider : null,
    specifications,
    warnings
  };
}

async function auth(actor: AuthenticatedUser | null, capability: VehicleCapability, context: ReturnType<typeof deps>, mutation = false) {
  const user = assertAuthenticatedUser(actor), grants = await context.foundationRepository.listCapabilityGrants(user.id, context.organizationId);
  assertVehicleCapability({ actor: user, capability, grants, locationId: null, now: context.now() });
  if (mutation && context.enforceRollout) {
    const flags = await context.foundationRepository.listFeatureFlags(context.organizationId), decision = evaluateVehicleOperationsFeature(flags, "VEHICLE_360", user.id, null);
    if (!decision.executable) throw new Error(`Vehicle 360 mutations are not enabled (${decision.reason}).`);
  }
  return { grants, user };
}

function command(input: { actorUserId: string; commandType: string; expectedVersion: number; idempotencyKey: string; organizationId: string; payload: Record<string, unknown>; reason: string; subjectId: string }) {
  return normalizeEnterpriseCommand({ ...input, domain: "VEHICLE_EVIDENCE", locationId: null, subjectType: "VEHICLE_EVIDENCE" });
}

export async function uploadVehicleEvidence(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeEvidenceUpload(value, context.now()), { user } = await auth(actor, "VEHICLE_EVIDENCE_MANAGE", context, true), id = stableEvidenceId(context.organizationId, data.idempotencyKey);
  const subjectId = data.subjectId ?? data.vehicleId;
  const payload = { accessLevel: data.accessLevel, byteSize: data.content.length, category: data.category, checksumSha256: data.checksumSha256, contentType: data.contentType, fileName: data.fileName, malwareStatus: data.scan.malwareStatus, relationship: data.relationship, retentionUntil: data.retentionUntil.toISOString(), subjectId, subjectType: data.subjectType, vehicleId: data.vehicleId };
  return context.repository.createEvidence(command({ actorUserId: user.id, commandType: "UPLOAD_VEHICLE_EVIDENCE", expectedVersion: 0, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload, reason: data.reason, subjectId: id }), { ...payload, actorUserId: user.id, content: data.content, malwareScanner: data.scan.malwareScanner, reasonCode: data.scan.reasonCode, retentionUntil: data.retentionUntil });
}

export async function getVehicleSalesMedia(actor: AuthenticatedUser | null, vehicleId: string, input: Dependencies = {}) {
  const context = deps(input), { grants, user } = await auth(actor, "VEHICLE_EVIDENCE_VIEW", context);
  const collection = await context.repository.readSalesMedia(context.organizationId, required(vehicleId, "Vehicle ID", 100));
  const capability = evaluateVehicleCapability({ actor: user, capability: "VEHICLE_EVIDENCE_MANAGE", grants, locationId: null, now: context.now() });
  const rollout = !context.enforceRollout || evaluateVehicleOperationsFeature(await context.foundationRepository.listFeatureFlags(context.organizationId), "VEHICLE_360", user.id, null).executable;
  return { ...collection, canManage: capability.allowed && rollout };
}

export async function changeVehicleSalesMedia(actor: AuthenticatedUser | null, vehicleId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input), { user } = await auth(actor, "VEHICLE_EVIDENCE_MANAGE", context, true), raw = record(value);
  const expectedVersion = Number(raw.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) throw new Error("Expected media version is invalid.");
  const removeIds = raw.removeIds ?? [];
  const addIds = raw.addIds ?? [];
  if (!Array.isArray(addIds) || addIds.some(id => typeof id !== "string") || new Set(addIds).size !== addIds.length || addIds.length > 40) throw new Error("Intake photo selection is invalid.");
  if (!Array.isArray(removeIds) || removeIds.some(id => typeof id !== "string") || new Set(removeIds).size !== removeIds.length || removeIds.length > 45) throw new Error("Removal selection is invalid.");
  const id = required(vehicleId, "Vehicle ID", 100);
  return context.repository.changeSalesMedia(normalizeEnterpriseCommand({ actorUserId: user.id, commandType: "UPDATE_SALES_MEDIA", expectedVersion, idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200), organizationId: context.organizationId, domain: "VEHICLE_EVIDENCE", subjectType: "SALES_MEDIA", subjectId: id, locationId: null, payload: { order: raw.order, removeIds, addIds }, reason: required(raw.reason, "Business reason", 500) }), { order: raw.order, removeIds, addIds });
}

export async function updateVehicleEvidenceGovernance(actor: AuthenticatedUser | null, evidenceId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeEvidenceGovernance(value, context.now()), { user } = await auth(actor, "VEHICLE_EVIDENCE_MANAGE", context, true);
  const payload = { accessLevel: data.accessLevel, legalHold: data.legalHold, retentionUntil: data.retentionUntil?.toISOString() ?? null };
  return context.repository.updateEvidence(command({ actorUserId: user.id, commandType: "UPDATE_VEHICLE_EVIDENCE_GOVERNANCE", expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload, reason: data.reason, subjectId: required(evidenceId, "Evidence ID", 100) }), { ...data, actorUserId: user.id });
}

export async function deleteVehicleEvidence(actor: AuthenticatedUser | null, evidenceId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeEvidenceGovernance(value, context.now()), { user } = await auth(actor, "VEHICLE_EVIDENCE_MANAGE", context, true);
  return context.repository.deleteEvidence(command({ actorUserId: user.id, commandType: "DELETE_VEHICLE_EVIDENCE", expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: {}, reason: data.reason, subjectId: required(evidenceId, "Evidence ID", 100) }), user.id, context.now());
}

export async function downloadVehicleEvidence(actor: AuthenticatedUser | null, evidenceId: string, input: Dependencies = {}) {
  const context = deps(input), { grants, user } = await auth(actor, "VEHICLE_EVIDENCE_VIEW", context), evidence = await context.repository.getEvidence(context.organizationId, required(evidenceId, "Evidence ID", 100));
  if (!evidence || evidence.status === "DELETED") throw new Error("Evidence object was not found.");
  if (evidence.status !== "AVAILABLE" || evidence.malwareStatus !== "CLEAN") throw new Error("Evidence is quarantined and cannot be downloaded.");
  if (evidence.accessLevel === "RESTRICTED") assertVehicleCapability({ actor: user, capability: "VEHICLE_EVIDENCE_RESTRICTED_VIEW", grants, locationId: null, now: context.now() });
  await context.repository.recordEvidenceAccess(context.organizationId, evidence.id, user.id, "Authorized Vehicle 360 evidence download.");
  return { content: evidence.content, contentType: evidence.contentType, fileName: evidence.fileName };
}

export async function getVehicle360(actor: AuthenticatedUser | null, vehicleId: string, input: Dependencies = {}) {
  const context = deps(input), { grants, user } = await auth(actor, "VEHICLE_OPERATIONS_VIEW", context), projection = await context.repository.readVehicle360(context.organizationId, required(vehicleId, "Vehicle ID", 100));
  if (!projection) throw new Error("Vehicle was not found.");
  const allowed = (capability: VehicleCapability) => evaluateVehicleCapability({ actor: user, capability, grants, locationId: null, now: context.now() }).allowed;
  const access = { inventory: allowed("INVENTORY_UNIT_VIEW"), service: allowed("REPAIR_ORDER_VIEW"), parts: allowed("PARTS_VIEW"), documents: allowed("VEHICLE_EVIDENCE_VIEW"), restrictedDocuments: allowed("VEHICLE_EVIDENCE_RESTRICTED_VIEW"), audit: allowed("VEHICLE_HEALTH_VIEW") };
  const documents = access.documents ? projection.data.documents.filter((item) => item.evidenceObject.accessLevel !== "RESTRICTED" || access.restrictedDocuments).map((item) => ({ ...item, downloadUrl: item.evidenceObject.status === "AVAILABLE" ? `/api/vehicle-evidence/${item.evidenceObjectId}/content` : null })) : [];
  const parts = access.parts ? { demands: projection.data.repairOrders.flatMap((order) => order.repairJobs.flatMap((job) => job.partDemands.map((demand) => ({ ...demand, repairOrderId: order.id, repairOrderNumber: order.repairOrderNumber, repairJobId: job.id, jobNumber: job.jobNumber })))), custody: projection.data.partCustody } : { demands: [], custody: [] };
  const costs = access.service ? projection.data.repairOrders.map((order) => ({ repairOrderId: order.id, repairOrderNumber: order.repairOrderNumber, estimates: order.estimateVersions.map((estimate) => ({ id: estimate.id, version: estimate.version, status: estimate.status, laborSubtotalCents: estimate.laborSubtotalCents, partsSubtotalCents: estimate.partsSubtotalCents, feeSubtotalCents: estimate.feeSubtotalCents, taxCents: estimate.taxCents, discountCents: estimate.discountCents, totalCents: estimate.totalCents })), invoicePackages: order.invoicePackages })) : [];
  const decisions = access.service ? projection.data.repairOrders.flatMap((order) => order.authorizations.map((decision) => ({ ...decision, repairOrderNumber: order.repairOrderNumber }))) : [];
  const allowedNodeTypes = new Set(["VEHICLE", "CUSTOMER", "EXTERNAL_IDENTITY", "APPOINTMENT", "TASK", ...(access.inventory ? ["INVENTORY_UNIT"] : []), ...(access.service ? ["REPAIR_ORDER", "REPAIR_JOB"] : []), ...(access.parts ? ["PART"] : []), ...(access.documents ? ["DOCUMENT"] : [])]);
  const nodes = projection.graph.nodes.filter((node) => allowedNodeTypes.has(node.type) && (node.type !== "DOCUMENT" || documents.some((item) => item.evidenceObjectId === node.id))), nodeIds = new Set(nodes.map((node) => node.id));
  return {
    summary: projection.summary,
    timeline: projection.timeline.filter((item) => item.source !== "AUDIT" || access.audit).filter((item) => item.source !== "EVIDENCE" || documents.some((document) => document.evidenceObjectId === item.subjectId)),
    tabAccess: access,
    tabs: {
      overview: { vehicle: projection.data.vehicle },
      specifications: projectVehicleSpecifications(projection.data.vehicle),
      inventory: { allowed: access.inventory, items: access.inventory ? projection.data.inventory : [] },
      service: { allowed: access.service, repairOrders: access.service ? projection.data.repairOrders : [] },
      parts: { allowed: access.parts, ...parts },
      appointments: { allowed: true, items: projection.data.appointmentLinks },
      documents: { allowed: access.documents, items: documents },
      warranty: { allowed: access.service, items: access.service ? [...projection.data.warrantyCoverages, ...projection.data.warrantyClaims] : [] },
      communications: { allowed: access.service, items: access.service ? [...projection.data.customerStatuses, ...projection.data.servicePromises, ...projection.data.communicationPreferences, ...projection.data.estimateApprovals, ...projection.data.communications] : [] },
      costs: { allowed: access.service, items: costs },
      decisions: { allowed: access.service, items: decisions },
      audit: { allowed: access.audit, items: access.audit ? projection.data.audit : [] }
    },
    graph: { nodes, edges: projection.graph.edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)) }
  };
}
