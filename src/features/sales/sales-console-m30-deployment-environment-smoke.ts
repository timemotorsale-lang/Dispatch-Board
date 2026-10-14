export type SalesConsoleM30SmokeCheck = {
  check: string;
  owner: "Admin / Owner" | "Rollout Support Owner" | "Sales Manager";
  status: "ready-to-smoke" | "verify-after-deploy";
  evidence: string;
};

export const salesConsoleM30DeploymentEnvironmentSmoke = {
  milestone: "Milestone 30 - Deployment Environment Smoke Test",
  deploymentPosture: "ready-for-deployed-environment-verification",
  smokeSummary: "Before opening access broadly, verify the deployed /sales route loads cleanly, presents staff-ready language, and keeps risky workflows blocked.",
  checks: [
    {
      check: "/sales route opens",
      owner: "Admin / Owner",
      status: "verify-after-deploy",
      evidence: "Open /sales in the deployed environment and confirm the Sales Console shell renders without runtime or build overlays."
    },
    {
      check: "Desktop, tablet, and narrow layout usable",
      owner: "Rollout Support Owner",
      status: "verify-after-deploy",
      evidence: "Confirm top navigation, KPI strip, operating tabs, manager rail, and readiness panels remain readable at staff device widths."
    },
    {
      check: "Staff-facing language is clean",
      owner: "Sales Manager",
      status: "ready-to-smoke",
      evidence: "Normal staff views use rollout-ready operating language instead of planning-era labels."
    },
    {
      check: "Source labels are visible",
      owner: "Sales Manager",
      status: "ready-to-smoke",
      evidence: "Current, stale, unavailable, verify-first, and fallback/source-shaped labels are visible where source confidence matters."
    },
    {
      check: "Risky workflows stay blocked",
      owner: "Admin / Owner",
      status: "ready-to-smoke",
      evidence: "Quote submission, discount approvals, finance decisions, vehicle holds, messaging automation, and CRM/DMS replacement remain unavailable."
    }
  ] satisfies SalesConsoleM30SmokeCheck[],
  passCriteria: [
    "The deployed /sales route opens for authorized staff.",
    "The console is readable on expected staff devices.",
    "No planning-era wording appears in normal staff operating flow.",
    "Source and freshness labels are visible.",
    "Only Manager Review Request can submit from Sales Console."
  ],
  failActions: [
    "Do not expand staff access.",
    "Capture screenshot, role, device, and route.",
    "Return staff to source systems for impacted work.",
    "Fix the issue before continuing to role verification."
  ]
} as const;

export function salesConsoleM30CoversDeploymentSmokeBasics() {
  return salesConsoleM30DeploymentEnvironmentSmoke.checks.length >= 5 &&
    salesConsoleM30DeploymentEnvironmentSmoke.passCriteria.includes("The deployed /sales route opens for authorized staff.");
}

export function salesConsoleM30KeepsRiskyWorkflowsBlocked() {
  return salesConsoleM30DeploymentEnvironmentSmoke.checks.some((check) =>
    check.check === "Risky workflows stay blocked" && check.evidence.includes("finance decisions")
  );
}

export function salesConsoleM30HasRollbackBehaviorForFailedSmoke() {
  return salesConsoleM30DeploymentEnvironmentSmoke.failActions.includes("Do not expand staff access.") &&
    salesConsoleM30DeploymentEnvironmentSmoke.failActions.some((action) => action.includes("Return staff to source systems"));
}
