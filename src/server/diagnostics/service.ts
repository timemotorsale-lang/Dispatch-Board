import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateDiagnosticsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability, evaluateVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import {
  diagnosticCaseId,
  diagnosticConcernFingerprint,
  normalizeCreateDiagnosticCase,
  normalizeDiagnosticAssignment,
  normalizeDiagnosticTransition
} from "./domain";
import { diagnosticFactId, normalizeDiagnosticEvidenceLink, normalizeDiagnosticMeasurement, normalizeDiagnosticObservation } from "./evidence-domain";
import { createDiagnosticCaseRepository, type DiagnosticCaseDetailRecord, type DiagnosticCaseIdentityRecord, type DiagnosticCaseRepository } from "./repository";

type Dependencies = {
  enforceRollout?: boolean;
  foundationRepository?: EnterpriseCommandRepository;
  now?: () => Date;
  organizationId?: string;
  repository?: DiagnosticCaseRepository;
};

function dependencies(input: Dependencies) {
  return {
    enforceRollout: input.enforceRollout ?? true,
    foundationRepository: input.foundationRepository ?? createEnterpriseCommandRepository(),
    now: input.now ?? (() => new Date()),
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
    repository: input.repository ?? createDiagnosticCaseRepository()
  };
}

function payload(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function command(input: { actorUserId: string; commandType: string; expectedVersion: number; idempotencyKey: string; locationId: string; organizationId: string; payload: Record<string, unknown>; reason: string; subjectId: string }) {
  return normalizeEnterpriseCommand({ ...input, domain: "DIAGNOSTICS", subjectType: "DIAGNOSTIC_CASE" });
}

async function grantsFor(user: AuthenticatedUser, context: ReturnType<typeof dependencies>) {
  return context.foundationRepository.listCapabilityGrants(user.id, context.organizationId);
}

async function authorize(
  actor: AuthenticatedUser | null,
  capability: VehicleCapability,
  locationId: string | null,
  context: ReturnType<typeof dependencies>,
  resourceOwnerUserId: string | null = null,
  mutation = false,
  feature: "DIAGNOSTIC_CASES" | "DIAGNOSTIC_EVIDENCE" = "DIAGNOSTIC_CASES"
) {
  const user = assertAuthenticatedUser(actor);
  const grants = await grantsFor(user, context);
  assertVehicleCapability({ actor: user, capability, grants, locationId, now: context.now(), resourceOwnerUserId });
  if (mutation && context.enforceRollout) {
    const flags = await context.foundationRepository.listFeatureFlags(context.organizationId);
    const decision = evaluateDiagnosticsFeature(flags, feature, user.id, locationId);
    if (!decision.executable) throw new Error(`Diagnostic ${feature === "DIAGNOSTIC_EVIDENCE" ? "evidence" : "case"} mutations are not enabled (${decision.reason}).`);
  }
  return { grants, user };
}

async function loadCaseIdentity(caseId: string, context: ReturnType<typeof dependencies>) {
  const diagnosticCase = await context.repository.getIdentity(context.organizationId, caseId);
  if (!diagnosticCase) throw new Error("Diagnostic case was not found.");
  return diagnosticCase;
}

export async function listDiagnosticCases(actor: AuthenticatedUser | null, input: Dependencies = {}) {
  const context = dependencies(input);
  const user = assertAuthenticatedUser(actor);
  const [grants, cases] = await Promise.all([grantsFor(user, context), context.repository.list(context.organizationId)]);
  return cases.filter((diagnosticCase) => evaluateVehicleCapability({ actor: user, capability: "DIAGNOSTIC_CASE_VIEW", grants, locationId: diagnosticCase.locationId, now: context.now(), resourceOwnerUserId: diagnosticCase.assignedUserId }).allowed);
}

export async function getDiagnosticCase(actor: AuthenticatedUser | null, caseId: string, input: Dependencies = {}) {
  const context = dependencies(input);
  const identity = await loadCaseIdentity(caseId, context);
  await authorize(actor, "DIAGNOSTIC_CASE_VIEW", identity.locationId, context, identity.assignedUserId);
  const detail = await context.repository.get(context.organizationId, caseId);
  if (!detail) throw new Error("Diagnostic case was not found.");
  return detail;
}

export async function createDiagnosticCase(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const context = dependencies(input);
  const data = normalizeCreateDiagnosticCase(value);
  const repairOrder = await context.repository.getRepairOrderContext(context.organizationId, data.repairOrderId);
  if (!repairOrder) throw new Error("An open repair order was not found for this diagnostic case.");
  const { user } = await authorize(actor, "DIAGNOSTIC_CASE_CREATE", repairOrder.locationId, context, null, true);
  if (data.assignedUserId && data.assignedUserId !== user.id) await authorize(actor, "DIAGNOSTIC_CASE_ASSIGN", repairOrder.locationId, context, null, true);
  const caseId = diagnosticCaseId(context.organizationId, data.idempotencyKey);
  const canonicalConcernStatement = repairOrder.serviceVisit.concernSummary.trim();
  const concernStatement = data.concernStatement ?? canonicalConcernStatement;
  const concernSource = concernStatement === canonicalConcernStatement ? "REPAIR_ORDER_CONCERN" : "REPAIR_ORDER_CONCERN_DERIVATION";
  const openedAt = context.now();
  return context.repository.create(command({
    actorUserId: user.id,
    commandType: "CREATE_DIAGNOSTIC_CASE",
    expectedVersion: 0,
    idempotencyKey: data.idempotencyKey,
    locationId: repairOrder.locationId,
    organizationId: context.organizationId,
    payload: payload({ assignedUserId: data.assignedUserId, concernKey: data.concernKey, concernStatement: data.concernStatement, operatingConditions: data.operatingConditions, reasonCode: data.reasonCode, repairOrderId: repairOrder.id, riskTier: data.riskTier }),
    reason: data.reason,
    subjectId: caseId
  }), {
    assignedUserId: data.assignedUserId,
    canonicalConcernStatement,
    concernFingerprint: diagnosticConcernFingerprint(concernStatement),
    concernKey: data.concernKey,
    concernSource,
    concernStatement,
    openedAt,
    operatingConditions: data.operatingConditions,
    repairOrderVersion: repairOrder.version,
    riskTier: data.riskTier,
    reasonCode: data.reasonCode
  });
}

export async function assignDiagnosticCase(actor: AuthenticatedUser | null, caseId: string, value: unknown, input: Dependencies = {}) {
  const context = dependencies(input);
  const data = normalizeDiagnosticAssignment(value);
  const diagnosticCase = await loadCaseIdentity(caseId, context);
  const { user } = await authorize(actor, "DIAGNOSTIC_CASE_ASSIGN", diagnosticCase.locationId, context, diagnosticCase.assignedUserId, true);
  return context.repository.assign(command({
    actorUserId: user.id,
    commandType: "ASSIGN_DIAGNOSTIC_CASE",
    expectedVersion: data.expectedVersion,
    idempotencyKey: data.idempotencyKey,
    locationId: diagnosticCase.locationId,
    organizationId: context.organizationId,
    payload: payload({ assignedUserId: data.assignedUserId, reasonCode: data.reasonCode }),
    reason: data.reason,
    subjectId: diagnosticCase.id
  }), { assignedUserId: data.assignedUserId, occurredAt: context.now(), reasonCode: data.reasonCode });
}

function transitionCommandType(targetStatus: string) {
  if (targetStatus === "ESCALATED") return "ESCALATE_DIAGNOSTIC_CASE";
  if (targetStatus === "REOPENED") return "REOPEN_DIAGNOSTIC_CASE";
  if (targetStatus === "ABANDONED") return "ABANDON_DIAGNOSTIC_CASE";
  return "TRANSITION_DIAGNOSTIC_CASE";
}

function assertOwnerTransition(user: AuthenticatedUser, diagnosticCase: DiagnosticCaseIdentityRecord) {
  if (!isManager(user) && diagnosticCase.assignedUserId !== user.id) throw new Error("Diagnostic case transition requires assignment to the acting technician.");
}

export async function transitionDiagnosticCase(actor: AuthenticatedUser | null, caseId: string, value: unknown, input: Dependencies = {}) {
  const context = dependencies(input);
  const data = normalizeDiagnosticTransition(value);
  const diagnosticCase = await loadCaseIdentity(caseId, context);
  const { user } = await authorize(actor, "DIAGNOSTIC_CASE_TRANSITION", diagnosticCase.locationId, context, diagnosticCase.assignedUserId, true);
  assertOwnerTransition(user, diagnosticCase);
  const occurredAt = context.now();
  return context.repository.transition(command({
    actorUserId: user.id,
    commandType: transitionCommandType(data.targetStatus),
    expectedVersion: data.expectedVersion,
    idempotencyKey: data.idempotencyKey,
    locationId: diagnosticCase.locationId,
    organizationId: context.organizationId,
    payload: payload({ reasonCode: data.reasonCode, targetStatus: data.targetStatus }),
    reason: data.reason,
    subjectId: diagnosticCase.id
  }), { occurredAt, reasonCode: data.reasonCode, targetStatus: data.targetStatus });
}

export async function recordDiagnosticObservation(actor: AuthenticatedUser | null, caseId: string, value: unknown, input: Dependencies = {}) {
  const context = dependencies(input);
  const data = normalizeDiagnosticObservation(value, context.now());
  const diagnosticCase = await loadCaseIdentity(caseId, context);
  const { user } = await authorize(actor, "DIAGNOSTIC_EVIDENCE_RECORD", diagnosticCase.locationId, context, diagnosticCase.assignedUserId, true, "DIAGNOSTIC_EVIDENCE");
  assertOwnerTransition(user, diagnosticCase);
  if (!context.repository.recordObservation) throw new Error("Diagnostic observation persistence is unavailable.");
  const id = diagnosticFactId("obs", context.organizationId, diagnosticCase.id, data.idempotencyKey);
  return context.repository.recordObservation(command({
    actorUserId: user.id, commandType: data.correctsId ? "CORRECT_DIAGNOSTIC_FACT" : "RECORD_DIAGNOSTIC_OBSERVATION", expectedVersion: data.expectedVersion,
    idempotencyKey: data.idempotencyKey, locationId: diagnosticCase.locationId, organizationId: context.organizationId,
    payload: payload({ correctsId: data.correctsId, factClass: data.factClass, observationId: id, qualityReasonCode: data.qualityReasonCode, source: data.source }),
    reason: data.reason, subjectId: diagnosticCase.id
  }), { ...data, id });
}

export async function recordDiagnosticMeasurement(actor: AuthenticatedUser | null, caseId: string, value: unknown, input: Dependencies = {}) {
  const context = dependencies(input);
  const data = normalizeDiagnosticMeasurement(value, context.now());
  const diagnosticCase = await loadCaseIdentity(caseId, context);
  const { user } = await authorize(actor, "DIAGNOSTIC_EVIDENCE_RECORD", diagnosticCase.locationId, context, diagnosticCase.assignedUserId, true, "DIAGNOSTIC_EVIDENCE");
  assertOwnerTransition(user, diagnosticCase);
  if (!context.repository.recordMeasurement) throw new Error("Diagnostic measurement persistence is unavailable.");
  const id = diagnosticFactId("mea", context.organizationId, diagnosticCase.id, data.idempotencyKey);
  return context.repository.recordMeasurement(command({
    actorUserId: user.id, commandType: data.supersedesId ? "CORRECT_DIAGNOSTIC_FACT" : "RECORD_DIAGNOSTIC_MEASUREMENT", expectedVersion: data.expectedVersion,
    idempotencyKey: data.idempotencyKey, locationId: diagnosticCase.locationId, organizationId: context.organizationId,
    payload: payload({ measurementId: id, normalizedUnit: data.normalizedUnit, plausibilityStatus: data.plausibilityStatus, qualityReasonCode: data.qualityReasonCode, quantity: data.quantity, supersedesId: data.supersedesId }),
    reason: data.reason, subjectId: diagnosticCase.id
  }), { ...data, id });
}

export async function linkDiagnosticEvidence(actor: AuthenticatedUser | null, caseId: string, value: unknown, input: Dependencies = {}) {
  const context = dependencies(input);
  const data = normalizeDiagnosticEvidenceLink(value);
  const diagnosticCase = await loadCaseIdentity(caseId, context);
  const { grants, user } = await authorize(actor, "DIAGNOSTIC_EVIDENCE_LINK", diagnosticCase.locationId, context, diagnosticCase.assignedUserId, true, "DIAGNOSTIC_EVIDENCE");
  assertOwnerTransition(user, diagnosticCase);
  assertVehicleCapability({ actor: user, capability: "VEHICLE_EVIDENCE_VIEW", grants, locationId: null, now: context.now() });
  if (!context.repository.getEvidenceContext || !context.repository.linkEvidence) throw new Error("Diagnostic evidence linking is unavailable.");
  const evidence = await context.repository.getEvidenceContext(context.organizationId, data.evidenceObjectId);
  if (!evidence) throw new Error("Vehicle Evidence object was not found.");
  if (evidence.accessLevel === "RESTRICTED") assertVehicleCapability({ actor: user, capability: "VEHICLE_EVIDENCE_RESTRICTED_VIEW", grants, locationId: null, now: context.now() });
  if (evidence.status !== "AVAILABLE" || evidence.malwareStatus !== "CLEAN") throw new Error("Vehicle Evidence object must be available and malware-clean before linking.");
  const detail = await context.repository.get(context.organizationId, diagnosticCase.id);
  if (!detail || !evidence.vehicleIds.includes(detail.vehicleId)) throw new Error("Vehicle Evidence object does not belong to the diagnostic-case vehicle.");
  const id = diagnosticFactId("del", context.organizationId, diagnosticCase.id, data.idempotencyKey);
  return context.repository.linkEvidence(command({
    actorUserId: user.id, commandType: "LINK_DIAGNOSTIC_EVIDENCE", expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey,
    locationId: diagnosticCase.locationId, organizationId: context.organizationId,
    payload: payload({ diagnosticEvidenceLinkId: id, evidenceObjectId: data.evidenceObjectId, relationship: data.relationship, subjectId: data.subjectId, subjectType: data.subjectType }),
    reason: data.reason, subjectId: diagnosticCase.id
  }), { ...data, id });
}

const terminalStatuses = new Set(["VERIFIED_CLOSED", "INCONCLUSIVE", "NO_FAULT_FOUND", "ABANDONED"]);
const waitingStatuses = new Set(["WAITING_FOR_VEHICLE", "WAITING_FOR_AUTHORIZATION", "WAITING_FOR_TOOL", "WAITING_FOR_INFORMATION", "WAITING_FOR_PART"]);

function caseStage(status: string) {
  if (["DRAFT", "TRIAGE", "REOPENED"].includes(status)) return "CONCERN" as const;
  if (["TEST_PLAN_READY", "TESTING"].includes(status)) return "TEST" as const;
  if (["CAUSE_PROPOSED", "CONFIRMATION_REQUIRED", "CONFIRMED", "REPAIR_PLANNING", "HANDED_OFF"].includes(status)) return "CAUSE" as const;
  if (["POST_REPAIR_VERIFICATION", "VERIFIED_CLOSED"].includes(status)) return "VERIFY" as const;
  return "EVIDENCE" as const;
}

function nextAction(diagnosticCase: DiagnosticCaseDetailRecord) {
  if (!diagnosticCase.assignedUser) return "Assign an accountable technician";
  if (diagnosticCase.status === "DRAFT") return "Begin safety and operability triage";
  if (waitingStatuses.has(diagnosticCase.status)) return "Resolve the recorded blocker";
  if (diagnosticCase.status === "ESCALATED") return "Complete escalation review";
  if (terminalStatuses.has(diagnosticCase.status)) return diagnosticCase.status === "VERIFIED_CLOSED" ? "Review verified record" : "Review conclusion or reopen";
  if (diagnosticCase.status === "REOPENED") return "Return the case to triage";
  return "Continue the current diagnostic stage";
}

function blocker(diagnosticCase: DiagnosticCaseDetailRecord) {
  if (waitingStatuses.has(diagnosticCase.status) || diagnosticCase.status === "ESCALATED") {
    return diagnosticCase.stateEvents[0]?.reason ?? diagnosticCase.status.replaceAll("_", " ");
  }
  return null;
}

function projectCase(diagnosticCase: DiagnosticCaseDetailRecord, now: Date, evidenceAccess: { attachments: boolean; facts: boolean; restricted: boolean } = { attachments: false, facts: false, restricted: false }) {
  const concern = diagnosticCase.concernVersions[0];
  const vehicleLabel = [diagnosticCase.vehicle.year, diagnosticCase.vehicle.make, diagnosticCase.vehicle.model].filter(Boolean).join(" ") || diagnosticCase.vehicle.vehicleNumber;
  return {
    id: diagnosticCase.id,
    version: diagnosticCase.version,
    status: diagnosticCase.status,
    resumeStatus: diagnosticCase.resumeStatus,
    stage: caseStage((waitingStatuses.has(diagnosticCase.status) || diagnosticCase.status === "ESCALATED") && diagnosticCase.resumeStatus ? diagnosticCase.resumeStatus : diagnosticCase.status),
    riskTier: diagnosticCase.riskTier,
    concernKey: diagnosticCase.concernKey,
    concern: concern?.statement ?? diagnosticCase.repairOrder.serviceVisit.concernSummary,
    concernSource: concern?.source ?? "REPAIR_ORDER_CONCERN",
    concernVersionId: concern?.id ?? null,
    operatingConditions: concern?.operatingConditions && typeof concern.operatingConditions === "object" && !Array.isArray(concern.operatingConditions) ? concern.operatingConditions : {},
    concernVersion: concern?.version ?? diagnosticCase.currentConcernVersion,
    assignedUser: diagnosticCase.assignedUser,
    createdByUser: diagnosticCase.createdByUser,
    location: diagnosticCase.location,
    repairOrder: { id: diagnosticCase.repairOrder.id, repairOrderNumber: diagnosticCase.repairOrder.repairOrderNumber },
    vehicle: { ...diagnosticCase.vehicle, label: vehicleLabel },
    openedAt: diagnosticCase.openedAt.toISOString(),
    updatedAt: diagnosticCase.updatedAt.toISOString(),
    closedAt: diagnosticCase.closedAt?.toISOString() ?? null,
    ageHours: Math.max(0, Math.floor((now.getTime() - diagnosticCase.openedAt.getTime()) / 3_600_000)),
    nextAction: nextAction(diagnosticCase),
    blocker: blocker(diagnosticCase),
    confidence: "NOT_ASSESSED" as const,
    observations: evidenceAccess.facts ? diagnosticCase.observations.map((observation) => ({
      id: observation.id, factClass: observation.factClass, statement: observation.statement, structuredValue: observation.structuredValue,
      operatingConditions: observation.operatingConditions, source: observation.source, reliability: observation.reliability,
      qualityStatus: observation.qualityStatus, qualityReasonCode: observation.qualityReasonCode, independenceGroup: observation.independenceGroup,
      timeWindowStart: observation.timeWindowStart.toISOString(), timeWindowEnd: observation.timeWindowEnd.toISOString(), observedAt: observation.observedAt.toISOString(),
      rawSource: observation.rawSource, authorUser: observation.authorUser, correctsId: observation.correctsId, correctedById: observation.correctedBy?.id ?? null,
      createdAt: observation.createdAt.toISOString()
    })) : [],
    measurements: evidenceAccess.facts ? diagnosticCase.measurements.map((measurement) => ({
      id: measurement.id, quantity: measurement.quantity, value: measurement.valueDecimal.toString(), unit: measurement.unit,
      normalizedValue: measurement.normalizedValue.toString(), normalizedUnit: measurement.normalizedUnit,
      referenceMinimum: measurement.referenceMinimum?.toString() ?? null, referenceMaximum: measurement.referenceMaximum?.toString() ?? null,
      normalizedReferenceMin: measurement.normalizedReferenceMin?.toString() ?? null, normalizedReferenceMax: measurement.normalizedReferenceMax?.toString() ?? null,
      tolerance: measurement.tolerance, instrument: measurement.instrument, setup: measurement.setup, operatingConditions: measurement.operatingConditions,
      source: measurement.source, reliability: measurement.reliability, qualityStatus: measurement.qualityStatus, qualityReasonCode: measurement.qualityReasonCode,
      plausibilityStatus: measurement.plausibilityStatus, plausibilityReasonCode: measurement.plausibilityReasonCode, independenceGroup: measurement.independenceGroup,
      timeWindowStart: measurement.timeWindowStart.toISOString(), timeWindowEnd: measurement.timeWindowEnd.toISOString(), measuredAt: measurement.measuredAt.toISOString(),
      rawSource: measurement.rawSource, authorUser: measurement.authorUser, supersedesId: measurement.supersedesId, supersededById: measurement.supersededBy?.id ?? null,
      createdAt: measurement.createdAt.toISOString()
    })) : [],
    evidenceLinks: evidenceAccess.attachments ? diagnosticCase.evidenceLinks.filter((link) => link.evidenceObject.accessLevel !== "RESTRICTED" || evidenceAccess.restricted).map((link) => ({
      id: link.id, evidenceObjectId: link.evidenceObjectId, subjectType: link.subjectType, subjectId: link.subjectId, purpose: link.purpose, relationship: link.relationship,
      createdByUser: link.createdByUser, createdAt: link.createdAt.toISOString(),
      evidence: { ...link.evidenceObject, retentionUntil: link.evidenceObject.retentionUntil.toISOString(), createdAt: link.evidenceObject.createdAt.toISOString(), downloadUrl: link.evidenceObject.status === "AVAILABLE" && link.evidenceObject.malwareStatus === "CLEAN" ? `/api/vehicle-evidence/${encodeURIComponent(link.evidenceObject.id)}/content` : null }
    })) : [],
    timeline: diagnosticCase.stateEvents.map((event) => ({
      id: event.id,
      version: event.version,
      eventType: event.eventType,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      reasonCode: event.reasonCode,
      reason: event.reason,
      actorUserId: event.actorUserId,
      occurredAt: event.occurredAt.toISOString()
    }))
  };
}

async function diagnosticsReadContext(actor: AuthenticatedUser | null, input: Dependencies) {
  const context = dependencies(input);
  const user = assertAuthenticatedUser(actor);
  const [grants, flags, cases] = await Promise.all([
    grantsFor(user, context),
    context.foundationRepository.listFeatureFlags(context.organizationId),
    context.repository.list(context.organizationId)
  ]);
  const visibleCases = cases.filter((diagnosticCase) => evaluateVehicleCapability({ actor: user, capability: "DIAGNOSTIC_CASE_VIEW", grants, locationId: diagnosticCase.locationId, now: context.now(), resourceOwnerUserId: diagnosticCase.assignedUserId }).allowed);
  return { cases: visibleCases, context, flags, grants, user };
}

export type DiagnosticsCommandCenterModel = Awaited<ReturnType<typeof getDiagnosticsCommandCenter>>;

export async function getDiagnosticsCommandCenter(actor: AuthenticatedUser | null, input: Dependencies = {}) {
  const read = await diagnosticsReadContext(actor, input);
  const now = read.context.now();
  const rollout = evaluateDiagnosticsFeature(read.flags, "DIAGNOSTIC_CASES", read.user.id, null);
  const items = read.cases.map((item) => projectCase(item, now));
  const broadView = evaluateVehicleCapability({ actor: read.user, capability: "DIAGNOSTIC_CASE_VIEW", grants: read.grants, locationId: null, now });
  return {
    state: "COMPLETE" as const,
    freshness: "CURRENT" as const,
    restricted: !broadView.allowed && items.length === 0,
    generatedAt: now.toISOString(),
    viewer: { id: read.user.id, name: read.user.name },
    rollout: { executable: rollout.executable, reason: rollout.reason },
    summary: {
      mine: items.filter((item) => item.assignedUser?.id === read.user.id && !terminalStatuses.has(item.status)).length,
      waiting: items.filter((item) => waitingStatuses.has(item.status)).length,
      escalated: items.filter((item) => item.status === "ESCALATED").length,
      unassigned: items.filter((item) => !item.assignedUser && !terminalStatuses.has(item.status)).length
    },
    items
  };
}

export type DiagnosticCaseWorkspaceModel = Awaited<ReturnType<typeof getDiagnosticCaseWorkspace>>;

export async function getDiagnosticCaseWorkspace(actor: AuthenticatedUser | null, caseId: string, input: Dependencies = {}) {
  const context = dependencies(input);
  const user = assertAuthenticatedUser(actor);
  const identity = await loadCaseIdentity(caseId, context);
  const [grants, flags, detail, assignableUsers] = await Promise.all([
    grantsFor(user, context),
    context.foundationRepository.listFeatureFlags(context.organizationId),
    context.repository.get(context.organizationId, caseId),
    context.repository.listAssignableUsers?.() ?? Promise.resolve([])
  ]);
  assertVehicleCapability({ actor: user, capability: "DIAGNOSTIC_CASE_VIEW", grants, locationId: identity.locationId, now: context.now(), resourceOwnerUserId: identity.assignedUserId });
  if (!detail) throw new Error("Diagnostic case was not found.");
  const rollout = evaluateDiagnosticsFeature(flags, "DIAGNOSTIC_CASES", user.id, detail.locationId);
  const evidenceRollout = evaluateDiagnosticsFeature(flags, "DIAGNOSTIC_EVIDENCE", user.id, detail.locationId);
  const canAssign = evaluateVehicleCapability({ actor: user, capability: "DIAGNOSTIC_CASE_ASSIGN", grants, locationId: detail.locationId, now: context.now(), resourceOwnerUserId: detail.assignedUserId }).allowed;
  const transitionCapability = evaluateVehicleCapability({ actor: user, capability: "DIAGNOSTIC_CASE_TRANSITION", grants, locationId: detail.locationId, now: context.now(), resourceOwnerUserId: detail.assignedUserId }).allowed;
  const evidenceView = evaluateVehicleCapability({ actor: user, capability: "DIAGNOSTIC_EVIDENCE_VIEW", grants, locationId: detail.locationId, now: context.now(), resourceOwnerUserId: detail.assignedUserId }).allowed;
  const vehicleEvidenceView = evaluateVehicleCapability({ actor: user, capability: "VEHICLE_EVIDENCE_VIEW", grants, locationId: null, now: context.now() }).allowed;
  const restrictedEvidenceView = evaluateVehicleCapability({ actor: user, capability: "VEHICLE_EVIDENCE_RESTRICTED_VIEW", grants, locationId: null, now: context.now() }).allowed;
  const evidenceOwner = isManager(user) || detail.assignedUserId === user.id;
  const canRecordEvidence = evaluateVehicleCapability({ actor: user, capability: "DIAGNOSTIC_EVIDENCE_RECORD", grants, locationId: detail.locationId, now: context.now(), resourceOwnerUserId: detail.assignedUserId }).allowed && evidenceOwner;
  const canLinkEvidence = evaluateVehicleCapability({ actor: user, capability: "DIAGNOSTIC_EVIDENCE_LINK", grants, locationId: detail.locationId, now: context.now(), resourceOwnerUserId: detail.assignedUserId }).allowed && vehicleEvidenceView && evidenceOwner;
  const evidenceCandidates = evidenceView && vehicleEvidenceView && context.repository.listEvidenceCandidates ? await context.repository.listEvidenceCandidates(context.organizationId, detail.vehicleId) : [];
  return {
    state: "COMPLETE" as const,
    generatedAt: context.now().toISOString(),
    viewer: { id: user.id, name: user.name },
    rollout: { executable: rollout.executable, reason: rollout.reason },
    evidenceRollout: { executable: evidenceRollout.executable, reason: evidenceRollout.reason },
    permissions: { canAssign, canTransition: transitionCapability && evidenceOwner, canRecordEvidence, canLinkEvidence },
    assignableUsers: canAssign ? assignableUsers : [],
    evidenceCandidates: evidenceCandidates.filter((item) => item.accessLevel !== "RESTRICTED" || restrictedEvidenceView).map((item) => ({ ...item, retentionUntil: item.retentionUntil.toISOString(), linkable: item.status === "AVAILABLE" && item.malwareStatus === "CLEAN" })),
    diagnosticCase: projectCase(detail, context.now(), { facts: evidenceView, attachments: evidenceView && vehicleEvidenceView, restricted: restrictedEvidenceView })
  };
}

export async function getRepairOrderDiagnosticsBridge(actor: AuthenticatedUser | null, repairOrderId: string, input: Dependencies = {}) {
  const read = await diagnosticsReadContext(actor, input);
  const repairOrder = await read.context.repository.getRepairOrderContext(read.context.organizationId, repairOrderId);
  if (!repairOrder) throw new Error("An open repair order was not found for diagnostics.");
  const view = evaluateVehicleCapability({ actor: read.user, capability: "DIAGNOSTIC_CASE_VIEW", grants: read.grants, locationId: repairOrder.locationId, now: read.context.now() });
  if (!view.allowed) return { state: "RESTRICTED" as const, reason: view.reason, repairOrderId, cases: [], canCreate: false, rollout: { executable: false, reason: "CAPABILITY_REQUIRED" } };
  const create = evaluateVehicleCapability({ actor: read.user, capability: "DIAGNOSTIC_CASE_CREATE", grants: read.grants, locationId: repairOrder.locationId, now: read.context.now() });
  const rollout = evaluateDiagnosticsFeature(read.flags, "DIAGNOSTIC_CASES", read.user.id, repairOrder.locationId);
  return {
    state: "COMPLETE" as const,
    repairOrderId,
    repairOrderNumber: repairOrder.repairOrderNumber,
    canCreate: create.allowed && rollout.executable && !repairOrder.closedAt,
    rollout: { executable: rollout.executable, reason: rollout.reason },
    cases: read.cases.filter((item) => item.repairOrderId === repairOrderId).map((item) => projectCase(item, read.context.now()))
  };
}
