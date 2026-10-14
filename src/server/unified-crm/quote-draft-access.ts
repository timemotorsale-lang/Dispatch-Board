import type { AuthenticatedUser } from "@/server/auth/store";
import { createUnifiedCrmCustomerReadRepository } from "@/server/repositories/unified-crm-customer-read-repository";
import { requireUnifiedCrmQuotePolicy } from "@/server/policies/unified-crm-quote";
import {
  resolveUnifiedCrmQuoteDraftMode,
  UnifiedCrmQuoteDraftError,
  type UnifiedCrmQuoteDraftMode
} from "@/server/unified-crm/quote-draft-command";
import type { UnifiedCrmQuoteAccessContext } from "@/server/unified-crm/quote-contract";

type Dependencies = {
  draftMode?: unknown;
  nodeEnv?: string;
  quoteMode?: unknown;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
};

export type UnifiedCrmQuoteDraftAccessContext = UnifiedCrmQuoteAccessContext & {
  draftMode: UnifiedCrmQuoteDraftMode;
};

export async function requireUnifiedCrmQuoteDraftAccess(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmQuoteDraftAccessContext> {
  const policy = requireUnifiedCrmQuotePolicy(actor, { action: "read", nodeEnv: dependencies.nodeEnv, mode: dependencies.quoteMode });
  const scopeRepository = dependencies.scopeRepository ?? createUnifiedCrmCustomerReadRepository();
  const organizationIds = await scopeRepository.listActiveOrganizationIds(actor!.id, new Date());
  const uniqueOrganizationIds = [...new Set(organizationIds)];

  if (!uniqueOrganizationIds.length) {
    throw new UnifiedCrmQuoteDraftError("ORGANIZATION_SCOPE_UNAVAILABLE", "CRM quote drafts are not available for this viewer.");
  }
  if (uniqueOrganizationIds.length > 1) {
    throw new UnifiedCrmQuoteDraftError("ORGANIZATION_SCOPE_AMBIGUOUS", "CRM quote drafts are temporarily unavailable.");
  }

  const draftMode = resolveUnifiedCrmQuoteDraftMode({ mode: dependencies.draftMode, nodeEnv: dependencies.nodeEnv });
  if (draftMode !== "REVIEW") {
    throw new UnifiedCrmQuoteDraftError("QUOTE_DRAFT_OFF", "CRM quote drafts are unavailable in this environment.");
  }

  return {
    actorUserId: actor!.id,
    capabilities: {
      ...policy.capabilities,
      draft: true
    },
    draftMode,
    fallbackHref: policy.fallbackHref,
    mode: policy.mode,
    organizationId: uniqueOrganizationIds[0],
    recordScope: policy.recordScope!,
    workspace: policy.workspace!
  };
}
