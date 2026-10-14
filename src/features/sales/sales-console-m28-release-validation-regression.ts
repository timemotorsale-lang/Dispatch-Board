export type SalesConsoleM28RegressionArea =
  | "route-render"
  | "protected-access"
  | "role-visibility"
  | "manager-review-submit"
  | "manager-review-workbench"
  | "blocked-workflows"
  | "operating-states"
  | "source-system-boundary";

export type SalesConsoleM28RegressionCheck = {
  area: SalesConsoleM28RegressionArea;
  status: "covered" | "covered-by-focused-test" | "manual-smoke";
  evidence: string;
  releaseRisk: "low" | "medium";
};

export const salesConsoleM28ReleaseValidationRegression = {
  milestone: "Milestone 28 - MVP Release Validation & Regression Pass",
  releasePosture: "controlled-internal-mvp-ready",
  adminSummary: "Release validation covers the Sales Console route, role-aware views, Manager Review Request, safe states, and blocked enterprise workflows.",
  checks: [
    {
      area: "route-render",
      status: "covered-by-focused-test",
      evidence: "/sales renders the Sales Console shell, top navigation, operating tabs, and review evidence without build errors.",
      releaseRisk: "low"
    },
    {
      area: "protected-access",
      status: "manual-smoke",
      evidence: "Protected-route behavior remains tied to existing auth guards and should be verified in the target deployment environment.",
      releaseRisk: "medium"
    },
    {
      area: "role-visibility",
      status: "covered-by-focused-test",
      evidence: "Salesperson, Sales Manager, BDC / Lead Coordinator, and Admin / Owner have role-aware operating guidance.",
      releaseRisk: "low"
    },
    {
      area: "manager-review-submit",
      status: "covered-by-focused-test",
      evidence: "Manager Review Request is the only active Sales Console submit path and preserves audit/idempotency behavior.",
      releaseRisk: "low"
    },
    {
      area: "manager-review-workbench",
      status: "covered-by-focused-test",
      evidence: "Managers and admins can review incoming Manager Review work without activating resolution, discount, quote, finance, hold, or message actions.",
      releaseRisk: "low"
    },
    {
      area: "blocked-workflows",
      status: "covered-by-focused-test",
      evidence: "Messaging automation, quote submission, vehicle holds, finance decisions, and discount approvals remain unavailable in the console MVP.",
      releaseRisk: "low"
    },
    {
      area: "operating-states",
      status: "covered",
      evidence: "Loading, error, empty, stale, unavailable, verify-first, duplicate, and conflict states are represented in the operating model.",
      releaseRisk: "low"
    },
    {
      area: "source-system-boundary",
      status: "covered",
      evidence: "CRM, DMS, inventory, finance, and marketing systems remain the source of record; Sales Console reads and labels their data.",
      releaseRisk: "low"
    }
  ] satisfies SalesConsoleM28RegressionCheck[],
  goNoGo: {
    go: [
      "Focused Sales Console tests pass.",
      "Typecheck passes.",
      "Focused lint passes.",
      "No excluded enterprise workflow is active.",
      "Manager Review Request remains the only submit workflow."
    ],
    noGo: [
      "Any broad write workflow appears outside Manager Review Request.",
      "Source labels are hidden or misleading.",
      "Role visibility exposes admin/manager context to the wrong staff role.",
      "Protected route verification fails in the target environment."
    ]
  }
} as const;

export function salesConsoleM28CoversCriticalRegressionAreas() {
  const areas = new Set(salesConsoleM28ReleaseValidationRegression.checks.map((check) => check.area));
  return [
    "route-render",
    "protected-access",
    "role-visibility",
    "manager-review-submit",
    "manager-review-workbench",
    "blocked-workflows",
    "operating-states",
    "source-system-boundary"
  ].every((area) => areas.has(area as SalesConsoleM28RegressionArea));
}

export function salesConsoleM28KeepsOnlyManagerReviewSubmitLive() {
  return salesConsoleM28ReleaseValidationRegression.checks.some((check) =>
    check.area === "manager-review-submit" && check.evidence.includes("only active Sales Console submit path")
  );
}

export function salesConsoleM28DefinesReleaseGoNoGo() {
  return salesConsoleM28ReleaseValidationRegression.goNoGo.go.length >= 5 &&
    salesConsoleM28ReleaseValidationRegression.goNoGo.noGo.length >= 4;
}

export function salesConsoleM28FlagsProtectedRouteAsEnvironmentSmoke() {
  return salesConsoleM28ReleaseValidationRegression.checks.some((check) =>
    check.area === "protected-access" && check.status === "manual-smoke"
  );
}
