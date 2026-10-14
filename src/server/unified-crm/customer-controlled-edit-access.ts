import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmCustomerRecordScope } from "@/server/policies/unified-crm-customer-read";
import { evaluateUnifiedCrmCapability, resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import { resolveUnifiedCrmCustomerReadMode } from "@/server/services/unified-crm-customer-read-service";
import { UnifiedCrmCustomerControlledEditError } from "@/server/unified-crm/customer-controlled-edit-command";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

export type UnifiedCrmCustomerControlledEditMode = "OFF" | "REVIEW";

export type UnifiedCrmCustomerControlledEditAccessOptions = {
  commandMode?: unknown;
  nodeEnv?: string;
  readMode?: unknown;
  shellMode?: unknown;
};

export function canUpdateUnifiedCrmCustomerControlledEdit(
  actor: AuthenticatedUser | null,
  ownerUserId: string | null | undefined,
  options: UnifiedCrmCustomerControlledEditAccessOptions = {}
) {
  if (!actor?.isActive) return false;
  if (!evaluateUnifiedCrmCapability(actor, "crm.mutate").allowed) return false;

  const workspace = resolveUnifiedCrmWorkspace(actor);
  if (!workspace) return false;
  if (workspace === "SALES" && ownerUserId !== actor.id) return false;

  const shellAccess = resolveUnifiedCrmShellAccess(actor, {
    nodeEnv: options.nodeEnv,
    shellMode: options.shellMode
  });
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") return false;
  if (resolveUnifiedCrmCustomerReadMode(options) !== "REVIEW") return false;
  if (resolveUnifiedCrmCustomerControlledEditMode(options) !== "REVIEW") return false;

  return true;
}

export function resolveUnifiedCrmCustomerControlledEditMode(
  options: Pick<UnifiedCrmCustomerControlledEditAccessOptions, "commandMode" | "nodeEnv"> = {}
): UnifiedCrmCustomerControlledEditMode {
  const explicit = typeof options.commandMode === "string" ? options.commandMode.trim().toUpperCase() : "";
  if (explicit === "OFF") return "OFF";
  if (explicit === "REVIEW") return "REVIEW";
  return options.nodeEnv === "production" ? "OFF" : "REVIEW";
}

export function requireUnifiedCrmCustomerControlledEditPolicy(
  actor: AuthenticatedUser | null
): UnifiedCrmCustomerRecordScope {
  if (!actor) {
    throw new UnifiedCrmCustomerControlledEditError(
      "AUTHENTICATION_REQUIRED",
      "Customer edit is temporarily unavailable."
    );
  }
  if (!actor.isActive || !evaluateUnifiedCrmCapability(actor, "crm.mutate").allowed) {
    throw new UnifiedCrmCustomerControlledEditError(
      "CUSTOMER_360_NOT_AUTHORIZED",
      "Customer edit is temporarily unavailable."
    );
  }

  const workspace = resolveUnifiedCrmWorkspace(actor);
  if (workspace === "MANAGEMENT") return { kind: "ORGANIZATION" };
  if (workspace === "SALES") return { kind: "OWNER", ownerUserId: actor.id };

  throw new UnifiedCrmCustomerControlledEditError(
    "CUSTOMER_360_NOT_AUTHORIZED",
    "Customer edit is temporarily unavailable."
  );
}

export function requireUnifiedCrmCustomerControlledEditAccess(
  actor: AuthenticatedUser | null,
  options: UnifiedCrmCustomerControlledEditAccessOptions = {}
) {
  const recordScope = requireUnifiedCrmCustomerControlledEditPolicy(actor);
  const shellAccess = resolveUnifiedCrmShellAccess(actor, {
    nodeEnv: options.nodeEnv,
    shellMode: options.shellMode
  });
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") {
    throw new UnifiedCrmCustomerControlledEditError("CUSTOMER_360_OFF", "Customer edit is temporarily unavailable.");
  }
  if (resolveUnifiedCrmCustomerReadMode(options) !== "REVIEW") {
    throw new UnifiedCrmCustomerControlledEditError("CUSTOMER_360_OFF", "Customer edit is temporarily unavailable.");
  }
  if (resolveUnifiedCrmCustomerControlledEditMode(options) !== "REVIEW") {
    throw new UnifiedCrmCustomerControlledEditError("CUSTOMER_360_OFF", "Customer edit is temporarily unavailable.");
  }
  return {
    commandMode: "REVIEW" as const,
    mutationAuthority: "CUSTOMER_CONTROLLED_EDIT_REVIEW_COMMAND" as const,
    recordScope,
    readMode: "REVIEW" as const,
    shellMode: "REVIEW" as const
  };
}
