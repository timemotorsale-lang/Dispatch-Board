export type RegistryLifecycle = "ACTIVE" | "DEPRECATED";

export type EnterpriseReasonCategory =
  | "DATA"
  | "ELIGIBILITY"
  | "POLICY"
  | "COMMITMENT"
  | "DEPENDENCY"
  | "CAPACITY"
  | "RISK"
  | "AUTHORITY"
  | "EXECUTION"
  | "OUTCOME";

export type EnterpriseReasonCodeDefinition = {
  code: string;
  category: EnterpriseReasonCategory;
  meaning: string;
  lifecycle: RegistryLifecycle;
  replacementCode?: string;
};

export const ENTERPRISE_REASON_CODE_REGISTRY: readonly EnterpriseReasonCodeDefinition[] = [
  { code: "DATA.MISSING_REQUIRED_INPUT", category: "DATA", meaning: "A required input is absent.", lifecycle: "ACTIVE" },
  { code: "DATA.STALE_INPUT", category: "DATA", meaning: "An input exceeds its approved freshness expectation.", lifecycle: "ACTIVE" },
  { code: "DATA.CONFLICTING_INPUT", category: "DATA", meaning: "Authoritative or material sources disagree.", lifecycle: "ACTIVE" },
  { code: "DATA.SOURCE_NOT_AUTHORITATIVE", category: "DATA", meaning: "The available source cannot authorize this decision or action.", lifecycle: "ACTIVE" },
  { code: "ELIGIBILITY.NOT_QUALIFIED", category: "ELIGIBILITY", meaning: "A candidate lacks a required qualification, skill, or capability.", lifecycle: "ACTIVE" },
  { code: "ELIGIBILITY.NOT_AVAILABLE", category: "ELIGIBILITY", meaning: "A candidate or resource is unavailable in the governing time window.", lifecycle: "ACTIVE" },
  { code: "ELIGIBILITY.OUT_OF_SCOPE", category: "ELIGIBILITY", meaning: "The subject or alternative is outside the authorized organizational or location scope.", lifecycle: "ACTIVE" },
  { code: "POLICY.HARD_RULE_FAILED", category: "POLICY", meaning: "A mandatory policy gate failed.", lifecycle: "ACTIVE" },
  { code: "POLICY.APPROVAL_REQUIRED", category: "POLICY", meaning: "The next action requires an authorized approval.", lifecycle: "ACTIVE" },
  { code: "COMMITMENT.DUE_SOON", category: "COMMITMENT", meaning: "A commitment is approaching its governing deadline.", lifecycle: "ACTIVE" },
  { code: "COMMITMENT.BREACHED", category: "COMMITMENT", meaning: "A governing commitment has not been met by its deadline.", lifecycle: "ACTIVE" },
  { code: "DEPENDENCY.BLOCKED", category: "DEPENDENCY", meaning: "An unresolved prerequisite prevents valid progress.", lifecycle: "ACTIVE" },
  { code: "DEPENDENCY.UNLOCKS_DOWNSTREAM_WORK", category: "DEPENDENCY", meaning: "Resolution releases one or more valid downstream items.", lifecycle: "ACTIVE" },
  { code: "CAPACITY.INSUFFICIENT", category: "CAPACITY", meaning: "Eligible effective capacity is insufficient for the demand window.", lifecycle: "ACTIVE" },
  { code: "CAPACITY.WIP_LIMIT_REACHED", category: "CAPACITY", meaning: "The approved work-in-progress limit has been reached.", lifecycle: "ACTIVE" },
  { code: "RISK.MANDATORY_CONTROL", category: "RISK", meaning: "Legal, safety, financial, privacy, security, or evidence control requires intervention.", lifecycle: "ACTIVE" },
  { code: "RISK.EXPOSURE_INCREASED", category: "RISK", meaning: "The assessed operational exposure materially increased.", lifecycle: "ACTIVE" },
  { code: "AUTHORITY.NOT_AUTHORIZED", category: "AUTHORITY", meaning: "The actor or system lacks authority for the decision or action.", lifecycle: "ACTIVE" },
  { code: "AUTHORITY.HUMAN_REVIEW_REQUIRED", category: "AUTHORITY", meaning: "Policy requires a human decision before proceeding.", lifecycle: "ACTIVE" },
  { code: "EXECUTION.VERIFICATION_FAILED", category: "EXECUTION", meaning: "Execution did not produce verifiable intended state or evidence.", lifecycle: "ACTIVE" },
  { code: "OUTCOME.NOT_VERIFIED", category: "OUTCOME", meaning: "A claimed result lacks the required verification evidence.", lifecycle: "ACTIVE" }
];

export type EnterpriseEventCategory =
  | "WORK"
  | "COMMITMENT"
  | "DEPENDENCY"
  | "EVIDENCE"
  | "DECISION"
  | "EXCEPTION"
  | "OUTCOME";

export type EnterpriseEventTypeDefinition = {
  code: string;
  category: EnterpriseEventCategory;
  meaning: string;
  schemaVersion: 1;
  lifecycle: RegistryLifecycle;
  replacementCode?: string;
};

export const ENTERPRISE_EVENT_TYPE_REGISTRY: readonly EnterpriseEventTypeDefinition[] = [
  { code: "enterprise.work.created", category: "WORK", meaning: "An accountable work item was created.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.work.state-changed", category: "WORK", meaning: "A work item entered a different valid lifecycle state.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.work.owner-changed", category: "WORK", meaning: "Accountability or assigned execution ownership changed.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.work.blocked", category: "WORK", meaning: "A material blocker began preventing valid progress.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.work.unblocked", category: "WORK", meaning: "A recorded blocker stopped preventing valid progress.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.commitment.recorded", category: "COMMITMENT", meaning: "A governed promise was recorded.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.commitment.changed", category: "COMMITMENT", meaning: "A governed promise changed with authority and history.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.commitment.fulfilled", category: "COMMITMENT", meaning: "A governed promise was fulfilled with evidence.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.commitment.breached", category: "COMMITMENT", meaning: "A governed promise passed its deadline without verified fulfillment.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.dependency.recorded", category: "DEPENDENCY", meaning: "A typed prerequisite or downstream relationship was recorded.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.dependency.satisfied", category: "DEPENDENCY", meaning: "A recorded prerequisite was satisfied.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.evidence.attached", category: "EVIDENCE", meaning: "Evidence was linked to a governed subject.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.evidence.verified", category: "EVIDENCE", meaning: "Evidence passed its governing verification rule.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.decision.evaluated", category: "DECISION", meaning: "A versioned decision evaluation completed without implying execution.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.decision.approved", category: "DECISION", meaning: "An authorized actor approved a proposed disposition.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.decision.overridden", category: "DECISION", meaning: "An authorized actor selected a different disposition with a recorded reason.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.decision.executed", category: "DECISION", meaning: "An approved disposition was executed without implying successful outcome verification.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.exception.opened", category: "EXCEPTION", meaning: "A material variance from policy, plan, or commitment was opened.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.exception.escalated", category: "EXCEPTION", meaning: "An exception advanced to a higher accountable response level.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.exception.resolved", category: "EXCEPTION", meaning: "An exception met its approved resolution and evidence gate.", schemaVersion: 1, lifecycle: "ACTIVE" },
  { code: "enterprise.outcome.verified", category: "OUTCOME", meaning: "A claimed result was verified using its governing evidence rule.", schemaVersion: 1, lifecycle: "ACTIVE" }
];

function createRegistryLookup<T extends { code: string }>(records: readonly T[], label: string) {
  const lookup = new Map(records.map((record) => [record.code, record]));
  if (lookup.size !== records.length) throw new Error(`Duplicate ${label} registry code.`);
  return (code: string) => lookup.get(code) ?? null;
}

export const findEnterpriseReasonCode = createRegistryLookup(
  ENTERPRISE_REASON_CODE_REGISTRY,
  "enterprise reason"
);

export const findEnterpriseEventType = createRegistryLookup(
  ENTERPRISE_EVENT_TYPE_REGISTRY,
  "enterprise event type"
);
