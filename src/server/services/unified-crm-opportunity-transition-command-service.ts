import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmOpportunityTransitionRepository,
  type UnifiedCrmOpportunityTransitionRepository
} from "@/server/repositories/unified-crm-opportunity-transition-repository";
import { getUnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-access";
import {
  UNIFIED_CRM_OPPORTUNITY_TRANSITION_COMMAND,
  UNIFIED_CRM_OPPORTUNITY_TRANSITION_COMMAND_CONTRACT_VERSION,
  UnifiedCrmOpportunityTransitionError,
  type UnifiedCrmOpportunityTransitionCommandInput,
  type UnifiedCrmOpportunityTransitionCommandResult
} from "@/server/unified-crm/opportunity-transition-command";
import type { UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import {
  isTerminalUnifiedCrmOpportunityStage,
  isUnifiedCrmOpportunityStage,
  type UnifiedCrmOpportunityStage
} from "@/server/unified-crm/opportunity-lifecycle";
import { normalizeUnifiedCrmOpportunityId } from "@/server/validation/unified-crm-opportunity";

type Dependencies = {
  accessContext?: UnifiedCrmOpportunityAccessContext;
  mode?: unknown;
  nodeEnv?: string;
  now?: () => Date;
  repository?: UnifiedCrmOpportunityTransitionRepository;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
};

type NormalizedTransitionCommand = {
  expectedVersion: number;
  handoffTarget: string | null;
  idempotencyKey: string;
  lostReason: string | null;
  nextActionDueAt: Date | null;
  nextActionLabel: string | null;
  reason: string;
  toStage: UnifiedCrmOpportunityStage;
  wonEvidence: string | null;
};

function text(value: unknown, field: string, max: number, required = true) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) {
    if (required) throw new UnifiedCrmOpportunityTransitionError("INVALID_OPPORTUNITY_TRANSITION", `${field} is required.`);
    return null;
  }
  if (result.length > max) {
    throw new UnifiedCrmOpportunityTransitionError("INVALID_OPPORTUNITY_TRANSITION", `${field} must be ${max} characters or fewer.`);
  }
  return result;
}

function version(value: unknown) {
  const result = typeof value === "number" ? value : Number(String(value ?? ""));
  if (!Number.isInteger(result) || result < 1) {
    throw new UnifiedCrmOpportunityTransitionError("INVALID_OPPORTUNITY_TRANSITION", "Expected version is required.");
  }
  return result;
}

function timestamp(value: unknown, field: string, now: Date, required: boolean) {
  if (value == null || value === "") {
    if (required) throw new UnifiedCrmOpportunityTransitionError("INVALID_OPPORTUNITY_TRANSITION", `${field} is required.`);
    return null;
  }
  const result = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(result.getTime())) {
    throw new UnifiedCrmOpportunityTransitionError("INVALID_OPPORTUNITY_TRANSITION", `${field} is invalid.`);
  }
  if (result.getTime() < now.getTime() - 60_000) {
    throw new UnifiedCrmOpportunityTransitionError("INVALID_OPPORTUNITY_TRANSITION", `${field} must be current or future.`);
  }
  return result;
}

function stage(value: unknown) {
  if (!isUnifiedCrmOpportunityStage(value)) {
    throw new UnifiedCrmOpportunityTransitionError("INVALID_OPPORTUNITY_TRANSITION", "Target stage is required.");
  }
  return value;
}

function normalizeCommand(input: UnifiedCrmOpportunityTransitionCommandInput, now: Date): NormalizedTransitionCommand {
  const toStage = stage(input.toStage);
  const terminal = isTerminalUnifiedCrmOpportunityStage(toStage);
  const active = !terminal;
  const normalized = {
    expectedVersion: version(input.expectedVersion),
    handoffTarget: text(input.handoffTarget, "Handoff target", 240, toStage === "WON"),
    idempotencyKey: text(input.idempotencyKey, "Idempotency key", 200)!,
    lostReason: text(input.lostReason, "Lost reason", 1000, toStage === "LOST"),
    nextActionDueAt: timestamp(input.nextActionDueAt, "Next action due time", now, active),
    nextActionLabel: text(input.nextActionLabel, "Next action", 240, active),
    reason: text(input.reason, "Transition reason", 1000)!,
    toStage,
    wonEvidence: text(input.wonEvidence, "Win evidence", 1000, toStage === "WON")
  };
  if (terminal && (normalized.nextActionDueAt || normalized.nextActionLabel)) {
    throw new UnifiedCrmOpportunityTransitionError("INVALID_OPPORTUNITY_TRANSITION", "Terminal opportunity stages cannot keep an active next action.");
  }
  return normalized;
}

export async function transitionUnifiedCrmOpportunity(
  actor: AuthenticatedUser | null,
  opportunityId: string,
  input: UnifiedCrmOpportunityTransitionCommandInput,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityTransitionCommandResult> {
  try {
    const now = dependencies.now?.() ?? new Date();
    const access = dependencies.accessContext ?? await getUnifiedCrmOpportunityAccessContext(actor, "transition", {
      mode: dependencies.mode,
      nodeEnv: dependencies.nodeEnv,
      now: () => now,
      scopeRepository: dependencies.scopeRepository
    });
    const normalizedOpportunityId = normalizeUnifiedCrmOpportunityId(opportunityId);
    const normalized = normalizeCommand(input, now);
    const command = normalizeEnterpriseCommand({
      actorUserId: actor!.id,
      commandType: UNIFIED_CRM_OPPORTUNITY_TRANSITION_COMMAND,
      domain: "UNIFIED_CRM",
      expectedVersion: normalized.expectedVersion,
      idempotencyKey: normalized.idempotencyKey,
      locationId: null,
      organizationId: access.organizationId,
      payload: {
        handoffTarget: normalized.handoffTarget,
        lostReason: normalized.lostReason,
        nextActionDueAt: normalized.nextActionDueAt?.toISOString() ?? null,
        nextActionLabel: normalized.nextActionLabel,
        toStage: normalized.toStage,
        wonEvidence: normalized.wonEvidence
      },
      reason: `Transition CRM opportunity: ${normalized.reason}`,
      subjectId: normalizedOpportunityId,
      subjectType: "OPPORTUNITY"
    });

    const repository = dependencies.repository ?? createUnifiedCrmOpportunityTransitionRepository();
    const result = await repository.transitionOpportunity({
      command: {
        actorUserId: actor!.id,
        commandType: command.commandType,
        correlationId: command.correlationId,
        expectedVersion: normalized.expectedVersion,
        handoffTarget: normalized.handoffTarget,
        idempotencyKey: command.idempotencyKey,
        lostReason: normalized.lostReason,
        nextActionDueAt: normalized.nextActionDueAt,
        nextActionLabel: normalized.nextActionLabel,
        opportunityId: normalizedOpportunityId,
        organizationId: access.organizationId,
        reason: command.reason,
        requestHash: command.requestHash,
        toStage: normalized.toStage,
        wonEvidence: normalized.wonEvidence
      },
      recordScope: access.recordScope
    });

    return {
      contractVersion: UNIFIED_CRM_OPPORTUNITY_TRANSITION_COMMAND_CONTRACT_VERSION,
      duplicate: result.duplicate,
      opportunity: {
        fromStage: result.fromStage,
        href: `/crm/opportunities/${encodeURIComponent(result.opportunityNumber)}`,
        id: result.id,
        nextActionDueAt: result.nextActionDueAt?.toISOString() ?? null,
        nextActionLabel: result.nextActionLabel,
        opportunityNumber: result.opportunityNumber,
        stage: result.stage,
        version: result.version
      }
    };
  } catch (error) {
    if (error instanceof UnifiedCrmOpportunityTransitionError) throw error;
    if (error instanceof Error && "code" in error) {
      const code = String((error as { code?: string }).code);
      if (code === "IDEMPOTENCY_KEY_REUSED") {
        throw new UnifiedCrmOpportunityTransitionError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used with a different opportunity transition request.");
      }
      if (code === "VERSION_CONFLICT") {
        throw new UnifiedCrmOpportunityTransitionError("VERSION_CONFLICT", "Opportunity was updated by another command. Reload and try again.");
      }
      if (code === "AUTHENTICATION_REQUIRED" || code === "OPPORTUNITY_NOT_AUTHORIZED" || code === "OPPORTUNITY_OFF" || code === "ORGANIZATION_SCOPE_AMBIGUOUS" || code === "ORGANIZATION_SCOPE_UNAVAILABLE") {
        throw new UnifiedCrmOpportunityTransitionError(code, error.message);
      }
      if (code === "OPPORTUNITY_MUTATION_HELD") {
        throw new UnifiedCrmOpportunityTransitionError("OPPORTUNITY_TRANSITION_NOT_AUTHORIZED", "Opportunity transition is not available for this viewer.");
      }
    }
    if (error instanceof Error && error.message === "Opportunity not available.") {
      throw new UnifiedCrmOpportunityTransitionError("OPPORTUNITY_NOT_AVAILABLE", "Opportunity is not available.");
    }
    throw new UnifiedCrmOpportunityTransitionError("OPPORTUNITY_SOURCE_UNAVAILABLE", "Opportunity transition could not be completed safely.", { cause: error });
  }
}
