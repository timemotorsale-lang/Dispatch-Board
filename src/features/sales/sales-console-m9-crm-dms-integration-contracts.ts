import { salesConsoleAuditReadModel } from "./sales-console-m9-audit-trails";
import { salesConsoleEnterprisePermissionReadModel } from "./sales-console-m9-enterprise-permissions";
import type { SalesConsoleLiveSourceStatus } from "./sales-console-mvp-live-data-contract";

export type SalesConsoleEnterpriseSourceSystem =
  | "Appointment System"
  | "Audit Store"
  | "CRM"
  | "DMS"
  | "Finance System"
  | "Inventory System"
  | "Lead Source"
  | "Task System";

export type SalesConsoleEnterpriseRecordType =
  | "appointment"
  | "audit"
  | "customer"
  | "deal"
  | "finance"
  | "inventory"
  | "lead"
  | "task";

export type SalesConsoleEnterpriseSourceContract = {
  fallbackLabel: string;
  freshnessRule: string;
  mode: "read-only";
  owner: SalesConsoleEnterpriseSourceSystem;
  recordType: SalesConsoleEnterpriseRecordType;
  requiredIds: string[];
  sourceLinkPattern: string;
  status: SalesConsoleLiveSourceStatus;
  systemOfRecord: true;
};

export type SalesConsoleEnterpriseIntegrationReadModel = {
  contracts: SalesConsoleEnterpriseSourceContract[];
  guardrails: string[];
  readOnly: true;
};

export const salesConsoleEnterpriseIntegrationReadModel = {
  contracts: [
    {
      fallbackLabel: "Customer source unavailable; verify in CRM before action.",
      freshnessRule: "Customer context must show current/stale/placeholder before use.",
      mode: "read-only",
      owner: "CRM",
      recordType: "customer",
      requiredIds: ["customerId", "crmCustomerId"],
      sourceLinkPattern: "/customers/customer-360?customerId=:customerId",
      status: "contract-ready",
      systemOfRecord: true
    },
    {
      fallbackLabel: "Lead source unavailable; verify assignment and SLA in lead source.",
      freshnessRule: "Lead age and assignment state must be current or stale-labeled.",
      mode: "read-only",
      owner: "Lead Source",
      recordType: "lead",
      requiredIds: ["leadId", "customerId"],
      sourceLinkPattern: "/leads/:leadId",
      status: "needs-mapping",
      systemOfRecord: true
    },
    {
      fallbackLabel: "Deal source unavailable; no approval, quote, or stage action can run.",
      freshnessRule: "Deal desk rows must show current/placeholder and blocker labels.",
      mode: "read-only",
      owner: "DMS",
      recordType: "deal",
      requiredIds: ["dealId", "customerId"],
      sourceLinkPattern: "/deals/:dealId",
      status: "needs-mapping",
      systemOfRecord: true
    },
    {
      fallbackLabel: "Inventory source unavailable; verify-first before presentation.",
      freshnessRule: "Vehicle records must show availability, readiness, and verify-first labels.",
      mode: "read-only",
      owner: "Inventory System",
      recordType: "inventory",
      requiredIds: ["vehicleId", "stockNumber"],
      sourceLinkPattern: "/vehicles/360/:vehicleId",
      status: "contract-ready",
      systemOfRecord: true
    },
    {
      fallbackLabel: "Finance source unavailable; finance decisions remain outside Sales Console.",
      freshnessRule: "Finance status must be privacy-scoped and fallback-labeled.",
      mode: "read-only",
      owner: "Finance System",
      recordType: "finance",
      requiredIds: ["dealId", "financeStatusId"],
      sourceLinkPattern: "/finance/:financeStatusId",
      status: "placeholder-only",
      systemOfRecord: true
    },
    {
      fallbackLabel: "Task source unavailable; seller queue shows source fallback.",
      freshnessRule: "Tasks must show current/stale/placeholder and due labels.",
      mode: "read-only",
      owner: "Task System",
      recordType: "task",
      requiredIds: ["taskId", "customerId"],
      sourceLinkPattern: "/tasks/:taskId",
      status: "contract-ready",
      systemOfRecord: true
    },
    {
      fallbackLabel: "Appointment source unavailable; verify visit timing in appointment system.",
      freshnessRule: "Appointment context must show start timing or placeholder.",
      mode: "read-only",
      owner: "Appointment System",
      recordType: "appointment",
      requiredIds: ["appointmentId", "customerId"],
      sourceLinkPattern: "/appointments/:appointmentId",
      status: "placeholder-only",
      systemOfRecord: true
    },
    {
      fallbackLabel: "Audit source unavailable; enterprise write workflows cannot activate.",
      freshnessRule: "Audit records must be immutable, actor-linked, and timestamped.",
      mode: "read-only",
      owner: "Audit Store",
      recordType: "audit",
      requiredIds: ["auditId", "sourceRecordId", "actorUserId"],
      sourceLinkPattern: "/sales#audit-trail-foundation",
      status: "needs-mapping",
      systemOfRecord: true
    }
  ],
  guardrails: [
    "Every enterprise record must declare a source owner and source link pattern.",
    "Every source contract stays read-only until an explicitly approved write branch changes it.",
    "Missing source records must show fallback labels instead of enabling actions.",
    "CRM, DMS, finance, inventory, lead, appointment, task, and audit stores remain systems of record."
  ],
  readOnly: true
} as const satisfies SalesConsoleEnterpriseIntegrationReadModel;

export function enterpriseSourcesRemainSystemsOfRecord(readModel = salesConsoleEnterpriseIntegrationReadModel) {
  return readModel.contracts.every((contract) => contract.systemOfRecord === true && contract.mode === "read-only");
}

export function enterpriseSourceContractsCoverRequiredRecords(readModel = salesConsoleEnterpriseIntegrationReadModel) {
  const requiredTypes: SalesConsoleEnterpriseRecordType[] = ["appointment", "audit", "customer", "deal", "finance", "inventory", "lead", "task"];

  return requiredTypes.every((recordType) => readModel.contracts.some((contract) => contract.recordType === recordType));
}

export function enterpriseSourceContractsBlockWritesWhenMissing(readModel = salesConsoleEnterpriseIntegrationReadModel) {
  const hasAuditStore = readModel.contracts.some((contract) => contract.recordType === "audit");
  const hasPermissionGates = salesConsoleEnterprisePermissionReadModel.gates.every((gate) => gate.enabled === false);
  const hasAuditCoverage = salesConsoleAuditReadModel.futureActionCoverage.every((coverage) => coverage.enabled === false);

  return hasAuditStore && hasPermissionGates && hasAuditCoverage;
}

export function enterpriseSourceContractsHaveHonestLabels(readModel = salesConsoleEnterpriseIntegrationReadModel) {
  return readModel.contracts.every((contract) =>
    contract.fallbackLabel.length > 0 &&
    contract.freshnessRule.length > 0 &&
    contract.sourceLinkPattern.length > 0 &&
    contract.requiredIds.length > 0
  );
}
