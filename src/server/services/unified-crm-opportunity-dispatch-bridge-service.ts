import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import {
  createUnifiedCrmOpportunityDispatchBridgeRepository,
  type UnifiedCrmOpportunityDispatchBridgeRepository
} from "@/server/repositories/unified-crm-opportunity-dispatch-bridge-repository";
import { getUnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-access";
import {
  UNIFIED_CRM_OPPORTUNITY_DISPATCH_BRIDGE_COMMAND,
  UNIFIED_CRM_OPPORTUNITY_DISPATCH_BRIDGE_CONTRACT_VERSION,
  UnifiedCrmOpportunityDispatchBridgeError,
  type UnifiedCrmOpportunityDispatchBridgeCommandInput,
  type UnifiedCrmOpportunityDispatchBridgeCommandResult,
  type UnifiedCrmOpportunityDispatchTargetKind
} from "@/server/unified-crm/opportunity-dispatch-bridge-command";
import { normalizeUnifiedCrmOpportunityId } from "@/server/validation/unified-crm-opportunity";

type Dependencies = {
  mode?: unknown;
  nodeEnv?: string;
  now?: () => Date;
  repository?: UnifiedCrmOpportunityDispatchBridgeRepository;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
};

function text(value: unknown, field: string, max: number, minimum = 1) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) {
    throw new UnifiedCrmOpportunityDispatchBridgeError("INVALID_DISPATCH_BRIDGE_COMMAND", `${field} is required.`);
  }
  if (result.length < minimum) {
    throw new UnifiedCrmOpportunityDispatchBridgeError("INVALID_DISPATCH_BRIDGE_COMMAND", `${field} must be at least ${minimum} characters.`);
  }
  if (result.length > max) {
    throw new UnifiedCrmOpportunityDispatchBridgeError("INVALID_DISPATCH_BRIDGE_COMMAND", `${field} must be ${max} characters or fewer.`);
  }
  return result;
}

function expectedVersion(value: unknown, field: string) {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new UnifiedCrmOpportunityDispatchBridgeError("INVALID_DISPATCH_BRIDGE_COMMAND", `${field} is required.`);
  }
  return Number(value);
}

function normalizeOpportunityId(value: unknown) {
  try {
    return normalizeUnifiedCrmOpportunityId(value);
  } catch {
    throw new UnifiedCrmOpportunityDispatchBridgeError("OPPORTUNITY_NOT_AVAILABLE", "Opportunity is not available.");
  }
}

function normalizeTargetKind(value: unknown): UnifiedCrmOpportunityDispatchTargetKind {
  if (value === "REPAIR_ORDER" || value === "REPAIR_JOB") return value;
  throw new UnifiedCrmOpportunityDispatchBridgeError("INVALID_DISPATCH_BRIDGE_COMMAND", "Dispatch target kind is required.");
}

function normalizeCommand(value: UnifiedCrmOpportunityDispatchBridgeCommandInput) {
  if (!value || typeof value !== "object") {
    throw new UnifiedCrmOpportunityDispatchBridgeError("INVALID_DISPATCH_BRIDGE_COMMAND", "Dispatch bridge command is required.");
  }
  const targetKind = normalizeTargetKind(value.targetKind);
  const base = {
    expectedTargetVersion: expectedVersion(value.expectedTargetVersion, "Expected target version"),
    expectedVersion: expectedVersion(value.expectedVersion, "Expected version"),
    idempotencyKey: text(value.idempotencyKey, "Idempotency key", 200),
    targetKind
  };

  if (targetKind === "REPAIR_ORDER") {
    return {
      ...base,
      targetId: text("repairOrderId" in value ? value.repairOrderId : undefined, "Repair order", 120, 3)
    };
  }
  return {
    ...base,
    targetId: text("repairJobId" in value ? value.repairJobId : undefined, "Repair job", 120, 3)
  };
}

export async function createUnifiedCrmOpportunityDispatchBridge(
  actor: AuthenticatedUser | null,
  opportunityIdValue: unknown,
  value: UnifiedCrmOpportunityDispatchBridgeCommandInput,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityDispatchBridgeCommandResult> {
  const now = dependencies.now?.() ?? new Date();
  const opportunityId = normalizeOpportunityId(opportunityIdValue);
  const normalized = normalizeCommand(value);
  const repository = dependencies.repository ?? createUnifiedCrmOpportunityDispatchBridgeRepository(prisma);

  try {
    const access = await getUnifiedCrmOpportunityAccessContext(actor, "link-dispatch", {
      mode: dependencies.mode,
      nodeEnv: dependencies.nodeEnv,
      now: () => now,
      scopeRepository: dependencies.scopeRepository
    });
    const command = normalizeEnterpriseCommand({
      actorUserId: actor!.id,
      commandType: UNIFIED_CRM_OPPORTUNITY_DISPATCH_BRIDGE_COMMAND,
      domain: "UNIFIED_CRM",
      expectedVersion: normalized.expectedVersion,
      idempotencyKey: normalized.idempotencyKey,
      locationId: null,
      organizationId: access.organizationId,
      payload: {
        expectedTargetVersion: normalized.expectedTargetVersion,
        targetId: normalized.targetId,
        targetKind: normalized.targetKind
      },
      reason: "Link governed CRM opportunity to Dispatch work.",
      subjectId: opportunityId,
      subjectType: "OPPORTUNITY"
    });

    const result = await repository.commitDispatchBridge({
      command: {
        actorUserId: actor!.id,
        commandType: command.commandType,
        correlationId: command.correlationId,
        domain: command.domain,
        expectedTargetVersion: normalized.expectedTargetVersion,
        expectedVersion: normalized.expectedVersion,
        idempotencyKey: command.idempotencyKey,
        opportunityId,
        organizationId: access.organizationId,
        reason: command.reason,
        requestHash: command.requestHash,
        targetId: normalized.targetId,
        targetKind: normalized.targetKind
      },
      recordScope: access.recordScope
    });

    return {
      contractVersion: UNIFIED_CRM_OPPORTUNITY_DISPATCH_BRIDGE_CONTRACT_VERSION,
      duplicate: result.duplicate,
      opportunityId: result.opportunityId,
      target: result.target
    };
  } catch (error) {
    if (error instanceof UnifiedCrmOpportunityDispatchBridgeError) throw error;
    if (error instanceof Error && "code" in error) {
      const code = String((error as { code?: string }).code);
      if (code === "AUTHENTICATION_REQUIRED") {
        throw new UnifiedCrmOpportunityDispatchBridgeError("AUTHENTICATION_REQUIRED", "CRM opportunity dispatch bridge is temporarily unavailable.");
      }
      if (code === "OPPORTUNITY_OFF" || code === "OPPORTUNITY_MUTATION_HELD") {
        throw new UnifiedCrmOpportunityDispatchBridgeError("DISPATCH_BRIDGE_OFF", "CRM opportunity dispatch bridge is temporarily unavailable.");
      }
      if (code === "OPPORTUNITY_NOT_AUTHORIZED") {
        throw new UnifiedCrmOpportunityDispatchBridgeError("DISPATCH_BRIDGE_NOT_AUTHORIZED", "CRM opportunity dispatch bridge is temporarily unavailable.");
      }
      if (code === "ORGANIZATION_SCOPE_UNAVAILABLE" || code === "ORGANIZATION_SCOPE_AMBIGUOUS") {
        throw new UnifiedCrmOpportunityDispatchBridgeError(code, error.message);
      }
      if (code === "IDEMPOTENCY_KEY_REUSED") {
        throw new UnifiedCrmOpportunityDispatchBridgeError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used with a different CRM opportunity dispatch bridge.");
      }
    }
    if (error instanceof Error && error.message === "Opportunity not available.") {
      throw new UnifiedCrmOpportunityDispatchBridgeError("OPPORTUNITY_NOT_AVAILABLE", "Opportunity is not available.");
    }
    if (error instanceof Error && error.message === "Opportunity version conflict.") {
      throw new UnifiedCrmOpportunityDispatchBridgeError("OPPORTUNITY_VERSION_CONFLICT", "Opportunity changed before dispatch work could be linked.");
    }
    if (error instanceof Error && error.message === "Dispatch target not available.") {
      throw new UnifiedCrmOpportunityDispatchBridgeError("DISPATCH_TARGET_NOT_AVAILABLE", "Dispatch work is not available.");
    }
    if (error instanceof Error && error.message === "Dispatch target version conflict.") {
      throw new UnifiedCrmOpportunityDispatchBridgeError("DISPATCH_TARGET_VERSION_CONFLICT", "Dispatch work changed before it could be linked.");
    }
    throw new UnifiedCrmOpportunityDispatchBridgeError("DISPATCH_SOURCE_UNAVAILABLE", "CRM opportunity dispatch bridge could not be completed safely.", { cause: error });
  }
}
