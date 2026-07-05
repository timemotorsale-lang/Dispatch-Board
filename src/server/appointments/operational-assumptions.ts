export const APPOINTMENT_OPERATIONAL_BASELINE = {
  approvalStatus: "PROPOSED_FOR_E1_APPROVAL",
  effectiveFrom: "2026-07-05",
  locationCode: "TMS-MSP-01",
  owners: {
    business: "General Manager",
    dataReporting: "Data/reporting reviewer",
    operations: "Operations reviewer",
    securityPrivacy: "Security/privacy reviewer",
    quality: "Quality reviewer"
  },
  volume: {
    expectedAppointmentsPerBusinessDay: 75,
    peakAppointmentsPerBusinessDay: 125,
    peakAppointmentsPerHour: 24,
    concurrentCommandCenterUsers: 20,
    appointmentOwners: 15,
    schedulableResources: 50,
    automationRules: 40,
    bulkOperationAppointmentLimit: 500
  },
  retention: {
    activeOperationalMonths: 24,
    appointmentRecordYears: 7,
    appointmentHistoryYears: 7,
    appointmentCommandLedgerYears: 2,
    automationExecutionYears: 3,
    internalNotificationMonths: 18,
    reportingAggregateYears: 7,
    archiveClosedAppointmentAfterMonths: 24,
    hardDeleteAuditEvents: false
  },
  recovery: {
    rtoMinutes: 240,
    rpoMinutes: 15,
    restoreDrillFrequencyDays: 90,
    backupFrequencyMinutes: 15
  },
  performance: {
    commandCenterInitialLoadP95Ms: 2000,
    mutationP95Ms: 1000,
    availabilitySearchP95Ms: 1500,
    scheduleNavigationP95Ms: 1000,
    reportingDashboardP95Ms: 3000
  },
  archive: {
    archiveClosedStatuses: ["CANCELLED", "COMPLETED"],
    preserveLinkedTasks: true,
    preserveHistoryEvents: true,
    preserveCommandLedgerEvidence: true,
    requireRestoreReconciliation: true
  },
  indexCoverage: [
    "location_day_schedule",
    "location_status_schedule",
    "owner_status_schedule",
    "resource_reservation_window",
    "appointment_history_timeline",
    "appointment_command_idempotency",
    "appointment_task_bidirectional_links",
    "customer_vehicle_search"
  ]
} as const;

export type AppointmentOperationalBaseline = typeof APPOINTMENT_OPERATIONAL_BASELINE;

export function validateAppointmentOperationalBaseline(
  baseline: AppointmentOperationalBaseline = APPOINTMENT_OPERATIONAL_BASELINE
) {
  if (baseline.approvalStatus !== "PROPOSED_FOR_E1_APPROVAL") {
    throw new Error("Appointment operational baseline must remain explicit about approval status.");
  }

  if (baseline.volume.expectedAppointmentsPerBusinessDay < 1) {
    throw new Error("Appointment operational baseline requires expected daily volume.");
  }

  if (
    baseline.volume.peakAppointmentsPerBusinessDay <
    baseline.volume.expectedAppointmentsPerBusinessDay
  ) {
    throw new Error("Peak appointment volume cannot be lower than expected volume.");
  }

  if (baseline.volume.bulkOperationAppointmentLimit < baseline.volume.peakAppointmentsPerBusinessDay) {
    throw new Error("Bulk operation limit must cover at least one peak business day.");
  }

  if (baseline.retention.activeOperationalMonths < 12) {
    throw new Error("Active appointment retention must keep at least twelve months hot.");
  }

  if (baseline.retention.appointmentHistoryYears < baseline.retention.appointmentRecordYears) {
    throw new Error("Appointment history retention cannot be shorter than appointment retention.");
  }

  if (baseline.retention.hardDeleteAuditEvents) {
    throw new Error("Appointment audit events cannot be hard-deleted in the enterprise baseline.");
  }

  if (baseline.recovery.rtoMinutes > 240) {
    throw new Error("Appointment recovery-time objective cannot exceed four hours.");
  }

  if (baseline.recovery.rpoMinutes > 15) {
    throw new Error("Appointment recovery-point objective cannot exceed fifteen minutes.");
  }

  if (baseline.performance.commandCenterInitialLoadP95Ms > 2000) {
    throw new Error("Command-center p95 initial load target cannot exceed two seconds.");
  }

  if (baseline.performance.mutationP95Ms > 1000) {
    throw new Error("Appointment mutation p95 target cannot exceed one second.");
  }

  if (!baseline.archive.preserveHistoryEvents || !baseline.archive.preserveLinkedTasks) {
    throw new Error("Appointment archive policy must preserve history and linked work.");
  }

  if (!baseline.indexCoverage.includes("appointment_command_idempotency")) {
    throw new Error("Appointment index coverage must include command idempotency.");
  }

  return baseline;
}
