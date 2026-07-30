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
};

export type SalesWorkQueueGroup = "Must Do Now" | "Today" | "Waiting" | "Watch";

export type SalesWorkQueueRanking = {
  id: string;
  score: number;
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
  let score = laneWeight[input.revenueLane];

  if (input.leadAgeMinutes <= 15) {
    score += 18;
    reasons.push("new lead needs fast response");
  } else if (input.leadAgeMinutes > 240) {
    score += 8;
    reasons.push("aging lead needs recovery");
  }

  if (input.firstResponseMinutes !== undefined && input.firstResponseMinutes > 30) {
    score += 18;
    reasons.push("first response SLA at risk");
  }

  if (input.appointmentStartsInMinutes !== undefined && input.appointmentStartsInMinutes >= 0 && input.appointmentStartsInMinutes <= 120) {
    score += 16;
    reasons.push("appointment window is near");
  }

  if (input.customerIntent === "high") {
    score += 15;
    reasons.push("high customer intent");
  } else if (input.customerIntent === "medium") {
    score += 8;
  }

  if (input.vehicleAvailability === "available") {
    score += 8;
    reasons.push("vehicle is available");
  } else if (input.vehicleAvailability === "blocked" || input.vehicleAvailability === "unavailable") {
    score -= 15;
    reasons.push("vehicle availability blocker");
  }

  if (input.blockerSeverity === "blocked") {
    score += 20;
    reasons.push("blocked work needs unblock owner");
  } else if (input.blockerSeverity === "risk") {
    score += 12;
    reasons.push("risk blocker needs attention");
  }

  if (input.nextActionStaleMinutes > 60) {
    score += 12;
    reasons.push("next action is stale");
  }

  if (input.managerPriority) {
    score += 20;
    reasons.push("manager priority");
  }

  if (input.sourceFreshness === "stale" || input.sourceFreshness === "unavailable") {
    score -= 10;
    reasons.push("verify source freshness first");
  }

  const group = input.blockerSeverity === "blocked" ? "Waiting" : score >= 70 ? "Must Do Now" : score >= 45 ? "Today" : "Watch";
  const nextBestAction =
    input.blockerSeverity === "blocked"
      ? "Find blocker owner and request missing evidence"
      : input.firstResponseMinutes && input.firstResponseMinutes > 30
        ? "Respond now and log outcome"
        : input.appointmentStartsInMinutes !== undefined && input.appointmentStartsInMinutes <= 120
          ? "Confirm appointment and prepare vehicle/customer context"
          : "Open Revenue Desk and complete next action";

  return { id: input.id, score, group, rankingReasons: reasons, nextBestAction };
}

export function rankSalesWorkQueue(items: SalesWorkQueueInput[]) {
  return items
    .map(rankSalesWorkQueueItem)
    .sort((first, second) => second.score - first.score || first.id.localeCompare(second.id));
}
