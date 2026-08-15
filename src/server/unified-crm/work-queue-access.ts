import type { AuthenticatedUser } from "@/server/auth/store";
import { requireUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import { resolveUnifiedCrmCustomerReadMode } from "@/server/services/unified-crm-customer-read-service";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";
import { UnifiedCrmWorkReadError } from "@/server/unified-crm/work-queue-contract";

export type UnifiedCrmWorkMode = "OFF" | "REVIEW";

export type UnifiedCrmWorkAccessOptions = {
  nodeEnv?: string;
  readMode?: unknown;
  shellMode?: unknown;
  workMode?: unknown;
};

export function resolveUnifiedCrmWorkMode(
  options: Pick<UnifiedCrmWorkAccessOptions, "nodeEnv" | "workMode"> = {}
): UnifiedCrmWorkMode {
  const configuredValue = options.workMode ?? process.env.UNIFIED_CRM_WORK_MODE;
  if (configuredValue !== undefined && configuredValue !== null) {
    return typeof configuredValue === "string" && configuredValue.trim().toUpperCase() === "REVIEW"
      ? "REVIEW"
      : "OFF";
  }

  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  return nodeEnv === "production" ? "OFF" : "REVIEW";
}

export function requireUnifiedCrmWorkAccess(
  actor: AuthenticatedUser | null,
  options: UnifiedCrmWorkAccessOptions = {}
) {
  const recordScope = (() => {
    try {
      return requireUnifiedCrmCustomerReadPolicy(actor);
    } catch (error) {
      if (error instanceof Error && "code" in error && String((error as { code?: string }).code) === "AUTHENTICATION_REQUIRED") {
        throw new UnifiedCrmWorkReadError("AUTHENTICATION_REQUIRED", "CRM work is not available for this viewer.");
      }
      throw new UnifiedCrmWorkReadError("CRM_WORK_NOT_AUTHORIZED", "CRM work is not available for this viewer.");
    }
  })();

  const shellAccess = resolveUnifiedCrmShellAccess(actor, {
    nodeEnv: options.nodeEnv,
    shellMode: options.shellMode
  });
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") {
    throw new UnifiedCrmWorkReadError("CRM_WORK_OFF", "CRM work is not available.");
  }
  if (resolveUnifiedCrmCustomerReadMode(options) !== "REVIEW") {
    throw new UnifiedCrmWorkReadError("CRM_WORK_OFF", "CRM work is not available.");
  }
  if (resolveUnifiedCrmWorkMode(options) !== "REVIEW") {
    throw new UnifiedCrmWorkReadError("CRM_WORK_OFF", "CRM work is not available.");
  }

  return {
    readMode: "REVIEW" as const,
    recordScope,
    shellMode: "REVIEW" as const,
    workMode: "REVIEW" as const
  };
}
