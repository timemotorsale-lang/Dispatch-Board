import { describe, expect, it } from "vitest";

import {
  buildAppointmentReportingFreshnessSummary,
  buildAppointmentReportingSnapshotEntries
} from "@/features/appointments/appointment-reporting-snapshots";

describe("appointment reporting snapshots", () => {
  it("builds reporting snapshot entries", () => {
    const snapshots = buildAppointmentReportingSnapshotEntries({
      generatedForLabel: "Tuesday, July 7, 2026 · Focus APT-10245",
      selectedAppointmentId: "APT-10245",
      reportRowCount: 4,
      readModelDimension: "owner",
      readModelRowCount: 3,
      reconciliationCount: 2
    });

    expect(snapshots).toHaveLength(3);
    expect(snapshots.find((item) => item.id === "snapshot-reporting-read-model")?.scopeLabel).toBe(
      "owner dimension"
    );
  });

  it("builds reporting freshness metrics", () => {
    const freshness = buildAppointmentReportingFreshnessSummary({
      snapshotEntries: buildAppointmentReportingSnapshotEntries({
        generatedForLabel: "Tuesday, July 7, 2026 · Focus APT-10245",
        selectedAppointmentId: "APT-10245",
        reportRowCount: 4,
        readModelDimension: "owner",
        readModelRowCount: 3,
        reconciliationCount: 2
      }),
      kpiCount: 6,
      visibleExceptions: 5,
      breachedSla: 2,
      reconciliationCount: 2
    });

    expect(freshness.metrics).toHaveLength(5);
    expect(freshness.metrics.find((metric) => metric.label === "Breached SLA pressure")?.tone).toBe(
      "red"
    );
  });
});
