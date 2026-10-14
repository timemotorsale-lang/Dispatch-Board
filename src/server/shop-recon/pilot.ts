import type { ShopReconStageCode } from "./foundation";

export const SHOP_RECON_PILOT_CONTRACT_VERSION = "shop-recon-pilot/v1.0.0";

export type ShopReconPilotScenario = {
  id: "CUSTOMER_STANDARD" | "INVENTORY_STANDARD";
  repairOrderNumber: string;
  label: string;
  workLane: "CUSTOMER_REPAIR" | "INVENTORY_RECON";
  objective: string;
  expectedHandoff: string;
  stageGroups: ReadonlyArray<{ id: string; label: string; fromStage: number; toStage: number }>;
  exceptionDrills: ReadonlyArray<{ id: string; label: string; expectedControl: string; stage: ShopReconStageCode }>;
};

const stageGroups = [
  { id: "ENTRY_CONTROL", label: "Entry, custody and safety", fromStage: 1, toStage: 4 },
  { id: "TECHNICAL_DISCOVERY", label: "Inspection, diagnosis and findings", fromStage: 5, toStage: 7 },
  { id: "PLAN_AUTHORITY", label: "Plan, authorization and readiness", fromStage: 8, toStage: 10 },
  { id: "EXECUTION", label: "Dispatch, repair and sign-off", fromStage: 11, toStage: 14 },
  { id: "QUALITY_HANDOFF", label: "QC, release and handoff", fromStage: 15, toStage: 16 },
] as const;

export const SHOP_RECON_PILOT_SCENARIOS: readonly ShopReconPilotScenario[] = [
  {
    id: "CUSTOMER_STANDARD",
    repairOrderNumber: "PILOT-CUST-001",
    label: "Customer Repair Pilot",
    workLane: "CUSTOMER_REPAIR",
    objective: "Prove the customer-authorization, promise, QC and advisor/customer handoff path on one governed vehicle card.",
    expectedHandoff: "Service advisor / customer",
    stageGroups,
    exceptionDrills: [
      { id: "CUSTOMER_DECLINE", label: "Declined or partial customer authorization", expectedControl: "The vehicle cannot advance until the exact current scope is authorized.", stage: "AUTHORIZATION" },
      { id: "SCOPE_CHANGE", label: "Changed scope during repair", expectedControl: "Affected work stops and loops through findings, plan, authorization and readiness.", stage: "REPAIR_EXECUTION" },
      { id: "QC_REWORK", label: "Failed QC or road test", expectedControl: "Release remains blocked and fresh repair completion plus QC are required.", stage: "QUALITY_CONTROL_ROAD_TEST" },
      { id: "KEY_MISMATCH", label: "Key-count mismatch at delivery", expectedControl: "Shop exit remains blocked until received and released keys reconcile.", stage: "VEHICLE_HANDOVER_SHOP_EXIT" },
    ],
  },
  {
    id: "INVENTORY_STANDARD",
    repairOrderNumber: "PILOT-INV-001",
    label: "Inventory Recon Pilot",
    workLane: "INVENTORY_RECON",
    objective: "Prove the inventory spending, two-bay capacity, repair, QC and Inventory lifecycle return path on one governed vehicle card.",
    expectedHandoff: "Inventory lifecycle",
    stageGroups,
    exceptionDrills: [
      { id: "PARTS_CONSTRAINT", label: "Required part not reserved", expectedControl: "Readiness and dispatch remain blocked while the Parts constraint is visible.", stage: "PARTS_RESOURCE_READINESS" },
      { id: "WIP_LIMIT", label: "Two-bay WIP limit reached", expectedControl: "The vehicle remains queued unless capacity clears or the General Manager records a governed exception.", stage: "DISPATCH_WORK_STAGING" },
      { id: "BAY_REASSIGNMENT", label: "Technician or bay reassignment", expectedControl: "The current authoritative dispatch must match Walter and the selected eligible bay.", stage: "DISPATCH_WORK_STAGING" },
      { id: "WRONG_HANDOFF", label: "Customer destination selected for inventory", expectedControl: "Shop exit rejects the wrong lane and requires Inventory lifecycle handoff.", stage: "VEHICLE_HANDOVER_SHOP_EXIT" },
    ],
  },
] as const;

export function getShopReconPilotScenario(repairOrderNumber: string) {
  return SHOP_RECON_PILOT_SCENARIOS.find(scenario => scenario.repairOrderNumber === repairOrderNumber) ?? null;
}

export function evaluateShopReconPilotProgress(scenario: ShopReconPilotScenario, currentStageOrder: number, operatingState: string) {
  return scenario.stageGroups.map(group => ({
    ...group,
    status: operatingState === "CLOSED" || currentStageOrder > group.toStage
      ? "COMPLETE" as const
      : currentStageOrder >= group.fromStage
        ? "IN_PROGRESS" as const
        : "PENDING" as const,
  }));
}
