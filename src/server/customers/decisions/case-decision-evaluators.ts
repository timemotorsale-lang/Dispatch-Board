import type { CrmDecisionEvaluator, CrmDecisionResult } from "./crm-decision-domain";

export const CASE_SEVERITY_DECISION_TYPE = "CASE_SEVERITY";
export const CASE_SEVERITY_VERSION = "case-severity/1.0.0";
export const CASE_PLAYBOOK_DECISION_TYPE = "CASE_PLAYBOOK_SELECTION";
export const CASE_PLAYBOOK_VERSION = "case-playbook/1.0.0";

export const caseSeverityEvaluator: CrmDecisionEvaluator = {
  decisionType: CASE_SEVERITY_DECISION_TYPE,
  algorithmVersion: CASE_SEVERITY_VERSION,
  evaluate(request): CrmDecisionResult {
    const facts = request.facts as Record<string, unknown>;
    const value = (name: string, maximum: number) => Math.max(0, Math.min(maximum, Number(facts[name]) || 0));
    const safety = value("safetyRisk", 35), legal = value("legalRisk", 25), mobility = value("mobilityImpact", 15);
    const financial = value("financialExposure", 10), age = value("ageAndMissedCommitments", 10), reputation = value("reputationalRisk", 5);
    const automatic = Boolean(facts.immediateSafetyConcern || facts.activeLegalDeadline || facts.dealershipDocumentationPreventsOperation || facts.managerDeclaredCritical);
    const score = automatic ? 100 : Math.round(safety + legal + mobility + financial + age + reputation);
    const priority = score >= 75 ? "P0" : score >= 50 ? "P1" : score >= 25 ? "P2" : "P3";
    const reasons = [safety && "SAFETY_RISK", legal && "LEGAL_OR_REGULATORY_RISK", mobility && "MOBILITY_IMPACT", financial && "FINANCIAL_EXPOSURE", age && "AGED_OR_MISSED_COMMITMENT", reputation && "REPUTATIONAL_ESCALATION", automatic && "AUTOMATIC_CRITICAL_TRIGGER"].filter((item): item is string => Boolean(item));
    return {
      decisionType: request.decisionType, algorithmVersion: request.algorithmVersion,
      subject: request.subject, customerId: request.customerId ?? null, score, priority,
      recommendedOwnerId: null, recommendedActionCode: "TRIAGE_CUSTOMER_CASE",
      dueAt: null, reasonCodes: reasons.length ? reasons : ["LOW_REPORTED_IMPACT"],
      explanation: automatic ? "An automatic critical trigger requires immediate manager triage." : `Case severity is ${priority} with score ${score}.`,
      confidence: facts.informationComplete === false ? "LOW" : "HIGH", missingInputs: facts.informationComplete === false ? ["caseRiskDetails"] : [],
      managerReviewRequired: priority === "P0" || priority === "P1"
    };
  }
};

const playbooks: Record<string, string> = {
  DOCUMENTATION_TITLE: "TITLE_DELAY_V1", REPAIR_SHOP: "SERVICE_COMPLAINT_V1",
  ADMINISTRATIVE: "MISSING_DOCUMENTS_V1", SALES: "GENERAL_CUSTOMER_CASE_V1",
  CUSTOMER_ISSUE: "GENERAL_CUSTOMER_CASE_V1", MANAGER_REVIEW: "MANAGER_REVIEW_V1"
};

export const casePlaybookEvaluator: CrmDecisionEvaluator = {
  decisionType: CASE_PLAYBOOK_DECISION_TYPE,
  algorithmVersion: CASE_PLAYBOOK_VERSION,
  evaluate(request): CrmDecisionResult {
    const category = String(request.facts.category ?? "MANAGER_REVIEW");
    const availableTemplate = typeof request.facts.availableTemplateCode === "string" ? request.facts.availableTemplateCode : null;
    const playbook = availableTemplate ?? playbooks[category] ?? "MANAGER_REVIEW_V1";
    return {
      decisionType: request.decisionType, algorithmVersion: request.algorithmVersion,
      subject: request.subject, customerId: request.customerId ?? null, score: null, priority: null,
      recommendedOwnerId: null, recommendedActionCode: playbook, dueAt: null,
      reasonCodes: [playbook === "MANAGER_REVIEW_V1" ? "FALLBACK_MANAGER_PLAYBOOK" : `CATEGORY_${category}`],
      explanation: `Selected ${playbook} for category ${category}.`, confidence: "HIGH", missingInputs: [],
      managerReviewRequired: playbook === "MANAGER_REVIEW_V1"
    };
  }
};
