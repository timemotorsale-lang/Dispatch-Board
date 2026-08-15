export const UNIFIED_CRM_QUOTE_FOUNDATION_CONTRACT_VERSION = "ucrm.quote-foundation/v1" as const;

export type UnifiedCrmQuoteFoundationItem = {
  id: string;
  quoteNumber: string;
  state: "DRAFT" | "PRESENTED";
  customerLabel: string;
  opportunityLabel: string;
  summary: string;
  updatedAt: string;
  versionLabel: string;
};

export type UnifiedCrmQuoteFoundationModel = {
  contractVersion: typeof UNIFIED_CRM_QUOTE_FOUNDATION_CONTRACT_VERSION;
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
