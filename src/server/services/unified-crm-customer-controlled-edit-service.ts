import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmCustomerControlledEditRepository,
  type UnifiedCrmCustomerControlledEditRepository
} from "@/server/repositories/unified-crm-customer-controlled-edit-repository";
import {
  createUnifiedCrmCustomerReadRepository,
  type UnifiedCrmCustomerReadRepository
} from "@/server/repositories/unified-crm-customer-read-repository";
import { requireUnifiedCrmCustomerControlledEditAccess, type UnifiedCrmCustomerControlledEditAccessOptions } from "@/server/unified-crm/customer-controlled-edit-access";
import {
  UNIFIED_CRM_CUSTOMER_CONTROLLED_EDIT_COMMAND,
  UNIFIED_CRM_CUSTOMER_CONTROLLED_EDIT_CONTRACT_VERSION,
  UnifiedCrmCustomerControlledEditError,
  type UnifiedCrmCustomerControlledEditCommand,
  type UnifiedCrmCustomerControlledEditInput,
  type UnifiedCrmCustomerControlledEditResult
} from "@/server/unified-crm/customer-controlled-edit-command";

type Dependencies = UnifiedCrmCustomerControlledEditAccessOptions & {
  now?: () => Date;
  repository?: UnifiedCrmCustomerControlledEditRepository;
  scopeRepository?: Pick<UnifiedCrmCustomerReadRepository, "listActiveOrganizationIds">;
};

function normalizeCustomerId(value: unknown) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > 200) {
    throw new UnifiedCrmCustomerControlledEditError("INVALID_CUSTOMER_EDIT_COMMAND", "Customer identifier is invalid.");
  }
  return result;
}

function requiredText(value: unknown, field: string, max: number) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new UnifiedCrmCustomerControlledEditError("INVALID_CUSTOMER_EDIT_COMMAND", `${field} is required.`);
  if (result.length > max) {
    throw new UnifiedCrmCustomerControlledEditError("INVALID_CUSTOMER_EDIT_COMMAND", `${field} must be ${max} characters or fewer.`);
  }
  return result;
}

function optionalText(value: unknown, field: string, max: number) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) return null;
  if (result.length > max) {
    throw new UnifiedCrmCustomerControlledEditError("INVALID_CUSTOMER_EDIT_COMMAND", `${field} must be ${max} characters or fewer.`);
  }
  return result;
}

function normalizeVersion(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 1_000_000) {
    throw new UnifiedCrmCustomerControlledEditError("INVALID_CUSTOMER_EDIT_COMMAND", "Expected version is invalid.");
  }
  return value;
}

function normalizeEmail(value: string | null | undefined) {
  if (!value) return value;
  const normalized = value.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new UnifiedCrmCustomerControlledEditError("INVALID_CUSTOMER_EDIT_COMMAND", "Email address is invalid.");
  }
  return normalized;
}

function normalizePhone(value: string | null | undefined) {
  if (!value) return value;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    throw new UnifiedCrmCustomerControlledEditError("INVALID_CUSTOMER_EDIT_COMMAND", "Phone number is invalid.");
  }
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

function normalizeCommand(value: UnifiedCrmCustomerControlledEditInput): UnifiedCrmCustomerControlledEditCommand {
  const command = {
    displayName: optionalText(value.displayName, "Display name", 160) ?? undefined,
    email: normalizeEmail(optionalText(value.email, "Email", 254)),
    expectedVersion: normalizeVersion(value.expectedVersion),
    idempotencyKey: requiredText(value.idempotencyKey, "Idempotency key", 200),
    phoneNumber: normalizePhone(optionalText(value.phoneNumber, "Phone number", 40)),
    preferredContactMethod: optionalText(value.preferredContactMethod, "Preferred contact method", 40),
    reason: requiredText(value.reason, "Edit reason", 300)
  };
  const changedFields = changedFieldNames(command);
  if (!changedFields.length) {
    throw new UnifiedCrmCustomerControlledEditError("INVALID_CUSTOMER_EDIT_COMMAND", "At least one approved customer field is required.");
  }
  return command;
}

function changedFieldNames(command: Omit<UnifiedCrmCustomerControlledEditCommand, "expectedVersion" | "idempotencyKey" | "reason">) {
  return [
    command.displayName !== undefined ? "displayName" : null,
    command.email !== undefined ? "email" : null,
    command.phoneNumber !== undefined ? "phoneNumber" : null,
    command.preferredContactMethod !== undefined ? "preferredContactMethod" : null
  ].filter((field): field is string => Boolean(field));
}

export async function updateUnifiedCrmCustomerControlledEdit(
  actor: AuthenticatedUser | null,
  customerId: string,
  value: UnifiedCrmCustomerControlledEditInput,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmCustomerControlledEditResult> {
  const access = requireUnifiedCrmCustomerControlledEditAccess(actor, dependencies);
  const normalizedCustomerId = normalizeCustomerId(customerId);
  const normalizedCommand = normalizeCommand(value);
  const now = dependencies.now?.() ?? new Date();
  const scopeRepository = dependencies.scopeRepository ?? createUnifiedCrmCustomerReadRepository();
  const repository = dependencies.repository ?? createUnifiedCrmCustomerControlledEditRepository();

  try {
    const organizationIds = await scopeRepository.listActiveOrganizationIds(actor!.id, now);
    if (organizationIds.length === 0) {
      throw new UnifiedCrmCustomerControlledEditError("CUSTOMER_360_NOT_AUTHORIZED", "Customer edit is not available for this viewer.");
    }
    if (organizationIds.length > 1) {
      throw new UnifiedCrmCustomerControlledEditError("CUSTOMER_SOURCE_UNAVAILABLE", "Customer edit requires one active organization scope.");
    }
    const organizationId = organizationIds[0];
    const changedFields = changedFieldNames(normalizedCommand);
    const command = normalizeEnterpriseCommand({
      actorUserId: actor!.id,
      commandType: UNIFIED_CRM_CUSTOMER_CONTROLLED_EDIT_COMMAND,
      domain: "UNIFIED_CRM",
      expectedVersion: normalizedCommand.expectedVersion,
      idempotencyKey: normalizedCommand.idempotencyKey,
      locationId: null,
      organizationId,
      payload: {
        changedFields,
        displayName: normalizedCommand.displayName,
        email: normalizedCommand.email,
        phoneNumber: normalizedCommand.phoneNumber,
        preferredContactMethod: normalizedCommand.preferredContactMethod
      },
      reason: normalizedCommand.reason,
      subjectId: normalizedCustomerId,
      subjectType: "CUSTOMER"
    });
    const result = await repository.updateCustomer({
      command: {
        actorUserId: actor!.id,
        changedFields,
        commandType: command.commandType,
        correlationId: command.correlationId,
        customerId: normalizedCustomerId,
        displayName: normalizedCommand.displayName,
        domain: command.domain,
        email: normalizedCommand.email,
        expectedVersion: normalizedCommand.expectedVersion,
        idempotencyKey: command.idempotencyKey,
        normalizedEmail: normalizedCommand.email,
        normalizedPhoneNumber: normalizedCommand.phoneNumber,
        organizationId,
        phoneNumber: normalizedCommand.phoneNumber,
        preferredContactMethod: normalizedCommand.preferredContactMethod,
        reason: command.reason,
        requestHash: command.requestHash
      },
      recordScope: access.recordScope
    });
    return {
      changedFields: result.changedFields,
      contractVersion: UNIFIED_CRM_CUSTOMER_CONTROLLED_EDIT_CONTRACT_VERSION,
      customerId: result.customerId,
      duplicate: result.duplicate,
      version: result.version
    };
  } catch (error) {
    if (error instanceof UnifiedCrmCustomerControlledEditError) throw error;
    if (error instanceof Error && error.message === "Customer not available.") {
      throw new UnifiedCrmCustomerControlledEditError("CUSTOMER_NOT_AVAILABLE", "Customer details are not available.");
    }
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "";
    if (code === "IDEMPOTENCY_KEY_REUSED") {
      throw new UnifiedCrmCustomerControlledEditError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used with a different customer edit.");
    }
    if (code === "VERSION_CONFLICT") {
      throw new UnifiedCrmCustomerControlledEditError("STALE_CUSTOMER_VERSION", "Customer record changed before this edit could be saved.");
    }
    throw new UnifiedCrmCustomerControlledEditError("CUSTOMER_SOURCE_UNAVAILABLE", "Customer edit could not be recorded safely.", { cause: error });
  }
}
