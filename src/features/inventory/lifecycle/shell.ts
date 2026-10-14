import type { InventoryLifecycleHistoryEntry, InventoryLifecycleStageSnapshot, InventoryLifecycleUnitContext } from "./types";

export function buildInventoryLifecycleHref(inventoryUnitId?: string | null, stage?: number) {
  const params = new URLSearchParams();
  if (inventoryUnitId) params.set("inventoryUnitId", inventoryUnitId);
  if (typeof stage === "number" && Number.isFinite(stage)) params.set("guidedStage", String(stage));
  const query = params.toString();
  return query ? `/vehicles/inventory?${query}` : "/vehicles/inventory";
}

export function withLifecycleReturnTo(href: string, inventoryUnitId?: string | null, stage?: number) {
  const returnTo = buildInventoryLifecycleHref(inventoryUnitId, stage);
  const url = new URL(href, "http://inventory-lifecycle.local");
  url.searchParams.set("returnTo", returnTo);
  return `${url.pathname}${url.search}`;
}

export function defaultLifecycleUnitContext(): InventoryLifecycleUnitContext {
  return {
    inventoryUnitId: "iu-rav4-xle-sample",
    inventoryNumber: "333586",
    canonicalVehicleId: "VEH-436ED525",
    vehicleLabel: "2024 Toyota RAV4 XLE",
    vin: "2T3W1RFVXRW333586",
    location: "Minneapolis recon staging",
    custody: "Accepted | 2 keys",
    targetFrontlineDate: "August 5, 2026",
    safetyState: "VIN verification pending",
    titleState: "Source documents received",
    accountableOwner: "Alex Carter",
    currentStageLabel: "Acquisition",
    currentStageStatus: "Active",
    returnHref: "/vehicles/inventory",
  };
}

export function buildLifecycleUnitContext(input?: Partial<InventoryLifecycleUnitContext> | null): InventoryLifecycleUnitContext {
  return { ...defaultLifecycleUnitContext(), ...(input ?? {}) };
}

export function summarizeLifecycleHistory(snapshots: InventoryLifecycleStageSnapshot[]): InventoryLifecycleHistoryEntry[] {
  return snapshots
    .filter((snapshot) => snapshot.trailCount > 0 || snapshot.completedActions > 0 || snapshot.blockerCount > 0)
    .map((snapshot) => ({
      description:
        snapshot.status === "READY"
          ? `${snapshot.completedActions}/${snapshot.totalActions} actions complete. ${snapshot.handoff.summary}`
          : snapshot.status === "BLOCKED"
            ? `${snapshot.blockerCount} blocker${snapshot.blockerCount === 1 ? "" : "s"} still need ownership. ${snapshot.handoff.blockerSummary}`
            : `${snapshot.completedActions}/${snapshot.totalActions} actions complete with ${snapshot.trailCount} trail entr${snapshot.trailCount === 1 ? "y" : "ies"}. Next: ${snapshot.handoff.readinessLabel}.`,
      evidenceLabels: snapshot.evidenceItems
        .filter((item) => item.state === "COMPLETE")
        .map((item) => item.evidenceLabel)
        .slice(0, 4),
      handoffSummary: snapshot.handoff.summary,
      label: snapshot.recommendation,
      stageIndex: snapshot.stageIndex,
      stageLabel: snapshot.label,
      status: snapshot.status,
      trailCount: snapshot.trailCount,
    }))
    .reverse();
}
