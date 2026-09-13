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
  customerId: string;
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
  componentScores: ReturnType<typeof rankSalesWorkQueue>[number]["componentScores"];
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
  laneRoutingExplanation: string[];
  sourceVehicleLink: string;
};

export type SalesConsoleLiveManagerQueue = {
  title: string;
  count: string;
  drilldowns: string[];
  algorithmSource: string;
};

export type SalesConsoleGuidedPathFactStatus = "Ready" | "Needs Review" | "Blocked" | "Source Missing";

export type SalesConsoleGuidedPathStepStatus = "Complete" | "Current" | "Locked";

export type SalesConsoleLifecycleStage = "Customer" | "Prospect" | "Lead" | "Qualified Opportunity / Deal" | "Sold / Lost";

export type SalesConsoleGuidedPath = {
  customer: string;
  revenueLane: SalesConsoleRevenueLaneName;
  lifecycleStage: SalesConsoleLifecycleStage;
  sourceSystem: string;
  relationshipContract: {
    truthWorkspace: string;
    executionWorkspace: string;
    integrationPattern: string;
    writeBackRule: string;
  };
  workbenchTitle: string;
  workbenchInstruction: string;
  requiredFacts: Array<{
    label: string;
    value: string;
    status: SalesConsoleGuidedPathFactStatus;
    source: string;
  }>;
  lifecycleSteps: Array<{
    label: SalesConsoleLifecycleStage;
    status: SalesConsoleGuidedPathStepStatus;
    meaning: string;
    unlocks: string;
  }>;
  emphasizedAction: string;
  reason: string;
  staffDecision: string;
  nextStep: string;
  primaryTool: {
    label: string;
    behavior: string;
    state: SalesConsoleLiveActionState;
    href: string;
  };
  executionTools: Array<{
    label: string;
    category: "Action" | "Source";
    purpose: string;
    source: string;
    state: SalesConsoleLiveActionState;
    href: string;
    enabled: boolean;
    disabledReason?: string;
  }>;
  outcomeOptions: Array<{
    label: string;
    result: string;
  }>;
  outcomeWriteBackTarget: string;
  returnLinks: Array<{
    label: string;
    href: string;
  }>;
  truthStatus: Array<{
    label: string;
    status: string;
  }>;
  collapsedTools: string[];
  writeBackBehavior: string;
  activityPolicy: string;
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
    customerId: "john-smith",
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
      sourceFreshness: "current",
      taskSlaRisk: "watch",
      revenueAmount: 26500
    } satisfies SalesWorkQueueInput
  },
  {
    id: "REV-1002",
    customerId: "maria-garcia",
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
      sourceFreshness: "current",
      taskSlaRisk: "watch",
      revenueAmount: 19000
    } satisfies SalesWorkQueueInput
  },
  {
    id: "REV-1003",
    customerId: "alex-johnson",
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
      sourceFreshness: "current",
      taskSlaRisk: "none",
      revenueAmount: 26900
    } satisfies SalesWorkQueueInput
  },
  {
    id: "REV-1004",
    customerId: "samantha-lee",
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
      sourceFreshness: "current",
      taskSlaRisk: "breach",
      revenueAmount: 18000
    } satisfies SalesWorkQueueInput
  },
  {
    id: "REV-1005",
    customerId: "david-brown",
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
      sourceFreshness: "stale",
      taskSlaRisk: "watch",
      revenueAmount: 1800
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
    customerId: source.customerId,
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
    reason: source.businessReason,
    action: source.action,
    actionState: source.actionState,
    algorithmScore: ranking.score,
    algorithmReasons: ranking.rankingReasons,
    componentScores: ranking.componentScores
  };
});

const lifecycleOrder: SalesConsoleLifecycleStage[] = [
  "Customer",
  "Prospect",
  "Lead",
  "Qualified Opportunity / Deal",
  "Sold / Lost"
];

const lifecycleDefinitions: Record<SalesConsoleLifecycleStage, { meaning: string; unlocks: string }> = {
  "Customer": {
    meaning: "Person or business exists in the customer source of truth.",
    unlocks: "Customer 360, contact methods, notes, and activity timeline."
  },
  "Prospect": {
    meaning: "Customer has buying or revenue intent but is not yet qualified.",
    unlocks: "Lead source, interest, urgency, and first follow-up."
  },
  "Lead": {
    meaning: "There is active staff work to qualify need, timing, and next step.",
    unlocks: "Appointment, task, quote preparation, or lane-specific checklist."
  },
  "Qualified Opportunity / Deal": {
    meaning: "Required facts support a real revenue opportunity.",
    unlocks: "Revenue Desk, deal tools, manager review, source-owned handoffs."
  },
  "Sold / Lost": {
    meaning: "The opportunity is closed with a verified outcome.",
    unlocks: "Delivery, post-sale execution, lost reason, or reactivation path."
  }
};

const laneSpecificFactLabels: Record<SalesConsoleRevenueLaneName, string[]> = {
  "Inventory Cash Sale": ["Vehicle fit", "Trade or payment readiness", "Price path", "Closing blocker"],
  "Inventory BHPH Sale": ["Proof checklist", "Compliance blocker", "Finance readiness", "Manager review"],
  "Inventory Lease-to-Own": ["Term structure", "Payment structure", "Approval readiness", "Contract blocker"],
  "Public Auto Repair": ["Estimate status", "Authorization status", "Appointment readiness", "Repair follow-up"],
  "Daily Rental": ["Rental window", "Vehicle availability", "Checkout readiness", "Return follow-up"],
  "Warranty Product": ["Eligibility", "Authorization", "Required documents", "Product review"],
  "Financing Product": ["Credit application", "Missing finance facts", "Document handoff", "Product readiness"]
};

const lanePrimaryTools: Record<SalesConsoleRevenueLaneName, string> = {
  "Inventory Cash Sale": "Open Revenue Desk",
  "Inventory BHPH Sale": "Collect Proof",
  "Inventory Lease-to-Own": "Review Terms",
  "Public Auto Repair": "Open Repair Follow-up",
  "Daily Rental": "Check Rental Availability",
  "Warranty Product": "Check Warranty Eligibility",
  "Financing Product": "Continue Finance App"
};

const laneOutcomeOptions: Record<SalesConsoleRevenueLaneName, string[]> = {
  "Inventory Cash Sale": ["Appointment confirmed", "Customer needs follow-up", "Vehicle blocker found", "Ready for close review"],
  "Inventory BHPH Sale": ["Proof requested", "Proof received", "Compliance blocker", "Manager review needed"],
  "Inventory Lease-to-Own": ["Terms reviewed", "Customer needs follow-up", "Approval blocker", "Ready for manager review"],
  "Public Auto Repair": ["Estimate reviewed", "Appointment set", "Customer declined", "Needs repair follow-up"],
  "Daily Rental": ["Availability confirmed", "Reservation follow-up", "Checkout blocker", "Return reminder needed"],
  "Warranty Product": ["Eligibility confirmed", "Documents requested", "Authorization blocker", "Customer declined"],
  "Financing Product": ["Application continued", "Documents requested", "Finance blocker", "Product declined"]
};

function getLifecycleStage(item: SalesConsoleLiveWorkItem): SalesConsoleLifecycleStage {
  if (["Proposal", "Structure", "Compliance"].includes(item.stage)) return "Qualified Opportunity / Deal";
  if (["Credit App", "Estimate"].includes(item.stage)) return "Lead";
  if (item.source === "Walk-in" || item.source === "Referral") return "Prospect";
  return "Customer";
}

function buildLifecycleSteps(stage: SalesConsoleLifecycleStage) {
  const currentIndex = lifecycleOrder.indexOf(stage);

  return lifecycleOrder.map((label, index) => ({
    label,
    status: index < currentIndex ? "Complete" as const : index === currentIndex ? "Current" as const : "Locked" as const,
    meaning: lifecycleDefinitions[label].meaning,
    unlocks: lifecycleDefinitions[label].unlocks
  }));
}

function salesWorkbenchCrmActionHref(actionId: string, customerId: string) {
  return `/crm-next/actions/${actionId}?customerId=${encodeURIComponent(customerId)}`;
}

function salesWorkbenchCustomer360Href(customerId: string) {
  return `/customers/customer-360?customer=${encodeURIComponent(customerId)}&returnTo=%2Fsales`;
}

function salesWorkbenchCrmCustomerHref(customerId: string) {
  return `/crm-next/customers/${encodeURIComponent(customerId)}`;
}

function salesWorkbenchVehicleHref(stock: string) {
  return `/vehicles/360/${encodeURIComponent(stock)}?returnTo=%2Fsales`;
}

function salesWorkbenchManagerReviewHref(item: SalesConsoleLiveWorkItem) {
  return `/manager-review?source=sales-workbench&customerId=${encodeURIComponent(item.customerId)}&dealId=${encodeURIComponent(item.stock)}&returnTo=%2Fsales`;
}

function describeOutcomeResult(option: string) {
  const normalized = option.toLowerCase();
  if (normalized.includes("follow-up") || normalized.includes("reminder")) {
    return "Writes the outcome to Customer 360, then staff can create the needed CRM task or reminder.";
  }
  if (normalized.includes("blocker") || normalized.includes("proof") || normalized.includes("documents")) {
    return "Writes the blocker to Customer 360 and keeps the record in review until the missing item is handled.";
  }
  if (normalized.includes("manager") || normalized.includes("close review")) {
    return "Writes the readiness note to Customer 360 and opens the path for manager or revenue review.";
  }
  if (normalized.includes("appointment") || normalized.includes("availability")) {
    return "Writes the confirmed customer step to Customer 360 and keeps appointment context available.";
  }
  if (normalized.includes("declined")) {
    return "Writes the declined result to Customer 360 so the next staff member does not chase a made-up open item.";
  }
  return "Writes the verified result to Customer 360 activity.";
}

export function buildSalesConsoleGuidedPath(item: SalesConsoleLiveWorkItem): SalesConsoleGuidedPath {
  const laneContract = getRevenueLaneContract(item.contractLane);
  const lifecycleStage = getLifecycleStage(item);
  const laneFacts = laneSpecificFactLabels[item.contractLane];
  const blockerLabel = item.blockers.length ? item.blockers.join(", ") : "Clear";
  const sourceSystem = laneContract?.sourceOwners.join(", ") ?? item.source;
  const managerReviewEnabled =
    item.actionState === "Controlled Action" ||
    item.blockers.length > 0 ||
    item.algorithmReasons.some((reason) => /manager/i.test(reason));

  const requiredFacts: SalesConsoleGuidedPath["requiredFacts"] = [
    { label: "Customer context", value: item.customer, status: "Ready", source: "Customer 360" },
    { label: "Contact method", value: item.contact, status: "Ready", source: "CRM contact record" },
    { label: "Revenue lane", value: item.contractLane, status: "Ready", source: "Sales Console lane registry" },
    { label: "Lifecycle stage", value: lifecycleStage, status: "Ready", source: "CRM lifecycle dictionary" },
    { label: "Selected product", value: item.vehicle, status: "Ready", source: "Inventory / opportunity source" },
    { label: laneFacts[0], value: item.stage, status: item.stage ? "Ready" : "Source Missing", source: sourceSystem },
    { label: laneFacts[1], value: blockerLabel, status: item.blockers.length ? "Needs Review" : "Ready", source: sourceSystem },
    { label: laneFacts[2], value: item.nextAction, status: item.nextAction ? "Ready" : "Source Missing", source: "Sales work queue algorithm" },
    { label: laneFacts[3], value: item.actionState, status: item.actionState === "Future / Governed" ? "Blocked" : "Ready", source: "Action registry" }
  ];

  return {
    customer: item.customer,
    revenueLane: item.contractLane,
    lifecycleStage,
    sourceSystem,
    relationshipContract: {
      truthWorkspace: "Customer 360 is the customer record, history, notes, tasks, appointments, documents, consent, and activity truth.",
      executionWorkspace: "Sales Workbench is the selling action space: choose the next revenue step, use the tools, and finish with an outcome.",
      integrationPattern: "Sales Workbench reads Customer 360 truth before action and sends verified outcomes back after action.",
      writeBackRule: "Do not create Customer 360 activity until the selected outcome command succeeds or is clearly marked pending."
    },
    workbenchTitle: `${item.customer} Sales Workbench`,
    workbenchInstruction: "Do the current step here, use only the tools needed, then capture the result before moving on.",
    requiredFacts,
    lifecycleSteps: buildLifecycleSteps(lifecycleStage),
    emphasizedAction: item.nextAction,
    reason: item.algorithmReasons.join("; "),
    staffDecision: item.blockers.length ? `Resolve or acknowledge ${blockerLabel} before advancing.` : "Confirm the customer result before moving forward.",
    nextStep: item.action,
    primaryTool: {
      label: lanePrimaryTools[item.contractLane],
      behavior: item.action,
      state: item.actionState,
      href: `/sales?workspace=revenue-desk&lane=${encodeURIComponent(item.contractLane)}&customerId=${encodeURIComponent(item.customerId)}`
    },
    executionTools: [
      { label: "Call", category: "Action", purpose: "Reach the customer now.", source: "CRM contact record", state: "Controlled Action", href: salesWorkbenchCrmActionHref("log-call", item.customerId), enabled: true },
      { label: "SMS", category: "Action", purpose: "Send a short follow-up where consent permits.", source: "CRM consent and contact record", state: "Controlled Action", href: salesWorkbenchCrmActionHref("send-text", item.customerId), enabled: true },
      { label: "Email", category: "Action", purpose: "Send documents or appointment details where available.", source: "CRM consent and contact record", state: "Controlled Action", href: salesWorkbenchCrmActionHref("send-email", item.customerId), enabled: true },
      { label: "Note", category: "Action", purpose: "Add a staff update to the customer timeline.", source: "Customer 360 notes", state: "Controlled Action", href: salesWorkbenchCrmActionHref("add-note", item.customerId), enabled: true },
      { label: "Task", category: "Action", purpose: "Create or review follow-up work when outcome capture requires it.", source: "Tasks", state: "Controlled Action", href: salesWorkbenchCrmActionHref("new-task", item.customerId), enabled: true },
      { label: "Docs", category: "Action", purpose: "Collect evidence or missing proof for this lane.", source: "Document / evidence intake", state: item.blockers.length ? "Controlled Action" : "Future / Governed", href: salesWorkbenchCrmActionHref("upload-document", item.customerId), enabled: true },
      { label: "Appointment", category: "Source", purpose: "Open appointment context and readiness.", source: "Appointment Console", state: "Source-System Action", href: salesWorkbenchCrmActionHref("schedule-appointment", item.customerId), enabled: true },
      { label: "Customer 360", category: "Source", purpose: "Review history, notes, and activity truth.", source: "Customer 360", state: "Source-System Action", href: salesWorkbenchCustomer360Href(item.customerId), enabled: true },
      { label: "Vehicle", category: "Source", purpose: "Check vehicle readiness and inventory context.", source: "Vehicle 360 / Inventory", state: "Source-System Action", href: salesWorkbenchVehicleHref(item.stock), enabled: true },
      {
        label: "Manager Review",
        category: "Source",
        purpose: "Use only when rules or blockers require manager help.",
        source: "Manager review rules",
        state: managerReviewEnabled ? "Controlled Action" : "Future / Governed",
        href: salesWorkbenchManagerReviewHref(item),
        enabled: managerReviewEnabled,
        disabledReason: managerReviewEnabled ? undefined : "Manager Review opens only when blockers or manager-review rules require it."
      }
    ],
    outcomeOptions: laneOutcomeOptions[item.contractLane].map((option) => ({ label: option, result: describeOutcomeResult(option) })),
    outcomeWriteBackTarget: `/api/crm/v1/customers/${encodeURIComponent(item.customerId)}/notes`,
    returnLinks: [
      { label: "Back to Customer 360", href: salesWorkbenchCustomer360Href(item.customerId) },
      { label: "Back to CRM Workspace", href: salesWorkbenchCrmCustomerHref(item.customerId) },
      { label: "Back to Sales Home", href: "/sales" }
    ],
    truthStatus: [
      { label: "Customer 360", status: "live" },
      { label: "Task write-back", status: "live" },
      { label: "Outcome write-back", status: "live" },
      { label: "Manager review", status: managerReviewEnabled ? "available" : "rule-gated" }
    ],
    collapsedTools: [
      "Customer 360",
      "Vehicle 360",
      "Source record links",
      "Evidence intake",
      "Outcome capture",
      "Manager review when rules require it"
    ],
    writeBackBehavior: "Customer 360 activity is written only after an approved outcome command succeeds.",
    activityPolicy: "Do not show canned activity. If no verified activity exists, show a no-recorded-activity message."
  };
}

export const salesConsoleUnifiedRevenueCommandQueueHealth = {
  sourceDomains: [
    "Customer 360",
    "Lead Pipeline",
    "Inventory",
    "Appointments",
    "Tasks / My Tasks",
    "Rental",
    "Service",
    "Finance",
    "Warranty",
    "Sales Console"
  ],
  groups: [...new Set(salesConsoleLiveWorkItems.map((item) => item.group))],
  guardedActions: [
    "customer messaging",
    "quote submission",
    "vehicle holds/reservations",
    "finance decisions",
    "discount approvals"
  ],
  managerReviewOnlySubmitWorkflow: true
} as const;

export function salesConsoleUnifiedQueueCoversOperatingBrain() {
  return (
    salesConsoleUnifiedRevenueCommandQueueHealth.sourceDomains.length >= 9 &&
    salesConsoleLiveWorkItems.every((item) => item.algorithmScore >= 0 && item.algorithmReasons.length > 0) &&
    salesConsoleLiveWorkItems.some((item) => item.group === "Must Do Now") &&
    salesConsoleLiveWorkItems.some((item) => item.group === "Blocked" || item.group === "Waiting") &&
    salesConsoleUnifiedRevenueCommandQueueHealth.managerReviewOnlySubmitWorkflow
  );
}

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
  blockerCount: vehicle.blocker === "Clear" ? 0 : 1,
  bhphEligible: vehicle.revenueLaneSignals.includes("Inventory BHPH Sale"),
  leaseToOwnEligible: vehicle.revenueLaneSignals.includes("Inventory Lease-to-Own"),
  rentalEligible: vehicle.revenueLaneSignals.includes("Daily Rental"),
  warrantyEligible: vehicle.revenueLaneSignals.includes("Warranty Product"),
  serviceOpportunity: vehicle.revenueLaneSignals.includes("Public Auto Repair"),
  financeProductFit: vehicle.revenueLaneSignals.includes("Financing Product") ? "strong" : "okay"
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
    revenueLaneSignals: score?.recommendedRevenueLanes ?? vehicle.revenueLaneSignals,
    laneRoutingExplanation: score?.laneRoutingExplanation ?? [],
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
