export const UNIFIED_CRM_HOME_DASHBOARD_CONTRACT_VERSION = "ucrm.home-dashboard/v1" as const;

export type UnifiedCrmHomeDashboardMetric = {
  id: "ownedWork" | "overdueFollowUp" | "pipeline" | "quotes" | "dispatchHandoffs";
  label: string;
  value: number;
  detail: string;
  href: string;
  state: "READY" | "EMPTY" | "UNAVAILABLE";
};

export type UnifiedCrmHomeDashboardReadModel = {
  contractVersion: typeof UNIFIED_CRM_HOME_DASHBOARD_CONTRACT_VERSION;
  state: "READY" | "EMPTY";
  visibility: "organization" | "owned";
  generatedAt: string;
  metrics: UnifiedCrmHomeDashboardMetric[];
  freshness: {
    status: "CURRENT";
    observedAt: string;
    newestRecordUpdatedAt: string | null;
  };
};
