export const UNIFIED_CRM_QUOTE_VERSION_REVIEW_CONTRACT_VERSION = "ucrm.quote-version-review/v1" as const;

export type UnifiedCrmQuoteVersionReviewModel = {
  contractVersion: typeof UNIFIED_CRM_QUOTE_VERSION_REVIEW_CONTRACT_VERSION;
  generatedAt: string;
  governance: readonly string[];
  headline: {
    detail: string;
    title: string;
  };
  liveObservation: {
    detail: string;
    presentedVersionLabel: string | null;
    state: "DRAFT_ONLY" | "IMMUTABLE_PRESENTED";
  };
  presentAction: {
    detail: string;
    label: string;
    state: "HELD";
  };
  quote: {
    customerLabel: string;
    opportunityLabel: string;
    quoteId: string;
    quoteNumber: string;
    state: "DRAFT" | "PRESENTED";
    updatedAt: string;
  };
  source: {
    href: "/crm/quotes";
    label: "Unified CRM quote version review";
    observedAt: string;
  };
  state: "HELD_REVIEW";
  versions: readonly {
    createdAt: string;
    immutableNote: string;
    lineItemCount: number;
    presentedAt: string | null;
    state: "DRAFT" | "PRESENTED" | "SUPERSEDED";
    subtotalCents: number;
    totalCents: number;
    versionId: string;
    versionLabel: string;
  }[];
  visibility: "organization" | "owned";
};
