import type { SalesConsoleBlocker, SalesConsoleFreshness } from "./sales-console-operational-domain";

export type SalesInventorySourceRecord = {
  vehicleId: string;
  stockNumber: string;
  vin?: string;
  label: string;
  availability: "available" | "in-recon" | "sold" | "unknown";
  readiness: "frontline-ready" | "needs-detail" | "needs-service" | "title-blocked" | "unknown";
  ageDays: number;
  pricingPosture: "market-aligned" | "verify-first" | "needs-manager-review" | "unavailable";
  blockers: SalesConsoleBlocker[];
  sourceRoute: string;
  updatedAt: string;
};

export type SalesInventoryViewModel = {
  id: string;
  stockNumber: string;
  vinLabel: string;
  vehicleLabel: string;
  availabilityLabel: string;
  readinessLabel: string;
  ageLabel: string;
  pricingSourceLabel: string;
  blockers: SalesConsoleBlocker[];
  sourceVehicleLink: string;
  freshness: SalesConsoleFreshness;
  sellability: "sellable" | "verify-first" | "blocked" | "unavailable";
  vehicleHoldEnabled: false;
  reservationEnabled: false;
};

export const salesInventoryIntegration = {
  sourceOwner: "Inventory / Vehicles",
  readRoutes: ["/inventory", "/vehicles", "/api/vehicles", "/api/inventory-control-tower"],
  governedWrites: ["vehicle hold", "vehicle reservation", "pricing change"],
  allowedSalesConsoleActions: ["view vehicle", "compare alternatives", "log vehicle shown"]
} as const;

export function mapSalesInventoryVehicle(source: SalesInventorySourceRecord, now = new Date()): SalesInventoryViewModel {
  const ageMs = now.getTime() - new Date(source.updatedAt).getTime();
  const freshness: SalesConsoleFreshness = ageMs > 1000 * 60 * 60 * 4 ? "stale" : "current";
  const blocked = source.blockers.some((blocker) => blocker.severity === "blocked");
  const sellability =
    source.availability === "sold"
      ? "unavailable"
      : blocked || source.readiness === "title-blocked"
        ? "blocked"
        : source.pricingPosture === "verify-first" || source.readiness !== "frontline-ready"
          ? "verify-first"
          : "sellable";

  return {
    id: source.vehicleId,
    stockNumber: source.stockNumber,
    vinLabel: source.vin ? source.vin : "VIN hidden or unavailable",
    vehicleLabel: source.label,
    availabilityLabel: source.availability,
    readinessLabel: source.readiness,
    ageLabel: `${source.ageDays} days`,
    pricingSourceLabel: source.pricingPosture,
    blockers: source.blockers,
    sourceVehicleLink: source.sourceRoute,
    freshness,
    sellability,
    vehicleHoldEnabled: false,
    reservationEnabled: false
  };
}

export function salesInventoryHoldGuardrailsRemainDisabled(viewModel: SalesInventoryViewModel) {
  return viewModel.vehicleHoldEnabled === false && viewModel.reservationEnabled === false;
}
