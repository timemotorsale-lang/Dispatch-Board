export type SalesConsoleM34ReleaseGate = {
  gate: string;
  decision: "go-if-verified" | "no-go-if-failing";
  proofRequired: string;
};

export const salesConsoleM34MvpGoNoGoRelease = {
  milestone: "Milestone 34 - MVP Go/No-Go Release Decision",
  releaseDecision: "go-after-environment-verification",
  mvpCompletionLevel: "100-percent-mvp-code-ready",
  decisionSummary: "The Sales Console MVP can move to controlled internal staff deployment after deployed-environment smoke, one-user-per-role access verification, and Manager Review Request end-to-end verification pass.",
  goGates: [
    {
      gate: "Deployment environment smoke passes",
      decision: "go-if-verified",
      proofRequired: "/sales opens in the deployed environment with no runtime overlay and readable staff layout."
    },
    {
      gate: "Real role access verification passes",
      decision: "go-if-verified",
      proofRequired: "One Salesperson, Sales Manager, BDC / Lead Coordinator, and Admin / Owner each see the correct role view."
    },
    {
      gate: "Manager Review Request end-to-end test passes",
      decision: "go-if-verified",
      proofRequired: "Valid submit, validation error, duplicate/idempotency, manager workbench visibility, and audit/reference IDs are verified."
    },
    {
      gate: "Risky workflows remain blocked",
      decision: "go-if-verified",
      proofRequired: "Quotes, discounts, finance decisions, vehicle holds, messaging automation, and CRM/DMS replacement are unavailable."
    },
    {
      gate: "Support and rollback path are ready",
      decision: "go-if-verified",
      proofRequired: "Support owner is named, issue reporting path is communicated, and staff can return to source systems if needed."
    }
  ] satisfies SalesConsoleM34ReleaseGate[],
  noGoBlockers: [
    "The deployed /sales route fails to load.",
    "Any role sees inappropriate admin, manager, or restricted workflow context.",
    "Manager Review Request cannot be submitted or reviewed with clear audit/reference evidence.",
    "Any excluded workflow becomes active.",
    "No support owner is available during the first staff rollout window."
  ],
  immediateLaunchSteps: [
    "Deploy the current main branch to the target environment.",
    "Run M30 environment smoke.",
    "Run M31 one-user-per-role verification.",
    "Run M32 Manager Review Request end-to-end test.",
    "Brief staff with M33 rollout package.",
    "Open access to the controlled MVP staff group."
  ],
  firstDayMonitoring: [
    "Track failed Manager Review Request submits.",
    "Track source label confusion.",
    "Track role access problems.",
    "Track staff requests for quote, finance, discount, hold, or messaging workflows.",
    "Decide expand, pause, or fix after the first operating day."
  ]
} as const;

export function salesConsoleM34DefinesFinalGoDecision() {
  return salesConsoleM34MvpGoNoGoRelease.releaseDecision === "go-after-environment-verification" &&
    salesConsoleM34MvpGoNoGoRelease.mvpCompletionLevel === "100-percent-mvp-code-ready";
}

export function salesConsoleM34RequiresAllCriticalVerification() {
  return salesConsoleM34MvpGoNoGoRelease.goGates.length === 5 &&
    salesConsoleM34MvpGoNoGoRelease.goGates.every((gate) => gate.decision === "go-if-verified");
}

export function salesConsoleM34BlocksReleaseOnKnownNoGoRisks() {
  return salesConsoleM34MvpGoNoGoRelease.noGoBlockers.includes("Any excluded workflow becomes active.") &&
    salesConsoleM34MvpGoNoGoRelease.noGoBlockers.some((blocker) => blocker.includes("deployed /sales route fails"));
}

export function salesConsoleM34ProvidesImmediateLaunchSequence() {
  return salesConsoleM34MvpGoNoGoRelease.immediateLaunchSteps[0] === "Deploy the current main branch to the target environment." &&
    salesConsoleM34MvpGoNoGoRelease.immediateLaunchSteps.at(-1) === "Open access to the controlled MVP staff group.";
}
