import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmCustomerReadRepository,
  type UnifiedCrmCustomerReadRepository
} from "@/server/repositories/unified-crm-customer-read-repository";
import {
  createUnifiedCrmCustomerNextActionRepository,
  type UnifiedCrmCustomerNextActionRepository
} from "@/server/repositories/unified-crm-customer-next-action-repository";
import {
  requireUnifiedCrmCustomer360Access,
  type UnifiedCrmCustomer360AccessOptions
} from "@/server/unified-crm/customer-360-access";
import {
  UNIFIED_CRM_CUSTOMER_NEXT_ACTION_COMMAND,
  UNIFIED_CRM_CUSTOMER_NEXT_ACTION_CONTRACT_VERSION,
  UnifiedCrmCustomerNextActionError,
  type UnifiedCrmCustomerNextActionCommand,
  type UnifiedCrmCustomerNextActionCommandInput,
  type UnifiedCrmCustomerNextActionCommandResult,
  type UnifiedCrmCustomerNextActionOperation
} from "@/server/unified-crm/customer-next-action-command";

type Dependencies = UnifiedCrmCustomer360AccessOptions & {
  now?: () => Date;
  repository?: UnifiedCrmCustomerNextActionRepository;
  scopeRepository?: Pick<UnifiedCrmCustomerReadRepository, "listActiveOrganizationIds">;
};

function text(value: unknown, field: string, max: number, required = true) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) {
    if (required) throw new UnifiedCrmCustomerNextActionError("INVALID_NEXT_ACTION_COMMAND", `${field} is required.`);
    return null;
  }
  if (result.length > max) {
    throw new UnifiedCrmCustomerNextActionError("INVALID_NEXT_ACTION_COMMAND", `${field} must be ${max} characters or fewer.`);
  }
  return result;
}

function operation(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (normalized !== "SET" && normalized !== "COMPLETE") {
    throw new UnifiedCrmCustomerNextActionError("INVALID_NEXT_ACTION_COMMAND", "Operation is invalid.");
  }
  return normalized as UnifiedCrmCustomerNextActionOperation;
}

function timestamp(value: unknown, field: string, required = true) {
  if (value == null || value === "") {
    if (!required) return null;
    throw new UnifiedCrmCustomerNextActionError("INVALID_NEXT_ACTION_COMMAND", `${field} is required.`);
  }
  const result = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(result.getTime())) {
    throw new UnifiedCrmCustomerNextActionError("INVALID_NEXT_ACTION_COMMAND", `${field} is invalid.`);
  }
  return result;
}

function normalizeCommand(value: UnifiedCrmCustomerNextActionCommandInput, now: Date): UnifiedCrmCustomerNextActionCommand {
  const nextOperation = operation(value.operation);
  const dueAt = nextOperation === "SET" ? timestamp(value.dueAt, "Due time") : null;
  if (dueAt && dueAt.getTime() < now.getTime() - 60_000) {
    throw new UnifiedCrmCustomerNextActionError("INVALID_NEXT_ACTION_COMMAND", "Due time must be current or future.");
  }
  return {
    dueAt,
    expectedCurrentNextActionAt: timestamp(value.expectedCurrentNextActionAt, "Current next action time", false),
    idempotencyKey: text(value.idempotencyKey, "Idempotency key", 200)!,
    note: text(value.note, "Note", 240, false),
    operation: nextOperation
  };
}

export async function updateUnifiedCrmCustomerNextAction(
  actor: AuthenticatedUser | null,
  customerId: string,
  value: UnifiedCrmCustomerNextActionCommandInput,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmCustomerNextActionCommandResult> {
  const access = requireUnifiedCrmCustomer360Access(actor, dependencies);
  const now = dependencies.now?.() ?? new Date();
  const normalizedCommand = normalizeCommand(value, now);
  const scopeRepository = dependencies.scopeRepository ?? createUnifiedCrmCustomerReadRepository();
  const repository = dependencies.repository ?? createUnifiedCrmCustomerNextActionRepository();

  try {
    const organizationIds = await scopeRepository.listActiveOrganizationIds(actor!.id, now);
    if (organizationIds.length !== 1) {
      throw new UnifiedCrmCustomerNextActionError("CUSTOMER_SOURCE_UNAVAILABLE", "Customer next action requires one active organization scope.");
    }
    const organizationId = organizationIds[0];
    const command = normalizeEnterpriseCommand({
      actorUserId: actor!.id,
      commandType: UNIFIED_CRM_CUSTOMER_NEXT_ACTION_COMMAND,
      domain: "UNIFIED_CRM",
      expectedVersion: 0,
      idempotencyKey: normalizedCommand.idempotencyKey,
      locationId: null,
      organizationId,
      payload: {
        dueAt: normalizedCommand.dueAt?.toISOString() ?? null,
        expectedCurrentNextActionAt: normalizedCommand.expectedCurrentNextActionAt?.toISOString() ?? null,
        note: normalizedCommand.note,
        operation: normalizedCommand.operation
      },
      reason: normalizedCommand.operation === "COMPLETE"
        ? "Complete CRM customer next action."
        : `Set CRM customer next action${normalizedCommand.note ? `: ${normalizedCommand.note}` : "."}`,
      subjectId: customerId.trim(),
      subjectType: "CUSTOMER"
    });

    const result = await repository.commitNextAction({
      command: {
        actorUserId: actor!.id,
        commandType: command.commandType,
        correlationId: command.correlationId,
        customerId: customerId.trim(),
        domain: command.domain,
        dueAt: normalizedCommand.dueAt,
        expectedCurrentNextActionAt: normalizedCommand.expectedCurrentNextActionAt,
        idempotencyKey: command.idempotencyKey,
        note: normalizedCommand.note,
        operation: normalizedCommand.operation,
        organizationId,
        reason: command.reason,
        requestHash: command.requestHash
      },
      recordScope: access.recordScope
    });

    return {
      contractVersion: UNIFIED_CRM_CUSTOMER_NEXT_ACTION_CONTRACT_VERSION,
      customerId: result.customerId,
      duplicate: result.duplicate,
      nextActionAt: result.nextActionAt?.toISOString() ?? null,
      operation: result.operation,
      version: result.version
    };
  } catch (error) {
    if (error instanceof UnifiedCrmCustomerNextActionError) throw error;
    if (error instanceof Error && error.message === "Customer not available.") {
      throw new UnifiedCrmCustomerNextActionError("CUSTOMER_NOT_AVAILABLE", "Customer details are not available.");
    }
    if (error instanceof Error && error.message === "Customer owner required.") {
      throw new UnifiedCrmCustomerNextActionError("CUSTOMER_OWNER_REQUIRED", "An assigned customer owner is required before setting a next action.");
    }
    if (error instanceof Error && error.message === "Stale next action.") {
      throw new UnifiedCrmCustomerNextActionError("STALE_NEXT_ACTION", "The customer next action changed before your update could be applied.");
    }
    if (error instanceof Error && "code" in error && String((error as { code?: string }).code) === "IDEMPOTENCY_KEY_REUSED") {
      throw new UnifiedCrmCustomerNextActionError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used with a different next action update.");
    }
    throw new UnifiedCrmCustomerNextActionError("CUSTOMER_SOURCE_UNAVAILABLE", "Customer next action could not be updated safely.", { cause: error });
  }
}
