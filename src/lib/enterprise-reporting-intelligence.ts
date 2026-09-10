export const enterpriseReportTypes = [
  "daily_staff_report",
  "manager_daily_close",
  "weekly_productivity",
  "crm_pipeline",
  "customer_follow_up",
  "vehicle_aging",
  "recon_bottleneck",
  "compliance",
  "coaching",
] as const;

export type EnterpriseReportType = (typeof enterpriseReportTypes)[number];
export type EnterpriseReportInputKind =
  | "blocker"
  | "completed_task"
  | "crm_action"
  | "customer_timeline"
  | "manager_note"
  | "quick_update"
  | "report_seed"
  | "staff_workbook"
  | "vehicle_activity";

export type EnterpriseReportSource = {
  createdAt: string;
  detail: string;
  href?: string | null;
  id: string;
  kind: EnterpriseReportInputKind;
  ownerName?: string | null;
  reportTypes?: EnterpriseReportType[];
  status?: string | null;
  title: string;
};

export type EnterpriseReportSection = {
  items: Array<{
    detail: string;
    href: string | null;
    ownerName: string;
    sourceId: string;
    sourceKind: EnterpriseReportInputKind;
    title: string;
  }>;
  reportType: EnterpriseReportType;
  title: string;
};

export type EnterpriseReportingBrief = {
  generatedAt: string;
  managerSummary: string;
  reviewableSeedCount: number;
  sections: EnterpriseReportSection[];
  sourceCount: number;
};

const reportTitles: Record<EnterpriseReportType, string> = {
  coaching: "Coaching report",
  compliance: "Compliance report",
  crm_pipeline: "CRM pipeline",
  customer_follow_up: "Customer follow-up report",
  daily_staff_report: "Daily staff report",
  manager_daily_close: "Manager daily close",
  recon_bottleneck: "Recon bottleneck report",
  vehicle_aging: "Vehicle aging report",
  weekly_productivity: "Weekly productivity",
};

const defaultReportTypesByKind: Record<EnterpriseReportInputKind, EnterpriseReportType[]> = {
  blocker: ["manager_daily_close", "recon_bottleneck"],
  completed_task: ["daily_staff_report", "weekly_productivity"],
  crm_action: ["crm_pipeline", "customer_follow_up"],
  customer_timeline: ["customer_follow_up"],
  manager_note: ["manager_daily_close", "coaching"],
  quick_update: ["daily_staff_report", "manager_daily_close"],
  report_seed: ["daily_staff_report", "manager_daily_close"],
  staff_workbook: ["daily_staff_report", "weekly_productivity", "coaching"],
  vehicle_activity: ["vehicle_aging", "recon_bottleneck"],
};

function normalizeReportTypes(source: EnterpriseReportSource) {
  const requested = source.reportTypes?.filter((type) => enterpriseReportTypes.includes(type)) ?? [];
  return requested.length ? requested : defaultReportTypesByKind[source.kind];
}

function managerLine(source: EnterpriseReportSource) {
  const status = source.status ? `Status: ${source.status}. ` : "";
  return `${status}${source.detail}`;
}

export function buildEnterpriseReportingBrief(input: { generatedAt?: Date; sources: EnterpriseReportSource[] }): EnterpriseReportingBrief {
  const sections = enterpriseReportTypes.map((reportType): EnterpriseReportSection => {
    const items = input.sources
      .filter((source) => normalizeReportTypes(source).includes(reportType))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
      .map((source) => ({
        detail: managerLine(source),
        href: source.href ?? null,
        ownerName: source.ownerName ?? "Unassigned",
        sourceId: source.id,
        sourceKind: source.kind,
        title: source.title,
      }));
    return { items, reportType, title: reportTitles[reportType] };
  }).filter((section) => section.items.length > 0);
  const reviewableSeedCount = input.sources.filter((source) => source.kind === "report_seed" || source.reportTypes?.length).length;

  return {
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    managerSummary: `${input.sources.length} source-backed item(s) prepared across ${sections.length} manager-ready report section(s).`,
    reviewableSeedCount,
    sections,
    sourceCount: input.sources.length,
  };
}
