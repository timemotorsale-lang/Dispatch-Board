import type { SalesConsoleRevenueLaneName } from "./sales-console-operational-domain";
import {
  evaluateSalesCompletionReadiness,
  salesCompletionGovernedActions,
  type SalesCompletionRequirementCode
} from "./sales-console-m66-revenue-lane-completion-rules";
import {
  createInMemorySalesConsoleRecordRepository,
  persistSalesConsoleRecord,
  type SalesConsoleRecordRepository
} from "./sales-console-m67-persistent-sales-record-service";
import type {
  RecordCompletedSale,
  SalesConsoleAuditMetadata
} from "./sales-console-m50-record-command-contract";

export type SalesRecordWorkflowRole = "Salesperson" | "BDC / Lead Coordinator" | "Sales Manager" | "Admin / Owner";

export type SalesRecordWorkflowDraft = {
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
  satisfied: SalesCompletionRequirementCode[];
  evidenceIds: string[];
  sourceRecordLinks: string[];
  blockerSeverity: "none" | "watch" | "risk" | "blocked";
  managerReviewResolved: boolean;
};

export type SalesRecordWorkflowState = {
  title: string;
  readinessScore: number;
  submitEnabled: boolean;
  submitLabel: string;
  reason: string;
  missingLabels: string[];
  sourceVerificationRequired: boolean;
  managerReviewRequired: boolean;
  governedActions: string[];
  roleCanRecord: boolean;
};

export const salesConsoleSampleRecordSaleDraft: SalesRecordWorkflowDraft = {
  salesOpportunityId: "SO-M68-1001",
  revenueOpportunityId: "REV-M68-1001",
  customerId: "CUST-JOHN-SMITH",
  customerName: "John Smith",
  revenueLane: "Inventory Cash Sale",
  saleDate: "2026-07-30",
  salespersonId: "USER-1",
  managerId: "MGR-1",
  productLabel: "2022 Toyota RAV4 XLE",
  vehicleStockNumber: "TMS22145",
  grossEstimateCents: 285000,
  paymentPath: "cash",
  satisfied: [
    "customer-linked",
    "revenue-lane-selected",
    "source-links-present",
    "salesperson-linked",
    "sale-date-present",
    "source-verification-ready",
    "vehicle-linked",
    "inventory-verified",
    "gross-estimate-present",
    "cash-payment-path-labeled"
  ],
  evidenceIds: [],
  sourceRecordLinks: ["/customers/customer-360?customerId=CUST-JOHN-SMITH", "/vehicles/360/TMS22145"],
  blockerSeverity: "watch",
  managerReviewResolved: true
};

export function buildSalesRecordWorkflowState(
  draft: SalesRecordWorkflowDraft,
  role: SalesRecordWorkflowRole
): SalesRecordWorkflowState {
  const decision = evaluateSalesCompletionReadiness({
    lane: draft.revenueLane,
    satisfied: draft.satisfied,
    blockerSeverity: draft.blockerSeverity,
    evidenceIds: draft.evidenceIds,
    sourceLinks: draft.sourceRecordLinks,
    managerReviewResolved: draft.managerReviewResolved
  });
  const roleCanRecord = role === "Salesperson" || role === "Sales Manager" || role === "Admin / Owner";
  const submitEnabled = roleCanRecord && decision.canRecordCompletedSale;
  const missingLabels = decision.missingRequirements.map((requirement) => requirement.label);

  return {
    title: `${draft.customerName} · ${draft.revenueLane}`,
    readinessScore: decision.readinessScore,
    submitEnabled,
    submitLabel: submitEnabled ? "Record completed sale internally" : "Complete requirements before recording",
    reason: !roleCanRecord
      ? "This role can prepare the record, but cannot complete the internal sale record."
      : submitEnabled
        ? "All completion requirements are satisfied; source systems remain owners."
        : missingLabels.length
          ? `Missing ${missingLabels.length} completion requirement${missingLabels.length === 1 ? "" : "s"}.`
          : "Evidence, source verification, or manager review is still required.",
    missingLabels,
    sourceVerificationRequired: decision.sourceVerificationRequired,
    managerReviewRequired: decision.managerReviewRequired,
    governedActions: [...salesCompletionGovernedActions],
    roleCanRecord
  };
}

export function submitSalesRecordWorkflow(
  draft: SalesRecordWorkflowDraft,
  audit: SalesConsoleAuditMetadata,
  role: SalesRecordWorkflowRole,
  repository: SalesConsoleRecordRepository = createInMemorySalesConsoleRecordRepository()
) {
  const state = buildSalesRecordWorkflowState(draft, role);
  if (!state.roleCanRecord) {
    return { ok: false as const, status: "auth-error" as const, reason: state.reason };
  }

  if (!state.submitEnabled) {
    return { ok: false as const, status: "validation-error" as const, reason: state.reason, missingLabels: state.missingLabels };
  }

  const command: RecordCompletedSale & { name: "RecordCompletedSale" } = {
    name: "RecordCompletedSale",
    writesTo: "Sales Console Internal",
    mutatesSourceSystem: false,
    audit,
    payload: {
      salesOpportunityId: draft.salesOpportunityId,
      revenueOpportunityId: draft.revenueOpportunityId,
      customerId: draft.customerId,
      customerName: draft.customerName,
      revenueLane: draft.revenueLane,
      saleDate: draft.saleDate,
      salespersonId: draft.salespersonId,
      managerId: draft.managerId,
      productLabel: draft.productLabel,
      vehicleStockNumber: draft.vehicleStockNumber,
      grossEstimateCents: draft.grossEstimateCents,
      paymentPath: draft.paymentPath,
      lifecycleState: "sale-recorded",
      sourceRecordLinks: draft.sourceRecordLinks,
      evidenceIds: draft.evidenceIds,
      reconciliationStatus: "pending"
    }
  };

  const result = persistSalesConsoleRecord(command, repository);
  if (result.ok && result.status === "duplicate") {
    return { ok: true as const, status: "duplicate" as const, recordId: result.recordId };
  }
  if (result.ok) {
    return { ok: true as const, status: "success" as const, recordId: result.recordId };
  }

  return { ok: false as const, status: "idempotency-conflict" as const, reason: result.reason };
}
