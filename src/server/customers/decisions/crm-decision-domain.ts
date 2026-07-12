export const CRM_DECISION_PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
export const CRM_DECISION_CONFIDENCE = ["HIGH", "MEDIUM", "LOW"] as const;
export const CRM_DECISION_SUBJECT_TYPES = ["LEAD", "CASE", "CUSTOMER", "APPOINTMENT"] as const;

export type CrmDecisionPriority = (typeof CRM_DECISION_PRIORITIES)[number];
export type CrmDecisionConfidence = (typeof CRM_DECISION_CONFIDENCE)[number];
export type CrmDecisionSubjectType = (typeof CRM_DECISION_SUBJECT_TYPES)[number];
export type CrmDecisionFacts = Record<string, unknown>;

export type CrmDecisionSubject = {
  type: CrmDecisionSubjectType;
  id: string;
};

export type CrmDecisionResult = {
  decisionType: string;
  algorithmVersion: string;
  subject: CrmDecisionSubject;
  customerId: string | null;
  score: number | null;
  priority: CrmDecisionPriority | null;
  recommendedOwnerId: string | null;
  recommendedActionCode: string | null;
  dueAt: string | null;
  reasonCodes: string[];
  explanation: string;
  confidence: CrmDecisionConfidence;
  missingInputs: string[];
  managerReviewRequired: boolean;
};

export type CrmDecisionEvaluationRequest = {
  decisionType: string;
  algorithmVersion: string;
  subject: CrmDecisionSubject;
  customerId?: string | null;
  facts: CrmDecisionFacts;
};

export type CrmDecisionEvaluator = {
  decisionType: string;
  algorithmVersion: string;
  evaluate(request: CrmDecisionEvaluationRequest): CrmDecisionResult;
};

function requiredText(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function optionalText(value: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function uniqueCodes(values: string[], label: string) {
  const normalized = values.map((value) => requiredText(value, label));
  if (normalized.some((value) => !/^[A-Z][A-Z0-9_]*$/.test(value))) {
    throw new Error(`${label} must use stable uppercase reason-code format.`);
  }
  return [...new Set(normalized)];
}

export function normalizeEvaluationRequest(
  request: CrmDecisionEvaluationRequest
): CrmDecisionEvaluationRequest {
  return {
    decisionType: requiredText(request.decisionType, "Decision type"),
    algorithmVersion: requiredText(request.algorithmVersion, "Algorithm version"),
    subject: {
      type: request.subject.type,
      id: requiredText(request.subject.id, "Decision subject id")
    },
    customerId: optionalText(request.customerId ?? null),
    facts: structuredClone(request.facts)
  };
}

export function normalizeDecisionResult(
  request: CrmDecisionEvaluationRequest,
  result: CrmDecisionResult
): CrmDecisionResult {
  if (result.decisionType !== request.decisionType || result.algorithmVersion !== request.algorithmVersion) {
    throw new Error("Evaluator result identity does not match the requested algorithm.");
  }
  if (result.subject.type !== request.subject.type || result.subject.id !== request.subject.id) {
    throw new Error("Evaluator result subject does not match the request.");
  }
  if (result.score !== null && (!Number.isInteger(result.score) || result.score < 0 || result.score > 100)) {
    throw new Error("Decision score must be a whole number from 0 through 100.");
  }
  const dueAt = optionalText(result.dueAt);
  if (dueAt && Number.isNaN(Date.parse(dueAt))) throw new Error("Decision due time must be ISO 8601 compatible.");

  return {
    ...result,
    customerId: optionalText(result.customerId),
    recommendedOwnerId: optionalText(result.recommendedOwnerId),
    recommendedActionCode: optionalText(result.recommendedActionCode),
    dueAt,
    reasonCodes: uniqueCodes(result.reasonCodes, "Decision reason code"),
    explanation: requiredText(result.explanation, "Decision explanation"),
    missingInputs: [...new Set(result.missingInputs.map((value) => requiredText(value, "Missing input")))]
  };
}
