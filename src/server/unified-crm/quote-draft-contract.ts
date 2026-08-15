export const UNIFIED_CRM_QUOTE_DRAFT_WORKSPACE_CONTRACT_VERSION = "ucrm.quote-draft-workspace/v1" as const;

export type UnifiedCrmQuoteDraftWorkspaceModel = {
  action: {
    detail: string;
    label: string;
    state: "HELD" | "READY";
  };
  contractVersion: typeof UNIFIED_CRM_QUOTE_DRAFT_WORKSPACE_CONTRACT_VERSION;
  generatedAt: string;
  governance: readonly string[];
  headline: {
    detail: string;
    title: string;
  };
  nextUnlocks: readonly string[];
  source: {
    href: "/crm/quotes";
    label: "Unified CRM quote draft workspace";
    observedAt: string;
  };
  state: "HELD_REVIEW" | "LIVE_DRAFT";
  form: {
    customerId: string;
    discountCents: number;
    expectedVersion: number;
    lineItems: readonly {
      description: string;
      quantity: number;
      taxable: boolean;
      unitPriceCents: number;
    }[];
    mode: "create" | "update";
    opportunityId: string;
    priceSource: string;
    quoteId: string | null;
    quoteNumber: string | null;
    taxRateBasisPoints: number;
    termsSummary: string;
  };
  visibility: "organization" | "owned";
  visibleDrafts: readonly {
    customerLabel: string;
    editHref: string;
    latestVersionLabel: string;
    quoteId: string;
    quoteNumber: string;
    totalCents: number;
    updatedAt: string;
  }[];
};
