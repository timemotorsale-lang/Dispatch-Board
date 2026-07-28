import { salesConsoleAuditReadModel } from "./sales-console-m9-audit-trails";
import { salesConsoleEnterprisePermissionReadModel, type SalesConsoleEnterpriseRole } from "./sales-console-m9-enterprise-permissions";

export type SalesConsoleFinanceHandoffField =
  | "buyerStatus"
  | "coBuyerStatus"
  | "creditAppStatus"
  | "customerId"
  | "dealId"
  | "documentChecklist"
  | "financeQueueStatus"
  | "privacyClassification"
  | "selectedScenarioId"
  | "tradePayoffStatus";

export type SalesConsoleFinanceVisibilityRule = {
  field: SalesConsoleFinanceHandoffField;
  restricted: boolean;
  visibleTo: SalesConsoleEnterpriseRole[];
};

export type SalesConsoleFinanceHandoffPackage = {
  decisionEnabled: false;
  enabled: false;
  financeReviewOnly: true;
  handoffId: string;
  requiredFields: SalesConsoleFinanceHandoffField[];
  status: "planned";
};

export type SalesConsoleFinanceHandoffReadModel = {
  guardrails: string[];
  packages: SalesConsoleFinanceHandoffPackage[];
  readOnly: true;
  visibilityRules: SalesConsoleFinanceVisibilityRule[];
};

export const salesConsoleFinanceHandoffReadModel = {
  guardrails: [
    "Finance handoff is package visibility only; finance decisions remain outside Sales Console.",
    "Salespeople can see limited handoff status, not restricted finance details.",
    "Finance role can review future handoff packages but cannot make final finance decisions here.",
    "Privacy classification, audit event, source record, and permission gate are required before activation."
  ],
  packages: [
    {
      decisionEnabled: false,
      enabled: false,
      financeReviewOnly: true,
      handoffId: "finance-handoff-placeholder-1001",
      requiredFields: ["dealId", "customerId", "selectedScenarioId", "creditAppStatus", "documentChecklist", "tradePayoffStatus", "privacyClassification", "financeQueueStatus"],
      status: "planned"
    }
  ],
  readOnly: true,
  visibilityRules: [
    { field: "dealId", restricted: false, visibleTo: ["salesperson", "sales-manager", "finance", "admin-owner"] },
    { field: "customerId", restricted: false, visibleTo: ["salesperson", "sales-manager", "finance", "admin-owner"] },
    { field: "selectedScenarioId", restricted: false, visibleTo: ["salesperson", "sales-manager", "finance", "admin-owner"] },
    { field: "financeQueueStatus", restricted: false, visibleTo: ["salesperson", "sales-manager", "finance", "admin-owner"] },
    { field: "creditAppStatus", restricted: true, visibleTo: ["finance", "sales-manager", "admin-owner"] },
    { field: "buyerStatus", restricted: true, visibleTo: ["finance", "admin-owner"] },
    { field: "coBuyerStatus", restricted: true, visibleTo: ["finance", "admin-owner"] },
    { field: "documentChecklist", restricted: true, visibleTo: ["finance", "sales-manager", "admin-owner"] },
    { field: "tradePayoffStatus", restricted: true, visibleTo: ["finance", "sales-manager", "admin-owner"] },
    { field: "privacyClassification", restricted: true, visibleTo: ["finance", "admin-owner"] }
  ]
} as const satisfies SalesConsoleFinanceHandoffReadModel;

export function financeHandoffRemainsReadOnly(readModel = salesConsoleFinanceHandoffReadModel) {
  return readModel.readOnly === true &&
    readModel.packages.every((item) => item.enabled === false && item.decisionEnabled === false && item.financeReviewOnly === true);
}

export function salespersonCannotSeeRestrictedFinanceFields(readModel = salesConsoleFinanceHandoffReadModel) {
  return readModel.visibilityRules
    .filter((rule) => rule.restricted)
    .every((rule) => !(rule.visibleTo as readonly SalesConsoleEnterpriseRole[]).includes("salesperson"));
}

export function financeHandoffHasAuditAndPermissionCoverage() {
  const auditCovered = salesConsoleAuditReadModel.futureActionCoverage.some((coverage) => coverage.action === "Finance decisions" && coverage.enabled === false);
  const permissionCovered = salesConsoleEnterprisePermissionReadModel.gates.some((gate) => gate.capability === "finance-handoff-review" && gate.enabled === false);

  return auditCovered && permissionCovered;
}
