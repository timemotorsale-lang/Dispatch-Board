import type { SalesConsoleMvpFreshness, SalesConsoleMvpTone } from "./sales-console-mvp-execution";

export type SalesConsoleSourceTaskRecord = {
  activityAgeMinutes: number | null;
  appointmentId?: string;
  blocker?: string;
  customerId: string;
  customerName: string;
  dueLabel: string;
  leadId?: string;
  nextAction?: string;
  phone: string;
  reason?: string;
  stage?: string;
  stockNumber?: string;
  taskId: string;
  vehicleId?: string;
  vehicleName?: string;
};

export type SalesConsoleSourceLeadRecord = {
  appointmentCount: number;
  assignmentState: "assigned" | "unassigned";
  duplicateReview: boolean;
  lastActivityMinutes: number | null;
  leadId: string;
  owner?: string;
};

export type SalesConsoleSourceVehicleRecord = {
  availability: "available" | "blocked" | "unknown";
  blockerDetail?: string;
  customerId?: string;
  fitScore?: number;
  priceLabel?: string;
  readiness: "not-ready" | "ready" | "unknown";
  stockNumber: string;
  vehicleId: string;
  vehicleName: string;
};

export type SalesConsoleSourceDealRecord = {
  approvalState?: string;
  blockerState?: string;
  customerId: string;
  customerName: string;
  dealId: string;
  paymentLabel?: string;
  scenarioLabel?: string;
  vehicleId?: string;
  vehicleName?: string;
};

export type SalesConsoleSourceAppointmentRecord = {
  appointmentId: string;
  customerId: string;
  label: string;
  startsInMinutes: number | null;
};

export type SalesConsoleSourceBundle = {
  appointments: SalesConsoleSourceAppointmentRecord[];
  deals: SalesConsoleSourceDealRecord[];
  leads: SalesConsoleSourceLeadRecord[];
  tasks: SalesConsoleSourceTaskRecord[];
  vehicles: SalesConsoleSourceVehicleRecord[];
};

export type SalesConsoleSellerQueueViewModel = {
  blocker: string;
  customer: string;
  due: string;
  freshness: string;
  freshnessState: SalesConsoleMvpFreshness;
  nextAction: string;
  phone: string;
  priorityRank: number;
  reason: string;
  sourceLinks: SalesConsoleViewSourceLink[];
  stage: string;
  stock: string;
  taskId: string;
  tone: SalesConsoleMvpTone;
  vehicle: string;
};

export type SalesConsoleLeadOperationsViewModel = {
  appointmentCount: number;
  assignmentState: string;
  freshnessState: SalesConsoleMvpFreshness;
  label: string;
  leadId: string;
  owner: string;
  slaLabel: string;
  tone: SalesConsoleMvpTone;
};

export type SalesConsoleInventoryMatchViewModel = {
  blockerDetail: string;
  freshnessState: SalesConsoleMvpFreshness;
  matchCustomer: string;
  price: string;
  score: string;
  status: string;
  stock: string;
  tone: SalesConsoleMvpTone;
  vehicle: string;
};

export type SalesConsoleDealDeskViewModel = {
  approval: string;
  blockerState: string;
  customer: string;
  dealId: string;
  freshnessState: SalesConsoleMvpFreshness;
  payment: string;
  scenario: string;
  tone: SalesConsoleMvpTone;
  vehicle: string;
};

export type SalesConsoleManagerRiskViewModel = {
  count: number;
  freshnessState: SalesConsoleMvpFreshness;
  label: string;
  tone: SalesConsoleMvpTone;
};

export type SalesConsoleViewSourceLink = {
  href: string;
  label: string;
  state: SalesConsoleMvpFreshness;
  unavailableLabel: string;
};

export type SalesConsoleReadAdapterViewModel = {
  deals: SalesConsoleDealDeskViewModel[];
  inventoryMatches: SalesConsoleInventoryMatchViewModel[];
  leadOperations: SalesConsoleLeadOperationsViewModel[];
  managerRisks: SalesConsoleManagerRiskViewModel[];
  readOnly: true;
  sellerQueue: SalesConsoleSellerQueueViewModel[];
};

const minutesToFreshness = (minutes: number | null): SalesConsoleMvpFreshness => {
  if (minutes === null) return "placeholder";
  if (minutes > 120) return "stale";
  return "current";
};

const freshnessToTone = (freshness: SalesConsoleMvpFreshness): SalesConsoleMvpTone => {
  if (freshness === "stale") return "danger";
  if (freshness === "verify-first") return "warning";
  if (freshness === "placeholder") return "neutral";
  return "good";
};

const minutesLabel = (minutes: number | null) => {
  if (minutes === null) return "Freshness unknown";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
};

const customerLink = (customerId: string): SalesConsoleViewSourceLink => ({
  href: `/customers/customer-360?customerId=${customerId}`,
  label: "Customer 360",
  state: "verify-first",
  unavailableLabel: "Customer link unavailable"
});

const taskLink = (taskId: string): SalesConsoleViewSourceLink => ({
  href: `/tasks/${taskId}`,
  label: "Task",
  state: "current",
  unavailableLabel: "Task source unavailable"
});

const vehicleLink = (vehicleId?: string): SalesConsoleViewSourceLink => ({
  href: vehicleId ? `/vehicles/360/${vehicleId}` : "#inventory-intelligence",
  label: "Vehicle",
  state: vehicleId ? "verify-first" : "placeholder",
  unavailableLabel: vehicleId ? "Vehicle source unavailable" : "Vehicle source pending"
});

export function adaptSellerQueue(records: SalesConsoleSourceTaskRecord[]): SalesConsoleSellerQueueViewModel[] {
  return records
    .map((record) => {
      const freshnessState = minutesToFreshness(record.activityAgeMinutes);
      const hasBlocker = Boolean(record.blocker);
      const tone: SalesConsoleMvpTone = hasBlocker ? "danger" : freshnessToTone(freshnessState);

      return {
        blocker: record.blocker ? `Blocked: ${record.blocker}` : "-",
        customer: record.customerName,
        due: record.dueLabel,
        freshness: minutesLabel(record.activityAgeMinutes),
        freshnessState,
        nextAction: record.nextAction ?? "Next action pending",
        phone: record.phone,
        priorityRank: 0,
        reason: record.reason ?? (freshnessState === "placeholder" ? "Source data missing" : "-"),
        sourceLinks: [customerLink(record.customerId), taskLink(record.taskId), vehicleLink(record.vehicleId)],
        stage: record.stage ?? "Stage pending",
        stock: record.stockNumber ?? record.vehicleId ?? "Vehicle pending",
        taskId: record.taskId,
        tone,
        vehicle: record.vehicleName ?? "Vehicle match pending"
      };
    })
    .sort((a, b) => {
      const toneWeight = { danger: 0, warning: 1, neutral: 2, good: 3 } satisfies Record<SalesConsoleMvpTone, number>;
      return toneWeight[a.tone] - toneWeight[b.tone];
    })
    .map((item, index) => ({ ...item, priorityRank: index + 1 }));
}

export function adaptLeadOperations(records: SalesConsoleSourceLeadRecord[]): SalesConsoleLeadOperationsViewModel[] {
  return records.map((record) => {
    const freshnessState = minutesToFreshness(record.lastActivityMinutes);
    const blocked = record.assignmentState === "unassigned" || record.duplicateReview || freshnessState === "stale";
    return {
      appointmentCount: record.appointmentCount,
      assignmentState: record.assignmentState,
      freshnessState,
      label: record.duplicateReview ? "Duplicate review" : blocked ? "Lead needs attention" : "Lead healthy",
      leadId: record.leadId,
      owner: record.owner ?? "Owner pending",
      slaLabel: freshnessState === "placeholder" ? "SLA unavailable" : minutesLabel(record.lastActivityMinutes),
      tone: blocked ? "danger" : freshnessToTone(freshnessState)
    };
  });
}

export function adaptInventoryMatches(records: SalesConsoleSourceVehicleRecord[], tasks: SalesConsoleSourceTaskRecord[]): SalesConsoleInventoryMatchViewModel[] {
  return records.map((record) => {
    const matchedTask = tasks.find((task) => task.customerId === record.customerId);
    const verifyFirst = record.availability === "unknown" || record.readiness === "unknown";
    const blocked = record.availability === "blocked" || record.readiness === "not-ready";
    const freshnessState: SalesConsoleMvpFreshness = verifyFirst ? "verify-first" : "current";
    return {
      blockerDetail: record.blockerDetail ?? (verifyFirst ? "Verify before presentation" : "No blockers"),
      freshnessState,
      matchCustomer: matchedTask?.customerName ?? "Match pending",
      price: record.priceLabel ?? "Price pending",
      score: record.fitScore === undefined ? "Pending" : String(record.fitScore),
      status: blocked ? "Not Ready" : verifyFirst ? "Verify First" : "Ready",
      stock: record.stockNumber,
      tone: blocked ? "danger" : freshnessToTone(freshnessState),
      vehicle: record.vehicleName
    };
  });
}

export function adaptDealDesk(records: SalesConsoleSourceDealRecord[]): SalesConsoleDealDeskViewModel[] {
  return records.map((record) => {
    const placeholder = !record.scenarioLabel || !record.paymentLabel;
    const blocked = Boolean(record.blockerState) || record.approvalState?.includes("Pending");
    return {
      approval: record.approvalState ?? "Approval visibility only",
      blockerState: record.blockerState ? `Blocked: ${record.blockerState}` : placeholder ? "Scenario visibility only" : "-",
      customer: record.customerName,
      dealId: record.dealId,
      freshnessState: placeholder ? "placeholder" : "current",
      payment: record.paymentLabel ?? "Payment visibility only",
      scenario: record.scenarioLabel ?? "Scenario visibility only",
      tone: blocked ? "warning" : placeholder ? "neutral" : "good",
      vehicle: record.vehicleName ?? "Vehicle pending"
    };
  });
}

export function adaptManagerRisks(bundle: SalesConsoleSourceBundle): SalesConsoleManagerRiskViewModel[] {
  const sellerQueue = adaptSellerQueue(bundle.tasks);
  const leadOperations = adaptLeadOperations(bundle.leads);
  const inventoryMatches = adaptInventoryMatches(bundle.vehicles, bundle.tasks);
  const deals = adaptDealDesk(bundle.deals);

  return [
    {
      count: sellerQueue.filter((item) => item.freshnessState === "stale").length,
      freshnessState: "stale",
      label: "Stale seller work",
      tone: "danger"
    },
    {
      count: leadOperations.filter((lead) => lead.tone === "danger").length,
      freshnessState: "current",
      label: "Lead leakage risk",
      tone: "danger"
    },
    {
      count: inventoryMatches.filter((vehicle) => vehicle.freshnessState === "verify-first" || vehicle.status !== "Ready").length,
      freshnessState: "verify-first",
      label: "Inventory verify-first",
      tone: "warning"
    },
    {
      count: deals.filter((deal) => deal.freshnessState === "placeholder" || deal.blockerState !== "-").length,
      freshnessState: "placeholder",
      label: "Deal visibility gaps",
      tone: "neutral"
    }
  ];
}

export function adaptSalesConsoleReadModel(bundle: SalesConsoleSourceBundle): SalesConsoleReadAdapterViewModel {
  return {
    deals: adaptDealDesk(bundle.deals),
    inventoryMatches: adaptInventoryMatches(bundle.vehicles, bundle.tasks),
    leadOperations: adaptLeadOperations(bundle.leads),
    managerRisks: adaptManagerRisks(bundle),
    readOnly: true,
    sellerQueue: adaptSellerQueue(bundle.tasks)
  };
}

export const salesConsoleMockSourceBundle = {
  appointments: [
    { appointmentId: "appt-101", customerId: "cust-101", label: "Showroom visit today", startsInMinutes: 90 },
    { appointmentId: "appt-102", customerId: "cust-102", label: "Phone follow-up", startsInMinutes: null }
  ],
  deals: [
    {
      approvalState: "Pending Manager",
      blockerState: "Terms review",
      customerId: "cust-101",
      customerName: "Michael Johnson",
      dealId: "D-12457",
      paymentLabel: "$427 / mo",
      scenarioLabel: "Scenario 2 / v1",
      vehicleId: "veh-101",
      vehicleName: "2024 Toyota RAV4 XLE"
    },
    {
      customerId: "cust-103",
      customerName: "David Martinez",
      dealId: "D-12402",
      vehicleId: "veh-103",
      vehicleName: "2024 Ford F-150 XLT"
    }
  ],
  leads: [
    { appointmentCount: 1, assignmentState: "assigned", duplicateReview: false, lastActivityMinutes: 22, leadId: "lead-101", owner: "A. Carter" },
    { appointmentCount: 0, assignmentState: "unassigned", duplicateReview: true, lastActivityMinutes: 185, leadId: "lead-102" }
  ],
  tasks: [
    {
      activityAgeMinutes: 10,
      appointmentId: "appt-101",
      blocker: "Approval Pending",
      customerId: "cust-101",
      customerName: "Michael Johnson",
      dueLabel: "Due: Now",
      leadId: "lead-101",
      nextAction: "Manager review",
      phone: "(555) 123-4567",
      reason: "Rate / terms",
      stage: "Manager Review",
      stockNumber: "T241245",
      taskId: "task-101",
      vehicleId: "veh-101",
      vehicleName: "2024 Toyota RAV4 XLE"
    },
    {
      activityAgeMinutes: null,
      customerId: "cust-102",
      customerName: "Sarah Williams",
      dueLabel: "Due: Today",
      phone: "(555) 234-5678",
      taskId: "task-102"
    },
    {
      activityAgeMinutes: 210,
      customerId: "cust-103",
      customerName: "David Martinez",
      dueLabel: "Overdue",
      nextAction: "Reconnect",
      phone: "(555) 345-6789",
      reason: "No activity",
      stage: "Structure Deal",
      stockNumber: "F241512",
      taskId: "task-103",
      vehicleId: "veh-103",
      vehicleName: "2024 Ford F-150 XLT"
    }
  ],
  vehicles: [
    {
      availability: "available",
      customerId: "cust-101",
      fitScore: 94,
      priceLabel: "$28,645",
      readiness: "ready",
      stockNumber: "T241245",
      vehicleId: "veh-101",
      vehicleName: "2024 Toyota RAV4 XLE"
    },
    {
      availability: "unknown",
      blockerDetail: "Recon status unknown",
      customerId: "cust-103",
      priceLabel: "$44,320",
      readiness: "unknown",
      stockNumber: "F241512",
      vehicleId: "veh-103",
      vehicleName: "2024 Ford F-150 XLT"
    }
  ]
} as const satisfies SalesConsoleSourceBundle;

export const salesConsoleReadAdapterPreview = adaptSalesConsoleReadModel(salesConsoleMockSourceBundle);
