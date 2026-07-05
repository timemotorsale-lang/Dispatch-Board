import { describe, expect, it } from "vitest";

import {
  APPOINTMENT_OPERATIONAL_BASELINE,
  validateAppointmentOperationalBaseline
} from "@/server/appointments/operational-assumptions";

describe("appointment operational assumptions", () => {
  it("declares measurable E1 production-volume assumptions with owners", () => {
    expect(validateAppointmentOperationalBaseline()).toBe(APPOINTMENT_OPERATIONAL_BASELINE);
    expect(APPOINTMENT_OPERATIONAL_BASELINE.owners).toEqual({
      business: "General Manager",
      dataReporting: "Data/reporting reviewer",
      operations: "Operations reviewer",
      securityPrivacy: "Security/privacy reviewer",
      quality: "Quality reviewer"
    });
    expect(APPOINTMENT_OPERATIONAL_BASELINE.volume).toMatchObject({
      expectedAppointmentsPerBusinessDay: 75,
      peakAppointmentsPerBusinessDay: 125,
      concurrentCommandCenterUsers: 20,
      bulkOperationAppointmentLimit: 500
    });
  });

  it("keeps retention and archive assumptions audit-safe", () => {
    expect(APPOINTMENT_OPERATIONAL_BASELINE.retention).toMatchObject({
      activeOperationalMonths: 24,
      appointmentRecordYears: 7,
      appointmentHistoryYears: 7,
      hardDeleteAuditEvents: false
    });
    expect(APPOINTMENT_OPERATIONAL_BASELINE.archive).toMatchObject({
      archiveClosedStatuses: ["CANCELLED", "COMPLETED"],
      preserveLinkedTasks: true,
      preserveHistoryEvents: true,
      preserveCommandLedgerEvidence: true,
      requireRestoreReconciliation: true
    });
  });

  it("sets enterprise recovery and performance gates", () => {
    expect(APPOINTMENT_OPERATIONAL_BASELINE.recovery).toEqual({
      rtoMinutes: 240,
      rpoMinutes: 15,
      restoreDrillFrequencyDays: 90,
      backupFrequencyMinutes: 15
    });
    expect(APPOINTMENT_OPERATIONAL_BASELINE.performance).toMatchObject({
      commandCenterInitialLoadP95Ms: 2000,
      mutationP95Ms: 1000,
      reportingDashboardP95Ms: 3000
    });
  });

  it("tracks the query families that future indexes and load tests must cover", () => {
    expect(APPOINTMENT_OPERATIONAL_BASELINE.indexCoverage).toEqual([
      "location_day_schedule",
      "location_status_schedule",
      "owner_status_schedule",
      "resource_reservation_window",
      "appointment_history_timeline",
      "appointment_command_idempotency",
      "appointment_task_bidirectional_links",
      "customer_vehicle_search"
    ]);
  });
});
