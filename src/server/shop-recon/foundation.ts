export const SHOP_RECON_FOUNDATION_VERSION = "shop-recon/foundation/1.0.0" as const;
export const SHOP_RECON_TIME_ZONE = "America/Chicago" as const;

export const SHOP_RECON_OPERATING_STATES = [
  "ACTIVE",
  "WAITING",
  "BLOCKED",
  "PAUSED",
  "REWORK",
  "CANCELLED",
  "CLOSED",
] as const;

export const SHOP_RECON_STAGES = [
  { code: "SHOP_ENTRY", label: "Shop Entry / Arrival Detected", order: 1 },
  { code: "CUSTODY_CHECK_IN", label: "Custody and Check-In", order: 2 },
  { code: "LANE_SCOPE_CONFIRMATION", label: "Lane and Scope Confirmation", order: 3 },
  { code: "SAFETY_PRIORITY_TRIAGE", label: "Safety and Priority Triage", order: 4 },
  { code: "INSPECTION", label: "Inspection", order: 5 },
  { code: "DIAGNOSIS", label: "Diagnosis", order: 6 },
  { code: "FINDINGS_VERIFICATION", label: "Findings Verification", order: 7 },
  { code: "REPAIR_PLAN_ESTIMATE", label: "Repair Plan and Estimate", order: 8 },
  { code: "AUTHORIZATION_APPROVAL", label: "Authorization and Approval", order: 9 },
  { code: "PARTS_RESOURCE_READINESS", label: "Parts and Resource Readiness", order: 10 },
  { code: "READY_FOR_DISPATCH", label: "Ready for Dispatch", order: 11 },
  { code: "ASSIGNED_STAGED", label: "Assigned and Staged", order: 12 },
  { code: "REPAIR_EXECUTION", label: "Repair Execution", order: 13 },
  { code: "TECHNICIAN_COMPLETE", label: "Technician Complete", order: 14 },
  { code: "QC_RELEASE_READINESS", label: "QC, Road Test and Release Readiness", order: 15 },
  { code: "HANDOFF_SHOP_EXIT", label: "Handoff and Shop Exit", order: 16 },
] as const;

export type ShopReconStageCode = (typeof SHOP_RECON_STAGES)[number]["code"];

export const SHOP_RECON_ZONES = [
  { code: "Z01_INBOUND", label: "Inbound / Arrival Boundary", dedicated: false },
  { code: "Z02_CHECK_IN", label: "Secure Check-In and Custody", dedicated: false },
  { code: "Z03_TRIAGE_INSPECTION", label: "Triage and Inspection", dedicated: false },
  { code: "Z04_DIAGNOSTIC", label: "Diagnostic Area", dedicated: false },
  { code: "Z05_CONTROLLED_WAIT", label: "Controlled Wait Lot", dedicated: false },
  { code: "Z06_PARTS_KIT", label: "Parts Staging / Kitting", dedicated: false },
  { code: "Z07_READY_QUEUE", label: "Ready-for-Dispatch Staging", dedicated: false },
  { code: "Z08_REPAIR_BAY", label: "Mechanical Repair Bay", dedicated: true },
  { code: "Z09_SPECIALTY_SUBLET", label: "Specialty / Detail / Body / Sublet Transfer", dedicated: false },
  { code: "Z10_QC", label: "QC and Road-Test Staging", dedicated: false },
  { code: "Z11_OUTBOUND", label: "Handoff / Outbound", dedicated: false },
  { code: "Z12_QUARANTINE", label: "Safety / Identity / Security Quarantine", dedicated: false },
] as const;

export const SHOP_RECON_OPERATING_CALENDAR = {
  timeZone: SHOP_RECON_TIME_ZONE,
  openMinute: 9 * 60,
  closeMinute: 18 * 60,
  weekdays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
  customerAndTechnicianHoursMatch: true,
  roleSpecificSchedules: false,
  outsideHoursWorkPermitted: false,
  saturdayDealershipDropOff: "DEALERSHIP_CUSTODY_ONLY",
  grossDailyMinutes: 9 * 60,
  grossWeeklyMinutes: 45 * 60,
  breakPolicyStatus: "CONFIRMATION_REQUIRED",
} as const;

export const SHOP_RECON_AUTHORITIES = [
  { authority: "SHOP_OPERATIONS", primary: "Brock", backup: "Eli", status: "CONFIRMED" },
  { authority: "SHOP_DISPATCH", primary: "Brock", backup: "Eli", status: "CONFIRMED" },
  { authority: "QUALITY_CONTROL", primary: "Brock", backup: null, status: "PARTIALLY_CONFIRMED" },
  { authority: "INVENTORY_RECON", primary: "Brock", backup: "Eli", status: "CONFIRMED" },
  { authority: "ROAD_TEST", primary: "ALL_STAFF", backup: null, status: "ELIGIBILITY_CONFIRMATION_REQUIRED" },
  { authority: "PARTS_PURCHASING", primary: null, backup: null, status: "CONFIRMATION_REQUIRED" },
  { authority: "CUSTOMER_AUTHORIZATION", primary: null, backup: null, status: "CONFIRMATION_REQUIRED" },
  { authority: "SAFETY_QUARANTINE", primary: null, backup: null, status: "CONFIRMATION_REQUIRED" },
  { authority: "DATA_RECONCILIATION", primary: null, backup: null, status: "CONFIRMATION_REQUIRED" },
] as const;

export const SHOP_RECON_STAFFING = [
  {
    name: "Walter Hernandez",
    role: "PRIMARY_TECHNICIAN",
    schedule: "SHOP_STANDARD",
    repairPerformer: true,
    qualityReviewer: false,
    roadTestPolicyEligible: true,
    systemIdentityStatus: "MAPPING_REQUIRED",
  },
  {
    name: "Brock",
    role: "SHOP_OPERATIONS_DISPATCH_QC",
    schedule: "SHOP_STANDARD",
    repairPerformer: false,
    qualityReviewer: true,
    roadTestPolicyEligible: true,
    systemIdentityStatus: "MAPPING_REQUIRED",
  },
  {
    name: "Eli",
    role: "SHOP_OPERATIONS_BACKUP",
    schedule: "SHOP_STANDARD",
    repairPerformer: false,
    qualityReviewer: false,
    roadTestPolicyEligible: true,
    systemIdentityStatus: "MAPPING_REQUIRED",
  },
] as const;

export const SHOP_RECON_TARGETS = {
  aggregateInventoryReconMinutes: 72 * 60,
  alertBands: { warningAtRatio: 0.75, breachedAtRatio: 1, criticalAtRatio: 1.5 },
  stageMinutes: {
    SHOP_ENTRY: 15,
    CUSTODY_CHECK_IN: 30,
    LANE_SCOPE_CONFIRMATION: 30,
    SAFETY_PRIORITY_TRIAGE: 60,
    INSPECTION: 240,
    DIAGNOSIS: 480,
    FINDINGS_VERIFICATION: 120,
    REPAIR_PLAN_ESTIMATE: 240,
    AUTHORIZATION_APPROVAL: null,
    PARTS_RESOURCE_READINESS: 120,
    READY_FOR_DISPATCH: 120,
    ASSIGNED_STAGED: 60,
    REPAIR_EXECUTION: null,
    TECHNICIAN_COMPLETE: 30,
    QC_RELEASE_READINESS: 120,
    HANDOFF_SHOP_EXIT: 60,
  } satisfies Record<ShopReconStageCode, number | null>,
  variableTargets: {
    authorizationInventoryMinutes: 120,
    authorizationCustomerFirstContactMinutes: 240,
    diagnosisComplexExtensionMaximumMinutes: 24 * 60,
    repairExecution: "CURRENT_APPROVED_LOW_EXPECTED_HIGH_RANGE",
    qcWithApprovedRoadTestMinutes: 240,
    customerHandoffPreparationMinutes: 120,
  },
} as const;

export const SHOP_RECON_WIP_LIMITS = {
  operatingRepairBays: 2,
  activePrimaryJobsPerTechnician: 1,
  stagedNextJobsPerTechnician: 1,
  vehiclesPerRepairBay: 1,
  activeOrStagedVehiclesOnRepairFloor: 2,
  readyVehiclesPerEligibleTechnician: 2,
  submittedVehiclesPerQcReviewer: 2,
  protectedCapacityRatio: 0.1,
  protectedCapacityMinimumMinutesPerDay: 60,
  partsWaitBayRemovalTargetMinutes: 30,
  separateInspectionZone: false,
  separateAuthorizationWaitZone: false,
  separateReadyZone: false,
  separateQcZone: false,
} as const;

export const SHOP_RECON_BLOCKERS = [
  ["BLK-ID-IDENTITY_CONFLICT", "Vehicle identity conflicts with the governing record.", "IMMEDIATE"],
  ["BLK-CUSTODY-KEY_OR_ACCESS", "Key, access or custody is unavailable or disputed.", "HOURLY"],
  ["BLK-SAFE-VEHICLE_HAZARD", "A vehicle safety or environmental hazard requires containment.", "IMMEDIATE"],
  ["BLK-SAFE-MOVEMENT_RESTRICTED", "The vehicle cannot be moved safely.", "PER_MOVEMENT"],
  ["BLK-LANE-AUTHORITY_UNKNOWN", "The governing work lane or authority is unknown.", "HOURLY"],
  ["BLK-INSP-INCOMPLETE", "Required inspection evidence is incomplete.", "TWO_HOURS"],
  ["BLK-DIAG-ADDITIONAL_TEST", "Diagnosis requires an additional test or evidence.", "TWO_HOURS"],
  ["BLK-SCOPE-CHANGED", "A new finding exceeds current scope or authorization.", "IMMEDIATE"],
  ["BLK-AUTH-CUSTOMER", "A customer decision is required.", "APPROVED_CONTACT_CADENCE"],
  ["BLK-AUTH-INVENTORY", "An Inventory recon decision is required.", "TWO_HOURS"],
  ["BLK-FIN-LIMIT_OR_PRICE", "A financial threshold, cost or price conflict exists.", "TWO_HOURS"],
  ["BLK-PART-NOT_SOURCED", "No approved source is established for a required part.", "DAILY"],
  ["BLK-PART-ETA_RISK", "A required part ETA is missing, stale or at risk.", "DAILY"],
  ["BLK-PART-WRONG_DAMAGED", "A received part is wrong, damaged or unusable.", "IMMEDIATE"],
  ["BLK-PART-KIT_INCOMPLETE", "The authorized job lacks a complete usable parts kit.", "DAILY"],
  ["BLK-TECH-SKILL_UNAVAILABLE", "No verified eligible technician is available.", "DAILY"],
  ["BLK-RES-BAY_TOOL_EQUIPMENT", "A required bay, lift, tool or equipment resource is unavailable.", "TWO_HOURS"],
  ["BLK-PROC-INFORMATION", "A required procedure or specification is unavailable or conflicted.", "BEFORE_RESUME"],
  ["BLK-SUBLET-VENDOR", "An approved vendor, custody, SLA or return requirement is unresolved.", "DAILY"],
  ["BLK-QC-FAILED", "Quality verification failed and exact rework is required.", "IMMEDIATE"],
  ["BLK-QC-REVIEWER_UNAVAILABLE", "A required qualified or independent reviewer is unavailable.", "DAILY"],
  ["BLK-HANDOFF-RECEIVER", "The eligible receiving owner has not accepted handoff.", "HOURLY"],
  ["BLK-DATA-STALE_CONFLICT", "A required source is stale, unavailable or contradictory.", "IMMEDIATE"],
  ["BLK-SYS-DEGRADED", "The application or required integration is unavailable.", "INCIDENT_CADENCE"],
  ["BLK-LOC-VEHICLE_NOT_FOUND", "Recorded and observed vehicle location do not reconcile.", "IMMEDIATE"],
] as const;

export const INVENTORY_TO_SHOP_HANDOFF_CONTRACT = {
  inboundResults: ["ACCEPTED", "ACCEPTED_WITH_RESTRICTION", "REJECTED_CORRECTION_REQUIRED", "QUARANTINED_CONFLICT"],
  outboundResults: ["INVENTORY_ACCEPTED", "INVENTORY_ACCEPTED_RESTRICTED", "RETURNED_FOR_SHOP_CORRECTION", "RECONCILIATION_HOLD"],
  inboundRequiredFields: [
    "inventoryUnitId",
    "vehicleId",
    "inventoryWorkflowVersion",
    "correlationId",
    "custodyLocation",
    "inspectionVersion",
    "reconPlanVersion",
    "authorizedAmountCents",
    "authorizedJobs",
    "frontlineTargetAt",
    "inventoryOwner",
    "shopReceiver",
  ],
  outboundRequiredFields: [
    "inventoryUnitId",
    "repairOrderId",
    "inboundHandoffVersion",
    "shopLifecycleVersion",
    "jobDispositions",
    "actualReconExposureCents",
    "qualityEvidence",
    "finalOdometer",
    "currentLocation",
    "custodyOwner",
    "shopReleaser",
    "inventoryReceiver",
  ],
  inventoryAcceptanceTargetMinutes: 60,
  shopAcceptanceTargetMinutes: 60,
  shopMayDeclareFrontlineReady: false,
  idempotencyScope: ["organizationId", "inventoryUnitId", "handoffType", "version"],
} as const;

const dayName = new Intl.DateTimeFormat("en-US", { timeZone: SHOP_RECON_TIME_ZONE, weekday: "long" });
const timeParts = new Intl.DateTimeFormat("en-US", {
  timeZone: SHOP_RECON_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
});

export function isShopOpenAt(at: Date) {
  const weekday = dayName.format(at).toUpperCase();
  const parts = Object.fromEntries(timeParts.formatToParts(at).map(part => [part.type, part.value]));
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  return SHOP_RECON_OPERATING_CALENDAR.weekdays.includes(weekday as (typeof SHOP_RECON_OPERATING_CALENDAR.weekdays)[number])
    && minute >= SHOP_RECON_OPERATING_CALENDAR.openMinute
    && minute < SHOP_RECON_OPERATING_CALENDAR.closeMinute;
}

export function shopStaffedMinutesBetween(start: Date, end: Date) {
  if (end <= start) return 0;
  let staffedMinutes = 0;
  const oneMinute = 60_000;
  for (let cursor = Math.ceil(start.getTime() / oneMinute) * oneMinute; cursor < end.getTime(); cursor += oneMinute) {
    if (isShopOpenAt(new Date(cursor))) staffedMinutes += 1;
  }
  return staffedMinutes;
}

function missingFields(value: unknown, required: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [...required];
  const record = value as Record<string, unknown>;
  return required.filter(key => record[key] === undefined || record[key] === null || record[key] === "");
}

export function validateInventoryToShopHandoffDraft(value: unknown) {
  const missing = missingFields(value, INVENTORY_TO_SHOP_HANDOFF_CONTRACT.inboundRequiredFields);
  return { valid: missing.length === 0, missingFields: missing, contractVersion: SHOP_RECON_FOUNDATION_VERSION };
}

export function validateShopToInventoryHandoffDraft(value: unknown) {
  const missing = missingFields(value, INVENTORY_TO_SHOP_HANDOFF_CONTRACT.outboundRequiredFields);
  return { valid: missing.length === 0, missingFields: missing, contractVersion: SHOP_RECON_FOUNDATION_VERSION };
}

export function getShopReconFoundation() {
  return {
    contractVersion: SHOP_RECON_FOUNDATION_VERSION,
    status: "DETERMINISTIC_WORKFLOW_READ_MODEL_ACTIVE",
    configurationStatus: "PARTIALLY_CONFIRMED",
    stages: SHOP_RECON_STAGES,
    operatingStates: SHOP_RECON_OPERATING_STATES,
    zones: SHOP_RECON_ZONES,
    operatingCalendar: SHOP_RECON_OPERATING_CALENDAR,
    authorities: SHOP_RECON_AUTHORITIES,
    staffing: SHOP_RECON_STAFFING,
    targets: SHOP_RECON_TARGETS,
    wipLimits: SHOP_RECON_WIP_LIMITS,
    blockers: SHOP_RECON_BLOCKERS.map(([code, meaning, reviewCadence]) => ({ code, meaning, reviewCadence })),
    inventoryHandoff: INVENTORY_TO_SHOP_HANDOFF_CONTRACT,
    unresolvedConfirmations: [
      "BREAK_AND_LUNCH_POLICY",
      "PHYSICAL_PARKING_ZONE_MAP_AND_CAPACITIES",
      "SATURDAY_DROP_OFF_CUSTODY_AND_KEY_ROUTE",
      "QC_INDEPENDENCE_WHEN_BROCK_PERFORMS_REPAIR",
      "CONFIRMED_STAFF_TO_SYSTEM_USER_ID_MAPPING",
      "ROAD_TEST_LICENSE_INSURANCE_ROUTE_AND_WEATHER_RULES",
      "PARTS_PURCHASING_AUTHORITY",
      "CUSTOMER_AUTHORIZATION_OWNER",
      "SAFETY_AND_QUARANTINE_OWNER",
      "DATA_RECONCILIATION_OWNER",
    ],
    activation: {
      stageAlgorithms: "ACTIVE_DETERMINISTIC_READ_MODEL",
      workflowTransitions: "PROJECTED_FROM_EXISTING_REPAIR_ORDER",
      automaticVehicleMovement: "PROHIBITED",
      inventoryWriteback: "DISABLED",
    },
  } as const;
}
