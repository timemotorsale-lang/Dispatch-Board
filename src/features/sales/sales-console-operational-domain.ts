export const salesConsoleActionStates = [
  "Live Action",
  "Controlled Action",
  "Source-System Action",
  "Future / Governed"
] as const;

export type SalesConsoleActionState = (typeof salesConsoleActionStates)[number];

export const salesConsoleRevenueLaneNames = [
  "Inventory Cash Sale",
  "Inventory BHPH Sale",
  "Inventory Lease-to-Own",
  "Public Auto Repair",
  "Daily Rental",
  "Warranty Product",
  "Financing Product"
] as const;

export type SalesConsoleRevenueLaneName = (typeof salesConsoleRevenueLaneNames)[number];

export const salesConsoleStaffRoles = [
  "Salesperson",
  "BDC / Lead Coordinator",
  "Sales Manager",
  "Admin / Owner"
] as const;

export type SalesConsoleStaffRole = (typeof salesConsoleStaffRoles)[number];

export type SalesConsoleFreshness = "current" | "due-today" | "stale" | "blocked" | "unavailable";

export type SalesConsoleSourceRecordLink = {
  id: string;
  label: string;
  ownerSystem: "CRM" | "DMS" | "Inventory" | "Service" | "Rental" | "Warranty" | "Finance" | "Sales Console";
  href: string;
  freshness: SalesConsoleFreshness;
};

export type SalesConsoleBlocker = {
  code: string;
  label: string;
  owner: string;
  severity: "watch" | "risk" | "blocked";
};

export type SalesOpportunityViewModel = {
  opportunityId: string;
  customerName: string;
  contact: string;
  owner: string;
  roleVisibility: SalesConsoleStaffRole[];
  stage: string;
  nextAction: string;
  nextActionDue: string;
  freshness: SalesConsoleFreshness;
  source: SalesConsoleSourceRecordLink;
  blockers: SalesConsoleBlocker[];
};

export type RevenueOpportunityViewModel = SalesOpportunityViewModel & {
  lane: SalesConsoleRevenueLaneName;
  laneStage: string;
  selectedVehicle?: {
    stockNumber: string;
    label: string;
  };
  actionState: SalesConsoleActionState;
  governedReason?: string;
};

export type RevenueLaneContract = {
  lane: SalesConsoleRevenueLaneName;
  mvpStageModel: string[];
  requiredFields: string[];
  sourceOwners: SalesConsoleSourceRecordLink["ownerSystem"][];
  allowedMvpActions: string[];
  governedActions: string[];
};

export const salesConsoleRevenueLaneContracts: RevenueLaneContract[] = [
  {
    lane: "Inventory Cash Sale",
    mvpStageModel: ["New", "Vehicle Confirmed", "Proposal", "Manager Review", "Delivery Readiness", "Closed"],
    requiredFields: ["customer", "selected vehicle", "price posture", "next action", "source link"],
    sourceOwners: ["CRM", "Inventory", "DMS", "Sales Console"],
    allowedMvpActions: ["open record", "open revenue desk", "request manager review"],
    governedActions: ["quote submission", "discount approval", "vehicle hold"]
  },
  {
    lane: "Inventory BHPH Sale",
    mvpStageModel: ["New", "Qualified", "Compliance", "Manager Review", "Finance Handoff", "Closed"],
    requiredFields: ["customer", "selected vehicle", "down payment intent", "proof checklist", "source link"],
    sourceOwners: ["CRM", "Inventory", "Finance", "Sales Console"],
    allowedMvpActions: ["open record", "review checklist", "request manager review"],
    governedActions: ["finance decision", "payment approval", "discount approval"]
  },
  {
    lane: "Inventory Lease-to-Own",
    mvpStageModel: ["New", "Eligibility", "Structure", "Manager Review", "Document Readiness", "Closed"],
    requiredFields: ["customer", "selected vehicle", "eligibility checklist", "payment intent", "source link"],
    sourceOwners: ["CRM", "Inventory", "Finance", "Sales Console"],
    allowedMvpActions: ["open record", "review eligibility", "request manager review"],
    governedActions: ["lease approval", "contract execution", "vehicle reservation"]
  },
  {
    lane: "Public Auto Repair",
    mvpStageModel: ["Intake", "Estimate", "Review", "Approved", "In Progress", "Closed"],
    requiredFields: ["customer", "vehicle/service need", "estimate status", "follow-up owner", "source link"],
    sourceOwners: ["CRM", "Service", "Sales Console"],
    allowedMvpActions: ["open repair lane", "inspect estimate status", "open customer"],
    governedActions: ["send estimate", "repair order approval", "customer messaging"]
  },
  {
    lane: "Daily Rental",
    mvpStageModel: ["Inquiry", "Availability Review", "Ready", "Checkout", "Return", "Closed"],
    requiredFields: ["customer", "rental need", "date window", "availability status", "source link"],
    sourceOwners: ["CRM", "Rental", "Sales Console"],
    allowedMvpActions: ["open rental lane", "inspect availability", "open customer"],
    governedActions: ["reservation", "rental agreement", "payment authorization"]
  },
  {
    lane: "Warranty Product",
    mvpStageModel: ["Interest", "Eligibility", "Authorization", "Presented", "Accepted", "Closed"],
    requiredFields: ["customer/deal context", "product interest", "eligibility", "source link"],
    sourceOwners: ["CRM", "Warranty", "Finance", "Sales Console"],
    allowedMvpActions: ["open product lane", "inspect eligibility", "request manager review"],
    governedActions: ["product sale", "contract execution", "coverage decision"]
  },
  {
    lane: "Financing Product",
    mvpStageModel: ["Interest", "Credit App", "Offer", "Menu Review", "Handoff", "Closed"],
    requiredFields: ["customer", "finance intent", "product/handoff status", "blocker labels", "source link"],
    sourceOwners: ["CRM", "Finance", "Sales Console"],
    allowedMvpActions: ["open finance lane", "inspect readiness", "request manager review"],
    governedActions: ["finance decision", "lender submission", "product approval"]
  }
];

export const salesConsoleRevenueOpportunities: RevenueOpportunityViewModel[] = [
  {
    opportunityId: "REV-1001",
    customerName: "John Smith",
    contact: "(555) 123-4567",
    owner: "James K.",
    roleVisibility: ["Salesperson", "Sales Manager", "Admin / Owner"],
    stage: "Proposal",
    lane: "Inventory Cash Sale",
    laneStage: "Proposal",
    selectedVehicle: { stockNumber: "TMS22145", label: "2022 Toyota RAV4 XLE" },
    nextAction: "Confirm trade value and present final numbers",
    nextActionDue: "Today 1:00 PM",
    freshness: "current",
    source: { id: "CRM-1001", label: "Website lead", ownerSystem: "CRM", href: "/customers/customer-360", freshness: "current" },
    blockers: [{ code: "IDV", label: "Identity verification", owner: "Salesperson", severity: "risk" }],
    actionState: "Live Action"
  },
  {
    opportunityId: "REV-1002",
    customerName: "Samantha Lee",
    contact: "(555) 369-8520",
    owner: "Tasha M.",
    roleVisibility: ["Salesperson", "Sales Manager", "Admin / Owner"],
    stage: "Compliance",
    lane: "Inventory BHPH Sale",
    laneStage: "Compliance",
    selectedVehicle: { stockNumber: "TMS20011", label: "2020 Chevy Malibu LT" },
    nextAction: "Collect proof of income",
    nextActionDue: "Today 3:30 PM",
    freshness: "due-today",
    source: { id: "FIN-203", label: "Finance readiness", ownerSystem: "Finance", href: "/customers/customer-360", freshness: "current" },
    blockers: [{ code: "PAY_STUB", label: "Pay stub missing", owner: "Customer", severity: "blocked" }],
    actionState: "Controlled Action",
    governedReason: "Finance decisions remain outside Sales Console authority."
  }
];

export function getRevenueLaneContract(lane: SalesConsoleRevenueLaneName) {
  return salesConsoleRevenueLaneContracts.find((contract) => contract.lane === lane);
}

export function salesConsoleCoversEveryRevenueLane() {
  const lanes = new Set(salesConsoleRevenueLaneContracts.map((contract) => contract.lane));

  return salesConsoleRevenueLaneNames.every((lane) => lanes.has(lane));
}

export function salesConsoleRevenueContractsPreserveSourceOwnership() {
  return salesConsoleRevenueLaneContracts.every((contract) => contract.sourceOwners.length > 0);
}

export function salesConsoleRevenueContractsKeepRiskyActionsGoverned() {
  const riskyTerms = [
    "quote",
    "discount",
    "hold",
    "reservation",
    "finance decision",
    "customer messaging",
    "contract",
    "payment authorization",
    "lender submission"
  ];

  return salesConsoleRevenueLaneContracts.every((contract) => {
    const allowedActionsAreSafe = contract.allowedMvpActions.every((action) =>
      riskyTerms.every((term) => !action.toLowerCase().includes(term))
    );

    return allowedActionsAreSafe && contract.governedActions.length > 0;
  });
}
