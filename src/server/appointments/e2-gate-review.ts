export const APPOINTMENT_E2_GATE_REVIEW = {
  status: "READY_FOR_REVIEW",
  reviewedThrough: "EAPT-025",
  recommendation: "PROCEED_TO_E3_AFTER_GATE_APPROVAL",
  gateCriteria: [
    {
      criterion: "Hard conflicts cannot be overridden",
      result: "PASS",
      evidence: [
        "HARD_CONFLICT_EVALUATION_CONTRACT.md",
        "src/server/appointments/appointment-hard-conflict-service.ts",
        "src/tests/unit/appointment-hard-conflict-service.test.ts"
      ]
    },
    {
      criterion: "Warning overrides are manager-only and reasoned",
      result: "PASS",
      evidence: [
        "WARNING_OVERRIDE_CONTRACT.md",
        "src/server/appointments/appointment-warning-service.ts",
        "src/tests/unit/appointment-warning-service.test.ts"
      ]
    },
    {
      criterion: "Concurrent scheduling cannot overbook exclusive capacity",
      result: "PASS",
      evidence: [
        "RESOURCE_RESERVATION_COMMIT_CONTRACT.md",
        "SCHEDULING_ENGINE_QUALITY_GATE.md",
        "src/tests/unit/appointment-scheduling-engine-quality.test.ts"
      ]
    },
    {
      criterion: "Recurrence and DST behavior passes",
      result: "PASS",
      evidence: [
        "RECURRENCE_OCCURRENCE_CONTRACT.md",
        "LOCATION_TIME_SERVICE_CONTRACT.md",
        "src/tests/unit/appointment-recurrence-service.test.ts",
        "src/tests/unit/appointment-location-time-service.test.ts"
      ]
    },
    {
      criterion: "Bulk operations are previewable, retry-safe, and auditable",
      result: "PASS",
      evidence: [
        "BULK_RESCHEDULE_CONTRACT.md",
        "RESCHEDULE_IMPACT_PREVIEW_CONTRACT.md",
        "src/tests/unit/appointment-bulk-reschedule-service.test.ts"
      ]
    },
    {
      criterion: "Availability search and commit behavior reconcile",
      result: "PASS",
      evidence: [
        "AVAILABILITY_SEARCH_CONTRACT.md",
        "RESOURCE_RESERVATION_COMMIT_CONTRACT.md",
        "src/tests/unit/appointment-availability-search-service.test.ts",
        "src/tests/unit/appointment-reservation-commit-service.test.ts"
      ]
    },
    {
      criterion: "Performance passes approved scheduling volume",
      result: "PASS",
      evidence: [
        "PRODUCTION_OPERATIONS_BASELINE.md",
        "SCHEDULING_ENGINE_QUALITY_GATE.md",
        "src/tests/unit/appointment-scheduling-engine-quality.test.ts"
      ]
    }
  ],
  implementedWorkPackages: [
    "EAPT-013",
    "EAPT-014",
    "EAPT-015",
    "EAPT-016",
    "EAPT-017",
    "EAPT-018",
    "EAPT-019",
    "EAPT-020",
    "EAPT-021",
    "EAPT-022",
    "EAPT-023",
    "EAPT-024",
    "EAPT-025"
  ],
  carryForwardRisks: [
    {
      risk: "Scheduling services are implemented as service boundaries, but live Prisma adapters for scheduling commits are not complete.",
      owner: "Builder / Architecture reviewer",
      targetMilestone: "E3/E4",
      mitigation:
        "Use the E2 service contracts as the required behavior when adding concrete transaction adapters and command execution."
    },
    {
      risk: "The Appointment Board still renders preview data instead of live scheduling read models.",
      owner: "Builder / Product owner",
      targetMilestone: "E4",
      mitigation:
        "Keep the visible board shell explicit as preview until command-center read services and APIs are implemented."
    },
    {
      risk: "Warning override and reservation commit records are audit-shaped but not yet persisted as lifecycle history.",
      owner: "Quality reviewer / Audit reviewer",
      targetMilestone: "E3",
      mitigation:
        "Persist warning override, reservation, lifecycle, and history effects together during command execution work."
    },
    {
      risk: "Production load testing, database locking evidence, and restore drills remain later release-qualification work.",
      owner: "Operations reviewer / Quality reviewer",
      targetMilestone: "E9",
      mitigation:
        "Use EAPT-025 as minimum automated service-boundary coverage and collect production-like evidence before release qualification."
    }
  ],
  nonClaims: [
    "Database-backed scheduling adapters are complete.",
    "Live appointment scheduling commands execute full mutations.",
    "The visible Appointment Board is backed by live appointment read models.",
    "Waitlist, bulk, recurrence, and warning workflows are exposed in the UI.",
    "Production load tests and restore drills have been completed."
  ],
  nextMilestone: {
    id: "E3",
    name: "Lifecycle, Task Orchestration, Audit, and Automation",
    firstWorkPackage: "EAPT-026",
    firstWorkPackageName:
      "Implement appointment read model and permission-filtered queries"
  }
} as const;

export type AppointmentE2GateReview = typeof APPOINTMENT_E2_GATE_REVIEW;

export function validateAppointmentE2GateReview(
  review: AppointmentE2GateReview = APPOINTMENT_E2_GATE_REVIEW
) {
  if (review.status !== "READY_FOR_REVIEW") {
    throw new Error("E2 gate review must remain explicit about review status.");
  }

  if (review.reviewedThrough !== "EAPT-025") {
    throw new Error("E2 gate review must cover EAPT-013 through EAPT-025.");
  }

  if (review.gateCriteria.length !== 7) {
    throw new Error("E2 gate review must evaluate every E2 gate criterion.");
  }

  const gateCriteria: readonly { result: string }[] = review.gateCriteria;

  if (gateCriteria.some((criterion) => criterion.result === "FAIL")) {
    throw new Error("E2 gate review cannot recommend E3 while a gate criterion is failing.");
  }

  if (review.implementedWorkPackages.length !== 13) {
    throw new Error("E2 gate review must include EAPT-013 through EAPT-025.");
  }

  if (!review.carryForwardRisks.length || !review.nonClaims.length) {
    throw new Error("E2 gate review must document carry-forward risks and non-claims.");
  }

  if (review.nextMilestone.firstWorkPackage !== "EAPT-026") {
    throw new Error("E2 gate review must hand off to EAPT-026.");
  }

  return review;
}
