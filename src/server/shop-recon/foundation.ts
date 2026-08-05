export const SHOP_RECON_FOUNDATION_VERSION = "shop-recon/foundation/2.0.0" as const;
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
  { code: "SERVICE_RECON_JOB_INTAKE", label: "Service / Recon Job Intake", order: 1, phase: "REQUEST_WORK_CREATION", physicalPresenceRequired: false },
  { code: "JOB_SCOPE_DEFINITION", label: "Job Scope Definition", order: 2, phase: "REQUEST_WORK_CREATION", physicalPresenceRequired: false },
  { code: "WORK_ORDER_CREATION", label: "Work Order Creation", order: 3, phase: "REQUEST_WORK_CREATION", physicalPresenceRequired: false },
  { code: "VEHICLE_INTAKE_CUSTODY", label: "Vehicle Intake & Custody", order: 4, phase: "VEHICLE_RECEPTION_VERIFICATION", physicalPresenceRequired: true },
  { code: "SAFETY_MOBILITY_TRIAGE", label: "Safety & Mobility Triage", order: 5, phase: "VEHICLE_RECEPTION_VERIFICATION", physicalPresenceRequired: true },
  { code: "INSPECTION_CONCERN_VERIFICATION", label: "Inspection & Concern Verification", order: 6, phase: "VEHICLE_RECEPTION_VERIFICATION", physicalPresenceRequired: true },
  { code: "DIAGNOSIS", label: "Diagnosis", order: 7, phase: "TECHNICAL_DECISION", physicalPresenceRequired: true },
  { code: "FINDINGS_REPAIR_PLAN", label: "Findings & Repair Plan", order: 8, phase: "TECHNICAL_DECISION", physicalPresenceRequired: true },
  { code: "AUTHORIZATION", label: "Authorization", order: 9, phase: "TECHNICAL_DECISION", physicalPresenceRequired: false },
  { code: "PARTS_RESOURCE_READINESS", label: "Parts & Resource Readiness", order: 10, phase: "READINESS_REPAIR", physicalPresenceRequired: true },
  { code: "DISPATCH_WORK_STAGING", label: "Dispatch & Work Staging", order: 11, phase: "READINESS_REPAIR", physicalPresenceRequired: true },
  { code: "REPAIR_EXECUTION", label: "Repair Execution", order: 12, phase: "READINESS_REPAIR", physicalPresenceRequired: true },
  { code: "TECHNICIAN_COMPLETION", label: "Technician Completion", order: 13, phase: "READINESS_REPAIR", physicalPresenceRequired: true },
  { code: "QUALITY_CONTROL_ROAD_TEST", label: "Quality Control & Road Test", order: 14, phase: "QUALITY_HANDOVER", physicalPresenceRequired: true },
  { code: "RELEASE_HANDOVER_READINESS", label: "Release & Handover Readiness", order: 15, phase: "QUALITY_HANDOVER", physicalPresenceRequired: true },
  { code: "VEHICLE_HANDOVER_SHOP_EXIT", label: "Vehicle Handover & Shop Exit", order: 16, phase: "QUALITY_HANDOVER", physicalPresenceRequired: true },
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
    SERVICE_RECON_JOB_INTAKE: 30,
    JOB_SCOPE_DEFINITION: 30,
    WORK_ORDER_CREATION: 30,
    VEHICLE_INTAKE_CUSTODY: 30,
    SAFETY_MOBILITY_TRIAGE: 60,
    INSPECTION_CONCERN_VERIFICATION: 240,
    DIAGNOSIS: 480,
    FINDINGS_REPAIR_PLAN: 240,
    AUTHORIZATION: null,
    PARTS_RESOURCE_READINESS: 120,
    DISPATCH_WORK_STAGING: 120,
    REPAIR_EXECUTION: null,
    TECHNICIAN_COMPLETION: 30,
    QUALITY_CONTROL_ROAD_TEST: 120,
    RELEASE_HANDOVER_READINESS: 60,
    VEHICLE_HANDOVER_SHOP_EXIT: 60,
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

export function addShopStaffedMinutes(start: Date, minutes: number) {
  if (minutes <= 0) return new Date(start);
  const oneMinute = 60_000;
  let remaining = Math.ceil(minutes), cursor = Math.ceil(start.getTime() / oneMinute) * oneMinute;
  while (remaining > 0) {
    if (isShopOpenAt(new Date(cursor))) remaining -= 1;
    cursor += oneMinute;
  }
  return new Date(cursor);
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
      stageAlgorithms: "ACTIVE_GOVERNED_LIFECYCLE",
      workflowTransitions: "ACTIVE_GOVERNED_TRANSITIONS",
      automaticVehicleMovement: "PROHIBITED",
      inventoryWriteback: "DISABLED",
    },
  } as const;
}
