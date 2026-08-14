import type { AuthenticatedUser } from "@/server/auth/store";
import {
  requireUnifiedCrmCustomer360Policy
} from "@/server/policies/unified-crm-customer-360";
import { resolveUnifiedCrmCustomerReadMode } from "@/server/services/unified-crm-customer-read-service";
import { UnifiedCrmCustomer360Error } from "@/server/unified-crm/customer-360-contract";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

export type UnifiedCrmCustomer360AccessOptions = {
  nodeEnv?: string;
  readMode?: unknown;
  shellMode?: unknown;
};

export function requireUnifiedCrmCustomer360Access(
  actor: AuthenticatedUser | null,
  options: UnifiedCrmCustomer360AccessOptions = {}
) {
  const recordScope = requireUnifiedCrmCustomer360Policy(actor);
  const shellAccess = resolveUnifiedCrmShellAccess(actor, {
    nodeEnv: options.nodeEnv,
    shellMode: options.shellMode
  });
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") {
    throw new UnifiedCrmCustomer360Error(
      "CUSTOMER_360_OFF",
      "Customer details are temporarily unavailable."
    );
  }
  if (resolveUnifiedCrmCustomerReadMode(options) !== "REVIEW") {
    throw new UnifiedCrmCustomer360Error(
      "CUSTOMER_360_OFF",
      "Customer details are temporarily unavailable."
    );
  }
  return {
    recordScope,
    readMode: "REVIEW" as const,
    shellMode: "REVIEW" as const
  };
}
