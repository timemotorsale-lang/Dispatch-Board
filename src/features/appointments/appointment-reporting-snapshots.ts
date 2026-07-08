"use client";

export type AppointmentReportingSnapshotEntry = {
  id: string;
  label: string;
  versionLabel: string;
  scopeLabel: string;
  rowCountLabel: string;
  detail: string;
  actionLabel: string;
};

export type AppointmentReportingFreshnessMetric = {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "amber" | "red" | "purple" | "green";
};

export type AppointmentReportingFreshnessSummary = {
  headline: string;
  metrics: AppointmentReportingFreshnessMetric[];
};

export function buildAppointmentReportingSnapshotEntries(input: {
  generatedForLabel: string;
  selectedAppointmentId: string;
  reportRowCount: number;
  readModelDimension: string;
  readModelRowCount: number;
  reconciliationCount: number;
}) {
  return [
    {
      id: "snapshot-manager-summary",
      label: "Manager summary snapshot",
      versionLabel: "v1.command-center-report",
      scopeLabel: input.generatedForLabel,
      rowCountLabel: `${input.reportRowCount} row${input.reportRowCount === 1 ? "" : "s"}`,
      detail: `Current command-center scope anchored by ${input.selectedAppointmentId} is exportable as a manager-ready reporting snapshot.`,
      actionLabel: "Review snapshot"
    },
    {
      id: "snapshot-reporting-read-model",
      label: "Reporting read model snapshot",
      versionLabel: "v1.reporting-read-model",
      scopeLabel: `${input.readModelDimension} dimension`,
      rowCountLabel: `${input.readModelRowCount} row${input.readModelRowCount === 1 ? "" : "s"}`,
      detail: "Persistable reporting read model surface for category, owner, or location-based board analytics.",
      actionLabel: "Review snapshot"
    },
    {
      id: "snapshot-reconciliation-watch",
      label: "Reconciliation watch snapshot",
      versionLabel: "v1.reconciliation-watch",
      scopeLabel: "Schedule analytics",
      rowCountLabel: `${input.reconciliationCount} reconciliation item${input.reconciliationCount === 1 ? "" : "s"}`,
      detail: "Visible reconciliation pressure packaged for follow-through, export review, and next-shift operating handoff.",
      actionLabel: "Review snapshot"
    }
  ] satisfies AppointmentReportingSnapshotEntry[];
}

export function buildAppointmentReportingFreshnessSummary(input: {
  snapshotEntries: AppointmentReportingSnapshotEntry[];
  kpiCount: number;
  visibleExceptions: number;
  breachedSla: number;
  reconciliationCount: number;
}) {
  return {
    headline: "Reporting persistence tracks whether snapshots, read models, and reconciliation exports are fresh enough for enterprise review.",
    metrics: [
      {
        label: "Snapshot surfaces",
        value: String(input.snapshotEntries.length),
        detail: "Manager summary, reporting read model, and reconciliation snapshots are prepared from the visible board scope.",
        tone: "blue"
      },
      {
        label: "KPI coverage",
        value: String(input.kpiCount),
        detail: "Defined KPI entries that currently explain the board’s reporting posture.",
        tone: input.kpiCount >= 6 ? "green" : "amber"
      },
      {
        label: "Breached SLA pressure",
        value: String(input.breachedSla),
        detail: "Breached work should always remain represented in reporting persistence and exports.",
        tone: input.breachedSla > 0 ? "red" : "green"
      },
      {
        label: "Reconciliation carryover",
        value: String(input.reconciliationCount),
        detail: "Reconciliation items that still need durable reporting and next-step follow-through.",
        tone: input.reconciliationCount > 0 ? "purple" : "green"
      },
      {
        label: "Visible exception load",
        value: String(input.visibleExceptions),
        detail: "Exported reporting snapshots remain anchored to the visible operational exception set.",
        tone: input.visibleExceptions > 0 ? "amber" : "green"
      }
    ]
  } satisfies AppointmentReportingFreshnessSummary;
}
