import type { SalesConsoleRevenueLaneName, SalesConsoleStaffRole } from "./sales-console-operational-domain";

export type SalesConsoleRecordStatus = "draft" | "open" | "blocked" | "resolved" | "closed" | "voided";

export const salesConsoleRecordTypes = [
  "SalesOpportunity",
  "RevenueOpportunity",
  "CompletedSaleRecord",
  "SalesActivity",
  "SalesNote",
  "SalesPromise",
  "SalesEvidence",
  "SalesOutcome",
  "RevenueLaneChecklist",
  "SourceReconciliationRecord"
] as const;

export type SalesConsoleRecordType = (typeof salesConsoleRecordTypes)[number];

export const salesConsoleLifecycleStates = [
  "opportunity-open",
  "active-deal",
  "manager-review",
  "ready-to-close",
  "sale-recorded",
  "source-reconciliation-pending",
  "source-verified",
  "completed",
  "lost",
  "duplicate",
  "delayed",
  "voided",
  "correction-needed"
] as const;

export type SalesConsoleLifecycleState = (typeof salesConsoleLifecycleStates)[number];

export const salesConsoleRecordOwners = [
  "Sales Console Internal",
  "CRM / Customers",
  "Inventory / Vehicles",
  "DMS",
  "Finance",
  "Rental",
  "Service / Repair",
  "Warranty"
] as const;

export type SalesConsoleRecordOwner = (typeof salesConsoleRecordOwners)[number];

export type SalesConsoleAuditMetadata = {
  actorId: string;
  actorRole: SalesConsoleStaffRole;
  storeId: string;
  occurredAt: string;
  commandId: string;
  correlationId: string;
  idempotencyKey: string;
  sourceLink: string;
};

export type SalesOpportunity = {
  id: string;
  customerId: string;
  ownerId: string;
  status: SalesConsoleRecordStatus;
  stage: string;
  sourceSystem: "CRM / Customers" | "Sales Console Internal";
  sourceRecordId: string;
  createdAudit: SalesConsoleAuditMetadata;
};

export type RevenueOpportunity = {
  id: string;
  salesOpportunityId: string;
  lane: SalesConsoleRevenueLaneName;
  status: SalesConsoleRecordStatus;
  stage: string;
  sourceRecordIds: string[];
  blockerCodes: string[];
  createdAudit: SalesConsoleAuditMetadata;
};

export type SalesActivityKind =
  | "call-outcome"
  | "walk-in-outcome"
  | "appointment-outcome"
  | "vehicle-shown"
  | "document-requested"
  | "document-received"
  | "manager-help-requested";

export type SalesActivity = {
  id: string;
  opportunityId: string;
  kind: SalesActivityKind;
  summary: string;
  outcome?: string;
  nextActionId?: string;
  audit: SalesConsoleAuditMetadata;
};

export type SalesNote = {
  id: string;
  opportunityId: string;
  body: string;
  visibility: "sales-team" | "manager-only" | "admin-only";
  audit: SalesConsoleAuditMetadata;
};

export type SalesPromise = {
  id: string;
  opportunityId: string;
  promiseType: "customer-callback" | "document" | "manager-review" | "appointment" | "source-system-follow-up";
  dueAt: string;
  ownerId: string;
  status: "open" | "kept" | "missed" | "canceled";
  audit: SalesConsoleAuditMetadata;
};

export type SalesEvidenceStatus = "pending" | "received" | "verified" | "rejected";

export type SalesEvidence = {
  id: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  status: SalesEvidenceStatus;
  attachedSubjectType:
    | "customer"
    | "sales-opportunity"
    | "revenue-opportunity"
    | "revenue-lane-checklist"
    | "manager-review-request"
    | "delivery-readiness";
  attachedSubjectId: string;
  category: "identity" | "income" | "trade" | "vehicle" | "repair" | "rental" | "warranty" | "general";
  audit: SalesConsoleAuditMetadata;
};

export type RevenueLaneChecklist = {
  id: string;
  revenueOpportunityId: string;
  lane: SalesConsoleRevenueLaneName;
  requiredItems: Array<{
    code: string;
    label: string;
    status: "missing" | "received" | "verified" | "waived-by-manager";
    sourceOwner: string;
  }>;
  audit: SalesConsoleAuditMetadata;
};

export type SalesOutcomeKind = "won" | "lost" | "nurture" | "disqualified" | "duplicate" | "delayed";

export type SalesOutcome = {
  id: string;
  opportunityId: string;
  outcome: SalesOutcomeKind;
  reasonCode: string;
  terminal: boolean;
  nextAction?: string;
  evidenceIds: string[];
  audit: SalesConsoleAuditMetadata;
};

export type CompletedSaleRecord = {
  id: string;
  salesOpportunityId: string;
  revenueOpportunityId: string;
  customerId: string;
  customerName: string;
  revenueLane: SalesConsoleRevenueLaneName;
  saleDate: string;
  salespersonId: string;
  managerId?: string;
  productLabel: string;
  vehicleStockNumber?: string;
  grossEstimateCents: number;
  paymentPath: "cash" | "bhph" | "lease-to-own" | "finance" | "rental" | "repair" | "warranty" | "unknown";
  lifecycleState: SalesConsoleLifecycleState;
  sourceRecordLinks: string[];
  evidenceIds: string[];
  reconciliationStatus: SourceReconciliationStatus;
  audit: SalesConsoleAuditMetadata;
};

export type SourceReconciliationStatus =
  | "pending"
  | "source-verified"
  | "source-mismatch"
  | "needs-manager-review"
  | "needs-source-owner-correction"
  | "completed"
  | "voided";

export type SourceReconciliationRecord = {
  id: string;
  completedSaleRecordId: string;
  status: SourceReconciliationStatus;
  sourceOwners: SalesConsoleRecordOwner[];
  sourceRecordLinks: string[];
  mismatchCodes: string[];
  routingLabel: string;
  sourceCorrectionWriteEnabled: false;
  audit: SalesConsoleAuditMetadata;
};

export type SalesConsoleCommandName =
  | "CreateSalesOpportunity"
  | "CreateRevenueOpportunity"
  | "LogSalesActivity"
  | "AddSalesNote"
  | "SetNextAction"
  | "AddSalesPromise"
  | "AttachSalesEvidence"
  | "RequestManagerReview"
  | "RecordSalesOutcome"
  | "RecordCompletedSale"
  | "CreateSourceReconciliationRecord";

export type SalesConsoleCommandContract<TPayload> = {
  name: SalesConsoleCommandName;
  payload: TPayload;
  audit: SalesConsoleAuditMetadata;
  writesTo: "Sales Console Internal";
  mutatesSourceSystem: false;
};

export type CreateSalesOpportunity = SalesConsoleCommandContract<
  Pick<SalesOpportunity, "customerId" | "ownerId" | "stage" | "sourceSystem" | "sourceRecordId">
>;
export type CreateRevenueOpportunity = SalesConsoleCommandContract<
  Pick<RevenueOpportunity, "salesOpportunityId" | "lane" | "stage" | "sourceRecordIds" | "blockerCodes">
>;
export type LogSalesActivity = SalesConsoleCommandContract<Omit<SalesActivity, "id" | "audit">>;
export type AddSalesNote = SalesConsoleCommandContract<Omit<SalesNote, "id" | "audit">>;
export type SetNextAction = SalesConsoleCommandContract<{ opportunityId: string; nextAction: string; dueAt: string; ownerId: string }>;
export type AddSalesPromise = SalesConsoleCommandContract<Omit<SalesPromise, "id" | "audit">>;
export type AttachSalesEvidence = SalesConsoleCommandContract<Omit<SalesEvidence, "id" | "audit">>;
export type RequestManagerReview = SalesConsoleCommandContract<{ opportunityId: string; reason: string; requestedManagerId?: string }>;
export type RecordSalesOutcome = SalesConsoleCommandContract<Omit<SalesOutcome, "id" | "audit">>;
export type RecordCompletedSale = SalesConsoleCommandContract<Omit<CompletedSaleRecord, "id" | "audit">>;
export type CreateSourceReconciliationRecord = SalesConsoleCommandContract<Omit<SourceReconciliationRecord, "id" | "audit">>;

export const salesConsoleCommandNames: SalesConsoleCommandName[] = [
  "CreateSalesOpportunity",
  "CreateRevenueOpportunity",
  "LogSalesActivity",
  "AddSalesNote",
  "SetNextAction",
  "AddSalesPromise",
  "AttachSalesEvidence",
  "RequestManagerReview",
  "RecordSalesOutcome",
  "RecordCompletedSale",
  "CreateSourceReconciliationRecord"
];

export const prohibitedSalesConsoleCommandNames = [
  "SubmitQuote",
  "ApproveDiscount",
  "DecideFinance",
  "HoldVehicle",
  "ReserveVehicle",
  "SendCustomerMessage",
  "ExecuteContract"
] as const;

export function hasRequiredAuditMetadata(audit: Partial<SalesConsoleAuditMetadata>) {
  return Boolean(
    audit.actorId &&
      audit.actorRole &&
      audit.storeId &&
      audit.occurredAt &&
      audit.commandId &&
      audit.correlationId &&
      audit.idempotencyKey &&
      audit.sourceLink
  );
}

export function isApprovedSalesConsoleCommand(commandName: string): commandName is SalesConsoleCommandName {
  return salesConsoleCommandNames.includes(commandName as SalesConsoleCommandName);
}

export function commandMutatesOnlySalesConsoleInternal<TPayload>(command: SalesConsoleCommandContract<TPayload>) {
  return command.writesTo === "Sales Console Internal" && command.mutatesSourceSystem === false;
}

export function salesConsoleRecordDomainCoversEnterpriseRecords() {
  const required: SalesConsoleRecordType[] = [
    "SalesOpportunity",
    "RevenueOpportunity",
    "CompletedSaleRecord",
    "SalesActivity",
    "SalesNote",
    "SalesPromise",
    "SalesEvidence",
    "SalesOutcome",
    "RevenueLaneChecklist",
    "SourceReconciliationRecord"
  ];

  return required.every((recordType) => salesConsoleRecordTypes.includes(recordType));
}

export function salesConsoleLifecycleCoversRecordExecution() {
  const required: SalesConsoleLifecycleState[] = [
    "opportunity-open",
    "active-deal",
    "manager-review",
    "ready-to-close",
    "sale-recorded",
    "source-reconciliation-pending",
    "source-verified",
    "completed",
    "lost",
    "duplicate",
    "delayed",
    "voided",
    "correction-needed"
  ];

  return required.every((state) => salesConsoleLifecycleStates.includes(state));
}

export function salesConsoleSourceSystemsRemainOwners() {
  return salesConsoleRecordOwners.includes("Sales Console Internal") && salesConsoleRecordOwners.length > 1;
}
