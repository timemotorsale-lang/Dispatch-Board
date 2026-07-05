export const APPOINTMENT_TEMPLATE_CATEGORIES = [
  "SALES",
  "DELIVERY",
  "SERVICE",
  "CUSTOMER_SERVICE",
  "ADMINISTRATION",
  "COLLECTIONS",
  "INVENTORY",
  "MARKETING",
  "INTERNAL",
  "CROSS_WORKFLOW",
  "GENERAL"
] as const;

export const APPOINTMENT_TEMPLATE_APPROVAL_MODES = [
  "OWNER_CAN_SCHEDULE",
  "MANAGER_RECOMMENDED",
  "MANAGER_REQUIRED",
  "RULE_DEPENDENT"
] as const;

export const APPOINTMENT_TEMPLATE_MISSING_INPUT_BEHAVIORS = [
  "CREATE_DRAFT",
  "CREATE_REVIEW_ITEM",
  "BLOCK_AUTOMATION"
] as const;

export type AppointmentTemplateCategory = (typeof APPOINTMENT_TEMPLATE_CATEGORIES)[number];
export type AppointmentTemplateApprovalMode =
  (typeof APPOINTMENT_TEMPLATE_APPROVAL_MODES)[number];
export type AppointmentTemplateMissingInputBehavior =
  (typeof APPOINTMENT_TEMPLATE_MISSING_INPUT_BEHAVIORS)[number];

export type AppointmentTemplateTaskBlueprint = {
  code: string;
  title: string;
  linkType:
    | "PREPARATION"
    | "DEPENDENCY"
    | "DURING_APPOINTMENT"
    | "APPROVAL"
    | "FOLLOW_UP";
  creationTiming:
    | "ON_DRAFT"
    | "ON_APPROVAL"
    | "ON_SCHEDULE"
    | "ON_CHECK_IN"
    | "ON_OUTCOME"
    | "ON_COMPLETION";
  ownerPolicy: "APPOINTMENT_OWNER" | "SOURCE_TASK_ASSIGNEE" | "ROLE" | "MANAGER_REVIEW";
  blockingEffect: "NONE" | "WARNING" | "BLOCKS_START" | "BLOCKS_FINISH" | "BLOCKS_COMPLETION";
};

export type AppointmentTemplateDefinition = {
  code: string;
  name: string;
  description: string;
  category: AppointmentTemplateCategory;
  version: number;
  isActive: boolean;
  defaultDurationMinutes: number;
  minimumDurationMinutes: number;
  maximumDurationMinutes: number;
  preparationBufferMinutes: number;
  cleanupBufferMinutes: number;
  startIntervalMinutes: number;
  minimumNoticeMinutes: number;
  bookingHorizonDays: number;
  approvalMode: AppointmentTemplateApprovalMode;
  eligibleOwnerRoleNames: string[];
  requiredParticipantTypes: string[];
  requiredResourceTypeCodes: string[];
  requiredContextFields: string[];
  hardConflictCodes: string[];
  warningCodes: string[];
  outcomeCodes: string[];
  followUpDispositionCodes: string[];
  taskBlueprints: AppointmentTemplateTaskBlueprint[];
  automationTriggers: string[];
  missingInputBehavior: AppointmentTemplateMissingInputBehavior;
  dataSensitivity: "STANDARD" | "LIMITED" | "RESTRICTED";
  reportingDimensions: string[];
  approvedByRoleName: "General Manager";
};

export type AppointmentPurposeSnapshot = {
  code: string;
  name: string;
  category: AppointmentTemplateCategory;
  version: number;
  defaultDurationMinutes: number;
  preparationBufferMinutes: number;
  cleanupBufferMinutes: number;
  approvalMode: AppointmentTemplateApprovalMode;
  requiredContextFields: string[];
  outcomeCodes: string[];
  followUpDispositionCodes: string[];
  dataSensitivity: AppointmentTemplateDefinition["dataSensitivity"];
};

function preparationTask(
  code: string,
  title: string,
  blockingEffect: AppointmentTemplateTaskBlueprint["blockingEffect"] = "WARNING"
): AppointmentTemplateTaskBlueprint {
  return {
    code,
    title,
    linkType: "PREPARATION",
    creationTiming: "ON_SCHEDULE",
    ownerPolicy: "APPOINTMENT_OWNER",
    blockingEffect
  };
}

function followUpTask(code: string, title: string): AppointmentTemplateTaskBlueprint {
  return {
    code,
    title,
    linkType: "FOLLOW_UP",
    creationTiming: "ON_OUTCOME",
    ownerPolicy: "APPOINTMENT_OWNER",
    blockingEffect: "NONE"
  };
}

const defaultOutcomes = [
  "COMPLETED",
  "FOLLOW_UP_REQUIRED",
  "RESCHEDULED",
  "CANCELLED",
  "NO_SHOW"
];

const defaultFollowUps = [
  "NONE_REQUIRED",
  "CALL_CUSTOMER",
  "CREATE_TASK",
  "MANAGER_REVIEW",
  "SCHEDULE_NEXT_APPOINTMENT"
];

export const INITIAL_APPOINTMENT_TEMPLATE_DEFINITIONS: AppointmentTemplateDefinition[] = [
  {
    code: "APT-SALES-CONSULT",
    name: "Sales Consultation",
    description: "Coordinate a structured sales conversation with a customer or prospect.",
    category: "SALES",
    version: 1,
    isActive: true,
    defaultDurationMinutes: 45,
    minimumDurationMinutes: 30,
    maximumDurationMinutes: 90,
    preparationBufferMinutes: 10,
    cleanupBufferMinutes: 10,
    startIntervalMinutes: 15,
    minimumNoticeMinutes: 30,
    bookingHorizonDays: 180,
    approvalMode: "OWNER_CAN_SCHEDULE",
    eligibleOwnerRoleNames: ["Salesperson", "Sales Manager", "General Manager"],
    requiredParticipantTypes: ["CUSTOMER", "OWNER"],
    requiredResourceTypeCodes: [],
    requiredContextFields: ["customer", "salesTopic", "owner", "location"],
    hardConflictCodes: ["LOCATION_CLOSED", "OWNER_UNAVAILABLE"],
    warningCodes: ["VEHICLE_NOT_SELECTED", "CUSTOMER_CONFIRMATION_PENDING"],
    outcomeCodes: [
      "NEXT_APPOINTMENT_SCHEDULED",
      "TEST_DRIVE_SCHEDULED",
      "PURCHASE_PROCESS_STARTED",
      "NOT_PROCEEDING",
      ...defaultOutcomes
    ],
    followUpDispositionCodes: defaultFollowUps,
    taskBlueprints: [
      preparationTask("PREP-CUSTOMER-CONTEXT", "Review customer context"),
      followUpTask("FOLLOW-UP-SALES-CONSULT", "Sales consultation follow-up")
    ],
    automationTriggers: ["SALES_TASK_REQUIRES_MEETING"],
    missingInputBehavior: "CREATE_DRAFT",
    dataSensitivity: "STANDARD",
    reportingDimensions: ["sales", "customer", "owner"],
    approvedByRoleName: "General Manager"
  },
  {
    code: "APT-TEST-DRIVE",
    name: "Test Drive",
    description: "Reserve a customer, owner, and specific vehicle for a test drive.",
    category: "SALES",
    version: 1,
    isActive: true,
    defaultDurationMinutes: 45,
    minimumDurationMinutes: 30,
    maximumDurationMinutes: 75,
    preparationBufferMinutes: 15,
    cleanupBufferMinutes: 15,
    startIntervalMinutes: 15,
    minimumNoticeMinutes: 30,
    bookingHorizonDays: 180,
    approvalMode: "OWNER_CAN_SCHEDULE",
    eligibleOwnerRoleNames: ["Salesperson", "Sales Manager", "General Manager"],
    requiredParticipantTypes: ["CUSTOMER", "OWNER"],
    requiredResourceTypeCodes: ["VEHICLE"],
    requiredContextFields: ["customer", "vehicle", "owner", "driverEligibility", "location"],
    hardConflictCodes: ["LOCATION_CLOSED", "OWNER_UNAVAILABLE", "VEHICLE_ALREADY_RESERVED", "VEHICLE_UNAVAILABLE"],
    warningCodes: ["READINESS_TASK_INCOMPLETE", "CONFIRMATION_PENDING"],
    outcomeCodes: [
      "TEST_DRIVE_COMPLETED_PURCHASE_STARTED",
      "TEST_DRIVE_COMPLETED_FOLLOW_UP_REQUIRED",
      "TEST_DRIVE_COMPLETED_NOT_PROCEEDING",
      "VEHICLE_CHANGED",
      ...defaultOutcomes
    ],
    followUpDispositionCodes: defaultFollowUps,
    taskBlueprints: [
      preparationTask("PREP-VEHICLE-READY", "Vehicle availability and readiness", "BLOCKS_START"),
      preparationTask("PREP-KEYS-ROUTE", "Keys and route readiness"),
      followUpTask("FOLLOW-UP-TEST-DRIVE", "Test-drive follow-up")
    ],
    automationTriggers: ["QUALIFIED_SALES_FOLLOW_UP_TASK"],
    missingInputBehavior: "CREATE_DRAFT",
    dataSensitivity: "STANDARD",
    reportingDimensions: ["sales", "vehicle", "owner"],
    approvedByRoleName: "General Manager"
  },
  {
    code: "APT-VEHICLE-DELIVERY",
    name: "Vehicle Delivery",
    description: "Coordinate final vehicle handoff with preparation and paperwork complete.",
    category: "DELIVERY",
    version: 1,
    isActive: true,
    defaultDurationMinutes: 60,
    minimumDurationMinutes: 45,
    maximumDurationMinutes: 120,
    preparationBufferMinutes: 30,
    cleanupBufferMinutes: 15,
    startIntervalMinutes: 15,
    minimumNoticeMinutes: 60,
    bookingHorizonDays: 180,
    approvalMode: "MANAGER_RECOMMENDED",
    eligibleOwnerRoleNames: ["Sales Manager", "Salesperson", "General Manager"],
    requiredParticipantTypes: ["CUSTOMER", "OWNER"],
    requiredResourceTypeCodes: ["VEHICLE", "DELIVERY_AREA"],
    requiredContextFields: ["customer", "soldVehicle", "deliveryReference", "documentationStatus"],
    hardConflictCodes: ["LOCATION_CLOSED", "VEHICLE_ALREADY_RESERVED", "VEHICLE_UNAVAILABLE", "DELIVERY_DOCUMENTS_MISSING"],
    warningCodes: ["FINAL_INSPECTION_INCOMPLETE", "FUNDING_CONFIRMATION_PENDING"],
    outcomeCodes: [
      "DELIVERED_ACCEPTED",
      "PARTIAL_DELIVERY_FOLLOW_UP_REQUIRED",
      "CUSTOMER_DECLINED_DELIVERY",
      ...defaultOutcomes
    ],
    followUpDispositionCodes: defaultFollowUps,
    taskBlueprints: [
      preparationTask("PREP-FINAL-INSPECTION", "Final inspection", "BLOCKS_COMPLETION"),
      preparationTask("PREP-DETAIL-FUEL", "Detail and fuel confirmation", "BLOCKS_START"),
      preparationTask("PREP-DELIVERY-PACKET", "Delivery packet ready", "BLOCKS_START")
    ],
    automationTriggers: ["SOLD_VEHICLE_PREP_READY"],
    missingInputBehavior: "CREATE_REVIEW_ITEM",
    dataSensitivity: "LIMITED",
    reportingDimensions: ["delivery", "vehicle", "customer", "owner"],
    approvedByRoleName: "General Manager"
  },
  {
    code: "APT-SERVICE-INTAKE",
    name: "Service and Repair Intake",
    description: "Receive a customer or internal vehicle and begin service work.",
    category: "SERVICE",
    version: 1,
    isActive: true,
    defaultDurationMinutes: 30,
    minimumDurationMinutes: 20,
    maximumDurationMinutes: 75,
    preparationBufferMinutes: 10,
    cleanupBufferMinutes: 10,
    startIntervalMinutes: 15,
    minimumNoticeMinutes: 30,
    bookingHorizonDays: 180,
    approvalMode: "OWNER_CAN_SCHEDULE",
    eligibleOwnerRoleNames: ["Service Advisor", "General Manager"],
    requiredParticipantTypes: ["CUSTOMER_OR_INTERNAL", "OWNER"],
    requiredResourceTypeCodes: ["SERVICE_INTAKE_AREA"],
    requiredContextFields: ["customerOrInternalVehicle", "vehicle", "complaint", "arrivalMethod"],
    hardConflictCodes: ["LOCATION_CLOSED", "OWNER_UNAVAILABLE"],
    warningCodes: ["COMPLAINT_INCOMPLETE", "PRIOR_NOTES_NOT_REVIEWED"],
    outcomeCodes: [
      "VEHICLE_ACCEPTED_FOR_DIAGNOSIS",
      "REPAIR_APPROVED",
      "REPAIR_DECLINED",
      "PARTS_OR_INFO_REQUIRED",
      "VEHICLE_RETURNED",
      ...defaultOutcomes
    ],
    followUpDispositionCodes: defaultFollowUps,
    taskBlueprints: [
      preparationTask("PREP-INTAKE-CHECKLIST", "Prepare intake checklist"),
      preparationTask("DURING-DIAGNOSIS", "Diagnosis task", "BLOCKS_FINISH"),
      preparationTask("APPROVAL-ESTIMATE", "Estimate and approval task", "BLOCKS_COMPLETION")
    ],
    automationTriggers: ["SERVICE_TASK_REQUIRES_CUSTOMER_ARRIVAL"],
    missingInputBehavior: "CREATE_DRAFT",
    dataSensitivity: "STANDARD",
    reportingDimensions: ["service", "vehicle", "owner"],
    approvedByRoleName: "General Manager"
  },
  {
    code: "APT-CUSTOMER-ISSUE",
    name: "Customer Issue Resolution",
    description: "Coordinate a structured discussion or inspection for a reported customer issue.",
    category: "CUSTOMER_SERVICE",
    version: 1,
    isActive: true,
    defaultDurationMinutes: 45,
    minimumDurationMinutes: 30,
    maximumDurationMinutes: 120,
    preparationBufferMinutes: 10,
    cleanupBufferMinutes: 15,
    startIntervalMinutes: 15,
    minimumNoticeMinutes: 30,
    bookingHorizonDays: 180,
    approvalMode: "MANAGER_RECOMMENDED",
    eligibleOwnerRoleNames: ["General Manager", "Sales Manager", "Service Advisor", "Office Manager"],
    requiredParticipantTypes: ["CUSTOMER", "OWNER"],
    requiredResourceTypeCodes: [],
    requiredContextFields: ["customer", "issueSummary", "severity", "relatedVehicleOrTransaction"],
    hardConflictCodes: ["LOCATION_CLOSED", "OWNER_UNAVAILABLE"],
    warningCodes: ["SUPPORTING_RECORDS_MISSING", "DECISION_AUTHORITY_MISSING"],
    outcomeCodes: ["RESOLVED", "RESOLUTION_OFFERED", "REFERRED_TO_SERVICE", "ESCALATED", "NO_AGREEMENT", ...defaultOutcomes],
    followUpDispositionCodes: defaultFollowUps,
    taskBlueprints: [
      preparationTask("PREP-ISSUE-HISTORY", "Review issue history"),
      preparationTask("PREP-RESOLUTION-PATH", "Prepare resolution path"),
      followUpTask("FOLLOW-UP-CUSTOMER-ISSUE", "Customer issue follow-up")
    ],
    automationTriggers: ["ESCALATED_CUSTOMER_ISSUE_TASK"],
    missingInputBehavior: "CREATE_REVIEW_ITEM",
    dataSensitivity: "LIMITED",
    reportingDimensions: ["customer_issue", "owner", "severity"],
    approvedByRoleName: "General Manager"
  },
  {
    code: "APT-DOCS-DMV",
    name: "Documentation, Title, and DMV",
    description: "Complete or review documentation with a customer or external party.",
    category: "ADMINISTRATION",
    version: 1,
    isActive: true,
    defaultDurationMinutes: 30,
    minimumDurationMinutes: 20,
    maximumDurationMinutes: 75,
    preparationBufferMinutes: 10,
    cleanupBufferMinutes: 10,
    startIntervalMinutes: 15,
    minimumNoticeMinutes: 30,
    bookingHorizonDays: 180,
    approvalMode: "OWNER_CAN_SCHEDULE",
    eligibleOwnerRoleNames: ["Office Manager", "General Manager"],
    requiredParticipantTypes: ["CUSTOMER_OR_EXTERNAL_PARTY", "OWNER"],
    requiredResourceTypeCodes: ["ADMIN_DESK"],
    requiredContextFields: ["documentPurpose", "documentChecklist", "customerOrParty"],
    hardConflictCodes: ["LOCATION_CLOSED", "OWNER_UNAVAILABLE"],
    warningCodes: ["MISSING_DOCUMENTS", "SIGNATURE_PENDING"],
    outcomeCodes: ["DOCUMENTS_COMPLETED", "SUBMITTED", "MISSING_INFORMATION", "REJECTED_OR_CORRECTION_REQUIRED", ...defaultOutcomes],
    followUpDispositionCodes: defaultFollowUps,
    taskBlueprints: [
      preparationTask("PREP-DOCUMENT-CHECKLIST", "Validate required documents", "BLOCKS_START"),
      followUpTask("FOLLOW-UP-DOCS-DMV", "Documentation follow-up")
    ],
    automationTriggers: ["DOCUMENTATION_TASK_REQUIRES_SIGNATURE"],
    missingInputBehavior: "CREATE_DRAFT",
    dataSensitivity: "LIMITED",
    reportingDimensions: ["documentation", "owner"],
    approvedByRoleName: "General Manager"
  },
  {
    code: "APT-COLLECTIONS",
    name: "Collections and Payment",
    description: "Conduct an authorized collections or payment meeting with restricted data handling.",
    category: "COLLECTIONS",
    version: 1,
    isActive: true,
    defaultDurationMinutes: 30,
    minimumDurationMinutes: 20,
    maximumDurationMinutes: 60,
    preparationBufferMinutes: 10,
    cleanupBufferMinutes: 10,
    startIntervalMinutes: 15,
    minimumNoticeMinutes: 30,
    bookingHorizonDays: 90,
    approvalMode: "OWNER_CAN_SCHEDULE",
    eligibleOwnerRoleNames: ["Collections", "General Manager"],
    requiredParticipantTypes: ["CUSTOMER", "OWNER"],
    requiredResourceTypeCodes: [],
    requiredContextFields: ["customer", "nonSensitiveAccountReference", "reasonCategory"],
    hardConflictCodes: ["LOCATION_CLOSED", "OWNER_UNAVAILABLE"],
    warningCodes: ["RESTRICTED_NOTE_PRESENT", "MANAGER_CONTEXT_RECOMMENDED"],
    outcomeCodes: ["PAYMENT_COMPLETED", "ARRANGEMENT_ESTABLISHED", "PARTIAL_RESOLUTION", "UNABLE_TO_RESOLVE", ...defaultOutcomes],
    followUpDispositionCodes: defaultFollowUps,
    taskBlueprints: [
      preparationTask("PREP-COLLECTIONS-CONTEXT", "Review non-sensitive payment context"),
      followUpTask("FOLLOW-UP-COLLECTIONS", "Collections follow-up")
    ],
    automationTriggers: ["COLLECTIONS_TASK_REQUIRES_MEETING"],
    missingInputBehavior: "CREATE_DRAFT",
    dataSensitivity: "RESTRICTED",
    reportingDimensions: ["collections", "owner"],
    approvedByRoleName: "General Manager"
  },
  {
    code: "APT-INVENTORY-VENDOR",
    name: "Inventory and Vendor",
    description: "Coordinate vehicle, vendor, parts, pickup, drop-off, or inventory activity.",
    category: "INVENTORY",
    version: 1,
    isActive: true,
    defaultDurationMinutes: 45,
    minimumDurationMinutes: 30,
    maximumDurationMinutes: 120,
    preparationBufferMinutes: 15,
    cleanupBufferMinutes: 15,
    startIntervalMinutes: 15,
    minimumNoticeMinutes: 30,
    bookingHorizonDays: 180,
    approvalMode: "OWNER_CAN_SCHEDULE",
    eligibleOwnerRoleNames: ["Inventory Manager", "General Manager"],
    requiredParticipantTypes: ["EXTERNAL_PARTY_OR_INTERNAL", "OWNER"],
    requiredResourceTypeCodes: ["VEHICLE_OR_STAGING_AREA"],
    requiredContextFields: ["vendorOrParty", "vehicleOrInventoryReference", "activityReason"],
    hardConflictCodes: ["LOCATION_CLOSED", "RESOURCE_UNAVAILABLE"],
    warningCodes: ["VEHICLE_LOCATION_UNKNOWN", "VENDOR_CONFIRMATION_PENDING"],
    outcomeCodes: ["WORK_ACCEPTED", "VEHICLE_OR_ITEM_RECEIVED", "VEHICLE_OR_ITEM_RELEASED", "VENDOR_WORK_COMPLETED", "INSPECTION_FAILED", ...defaultOutcomes],
    followUpDispositionCodes: defaultFollowUps,
    taskBlueprints: [
      preparationTask("PREP-INVENTORY-HANDOFF", "Prepare inventory handoff"),
      followUpTask("FOLLOW-UP-INVENTORY-VENDOR", "Inventory/vendor follow-up")
    ],
    automationTriggers: ["INVENTORY_VENDOR_TASK_EXTERNAL_HANDOFF"],
    missingInputBehavior: "CREATE_DRAFT",
    dataSensitivity: "STANDARD",
    reportingDimensions: ["inventory", "vendor", "vehicle"],
    approvedByRoleName: "General Manager"
  },
  {
    code: "APT-MARKETING-ASSET",
    name: "Marketing, Photos, and Listing",
    description: "Reserve vehicles, staff, location, and equipment for marketing assets.",
    category: "MARKETING",
    version: 1,
    isActive: true,
    defaultDurationMinutes: 60,
    minimumDurationMinutes: 30,
    maximumDurationMinutes: 180,
    preparationBufferMinutes: 15,
    cleanupBufferMinutes: 15,
    startIntervalMinutes: 15,
    minimumNoticeMinutes: 30,
    bookingHorizonDays: 180,
    approvalMode: "OWNER_CAN_SCHEDULE",
    eligibleOwnerRoleNames: ["Marketing/Advertisement Manager", "Inventory Manager", "General Manager"],
    requiredParticipantTypes: ["OWNER"],
    requiredResourceTypeCodes: ["VEHICLE", "PHOTO_AREA", "EQUIPMENT"],
    requiredContextFields: ["vehicleOrCampaign", "requestedDeliverable", "location"],
    hardConflictCodes: ["LOCATION_CLOSED", "VEHICLE_ALREADY_RESERVED", "EQUIPMENT_UNAVAILABLE"],
    warningCodes: ["VEHICLE_NOT_CLEAN", "SHOT_LIST_MISSING"],
    outcomeCodes: ["ASSETS_CAPTURED", "LISTING_READY", "RETAKE_REQUIRED", "VEHICLE_UNAVAILABLE", "INFORMATION_MISSING", ...defaultOutcomes],
    followUpDispositionCodes: defaultFollowUps,
    taskBlueprints: [
      preparationTask("PREP-VEHICLE-STAGED", "Vehicle clean and staged", "BLOCKS_START"),
      preparationTask("PREP-SHOT-LIST", "Shot or content list ready"),
      followUpTask("FOLLOW-UP-MARKETING-ASSET", "Marketing asset follow-up")
    ],
    automationTriggers: ["VEHICLE_READY_FOR_PHOTOS", "LISTING_TASK_REQUIRES_ASSETS"],
    missingInputBehavior: "CREATE_DRAFT",
    dataSensitivity: "STANDARD",
    reportingDimensions: ["marketing", "vehicle"],
    approvedByRoleName: "General Manager"
  },
  {
    code: "APT-INTERNAL-MEETING",
    name: "Internal Meeting",
    description: "Coordinate an internal operational meeting linked to work when appropriate.",
    category: "INTERNAL",
    version: 1,
    isActive: true,
    defaultDurationMinutes: 30,
    minimumDurationMinutes: 15,
    maximumDurationMinutes: 120,
    preparationBufferMinutes: 5,
    cleanupBufferMinutes: 5,
    startIntervalMinutes: 15,
    minimumNoticeMinutes: 15,
    bookingHorizonDays: 180,
    approvalMode: "OWNER_CAN_SCHEDULE",
    eligibleOwnerRoleNames: ["General Manager", "Sales Manager", "Office Manager", "Inventory Manager"],
    requiredParticipantTypes: ["INTERNAL_USER", "OWNER"],
    requiredResourceTypeCodes: ["ROOM_OPTIONAL"],
    requiredContextFields: ["owner", "internalParticipants", "agenda"],
    hardConflictCodes: ["LOCATION_CLOSED", "OWNER_UNAVAILABLE"],
    warningCodes: ["PARTICIPANT_OVERLAP", "AGENDA_MISSING"],
    outcomeCodes: ["DECISION_RECORDED", "ACTION_ITEMS_CREATED", "FOLLOW_UP_MEETING_REQUIRED", "ESCALATED", ...defaultOutcomes],
    followUpDispositionCodes: defaultFollowUps,
    taskBlueprints: [
      preparationTask("PREP-MEETING-AGENDA", "Prepare meeting agenda"),
      followUpTask("FOLLOW-UP-INTERNAL-MEETING", "Internal meeting action items")
    ],
    automationTriggers: ["BLOCKED_TASK_REVIEW", "ESCALATION_TASK_REVIEW"],
    missingInputBehavior: "CREATE_DRAFT",
    dataSensitivity: "STANDARD",
    reportingDimensions: ["internal", "owner"],
    approvedByRoleName: "General Manager"
  },
  {
    code: "APT-TASK-MEETING",
    name: "Task-Required Meeting",
    description: "Universal template when any task requires meeting a person and no specific purpose is configured.",
    category: "CROSS_WORKFLOW",
    version: 1,
    isActive: true,
    defaultDurationMinutes: 30,
    minimumDurationMinutes: 15,
    maximumDurationMinutes: 120,
    preparationBufferMinutes: 10,
    cleanupBufferMinutes: 10,
    startIntervalMinutes: 15,
    minimumNoticeMinutes: 30,
    bookingHorizonDays: 180,
    approvalMode: "RULE_DEPENDENT",
    eligibleOwnerRoleNames: ["General Manager", "Sales Manager", "Office Manager", "Inventory Manager", "Service Advisor", "Salesperson", "Collections"],
    requiredParticipantTypes: ["SOURCE_TASK_PARTICIPANT", "OWNER"],
    requiredResourceTypeCodes: [],
    requiredContextFields: ["sourceTask", "meetingReason", "participantType", "owner"],
    hardConflictCodes: ["LOCATION_CLOSED", "OWNER_UNAVAILABLE"],
    warningCodes: ["MORE_SPECIFIC_TEMPLATE_AVAILABLE", "SOURCE_TASK_CONTEXT_INCOMPLETE"],
    outcomeCodes: ["MEETING_COMPLETED_TASK_CONTINUES", "DECISION_REQUIRED", "ADDITIONAL_WORK_CREATED", "FOLLOW_UP_MEETING_REQUIRED", ...defaultOutcomes],
    followUpDispositionCodes: defaultFollowUps,
    taskBlueprints: [
      preparationTask("PREP-SOURCE-TASK-CONTEXT", "Review source task context"),
      followUpTask("FOLLOW-UP-TASK-MEETING", "Task meeting follow-up")
    ],
    automationTriggers: ["ANY_TASK_REQUIRES_MEETING"],
    missingInputBehavior: "CREATE_DRAFT",
    dataSensitivity: "STANDARD",
    reportingDimensions: ["cross_workflow", "source_task", "owner"],
    approvedByRoleName: "General Manager"
  },
  {
    code: "APT-GENERAL",
    name: "General or Other",
    description: "Governed fallback for legitimate appointments that do not yet fit an approved purpose.",
    category: "GENERAL",
    version: 1,
    isActive: true,
    defaultDurationMinutes: 30,
    minimumDurationMinutes: 15,
    maximumDurationMinutes: 120,
    preparationBufferMinutes: 10,
    cleanupBufferMinutes: 10,
    startIntervalMinutes: 15,
    minimumNoticeMinutes: 30,
    bookingHorizonDays: 90,
    approvalMode: "MANAGER_REQUIRED",
    eligibleOwnerRoleNames: ["General Manager", "Sales Manager", "Office Manager", "Inventory Manager", "Service Advisor", "Salesperson", "Collections"],
    requiredParticipantTypes: ["PARTICIPANT", "OWNER"],
    requiredResourceTypeCodes: [],
    requiredContextFields: ["owner", "detailedReason", "participant", "location", "start", "end"],
    hardConflictCodes: ["LOCATION_CLOSED", "OWNER_UNAVAILABLE"],
    warningCodes: ["RECLASSIFICATION_RECOMMENDED"],
    outcomeCodes: ["COMPLETED", "FOLLOW_UP_REQUIRED", "RECLASSIFIED", "CANCELLED", "NO_SHOW"],
    followUpDispositionCodes: defaultFollowUps,
    taskBlueprints: [
      preparationTask("PREP-GENERAL-REASON", "Review general appointment reason"),
      followUpTask("FOLLOW-UP-GENERAL", "General appointment follow-up")
    ],
    automationTriggers: ["MANUAL_ONLY"],
    missingInputBehavior: "CREATE_REVIEW_ITEM",
    dataSensitivity: "LIMITED",
    reportingDimensions: ["general", "owner"],
    approvedByRoleName: "General Manager"
  }
] as const satisfies AppointmentTemplateDefinition[];

export function getInitialAppointmentTemplateDefinition(code: string) {
  return INITIAL_APPOINTMENT_TEMPLATE_DEFINITIONS.find(
    (template) => template.code === code.trim().toUpperCase()
  );
}

export function createAppointmentPurposeSnapshot(
  template: AppointmentTemplateDefinition
): AppointmentPurposeSnapshot {
  return {
    code: template.code,
    name: template.name,
    category: template.category,
    version: template.version,
    defaultDurationMinutes: template.defaultDurationMinutes,
    preparationBufferMinutes: template.preparationBufferMinutes,
    cleanupBufferMinutes: template.cleanupBufferMinutes,
    approvalMode: template.approvalMode,
    requiredContextFields: [...template.requiredContextFields],
    outcomeCodes: [...template.outcomeCodes],
    followUpDispositionCodes: [...template.followUpDispositionCodes],
    dataSensitivity: template.dataSensitivity
  };
}
