import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateUnifiedCrmCapability } from "@/server/policies/unified-crm-access";
import { UnifiedCrmCustomerReadError } from "@/server/unified-crm/customer-read-contract";

export type UnifiedCrmCustomerRecordScope =
  | { kind: "ORGANIZATION" }
  | { kind: "OWNER"; ownerUserId: string };

export type UnifiedCrmCustomerReadPolicyDecision = {
  allowed: boolean;
  recordScope: UnifiedCrmCustomerRecordScope | null;
  reason: "ALLOWED" | "AUTHENTICATION_REQUIRED" | "CUSTOMER_READ_NOT_AUTHORIZED";
};

export function evaluateUnifiedCrmCustomerReadPolicy(
  actor: AuthenticatedUser | null
): UnifiedCrmCustomerReadPolicyDecision {
  const capability = evaluateUnifiedCrmCapability(actor, "crm.customer.view");
  if (!actor) return { allowed: false, recordScope: null, reason: "AUTHENTICATION_REQUIRED" };
  if (!capability.allowed || !capability.workspace) {
    return { allowed: false, recordScope: null, reason: "CUSTOMER_READ_NOT_AUTHORIZED" };
  }
  if (capability.workspace === "MANAGEMENT") {
    return { allowed: true, recordScope: { kind: "ORGANIZATION" }, reason: "ALLOWED" };
  }
  return {
    allowed: true,
    recordScope: { kind: "OWNER", ownerUserId: actor.id },
    reason: "ALLOWED"
  };
}

export function requireUnifiedCrmCustomerReadPolicy(actor: AuthenticatedUser | null) {
  const decision = evaluateUnifiedCrmCustomerReadPolicy(actor);
  if (!decision.allowed || !decision.recordScope) {
    const code = decision.reason === "AUTHENTICATION_REQUIRED"
      ? "AUTHENTICATION_REQUIRED"
      : "CUSTOMER_READ_NOT_AUTHORIZED";
    throw new UnifiedCrmCustomerReadError(code, "Customer records are not available for this viewer.");
  }
  return decision.recordScope;
}
