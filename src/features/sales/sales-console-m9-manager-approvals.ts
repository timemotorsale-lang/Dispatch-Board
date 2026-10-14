import { salesConsoleAuditReadModel } from "./sales-console-m9-audit-trails";
import { salesConsoleEnterprisePermissionReadModel, type SalesConsoleEnterpriseRole } from "./sales-console-m9-enterprise-permissions";

export type SalesConsoleApprovalType = "discount" | "payment-terms" | "trade-allowance" | "vehicle-exception";

export type SalesConsoleApprovalRequestContract = {
  approvalType: SalesConsoleApprovalType;
  auditRequired: true;
  enabled: false;
  managerDecisionEnabled: false;
  reasonRequired: true;
  requestRole: Extract<SalesConsoleEnterpriseRole, "salesperson" | "sales-manager">;
  requiredFields: string[];
  thresholdRequired: true;
};

export type SalesConsoleApprovalDecisionGate = {
  allowedDecisionRoles: Array<Extract<SalesConsoleEnterpriseRole, "admin-owner" | "sales-manager">>;
  approvalType: SalesConsoleApprovalType;
  auditEventType: "approval-requested";
  decisionEnabled: false;
  denyByDefault: true;
};

export type SalesConsoleManagerApprovalReadModel = {
  decisionGates: SalesConsoleApprovalDecisionGate[];
  guardrails: string[];
  readOnly: true;
  requestContracts: SalesConsoleApprovalRequestContract[];
};

export const salesConsoleManagerApprovalReadModel = {
  decisionGates: [
    { allowedDecisionRoles: ["sales-manager", "admin-owner"], approvalType: "discount", auditEventType: "approval-requested", decisionEnabled: false, denyByDefault: true },
    { allowedDecisionRoles: ["sales-manager", "admin-owner"], approvalType: "payment-terms", auditEventType: "approval-requested", decisionEnabled: false, denyByDefault: true },
    { allowedDecisionRoles: ["sales-manager", "admin-owner"], approvalType: "trade-allowance", auditEventType: "approval-requested", decisionEnabled: false, denyByDefault: true },
    { allowedDecisionRoles: ["sales-manager", "admin-owner"], approvalType: "vehicle-exception", auditEventType: "approval-requested", decisionEnabled: false, denyByDefault: true }
  ],
  guardrails: [
    "Salespeople can request manager review later, but cannot approve or deny.",
    "Every approval requires threshold, reason, role gate, source record, and audit event.",
    "Discount approval execution remains disabled until explicit approval.",
    "Finance decisions are not approval outcomes in the Sales Console."
  ],
  readOnly: true,
  requestContracts: [
    {
      approvalType: "discount",
      auditRequired: true,
      enabled: false,
      managerDecisionEnabled: false,
      reasonRequired: true,
      requestRole: "salesperson",
      requiredFields: ["dealId", "customerId", "requestedDiscount", "reason", "managerId"],
      thresholdRequired: true
    },
    {
      approvalType: "payment-terms",
      auditRequired: true,
      enabled: false,
      managerDecisionEnabled: false,
      reasonRequired: true,
      requestRole: "salesperson",
      requiredFields: ["dealId", "customerId", "scenarioId", "reason", "managerId"],
      thresholdRequired: true
    },
    {
      approvalType: "trade-allowance",
      auditRequired: true,
      enabled: false,
      managerDecisionEnabled: false,
      reasonRequired: true,
      requestRole: "sales-manager",
      requiredFields: ["dealId", "customerId", "tradeId", "allowance", "reason"],
      thresholdRequired: true
    },
    {
      approvalType: "vehicle-exception",
      auditRequired: true,
      enabled: false,
      managerDecisionEnabled: false,
      reasonRequired: true,
      requestRole: "sales-manager",
      requiredFields: ["dealId", "vehicleId", "stockNumber", "exceptionReason"],
      thresholdRequired: true
    }
  ]
} as const satisfies SalesConsoleManagerApprovalReadModel;

export function managerApprovalFoundationIsDisabled(readModel = salesConsoleManagerApprovalReadModel) {
  return readModel.requestContracts.every((contract) => contract.enabled === false && contract.managerDecisionEnabled === false) &&
    readModel.decisionGates.every((gate) => gate.decisionEnabled === false && gate.denyByDefault === true);
}

export function managerApprovalsRequireAuditThresholdAndReason(readModel = salesConsoleManagerApprovalReadModel) {
  const auditCoverageExists = salesConsoleAuditReadModel.futureActionCoverage.some((coverage) => coverage.action === "Discount approvals");
  const permissionGateExists = salesConsoleEnterprisePermissionReadModel.gates.some((gate) => gate.capability === "discount-approval-request");

  return auditCoverageExists && permissionGateExists && readModel.requestContracts.every((contract) =>
    contract.auditRequired && contract.thresholdRequired && contract.reasonRequired && contract.requiredFields.length > 0
  );
}

export function onlyManagersAndAdminsCanDecideApprovals(readModel = salesConsoleManagerApprovalReadModel) {
  return readModel.decisionGates.every((gate) =>
    gate.allowedDecisionRoles.every((role) => role === "sales-manager" || role === "admin-owner")
  );
}
