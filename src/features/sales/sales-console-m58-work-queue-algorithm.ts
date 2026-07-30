import type { SalesConsoleFreshness, SalesConsoleRevenueLaneName } from "./sales-console-operational-domain";

export type SalesWorkQueueInput = {
  id: string;
  leadAgeMinutes: number;
  firstResponseMinutes?: number;
  appointmentStartsInMinutes?: number;
  customerIntent: "low" | "medium" | "high";
  revenueLane: SalesConsoleRevenueLaneName;
  vehicleAvailability: "available" | "verify-first" | "blocked" | "unavailable";
  blockerSeverity: "none" | "watch" | "risk" | "blocked";
  nextActionStaleMinutes: number;
  managerPriority: boolean;
  sourceFreshness: SalesConsoleFreshness;
  taskSlaRisk?: "none" | "watch" | "breach";
  revenueAmount?: number;
};

export type SalesWorkQueueGroup = "Must Do Now" | "Today" | "Waiting" | "Manager Review" | "Blocked" | "Watch";

export type SalesWorkQueueRanking = {
  id: string;
  score: number;
  componentScores: {
    revenueOpportunity: number;
    urgency: number;
    customerIntent: number;
    inventoryReadiness: number;
    appointmentTiming: number;
    taskSlaRisk: number;
    managerReviewPriority: number;
    sourceFreshnessPenalty: number;
    blockerSeverity: number;
  };
  group: SalesWorkQueueGroup;
  rankingReasons: string[];
  nextBestAction: string;
};

const laneWeight: Record<SalesConsoleRevenueLaneName, number> = {
  "Inventory Cash Sale": 18,
  "Inventory BHPH Sale": 20,
  "Inventory Lease-to-Own": 19,
  "Public Auto Repair": 12,
  "Daily Rental": 11,
  "Warranty Product": 10,
  "Financing Product": 15
};

export function rankSalesWorkQueueItem(input: SalesWorkQueueInput): SalesWorkQueueRanking {
  const reasons: string[] = [];
  const revenueOpportunity = laneWeight[input.revenueLane] + (input.revenueAmount ? Math.min(12, Math.floor(input.revenueAmount / 5000)) : 0);
  let urgency = 0;
  let customerIntent = 0;
  let inventoryReadiness = 0;
  let appointmentTiming = 0;
  let taskSlaRisk = 0;
  let managerReviewPriority = 0;
  let sourceFreshnessPenalty = 0;
  let blockerSeverity = 0;

  if (input.leadAgeMinutes <= 15) {
    urgency += 18;
    reasons.push("new lead needs fast response");
  } else if (input.leadAgeMinutes > 240) {
    urgency += 8;
    reasons.push("aging lead needs recovery");
  }

  if (input.firstResponseMinutes !== undefined && input.firstResponseMinutes > 30) {
    urgency += 18;
    reasons.push("first response SLA at risk");
  }

  if (input.appointmentStartsInMinutes !== undefined && input.appointmentStartsInMinutes >= 0 && input.appointmentStartsInMinutes <= 120) {
    appointmentTiming += 16;
    reasons.push("appointment window is near");
  }

  if (input.customerIntent === "high") {
    customerIntent += 15;
    reasons.push("high customer intent");
  } else if (input.customerIntent === "medium") {
    customerIntent += 8;
  }

  if (input.vehicleAvailability === "available") {
    inventoryReadiness += 8;
    reasons.push("vehicle is available");
  } else if (input.vehicleAvailability === "blocked" || input.vehicleAvailability === "unavailable") {
    inventoryReadiness -= 15;
    reasons.push("vehicle availability blocker");
  }

  if (input.blockerSeverity === "blocked") {
    blockerSeverity += 20;
    reasons.push("blocked work needs unblock owner");
  } else if (input.blockerSeverity === "risk") {
    blockerSeverity += 12;
    reasons.push("risk blocker needs attention");
  }

  if (input.nextActionStaleMinutes > 60) {
    urgency += 12;
    reasons.push("next action is stale");
  }

  if (input.taskSlaRisk === "breach") {
    taskSlaRisk += 18;
    reasons.push("task or promise SLA breach");
  } else if (input.taskSlaRisk === "watch") {
    taskSlaRisk += 9;
    reasons.push("task or promise SLA watch");
  }

  if (input.managerPriority) {
    managerReviewPriority += 20;
    reasons.push("manager priority");
  }

  if (input.sourceFreshness === "stale" || input.sourceFreshness === "unavailable") {
    sourceFreshnessPenalty -= 10;
    reasons.push("verify source freshness first");
  }

  const score =
    revenueOpportunity +
    urgency +
    customerIntent +
    inventoryReadiness +
    appointmentTiming +
    taskSlaRisk +
    managerReviewPriority +
    sourceFreshnessPenalty +
    blockerSeverity;
  const group =
    input.blockerSeverity === "blocked"
      ? "Blocked"
      : input.sourceFreshness === "stale" || input.sourceFreshness === "unavailable" || input.vehicleAvailability === "verify-first"
        ? "Waiting"
        : score >= 75
          ? "Must Do Now"
          : input.managerPriority
            ? "Manager Review"
            : score >= 45
              ? "Today"
              : "Watch";
  const nextBestAction =
    input.blockerSeverity === "blocked"
      ? "Find blocker owner and request missing evidence"
      : group === "Manager Review"
        ? "Open Manager Command and review decision context"
      : input.firstResponseMinutes && input.firstResponseMinutes > 30
        ? "Respond now and log outcome"
        : input.appointmentStartsInMinutes !== undefined && input.appointmentStartsInMinutes <= 120
          ? "Confirm appointment and prepare vehicle/customer context"
          : "Open Revenue Desk and complete next action";

  return {
    id: input.id,
    score,
    componentScores: {
      revenueOpportunity,
      urgency,
      customerIntent,
      inventoryReadiness,
      appointmentTiming,
      taskSlaRisk,
      managerReviewPriority,
      sourceFreshnessPenalty,
      blockerSeverity
    },
    group,
    rankingReasons: reasons,
    nextBestAction
  };
}

export function rankSalesWorkQueue(items: SalesWorkQueueInput[]) {
  return items
    .map(rankSalesWorkQueueItem)
    .sort((first, second) => second.score - first.score || first.id.localeCompare(second.id));
}
