import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateUnifiedCrmCapability } from "@/server/policies/unified-crm-access";
import {
  createUnifiedCrmCustomerReadRepository,
  type UnifiedCrmCustomerReadRepository
} from "@/server/repositories/unified-crm-customer-read-repository";
import {
  createUnifiedCrmCustomerNoteRepository,
  type UnifiedCrmCustomerNoteRepository
} from "@/server/repositories/unified-crm-customer-note-repository";
import {
  requireUnifiedCrmCustomerNoteAccess,
  type UnifiedCrmCustomerNoteAccessOptions
} from "@/server/unified-crm/customer-note-access";
import {
  UNIFIED_CRM_CUSTOMER_NOTE_COMMAND,
  UNIFIED_CRM_CUSTOMER_NOTE_CONTRACT_VERSION,
  UnifiedCrmCustomerNoteError,
  type UnifiedCrmCustomerNoteCommand,
  type UnifiedCrmCustomerNoteCommandInput,
  type UnifiedCrmCustomerNoteCommandResult,
  type UnifiedCrmCustomerNoteVisibility
} from "@/server/unified-crm/customer-note-command";

type Dependencies = UnifiedCrmCustomerNoteAccessOptions & {
  now?: () => Date;
  repository?: UnifiedCrmCustomerNoteRepository;
  scopeRepository?: Pick<UnifiedCrmCustomerReadRepository, "listActiveOrganizationIds">;
};

const VISIBILITIES = ["INTERNAL", "RESTRICTED"] as const;

function normalizeCustomerId(value: unknown) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > 200) {
    throw new UnifiedCrmCustomerNoteError("INVALID_NOTE_COMMAND", "Customer identifier is invalid.");
  }
  return result;
}

function text(value: unknown, field: string, max: number) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) {
    throw new UnifiedCrmCustomerNoteError("INVALID_NOTE_COMMAND", `${field} is required.`);
  }
  if (result.length > max) {
    throw new UnifiedCrmCustomerNoteError("INVALID_NOTE_COMMAND", `${field} must be ${max} characters or fewer.`);
  }
  return result;
}

function visibility(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!VISIBILITIES.includes(normalized as UnifiedCrmCustomerNoteVisibility)) {
    throw new UnifiedCrmCustomerNoteError("INVALID_NOTE_COMMAND", "Visibility is invalid.");
  }
  return normalized as UnifiedCrmCustomerNoteVisibility;
}

function normalizeCommand(value: UnifiedCrmCustomerNoteCommandInput): UnifiedCrmCustomerNoteCommand {
  return {
    body: text(value.body, "Note", 2000),
    idempotencyKey: text(value.idempotencyKey, "Idempotency key", 200),
    visibility: visibility(value.visibility)
  };
}

export async function logUnifiedCrmCustomerNote(
  actor: AuthenticatedUser | null,
  customerId: string,
  value: UnifiedCrmCustomerNoteCommandInput,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmCustomerNoteCommandResult> {
  const access = requireUnifiedCrmCustomerNoteAccess(actor, dependencies);
  const now = dependencies.now?.() ?? new Date();
  const normalizedCustomerId = normalizeCustomerId(customerId);
  const normalizedCommand = normalizeCommand(value);
  const scopeRepository = dependencies.scopeRepository ?? createUnifiedCrmCustomerReadRepository();
  const repository = dependencies.repository ?? createUnifiedCrmCustomerNoteRepository();

  if (normalizedCommand.visibility === "RESTRICTED" && !evaluateUnifiedCrmCapability(actor, "crm.sensitive.view").allowed) {
    throw new UnifiedCrmCustomerNoteError("RESTRICTED_NOTE_NOT_AUTHORIZED", "Restricted notes are not available for this viewer.");
  }

  try {
    const organizationIds = await scopeRepository.listActiveOrganizationIds(actor!.id, now);
    if (organizationIds.length === 0) {
      throw new UnifiedCrmCustomerNoteError("CUSTOMER_360_NOT_AUTHORIZED", "Customer note is not available for this viewer.");
    }
    if (organizationIds.length > 1) {
      throw new UnifiedCrmCustomerNoteError("CUSTOMER_SOURCE_UNAVAILABLE", "Customer note requires one active organization scope.");
    }
    const organizationId = organizationIds[0];
    const command = normalizeEnterpriseCommand({
      actorUserId: actor!.id,
      commandType: UNIFIED_CRM_CUSTOMER_NOTE_COMMAND,
      domain: "UNIFIED_CRM",
      expectedVersion: 0,
      idempotencyKey: normalizedCommand.idempotencyKey,
      locationId: null,
      organizationId,
      payload: {
        body: normalizedCommand.body,
        visibility: normalizedCommand.visibility
      },
      reason: `Record customer note: ${normalizedCommand.body.slice(0, 80)}`,
      subjectId: normalizedCustomerId,
      subjectType: "CUSTOMER"
    });

    const result = await repository.createNote({
      command: {
        actorUserId: actor!.id,
        body: normalizedCommand.body,
        commandType: command.commandType,
        correlationId: command.correlationId,
        customerId: normalizedCustomerId,
        domain: command.domain,
        idempotencyKey: command.idempotencyKey,
        organizationId,
        reason: command.reason,
        requestHash: command.requestHash,
        visibility: normalizedCommand.visibility
      },
      recordScope: access.recordScope
    });

    return {
      contractVersion: UNIFIED_CRM_CUSTOMER_NOTE_CONTRACT_VERSION,
      customerId: result.customerId,
      duplicate: result.duplicate,
      noteId: result.noteId,
      version: result.version,
      visibility: result.visibility as UnifiedCrmCustomerNoteVisibility
    };
  } catch (error) {
    if (error instanceof UnifiedCrmCustomerNoteError) throw error;
    if (error instanceof Error && error.message === "Customer not available.") {
      throw new UnifiedCrmCustomerNoteError("CUSTOMER_NOT_AVAILABLE", "Customer details are not available.");
    }
    if (error instanceof Error && "code" in error && String((error as { code?: string }).code) === "IDEMPOTENCY_KEY_REUSED") {
      throw new UnifiedCrmCustomerNoteError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used with a different customer note.");
    }
    throw new UnifiedCrmCustomerNoteError("CUSTOMER_SOURCE_UNAVAILABLE", "Customer note could not be recorded safely.", { cause: error });
  }
}
