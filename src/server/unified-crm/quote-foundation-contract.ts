export const UNIFIED_CRM_QUOTE_FOUNDATION_CONTRACT_VERSION = "ucrm.quote-foundation/v1" as const;

export type UnifiedCrmQuoteFoundationItem = {
  id: string;
  recordId: string;
  quoteNumber: string;
  state: "DRAFT" | "PRESENTED";
  customerLabel: string;
  customerId: string | null;
  opportunityLabel: string;
  opportunityId: string | null;
  summary: string;
  updatedAt: string;
  versionLabel: string;
};

export type UnifiedCrmQuoteDraftWorkspaceModel = {
  currency: string;
  customerId: string | null;
  customerLabel: string;
  detail: string;
  expectedVersionNumber: number;
  lineItems: readonly {
    description: string;
    id: string;
    lineTotalCents: number;
    quantity: number;
    unitPriceCents: number;
  }[];
  mode: "CREATE" | "REVISE";
  opportunityId: string | null;
  opportunityLabel: string;
  priceSource: string;
  quoteId: string | null;
  quoteNumber: string | null;
  state: "READY" | "REVIEW_ONLY";
  subtotalCents: number;
  termsSummary: string;
  versions: readonly {
    createdAt: string;
    lineItemCount: number;
    presentedAt: string | null;
    state: "DRAFT" | "PRESENTED" | "SUPERSEDED";
    totalCents: number;
    versionNumber: number;
  }[];
};

export type UnifiedCrmQuoteFoundationModel = {
  commands: {
    draft: {
      available: boolean;
      detail: string;
      state: "READY" | "REVIEW_ONLY";
    };
    present: {
      available: boolean;
      detail: string;
      state: "HELD";
    };
  };
  contractVersion: typeof UNIFIED_CRM_QUOTE_FOUNDATION_CONTRACT_VERSION;
  draftWorkspace: UnifiedCrmQuoteDraftWorkspaceModel;
  generatedAt: string;
  headline: {
    title: string;
    detail: string;
  };
  readiness: readonly {
    id: string;
    label: string;
    detail: string;
    state: "READY" | "HELD";
  }[];
  liveObservation: {
    detail: string;
    freshnessLabel: string;
    newestVisibleRecordUpdatedAt: string | null;
    state: "EMPTY" | "READY";
    visibleRecordCount: number;
  };
  visibleQuotes: readonly UnifiedCrmQuoteFoundationItem[];
  governance: readonly string[];
  nextUnlocks: readonly string[];
  source: {
    href: string;
    label: "Unified CRM quote foundation";
    observedAt: string;
  };
  state: "HELD_REVIEW";
  visibility: "organization" | "owned";
};
