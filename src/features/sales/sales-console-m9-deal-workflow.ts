import { salesConsoleAuditReadModel } from "./sales-console-m9-audit-trails";
import { salesConsoleEnterprisePermissionReadModel, type SalesConsoleEnterpriseRole } from "./sales-console-m9-enterprise-permissions";

export type SalesConsoleEnterpriseDealStage =
  | "lead-qualified"
  | "vehicle-selected"
  | "structure-review"
  | "manager-review-requested"
  | "finance-handoff-pending"
  | "source-system-close";

export type SalesConsoleDealWorkflowTransition = {
  auditRequired: true;
  enabled: false;
  from: SalesConsoleEnterpriseDealStage;
  label: string;
  requiredRole: SalesConsoleEnterpriseRole;
  sourceWrite: false;
  to: SalesConsoleEnterpriseDealStage;
};

export type SalesConsoleManagerReviewPlaceholder = {
  auditEventType: "deal-stage-review-requested";
  dealId: string;
  enabled: false;
  managerAction: "review-only";
  reasonRequired: true;
  sourceRecordRequired: true;
  status: "planned";
};

export type SalesConsoleDealWorkflowReadModel = {
  guardrails: string[];
  managerReviewPlaceholders: SalesConsoleManagerReviewPlaceholder[];
  readOnly: true;
  stages: SalesConsoleEnterpriseDealStage[];
  transitions: SalesConsoleDealWorkflowTransition[];
};

export const salesConsoleDealWorkflowReadModel = {
  guardrails: [
    "Deal workflow is stage-contract only; no CRM/DMS deal record is mutated.",
    "Salespeople can request manager review but cannot approve discounts or finance outcomes.",
    "Every future transition requires source record, role gate, reason, and audit event.",
    "Source-system close remains outside the Sales Console."
  ],
  managerReviewPlaceholders: [
    {
      auditEventType: "deal-stage-review-requested",
      dealId: "D-12457",
      enabled: false,
      managerAction: "review-only",
      reasonRequired: true,
      sourceRecordRequired: true,
      status: "planned"
    }
  ],
  readOnly: true,
  stages: [
    "lead-qualified",
    "vehicle-selected",
    "structure-review",
    "manager-review-requested",
    "finance-handoff-pending",
    "source-system-close"
  ],
  transitions: [
    {
      auditRequired: true,
      enabled: false,
      from: "lead-qualified",
      label: "Request vehicle selection review",
      requiredRole: "salesperson",
      sourceWrite: false,
      to: "vehicle-selected"
    },
    {
      auditRequired: true,
      enabled: false,
      from: "vehicle-selected",
      label: "Request structure review",
      requiredRole: "salesperson",
      sourceWrite: false,
      to: "structure-review"
    },
    {
      auditRequired: true,
      enabled: false,
      from: "structure-review",
      label: "Send to manager review queue",
      requiredRole: "salesperson",
      sourceWrite: false,
      to: "manager-review-requested"
    },
    {
      auditRequired: true,
      enabled: false,
      from: "manager-review-requested",
      label: "Mark finance handoff pending",
      requiredRole: "sales-manager",
      sourceWrite: false,
      to: "finance-handoff-pending"
    },
    {
      auditRequired: true,
      enabled: false,
      from: "finance-handoff-pending",
      label: "Confirm source-system close visibility",
      requiredRole: "finance",
      sourceWrite: false,
      to: "source-system-close"
    }
  ]
} as const satisfies SalesConsoleDealWorkflowReadModel;

export function dealWorkflowIsReadOnly(readModel = salesConsoleDealWorkflowReadModel) {
  return readModel.readOnly === true &&
    readModel.transitions.every((transition) => transition.enabled === false && transition.sourceWrite === false);
}

export function dealWorkflowRequiresAuditAndPermission(readModel = salesConsoleDealWorkflowReadModel) {
  const hasDealReviewAudit = salesConsoleAuditReadModel.futureActionCoverage.some((coverage) =>
    coverage.auditEventType === "approval-requested"
  );
  const hasDealPermissionGate = salesConsoleEnterprisePermissionReadModel.gates.some((gate) =>
    gate.capability === "deal-stage-review" && gate.enabled === false
  );

  return hasDealReviewAudit && hasDealPermissionGate && readModel.transitions.every((transition) => transition.auditRequired);
}

export function salespersonCannotApproveOrFinance(readModel = salesConsoleDealWorkflowReadModel) {
  const restrictedStages: SalesConsoleEnterpriseDealStage[] = ["finance-handoff-pending", "source-system-close"];

  return readModel.transitions.every((transition) =>
    transition.requiredRole !== "salesperson" || !restrictedStages.includes(transition.to)
  );
}
