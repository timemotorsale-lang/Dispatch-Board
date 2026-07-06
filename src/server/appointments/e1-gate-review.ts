export const APPOINTMENT_E1_GATE_REVIEW = {
  status: "READY_FOR_APPROVAL",
  reviewedThrough: "EAPT-012",
  recommendation: "PROCEED_TO_E2_AFTER_GATE_APPROVAL",
  gateCriteria: [
    {
      criterion: "Product model approved",
      result: "PASS",
      evidence: [
        "ENTERPRISE_PRODUCT_SPEC.md",
        "APPOINTMENT_AGGREGATE_CONTRACT.md",
        "PARTICIPANT_RESOURCE_CONTRACT.md"
      ]
    },
    {
      criterion: "Architecture approved",
      result: "PASS",
      evidence: ["ARCHITECTURE_DECISIONS.md"]
    },
    {
      criterion: "Permission and privacy boundaries approved",
      result: "PASS",
      evidence: [
        "PERMISSION_MATRIX.md",
        "PARTICIPANT_RESOURCE_CONTRACT.md",
        "src/server/policies/access.ts"
      ]
    },
    {
      criterion: "Production-volume assumptions recorded",
      result: "PASS",
      evidence: [
        "PRODUCTION_OPERATIONS_BASELINE.md",
        "src/server/appointments/operational-assumptions.ts"
      ]
    },
    {
      criterion: "Migration and rollback strategy approved",
      result: "READY_FOR_APPROVAL",
      evidence: [
        "MIGRATION_SEED_ROLLBACK_STRATEGY.md",
        "src/server/appointments/migration-readiness.ts"
      ]
    },
    {
      criterion: "Contract-level test plan approved",
      result: "PASS",
      evidence: ["ACCEPTANCE_SCENARIOS.md", "src/tests/unit"]
    },
    {
      criterion: "No unresolved high-risk domain ambiguity",
      result: "PASS_WITH_CARRY_FORWARD_RISKS",
      evidence: [
        "E1_CONFIGURATION_BASELINE.md",
        "IMPLEMENTATION_ROADMAP.md",
        "E1_FOUNDATION_GATE_REVIEW.md"
      ]
    }
  ],
  carryForwardRisks: [
    {
      risk: "Database-backed appointment template administration remains later-scope.",
      owner: "Appointment Administrator / General Manager",
      targetMilestone: "E5",
      mitigation:
        "Use approved template catalog and versioned snapshot foundation until the administration workflow is built."
    },
    {
      risk: "Scheduling, availability, recurrence, and hard-conflict execution are not implemented yet.",
      owner: "Architecture reviewer",
      targetMilestone: "E2",
      mitigation:
        "Begin E2 with location-time service and authoritative resource availability/conflict engine slices."
    },
    {
      risk: "Live command-center read models and production appointment persistence workflows are not implemented yet.",
      owner: "Builder / Quality reviewer",
      targetMilestone: "E3/E4",
      mitigation:
        "Keep preview UI explicitly labeled as preview until read models and lifecycle services back it."
    },
    {
      risk: "Production approval of proposed volume, RTO, RPO, and restore evidence remains pending.",
      owner: "Operations reviewer",
      targetMilestone: "E9",
      mitigation:
        "Use EAPT-011 values as minimum test targets and require restore evidence before release qualification."
    }
  ],
  nextMilestone: {
    id: "E2",
    name: "Scheduling, Availability, and Capacity Engine",
    firstWorkPackage: "EAPT-013",
    firstWorkPackageName: "Implement location time, operating-hours, closures, and timezone services"
  }
} as const;

export type AppointmentE1GateReview = typeof APPOINTMENT_E1_GATE_REVIEW;

export function validateAppointmentE1GateReview(
  review: AppointmentE1GateReview = APPOINTMENT_E1_GATE_REVIEW
) {
  if (review.status !== "READY_FOR_APPROVAL") {
    throw new Error("E1 gate review must remain explicit about approval status.");
  }

  if (review.reviewedThrough !== "EAPT-012") {
    throw new Error("E1 gate review must cover EAPT-001 through EAPT-012.");
  }

  if (review.gateCriteria.length !== 7) {
    throw new Error("E1 gate review must evaluate every roadmap gate criterion.");
  }

  const gateCriteria: readonly { result: string }[] = review.gateCriteria;

  if (gateCriteria.some((criterion) => criterion.result === "FAIL")) {
    throw new Error("E1 gate review cannot recommend E2 while a gate criterion is failing.");
  }

  if (!review.carryForwardRisks.length) {
    throw new Error("E1 gate review must document carry-forward risks.");
  }

  if (review.nextMilestone.firstWorkPackage !== "EAPT-013") {
    throw new Error("E1 gate review must hand off to EAPT-013.");
  }

  return review;
}
