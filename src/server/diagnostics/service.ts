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
import { createDiagnosticCaseRepository, type DiagnosticCaseIdentityRecord, type DiagnosticCaseRepository } from "./repository";

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
  mutation = false
) {
  const user = assertAuthenticatedUser(actor);
  const grants = await grantsFor(user, context);
  assertVehicleCapability({ actor: user, capability, grants, locationId, now: context.now(), resourceOwnerUserId });
  if (mutation && context.enforceRollout) {
    const flags = await context.foundationRepository.listFeatureFlags(context.organizationId);
    const decision = evaluateDiagnosticsFeature(flags, "DIAGNOSTIC_CASES", user.id, locationId);
    if (!decision.executable) throw new Error(`Diagnostic case mutations are not enabled (${decision.reason}).`);
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
