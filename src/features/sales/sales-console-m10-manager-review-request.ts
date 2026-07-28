import type { SalesConsoleEnterpriseRole } from "./sales-console-m9-enterprise-permissions";
import { salesConsoleManagerApprovalReadModel } from "./sales-console-m9-manager-approvals";

export type SalesConsoleM10ManagerReviewRequestType =
  | "finance-handoff-review"
  | "pricing-review"
  | "discount"
  | "vehicle-availability-review";

export type SalesConsoleM10ManagerReviewRequestContract = {
  allowedRequestRoles: readonly SalesConsoleEnterpriseRole[];
  allowedReviewRoles: readonly SalesConsoleEnterpriseRole[];
  auditEventRequired: true;
  customerSourceRecordRequired: true;
  decisionEnabled: false;
  dealSourceRecordRequired: true;
  evidenceRequired: readonly string[];
  reasonRequired: true;
  requestEnabled: false;
  requestType: SalesConsoleM10ManagerReviewRequestType;
  sourceWriteEnabled: false;
  statusLabel: "planned-disabled";
};

export type SalesConsoleM10ManagerReviewQueuePlaceholder = {
  blockerLabel: "blocked" | "placeholder" | "verify-first";
  customerLabel: string;
  dealLabel: string;
  managerReviewReason: string;
  requestContract: SalesConsoleM10ManagerReviewRequestType;
  reviewOwner: "sales-manager";
  sourceLinkLabel: string;
};

export const salesConsoleM10ManagerReviewRequestContracts = [
  {
    allowedRequestRoles: ["salesperson", "sales-manager"],
    allowedReviewRoles: ["sales-manager", "admin-owner"],
    auditEventRequired: true,
    customerSourceRecordRequired: true,
    dealSourceRecordRequired: true,
    decisionEnabled: false,
    evidenceRequired: ["deal id", "customer id", "current scenario", "requested exception", "business reason"],
    reasonRequired: true,
    requestEnabled: false,
    requestType: "discount",
    sourceWriteEnabled: false,
    statusLabel: "planned-disabled"
  },
  {
    allowedRequestRoles: ["salesperson", "sales-manager", "finance"],
    allowedReviewRoles: ["sales-manager", "admin-owner", "finance"],
    auditEventRequired: true,
    customerSourceRecordRequired: true,
    dealSourceRecordRequired: true,
    decisionEnabled: false,
    evidenceRequired: ["deal id", "customer id", "finance package status", "handoff blocker"],
    reasonRequired: true,
    requestEnabled: false,
    requestType: "finance-handoff-review",
    sourceWriteEnabled: false,
    statusLabel: "planned-disabled"
  },
  {
    allowedRequestRoles: ["salesperson", "sales-manager"],
    allowedReviewRoles: ["sales-manager", "admin-owner"],
    auditEventRequired: true,
    customerSourceRecordRequired: true,
    dealSourceRecordRequired: true,
    decisionEnabled: false,
    evidenceRequired: ["deal id", "stock number", "price source", "market context", "requested change"],
    reasonRequired: true,
    requestEnabled: false,
    requestType: "pricing-review",
    sourceWriteEnabled: false,
    statusLabel: "planned-disabled"
  },
  {
    allowedRequestRoles: ["salesperson", "sales-manager"],
    allowedReviewRoles: ["sales-manager", "admin-owner"],
    auditEventRequired: true,
    customerSourceRecordRequired: true,
    dealSourceRecordRequired: true,
    decisionEnabled: false,
    evidenceRequired: ["deal id", "customer id", "stock number", "vehicle freshness", "inventory blocker"],
    reasonRequired: true,
    requestEnabled: false,
    requestType: "vehicle-availability-review",
    sourceWriteEnabled: false,
    statusLabel: "planned-disabled"
  }
] as const satisfies readonly SalesConsoleM10ManagerReviewRequestContract[];

export const salesConsoleM10ManagerReviewQueuePlaceholders = [
  {
    blockerLabel: "verify-first",
    customerLabel: "CRM customer required",
    dealLabel: "Deal source required",
    managerReviewReason: "Pricing, discount, finance handoff, and vehicle availability reviews require source proof before activation.",
    requestContract: "pricing-review",
    reviewOwner: "sales-manager",
    sourceLinkLabel: "Source links must open CRM/DMS/Inventory before request activation."
  },
  {
    blockerLabel: "blocked",
    customerLabel: "Customer consent/source status required",
    dealLabel: "Finance package required",
    managerReviewReason: "Finance handoff reviews cannot become finance decisions inside the Sales Console.",
    requestContract: "finance-handoff-review",
    reviewOwner: "sales-manager",
    sourceLinkLabel: "Finance source remains system of record."
  },
  {
    blockerLabel: "placeholder",
    customerLabel: "Fallback customer label",
    dealLabel: "Fallback deal label",
    managerReviewReason: "Fallback records can show the need for review, but cannot submit requests.",
    requestContract: "discount",
    reviewOwner: "sales-manager",
    sourceLinkLabel: "Fallback labels block submission until source record IDs exist."
  }
] as const satisfies readonly SalesConsoleM10ManagerReviewQueuePlaceholder[];

export const salesConsoleM10ManagerReviewRequestFoundation = {
  boundary: "Manager review requests are modeled as disabled contracts only. No request submission, approval decision, discount approval, finance decision, vehicle hold, or source write is active.",
  contracts: salesConsoleM10ManagerReviewRequestContracts,
  guardrails: [
    "Request submission remains disabled until source records, audit events, and role scopes are production-approved.",
    "Manager review queues are visibility-only and cannot approve or mutate source records.",
    "Fallback or stale records can explain blockers but cannot become submitted requests.",
    "Finance handoff review does not permit finance decisions in the Sales Console."
  ],
  queuePlaceholders: salesConsoleM10ManagerReviewQueuePlaceholders
} as const;

export function m10ManagerReviewRequestsRemainDisabled() {
  return salesConsoleM10ManagerReviewRequestContracts.every((contract) =>
    contract.requestEnabled === false &&
    contract.decisionEnabled === false &&
    contract.sourceWriteEnabled === false
  );
}

export function m10ManagerReviewRequiresSourceRecordsAuditAndReason() {
  return salesConsoleM10ManagerReviewRequestContracts.every((contract) =>
    contract.customerSourceRecordRequired &&
    contract.dealSourceRecordRequired &&
    contract.auditEventRequired &&
    contract.reasonRequired &&
    contract.evidenceRequired.length >= 4
  );
}

export function m10ManagerReviewRolesAreScopedToManagersAndAdmins() {
  return salesConsoleM10ManagerReviewRequestContracts.every((contract) =>
    contract.allowedReviewRoles.includes("sales-manager") &&
    contract.allowedReviewRoles.includes("admin-owner")
  );
}

export function m10ManagerReviewExtendsM9ApprovalFoundation() {
  const m9ApprovalTypes = salesConsoleManagerApprovalReadModel.requestContracts.map((contract) => contract.approvalType);

  return m9ApprovalTypes.includes("discount") &&
    salesConsoleM10ManagerReviewRequestContracts.some((contract) => contract.requestType === "discount");
}

export function m10FallbackReviewPlaceholdersBlockSubmission() {
  return salesConsoleM10ManagerReviewQueuePlaceholders.every((placeholder) =>
    ["blocked", "placeholder", "verify-first"].includes(placeholder.blockerLabel) &&
    placeholder.sourceLinkLabel.length > 20
  );
}
