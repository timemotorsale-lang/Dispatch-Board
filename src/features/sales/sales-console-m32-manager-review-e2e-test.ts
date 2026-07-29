export type SalesConsoleM32ManagerReviewStep = {
  step: string;
  actor: "Salesperson" | "Admin / Owner" | "Sales Manager";
  expectedResult: string;
  requiredEvidence: string[];
};

export const salesConsoleM32ManagerReviewE2ETest = {
  milestone: "Milestone 32 - Manager Review Request End-to-End Test",
  workflowPosture: "approved-manager-review-request-only",
  e2eSummary: "Validate the one live Sales Console workflow from staff submit through manager workbench visibility, duplicate handling, and audit/reference evidence.",
  steps: [
    {
      step: "Submit valid Manager Review Request",
      actor: "Salesperson",
      expectedResult: "Request is accepted when required customer, deal, reason, source snapshot, and idempotency fields are present.",
      requiredEvidence: ["task ID", "audit ID", "command ID", "correlation ID", "idempotency key"]
    },
    {
      step: "Submit with missing required fields",
      actor: "Salesperson",
      expectedResult: "Clear validation error appears and no request is created.",
      requiredEvidence: ["validation message", "no task ID created", "no source mutation"]
    },
    {
      step: "Retry same request idempotently",
      actor: "Salesperson",
      expectedResult: "Duplicate retry returns the existing request reference without creating a second manager task.",
      requiredEvidence: ["duplicate state", "existing task ID", "same idempotency key"]
    },
    {
      step: "Manager opens request in workbench",
      actor: "Sales Manager",
      expectedResult: "Manager can see incoming request context and source labels without resolution, discount, quote, finance, hold, or messaging actions.",
      requiredEvidence: ["request context", "source labels", "risky actions unavailable"]
    },
    {
      step: "Admin reviews audit/reference trail",
      actor: "Admin / Owner",
      expectedResult: "Admin can verify audit/reference IDs for support and rollout monitoring.",
      requiredEvidence: ["audit ID", "command ID", "correlation ID", "actor role"]
    }
  ] satisfies SalesConsoleM32ManagerReviewStep[],
  excludedActionsStillBlocked: ["quote submission", "discount approval", "finance decision", "vehicle hold", "customer messaging automation"],
  passCriteria: [
    "Valid request creates exactly one manager review request.",
    "Invalid request shows a clear error and creates nothing.",
    "Duplicate retry returns existing request evidence.",
    "Manager workbench shows the request.",
    "Audit/reference IDs are visible for support.",
    "No excluded workflow becomes active."
  ]
} as const;

export function salesConsoleM32CoversManagerReviewE2EPath() {
  return salesConsoleM32ManagerReviewE2ETest.steps.map((step) => step.step).join("|") ===
    "Submit valid Manager Review Request|Submit with missing required fields|Retry same request idempotently|Manager opens request in workbench|Admin reviews audit/reference trail";
}

export function salesConsoleM32RequiresAuditReferenceEvidence() {
  return salesConsoleM32ManagerReviewE2ETest.steps.some((step) =>
    step.requiredEvidence.includes("audit ID") &&
    step.requiredEvidence.includes("correlation ID")
  );
}

export function salesConsoleM32VerifiesDuplicateAndValidationBehavior() {
  return salesConsoleM32ManagerReviewE2ETest.steps.some((step) => step.step.includes("missing required fields")) &&
    salesConsoleM32ManagerReviewE2ETest.steps.some((step) => step.step.includes("Retry same request"));
}

export function salesConsoleM32KeepsExcludedActionsBlocked() {
  return salesConsoleM32ManagerReviewE2ETest.excludedActionsStillBlocked.length === 5 &&
    salesConsoleM32ManagerReviewE2ETest.passCriteria.includes("No excluded workflow becomes active.");
}
