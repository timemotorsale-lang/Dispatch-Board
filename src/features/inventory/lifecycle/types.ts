export type InventoryLifecycleStageKey =
  | "ACQUISITION"
  | "TRANSPORTATION"
  | "RECEIVING"
  | "INTAKE"
  | "INSPECTION"
  | "INITIAL_QC"
  | "WORK_ORDER"
  | "RECON_REPAIR"
  | "FINAL_QC"
  | "DETAILING"
  | "PHOTOS_MARKETING"
  | "TITLE_READINESS"
  | "SELLING"
  | "SALE_TITLING"
  | "FILING"
  | "POST_SALE";

export type InventoryLifecycleUnitContext = {
  inventoryUnitId: string;
  inventoryNumber: string;
  canonicalVehicleId: string;
  vehicleLabel: string;
  vin: string;
  location: string;
  custody: string;
  targetFrontlineDate: string;
  safetyState: string;
  titleState: string;
  accountableOwner: string;
  currentStageLabel: string;
  currentStageStatus: string;
  returnHref: string;
};

export type InventoryLifecycleStageSnapshot = {
  key: InventoryLifecycleStageKey;
  label: string;
  stageIndex: number;
  completedActions: number;
  totalActions: number;
  blockerCount: number;
  trailCount: number;
  recommendation: string;
  readyForHandoff: boolean;
  status: "NOT_STARTED" | "IN_PROGRESS" | "READY" | "BLOCKED";
  evidenceItems: InventoryLifecycleEvidenceItem[];
  handoff: InventoryLifecycleHandoffPacket;
  lastUpdatedLabel: string;
  workTrail: InventoryLifecycleTrailEntry[];
};

export type InventoryLifecycleEvidenceItem = {
  actionTitle: string;
  evidenceLabel: string;
  owner: string;
  state: "COMPLETE" | "PENDING" | "BLOCKED";
};

export type InventoryLifecycleTrailEntry = {
  actor: string;
  detail: string;
  evidenceLabel: string;
  label: string;
  state: "RECORDED" | "NEEDS_ATTENTION";
};

export type InventoryLifecycleHandoffPacket = {
  blockerSummary: string;
  nextStageLabel: string;
  readinessLabel: string;
  summary: string;
};

export type InventoryLifecycleHistoryEntry = {
  description: string;
  evidenceLabels: string[];
  handoffSummary: string;
  label: string;
  stageIndex: number;
  stageLabel: string;
  status: InventoryLifecycleStageSnapshot["status"];
  trailCount: number;
};
