import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import {
  createUnifiedCrmOpportunityTaskBridgeRepository,
  type UnifiedCrmOpportunityTaskBridgeRepository
} from "@/server/repositories/unified-crm-opportunity-task-bridge-repository";
import {
  getUnifiedCrmOpportunityAccessContext
} from "@/server/unified-crm/opportunity-access";
import {
  UNIFIED_CRM_OPPORTUNITY_TASK_BRIDGE_COMMAND,
  UNIFIED_CRM_OPPORTUNITY_TASK_BRIDGE_CONTRACT_VERSION,
  UnifiedCrmOpportunityTaskBridgeError,
  type UnifiedCrmOpportunityTaskBridgeCommandInput,
  type UnifiedCrmOpportunityTaskBridgeCommandResult
} from "@/server/unified-crm/opportunity-task-bridge-command";
import { normalizeUnifiedCrmOpportunityId } from "@/server/validation/unified-crm-opportunity";

type Dependencies = {
  mode?: unknown;
  nodeEnv?: string;
  now?: () => Date;
  repository?: UnifiedCrmOpportunityTaskBridgeRepository;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
};

function text(value: unknown, field: string, max: number, minimum = 1) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) {
    throw new UnifiedCrmOpportunityTaskBridgeError("INVALID_TASK_BRIDGE_COMMAND", `${field} is required.`);
  }
  if (result.length < minimum) {
    throw new UnifiedCrmOpportunityTaskBridgeError("INVALID_TASK_BRIDGE_COMMAND", `${field} must be at least ${minimum} characters.`);
  }
  if (result.length > max) {
    throw new UnifiedCrmOpportunityTaskBridgeError("INVALID_TASK_BRIDGE_COMMAND", `${field} must be ${max} characters or fewer.`);
  }
  return result;
}

function timestamp(value: unknown, field: string, now: Date) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    throw new UnifiedCrmOpportunityTaskBridgeError("INVALID_TASK_BRIDGE_COMMAND", `${field} is required.`);
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new UnifiedCrmOpportunityTaskBridgeError("INVALID_TASK_BRIDGE_COMMAND", `${field} is invalid.`);
  }
  if (parsed.getTime() < now.getTime() - 60_000) {
    throw new UnifiedCrmOpportunityTaskBridgeError("INVALID_TASK_BRIDGE_COMMAND", `${field} must be current or future.`);
  }
  return parsed;
}

function expectedVersion(value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new UnifiedCrmOpportunityTaskBridgeError("INVALID_TASK_BRIDGE_COMMAND", "Expected version is required.");
  }
  return Number(value);
}

function normalizeOpportunityId(value: unknown) {
  try {
    return normalizeUnifiedCrmOpportunityId(value);
  } catch {
    throw new UnifiedCrmOpportunityTaskBridgeError("OPPORTUNITY_NOT_AVAILABLE", "Opportunity is not available.");
  }
}

function normalizeCommand(value: UnifiedCrmOpportunityTaskBridgeCommandInput, now: Date) {
  return {
    brief: text(value.brief, "Brief", 500, 16),
    dueAt: timestamp(value.dueAt, "Due time", now),
    expectedVersion: expectedVersion(value.expectedVersion),
    idempotencyKey: text(value.idempotencyKey, "Idempotency key", 200),
    title: text(value.title, "Title", 240, 8)
  };
}

export async function createUnifiedCrmOpportunityTaskBridge(
  actor: AuthenticatedUser | null,
  opportunityIdValue: unknown,
  value: UnifiedCrmOpportunityTaskBridgeCommandInput,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityTaskBridgeCommandResult> {
  const now = dependencies.now?.() ?? new Date();
  const opportunityId = normalizeOpportunityId(opportunityIdValue);
  const normalized = normalizeCommand(value, now);
  const repository = dependencies.repository ?? createUnifiedCrmOpportunityTaskBridgeRepository(prisma);

  try {
    const access = await getUnifiedCrmOpportunityAccessContext(actor, "link-task", {
      mode: dependencies.mode,
      nodeEnv: dependencies.nodeEnv,
      now: () => now,
      scopeRepository: dependencies.scopeRepository
    });
    const command = normalizeEnterpriseCommand({
      actorUserId: actor!.id,
      commandType: UNIFIED_CRM_OPPORTUNITY_TASK_BRIDGE_COMMAND,
      domain: "UNIFIED_CRM",
      expectedVersion: normalized.expectedVersion,
      idempotencyKey: normalized.idempotencyKey,
      locationId: null,
      organizationId: access.organizationId,
      payload: {
        brief: normalized.brief,
        dueAt: normalized.dueAt.toISOString(),
        title: normalized.title
      },
      reason: "Create governed CRM opportunity follow-up task.",
      subjectId: opportunityId,
      subjectType: "OPPORTUNITY"
    });

    const result = await repository.commitTaskBridge({
      actor: actor!,
      command: {
        actorUserId: actor!.id,
        brief: normalized.brief,
        commandType: command.commandType,
        correlationId: command.correlationId,
        domain: command.domain,
        dueAt: normalized.dueAt,
        expectedVersion: normalized.expectedVersion,
        idempotencyKey: command.idempotencyKey,
        opportunityId,
        organizationId: access.organizationId,
        reason: command.reason,
        requestHash: command.requestHash,
        title: normalized.title
      },
      recordScope: access.recordScope
    });

    return {
      contractVersion: UNIFIED_CRM_OPPORTUNITY_TASK_BRIDGE_CONTRACT_VERSION,
      duplicate: result.duplicate,
      opportunityId: result.opportunityId,
      task: {
        dueAt: result.task.dueAt.toISOString(),
        href: `/tasks/${encodeURIComponent(result.task.id)}`,
        id: result.task.id,
        title: result.task.title
      }
    };
  } catch (error) {
    if (error instanceof UnifiedCrmOpportunityTaskBridgeError) throw error;
    if (error instanceof Error && "code" in error) {
      const code = String((error as { code?: string }).code);
      if (code === "AUTHENTICATION_REQUIRED") {
        throw new UnifiedCrmOpportunityTaskBridgeError("AUTHENTICATION_REQUIRED", "CRM opportunity task handoff is temporarily unavailable.");
      }
      if (code === "OPPORTUNITY_OFF" || code === "OPPORTUNITY_MUTATION_HELD") {
        throw new UnifiedCrmOpportunityTaskBridgeError("OPPORTUNITY_TASK_BRIDGE_OFF", "CRM opportunity task handoff is temporarily unavailable.");
      }
      if (code === "OPPORTUNITY_NOT_AUTHORIZED") {
        throw new UnifiedCrmOpportunityTaskBridgeError("OPPORTUNITY_TASK_BRIDGE_NOT_AUTHORIZED", "CRM opportunity task handoff is temporarily unavailable.");
      }
      if (code === "ORGANIZATION_SCOPE_UNAVAILABLE" || code === "ORGANIZATION_SCOPE_AMBIGUOUS") {
        throw new UnifiedCrmOpportunityTaskBridgeError(code, error.message);
      }
      if (code === "IDEMPOTENCY_KEY_REUSED") {
        throw new UnifiedCrmOpportunityTaskBridgeError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used with a different CRM opportunity task handoff.");
      }
    }
    if (error instanceof Error && error.message === "Opportunity not available.") {
      throw new UnifiedCrmOpportunityTaskBridgeError("OPPORTUNITY_NOT_AVAILABLE", "Opportunity is not available.");
    }
    if (error instanceof Error && error.message === "Opportunity version conflict.") {
      throw new UnifiedCrmOpportunityTaskBridgeError("OPPORTUNITY_VERSION_CONFLICT", "Opportunity changed before the task could be linked.");
    }
    throw new UnifiedCrmOpportunityTaskBridgeError("TASK_SOURCE_UNAVAILABLE", "CRM opportunity task handoff could not be completed safely.", { cause: error });
  }
}
