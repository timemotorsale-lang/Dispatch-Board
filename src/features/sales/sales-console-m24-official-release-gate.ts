export const salesConsoleM24OfficialReleaseGate = {
  milestone: "Milestone 24 — Official Production Release Gate",
  releaseDecision: "conditional",
  recommendation:
    "Official MVP release is conditional on owner approval after staff pilot review; Manager Review Request is the only activated write workflow.",
  goNoGoCriteria: [
    { criterion: "Manager Review Request submit works", status: "go" },
    { criterion: "Audit and idempotency evidence visible", status: "go" },
    { criterion: "Role readiness complete", status: "go" },
    { criterion: "Risky enterprise workflows blocked", status: "go" },
    { criterion: "Staff pilot feedback accepted", status: "conditional" }
  ],
  knownLimitations: [
    "Resolution actions are planned/disabled.",
    "Quote, discount, finance, messaging, and vehicle hold workflows are not active.",
    "CRM/DMS/source systems remain the systems of record.",
    "Some operating surfaces still depend on fallback/source-shaped data."
  ],
  rollbackPlan: [
    "Hide /sales navigation for operating roles if pilot feedback exposes blocking risk.",
    "Disable Manager Review Request submit path by reverting the UI activation branch.",
    "Keep existing source systems as fallback because Sales Console does not replace them."
  ],
  supportPlan: [
    "Admin / Owner receives pilot issues.",
    "Sales Manager confirms manager review tasks are understood.",
    "Implementation owner reviews audit/idempotency evidence after first staff use."
  ],
  monitoringPlan: [
    "Watch Manager Review Request created vs duplicate responses.",
    "Watch validation, auth, and idempotency conflict errors.",
    "Watch staff reports of stale, unavailable, and fallback labels."
  ],
  staffTrainingRequirements: [
    "Train staff that only Manager Review Request is live.",
    "Train managers that resolution actions are planned.",
    "Train everyone that source systems remain authoritative."
  ]
} as const;

export function salesConsoleM24ReleaseIsConditional() {
  return salesConsoleM24OfficialReleaseGate.releaseDecision === "conditional";
}

export function salesConsoleM24KeepsOnlyManagerReviewLive() {
  return salesConsoleM24OfficialReleaseGate.recommendation.includes("only activated write workflow");
}

export function salesConsoleM24HasRollbackSupportAndMonitoring() {
  return Boolean(
    salesConsoleM24OfficialReleaseGate.rollbackPlan.length &&
      salesConsoleM24OfficialReleaseGate.supportPlan.length &&
      salesConsoleM24OfficialReleaseGate.monitoringPlan.length
  );
}
