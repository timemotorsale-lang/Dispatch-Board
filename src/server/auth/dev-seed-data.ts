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
