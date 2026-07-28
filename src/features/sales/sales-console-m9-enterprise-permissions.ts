import { salesConsoleAuditReadModel } from "./sales-console-m9-audit-trails";
import { salesConsoleMvpExecution, type SalesConsoleMvpRole } from "./sales-console-mvp-execution";

export type SalesConsoleEnterpriseRole = SalesConsoleMvpRole | "finance";

export type SalesConsoleEnterpriseCapability =
  | "audit-trail-review"
  | "customer-message-draft"
  | "deal-stage-review"
  | "discount-approval-request"
  | "finance-handoff-review"
  | "manager-approval-review"
  | "quote-scenario-draft"
  | "store-reporting-review"
  | "vehicle-hold-request";

export type SalesConsolePermissionScope = "all-stores" | "assigned-store" | "assigned-team" | "own-records";

export type SalesConsoleEnterprisePermissionGate = {
  allowedRoles: SalesConsoleEnterpriseRole[];
  auditRequired: true;
  capability: SalesConsoleEnterpriseCapability;
  defaultDecision: "deny";
  enabled: false;
  requiredScope: SalesConsolePermissionScope;
  sourceRecordRequired: true;
};

export type SalesConsoleEnterpriseRoleScope = {
  defaultScope: SalesConsolePermissionScope;
  label: string;
  ownershipPlaceholder: string;
  role: SalesConsoleEnterpriseRole;
  storePlaceholder: string;
  teamPlaceholder: string;
};

export type SalesConsoleEnterprisePermissionReadModel = {
  gates: SalesConsoleEnterprisePermissionGate[];
  guardrails: string[];
  readOnly: true;
  roleScopes: SalesConsoleEnterpriseRoleScope[];
};

export const salesConsoleEnterprisePermissionReadModel = {
  gates: [
    {
      allowedRoles: ["admin-owner", "sales-manager"],
      auditRequired: true,
      capability: "audit-trail-review",
      defaultDecision: "deny",
      enabled: false,
      requiredScope: "assigned-store",
      sourceRecordRequired: true
    },
    {
      allowedRoles: ["salesperson", "bdc-lead-coordinator"],
      auditRequired: true,
      capability: "customer-message-draft",
      defaultDecision: "deny",
      enabled: false,
      requiredScope: "own-records",
      sourceRecordRequired: true
    },
    {
      allowedRoles: ["salesperson", "sales-manager"],
      auditRequired: true,
      capability: "deal-stage-review",
      defaultDecision: "deny",
      enabled: false,
      requiredScope: "assigned-team",
      sourceRecordRequired: true
    },
    {
      allowedRoles: ["sales-manager", "admin-owner"],
      auditRequired: true,
      capability: "discount-approval-request",
      defaultDecision: "deny",
      enabled: false,
      requiredScope: "assigned-store",
      sourceRecordRequired: true
    },
    {
      allowedRoles: ["finance", "sales-manager", "admin-owner"],
      auditRequired: true,
      capability: "finance-handoff-review",
      defaultDecision: "deny",
      enabled: false,
      requiredScope: "assigned-store",
      sourceRecordRequired: true
    },
    {
      allowedRoles: ["sales-manager", "admin-owner"],
      auditRequired: true,
      capability: "manager-approval-review",
      defaultDecision: "deny",
      enabled: false,
      requiredScope: "assigned-team",
      sourceRecordRequired: true
    },
    {
      allowedRoles: ["salesperson", "sales-manager"],
      auditRequired: true,
      capability: "quote-scenario-draft",
      defaultDecision: "deny",
      enabled: false,
      requiredScope: "own-records",
      sourceRecordRequired: true
    },
    {
      allowedRoles: ["admin-owner", "sales-manager"],
      auditRequired: true,
      capability: "store-reporting-review",
      defaultDecision: "deny",
      enabled: false,
      requiredScope: "assigned-store",
      sourceRecordRequired: true
    },
    {
      allowedRoles: ["sales-manager", "admin-owner"],
      auditRequired: true,
      capability: "vehicle-hold-request",
      defaultDecision: "deny",
      enabled: false,
      requiredScope: "assigned-store",
      sourceRecordRequired: true
    }
  ],
  guardrails: [
    "Deny by default until auth, role, store, team, ownership, source record, and audit checks pass.",
    "Finance is modeled as a future role, but no finance decisions are allowed in the Sales Console.",
    "Salespeople remain scoped to own records until real ownership mapping is connected.",
    "Admin review panels are visible for readiness evidence, not daily selling actions."
  ],
  readOnly: true,
  roleScopes: [
    {
      defaultScope: "own-records",
      label: "Salesperson",
      ownershipPlaceholder: "Requires CRM/DMS salesperson ownership mapping.",
      role: "salesperson",
      storePlaceholder: "Assigned store pending auth mapping.",
      teamPlaceholder: "Assigned team pending manager relationship mapping."
    },
    {
      defaultScope: "assigned-team",
      label: "Sales Manager",
      ownershipPlaceholder: "Can review assigned team records after manager relationship mapping.",
      role: "sales-manager",
      storePlaceholder: "Assigned store pending auth mapping.",
      teamPlaceholder: "Manager team scope pending auth mapping."
    },
    {
      defaultScope: "own-records",
      label: "BDC / Lead Coordinator",
      ownershipPlaceholder: "Lead ownership and assignment queue mapping required.",
      role: "bdc-lead-coordinator",
      storePlaceholder: "Assigned store pending auth mapping.",
      teamPlaceholder: "Lead operations team scope pending mapping."
    },
    {
      defaultScope: "all-stores",
      label: "Admin / Owner",
      ownershipPlaceholder: "Can review all configured stores after production auth mapping.",
      role: "admin-owner",
      storePlaceholder: "All-store access mapping requires owner/admin auth claim.",
      teamPlaceholder: "All-team access mapping requires owner/admin auth claim."
    },
    {
      defaultScope: "assigned-store",
      label: "Finance",
      ownershipPlaceholder: "Future finance handoff visibility only; no finance decisions allowed in Sales Console.",
      role: "finance",
      storePlaceholder: "Finance store assignment pending auth mapping.",
      teamPlaceholder: "Finance queue scope pending finance-system mapping."
    }
  ]
} as const satisfies SalesConsoleEnterprisePermissionReadModel;

export function enterprisePermissionGatesDenyByDefault(readModel: SalesConsoleEnterprisePermissionReadModel = salesConsoleEnterprisePermissionReadModel) {
  return readModel.gates.every((gate) =>
    gate.defaultDecision === "deny" &&
    gate.enabled === false &&
    gate.auditRequired === true &&
    gate.sourceRecordRequired === true
  );
}

export function roleCanSeeEnterpriseCapability(
  role: SalesConsoleEnterpriseRole,
  capability: SalesConsoleEnterpriseCapability,
  readModel: SalesConsoleEnterprisePermissionReadModel = salesConsoleEnterprisePermissionReadModel
) {
  const gate = readModel.gates.find((item) => item.capability === capability);

  return Boolean(gate?.allowedRoles.includes(role));
}

export function sensitiveWorkflowsHavePermissionAndAuditCoverage(
  readModel: SalesConsoleEnterprisePermissionReadModel = salesConsoleEnterprisePermissionReadModel
) {
  return salesConsoleMvpExecution.readOnlyGuardrails.every((guardrail) => {
    const hasAuditCoverage = salesConsoleAuditReadModel.futureActionCoverage.some((coverage) => coverage.action === guardrail.action);
    const hasPermissionGate = readModel.gates.some((gate) => {
      if (guardrail.action === "Customer messaging automation") return gate.capability === "customer-message-draft";
      if (guardrail.action === "Quote submission") return gate.capability === "quote-scenario-draft";
      if (guardrail.action === "Vehicle holds or reservations") return gate.capability === "vehicle-hold-request";
      if (guardrail.action === "Finance decisions") return gate.capability === "finance-handoff-review";
      if (guardrail.action === "Discount approvals") return gate.capability === "discount-approval-request";
      return false;
    });

    return hasAuditCoverage && hasPermissionGate;
  });
}
