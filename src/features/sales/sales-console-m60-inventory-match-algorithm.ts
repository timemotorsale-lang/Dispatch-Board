import type { SalesConsoleRevenueLaneName } from "./sales-console-operational-domain";

export type SalesInventoryMatchInput = {
  stockNumber: string;
  label: string;
  price: number;
  customerBudget: number;
  bodyStyleFit: "poor" | "okay" | "strong";
  readiness: "ready" | "needs-work" | "blocked";
  availability: "available" | "verify-first" | "unavailable";
  ageDays: number;
  marketPressure: "low" | "medium" | "high";
  grossPotential: "low" | "medium" | "high";
  financeFit: "poor" | "okay" | "strong";
  customerPreference: "unknown" | "acceptable" | "preferred";
  blockerCount: number;
  bhphEligible?: boolean;
  leaseToOwnEligible?: boolean;
  rentalEligible?: boolean;
  warrantyEligible?: boolean;
  serviceOpportunity?: boolean;
  financeProductFit?: "poor" | "okay" | "strong";
};

export type SalesInventoryMatchResult = {
  stockNumber: string;
  score: number;
  sellability: "primary" | "alternative" | "verify-first" | "blocked";
  blockerExplanation: string[];
  recommendedRevenueLanes: SalesConsoleRevenueLaneName[];
  laneRoutingExplanation: string[];
};

function routeInventoryRevenueLanes(vehicle: SalesInventoryMatchInput): Pick<SalesInventoryMatchResult, "recommendedRevenueLanes" | "laneRoutingExplanation"> {
  const recommendedRevenueLanes: SalesConsoleRevenueLaneName[] = [];
  const laneRoutingExplanation: string[] = [];

  if (vehicle.availability === "available" && vehicle.readiness === "ready") {
    recommendedRevenueLanes.push("Inventory Cash Sale");
    laneRoutingExplanation.push("cash sale eligible because vehicle is available and ready");
  }

  if (vehicle.bhphEligible && vehicle.financeFit !== "poor") {
    recommendedRevenueLanes.push("Inventory BHPH Sale");
    laneRoutingExplanation.push("BHPH signal present with acceptable finance fit");
  }

  if (vehicle.leaseToOwnEligible && vehicle.financeFit === "strong") {
    recommendedRevenueLanes.push("Inventory Lease-to-Own");
    laneRoutingExplanation.push("lease-to-own signal present with strong finance fit");
  }

  if (vehicle.serviceOpportunity) {
    recommendedRevenueLanes.push("Public Auto Repair");
    laneRoutingExplanation.push("service/repair opportunity connected to customer or vehicle need");
  }

  if (vehicle.rentalEligible && vehicle.availability !== "unavailable") {
    recommendedRevenueLanes.push("Daily Rental");
    laneRoutingExplanation.push("rental availability signal present");
  }

  if (vehicle.warrantyEligible) {
    recommendedRevenueLanes.push("Warranty Product");
    laneRoutingExplanation.push("warranty product eligibility signal present");
  }

  if (vehicle.financeProductFit === "strong" || vehicle.financeFit === "strong") {
    recommendedRevenueLanes.push("Financing Product");
    laneRoutingExplanation.push("finance product fit can support finance handoff context");
  }

  return {
    recommendedRevenueLanes: [...new Set(recommendedRevenueLanes)],
    laneRoutingExplanation
  };
}

export function scoreSalesInventoryMatch(vehicle: SalesInventoryMatchInput): SalesInventoryMatchResult {
  const explanations: string[] = [];
  let score = 0;

  const budgetDelta = vehicle.customerBudget - vehicle.price;
  if (budgetDelta >= 0) {
    score += 20;
    explanations.push("fits stated budget");
  } else if (Math.abs(budgetDelta) <= vehicle.customerBudget * 0.1) {
    score += 10;
    explanations.push("near stated budget");
  } else {
    score -= 15;
    explanations.push("outside stated budget");
  }

  score += vehicle.bodyStyleFit === "strong" ? 18 : vehicle.bodyStyleFit === "okay" ? 8 : -10;
  score += vehicle.readiness === "ready" ? 18 : vehicle.readiness === "needs-work" ? -5 : -25;
  score += vehicle.availability === "available" ? 15 : vehicle.availability === "verify-first" ? -5 : -30;
  score += vehicle.ageDays > 60 ? 10 : vehicle.ageDays > 30 ? 5 : 0;
  score += vehicle.marketPressure === "high" ? 8 : vehicle.marketPressure === "medium" ? 4 : 0;
  score += vehicle.grossPotential === "high" ? 8 : vehicle.grossPotential === "medium" ? 4 : 0;
  score += vehicle.financeFit === "strong" ? 14 : vehicle.financeFit === "okay" ? 6 : -12;
  score += vehicle.customerPreference === "preferred" ? 12 : vehicle.customerPreference === "acceptable" ? 5 : 0;
  score -= vehicle.blockerCount * 12;

  if (vehicle.blockerCount > 0) explanations.push(`${vehicle.blockerCount} blocker(s) require verification`);
  if (vehicle.readiness !== "ready") explanations.push("readiness must be verified");
  if (vehicle.availability !== "available") explanations.push("availability must be verified");

  const sellability =
    vehicle.readiness === "blocked" || vehicle.availability === "unavailable"
      ? "blocked"
      : vehicle.readiness !== "ready" || vehicle.availability === "verify-first" || vehicle.blockerCount > 0
        ? "verify-first"
        : score >= 70
          ? "primary"
          : "alternative";

  const laneRouting = routeInventoryRevenueLanes(vehicle);

  return { stockNumber: vehicle.stockNumber, score, sellability, blockerExplanation: explanations, ...laneRouting };
}

export function recommendSalesInventoryMatches(vehicles: SalesInventoryMatchInput[]) {
  return vehicles
    .map(scoreSalesInventoryMatch)
    .sort((first, second) => second.score - first.score || first.stockNumber.localeCompare(second.stockNumber));
}
