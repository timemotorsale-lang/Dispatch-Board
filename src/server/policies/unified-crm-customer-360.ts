import type { AuthenticatedUser } from "@/server/auth/store";
import {
  evaluateUnifiedCrmCustomerReadPolicy,
  type UnifiedCrmCustomerRecordScope
} from "@/server/policies/unified-crm-customer-read";
import { UnifiedCrmCustomer360Error } from "@/server/unified-crm/customer-360-contract";

export type UnifiedCrmCustomer360PolicyDecision = {
  allowed: boolean;
  recordScope: UnifiedCrmCustomerRecordScope | null;
  reason: "ALLOWED" | "AUTHENTICATION_REQUIRED" | "CUSTOMER_360_NOT_AUTHORIZED";
};

export function evaluateUnifiedCrmCustomer360Policy(
  actor: AuthenticatedUser | null
): UnifiedCrmCustomer360PolicyDecision {
  const decision = evaluateUnifiedCrmCustomerReadPolicy(actor);
  if (decision.allowed) return { ...decision, reason: "ALLOWED" };
  return {
    allowed: false,
    recordScope: null,
    reason: decision.reason === "AUTHENTICATION_REQUIRED"
      ? "AUTHENTICATION_REQUIRED"
      : "CUSTOMER_360_NOT_AUTHORIZED"
  };
}

export function requireUnifiedCrmCustomer360Policy(actor: AuthenticatedUser | null) {
  const decision = evaluateUnifiedCrmCustomer360Policy(actor);
  if (!decision.allowed || !decision.recordScope) {
    const code = decision.reason === "AUTHENTICATION_REQUIRED"
      ? "AUTHENTICATION_REQUIRED"
      : "CUSTOMER_360_NOT_AUTHORIZED";
    throw new UnifiedCrmCustomer360Error(code, "Customer details are not available for this viewer.");
  }
  return decision.recordScope;
}
