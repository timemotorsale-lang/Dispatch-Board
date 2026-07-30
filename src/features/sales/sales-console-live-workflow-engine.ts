import { evaluateSalesActivityRecording } from "./sales-console-m56-activity-recording-workflow";
import {
  salesConsoleLeadRecords,
  type SalesConsoleLeadRecord
} from "./sales-console-lead-operations";
import {
  salesConsoleInventoryAlternatives,
  salesConsoleInventoryMatches,
  type SalesConsoleInventoryMatch
} from "./sales-console-inventory-match";
import {
  salesConsoleAppointments,
  salesConsoleDeliveryReadiness,
  salesConsoleTasksAndPromises
} from "./sales-console-operational-support";
import {
  getRevenueLaneContract,
  type SalesConsoleRevenueLaneName,
  type SalesConsoleStaffRole
} from "./sales-console-operational-domain";
import { mapSalesAppointment } from "./sales-console-m51-appointment-calendar-integration";
import { mapSalesCustomer360 } from "./sales-console-m52-customer360-integration";
import { mapSalesTaskPromise } from "./sales-console-m53-task-promise-integration";
import { mapSalesInventoryVehicle } from "./sales-console-m54-inventory-vehicle-integration";
import {
  createGuardedEvidenceRecord,
  validateSalesEvidenceUpload
} from "./sales-console-m55-evidence-upload-foundation";
import {
  searchFederatedSalesRecords,
  type SalesFederatedSearchRecord
} from "./sales-console-m57-federated-search";
import {
  rankSalesWorkQueue,
  type SalesWorkQueueGroup,
  type SalesWorkQueueInput
} from "./sales-console-m58-work-queue-algorithm";
import { evaluateSalesLeadOperations } from "./sales-console-m59-lead-operations-logic";
import {
  recommendSalesInventoryMatches,
  type SalesInventoryMatchInput
} from "./sales-console-m60-inventory-match-algorithm";
import { evaluateSalesRevenueDeskWorkflow } from "./sales-console-m61-revenue-desk-workflow-logic";
import {
  buildSalesManagerCommandQueues,
  type SalesManagerCommandInput
} from "./sales-console-m62-manager-command-algorithms";
import { evaluateSalesOutcomeRecording } from "./sales-console-m63-sales-outcome-recording";
import type { SalesConsoleAuditMetadata } from "./sales-console-m50-record-command-contract";

export type SalesConsoleLiveActionState =
  | "Live Action"
  | "Controlled Action"
  | "Source-System Action"
  | "Future / Governed";

export type SalesConsoleLiveWorkItem = {
  rank: number;
  group: SalesWorkQueueGroup;
  customer: string;
  contact: string;
  vehicle: string;
  stock: string;
  lane: string;
  contractLane: SalesConsoleRevenueLaneName;
  stage: string;
  freshness: string;
  source: string;
  blockers: string[];
  nextAction: string;
  reason: string;
  action: string;
  actionState: SalesConsoleLiveActionState;
  algorithmScore: number;
  algorithmReasons: string[];
};

export type SalesConsoleLiveRevenueLane = {
  name: string;
  contractLane: SalesConsoleRevenueLaneName;
  stage: string;
  owner: string;
  nextAction: string;
  status: SalesConsoleLiveActionState;
  workflowDecision: ReturnType<typeof evaluateSalesRevenueDeskWorkflow>;
};

export type SalesConsoleLiveLeadRecord = SalesConsoleLeadRecord & {
  workflowDecision: ReturnType<typeof evaluateSalesLeadOperations>;
};

export type SalesConsoleLiveInventoryMatch = SalesConsoleInventoryMatch & {
  matchScore: number;
  sellability: ReturnType<typeof recommendSalesInventoryMatches>[number]["sellability"];
  blockerExplanation: string[];
  sourceVehicleLink: string;
};

export type SalesConsoleLiveManagerQueue = {
  title: string;
  count: string;
  drilldowns: string[];
  algorithmSource: string;
};

const liveAudit: SalesConsoleAuditMetadata = {
  actorId: "demo-staff-user",
  actorRole: "Sales Manager",
  storeId: "TMS-001",
  occurredAt: "2026-07-30T15:00:00.000Z",
  commandId: "SALES-LIVE-WORKFLOW-CMD",
  correlationId: "SALES-LIVE-WORKFLOW-CORR",
  idempotencyKey: "SALES-LIVE-WORKFLOW-IDEMP",
  sourceLink: "/sales"
};

const baseWorkItems = [
  {
    id: "REV-1001",
    customer: "John Smith",
    contact: "(555) 123-4567",
    vehicle: "2022 Toyota RAV4 XLE",
    stock: "TMS22145",
    lane: "Cash Sale",
    contractLane: "Inventory Cash Sale" as const,
    stage: "Proposal",
    freshness: "15m",
    source: "Website",
    blockers: ["IDV", "Trade App"],
    businessReason: "High-intent cash sale, active proposal, vehicle ready, manager attention needed.",
    action: "Open Revenue Desk",
    actionState: "Live Action" as const,
    queueInput: {
      id: "REV-1001",
      leadAgeMinutes: 10,
      firstResponseMinutes: 22,
      appointmentStartsInMinutes: 90,
      customerIntent: "high",
      revenueLane: "Inventory Cash Sale",
      vehicleAvailability: "available",
      blockerSeverity: "risk",
      nextActionStaleMinutes: 15,
      managerPriority: true,
      sourceFreshness: "current"
    } satisfies SalesWorkQueueInput
  },
  {
    id: "REV-1002",
    customer: "Maria Garcia",
    contact: "(555) 987-6543",
    vehicle: "2019 Honda CR-V EX",
    stock: "TMS19087",
    lane: "Financing Products",
    contractLane: "Financing Product" as const,
    stage: "Credit App",
    freshness: "45m",
    source: "Phone Up",
    blockers: ["Credit Bureau"],
    businessReason: "Financing product has aging credit app and source-system blocker.",
    action: "Continue App",
    actionState: "Controlled Action" as const,
    queueInput: {
      id: "REV-1002",
      leadAgeMinutes: 70,
      firstResponseMinutes: 45,
      customerIntent: "high",
      revenueLane: "Financing Product",
      vehicleAvailability: "verify-first",
      blockerSeverity: "risk",
      nextActionStaleMinutes: 90,
      managerPriority: false,
      sourceFreshness: "current"
    } satisfies SalesWorkQueueInput
  },
  {
    id: "REV-1003",
    customer: "Alex Johnson",
    contact: "(555) 246-8101",
    vehicle: "2021 Ford F-150 XLT",
    stock: "TMS21022",
    lane: "Lease-to-Own",
    contractLane: "Inventory Lease-to-Own" as const,
    stage: "Structure",
    freshness: "2h",
    source: "Walk-in",
    blockers: ["LTO Program"],
    businessReason: "Lease-to-own structure is ready for manager-controlled review.",
    action: "Present Options",
    actionState: "Controlled Action" as const,
    queueInput: {
      id: "REV-1003",
      leadAgeMinutes: 120,
      appointmentStartsInMinutes: 240,
      customerIntent: "medium",
      revenueLane: "Inventory Lease-to-Own",
      vehicleAvailability: "available",
      blockerSeverity: "watch",
      nextActionStaleMinutes: 30,
      managerPriority: true,
      sourceFreshness: "current"
    } satisfies SalesWorkQueueInput
  },
  {
    id: "REV-1004",
    customer: "Samantha Lee",
    contact: "(555) 369-8520",
    vehicle: "2020 Chevy Malibu LT",
    stock: "TMS20011",
    lane: "BHPH",
    contractLane: "Inventory BHPH Sale" as const,
    stage: "Compliance",
    freshness: "3h",
    source: "Referral",
    blockers: ["Pay Stub"],
    businessReason: "BHPH compliance is blocked by customer document evidence.",
    action: "Request Docs",
    actionState: "Controlled Action" as const,
    queueInput: {
      id: "REV-1004",
      leadAgeMinutes: 180,
      customerIntent: "high",
      revenueLane: "Inventory BHPH Sale",
      vehicleAvailability: "available",
      blockerSeverity: "blocked",
      nextActionStaleMinutes: 180,
      managerPriority: false,
      sourceFreshness: "current"
    } satisfies SalesWorkQueueInput
  },
  {
    id: "REV-1005",
    customer: "David Brown",
    contact: "(555) 741-9630",
    vehicle: "2018 Nissan Altima S",
    stock: "TMS18055",
    lane: "Public Repair",
    contractLane: "Public Auto Repair" as const,
    stage: "Estimate",
    freshness: "4h",
    source: "Drive-In",
    blockers: [],
    businessReason: "Public repair lane is clear but needs follow-up before estimate ages.",
    action: "Open Repair Lane",
    actionState: "Live Action" as const,
    queueInput: {
      id: "REV-1005",
      leadAgeMinutes: 260,
      customerIntent: "medium",
      revenueLane: "Public Auto Repair",
      vehicleAvailability: "verify-first",
      blockerSeverity: "none",
      nextActionStaleMinutes: 70,
      managerPriority: false,
      sourceFreshness: "stale"
    } satisfies SalesWorkQueueInput
  }
];

export const salesConsoleLiveWorkItems: SalesConsoleLiveWorkItem[] = rankSalesWorkQueue(
  baseWorkItems.map((item) => item.queueInput)
).map((ranking, index) => {
  const source = baseWorkItems.find((item) => item.id === ranking.id);

  if (!source) {
    throw new Error(`Missing Sales Console work item source for ${ranking.id}`);
  }

  return {
    rank: index + 1,
    group: ranking.group,
    customer: source.customer,
    contact: source.contact,
    vehicle: source.vehicle,
    stock: source.stock,
    lane: source.lane,
    contractLane: source.contractLane,
    stage: source.stage,
    freshness: source.freshness,
    source: source.source,
    blockers: source.blockers,
    nextAction: ranking.nextBestAction,
    reason: `${source.businessReason} Algorithm: ${ranking.rankingReasons.join("; ")}`,
    action: source.action,
    actionState: source.actionState,
    algorithmScore: ranking.score,
    algorithmReasons: ranking.rankingReasons
  };
});

const salesConsoleLiveRevenueLaneSeeds: Array<Omit<SalesConsoleLiveRevenueLane, "workflowDecision">> = [
  { name: "Cash Sale", contractLane: "Inventory Cash Sale", stage: "Proposal", owner: "James K.", nextAction: "Confirm trade and final numbers", status: "Live Action" },
  { name: "BHPH", contractLane: "Inventory BHPH Sale", stage: "Compliance", owner: "Tasha M.", nextAction: "Collect pay stub and verify", status: "Controlled Action" },
  { name: "Lease-to-Own", contractLane: "Inventory Lease-to-Own", stage: "Structure", owner: "Marcus D.", nextAction: "Review terms and payments", status: "Controlled Action" },
  { name: "Public Repair", contractLane: "Public Auto Repair", stage: "Estimate", owner: "Luis R.", nextAction: "Review estimate with customer", status: "Live Action" },
  { name: "Daily Rental", contractLane: "Daily Rental", stage: "Ready", owner: "Nina P.", nextAction: "Vehicle ready for checkout", status: "Source-System Action" },
  { name: "Warranty", contractLane: "Warranty Product", stage: "Authorization", owner: "Chris S.", nextAction: "Submit additional docs", status: "Controlled Action" },
  { name: "Financing Products", contractLane: "Financing Product", stage: "Offer", owner: "Alyssa W.", nextAction: "Present GAP and VSC options", status: "Future / Governed" }
];

export const salesConsoleLiveRevenueLanes: SalesConsoleLiveRevenueLane[] = salesConsoleLiveRevenueLaneSeeds.map((lane) => ({
  ...lane,
  workflowDecision: evaluateSalesRevenueDeskWorkflow({
    lane: lane.contractLane,
    stage: lane.stage,
    completedFields: getRevenueLaneContract(lane.contractLane)?.requiredFields.slice(0, lane.status === "Live Action" ? 5 : 3) ?? [],
    blockerCodes: lane.status === "Live Action" ? [] : [lane.stage.toUpperCase().replaceAll(" ", "_")],
    customerReady: lane.status === "Live Action",
    sourceVerified: lane.status !== "Future / Governed",
    managerReviewOpen: lane.status === "Controlled Action"
  })
}));

export const salesConsoleLiveLeadRecords: SalesConsoleLiveLeadRecord[] = salesConsoleLeadRecords.map((lead, index) => ({
  ...lead,
  workflowDecision: evaluateSalesLeadOperations({
    leadId: lead.id,
    channel: lead.source === "Website" ? "website" : lead.source === "Phone Up" ? "phone" : lead.source === "Referral" ? "referral" : "walk-in",
    leadAgeMinutes: index === 0 ? 70 : index === 1 ? 8 : 25,
    lastResponseMinutes: lead.sla.includes("45m") ? 45 : lead.sla.includes("8m") ? 8 : 20,
    duplicateSignals: lead.duplicateRisk === "High" ? ["same-phone", "same-email"] : lead.duplicateRisk === "Low" ? ["same-name"] : [],
    requestedLane: lead.financingIntent.includes("BHPH") || lead.financingIntent.includes("Financing") ? "finance" : "inventory",
    appointmentSet: lead.state === "Appointment Set",
    appointmentCompleted: false,
    ownerAvailable: lead.owner !== "BDC Queue",
    customerIntent: lead.state === "New" || lead.state === "Appointment Set" ? "high" : "medium"
  })
}));

const inventoryAlgorithmInputs: SalesInventoryMatchInput[] = salesConsoleInventoryMatches.map((vehicle) => ({
  stockNumber: vehicle.stock,
  label: vehicle.vehicle,
  price: Number(vehicle.retail.replace(/[$,]/g, "")),
  customerBudget: vehicle.stock === "TMS22145" ? 27000 : vehicle.stock === "TMS21087" ? 23000 : 26000,
  bodyStyleFit: vehicle.vehicle.includes("RAV4") || vehicle.vehicle.includes("CR-V") ? "strong" : "okay",
  readiness: vehicle.readiness === "Ready" ? "ready" : vehicle.availability === "service-blocked" ? "blocked" : "needs-work",
  availability: vehicle.availability === "available" ? "available" : vehicle.availability === "unavailable" ? "unavailable" : "verify-first",
  ageDays: Number(vehicle.age.replace(/\D/g, "")),
  marketPressure: vehicle.marketPressure.toLowerCase() as SalesInventoryMatchInput["marketPressure"],
  grossPotential: Number(vehicle.gross.replace(/[$,]/g, "")) > 2500 ? "high" : "medium",
  financeFit: vehicle.stock === "TMS20022" ? "okay" : "strong",
  customerPreference: vehicle.stock === "TMS22145" ? "preferred" : "acceptable",
  blockerCount: vehicle.blocker === "Clear" ? 0 : 1
}));

const inventoryScores = recommendSalesInventoryMatches(inventoryAlgorithmInputs);

export const salesConsoleLiveInventoryMatches: SalesConsoleLiveInventoryMatch[] = salesConsoleInventoryMatches.map((vehicle) => {
  const score = inventoryScores.find((match) => match.stockNumber === vehicle.stock);
  const sourceVehicle = mapSalesInventoryVehicle({
    vehicleId: `VEH-${vehicle.stock}`,
    stockNumber: vehicle.stock,
    label: vehicle.vehicle,
    availability: vehicle.availability === "available" ? "available" : vehicle.availability === "unavailable" ? "sold" : "unknown",
    readiness: vehicle.readiness === "Ready" ? "frontline-ready" : vehicle.availability === "service-blocked" ? "needs-service" : "unknown",
    ageDays: Number(vehicle.age.replace(/\D/g, "")),
    pricingPosture: vehicle.availability === "pricing review" ? "verify-first" : "market-aligned",
    blockers: vehicle.blocker === "Clear" ? [] : [{ code: vehicle.blocker.toUpperCase().replaceAll(" ", "_"), label: vehicle.blocker, owner: "Inventory", severity: "risk" }],
    sourceRoute: `/inventory/${vehicle.stock}`,
    updatedAt: "2026-07-30T14:00:00.000Z"
  });

  const sellability = score?.sellability ?? (sourceVehicle.sellability === "blocked" ? "blocked" : "verify-first");

  return {
    ...vehicle,
    matchScore: score?.score ?? 0,
    sellability,
    blockerExplanation: score?.blockerExplanation ?? [],
    sourceVehicleLink: sourceVehicle.sourceVehicleLink
  };
}).sort((first, second) => second.matchScore - first.matchScore);

const managerInputs: SalesManagerCommandInput[] = salesConsoleLiveWorkItems.map((item) => ({
  recordId: item.stock,
  customerName: item.customer,
  revenueAmount: item.contractLane === "Public Auto Repair" ? 1800 : item.contractLane === "Financing Product" ? 3500 : 24000,
  stageAgeHours: item.group === "Waiting" ? 30 : item.group === "Watch" ? 26 : 8,
  slaRiskMinutes: item.algorithmReasons.some((reason) => reason.includes("SLA")) ? 45 : 15,
  managerReviewOpen: item.actionState === "Controlled Action",
  governedApprovalNeeded: item.actionState === "Future / Governed" || item.actionState === "Controlled Action",
  salespersonId: item.source === "Website" ? "James K." : item.source === "Referral" ? "Tasha M." : "Nina P.",
  showRatePercent: item.group === "Watch" ? 45 : 68,
  grossPerUnit: item.contractLane === "Public Auto Repair" ? 650 : 1450,
  overdueFollowUps: item.group === "Waiting" ? 2 : 0,
  sourceVerified: item.group !== "Watch",
  closeProbabilityPercent: item.group === "Must Do Now" ? 78 : item.group === "Today" ? 62 : item.group === "Waiting" ? 38 : 25
}));

const managerQueues = buildSalesManagerCommandQueues(managerInputs);

export const salesConsoleLiveManagerQueues: SalesConsoleLiveManagerQueue[] = [
  {
    title: "Review Queue",
    count: String(managerQueues.managerReviewQueue.length),
    drilldowns: managerQueues.managerReviewQueue.map((record) => `${record.recordId} ${record.customerName} manager review`),
    algorithmSource: "manager review queue"
  },
  {
    title: "Stalled Revenue",
    count: `$${managerQueues.stalledRevenue.reduce((sum, record) => sum + record.revenueAmount, 0).toLocaleString()}`,
    drilldowns: managerQueues.stalledRevenue.map((record) => `${record.customerName} stalled ${record.stageAgeHours}h`),
    algorithmSource: "stalled revenue detection"
  },
  {
    title: "SLA Risk",
    count: String(managerQueues.slaBreachQueue.length),
    drilldowns: managerQueues.slaBreachQueue.map((record) => `${record.customerName} response risk ${record.slaRiskMinutes}m`),
    algorithmSource: "SLA breach queue"
  },
  {
    title: "Approval Backlog",
    count: String(managerQueues.approvalBacklogVisibility.length),
    drilldowns: managerQueues.approvalBacklogVisibility.map((record) => `${record.customerName} governed approval visibility`),
    algorithmSource: "governed approval visibility"
  },
  {
    title: "Coaching Opportunities",
    count: String(managerQueues.coachingOpportunityFlags.length),
    drilldowns: managerQueues.coachingOpportunityFlags.map((flag) => `${flag.salespersonId}: ${flag.reasons.join(", ")}`),
    algorithmSource: "coaching opportunity flags"
  },
  {
    title: "Forecast Confidence",
    count: `${managerQueues.forecastConfidencePercent}%`,
    drilldowns: managerQueues.drilldownRecordIds.map((recordId) => `Drilldown ${recordId}`),
    algorithmSource: "weighted forecast confidence"
  }
];

export const salesConsoleLiveAppointments = salesConsoleAppointments.map((appointment) =>
  mapSalesAppointment({
    appointmentId: appointment.id,
    customerId: appointment.customer.replaceAll(" ", "-").toUpperCase(),
    customerName: appointment.customer,
    scheduledStart: appointment.time,
    confirmationStatus: appointment.state === "confirmation" ? "needs-confirmation" : "confirmed",
    arrivalState: appointment.state === "no-show" ? "no-show" : appointment.state === "arrival" ? "arrived" : "not-arrived",
    sourceRoute: `/appointments/${appointment.id}`,
    opportunityId: `REV-${appointment.id}`,
    revenueLane: "Inventory Cash Sale",
    updatedAt: "2026-07-30T13:00:00.000Z"
  })
);

export const salesConsoleLiveTasksAndPromises = salesConsoleTasksAndPromises.map((task) =>
  mapSalesTaskPromise({
    taskId: task.id,
    title: `${task.customer} ${task.type}`,
    dueAt: task.due === "Today" ? "2026-07-30T14:00:00.000Z" : "2026-07-31T14:00:00.000Z",
    ownerId: task.owner,
    ownerRole: "Salesperson",
    blockerOwner: task.blocker === "Clear" ? undefined : task.blocker,
    promiseType: task.type.includes("document") ? "document" : "callback",
    evidenceStatus: task.evidence === "needed" ? "missing" : task.evidence === "pending" ? "received" : "not-required",
    sourceRoute: `/tasks/${task.id}`,
    opportunityId: `REV-${task.id}`,
    completed: false,
    updatedAt: "2026-07-30T09:00:00.000Z"
  })
);

export const salesConsoleLiveCustomer360 = mapSalesCustomer360({
  customerId: "CUST-LIVE-1",
  displayName: salesConsoleLiveWorkItems[0].customer,
  preferredContact: "phone",
  consentStatus: "verified",
  activeOpportunityIds: salesConsoleLiveWorkItems.map((item) => item.stock),
  activeRevenueLanes: [...new Set(salesConsoleLiveWorkItems.map((item) => item.contractLane))],
  openCases: [{ caseId: "CASE-1", label: "Manager review", ownerSystem: "CRM / Customers" }],
  timelineSummary: ["Lead captured", "Vehicle matched", "Revenue Desk opened", "Manager guidance available"],
  documentSummary: [{ label: "Trade appraisal", status: "received" }],
  promiseSummary: [{ label: "Confirm final numbers", dueAt: "2026-07-30T18:00:00.000Z", status: "open" }],
  sourceRoute: "/customers/customer-360",
  updatedAt: "2026-07-30T14:30:00.000Z"
});

export const salesConsoleLiveFederatedRecords: SalesFederatedSearchRecord[] = [
  ...salesConsoleLiveWorkItems.flatMap((item): SalesFederatedSearchRecord[] => [
    {
      id: `CUSTOMER-${item.stock}`,
      category: "customer",
      title: item.customer,
      detail: `${item.lane} ${item.stage}`,
      sourceOwner: "CRM",
      sourceLink: "/customers/customer-360",
      tokens: [item.customer, item.contact, item.lane, item.stage],
      visibleToRoles: ["Salesperson", "BDC / Lead Coordinator", "Sales Manager", "Admin / Owner"]
    },
    {
      id: `STOCK-${item.stock}`,
      category: "stock-vin",
      title: item.stock,
      detail: item.vehicle,
      sourceOwner: "Inventory",
      sourceLink: `/inventory/${item.stock}`,
      tokens: [item.stock, item.vehicle],
      visibleToRoles: ["Salesperson", "Sales Manager", "Admin / Owner"]
    },
    {
      id: `REV-${item.stock}`,
      category: "revenue-opportunity",
      title: `${item.customer} ${item.lane}`,
      detail: item.nextAction,
      sourceOwner: "Sales Console",
      sourceLink: `/sales?record=${item.stock}`,
      tokens: [item.customer, item.lane, item.nextAction, item.stock],
      visibleToRoles: ["Salesperson", "Sales Manager", "Admin / Owner"]
    }
  ]),
  ...salesConsoleLiveAppointments.map((appointment): SalesFederatedSearchRecord => ({
    id: appointment.id,
    category: "appointment",
    title: appointment.label,
    detail: `${appointment.confirmationStatus} ${appointment.arrivalState}`,
    sourceOwner: "Appointments",
    sourceLink: appointment.sourceLink,
    tokens: [appointment.label, appointment.confirmationStatus, appointment.arrivalState],
    visibleToRoles: ["Salesperson", "BDC / Lead Coordinator", "Sales Manager", "Admin / Owner"]
  })),
  ...salesConsoleLiveTasksAndPromises.map((task): SalesFederatedSearchRecord => ({
    id: task.id,
    category: "task-promise",
    title: task.title,
    detail: `${task.dueLabel} ${task.evidenceStatus}`,
    sourceOwner: "Tasks",
    sourceLink: task.sourceTaskLink,
    tokens: [task.title, task.dueLabel, task.evidenceStatus, task.blockerLabel],
    visibleToRoles: task.visibleToRoles
  })),
  {
    id: "MGR-LIVE",
    category: "manager-review",
    title: "Manager review workbench",
    detail: "Open controlled manager review requests",
    sourceOwner: "Sales Console",
    sourceLink: "/sales?manager-review=open",
    tokens: ["manager", "review", "workbench", "approval backlog"],
    visibleToRoles: ["Sales Manager", "Admin / Owner"]
  },
  {
    id: "EVD-LIVE",
    category: "evidence",
    title: "Evidence records",
    detail: "Guarded upload and attachment context",
    sourceOwner: "Sales Console",
    sourceLink: "/sales?evidence=open",
    tokens: ["evidence", "photo", "file", "document", "upload"],
    visibleToRoles: ["Salesperson", "Sales Manager", "Admin / Owner"]
  },
  {
    id: "PHONE-LIVE",
    category: "phone-email",
    title: "Allowed contact fields",
    detail: "Phone and email are searchable where role visibility permits.",
    sourceOwner: "CRM",
    sourceLink: "/customers/customer-360",
    tokens: salesConsoleLiveWorkItems.flatMap((item) => [item.contact, item.customer]),
    visibleToRoles: ["Sales Manager", "Admin / Owner"]
  }
];

export function searchSalesConsoleLiveExperience(query: string, role: SalesConsoleStaffRole) {
  return searchFederatedSalesRecords(query, salesConsoleLiveFederatedRecords, role);
}

export const salesConsoleLiveEvidenceValidation = validateSalesEvidenceUpload({
  fileName: "trade-photo.jpg",
  fileType: "image/jpeg",
  sizeBytes: 450_000,
  attachedSubjectType: "revenue-opportunity",
  attachedSubjectId: "REV-1001",
  category: "trade",
  uploadedByRole: "Salesperson",
  audit: liveAudit
});

export const salesConsoleLiveEvidenceRecord = createGuardedEvidenceRecord({
  fileName: "trade-photo.jpg",
  fileType: "image/jpeg",
  sizeBytes: 450_000,
  attachedSubjectType: "revenue-opportunity",
  attachedSubjectId: "REV-1001",
  category: "trade",
  uploadedByRole: "Salesperson",
  audit: liveAudit
}, "EVD-1001");

export const salesConsoleLiveActivityDecision = evaluateSalesActivityRecording({
  opportunityId: "REV-1001",
  action: "log call outcome",
  summary: "Customer confirmed arrival window and requested final numbers.",
  audit: liveAudit
});

export const salesConsoleLiveOutcomeDecision = evaluateSalesOutcomeRecording({
  opportunityId: "REV-1001",
  outcome: "nurture",
  reasonCode: "future-interest",
  sourceLink: "/sales?record=REV-1001",
  evidenceIds: salesConsoleLiveEvidenceRecord ? [salesConsoleLiveEvidenceRecord.id] : [],
  nextAction: "Follow up after customer reviews final numbers.",
  audit: liveAudit
});

export { salesConsoleInventoryAlternatives, salesConsoleDeliveryReadiness };
