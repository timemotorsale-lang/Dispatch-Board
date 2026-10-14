import type { AuthenticatedUser } from "@/server/auth/store";
import { createUnifiedCrmCustomerReadRepository } from "@/server/repositories/unified-crm-customer-read-repository";
import { requireUnifiedCrmQuotePolicy } from "@/server/policies/unified-crm-quote";
import { UnifiedCrmQuoteError, type UnifiedCrmQuoteAccessContext } from "@/server/unified-crm/quote-contract";

type Dependencies = {
  mode?: unknown;
  nodeEnv?: string;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
};

export async function requireUnifiedCrmQuoteAccess(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmQuoteAccessContext> {
  const decision = requireUnifiedCrmQuotePolicy(actor, dependencies);
  const scopeRepository = dependencies.scopeRepository ?? createUnifiedCrmCustomerReadRepository();
  const organizationIds = await scopeRepository.listActiveOrganizationIds(actor!.id, new Date());
  const uniqueOrganizationIds = [...new Set(organizationIds)];

  if (!uniqueOrganizationIds.length) {
    throw new UnifiedCrmQuoteError("ORGANIZATION_SCOPE_UNAVAILABLE", "CRM quotes are not available for this viewer.");
  }
  if (uniqueOrganizationIds.length > 1) {
    throw new UnifiedCrmQuoteError("ORGANIZATION_SCOPE_AMBIGUOUS", "CRM quotes are temporarily unavailable.");
  }

  return {
    actorUserId: actor!.id,
    capabilities: decision.capabilities,
    fallbackHref: decision.fallbackHref,
    mode: decision.mode,
    organizationId: uniqueOrganizationIds[0],
    recordScope: decision.recordScope!,
    workspace: decision.workspace!
  };
}
