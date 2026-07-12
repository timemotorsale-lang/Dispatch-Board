import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import {
  normalizeDecisionResult,
  normalizeEvaluationRequest,
  type CrmDecisionEvaluationRequest,
  type CrmDecisionResult
} from "@/server/customers/decisions/crm-decision-domain";
import {
  crmDecisionRegistry,
  type CrmDecisionRegistry
} from "@/server/customers/decisions/crm-decision-registry";
import {
  createCrmDecisionRepository,
  type CrmDecisionRecord,
  type CrmDecisionRepository
} from "@/server/repositories/crm-decision-repository";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";

export type CrmDecisionView = ReturnType<typeof toDecisionView>;

export type CrmDecisionServiceDependencies = {
  repository?: CrmDecisionRepository;
  registry?: CrmDecisionRegistry;
  now?: () => Date;
  organizationId?: string;
};

function asStringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toDecisionView(record: CrmDecisionRecord) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    decisionType: record.decisionType,
    algorithmVersion: record.algorithmVersion,
    subject: { type: record.subjectType, id: record.subjectId },
    customerId: record.customerId,
    score: record.score,
    priority: record.priority,
    recommendedOwnerId: record.recommendedOwnerId,
    recommendedActionCode: record.recommendedActionCode,
    dueAt: record.dueAt?.toISOString() ?? null,
    reasonCodes: asStringArray(record.reasonCodes),
    explanation: record.explanation,
    confidence: record.confidence,
    missingInputs: asStringArray(record.missingInputs),
    managerReviewRequired: record.managerReviewRequired,
    decidedAt: record.decidedAt.toISOString(),
    override: record.overriddenAt
      ? {
          overriddenAt: record.overriddenAt.toISOString(),
          overriddenBy: record.overriddenByUser,
          reason: record.overrideReason,
          recommendation: record.overrideSnapshot
        }
      : null
  };
}

function dependencies(input: CrmDecisionServiceDependencies) {
  return {
    repository: input.repository ?? createCrmDecisionRepository(),
    registry: input.registry ?? crmDecisionRegistry,
    now: input.now ?? (() => new Date()),
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id
  };
}

export async function evaluateCrmDecision(
  actor: AuthenticatedUser | null,
  request: CrmDecisionEvaluationRequest,
  input: CrmDecisionServiceDependencies = {}
) {
  assertAuthenticatedUser(actor);
  const deps = dependencies(input);
  const normalizedRequest = normalizeEvaluationRequest(request);
  const result = normalizeDecisionResult(
    normalizedRequest,
    deps.registry.evaluate(normalizedRequest)
  );
  const decidedAt = deps.now();
  const record = await deps.repository.create({
    organizationId: deps.organizationId,
    decisionType: result.decisionType,
    algorithmVersion: result.algorithmVersion,
    customerId: result.customerId,
    subjectType: result.subject.type,
    subjectId: result.subject.id,
    normalizedInput: normalizedRequest.facts as Prisma.InputJsonValue,
    score: result.score,
    priority: result.priority,
    recommendedOwnerId: result.recommendedOwnerId,
    recommendedActionCode: result.recommendedActionCode,
    dueAt: result.dueAt ? new Date(result.dueAt) : null,
    reasonCodes: result.reasonCodes,
    explanation: result.explanation,
    confidence: result.confidence,
    missingInputs: result.missingInputs,
    managerReviewRequired: result.managerReviewRequired,
    decidedAt
  });
  return toDecisionView(record);
}

export async function getCrmDecision(
  actor: AuthenticatedUser | null,
  id: string,
  input: CrmDecisionServiceDependencies = {}
) {
  assertAuthenticatedUser(actor);
  const decisionId = id.trim();
  if (!decisionId) throw new Error("CRM decision id is required.");
  const deps = dependencies(input);
  const record = await deps.repository.findById(deps.organizationId, decisionId);
  if (!record) throw new Error("CRM decision not found.");
  return toDecisionView(record);
}

export type OverrideCrmDecisionInput = {
  reason: string;
  recommendation: {
    priority?: string | null;
    recommendedOwnerId?: string | null;
    recommendedActionCode?: string | null;
    dueAt?: string | null;
  };
};

export async function overrideCrmDecision(
  actor: AuthenticatedUser | null,
  id: string,
  override: OverrideCrmDecisionInput,
  input: CrmDecisionServiceDependencies = {}
) {
  const authenticated = assertAuthenticatedUser(actor);
  if (!isManager(authenticated)) throw new Error("Manager access required.");
  const decisionId = id.trim();
  if (!decisionId) throw new Error("CRM decision id is required.");
  const reason = override.reason?.trim() ?? "";
  if (reason.length < 10) throw new Error("Decision overrides require a reason of at least 10 characters.");
  const recommendation = override.recommendation ?? {};
  if (recommendation.dueAt && Number.isNaN(Date.parse(recommendation.dueAt))) {
    throw new Error("Override due time must be ISO 8601 compatible.");
  }
  const deps = dependencies(input);
  const existing = await deps.repository.findById(deps.organizationId, decisionId);
  if (!existing) throw new Error("CRM decision not found.");
  if (existing.overriddenAt) throw new Error("CRM decision has already been overridden.");

  const record = await deps.repository.override({
    id: decisionId,
    organizationId: deps.organizationId,
    actorUserId: authenticated.id,
    reason,
    snapshot: recommendation as Prisma.InputJsonValue,
    overriddenAt: deps.now()
  });
  return toDecisionView(record);
}

export type { CrmDecisionResult };
