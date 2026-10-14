import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-access";
import { UnifiedCrmOpportunityError, type UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

type OpportunityDetailAccessOptions = {
  mode?: unknown;
  nodeEnv?: string;
  shellMode?: unknown;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
  now?: () => Date;
};

export async function requireUnifiedCrmOpportunityDetailAccess(
  actor: AuthenticatedUser | null,
  options: OpportunityDetailAccessOptions = {}
): Promise<UnifiedCrmOpportunityAccessContext> {
  const shellAccess = resolveUnifiedCrmShellAccess(actor, {
    nodeEnv: options.nodeEnv,
    shellMode: options.shellMode
  });
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW") {
    const code = shellAccess.reason === "AUTHENTICATION_REQUIRED"
      ? "AUTHENTICATION_REQUIRED"
      : shellAccess.reason === "SHELL_OFF"
        ? "OPPORTUNITY_OFF"
        : "OPPORTUNITY_NOT_AUTHORIZED";
    throw new UnifiedCrmOpportunityError(
      code,
      "Opportunity detail is temporarily unavailable."
    );
  }

  return getUnifiedCrmOpportunityAccessContext(actor, "read", {
    mode: options.mode,
    nodeEnv: options.nodeEnv,
    now: options.now,
    scopeRepository: options.scopeRepository
  });
}
