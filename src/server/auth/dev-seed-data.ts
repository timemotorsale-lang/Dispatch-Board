import type { TaskTemplatePriority } from "@prisma/client";

import type {
  TaskTemplateApprovalRules,
  TaskTemplateCardDisplayHints,
  TaskTemplateChecklistItem,
  TaskTemplateCompletionCriteria,
  TaskTemplateDefaultStatusRules,
  TaskTemplateRequiredUpdateField
} from "@/server/validation/task-template";

export const SHARED_DEVELOPMENT_PASSWORD = "dispatch123!";

export const dayOneDutyDefinitions = [
  {
    name: "Review today's dispatch board",
    workflowArea: "Management",
    description: "Review today's generated board, ownership, and priority work."
  },
  {
    name: "Review blocked tasks",
    workflowArea: "Management",
    description: "Review blocked tasks and decide what needs escalation or reassignment."
  },
  {
    name: "Review waiting-on-approval tasks",
    workflowArea: "Management",
    description: "Review tasks waiting on manager approval and decide next action."
  },
  {
    name: "Review ready-for-review tasks",
    workflowArea: "Management",
    description: "Review work that staff marked ready for review before final completion."
  },
  {
    name: "Approve vehicles ready for sale",
    workflowArea: "Management",
    description: "Review vehicles reported as ready for sale and approve frontline readiness."
  },
  {
    name: "Review daily intelligence and set tomorrow directives",
    workflowArea: "Management",
    description: "Review the day's intelligence logs and set tomorrow's priorities."
  },
  {
    name: "Review inventory status and priority vehicles",
    workflowArea: "Inventory",
    description: "Review the current inventory pipeline and identify priority vehicles."
  },
  {
    name: "Check vehicles needing inspection",
    workflowArea: "Inventory",
    description: "Identify vehicles that still need intake inspection or first-look review."
  },
  {
    name: "Check vehicles waiting for repairs",
    workflowArea: "Inventory",
    description: "Identify inventory waiting on repairs or diagnosis before it can move forward."
  },
  {
    name: "Check vehicles waiting for detail",
    workflowArea: "Inventory",
    description: "Identify vehicles that are blocked at the detail or cleanup stage."
  },
  {
    name: "Check vehicles ready for photos/listing",
    workflowArea: "Inventory",
    description: "Confirm which vehicles are ready to move into photos and listing work."
  },
  {
    name: "Flag stalled inventory or recon bottlenecks",
    workflowArea: "Inventory",
    description: "Flag vehicles or workflow stages that are stalled and need attention."
  },
  {
    name: "Review service production priorities",
    workflowArea: "Service",
    description: "Review today's service priorities and what should move first through the shop."
  },
  {
    name: "Review mechanic repair schedule",
    workflowArea: "Service",
    description: "Review mechanic workload, current repair assignments, and urgent diagnostics."
  },
  {
    name: "Check vehicles awaiting parts",
    workflowArea: "Service",
    description: "Review vehicles waiting on parts and confirm what is blocking movement."
  },
  {
    name: "Check vehicles awaiting QC",
    workflowArea: "Service",
    description: "Review vehicles waiting for quality check or final inspection."
  },
  {
    name: "Submit inventory and service production update",
    workflowArea: "Service",
    description: "Submit the combined end-of-day inventory and service production update."
  },
  {
    name: "Coordinate service advisor arrivals",
    workflowArea: "Service",
    description: "Coordinate appointment arrivals, walk-ins, customer check-in, and repair-order intake handoffs."
  },
  {
    name: "Document customer concern and authorization",
    workflowArea: "Service",
    description: "Record the customer's concern in their own words and preserve consent, custody, and promise context."
  },
  {
    name: "Manage customer repair-order updates",
    workflowArea: "Service",
    description: "Keep customers updated on repair-order status, approval needs, promise changes, and handoff readiness."
  },
  {
    name: "Coordinate vehicle operations lead priorities",
    workflowArea: "Inventory",
    description: "Coordinate the vehicle operations priorities across inventory, shop, parts, and lot support."
  },
  {
    name: "Support parts pickup and returns",
    workflowArea: "Service",
    description: "Support parts pickup, receiving, return, and constrained repair movement when assigned."
  },
  {
    name: "Support lot readiness and vehicle movement",
    workflowArea: "Inventory",
    description: "Support vehicle movement, keys, lot placement, cleanup, and readiness handoffs when assigned."
  },
  {
    name: "Review assigned repair and diagnostic tasks",
    workflowArea: "Mechanic",
    description: "Review assigned repair and diagnostic work before starting today's repairs."
  },
  {
    name: "Update active repair statuses",
    workflowArea: "Mechanic",
    description: "Update repair progress clearly so the board reflects current shop status."
  },
  {
    name: "Mark waiting on parts or approval when applicable",
    workflowArea: "Mechanic",
    description: "Mark repairs waiting on parts or approval when work cannot continue normally."
  },
  {
    name: "Move finished repair work to Ready for Review",
    workflowArea: "Mechanic",
    description: "Move finished repair work to Ready for Review when the work is complete."
  },
  {
    name: "Complete repair report for completed repair",
    workflowArea: "Mechanic",
    description: "Document the completed repair, outcome, and any remaining concern."
  },
  {
    name: "Review sales follow-up tasks",
    workflowArea: "Sales",
    description: "Review open lead follow-ups and make sure active deals have clear next steps."
  },
  {
    name: "Follow up with assigned leads",
    workflowArea: "Sales",
    description: "Contact assigned leads and keep the sales pipeline moving."
  },
  {
    name: "Confirm appointments",
    workflowArea: "Sales",
    description: "Confirm appointments, expected arrivals, and customer handoffs."
  },
  {
    name: "Update sold or pending vehicle prep status",
    workflowArea: "Sales",
    description: "Update the prep status for sold or pending vehicles headed toward delivery."
  },
  {
    name: "Notify manager of hot leads or stalled deals",
    workflowArea: "Sales",
    description: "Escalate hot leads, stalled deals, or anything needing manager attention."
  },
  {
    name: "Check vehicles ready for photos",
    workflowArea: "Advertising",
    description: "Confirm which vehicles are ready for photos, listings, and merchandising."
  },
  {
    name: "Confirm listings are complete",
    workflowArea: "Advertising",
    description: "Review active listings and confirm the merchandising work is complete."
  },
  {
    name: "Update online advertising tasks",
    workflowArea: "Advertising",
    description: "Keep listings and advertising work moving for vehicles ready to market."
  },
  {
    name: "Create or update broad marketing posts",
    workflowArea: "Marketing",
    description: "Create or update broad marketing posts that support inventory and promotions."
  },
  {
    name: "Flag missing photos or vehicle information",
    workflowArea: "Advertising",
    description: "Flag missing photos, missing vehicle information, or listing blockers."
  },
  {
    name: "Review office/admin support tasks",
    workflowArea: "OfficeFrontDesk",
    description: "Review office, admin, and front-desk support work that needs attention today."
  },
  {
    name: "Flag missing documentation when noticed",
    workflowArea: "OfficeFrontDesk",
    description: "Flag missing paperwork, title, DMV, or documentation issues when noticed."
  },
  {
    name: "Support sales or inventory tasks when assigned",
    workflowArea: "OfficeFrontDesk",
    description: "Support sales or inventory workflow tasks when specifically assigned."
  },
  {
    name: "Submit daily collections log",
    workflowArea: "Collections",
    description: "Submit the daily collections update with payment status and next steps."
  }
] as const;

export const dayOneRoleDefinitions = [
  {
    name: "General Manager",
    description: "Owns the daily board, reviews blockers, and approves manager-only workflow decisions.",
    defaultDutyNames: [
      "Review today's dispatch board",
      "Review blocked tasks",
      "Review waiting-on-approval tasks",
      "Review ready-for-review tasks",
      "Approve vehicles ready for sale",
      "Review daily intelligence and set tomorrow directives"
    ]
  },
  {
    name: "Vehicle Operations Lead",
    description: "Coordinates the current multi-hat vehicle operations workload across inventory, shop, parts runner, and lot support.",
    defaultDutyNames: [
      "Coordinate vehicle operations lead priorities",
      "Review inventory status and priority vehicles",
      "Review service production priorities",
      "Check vehicles awaiting parts",
      "Check vehicles awaiting QC",
      "Support parts pickup and returns",
      "Support lot readiness and vehicle movement",
      "Submit inventory and service production update"
    ]
  },
  {
    name: "Inventory Manager",
    description: "Coordinates inventory movement from intake through sale readiness.",
    defaultDutyNames: [
      "Review inventory status and priority vehicles",
      "Check vehicles needing inspection",
      "Check vehicles waiting for repairs",
      "Check vehicles waiting for detail",
      "Check vehicles ready for photos/listing",
      "Flag stalled inventory or recon bottlenecks",
      "Submit inventory and service production update"
    ]
  },
  {
    name: "Service Department Manager",
    description: "Owns service production throughput, shop coordination, and recon bottleneck visibility.",
    defaultDutyNames: [
      "Review service production priorities",
      "Review mechanic repair schedule",
      "Check vehicles awaiting parts",
      "Check vehicles awaiting QC",
      "Flag stalled inventory or recon bottlenecks",
      "Submit inventory and service production update"
    ]
  },
  {
    name: "Service Advisor",
    description: "Owns customer arrivals, check-in, concern capture, repair-order intake, approvals, and customer handoffs.",
    defaultDutyNames: [
      "Coordinate service advisor arrivals",
      "Confirm appointments",
      "Document customer concern and authorization",
      "Manage customer repair-order updates"
    ]
  },
  {
    name: "Mechanic",
    description: "Handles repair, diagnosis, and shop workflow updates.",
    defaultDutyNames: [
      "Review assigned repair and diagnostic tasks",
      "Update active repair statuses",
      "Mark waiting on parts or approval when applicable",
      "Move finished repair work to Ready for Review"
    ]
  },
  {
    name: "Parts",
    description: "Owns parts demand, sourcing, receiving, reservation, issue, returns, and repair readiness support.",
    defaultDutyNames: [
      "Check vehicles awaiting parts",
      "Support parts pickup and returns"
    ]
  },
  {
    name: "Quality Control",
    description: "Owns final repair inspection, failed-QC rechecks, completion evidence, and release readiness.",
    defaultDutyNames: [
      "Check vehicles awaiting QC",
      "Review ready-for-review tasks",
      "Flag stalled inventory or recon bottlenecks"
    ]
  },
  {
    name: "Salesperson",
    description: "Owns lead follow-up, appointments, and customer-facing sales tasks.",
    defaultDutyNames: [
      "Review sales follow-up tasks",
      "Follow up with assigned leads",
      "Confirm appointments",
      "Update sold or pending vehicle prep status",
      "Notify manager of hot leads or stalled deals"
    ]
  },
  {
    name: "Office Manager",
    description: "Supports office, front-desk, and admin work that keeps the dealership moving.",
    defaultDutyNames: [
      "Review office/admin support tasks",
      "Confirm appointments",
      "Flag missing documentation when noticed",
      "Support sales or inventory tasks when assigned"
    ]
  },
  {
    name: "Operations Coordinator",
    description: "Runs the front-door operating loop with broad visibility, lightweight action, paperwork support, and safe routing to final authority.",
    defaultDutyNames: [
      "Review office/admin support tasks",
      "Confirm appointments",
      "Coordinate service advisor arrivals",
      "Flag missing documentation when noticed",
      "Support sales or inventory tasks when assigned",
      "Support parts pickup and returns"
    ]
  },
  {
    name: "Marketing/Advertisement Manager",
    description: "Owns merchandising, listings, and marketing communication work.",
    defaultDutyNames: [
      "Check vehicles ready for photos",
      "Confirm listings are complete",
      "Update online advertising tasks",
      "Create or update broad marketing posts",
      "Flag missing photos or vehicle information"
    ]
  },
  {
    name: "Collections",
    description: "Supports collections-related follow-up work in the MVP.",
    defaultDutyNames: ["Submit daily collections log"]
  }
] as const;

export const developmentUserDefinitions = [
  {
    name: "Eli Manager",
    email: "morgan.manager@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["General Manager"],
    directDutyNames: []
  },
  {
    name: "Brock Inventory",
    email: "riley.inventory@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["Vehicle Operations Lead", "Inventory Manager", "Service Department Manager"],
    directDutyNames: []
  },
  {
    name: "Alex Carter",
    email: "alex.advisor@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["Service Advisor"],
    directDutyNames: []
  },
  {
    name: "Walter Mechanic",
    email: "casey.mechanic@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["Mechanic"],
    directDutyNames: [
      "Review assigned repair and diagnostic tasks",
      "Update active repair statuses",
      "Mark waiting on parts or approval when applicable",
      "Move finished repair work to Ready for Review"
    ]
  },
  {
    name: "Pat Parts",
    email: "pat.parts@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["Parts"],
    directDutyNames: []
  },
  {
    name: "Quincy QC",
    email: "quincy.qc@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["Quality Control"],
    directDutyNames: []
  },
  {
    name: "Baraka Sales",
    email: "jordan.sales@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["Salesperson"],
    directDutyNames: []
  },
  {
    name: "Ancilla Ops",
    email: "avery.ops@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["Operations Coordinator", "Office Manager", "Marketing/Advertisement Manager"],
    directDutyNames: []
  },
  {
    name: "Eva Collections",
    email: "quinn.collections@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["Collections"],
    directDutyNames: []
  },
  {
    name: "Jamie Inactive",
    email: "jamie.inactive@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: false,
    roleNames: ["Salesperson"],
    directDutyNames: []
  }
] as const;

export type DayOneTaskTemplateDefinition = {
  title: string;
  description?: string;
  workflowArea:
    | "INVENTORY"
    | "ADVERTISING"
    | "MARKETING"
    | "SALES"
    | "ADMIN"
    | "COLLECTIONS"
    | "SHOP"
    | "GENERAL_MANAGER";
  templateCategory?: string | null;
  priority?: TaskTemplatePriority;
  defaultDueTime: string;
  requiresManagerApproval: boolean;
  requiredUpdateFields?: TaskTemplateRequiredUpdateField[];
  checklistItems?: TaskTemplateChecklistItem[];
  completionCriteria?: TaskTemplateCompletionCriteria;
  defaultStatusRules?: TaskTemplateDefaultStatusRules;
  approvalRules?: TaskTemplateApprovalRules;
  intelligenceSignalType?: string;
  taskCardDisplayHints?: Partial<TaskTemplateCardDisplayHints>;
  isActive: boolean;
  roleName?: string;
  dutyName?: string;
};

const reviewStatusRules: TaskTemplateDefaultStatusRules = {
  allowedStatuses: ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "READY_FOR_REVIEW", "COMPLETED"],
  blockedReasonRequired: true,
  waitingReasonRequiredStatuses: []
};

const operationalStatusRules: TaskTemplateDefaultStatusRules = {
  allowedStatuses: [
    "NOT_STARTED",
    "IN_PROGRESS",
    "BLOCKED",
    "WAITING_ON_PARTS",
    "WAITING_ON_APPROVAL",
    "READY_FOR_REVIEW",
    "COMPLETED"
  ],
  blockedReasonRequired: true,
  waitingReasonRequiredStatuses: ["WAITING_ON_PARTS", "WAITING_ON_APPROVAL"]
};

const noApprovalRules: TaskTemplateApprovalRules = {
  mode: "none",
  readyForReviewRequired: false
};

const managerApprovalRules: TaskTemplateApprovalRules = {
  mode: "manager_review",
  readyForReviewRequired: true
};

const defaultCardDisplayHints: Partial<TaskTemplateCardDisplayHints> = {
  emphasizeDueTime: true,
  showChecklistProgress: true
};

function createRequiredField(
  key: string,
  label: string,
  type: TaskTemplateRequiredUpdateField["type"],
  overrides: Partial<Omit<TaskTemplateRequiredUpdateField, "key" | "label" | "type">> = {}
): TaskTemplateRequiredUpdateField {
  return {
    key,
    label,
    type,
    required: true,
    helpText: null,
    ...overrides
  };
}

function createChecklistItem(
  key: string,
  label: string,
  description: string | null,
  required = true
): TaskTemplateChecklistItem {
  return {
    key,
    label,
    description,
    required
  };
}

export const dayOneTaskTemplateDefinitions: readonly DayOneTaskTemplateDefinition[] = [
  {
    title: "Review today's dispatch board",
    description: "Review today's generated board, ownership, and priority work.",
    workflowArea: "GENERAL_MANAGER",
    defaultDueTime: "09:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Review today's dispatch board"
  },
  {
    title: "Review blocked tasks",
    description: "Review blocked tasks and decide what needs escalation or reassignment.",
    workflowArea: "GENERAL_MANAGER",
    defaultDueTime: "10:30",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Review blocked tasks"
  },
  {
    title: "Review waiting-on-approval tasks",
    description: "Review tasks waiting on manager approval and decide next action.",
    workflowArea: "GENERAL_MANAGER",
    defaultDueTime: "10:30",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Review waiting-on-approval tasks"
  },
  {
    title: "Review ready-for-review tasks",
    description: "Review work that staff marked ready for review before final completion.",
    workflowArea: "GENERAL_MANAGER",
    defaultDueTime: "16:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Review ready-for-review tasks"
  },
  {
    title: "Approve vehicles ready for sale",
    description: "Review vehicles reported as ready for sale and approve frontline readiness.",
    workflowArea: "GENERAL_MANAGER",
    defaultDueTime: "16:00",
    requiresManagerApproval: true,
    isActive: true,
    dutyName: "Approve vehicles ready for sale"
  },
  {
    title: "Review daily intelligence and set tomorrow directives",
    description: "Review the day's intelligence logs and set tomorrow's priorities.",
    workflowArea: "GENERAL_MANAGER",
    defaultDueTime: "17:30",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Review daily intelligence and set tomorrow directives"
  },
  {
    title: "Review inventory status and priority vehicles",
    description: "Review the inventory pipeline and identify the highest-priority units for today.",
    workflowArea: "INVENTORY",
    defaultDueTime: "10:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Review inventory status and priority vehicles"
  },
  {
    title: "Check vehicles needing inspection",
    description: "Identify vehicles that still need inspection or first-look review.",
    workflowArea: "INVENTORY",
    requiresManagerApproval: false,
    isActive: true,
    defaultDueTime: "10:00",
    dutyName: "Check vehicles needing inspection"
  },
  {
    title: "Check vehicles waiting for repairs",
    description: "Identify inventory waiting on repairs or diagnosis before it can move forward.",
    workflowArea: "INVENTORY",
    defaultDueTime: "11:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Check vehicles waiting for repairs"
  },
  {
    title: "Check vehicles waiting for detail",
    description: "Identify vehicles that are blocked at the detail or cleanup stage.",
    workflowArea: "INVENTORY",
    defaultDueTime: "12:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Check vehicles waiting for detail"
  },
  {
    title: "Check vehicles ready for photos/listing",
    description: "Confirm which vehicles are ready to move into photos and listing work.",
    workflowArea: "INVENTORY",
    defaultDueTime: "12:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Check vehicles ready for photos/listing"
  },
  {
    title: "Flag stalled inventory or recon bottlenecks",
    description: "Flag vehicles or workflow stages that are stalled and need attention.",
    workflowArea: "INVENTORY",
    defaultDueTime: "16:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Flag stalled inventory or recon bottlenecks"
  },
  {
    title: "Review service production priorities",
    description: "Review today's service priorities and what should move first through the shop.",
    workflowArea: "SHOP",
    defaultDueTime: "10:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Review service production priorities"
  },
  {
    title: "Review mechanic repair schedule",
    description: "Review mechanic workload, current repair assignments, and urgent diagnostics.",
    workflowArea: "SHOP",
    defaultDueTime: "10:30",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Review mechanic repair schedule"
  },
  {
    title: "Check vehicles awaiting parts",
    description: "Review vehicles waiting on parts and confirm what is blocking movement.",
    workflowArea: "SHOP",
    defaultDueTime: "11:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Check vehicles awaiting parts"
  },
  {
    title: "Check vehicles awaiting QC",
    description: "Review vehicles waiting for quality check or final inspection.",
    workflowArea: "SHOP",
    defaultDueTime: "15:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Check vehicles awaiting QC"
  },
  {
    title: "Submit inventory and service production update",
    description: "Submit the combined end-of-day inventory and service production update.",
    workflowArea: "SHOP",
    defaultDueTime: "17:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Submit inventory and service production update"
  },
  {
    title: "Review assigned repair and diagnostic tasks",
    description: "Review assigned repair and diagnostic work before starting today's repairs.",
    workflowArea: "SHOP",
    defaultDueTime: "10:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Review assigned repair and diagnostic tasks"
  },
  {
    title: "Update active repair statuses",
    description: "Update repair progress clearly so the board reflects current shop status.",
    workflowArea: "SHOP",
    defaultDueTime: "11:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Update active repair statuses"
  },
  {
    title: "Mark waiting on parts or approval when applicable",
    description: "Mark repairs waiting on parts or approval when work cannot continue normally.",
    workflowArea: "SHOP",
    defaultDueTime: "12:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Mark waiting on parts or approval when applicable"
  },
  {
    title: "Move finished repair work to Ready for Review",
    description: "Move finished repair work to Ready for Review when the work is complete.",
    workflowArea: "SHOP",
    defaultDueTime: "15:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Move finished repair work to Ready for Review"
  },
  {
    title: "Complete repair report for completed repair",
    description: "Document the completed repair, outcome, and any remaining concern.",
    workflowArea: "SHOP",
    defaultDueTime: "15:30",
    requiresManagerApproval: false,
    isActive: false,
    dutyName: "Complete repair report for completed repair"
  },
  {
    title: "Confirm listings are complete",
    description: "Check active listings and confirm the latest merchandising work is complete.",
    workflowArea: "ADVERTISING",
    defaultDueTime: "15:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Confirm listings are complete"
  },
  {
    title: "Review sales follow-up tasks",
    description: "Review the open sales follow-up queue and make sure active leads have next steps.",
    workflowArea: "SALES",
    defaultDueTime: "14:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Review sales follow-up tasks"
  },
  {
    title: "Follow up with assigned leads",
    description: "Contact assigned leads and keep the sales pipeline moving.",
    workflowArea: "SALES",
    defaultDueTime: "14:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Follow up with assigned leads"
  },
  {
    title: "Confirm appointments",
    description: "Confirm appointments, expected arrivals, and customer handoffs.",
    workflowArea: "SALES",
    defaultDueTime: "14:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Confirm appointments"
  },
  {
    title: "Update sold or pending vehicle prep status",
    description: "Update the prep status for sold or pending vehicles headed toward delivery.",
    workflowArea: "SALES",
    defaultDueTime: "14:30",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Update sold or pending vehicle prep status"
  },
  {
    title: "Notify manager of hot leads or stalled deals",
    description: "Escalate hot leads, stalled deals, or anything needing manager attention.",
    workflowArea: "SALES",
    defaultDueTime: "15:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Notify manager of hot leads or stalled deals"
  },
  {
    title: "Check vehicles ready for photos",
    description: "Confirm which vehicles are ready for photos, listings, and merchandising.",
    workflowArea: "ADVERTISING",
    defaultDueTime: "12:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Check vehicles ready for photos"
  },
  {
    title: "Update online advertising tasks",
    description: "Keep listings and advertising work moving for vehicles ready to market.",
    workflowArea: "ADVERTISING",
    defaultDueTime: "15:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Update online advertising tasks"
  },
  {
    title: "Create or update broad marketing posts",
    description: "Create or update broad marketing posts that support inventory and promotions.",
    workflowArea: "MARKETING",
    defaultDueTime: "15:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Create or update broad marketing posts"
  },
  {
    title: "Flag missing photos or vehicle information",
    description: "Flag missing photos, missing vehicle information, or listing blockers.",
    workflowArea: "ADVERTISING",
    defaultDueTime: "15:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Flag missing photos or vehicle information"
  },
  {
    title: "Review office/admin support tasks",
    description: "Review office, admin, and front-desk support work that needs attention today.",
    workflowArea: "ADMIN",
    defaultDueTime: "10:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Review office/admin support tasks"
  },
  {
    title: "Flag missing documentation when noticed",
    description: "Flag missing paperwork, title, DMV, or documentation issues when noticed.",
    workflowArea: "ADMIN",
    defaultDueTime: "15:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Flag missing documentation when noticed"
  },
  {
    title: "Support sales or inventory tasks when assigned",
    description: "Support sales or inventory workflow tasks when specifically assigned.",
    workflowArea: "ADMIN",
    defaultDueTime: "15:30",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Support sales or inventory tasks when assigned"
  },
  {
    title: "Submit daily collections log",
    description: "Submit the daily collections update with payment status and next steps.",
    workflowArea: "COLLECTIONS",
    defaultDueTime: "17:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Submit daily collections log"
  },
  {
    title: "General Manager board review",
    description: "Review the board, ownership gaps, and highest-priority work before the day gets away from the team.",
    workflowArea: "GENERAL_MANAGER",
    templateCategory: "management_review",
    priority: "CRITICAL",
    defaultDueTime: "09:00",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("focus_summary", "Review summary", "long_text", {
        helpText: "What did you review, and what did you find?"
      }),
      createRequiredField("top_priority", "Highest-priority next action", "short_text", {
        helpText: "What must happen next, who owns it, and when is it due?"
      }),
      createRequiredField("staffing_risk", "Staffing risk", "boolean", { required: false })
    ],
    checklistItems: [
      createChecklistItem("review_board", "Review today's board", "Confirm ownership, due times, and gaps."),
      createChecklistItem("identify_hotspots", "Identify hotspots", "Call out blockers, overdue work, and urgent units.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["review_board", "identify_hotspots"],
      requiredFieldKeys: ["focus_summary", "top_priority"]
    },
    defaultStatusRules: reviewStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "DAILY_INTELLIGENCE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      highlightReadyForReview: true
    },
    isActive: true,
    roleName: "General Manager"
  },
  {
    title: "General Manager blocked task review",
    description: "Review blocked work, decide whether to unblock, escalate, or reassign, and leave clear next direction.",
    workflowArea: "GENERAL_MANAGER",
    templateCategory: "management_review",
    priority: "HIGH",
    defaultDueTime: "10:30",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("blocked_summary", "Blocked summary", "long_text"),
      createRequiredField("escalation_needed", "Escalation needed", "boolean")
    ],
    checklistItems: [
      createChecklistItem("review_blocked_queue", "Review blocked queue", "Confirm each blocked item has an actionable next step.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["review_blocked_queue"],
      requiredFieldKeys: ["blocked_summary", "escalation_needed"]
    },
    defaultStatusRules: reviewStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "DAILY_INTELLIGENCE",
    taskCardDisplayHints: defaultCardDisplayHints,
    isActive: true,
    roleName: "General Manager"
  },
  {
    title: "General Manager ready-for-review review",
    description: "Review items waiting for approval or final manager signoff and keep the queue moving same day.",
    workflowArea: "GENERAL_MANAGER",
    templateCategory: "management_review",
    priority: "HIGH",
    defaultDueTime: "16:00",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("review_outcome", "Review outcome", "long_text")
    ],
    checklistItems: [
      createChecklistItem("review_ready_queue", "Review ready-for-review queue", "Confirm each task is accepted or returned with direction.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["review_ready_queue"],
      requiredFieldKeys: ["review_outcome"]
    },
    defaultStatusRules: reviewStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "DAILY_INTELLIGENCE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      highlightReadyForReview: true
    },
    isActive: true,
    roleName: "General Manager"
  },
  {
    title: "General Manager daily directives",
    description: "Set the next operating directives based on today's board and intelligence review.",
    workflowArea: "GENERAL_MANAGER",
    templateCategory: "manager_directive",
    priority: "CRITICAL",
    defaultDueTime: "17:30",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("tomorrow_directive", "Tomorrow directive", "long_text"),
      createRequiredField("follow_up_area", "Follow-up area", "single_select", {
        options: ["Inventory", "Service", "Sales", "Marketing", "Office", "Collections"]
      })
    ],
    checklistItems: [
      createChecklistItem("review_daily_intelligence", "Review daily intelligence", "Use today's feed and manager observations."),
      createChecklistItem("publish_direction", "Publish next direction", "Capture a concise directive the team can act on tomorrow.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["review_daily_intelligence", "publish_direction"],
      requiredFieldKeys: ["tomorrow_directive", "follow_up_area"]
    },
    defaultStatusRules: reviewStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "MANAGER_DIRECTIVE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeCustomer: false
    },
    isActive: true,
    roleName: "General Manager"
  },
  {
    title: "Inventory movement update",
    description: "Update where the unit moved today, what stage it is in now, and what is blocking the next move.",
    workflowArea: "INVENTORY",
    templateCategory: "inventory_recon",
    priority: "HIGH",
    defaultDueTime: "11:00",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("unit_reference", "Unit reference", "short_text"),
      createRequiredField("movement_stage", "Movement stage", "single_select", {
        options: ["Intake", "Inspection", "Recon", "Detail", "Photos", "Frontline"]
      }),
      createRequiredField("movement_note", "Movement note", "long_text")
    ],
    checklistItems: [
      createChecklistItem("confirm_location", "Confirm vehicle location", "Make sure the board reflects the unit's actual stage.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["confirm_location"],
      requiredFieldKeys: ["unit_reference", "movement_stage", "movement_note"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "INVENTORY_UPDATE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeVehicle: true
    },
    isActive: true,
    roleName: "Inventory Manager"
  },
  {
    title: "Inventory recon stage update",
    description: "Capture the current recon stage, expected next step, and whether the vehicle is stalled.",
    workflowArea: "INVENTORY",
    templateCategory: "inventory_recon",
    priority: "HIGH",
    defaultDueTime: "14:00",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("unit_reference", "Unit reference", "short_text"),
      createRequiredField("recon_stage", "Recon stage", "single_select", {
        options: ["Awaiting inspection", "In service", "Awaiting parts", "Awaiting detail", "Awaiting photos"]
      }),
      createRequiredField("next_step", "Next step", "short_text")
    ],
    checklistItems: [
      createChecklistItem("confirm_stage", "Confirm recon stage", "Verify the board stage matches current reality.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["confirm_stage"],
      requiredFieldKeys: ["unit_reference", "recon_stage", "next_step"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "RECON_UPDATE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeVehicle: true
    },
    isActive: true,
    roleName: "Inventory Manager"
  },
  {
    title: "Ready-for-sale confirmation",
    description: "Confirm the vehicle truly meets frontline readiness before signaling it as ready for sale.",
    workflowArea: "INVENTORY",
    templateCategory: "inventory_readiness",
    priority: "CRITICAL",
    defaultDueTime: "16:00",
    requiresManagerApproval: true,
    requiredUpdateFields: [
      createRequiredField("unit_reference", "Unit reference", "short_text"),
      createRequiredField("sale_readiness_note", "Sale readiness note", "long_text")
    ],
    checklistItems: [
      createChecklistItem("verify_recon_complete", "Verify recon complete", "Mechanical and cosmetic recon is complete."),
      createChecklistItem("verify_merchandising_ready", "Verify merchandising ready", "Photos/listing assets are ready or scheduled.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["verify_recon_complete", "verify_merchandising_ready"],
      requiredFieldKeys: ["unit_reference", "sale_readiness_note"]
    },
    defaultStatusRules: reviewStatusRules,
    approvalRules: managerApprovalRules,
    intelligenceSignalType: "INVENTORY_UPDATE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeVehicle: true,
      highlightReadyForReview: true
    },
    isActive: true,
    roleName: "Inventory Manager"
  },
  {
    title: "Service production update",
    description: "Update the day's service throughput, major bottlenecks, and whether work is on pace.",
    workflowArea: "SHOP",
    templateCategory: "service_production",
    priority: "HIGH",
    defaultDueTime: "11:30",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("production_summary", "Production summary", "long_text"),
      createRequiredField("shop_risk", "Shop risk", "boolean")
    ],
    checklistItems: [
      createChecklistItem("review_open_work", "Review open service work", "Scan active repairs and identify bottlenecks.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["review_open_work"],
      requiredFieldKeys: ["production_summary", "shop_risk"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "SERVICE_UPDATE",
    taskCardDisplayHints: defaultCardDisplayHints,
    isActive: true,
    roleName: "Service Department Manager"
  },
  {
    title: "Repair status update",
    description: "Capture the current repair status so the board reflects whether the work is progressing, stalled, or ready for review.",
    workflowArea: "SHOP",
    templateCategory: "repair_status",
    priority: "HIGH",
    defaultDueTime: "13:00",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("repair_order", "Repair order", "short_text"),
      createRequiredField("repair_status_note", "Repair status note", "long_text")
    ],
    checklistItems: [
      createChecklistItem("confirm_current_status", "Confirm current repair status", "Update the board before moving to the next unit.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["confirm_current_status"],
      requiredFieldKeys: ["repair_order", "repair_status_note"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "SERVICE_UPDATE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeVehicle: true
    },
    isActive: true,
    roleName: "Mechanic"
  },
  {
    title: "Parts waiting update",
    description: "Log what part is missing, what is being waited on, and what the next follow-up should be.",
    workflowArea: "SHOP",
    templateCategory: "repair_status",
    priority: "HIGH",
    defaultDueTime: "14:00",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("repair_order", "Repair order", "short_text"),
      createRequiredField("parts_wait_note", "Parts wait note", "long_text")
    ],
    checklistItems: [
      createChecklistItem("mark_waiting_status", "Mark waiting status", "Use the correct waiting status and note the reason.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["mark_waiting_status"],
      requiredFieldKeys: ["repair_order", "parts_wait_note"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "SERVICE_UPDATE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeVehicle: true
    },
    isActive: true,
    roleName: "Mechanic"
  },
  {
    title: "QC ready review",
    description: "Confirm the repair is complete and ready to move into review without missing open concerns.",
    workflowArea: "SHOP",
    templateCategory: "quality_control",
    priority: "HIGH",
    defaultDueTime: "15:30",
    requiresManagerApproval: true,
    requiredUpdateFields: [
      createRequiredField("repair_order", "Repair order", "short_text"),
      createRequiredField("qc_note", "QC note", "long_text")
    ],
    checklistItems: [
      createChecklistItem("confirm_work_complete", "Confirm work complete", "No remaining open repair items."),
      createChecklistItem("move_ready_for_review", "Move to Ready for Review", "Route the task through the approval path.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["confirm_work_complete", "move_ready_for_review"],
      requiredFieldKeys: ["repair_order", "qc_note"]
    },
    defaultStatusRules: reviewStatusRules,
    approvalRules: managerApprovalRules,
    intelligenceSignalType: "SERVICE_UPDATE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeVehicle: true,
      highlightReadyForReview: true
    },
    isActive: true,
    roleName: "Service Department Manager"
  },
  {
    title: "Photo completion update",
    description: "Confirm photo work is complete or call out what still prevents the unit from being merchandised.",
    workflowArea: "ADVERTISING",
    templateCategory: "marketing_assets",
    priority: "HIGH",
    defaultDueTime: "13:00",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("unit_reference", "Unit reference", "short_text"),
      createRequiredField("photo_status", "Photo status", "single_select", {
        options: ["Not started", "In progress", "Completed", "Blocked"]
      })
    ],
    checklistItems: [
      createChecklistItem("verify_photo_set", "Verify photo set", "Confirm required photo coverage is complete.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["verify_photo_set"],
      requiredFieldKeys: ["unit_reference", "photo_status"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "MARKETING_UPDATE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeVehicle: true
    },
    isActive: true,
    roleName: "Marketing/Advertisement Manager"
  },
  {
    title: "Listing completeness review",
    description: "Review whether the listing is complete enough to publish confidently and flag what is still missing.",
    workflowArea: "ADVERTISING",
    templateCategory: "marketing_assets",
    priority: "HIGH",
    defaultDueTime: "15:00",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("unit_reference", "Unit reference", "short_text"),
      createRequiredField("listing_gap_note", "Listing gap note", "long_text")
    ],
    checklistItems: [
      createChecklistItem("verify_photos", "Verify photos attached", "Photos are present and usable."),
      createChecklistItem("verify_vehicle_details", "Verify vehicle details", "Pricing and core features are present.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["verify_photos", "verify_vehicle_details"],
      requiredFieldKeys: ["unit_reference", "listing_gap_note"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "MARKETING_UPDATE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeVehicle: true
    },
    isActive: true,
    roleName: "Marketing/Advertisement Manager"
  },
  {
    title: "Campaign activity update",
    description: "Log today's campaign work and note whether any inventory-ready units still need marketing support.",
    workflowArea: "MARKETING",
    templateCategory: "marketing_campaign",
    priority: "MEDIUM",
    defaultDueTime: "16:30",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("campaign_summary", "Campaign summary", "long_text"),
      createRequiredField("campaign_channel", "Campaign channel", "single_select", {
        options: ["Facebook", "Instagram", "Marketplace", "Website", "Email"]
      })
    ],
    checklistItems: [
      createChecklistItem("record_campaign_work", "Record campaign work", "Capture today's meaningful activity.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["record_campaign_work"],
      requiredFieldKeys: ["campaign_summary", "campaign_channel"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "MARKETING_UPDATE",
    taskCardDisplayHints: defaultCardDisplayHints,
    isActive: true,
    roleName: "Marketing/Advertisement Manager"
  },
  {
    title: "Missing asset flag",
    description: "Flag missing merchandising assets so stalled listings show up in the day's intelligence.",
    workflowArea: "ADVERTISING",
    templateCategory: "marketing_assets",
    priority: "HIGH",
    defaultDueTime: "15:30",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("unit_reference", "Unit reference", "short_text"),
      createRequiredField("missing_asset_type", "Missing asset type", "single_select", {
        options: ["Photos", "Description", "Price", "Options", "Title status"]
      })
    ],
    checklistItems: [
      createChecklistItem("flag_missing_asset", "Flag missing asset", "Create a clear signal for follow-up.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["flag_missing_asset"],
      requiredFieldKeys: ["unit_reference", "missing_asset_type"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "MARKETING_UPDATE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeVehicle: true
    },
    isActive: true,
    roleName: "Marketing/Advertisement Manager"
  },
  {
    title: "Lead follow-up update",
    description: "Capture a meaningful follow-up update so the next salesperson action is clear and reportable.",
    workflowArea: "SALES",
    templateCategory: "sales_follow_up",
    priority: "HIGH",
    defaultDueTime: "11:00",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("customer_name", "Customer name", "short_text"),
      createRequiredField("follow_up_note", "Follow-up note", "long_text")
    ],
    checklistItems: [
      createChecklistItem("record_customer_contact", "Record customer contact", "Log the latest real outreach or response.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["record_customer_contact"],
      requiredFieldKeys: ["customer_name", "follow_up_note"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "SALES_UPDATE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeCustomer: true
    },
    isActive: true,
    roleName: "Salesperson"
  },
  {
    title: "Appointment confirmation update",
    description: "Confirm the appointment is still live and leave clear context for the team.",
    workflowArea: "SALES",
    templateCategory: "sales_appointment",
    priority: "HIGH",
    defaultDueTime: "12:00",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("customer_name", "Customer name", "short_text"),
      createRequiredField("appointment_status", "Appointment status", "single_select", {
        options: ["Confirmed", "Needs follow-up", "Rescheduled", "Cancelled"]
      })
    ],
    checklistItems: [
      createChecklistItem("confirm_customer_time", "Confirm customer time", "Make sure the expected arrival is current.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["confirm_customer_time"],
      requiredFieldKeys: ["customer_name", "appointment_status"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "SALES_UPDATE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeCustomer: true
    },
    isActive: true,
    roleName: "Salesperson"
  },
  {
    title: "Test drive update",
    description: "Record the outcome of the test drive and whether the deal is moving, stalled, or needs manager help.",
    workflowArea: "SALES",
    templateCategory: "sales_progress",
    priority: "HIGH",
    defaultDueTime: "15:00",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("customer_name", "Customer name", "short_text"),
      createRequiredField("test_drive_outcome", "Test drive outcome", "long_text")
    ],
    checklistItems: [
      createChecklistItem("capture_next_step", "Capture next step", "Leave a concrete next action for the deal.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["capture_next_step"],
      requiredFieldKeys: ["customer_name", "test_drive_outcome"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "SALES_UPDATE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeCustomer: true
    },
    isActive: true,
    roleName: "Salesperson"
  },
  {
    title: "Pending delivery update",
    description: "Capture what still needs to happen before delivery and whether any office or inventory help is needed.",
    workflowArea: "SALES",
    templateCategory: "sales_delivery",
    priority: "HIGH",
    defaultDueTime: "16:00",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("customer_name", "Customer name", "short_text"),
      createRequiredField("delivery_readiness_note", "Delivery readiness note", "long_text")
    ],
    checklistItems: [
      createChecklistItem("confirm_delivery_path", "Confirm delivery path", "Note any missing items before handoff.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["confirm_delivery_path"],
      requiredFieldKeys: ["customer_name", "delivery_readiness_note"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "SALES_UPDATE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeCustomer: true
    },
    isActive: true,
    roleName: "Salesperson"
  },
  {
    title: "Customer issue update",
    description: "Capture the customer issue clearly so the next owner can respond without losing context.",
    workflowArea: "ADMIN",
    templateCategory: "office_support",
    priority: "HIGH",
    defaultDueTime: "11:30",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("customer_name", "Customer name", "short_text"),
      createRequiredField("issue_summary", "Issue summary", "long_text")
    ],
    checklistItems: [
      createChecklistItem("log_issue_context", "Log issue context", "Include enough detail for follow-up.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["log_issue_context"],
      requiredFieldKeys: ["customer_name", "issue_summary"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "CUSTOMER_ISSUE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeCustomer: true
    },
    isActive: true,
    roleName: "Office Manager"
  },
  {
    title: "Title or document signal",
    description: "Flag title and document issues early so they feed the board and do not block delivery unexpectedly.",
    workflowArea: "ADMIN",
    templateCategory: "office_documents",
    priority: "HIGH",
    defaultDueTime: "14:30",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("document_type", "Document type", "single_select", {
        options: ["Title", "Registration", "Insurance", "POI", "Other"]
      }),
      createRequiredField("document_note", "Document note", "long_text")
    ],
    checklistItems: [
      createChecklistItem("flag_document_issue", "Flag document issue", "Record the missing or incorrect document clearly.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["flag_document_issue"],
      requiredFieldKeys: ["document_type", "document_note"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "CUSTOMER_ISSUE",
    taskCardDisplayHints: defaultCardDisplayHints,
    isActive: true,
    roleName: "Office Manager"
  },
  {
    title: "Insurance communication update",
    description: "Log insurance-related communication so the team has a shared view of what is pending.",
    workflowArea: "ADMIN",
    templateCategory: "office_support",
    priority: "MEDIUM",
    defaultDueTime: "15:00",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("customer_name", "Customer name", "short_text"),
      createRequiredField("insurance_note", "Insurance note", "long_text")
    ],
    checklistItems: [
      createChecklistItem("record_insurance_contact", "Record insurance contact", "Capture the most recent update or request.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["record_insurance_contact"],
      requiredFieldKeys: ["customer_name", "insurance_note"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "CUSTOMER_ISSUE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeCustomer: true
    },
    isActive: true,
    roleName: "Office Manager"
  },
  {
    title: "Appointment support update",
    description: "Support appointment flow and make sure sales and front desk are aligned on arrivals and special needs.",
    workflowArea: "ADMIN",
    templateCategory: "office_support",
    priority: "MEDIUM",
    defaultDueTime: "12:30",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("customer_name", "Customer name", "short_text"),
      createRequiredField("support_note", "Support note", "long_text")
    ],
    checklistItems: [
      createChecklistItem("confirm_support_need", "Confirm support need", "Document what help is needed for the appointment.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["confirm_support_need"],
      requiredFieldKeys: ["customer_name", "support_note"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "CUSTOMER_ISSUE",
    taskCardDisplayHints: {
      ...defaultCardDisplayHints,
      emphasizeCustomer: true
    },
    isActive: true,
    roleName: "Office Manager"
  },
  {
    title: "Payment received update",
    description: "Record a received payment and note whether follow-up still remains on the account.",
    workflowArea: "COLLECTIONS",
    templateCategory: "collections_account",
    priority: "HIGH",
    defaultDueTime: "13:30",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("account_name", "Account name", "short_text"),
      createRequiredField("payment_note", "Payment note", "long_text")
    ],
    checklistItems: [
      createChecklistItem("record_payment", "Record payment", "Capture the payment update before closing the task.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["record_payment"],
      requiredFieldKeys: ["account_name", "payment_note"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "COLLECTIONS_UPDATE",
    taskCardDisplayHints: defaultCardDisplayHints,
    isActive: true,
    roleName: "Collections"
  },
  {
    title: "Late account follow-up",
    description: "Log the status of a late account and whether the next action is a call, reminder, or manager escalation.",
    workflowArea: "COLLECTIONS",
    templateCategory: "collections_account",
    priority: "HIGH",
    defaultDueTime: "15:00",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("account_name", "Account name", "short_text"),
      createRequiredField("late_status_note", "Late status note", "long_text")
    ],
    checklistItems: [
      createChecklistItem("record_collection_attempt", "Record collection attempt", "Capture the latest contact or result.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["record_collection_attempt"],
      requiredFieldKeys: ["account_name", "late_status_note"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "COLLECTIONS_UPDATE",
    taskCardDisplayHints: defaultCardDisplayHints,
    isActive: true,
    roleName: "Collections"
  },
  {
    title: "Arrangement update",
    description: "Capture payment arrangement changes so the account history and next step stay accurate.",
    workflowArea: "COLLECTIONS",
    templateCategory: "collections_account",
    priority: "MEDIUM",
    defaultDueTime: "16:30",
    requiresManagerApproval: false,
    requiredUpdateFields: [
      createRequiredField("account_name", "Account name", "short_text"),
      createRequiredField("arrangement_note", "Arrangement note", "long_text")
    ],
    checklistItems: [
      createChecklistItem("record_arrangement", "Record arrangement", "Document the promised amount or follow-up date.")
    ],
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: ["record_arrangement"],
      requiredFieldKeys: ["account_name", "arrangement_note"]
    },
    defaultStatusRules: operationalStatusRules,
    approvalRules: noApprovalRules,
    intelligenceSignalType: "COLLECTIONS_UPDATE",
    taskCardDisplayHints: defaultCardDisplayHints,
    isActive: true,
    roleName: "Collections"
  }
];
