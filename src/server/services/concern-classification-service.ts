import {
  CONCERN_CATEGORY,
  type ConcernClassification,
  type ConcernIntake
} from "@/server/concerns/concern-domain";

const rules: Array<{
  keywords: string[];
  result: Omit<ConcernClassification, "ruleVersion">;
}> = [
  {
    keywords: ["title", "registration", "dmv", "lien", "plates", "paperwork"],
    result: { primaryCategory: CONCERN_CATEGORY.DOCUMENTATION_TITLE, secondaryCategory: CONCERN_CATEGORY.CUSTOMER_ISSUE, taskWorkflowArea: "ADMIN", riskType: "COMPLIANCE_CUSTOMER_SATISFACTION", requiresManagerReview: true, reasonCode: "TITLE_DOCUMENT_KEYWORDS", reasonText: "Title or registration language indicates a documentation workflow with customer and compliance risk." }
  },
  {
    keywords: ["repair", "engine", "diagnostic", "parts", "mechanic"],
    result: { primaryCategory: CONCERN_CATEGORY.REPAIR_SHOP, secondaryCategory: null, taskWorkflowArea: "SHOP", riskType: "OPERATIONAL", requiresManagerReview: false, reasonCode: "REPAIR_KEYWORDS", reasonText: "Repair language indicates a shop workflow." }
  },
  {
    keywords: ["payment", "late", "collections", "balance"],
    result: { primaryCategory: CONCERN_CATEGORY.COLLECTIONS, secondaryCategory: null, taskWorkflowArea: "COLLECTIONS", riskType: "FINANCIAL", requiresManagerReview: false, reasonCode: "COLLECTIONS_KEYWORDS", reasonText: "Payment language indicates a collections workflow." }
  },
  {
    keywords: ["photos", "listing", "online", "facebook", "advertising"],
    result: { primaryCategory: CONCERN_CATEGORY.MARKETING_LISTING, secondaryCategory: null, taskWorkflowArea: "MARKETING", riskType: "OPERATIONAL", requiresManagerReview: false, reasonCode: "MARKETING_KEYWORDS", reasonText: "Listing language indicates a marketing workflow." }
  },
  {
    keywords: ["inventory", "stock", "lot", "recon"],
    result: { primaryCategory: CONCERN_CATEGORY.INVENTORY, secondaryCategory: null, taskWorkflowArea: "INVENTORY", riskType: "OPERATIONAL", requiresManagerReview: false, reasonCode: "INVENTORY_KEYWORDS", reasonText: "Inventory language indicates an inventory workflow." }
  },
  {
    keywords: ["lead", "sale", "test drive", "financing"],
    result: { primaryCategory: CONCERN_CATEGORY.SALES, secondaryCategory: null, taskWorkflowArea: "SALES", riskType: "CUSTOMER_SATISFACTION", requiresManagerReview: false, reasonCode: "SALES_KEYWORDS", reasonText: "Sales language indicates a sales workflow." }
  }
];

export function classifyConcern(input: ConcernIntake): ConcernClassification {
  const text = `${input.title} ${input.description}`.toLowerCase();
  const matched = rules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
  if (matched) return { ...matched.result, ruleVersion: 1 };
  return { primaryCategory: CONCERN_CATEGORY.MANAGER_REVIEW, secondaryCategory: null, taskWorkflowArea: "GENERAL_MANAGER", riskType: "NONE", requiresManagerReview: true, reasonCode: "NO_DETERMINISTIC_MATCH", reasonText: "No deterministic category matched, so manager review is required.", ruleVersion: 1 };
}
