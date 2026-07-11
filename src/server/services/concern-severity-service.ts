import type { ConcernClassification, ConcernIntake, ConcernSeverity } from "@/server/concerns/concern-domain";

export function scoreConcernSeverity(input: ConcernIntake, classification: ConcernClassification): ConcernSeverity {
  const factors: ConcernSeverity["factors"] = [];
  const add = (code: string, points: number, explanation: string) => factors.push({ code, points, explanation });
  if (input.customerReference || classification.secondaryCategory === "CUSTOMER_ISSUE") add("CUSTOMER_IMPACT", 20, "A customer is directly affected.");
  if (input.daysOverdue >= 60) add("OVERDUE_60_DAYS", 40, "The concern is at least 60 days overdue.");
  else if (input.daysOverdue >= 30) add("OVERDUE_30_DAYS", 25, "The concern is at least 30 days overdue.");
  else if (input.daysOverdue >= 14) add("OVERDUE_14_DAYS", 15, "The concern is at least 14 days overdue.");
  else if (input.daysOverdue > 0) add("OVERDUE", 5, "The concern is overdue.");
  if (classification.riskType === "COMPLIANCE_CUSTOMER_SATISFACTION") add("COMPLIANCE_RISK", 25, "Documentation risk may require compliance attention.");
  if (input.moneyRisk) add("MONEY_RISK", 20, "Money or payment exposure was reported.");
  if (input.repeatContactCount >= 2) add("REPEAT_CONTACT", 15, "The customer or reporter has contacted the dealership repeatedly.");
  if (input.managerSensitive) add("MANAGER_SENSITIVE", 15, "The concern was marked manager-sensitive.");
  if (input.missingDocumentation) add("MISSING_DOCUMENTATION", 15, "Required documentation may be missing.");
  const score = Math.min(100, factors.reduce((total, factor) => total + factor.points, 0));
  const priority = score >= 80 ? "CRITICAL" : score >= 55 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";
  const requiresManagerReview = classification.requiresManagerReview || priority === "HIGH" || priority === "CRITICAL";
  return { score, priority, requiresManagerReview, escalationRequired: requiresManagerReview && (input.daysOverdue >= 60 || classification.riskType === "COMPLIANCE_CUSTOMER_SATISFACTION"), factors, ruleVersion: 1 };
}
