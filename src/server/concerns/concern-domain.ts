export const CONCERN_CATEGORY = {
  ADMINISTRATIVE: "ADMINISTRATIVE",
  COLLECTIONS: "COLLECTIONS",
  CUSTOMER_ISSUE: "CUSTOMER_ISSUE",
  DOCUMENTATION_TITLE: "DOCUMENTATION_TITLE",
  INVENTORY: "INVENTORY",
  MANAGER_REVIEW: "MANAGER_REVIEW",
  MARKETING_LISTING: "MARKETING_LISTING",
  REPAIR_SHOP: "REPAIR_SHOP",
  SALES: "SALES"
} as const;

export type ConcernCategory = (typeof CONCERN_CATEGORY)[keyof typeof CONCERN_CATEGORY];
export type ConcernPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ConcernSource = "MANAGER" | "QUICK_LOG";
export type ConcernRiskType =
  | "COMPLIANCE_CUSTOMER_SATISFACTION"
  | "CUSTOMER_SATISFACTION"
  | "FINANCIAL"
  | "OPERATIONAL"
  | "NONE";

export type ConcernClassification = {
  primaryCategory: ConcernCategory;
  secondaryCategory: ConcernCategory | null;
  taskWorkflowArea:
    | "ADMIN"
    | "COLLECTIONS"
    | "GENERAL_MANAGER"
    | "INVENTORY"
    | "MARKETING"
    | "SALES"
    | "SHOP";
  riskType: ConcernRiskType;
  requiresManagerReview: boolean;
  reasonCode: string;
  reasonText: string;
  ruleVersion: 1;
};

export type ConcernSeverity = {
  score: number;
  priority: ConcernPriority;
  requiresManagerReview: boolean;
  escalationRequired: boolean;
  factors: Array<{ code: string; points: number; explanation: string }>;
  ruleVersion: 1;
};

export type ConcernIntake = {
  title: string;
  description: string;
  customerReference: string | null;
  vehicleReference: string | null;
  daysOverdue: number;
  repeatContactCount: number;
  managerSensitive: boolean;
  moneyRisk: boolean;
  missingDocumentation: boolean;
  source: ConcernSource;
};

export type ConcernTaskBlueprint = {
  stepCode: string;
  title: string;
  description: string;
  workflowArea: ConcernClassification["taskWorkflowArea"];
  dueOffsetHours: number;
  requiresManagerApproval: boolean;
  required: boolean;
  dependsOnStepCodes: string[];
  checklist: Array<{ key: string; label: string; required: boolean }>;
  requiredUpdateFields: Array<{
    key: string;
    label: string;
    type: "long_text" | "short_text" | "single_select";
    options?: string[];
  }>;
  completionCriteria: string;
  escalationRuleCode: string | null;
};

export type ConcernResolutionPlan = {
  caseTitle: string;
  classification: ConcernClassification;
  severity: ConcernSeverity;
  templateCode: "TITLE_DELAY_V1" | "MANAGER_REVIEW_V1";
  templateVersion: 1;
  tasks: ConcernTaskBlueprint[];
};
