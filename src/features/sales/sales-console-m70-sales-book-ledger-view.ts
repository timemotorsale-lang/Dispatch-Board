import type { CompletedSaleRecord } from "./sales-console-m50-record-command-contract";
import { salesConsoleSampleCompletedSaleRecord } from "./sales-console-m69-post-sale-execution-workflow";
import type { SalesRecordWorkflowRole } from "./sales-console-m68-record-sale-ui-workflow";

export type SalesBookLedgerSummary = {
  role: SalesRecordWorkflowRole;
  visibleRecords: CompletedSaleRecord[];
  units: number;
  grossEstimateCents: number;
  todayUnits: number;
  monthToDateUnits: number;
  pendingReconciliation: number;
  missingEvidence: number;
  sourceMismatch: number;
  voidOrCorrectionNeeded: number;
  revenueByLane: Record<string, { units: number; grossEstimateCents: number }>;
  salespersonPerformance: Record<string, { units: number; grossEstimateCents: number }>;
  deploymentWarnings: string[];
};

export const salesConsoleSampleSalesBookRecords: CompletedSaleRecord[] = [
  salesConsoleSampleCompletedSaleRecord,
  {
    ...salesConsoleSampleCompletedSaleRecord,
    id: "SALE-M70-1002",
    customerName: "Maria Garcia",
    customerId: "CUST-MARIA-GARCIA",
    revenueLane: "Inventory BHPH Sale",
    paymentPath: "bhph",
    salespersonId: "USER-2",
    grossEstimateCents: 195000,
    reconciliationStatus: "source-mismatch",
    evidenceIds: ["EVD-M70-2"],
    audit: {
      ...salesConsoleSampleCompletedSaleRecord.audit,
      commandId: "SALE-M70-1002",
      idempotencyKey: "IDEMP-M70-1002"
    }
  },
  {
    ...salesConsoleSampleCompletedSaleRecord,
    id: "SALE-M70-1003",
    customerName: "Alex Johnson",
    customerId: "CUST-ALEX-JOHNSON",
    revenueLane: "Warranty Product",
    paymentPath: "warranty",
    salespersonId: "USER-1",
    grossEstimateCents: 78000,
    reconciliationStatus: "source-verified",
    evidenceIds: [],
    audit: {
      ...salesConsoleSampleCompletedSaleRecord.audit,
      commandId: "SALE-M70-1003",
      idempotencyKey: "IDEMP-M70-1003"
    }
  }
];

function canSeeRecord(role: SalesRecordWorkflowRole, userId: string, record: CompletedSaleRecord) {
  if (role === "Admin / Owner" || role === "Sales Manager") return true;
  if (role === "Salesperson") return record.salespersonId === userId;
  return record.reconciliationStatus !== "voided" && record.revenueLane !== "Inventory BHPH Sale";
}

function addLaneTotal(
  totals: Record<string, { units: number; grossEstimateCents: number }>,
  record: CompletedSaleRecord
) {
  const lane = totals[record.revenueLane] ?? { units: 0, grossEstimateCents: 0 };
  totals[record.revenueLane] = {
    units: lane.units + 1,
    grossEstimateCents: lane.grossEstimateCents + record.grossEstimateCents
  };
}

function addSalespersonTotal(
  totals: Record<string, { units: number; grossEstimateCents: number }>,
  record: CompletedSaleRecord
) {
  const salesperson = totals[record.salespersonId] ?? { units: 0, grossEstimateCents: 0 };
  totals[record.salespersonId] = {
    units: salesperson.units + 1,
    grossEstimateCents: salesperson.grossEstimateCents + record.grossEstimateCents
  };
}

export function buildSalesBookLedger(
  records: CompletedSaleRecord[],
  role: SalesRecordWorkflowRole,
  userId: string,
  today = "2026-07-30"
): SalesBookLedgerSummary {
  const visibleRecords = records.filter((record) => canSeeRecord(role, userId, record));
  const revenueByLane: SalesBookLedgerSummary["revenueByLane"] = {};
  const salespersonPerformance: SalesBookLedgerSummary["salespersonPerformance"] = {};

  visibleRecords.forEach((record) => {
    addLaneTotal(revenueByLane, record);
    addSalespersonTotal(salespersonPerformance, record);
  });

  const pendingReconciliation = visibleRecords.filter((record) => record.reconciliationStatus === "pending").length;
  const missingEvidence = visibleRecords.filter((record) => record.evidenceIds.length === 0).length;
  const sourceMismatch = visibleRecords.filter((record) => record.reconciliationStatus === "source-mismatch").length;
  const voidOrCorrectionNeeded = visibleRecords.filter((record) =>
    record.reconciliationStatus === "voided" || record.reconciliationStatus === "needs-source-owner-correction"
  ).length;

  return {
    role,
    visibleRecords,
    units: visibleRecords.length,
    grossEstimateCents: visibleRecords.reduce((sum, record) => sum + record.grossEstimateCents, 0),
    todayUnits: visibleRecords.filter((record) => record.saleDate === today).length,
    monthToDateUnits: visibleRecords.filter((record) => record.saleDate.startsWith(today.slice(0, 7))).length,
    pendingReconciliation,
    missingEvidence,
    sourceMismatch,
    voidOrCorrectionNeeded,
    revenueByLane,
    salespersonPerformance,
    deploymentWarnings: [
      ...(pendingReconciliation ? [`${pendingReconciliation} sale record${pendingReconciliation === 1 ? "" : "s"} pending source reconciliation`] : []),
      ...(missingEvidence ? [`${missingEvidence} sale record${missingEvidence === 1 ? "" : "s"} missing evidence`] : []),
      ...(sourceMismatch ? [`${sourceMismatch} source mismatch${sourceMismatch === 1 ? "" : "es"} require source-owner review`] : [])
    ]
  };
}

export function salesBookLedgerPreservesRoleVisibility() {
  const salespersonLedger = buildSalesBookLedger(salesConsoleSampleSalesBookRecords, "Salesperson", "USER-1");
  const managerLedger = buildSalesBookLedger(salesConsoleSampleSalesBookRecords, "Sales Manager", "MGR-1");

  return salespersonLedger.visibleRecords.length < managerLedger.visibleRecords.length;
}
