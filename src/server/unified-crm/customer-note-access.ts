import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";
import { evaluateUnifiedCrmCapability, resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import { resolveUnifiedCrmCustomerReadMode } from "@/server/services/unified-crm-customer-read-service";
import { UnifiedCrmCustomerNoteError } from "@/server/unified-crm/customer-note-command";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

export type UnifiedCrmCustomerNoteMode = "OFF" | "REVIEW";

export type UnifiedCrmCustomerNoteAccessOptions = {
  commandMode?: unknown;
  nodeEnv?: string;
  readMode?: unknown;
  shellMode?: unknown;
};

export function canCreateUnifiedCrmCustomerNote(
  actor: AuthenticatedUser | null,
  options: UnifiedCrmCustomerNoteAccessOptions = {}
) {
  if (!actor?.isActive) return false;
  if (!evaluateUnifiedCrmCapability(actor, "crm.mutate").allowed) return false;

  const workspace = resolveUnifiedCrmWorkspace(actor);
  if (!workspace) return false;

  const shellAccess = resolveUnifiedCrmShellAccess(actor, {
    nodeEnv: options.nodeEnv,
    shellMode: options.shellMode
  });
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") return false;
  if (resolveUnifiedCrmCustomerReadMode(options) !== "REVIEW") return false;
  if (resolveUnifiedCrmCustomerNoteMode(options) !== "REVIEW") return false;

  return true;
}

export function resolveUnifiedCrmCustomerNoteMode(
  options: Pick<UnifiedCrmCustomerNoteAccessOptions, "commandMode" | "nodeEnv"> = {}
): UnifiedCrmCustomerNoteMode {
  const explicit = typeof options.commandMode === "string" ? options.commandMode.trim().toUpperCase() : "";
  if (explicit === "OFF") return "OFF";
  if (explicit === "REVIEW") return "REVIEW";
  return options.nodeEnv === "production" ? "OFF" : "REVIEW";
}

export function requireUnifiedCrmCustomerNotePolicy(
  actor: AuthenticatedUser | null
): UnifiedCrmCustomerRecordScope {
  if (!actor) {
    throw new UnifiedCrmCustomerNoteError(
      "AUTHENTICATION_REQUIRED",
      "Customer note is temporarily unavailable."
    );
  }
  if (!actor.isActive || !evaluateUnifiedCrmCapability(actor, "crm.mutate").allowed) {
    throw new UnifiedCrmCustomerNoteError(
      "CUSTOMER_360_NOT_AUTHORIZED",
      "Customer note is temporarily unavailable."
    );
  }

  const workspace = resolveUnifiedCrmWorkspace(actor);
  if (workspace === "MANAGEMENT") return { kind: "ORGANIZATION" };
  if (workspace === "SALES") return { kind: "OWNER", ownerUserId: actor.id };

  throw new UnifiedCrmCustomerNoteError(
    "CUSTOMER_360_NOT_AUTHORIZED",
    "Customer note is temporarily unavailable."
  );
}

export function requireUnifiedCrmCustomerNoteAccess(
  actor: AuthenticatedUser | null,
  options: UnifiedCrmCustomerNoteAccessOptions = {}
) {
  const recordScope = requireUnifiedCrmCustomerNotePolicy(actor);
  const shellAccess = resolveUnifiedCrmShellAccess(actor, {
    nodeEnv: options.nodeEnv,
    shellMode: options.shellMode
  });

  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") {
    throw new UnifiedCrmCustomerNoteError(
      "CUSTOMER_360_OFF",
      "Customer note is temporarily unavailable."
    );
  }
  if (resolveUnifiedCrmCustomerReadMode(options) !== "REVIEW") {
    throw new UnifiedCrmCustomerNoteError(
      "CUSTOMER_360_OFF",
      "Customer note is temporarily unavailable."
    );
  }
  if (resolveUnifiedCrmCustomerNoteMode(options) !== "REVIEW") {
    throw new UnifiedCrmCustomerNoteError(
      "CUSTOMER_360_OFF",
      "Customer note is temporarily unavailable."
    );
  }

  return {
    commandMode: "REVIEW" as const,
    mutationAuthority: "CUSTOMER_NOTE_REVIEW_COMMAND" as const,
    recordScope,
    readMode: "REVIEW" as const,
    shellMode: "REVIEW" as const
  };
}
