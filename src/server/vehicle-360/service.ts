import type { AuthenticatedUser } from "@/server/auth/store";
import { repairEvidenceNeedsPhoto, repairProcedureEvidenceRequirements } from "@/lib/repair-procedure-evidence";
import { repairProcedurePhotoSubject, repairProcedurePhotoSubjectType } from "@/server/shop-execution/procedure-photo";
import { repairOrderAttachmentSubject, repairOrderAttachmentTypes, repairOrderAttachmentMaxBytes } from "@/lib/repair-order-attachments";
import { isManager } from "@/server/policies/access";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability, evaluateVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { normalizeEvidenceGovernance, normalizeEvidenceUpload, stableEvidenceId, VEHICLE_EVIDENCE_MAX_BYTES } from "./domain";
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

function command(input: { actorUserId: string; commandType: string; expectedVersion: number; idempotencyKey: string; organizationId: string; locationId?: string; payload: Record<string, unknown>; reason: string; subjectId: string }) {
  return normalizeEnterpriseCommand({ ...input, domain: "VEHICLE_EVIDENCE", locationId: input.locationId ?? null, subjectType: "VEHICLE_EVIDENCE" });
}

export async function uploadVehicleEvidence(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const context = deps(input);
  const { user } = await auth(actor, "VEHICLE_EVIDENCE_MANAGE", context, true);
  const subjectType = String(record(value).subjectType ?? "").trim().toUpperCase();
  if (subjectType === repairOrderAttachmentSubject) throw new Error("Attach documents and photos from the repair workbench.");
  if (subjectType === repairProcedurePhotoSubjectType) {
    throw new Error("Attach procedure photos from the technician work order.");
  }
  return saveEvidenceUpload(context, user, value);
}

type RepairOrderEvidenceContext = { id: string; organizationId: string; locationId: string; vehicleId: string };

async function repairOrderEvidenceAccess(actor: AuthenticatedUser | null, order: RepairOrderEvidenceContext, context: ReturnType<typeof deps>) {
  const user = assertAuthenticatedUser(actor);
  const grants = await context.foundationRepository.listCapabilityGrants(user.id, order.organizationId);
  const now = context.now();
  const locationId = order.locationId;
  const allowed = (capability: VehicleCapability) => evaluateVehicleCapability({ actor: user, capability, grants, locationId, now }).allowed;
  return { user, grants, now, canView: allowed("REPAIR_ORDER_VIEW") && allowed("VEHICLE_EVIDENCE_VIEW"), canManage: allowed("VEHICLE_EVIDENCE_MANAGE") };
}

export async function getRepairOrderAttachments(actor: AuthenticatedUser, order: RepairOrderEvidenceContext, includeItems: boolean) {
  const context = deps({ organizationId: order.organizationId });
  const access = await repairOrderEvidenceAccess(actor, order, context);
  if (!access.canView || !includeItems) return { canView: access.canView, canUpload: false, canGovern: false, items: [] };
  const flags = access.canManage ? await context.foundationRepository.listFeatureFlags(order.organizationId) : [];
  const canUpload = access.canManage && evaluateVehicleOperationsFeature(flags, "VEHICLE_360", actor.id, order.locationId).executable;
  const items = await context.repository.listRepairOrderAttachments(order);
  return {
    canView: true,
    canUpload,
    canGovern: canUpload && isManager(actor),
    items: items.map(item => ({
      id: item.id, fileName: item.fileName, status: item.status, version: item.version, legalHold: item.legalHold,
      retentionUntil: item.retentionUntil.toISOString(),
      canDelete: !item.legalHold && item.retentionUntil <= access.now,
      downloadUrl: item.status === "AVAILABLE" && item.malwareStatus === "CLEAN" ? `/api/vehicle-evidence/${encodeURIComponent(item.id)}/content` : null
    }))
  };
}

export async function uploadRepairOrderAttachment(actor: AuthenticatedUser | null, repairOrderId: string, form: FormData, input: Dependencies = {}) {
  const context = deps(input);
  const user = assertAuthenticatedUser(actor);
  const order = await context.repository.findRepairOrderEvidenceContext(context.organizationId, repairOrderId);
  if (!order) throw new Error("Repair order was not found.");
  const access = await repairOrderEvidenceAccess(user, order, context);
  if (!access.canView || !access.canManage) throw new Error("Vehicle capability required: repair order evidence upload.");
  const flags = await context.foundationRepository.listFeatureFlags(context.organizationId);
  if (!evaluateVehicleOperationsFeature(flags, "VEHICLE_360", user.id, order.locationId).executable) throw new Error("Uploads are not enabled at this repair order’s location.");
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) throw new Error("Choose a document or photo to attach.");
  if (file.size > repairOrderAttachmentMaxBytes) throw new Error("Attachments cannot exceed 9 MB.");
  if (!repairOrderAttachmentTypes.some(type => type === file.type)) throw new Error("Choose a PDF, JPEG, PNG, or WebP file.");
  const retryKey = required(form.get("idempotencyKey"), "Upload retry key", 100);
  const requestedRetention = form.get("retentionUntil");
  const defaultRetention = new Date(context.now());
  defaultRetention.setUTCFullYear(defaultRetention.getUTCFullYear() + 3);
  defaultRetention.setUTCHours(23, 59, 59, 999);
  return saveEvidenceUpload(context, user, {
    vehicleId: order.vehicleId, subjectType: repairOrderAttachmentSubject, subjectId: order.id,
    fileName: file.name, contentType: file.type, contentBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
    category: file.type.startsWith("image/") ? "PHOTO" : "REPAIR", accessLevel: "INTERNAL", relationship: "SUPPORTS",
    retentionUntil: requestedRetention ?? defaultRetention.toISOString(), idempotencyKey: `repair-attachment:${order.id}:${retryKey}`,
    reason: "Attach a document or photo to the repair order."
  }, order.locationId, requestedRetention === null);
}

function saveEvidenceUpload(context: ReturnType<typeof deps>, user: AuthenticatedUser, value: unknown, locationId?: string, defaultRetention = false) {
  const data = normalizeEvidenceUpload(value, context.now()), id = stableEvidenceId(context.organizationId, data.idempotencyKey);
  const subjectId = data.subjectId ?? data.vehicleId;
  // The default is set at the first save, so crossing midnight during a retry must not change the request hash.
  const payload = { accessLevel: data.accessLevel, byteSize: data.content.length, category: data.category, checksumSha256: data.checksumSha256, contentType: data.contentType, fileName: data.fileName, malwareStatus: data.scan.malwareStatus, relationship: data.relationship, retentionUntil: defaultRetention ? null : data.retentionUntil.toISOString(), subjectId, subjectType: data.subjectType, vehicleId: data.vehicleId };
  return context.repository.createEvidence(command({ actorUserId: user.id, commandType: "UPLOAD_VEHICLE_EVIDENCE", expectedVersion: 0, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, locationId, payload, reason: data.reason, subjectId: id }), { ...payload, actorUserId: user.id, content: data.content, malwareScanner: data.scan.malwareScanner, reasonCode: data.scan.reasonCode, retentionUntil: data.retentionUntil });
}

export async function uploadRepairProcedurePhoto(actor: AuthenticatedUser | null, jobId: string, form: FormData) {
  const context = deps({});
  const user = assertAuthenticatedUser(actor);
  const { prisma } = await import("@/server/db/client");
  const job = await prisma.repairJob.findFirst({
    where: { id: jobId, organizationId: context.organizationId, status: { in: ["IN_PROGRESS", "PAUSED"] }, repairOrder: { closedAt: null } },
    select: {
      repairOrder: { select: { locationId: true, vehicleId: true } },
      dispatches: { where: { technicianUserId: user.id, position: "CURRENT", status: "ACTIVE" }, take: 1, select: { id: true } },
      procedureVersion: { select: { requiredEvidence: true } },
    },
  });
  if (!job) throw new Error("An active repair job is required to attach a procedure photo.");
  const { locationId, vehicleId } = job.repairOrder;
  const grants = await context.foundationRepository.listCapabilityGrants(user.id, context.organizationId);
  assertVehicleCapability({ actor: user, capability: "REPAIR_ORDER_VIEW", grants, locationId, now: context.now() });
  if (!job.dispatches.length && !isManager(user)) throw new Error("Only the assigned technician or a manager may attach this procedure photo.");
  const flags = await context.foundationRepository.listFeatureFlags(context.organizationId);
  const decision = evaluateVehicleOperationsFeature(flags, "SHOP_OPERATIONS", user.id, locationId);
  if (!decision.executable) throw new Error(`Shop Operations mutations are not enabled (${decision.reason}).`);
  const requirement = form.get("requirement");
  const requirements = repairProcedureEvidenceRequirements(job.procedureVersion?.requiredEvidence);
  if (typeof requirement !== "string" || !requirements.includes(requirement) || !repairEvidenceNeedsPhoto(requirement)) {
    throw new Error("Choose a photo required by this repair procedure.");
  }
  const file = form.get("photo");
  if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > VEHICLE_EVIDENCE_MAX_BYTES) {
    throw new Error("Choose a JPEG, PNG, or WebP photo up to 10 MB.");
  }
  const retention = context.now();
  retention.setUTCFullYear(retention.getUTCFullYear() + 3);
  retention.setUTCHours(23, 59, 59, 999);
  return saveEvidenceUpload(context, user, {
    vehicleId, ...repairProcedurePhotoSubject(jobId, requirement), category: "PHOTO", accessLevel: "INTERNAL", relationship: "SUPPORTS",
    fileName: file.name, contentType: file.type, contentBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
    retentionUntil: retention.toISOString(), idempotencyKey: form.get("idempotencyKey"),
    reason: "Attach required procedure photo to the assigned repair job.",
  });
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

async function authorizeEvidenceGovernance(actor: AuthenticatedUser | null, evidenceId: string, context: ReturnType<typeof deps>) {
  const user = assertAuthenticatedUser(actor);
  const evidence = await context.repository.getEvidence(context.organizationId, evidenceId);
  const link = evidence?.links?.find(item => item.subjectType === repairOrderAttachmentSubject);
  if (!link) return { user: (await auth(user, "VEHICLE_EVIDENCE_MANAGE", context, true)).user, locationId: undefined };
  const order = await context.repository.findRepairOrderEvidenceContext(context.organizationId, link.subjectId);
  if (!order || order.vehicleId !== link.vehicleId) throw new Error("Evidence object was not found.");
  const access = await repairOrderEvidenceAccess(user, order, context);
  if (!access.canView || !access.canManage || !isManager(user)) throw new Error("Vehicle capability required: repair order attachment retention.");
  if (evidence?.accessLevel === "RESTRICTED") assertVehicleCapability({ actor: user, capability: "VEHICLE_EVIDENCE_RESTRICTED_VIEW", grants: access.grants, locationId: order.locationId, now: access.now });
  if (context.enforceRollout) {
    const flags = await context.foundationRepository.listFeatureFlags(context.organizationId);
    if (!evaluateVehicleOperationsFeature(flags, "VEHICLE_360", user.id, order.locationId).executable) throw new Error("Attachment changes are not enabled at this repair order’s location.");
  }
  return { user, locationId: order.locationId };
}

export async function updateVehicleEvidenceGovernance(actor: AuthenticatedUser | null, evidenceId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeEvidenceGovernance(value, context.now());
  const id = required(evidenceId, "Evidence ID", 100);
  const { user, locationId } = await authorizeEvidenceGovernance(actor, id, context);
  if (locationId && data.accessLevel !== null) throw new Error("Repair order attachment access follows repair order permissions.");
  const payload = { accessLevel: data.accessLevel, legalHold: data.legalHold, retentionUntil: data.retentionUntil?.toISOString() ?? null };
  return context.repository.updateEvidence(command({ actorUserId: user.id, commandType: "UPDATE_VEHICLE_EVIDENCE_GOVERNANCE", expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, locationId, payload, reason: data.reason, subjectId: id }), { ...data, actorUserId: user.id });
}

export async function deleteVehicleEvidence(actor: AuthenticatedUser | null, evidenceId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeEvidenceGovernance(value, context.now());
  const id = required(evidenceId, "Evidence ID", 100);
  const { user, locationId } = await authorizeEvidenceGovernance(actor, id, context);
  return context.repository.deleteEvidence(command({ actorUserId: user.id, commandType: "DELETE_VEHICLE_EVIDENCE", expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, locationId, payload: {}, reason: data.reason, subjectId: id }), user.id, context.now());
}

export async function downloadVehicleEvidence(actor: AuthenticatedUser | null, evidenceId: string, input: Dependencies = {}) {
  const context = deps(input), user = assertAuthenticatedUser(actor), evidence = await context.repository.getEvidence(context.organizationId, required(evidenceId, "Evidence ID", 100));
  const attachment = evidence?.links?.find(link => link.subjectType === repairOrderAttachmentSubject);
  if (attachment) {
    const order = await context.repository.findRepairOrderEvidenceContext(context.organizationId, attachment.subjectId);
    if (!order || order.vehicleId !== attachment.vehicleId) throw new Error("Evidence object was not found.");
    const access = await repairOrderEvidenceAccess(user, order, context);
    if (!access.canView) throw new Error("Vehicle capability required: repair order evidence view.");
    if (evidence?.accessLevel === "RESTRICTED") assertVehicleCapability({ actor: user, capability: "VEHICLE_EVIDENCE_RESTRICTED_VIEW", grants: access.grants, locationId: order.locationId, now: access.now });
  } else {
    const { grants } = await auth(user, "VEHICLE_EVIDENCE_VIEW", context);
    if (evidence?.accessLevel === "RESTRICTED") assertVehicleCapability({ actor: user, capability: "VEHICLE_EVIDENCE_RESTRICTED_VIEW", grants, locationId: null, now: context.now() });
  }
  if (!evidence || evidence.status === "DELETED") throw new Error("Evidence object was not found.");
  if (evidence.status !== "AVAILABLE" || evidence.malwareStatus !== "CLEAN") throw new Error("Evidence is quarantined and cannot be downloaded.");
  const original = await context.repository.getAvailableEvidenceBytes(context.organizationId, evidence.id, evidence.version);
  if (!original) throw new Error("Evidence object was not found.");
  await context.repository.recordEvidenceAccess(context.organizationId, evidence.id, user.id, "Authorized Vehicle 360 evidence download.");
  return { content: original.content, contentType: evidence.contentType, fileName: evidence.fileName };
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
