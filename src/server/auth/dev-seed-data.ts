export const SHARED_DEVELOPMENT_PASSWORD = "dispatch123!";

export const dayOneDutyDefinitions = [
  {
    name: "Review inventory status",
    workflowArea: "Inventory",
    description: "Review the current inventory pipeline and flag units needing attention."
  },
  {
    name: "Check vehicles ready for photos",
    workflowArea: "Advertising",
    description: "Confirm which vehicles are ready for photos, listings, and merchandising."
  },
  {
    name: "Update online advertising tasks",
    workflowArea: "Advertising",
    description: "Keep listings and advertising work moving for vehicles that are ready to market."
  },
  {
    name: "Publish marketing posts",
    workflowArea: "Marketing",
    description: "Create or publish marketing content that supports current inventory and promotions."
  },
  {
    name: "Follow up with assigned leads",
    workflowArea: "Sales",
    description: "Handle sales follow-ups, appointments, and stalled lead activity."
  },
  {
    name: "Review repair and diagnosis queue",
    workflowArea: "Mechanic / Shop",
    description: "Review current repair work, diagnosis tasks, and repair blockers."
  },
  {
    name: "Handle office and admin support tasks",
    workflowArea: "Office/Admin",
    description: "Support office paperwork, admin coordination, and shared internal follow-up."
  },
  {
    name: "Review blockers and approvals",
    workflowArea: "General manager review",
    description: "Review blocked work, assignments, and approval-required items across the board."
  },
  {
    name: "Review collections follow-ups",
    workflowArea: "Collections",
    description: "Handle basic collections follow-up work that needs visibility on the board."
  }
] as const;

export const dayOneRoleDefinitions = [
  {
    name: "General Manager",
    description: "Owns the daily board, reviews blockers, and approves manager-only workflow decisions.",
    defaultDutyNames: ["Review blockers and approvals"]
  },
  {
    name: "Inventory Manager",
    description: "Coordinates inventory movement from intake through sale readiness.",
    defaultDutyNames: ["Review inventory status", "Check vehicles ready for photos"]
  },
  {
    name: "Mechanic",
    description: "Handles repair, diagnosis, and shop workflow updates.",
    defaultDutyNames: ["Review repair and diagnosis queue"]
  },
  {
    name: "Salesperson",
    description: "Owns lead follow-up, appointments, and customer-facing sales tasks.",
    defaultDutyNames: ["Follow up with assigned leads"]
  },
  {
    name: "Office Manager",
    description: "Supports office and admin work that keeps the dealership moving.",
    defaultDutyNames: ["Handle office and admin support tasks"]
  },
  {
    name: "Marketing/Advertisement Manager",
    description: "Owns merchandising, listings, and marketing communication work.",
    defaultDutyNames: ["Check vehicles ready for photos", "Update online advertising tasks", "Publish marketing posts"]
  },
  {
    name: "Collections",
    description: "Supports collections-related follow-up work in the MVP.",
    defaultDutyNames: ["Review collections follow-ups"]
  }
] as const;

export const developmentUserDefinitions = [
  {
    name: "Morgan Manager",
    email: "morgan.manager@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["General Manager"],
    directDutyNames: ["Review blockers and approvals"]
  },
  {
    name: "Riley Inventory",
    email: "riley.inventory@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["Inventory Manager"],
    directDutyNames: ["Review inventory status"]
  },
  {
    name: "Casey Mechanic",
    email: "casey.mechanic@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["Mechanic"],
    directDutyNames: ["Review repair and diagnosis queue"]
  },
  {
    name: "Jordan Sales",
    email: "jordan.sales@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["Salesperson"],
    directDutyNames: ["Follow up with assigned leads"]
  },
  {
    name: "Avery Ops",
    email: "avery.ops@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["Office Manager", "Marketing/Advertisement Manager"],
    directDutyNames: ["Handle office and admin support tasks", "Publish marketing posts"]
  },
  {
    name: "Quinn Collections",
    email: "quinn.collections@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: true,
    roleNames: ["Collections"],
    directDutyNames: ["Review collections follow-ups"]
  },
  {
    name: "Jamie Inactive",
    email: "jamie.inactive@local.test",
    password: SHARED_DEVELOPMENT_PASSWORD,
    isActive: false,
    roleNames: ["Salesperson"],
    directDutyNames: ["Follow up with assigned leads"]
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
    title: "Review inventory status",
    description: "Review the inventory pipeline and flag units that need movement or attention.",
    workflowArea: "INVENTORY",
    defaultDueTime: "09:00",
    requiresManagerApproval: false,
    isActive: true,
    roleName: "Inventory Manager"
  },
  {
    title: "Check vehicles ready for photos and listing",
    description: "Confirm which vehicles are ready for photos, merchandising, and listing prep.",
    workflowArea: "ADVERTISING",
    defaultDueTime: "10:00",
    requiresManagerApproval: false,
    isActive: true,
    dutyName: "Check vehicles ready for photos"
  },
  {
    title: "Update repair status",
    description: "Update repair progress and identify anything blocked in the shop workflow.",
    workflowArea: "SHOP",
    defaultDueTime: "11:00",
    requiresManagerApproval: false,
    isActive: true,
    roleName: "Mechanic",
    dutyName: "Review repair and diagnosis queue"
  },
  {
    title: "Confirm listings are complete",
    description: "Check active listings and confirm the latest merchandising work is complete.",
    workflowArea: "ADVERTISING",
    defaultDueTime: "13:00",
    requiresManagerApproval: false,
    isActive: true,
    roleName: "Marketing/Advertisement Manager",
    dutyName: "Update online advertising tasks"
  },
  {
    title: "Review sales follow-up tasks",
    description: "Review the open sales follow-up queue and make sure active leads have next steps.",
    workflowArea: "SALES",
    defaultDueTime: "15:00",
    requiresManagerApproval: false,
    isActive: true,
    roleName: "Salesperson",
    dutyName: "Follow up with assigned leads"
  },
  {
    title: "Review blocked tasks",
    description: "Review blocked items that need manager attention or a decision to move forward.",
    workflowArea: "GENERAL_MANAGER",
    defaultDueTime: "16:00",
    requiresManagerApproval: true,
    isActive: true,
    roleName: "General Manager"
  },
  {
    title: "Review tasks marked Ready for Review",
    description: "Review work that staff have marked ready for approval before final completion.",
    workflowArea: "GENERAL_MANAGER",
    defaultDueTime: "16:30",
    requiresManagerApproval: true,
    isActive: true,
    roleName: "General Manager"
  }
];
