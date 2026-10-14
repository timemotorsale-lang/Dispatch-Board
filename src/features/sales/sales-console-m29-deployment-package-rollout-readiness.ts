export type SalesConsoleM29ReadinessItem = {
  item: string;
  owner: "Admin / Owner" | "Sales Manager" | "Rollout Support Owner";
  status: "ready" | "verify-in-environment";
  proof: string;
};

export const salesConsoleM29DeploymentPackageRolloutReadiness = {
  milestone: "Milestone 29 - Deployment Package & Rollout Readiness",
  deploymentDecision: "ready-for-final-review",
  staffSummary: "Sales Console is an internal MVP operating console for priorities, source-aware visibility, and Manager Review Request.",
  notActiveSummary: "Quotes, discounts, finance decisions, vehicle holds, customer messaging automation, and CRM/DMS replacement are not active in this MVP.",
  supportOwner: "Admin / Owner or named Sales Console rollout lead",
  issueReportingPath: "Staff report confusing data, missing access, blocked Manager Review Request, or misleading source labels to the rollout support owner before expanding access.",
  rollbackPath: "If a release gate fails, remove staff access to /sales, return users to source systems, and keep Manager Review Request intake in the approved fallback process.",
  readinessChecklist: [
    {
      item: "Staff roles verified",
      owner: "Admin / Owner",
      status: "verify-in-environment",
      proof: "Confirm each staff user resolves to Salesperson, Sales Manager, BDC / Lead Coordinator, or Admin / Owner before rollout."
    },
    {
      item: "Manager reviewers assigned",
      owner: "Sales Manager",
      status: "verify-in-environment",
      proof: "Confirm at least one manager is responsible for incoming Manager Review Requests during operating hours."
    },
    {
      item: "Access path confirmed",
      owner: "Admin / Owner",
      status: "verify-in-environment",
      proof: "Confirm staff can open /sales from the deployed environment and unauthorized users are blocked."
    },
    {
      item: "Support owner named",
      owner: "Rollout Support Owner",
      status: "ready",
      proof: "Support ownership is represented in the rollout package and should be named before staff access opens."
    },
    {
      item: "Excluded workflows communicated",
      owner: "Admin / Owner",
      status: "ready",
      proof: "The console states that quotes, discounts, finance, holds, messaging automation, and source replacement are not active."
    },
    {
      item: "Source and freshness labels understood",
      owner: "Sales Manager",
      status: "ready",
      proof: "Staff guidance explains current, stale, unavailable, verify-first, and fallback/source-shaped labels."
    },
    {
      item: "Rollback path identified",
      owner: "Admin / Owner",
      status: "ready",
      proof: "The rollout package defines return-to-source-system behavior if the console fails a go/no-go gate."
    }
  ] satisfies SalesConsoleM29ReadinessItem[],
  goNoGoCriteria: {
    go: [
      "Staff can open /sales in the target environment.",
      "Roles show the expected operating view.",
      "Manager Review Request submits only when valid and authorized.",
      "Managers can see review workbench context.",
      "Blocked workflows remain unavailable.",
      "Source/freshness labels are visible and understandable."
    ],
    noGo: [
      "Any staff role sees inappropriate admin or manager context.",
      "Any excluded write action becomes available.",
      "Manager Review Request fails without a clear error state.",
      "Source labels are missing from operating views.",
      "No support owner is available during rollout."
    ]
  },
  nextPhaseRecommendations: [
    "Run final deployed-environment smoke verification with one user per role.",
    "Open access to a small named staff group first.",
    "Collect issues for one operating day before expanding access.",
    "Plan the next approved workflow only after Manager Review Request is stable."
  ],
  knownLimitations: [
    "The console is not a CRM/DMS replacement.",
    "Manager Review Request is the only live submit path.",
    "Some data remains source-shaped or fallback-labeled until source mappings are expanded.",
    "Protected route behavior must be verified in the deployed environment."
  ]
} as const;

export function salesConsoleM29ReadinessChecklistCoversDeploymentBasics() {
  const items = salesConsoleM29DeploymentPackageRolloutReadiness.readinessChecklist.map((entry) => entry.item);
  return [
    "Staff roles verified",
    "Manager reviewers assigned",
    "Access path confirmed",
    "Support owner named",
    "Excluded workflows communicated",
    "Source and freshness labels understood",
    "Rollback path identified"
  ].every((item) => items.includes(item));
}

export function salesConsoleM29DefinesGoNoGoCriteria() {
  return salesConsoleM29DeploymentPackageRolloutReadiness.goNoGoCriteria.go.length >= 6 &&
    salesConsoleM29DeploymentPackageRolloutReadiness.goNoGoCriteria.noGo.length >= 5;
}

export function salesConsoleM29CommunicatesWhatIsAndIsNotActive() {
  return salesConsoleM29DeploymentPackageRolloutReadiness.staffSummary.includes("Manager Review Request") &&
    salesConsoleM29DeploymentPackageRolloutReadiness.notActiveSummary.includes("finance decisions") &&
    salesConsoleM29DeploymentPackageRolloutReadiness.notActiveSummary.includes("CRM/DMS replacement");
}

export function salesConsoleM29RequiresEnvironmentVerificationBeforeBroadRollout() {
  return salesConsoleM29DeploymentPackageRolloutReadiness.readinessChecklist.some((entry) =>
    entry.item === "Access path confirmed" && entry.status === "verify-in-environment"
  );
}
