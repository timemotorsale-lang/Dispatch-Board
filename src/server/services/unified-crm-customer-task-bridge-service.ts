import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import {
  createUnifiedCrmCustomerReadRepository,
  type UnifiedCrmCustomerReadRepository
} from "@/server/repositories/unified-crm-customer-read-repository";
import {
  createUnifiedCrmCustomerTaskBridgeRepository,
  type UnifiedCrmCustomerTaskBridgeRepository
} from "@/server/repositories/unified-crm-customer-task-bridge-repository";
import {
  requireUnifiedCrmCustomerTaskBridgeAccess,
  type UnifiedCrmCustomerTaskBridgeAccessOptions
} from "@/server/unified-crm/customer-task-bridge-access";
import {
  UNIFIED_CRM_CUSTOMER_TASK_BRIDGE_COMMAND,
  UNIFIED_CRM_CUSTOMER_TASK_BRIDGE_CONTRACT_VERSION,
  UnifiedCrmCustomerTaskBridgeError,
  type UnifiedCrmCustomerTaskBridgeCommandInput,
  type UnifiedCrmCustomerTaskBridgeCommandResult
} from "@/server/unified-crm/customer-task-bridge-command";

type Dependencies = UnifiedCrmCustomerTaskBridgeAccessOptions & {
  now?: () => Date;
  repository?: UnifiedCrmCustomerTaskBridgeRepository;
  scopeRepository?: Pick<UnifiedCrmCustomerReadRepository, "listActiveOrganizationIds">;
};

function text(value: unknown, field: string, max: number, minimum = 1) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) {
    throw new UnifiedCrmCustomerTaskBridgeError("INVALID_TASK_BRIDGE_COMMAND", `${field} is required.`);
  }
  if (result.length < minimum) {
    throw new UnifiedCrmCustomerTaskBridgeError("INVALID_TASK_BRIDGE_COMMAND", `${field} must be at least ${minimum} characters.`);
  }
  if (result.length > max) {
    throw new UnifiedCrmCustomerTaskBridgeError("INVALID_TASK_BRIDGE_COMMAND", `${field} must be ${max} characters or fewer.`);
  }
  return result;
}

function timestamp(value: unknown, field: string, now: Date) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    throw new UnifiedCrmCustomerTaskBridgeError("INVALID_TASK_BRIDGE_COMMAND", `${field} is required.`);
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new UnifiedCrmCustomerTaskBridgeError("INVALID_TASK_BRIDGE_COMMAND", `${field} is invalid.`);
  }
  if (parsed.getTime() < now.getTime() - 60_000) {
    throw new UnifiedCrmCustomerTaskBridgeError("INVALID_TASK_BRIDGE_COMMAND", `${field} must be current or future.`);
  }
  return parsed;
}

function normalizeCustomerId(value: unknown) {
  if (typeof value !== "string") {
    throw new UnifiedCrmCustomerTaskBridgeError("CUSTOMER_NOT_AVAILABLE", "Customer is not available.");
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 200) {
    throw new UnifiedCrmCustomerTaskBridgeError("CUSTOMER_NOT_AVAILABLE", "Customer is not available.");
  }
  return trimmed;
}

function normalizeCommand(value: UnifiedCrmCustomerTaskBridgeCommandInput, now: Date) {
  return {
    brief: text(value.brief, "Brief", 500, 16),
    dueAt: timestamp(value.dueAt, "Due time", now),
    idempotencyKey: text(value.idempotencyKey, "Idempotency key", 200),
    title: text(value.title, "Title", 240, 8)
  };
}

export async function createUnifiedCrmCustomerTaskBridge(
  actor: AuthenticatedUser | null,
  customerIdValue: unknown,
  value: UnifiedCrmCustomerTaskBridgeCommandInput,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmCustomerTaskBridgeCommandResult> {
  const access = requireUnifiedCrmCustomerTaskBridgeAccess(actor, dependencies);
  const now = dependencies.now?.() ?? new Date();
  const customerId = normalizeCustomerId(customerIdValue);
  const normalized = normalizeCommand(value, now);
  const scopeRepository = dependencies.scopeRepository ?? createUnifiedCrmCustomerReadRepository();
  const repository = dependencies.repository ?? createUnifiedCrmCustomerTaskBridgeRepository(prisma);

  try {
    const organizationIds = await scopeRepository.listActiveOrganizationIds(actor!.id, now);
    if (organizationIds.length === 0) {
      throw new UnifiedCrmCustomerTaskBridgeError(
        "ORGANIZATION_SCOPE_UNAVAILABLE",
        "CRM task handoff is not available for this viewer."
      );
    }
    if (organizationIds.length > 1) {
      throw new UnifiedCrmCustomerTaskBridgeError(
        "ORGANIZATION_SCOPE_AMBIGUOUS",
        "Select one authorized organization before creating a CRM task."
      );
    }

    const command = normalizeEnterpriseCommand({
      actorUserId: actor!.id,
      commandType: UNIFIED_CRM_CUSTOMER_TASK_BRIDGE_COMMAND,
      domain: "UNIFIED_CRM",
      expectedVersion: 0,
      idempotencyKey: normalized.idempotencyKey,
      locationId: null,
      organizationId: organizationIds[0],
      payload: {
        brief: normalized.brief,
        dueAt: normalized.dueAt.toISOString(),
        title: normalized.title
      },
      reason: "Create governed CRM follow-up task.",
      subjectId: customerId,
      subjectType: "CUSTOMER"
    });

    const result = await repository.commitTaskBridge({
      actor: actor!,
      command: {
        actorUserId: actor!.id,
        brief: normalized.brief,
        commandType: command.commandType,
        correlationId: command.correlationId,
        customerId,
        domain: command.domain,
        dueAt: normalized.dueAt,
        idempotencyKey: command.idempotencyKey,
        organizationId: organizationIds[0],
        reason: command.reason,
        requestHash: command.requestHash,
        title: normalized.title
      },
      recordScope: access.recordScope
    });

    return {
      contractVersion: UNIFIED_CRM_CUSTOMER_TASK_BRIDGE_CONTRACT_VERSION,
      customerId: result.customerId,
      duplicate: result.duplicate,
      task: {
        dueAt: result.task.dueAt.toISOString(),
        href: `/tasks/${encodeURIComponent(result.task.id)}`,
        id: result.task.id,
        title: result.task.title
      }
    };
  } catch (error) {
    if (error instanceof UnifiedCrmCustomerTaskBridgeError) throw error;
    if (error instanceof Error && error.message === "Customer not available.") {
      throw new UnifiedCrmCustomerTaskBridgeError("CUSTOMER_NOT_AVAILABLE", "Customer is not available.");
    }
    if (error instanceof Error && error.message === "Customer task bridge idempotency scope is unavailable.") {
      throw new UnifiedCrmCustomerTaskBridgeError("CUSTOMER_SOURCE_UNAVAILABLE", "CRM task handoff could not be completed safely.");
    }
    if (error instanceof Error && error.message === "Stored customer task bridge replay is invalid.") {
      throw new UnifiedCrmCustomerTaskBridgeError("CUSTOMER_SOURCE_UNAVAILABLE", "CRM task handoff could not be completed safely.");
    }
    if (error instanceof Error && "code" in error && String((error as { code?: string }).code) === "IDEMPOTENCY_KEY_REUSED") {
      throw new UnifiedCrmCustomerTaskBridgeError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used with a different CRM task handoff.");
    }
    throw new UnifiedCrmCustomerTaskBridgeError("TASK_SOURCE_UNAVAILABLE", "CRM task handoff could not be completed safely.", { cause: error });
  }
}
