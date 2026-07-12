import type { CrmDecisionEvaluationRequest, CrmDecisionEvaluator } from "./crm-decision-domain";
import { leadAssignmentEvaluator, leadPriorityEvaluator } from "./lead-decision-evaluators";
import { casePlaybookEvaluator, caseSeverityEvaluator } from "./case-decision-evaluators";

export type CrmDecisionRegistry = {
  evaluate(request: CrmDecisionEvaluationRequest): ReturnType<CrmDecisionEvaluator["evaluate"]>;
  has(decisionType: string, algorithmVersion: string): boolean;
  list(): Array<{ decisionType: string; algorithmVersion: string }>;
};

function registryKey(decisionType: string, algorithmVersion: string) {
  return `${decisionType.trim()}::${algorithmVersion.trim()}`;
}

export function createCrmDecisionRegistry(evaluators: CrmDecisionEvaluator[]): CrmDecisionRegistry {
  const entries = new Map<string, CrmDecisionEvaluator>();
  for (const evaluator of evaluators) {
    const key = registryKey(evaluator.decisionType, evaluator.algorithmVersion);
    if (entries.has(key)) throw new Error(`Duplicate CRM decision evaluator: ${key}.`);
    entries.set(key, evaluator);
  }

  return {
    evaluate(request) {
      const evaluator = entries.get(registryKey(request.decisionType, request.algorithmVersion));
      if (!evaluator) {
        throw new Error(
          `Unsupported CRM decision algorithm: ${request.decisionType}/${request.algorithmVersion}.`
        );
      }
      return evaluator.evaluate(request);
    },
    has(decisionType, algorithmVersion) {
      return entries.has(registryKey(decisionType, algorithmVersion));
    },
    list() {
      return [...entries.values()]
        .map(({ decisionType, algorithmVersion }) => ({ decisionType, algorithmVersion }))
        .sort((left, right) =>
          `${left.decisionType}/${left.algorithmVersion}`.localeCompare(
            `${right.decisionType}/${right.algorithmVersion}`
          )
        );
    }
  };
}

export const crmDecisionRegistry = createCrmDecisionRegistry([
  leadPriorityEvaluator,
  leadAssignmentEvaluator,
  caseSeverityEvaluator,
  casePlaybookEvaluator
]);
