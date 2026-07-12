import { createHash, randomBytes } from "node:crypto";
import { ConcernClosureOutcome, ConcernSource, Prisma, TaskTemplatePriority, type WorkflowArea } from "@prisma/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { crmDecisionRegistry } from "@/server/customers/decisions/crm-decision-registry";
import { normalizeDecisionResult } from "@/server/customers/decisions/crm-decision-domain";
import { CASE_PLAYBOOK_DECISION_TYPE, CASE_PLAYBOOK_VERSION, CASE_SEVERITY_DECISION_TYPE, CASE_SEVERITY_VERSION } from "@/server/customers/decisions/case-decision-evaluators";

import type { ConcernIntake, ConcernResolutionPlan, ConcernTaskBlueprint } from "@/server/concerns/concern-domain";
import type { AuthenticatedUser } from "@/server/auth/store";
import { canManageAssignments, isManager } from "@/server/policies/access";
import {
  createConcernResolutionRepository,
  type ConcernAssignmentUserRecord,
  type ConcernPackageRecord,
  type ConcernResolutionRepository,
  type ConcernTaskCommitPlan
} from "@/server/repositories/concern-resolution-repository";
import { recommendAssignment } from "@/server/services/assignment-recommendation";
import { buildConcernResolutionPlan } from "@/server/services/concern-decomposition-service";
import type { GenerationInputTemplate, GenerationInputUser } from "@/server/services/generation-inputs";
import { normalizeConcernIntake } from "@/server/validation/concern-intake";

type ConcernResolutionDependencies = {
  repository?: ConcernResolutionRepository;
  now?: () => Date;
};

function requireManager(user: AuthenticatedUser | null) {
  if (!user) throw new Error("Authentication required.");
  if (!canManageAssignments(user)) throw new Error("Manager access required.");
  return user;
}

function requiredIdempotencyKey(value: string | null | undefined) {
  const key = value?.trim();
  if (!key) throw new Error("An Idempotency-Key is required.");
  if (key.length > 160) throw new Error("Idempotency-Key must be 160 characters or fewer.");
  return key;
}

function requestHash(intake: ConcernIntake) {
  return createHash("sha256").update(JSON.stringify(intake)).digest("hex");
}

function concernNumber(now: Date) {
  return `CON-${now.getUTCFullYear()}-${now.getTime().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function toGenerationUsers(users: ConcernAssignmentUserRecord[]): GenerationInputUser[] {
  return users.map((user) => ({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    roles: user.userRoles.map(({ role }) => ({ roleId: role.id, roleName: role.name })),
    directDuties: user.userDuties.map(({ duty }) => ({ dutyId: duty.id, title: duty.name, workflowArea: duty.workflowArea, source: "custom" as const, roleIds: [], roleNames: [] })),
    dutySource: user.userDuties.length ? "custom" : "none",
    resolvedDuties: user.userDuties.map(({ duty }) => ({ dutyId: duty.id, title: duty.name, workflowArea: duty.workflowArea, source: "custom" as const, roleIds: [], roleNames: [] })),
    templates: []
  }));
}

function assignmentTemplate(blueprint: ConcernTaskBlueprint): GenerationInputTemplate {
  return {
    templateId: `concern:${blueprint.stepCode}`,
    title: blueprint.title,
    description: blueprint.description,
    templateCategory: "CONCERN_RESOLUTION",
    workflowArea: blueprint.workflowArea as WorkflowArea,
    priority: TaskTemplatePriority.MEDIUM,
    defaultDueTime: "17:00",
    requiresManagerApproval: blueprint.requiresManagerApproval,
    requiredUpdateFields: [], checklistItems: [],
    completionCriteria: { mode: "manual", requiredChecklistKeys: [], requiredFieldKeys: [] },
    defaultStatusRules: { allowedStatuses: [], blockedReasonRequired: true, waitingReasonRequiredStatuses: [] },
    approvalRules: { mode: blueprint.requiresManagerApproval ? "manager_review" : "none", readyForReviewRequired: blueprint.requiresManagerApproval },
    intelligenceSignalType: "CUSTOMER_ISSUE",
    taskCardDisplayHints: { emphasizeDueTime: true, emphasizeVehicle: true, emphasizeCustomer: true, showChecklistProgress: true, highlightReadyForReview: blueprint.requiresManagerApproval },
    roleId: null, roleName: null, dutyId: null, dutyName: null, matchedByRole: false, matchedByDuty: false
  };
}

function buildAssignments(plan: ConcernResolutionPlan, users: ConcernAssignmentUserRecord[], actor: AuthenticatedUser, now: Date) {
  const generationUsers = toGenerationUsers(users);
  const manager = users.find((candidate) => candidate.userRoles.some(({ role }) => role.name === "General Manager")) ?? users.find((candidate) => candidate.id === actor.id);
  if (!manager) throw new Error("An active manager is required to own unmatched concern work.");
  return plan.tasks.map<ConcernTaskCommitPlan>((blueprint) => {
    const recommendation = recommendAssignment({ users: generationUsers, template: assignmentTemplate(blueprint) });
    const assignedUserId = recommendation.recommendedUserId ?? manager.id;
    const dueAt = new Date(now.getTime() + blueprint.dueOffsetHours * 60 * 60 * 1000);
    return {
      blueprint, assignedUserId, recommendedUserId: recommendation.recommendedUserId,
      recommendationReasonCode: recommendation.reasonCode,
      recommendationExplanation: recommendation.recommendedUserId ? recommendation.explanation : `${recommendation.explanation} ${manager.name} is assigned for manager triage.`,
      dueAt, boardDate: dueAt.toISOString().slice(0, 10)
    };
  });
}

function toPackageModel(record: ConcernPackageRecord, replayed = false) {
  return {
    replayed,
    concern: {
      id: record.id, concernNumber: record.concernNumber, title: record.title, description: record.description,
      category: record.category, secondaryCategory: record.secondaryCategory, workflowArea: record.workflowArea,
      riskType: record.riskType, priority: record.priority, status: record.status, source: record.source,
      customerReference: record.customerReference, vehicleReference: record.vehicleReference,
      dueAt: record.dueAt.toISOString(), escalationRequired: record.escalationRequired,
      escalateAt: record.escalateAt?.toISOString() ?? null, templateCode: record.templateCode,
      templateVersion: record.templateVersion, closureOutcome: record.closureOutcome,
      closureReason: record.closureReason, resolutionProof: record.resolutionProof,
      createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
      severityScore: record.severityScore, severityBand: record.severityBand,
      firstResponseDueAt: record.firstResponseDueAt?.toISOString() ?? null,
      resolutionDueAt: record.resolutionDueAt?.toISOString() ?? null,
      owner: record.assignedOwner, reportedBy: record.reportedByUser,
      promises: record.customerPromises.map((promise) => ({ id: promise.id, type: promise.promiseType, status: promise.status, dueAt: promise.dueAt.toISOString(), fulfilledAt: promise.fulfilledAt?.toISOString() ?? null, owner: promise.ownerUser }))
    },
    tasks: record.taskLinks.map((link) => ({
      stepCode: link.stepCode, sortOrder: link.sortOrder, required: link.required,
      dependsOnStepCodes: link.dependsOnStepCodes, completionCriteria: link.completionCriteria,
      escalationRuleCode: link.escalationRuleCode,
      task: {
        id: link.task.id, title: link.task.title, status: link.task.status, priority: link.task.priority,
        dueAt: link.task.dueAt.toISOString(), requiresManagerApproval: link.task.requiresManagerApproval,
        reviewedByUserId: link.task.reviewedByUserId, assignedUser: link.task.assignedUser,
        checklistItems: link.task.checklistItems.map((item) => ({ id: item.id, key: item.key, label: item.label, required: item.isRequired, completed: item.completed }))
      }
    }))
  };
}

export async function previewConcernResolution(user: AuthenticatedUser | null, value: unknown, dependencies: ConcernResolutionDependencies = {}) {
  const actor = requireManager(user);
  const intake = normalizeConcernIntake(value);
  const plan = buildConcernResolutionPlan(intake);
  const repository = dependencies.repository ?? createConcernResolutionRepository();
  const users = await repository.listAssignmentUsers();
  const now = dependencies.now?.() ?? new Date();
  const assignments = buildAssignments(plan, users, actor, now);
  return {
    intake,
    plan,
    assignments: assignments.map((item) => ({ stepCode: item.blueprint.stepCode, assignedUserId: item.assignedUserId, assignedUserName: users.find((userItem) => userItem.id === item.assignedUserId)?.name ?? "Unknown", recommendationReasonCode: item.recommendationReasonCode, recommendationExplanation: item.recommendationExplanation, dueAt: item.dueAt.toISOString(), boardDate: item.boardDate }))
  };
}

export async function createConcernResolutionPackage(user: AuthenticatedUser | null, value: unknown, idempotencyValue: string | null | undefined, dependencies: ConcernResolutionDependencies = {}) {
  const actor = requireManager(user);
  const key = requiredIdempotencyKey(idempotencyValue);
  const intake = normalizeConcernIntake(value);
  const hash = requestHash(intake);
  const repository = dependencies.repository ?? createConcernResolutionRepository();
  const existing = await repository.findByIdempotency(actor.id, key);
  if (existing) {
    if (existing.requestHash !== hash) throw new Error("Idempotency-Key was already used with a different concern payload.");
    return toPackageModel(existing, true);
  }
  const now = dependencies.now?.() ?? new Date();
  const plan = buildConcernResolutionPlan(intake);
  const users = await repository.listAssignmentUsers();
  const tasks = buildAssignments(plan, users, actor, now);
  const managerOwner = users.find((candidate) => candidate.userRoles.some(({ role }) => role.name === "General Manager")) ?? users.find((candidate) => candidate.id === actor.id);
  if (!managerOwner) throw new Error("An active manager is required to own the concern.");
  const dueAt = new Date(Math.max(...tasks.map((task) => task.dueAt.getTime())));
  const pendingSubjectId = `pending-${hash.slice(0, 16)}`;
  const severityRequest = { decisionType: CASE_SEVERITY_DECISION_TYPE, algorithmVersion: CASE_SEVERITY_VERSION, subject: { type: "CASE" as const, id: pendingSubjectId }, customerId: intake.customerId, facts: {
    safetyRisk: intake.safetyRisk, legalRisk: intake.legalRisk, mobilityImpact: intake.mobilityImpact,
    financialExposure: intake.financialExposure, reputationalRisk: intake.reputationalRisk,
    ageAndMissedCommitments: Math.min(10, Math.floor(intake.daysOverdue / 7) + Math.min(5, intake.repeatContactCount * 2)), informationComplete: true
  } };
  const severityDecision = normalizeDecisionResult(severityRequest, crmDecisionRegistry.evaluate(severityRequest));
  const playbookRequest = { decisionType: CASE_PLAYBOOK_DECISION_TYPE, algorithmVersion: CASE_PLAYBOOK_VERSION, subject: { type: "CASE" as const, id: pendingSubjectId }, customerId: intake.customerId, facts: { category: plan.classification.primaryCategory, availableTemplateCode: plan.templateCode } };
  const playbookDecision = normalizeDecisionResult(playbookRequest, crmDecisionRegistry.evaluate(playbookRequest));
  const firstResponseMinutes = severityDecision.priority === "P0" ? 15 : severityDecision.priority === "P1" ? 120 : severityDecision.priority === "P2" ? 24 * 60 : 48 * 60;
  const firstResponseDueAt = new Date(now.getTime() + firstResponseMinutes * 60_000);
  const resolutionDueAt = dueAt;
  const customerUpdateDueAt = severityDecision.priority === "P0" ? new Date(now.getTime() + 2 * 60 * 60_000) : firstResponseDueAt;
  const input = {
    organizationId: INITIAL_ORGANIZATION.id, customerId: intake.customerId,
    concernNumber: concernNumber(now), idempotencyKey: key, requestHash: hash,
    intakeBoardDate: now.toISOString().slice(0, 10), title: plan.caseTitle, description: intake.description,
    category: plan.classification.primaryCategory, secondaryCategory: plan.classification.secondaryCategory,
    workflowArea: plan.classification.taskWorkflowArea as WorkflowArea, riskType: plan.classification.riskType,
    priority: plan.severity.priority as TaskTemplatePriority, source: intake.source as ConcernSource,
    customerReference: intake.customerReference, vehicleReference: intake.vehicleReference,
    reportedByUserId: actor.id, assignedOwnerId: managerOwner.id, dueAt,
    escalationRequired: plan.severity.escalationRequired,
    escalateAt: plan.severity.escalationRequired ? new Date(now.getTime() + 8 * 60 * 60 * 1000) : null,
    classification: plan.classification, severity: plan.severity, templateCode: plan.templateCode,
    templateVersion: plan.templateVersion, tasks, severityDecision, playbookDecision,
    firstResponseDueAt, resolutionDueAt, customerUpdateDueAt
  };
  try {
    return toPackageModel(await repository.createPackage(input));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrent = await repository.findByIdempotency(actor.id, key);
      if (concurrent?.requestHash === hash) return toPackageModel(concurrent, true);
    }
    throw error;
  }
}

export async function getConcernResolutionPackage(user: AuthenticatedUser | null, id: string, repository: ConcernResolutionRepository = createConcernResolutionRepository()) {
  if (!user) throw new Error("Authentication required.");
  const record = await repository.findById(id.trim());
  if (!record) throw new Error("Concern not found.");
  return toPackageModel(record);
}

export async function listConcernResolutionPackages(user: AuthenticatedUser | null, repository: ConcernResolutionRepository = createConcernResolutionRepository()) {
  if (!user) throw new Error("Authentication required.");
  const records = await repository.listRecent(12);
  return records.map((record) => toPackageModel(record));
}

function requiredClosureText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

export async function closeConcernResolution(user: AuthenticatedUser | null, id: string, value: unknown, dependencies: ConcernResolutionDependencies = {}) {
  const actor = requireManager(user);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Concern closure payload must be an object.");
  const input = value as Record<string, unknown>;
  const allowedOutcomes = Object.values(ConcernClosureOutcome);
  if (typeof input.outcome !== "string" || !allowedOutcomes.includes(input.outcome as ConcernClosureOutcome)) throw new Error("A resolved closure outcome is required.");
  const repository = dependencies.repository ?? createConcernResolutionRepository();
  const concern = await repository.findById(id.trim());
  if (!concern) throw new Error("Concern not found.");
  if (concern.status === "CLOSED") return toPackageModel(concern, true);
  const requiredLinks = concern.taskLinks.filter((link) => link.required);
  const unfinished = requiredLinks.filter((link) => link.task.status !== "COMPLETED");
  if (unfinished.length) throw new Error(`Concern cannot close while required tasks remain incomplete: ${unfinished.map((link) => link.stepCode).join(", ")}.`);
  const incompleteChecklist = requiredLinks.flatMap((link) => link.task.checklistItems.filter((item) => item.isRequired && !item.completed).map(() => link.stepCode));
  if (incompleteChecklist.length) throw new Error("Concern cannot close while required checklist evidence remains incomplete.");
  const managerReview = requiredLinks.find((link) => link.stepCode === "MANAGER_REVIEW");
  if (managerReview && !managerReview.task.reviewedByUserId) throw new Error("Concern requires completed manager review before closure.");
  const closed = await repository.closeConcern({ id: concern.id, actorUserId: actor.id, outcome: input.outcome as ConcernClosureOutcome, reason: requiredClosureText(input.reason, "Closure reason"), proof: requiredClosureText(input.proof, "Resolution proof"), closedAt: dependencies.now?.() ?? new Date() });
  return toPackageModel(closed);
}

export async function evaluateConcernEscalations(user: AuthenticatedUser | null, dependencies: ConcernResolutionDependencies = {}) {
  const actor = requireManager(user);
  return evaluateConcernEscalationsInternal(actor.id, dependencies);
}

async function evaluateConcernEscalationsInternal(actorUserId: string | null, dependencies: ConcernResolutionDependencies = {}) {
  const repository = dependencies.repository ?? createConcernResolutionRepository();
  const now = dependencies.now?.() ?? new Date();
  const candidates = await repository.listEscalationCandidates(now);
  const escalated = [];
  for (const concern of candidates) escalated.push(await repository.escalateConcern({ id: concern.id, boardDayId: concern.boardDayId, actorUserId, escalatedAt: now, reasonCode: "ESCALATION_DEADLINE_REACHED" }));
  return { evaluatedAt: now.toISOString(), candidateCount: candidates.length, escalatedCount: escalated.length, concerns: escalated.map((item) => ({ id: item.id, concernNumber: item.concernNumber, status: item.status })) };
}

export async function evaluateConcernEscalationsForSystem(dependencies: ConcernResolutionDependencies = {}) {
  return evaluateConcernEscalationsInternal(null, dependencies);
}

export async function fulfillCustomerUpdatePromise(user: AuthenticatedUser | null, promiseId: string, value: unknown, dependencies: ConcernResolutionDependencies = {}) {
  if (!user) throw new Error("Authentication required.");
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Promise fulfillment payload must be an object.");
  const notes = requiredClosureText((value as Record<string, unknown>).notes, "Promise fulfillment notes");
  const repository = dependencies.repository ?? createConcernResolutionRepository();
  const promise = await repository.findCustomerPromise(promiseId.trim());
  if (!promise) throw new Error("Customer promise not found.");
  if (!isManager(user) && promise.ownerUserId !== user.id) throw new Error("You do not have permission to fulfill this customer promise.");
  if (promise.status === "FULFILLED") return toPackageModel((await repository.findById(promise.concernCaseId))!, true);
  return toPackageModel(await repository.fulfillCustomerPromise({ id: promise.id, actorUserId: user.id, notes, fulfilledAt: dependencies.now?.() ?? new Date() }));
}
