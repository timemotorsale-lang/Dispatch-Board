import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmCustomerReadRepository,
  type UnifiedCrmCustomerReadRepository
} from "@/server/repositories/unified-crm-customer-read-repository";
import { requireUnifiedCrmOpportunityPolicy } from "@/server/policies/unified-crm-opportunity";
import { type UnifiedCrmOpportunityAction, type UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import { UnifiedCrmOpportunityError } from "@/server/unified-crm/opportunity-contract";

type Dependencies = {
  now?: () => Date;
  nodeEnv?: string | undefined;
  mode?: unknown;
  scopeRepository?: Pick<UnifiedCrmCustomerReadRepository, "listActiveOrganizationIds">;
};

export async function getUnifiedCrmOpportunityAccessContext(
  actor: AuthenticatedUser | null,
  action: UnifiedCrmOpportunityAction,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityAccessContext> {
  const decision = requireUnifiedCrmOpportunityPolicy(actor, {
    action,
    mode: dependencies.mode,
    nodeEnv: dependencies.nodeEnv
  });
  if (!decision.recordScope || !decision.workspace) {
    throw new UnifiedCrmOpportunityError("OPPORTUNITY_NOT_AUTHORIZED", "CRM opportunities are not available for this viewer.");
  }
  const { recordScope, workspace } = decision;

  const scopeRepository = dependencies.scopeRepository ?? createUnifiedCrmCustomerReadRepository();
  const now = dependencies.now?.() ?? new Date();
  const organizationIds = await scopeRepository.listActiveOrganizationIds(actor!.id, now);
  if (organizationIds.length === 0) {
    throw new UnifiedCrmOpportunityError("ORGANIZATION_SCOPE_UNAVAILABLE", "CRM opportunities are not available for this viewer.");
  }
  if (organizationIds.length > 1) {
    throw new UnifiedCrmOpportunityError("ORGANIZATION_SCOPE_AMBIGUOUS", "Select one authorized organization before opening CRM opportunities.");
  }

  return {
    actorUserId: actor!.id,
    capabilities: decision.capabilities,
    fallbackHref: decision.fallbackHref,
    mode: decision.mode,
    organizationId: organizationIds[0],
    recordScope,
    workspace
  };
}
