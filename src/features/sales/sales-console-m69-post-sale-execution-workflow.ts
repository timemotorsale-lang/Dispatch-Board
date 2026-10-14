import type { CompletedSaleRecord } from "./sales-console-m50-record-command-contract";

export type PostSaleExecutionStepStatus = "ready" | "waiting-source" | "manager-review" | "governed" | "complete";

export type PostSaleExecutionStep = {
  id: string;
  label: string;
  owner: "Sales Console" | "Sales Manager" | "CRM / Customers" | "Inventory / Vehicles" | "Finance" | "Service / Repair" | "Rental" | "Warranty" | "DMS";
  status: PostSaleExecutionStepStatus;
  sourceLinkRequired: boolean;
  writeBehavior: "sales-console-internal" | "source-system-owned" | "governed";
};

export type PostSaleExecutionWorkflow = {
  completedSaleRecordId: string;
  customerName: string;
  revenueLane: CompletedSaleRecord["revenueLane"];
  nextBestStep: string;
  salesConsoleCanCreateGlobalTasks: false;
  sourceSystemMutationEnabled: false;
  steps: PostSaleExecutionStep[];
};

const commonPostSaleSteps: PostSaleExecutionStep[] = [
  {
    id: "source-reconciliation",
    label: "Reconcile completed sale against source records",
    owner: "Sales Console",
    status: "ready",
    sourceLinkRequired: true,
    writeBehavior: "sales-console-internal"
  },
  {
    id: "customer-history",
    label: "Confirm Customer 360 has correct relationship context",
    owner: "CRM / Customers",
    status: "waiting-source",
    sourceLinkRequired: true,
    writeBehavior: "source-system-owned"
  },
  {
    id: "delivery-readiness",
    label: "Review delivery or fulfillment readiness",
    owner: "Sales Manager",
    status: "manager-review",
    sourceLinkRequired: true,
    writeBehavior: "governed"
  }
];

const laneSpecificSteps: Record<CompletedSaleRecord["revenueLane"], PostSaleExecutionStep[]> = {
  "Inventory Cash Sale": [
    {
      id: "inventory-status",
      label: "Verify sold vehicle status in inventory source",
      owner: "Inventory / Vehicles",
      status: "waiting-source",
      sourceLinkRequired: true,
      writeBehavior: "source-system-owned"
    },
    {
      id: "dms-sale-record",
      label: "Verify DMS sale accounting record",
      owner: "DMS",
      status: "waiting-source",
      sourceLinkRequired: true,
      writeBehavior: "source-system-owned"
    }
  ],
  "Inventory BHPH Sale": [
    {
      id: "bhph-finance-package",
      label: "Confirm BHPH finance package handoff",
      owner: "Finance",
      status: "governed",
      sourceLinkRequired: true,
      writeBehavior: "governed"
    }
  ],
  "Inventory Lease-to-Own": [
    {
      id: "lto-program-package",
      label: "Confirm lease-to-own program package and terms review",
      owner: "Finance",
      status: "governed",
      sourceLinkRequired: true,
      writeBehavior: "governed"
    }
  ],
  "Public Auto Repair": [
    {
      id: "repair-order-closeout",
      label: "Verify repair order closeout and authorization status",
      owner: "Service / Repair",
      status: "waiting-source",
      sourceLinkRequired: true,
      writeBehavior: "source-system-owned"
    }
  ],
  "Daily Rental": [
    {
      id: "rental-checkout-return",
      label: "Verify rental checkout, return window, and vehicle availability",
      owner: "Rental",
      status: "waiting-source",
      sourceLinkRequired: true,
      writeBehavior: "source-system-owned"
    }
  ],
  "Warranty Product": [
    {
      id: "warranty-registration",
      label: "Verify warranty authorization and registration evidence",
      owner: "Warranty",
      status: "governed",
      sourceLinkRequired: true,
      writeBehavior: "governed"
    }
  ],
  "Financing Product": [
    {
      id: "finance-product-handoff",
      label: "Verify lender/source status and product menu evidence",
      owner: "Finance",
      status: "governed",
      sourceLinkRequired: true,
      writeBehavior: "governed"
    }
  ]
};

export function buildPostSaleExecutionWorkflow(record: CompletedSaleRecord): PostSaleExecutionWorkflow {
  const steps = [...commonPostSaleSteps, ...laneSpecificSteps[record.revenueLane]];
  const nextBestStep = steps.find((step) => step.status !== "complete")?.label ?? "Post-sale execution complete";

  return {
    completedSaleRecordId: record.id,
    customerName: record.customerName,
    revenueLane: record.revenueLane,
    nextBestStep,
    salesConsoleCanCreateGlobalTasks: false,
    sourceSystemMutationEnabled: false,
    steps
  };
}

export function postSaleWorkflowCoversEveryRevenueLane() {
  return Object.values(laneSpecificSteps).every((steps) => steps.length > 0);
}

export const salesConsoleSampleCompletedSaleRecord: CompletedSaleRecord = {
  id: "SALE-M69-1001",
  salesOpportunityId: "SO-M69-1001",
  revenueOpportunityId: "REV-M69-1001",
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
  lifecycleState: "sale-recorded",
  sourceRecordLinks: ["/customers/customer-360?customerId=CUST-JOHN-SMITH", "/vehicles/360/TMS22145"],
  evidenceIds: ["EVD-M69-1"],
  reconciliationStatus: "pending",
  audit: {
    actorId: "USER-1",
    actorRole: "Sales Manager",
    storeId: "TMS-001",
    occurredAt: "2026-07-30T17:00:00.000Z",
    commandId: "SALE-M69-1001",
    correlationId: "CORR-M69",
    idempotencyKey: "IDEMP-M69",
    sourceLink: "/sales"
  }
};
