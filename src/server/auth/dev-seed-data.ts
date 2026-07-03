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
    roleNames: ["Inventory Manager", "Service Department Manager"],
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
    roleNames: ["Office Manager", "Marketing/Advertisement Manager"],
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
  defaultDueTime: string;
  requiresManagerApproval: boolean;
  isActive: boolean;
  roleName?: string;
  dutyName?: string;
};

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
  }
];
