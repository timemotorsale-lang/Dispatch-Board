import { salesConsoleAuditReadModel } from "./sales-console-m9-audit-trails";
import { salesConsoleEnterprisePermissionReadModel } from "./sales-console-m9-enterprise-permissions";

export type SalesConsoleScenarioInput =
  | "aprEstimate"
  | "customerId"
  | "dealId"
  | "downPayment"
  | "fees"
  | "payoff"
  | "taxes"
  | "termMonths"
  | "tradeEstimate"
  | "vehiclePrice";

export type SalesConsoleScenarioEstimate = {
  disclaimerRequired: true;
  enabled: false;
  estimateOnly: true;
  financeVerificationRequired: true;
  managerReviewRequired: true;
  requiredInputs: SalesConsoleScenarioInput[];
  scenarioId: string;
  version: string;
};

export type SalesConsoleQuoteScenarioReadModel = {
  guardrails: string[];
  readOnly: true;
  scenarios: SalesConsoleScenarioEstimate[];
  submissionEnabled: false;
};

export const salesConsoleQuoteScenarioReadModel = {
  guardrails: [
    "Scenario builder is estimate-only and cannot submit final customer-binding quotes.",
    "Every scenario requires disclaimer, manager review, finance verification, source record, and audit event.",
    "Payment calculations are placeholders until tax, fee, lender, trade, and payoff rules are approved.",
    "Final quote submission remains disabled until a separately approved production write branch."
  ],
  readOnly: true,
  scenarios: [
    {
      disclaimerRequired: true,
      enabled: false,
      estimateOnly: true,
      financeVerificationRequired: true,
      managerReviewRequired: true,
      requiredInputs: ["customerId", "dealId", "vehiclePrice", "taxes", "fees", "downPayment", "tradeEstimate", "payoff", "termMonths", "aprEstimate"],
      scenarioId: "scenario-placeholder-1001",
      version: "estimate-v1"
    }
  ],
  submissionEnabled: false
} as const satisfies SalesConsoleQuoteScenarioReadModel;

export function quoteScenarioBuilderIsEstimateOnly(readModel = salesConsoleQuoteScenarioReadModel) {
  return readModel.submissionEnabled === false &&
    readModel.scenarios.every((scenario) =>
      scenario.enabled === false &&
      scenario.estimateOnly === true &&
      scenario.disclaimerRequired === true
    );
}

export function quoteScenarioRequiresReviewAndFinanceVerification(readModel = salesConsoleQuoteScenarioReadModel) {
  return readModel.scenarios.every((scenario) =>
    scenario.managerReviewRequired === true &&
    scenario.financeVerificationRequired === true &&
    scenario.requiredInputs.includes("taxes") &&
    scenario.requiredInputs.includes("fees") &&
    scenario.requiredInputs.includes("tradeEstimate") &&
    scenario.requiredInputs.includes("payoff")
  );
}

export function quoteScenarioHasAuditAndPermissionCoverage() {
  const auditCovered = salesConsoleAuditReadModel.futureActionCoverage.some((coverage) => coverage.action === "Quote submission" && coverage.enabled === false);
  const permissionCovered = salesConsoleEnterprisePermissionReadModel.gates.some((gate) => gate.capability === "quote-scenario-draft" && gate.enabled === false);

  return auditCovered && permissionCovered;
}
