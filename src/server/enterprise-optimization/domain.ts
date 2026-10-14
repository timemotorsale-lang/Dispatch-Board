export const ENTERPRISE_CONCEPT_CODES = [
  "BUSINESS_OUTCOME",
  "BUSINESS_CAPABILITY",
  "SERVICE",
  "CONSOLE",
  "WORKFLOW",
  "WORK_ITEM",
  "COMMITMENT",
  "RESOURCE",
  "DEPENDENCY",
  "RISK",
  "EXCEPTION",
  "EVIDENCE",
  "DECISION",
  "EVENT",
  "OUTCOME"
] as const;

export type EnterpriseConceptCode = (typeof ENTERPRISE_CONCEPT_CODES)[number];

export type EnterpriseConceptDefinition = {
  code: EnterpriseConceptCode;
  name: string;
  definition: string;
  identityRule: string;
};

export const ENTERPRISE_CONCEPT_REGISTRY: readonly EnterpriseConceptDefinition[] = [
  { code: "BUSINESS_OUTCOME", name: "Business Outcome", definition: "A measurable result the company intends to produce or protect.", identityRule: "Identify by outcome code, scope, measure, and effective period." },
  { code: "BUSINESS_CAPABILITY", name: "Business Capability", definition: "A durable organizational ability independent of a particular screen or workflow.", identityRule: "Identify by stable capability code and accountable owner role." },
  { code: "SERVICE", name: "Service", definition: "A defined value-delivery relationship with an owner, consumer, commitment, and measures.", identityRule: "Identify by service code, provider scope, consumer scope, and version." },
  { code: "CONSOLE", name: "Console", definition: "The operational command center responsible for a bounded business domain.", identityRule: "Identify by a stable CCC console code; a route or tab is not a console identity." },
  { code: "WORKFLOW", name: "Workflow", definition: "A versioned sequence or state model that delivers an outcome.", identityRule: "Identify by workflow code and version within its owning domain." },
  { code: "WORK_ITEM", name: "Work Item", definition: "An accountable unit of work, decision, review, exception, or follow-up.", identityRule: "Identify by organization, owning domain, record type, and immutable record identifier." },
  { code: "COMMITMENT", name: "Commitment", definition: "A customer, legal, financial, payroll, appointment, delivery, or internal promise.", identityRule: "Identify the maker, recipient, promised result, governing time, and source record." },
  { code: "RESOURCE", name: "Resource", definition: "A person, team, asset, location, vendor, budget, system, or time window used by work.", identityRule: "Identify by resource type, authoritative source, identifier, and effective scope." },
  { code: "DEPENDENCY", name: "Dependency", definition: "A typed prerequisite or downstream relationship between work, decisions, evidence, or resources.", identityRule: "Identify both endpoints, dependency type, state, source, and resolver." },
  { code: "RISK", name: "Risk", definition: "A possible event or condition with likelihood, impact, exposure, owner, and response.", identityRule: "Identify by risk record, affected scope, owner, assessment version, and review time." },
  { code: "EXCEPTION", name: "Exception", definition: "Evidence that actual or expected operation differs materially from policy, plan, or commitment.", identityRule: "Identify by exception type, subject, detection evidence, opened time, and resolver." },
  { code: "EVIDENCE", name: "Evidence", definition: "A document, event, observation, approval, measurement, or source record supporting a fact or decision.", identityRule: "Identify by evidence record, source, subject, capture time, integrity, and access classification." },
  { code: "DECISION", name: "Decision", definition: "A versioned evaluation and authorized disposition of alternatives.", identityRule: "Identify by decision ID, type, algorithm or policy version, subject, and evaluation time." },
  { code: "EVENT", name: "Event", definition: "An immutable statement that something occurred at a specific time and scope.", identityRule: "Identify by event ID and type; retain occurred time, recorded time, subject, source, and correlation." },
  { code: "OUTCOME", name: "Outcome", definition: "The verified result of work or a decision, including timing, quality, benefit, harm, and confidence.", identityRule: "Identify by outcome code, subject, verification method, time, and evidence." }
];

export const ENTERPRISE_CONSOLE_CODES = [
  "DISPATCH",
  "TIME_ATTENDANCE",
  "PEOPLE_HR",
  "COMPLIANCE",
  "LEGAL_ACCOUNTING",
  "LIBRARY_TRAINING",
  "INSIGHTS",
  "ADMINISTRATION"
] as const;

export type EnterpriseConsoleCode = (typeof ENTERPRISE_CONSOLE_CODES)[number];
export type ConsoleImplementationState = "LIVE" | "FOUNDATIONAL" | "PLANNED";

export type EnterpriseConsoleDefinition = {
  code: EnterpriseConsoleCode;
  name: string;
  implementationState: ConsoleImplementationState;
  domainOwnerRole: string;
  policyOwnerRole: string;
  purpose: string;
};

export const ENTERPRISE_CONSOLE_REGISTRY: readonly EnterpriseConsoleDefinition[] = [
  { code: "DISPATCH", name: "Dispatch Board", implementationState: "LIVE", domainOwnerRole: "Dispatch Operations Owner", policyOwnerRole: "General Manager", purpose: "Coordinate and evidence daily operational work." },
  { code: "TIME_ATTENDANCE", name: "Time and Attendance", implementationState: "PLANNED", domainOwnerRole: "Payroll and Timekeeping Owner", policyOwnerRole: "General Manager", purpose: "Govern time capture, correction, approval, and payroll handoff." },
  { code: "PEOPLE_HR", name: "People and HR", implementationState: "PLANNED", domainOwnerRole: "People Operations Owner", policyOwnerRole: "General Manager", purpose: "Govern employee operations, controlled records, onboarding, and required actions." },
  { code: "COMPLIANCE", name: "Compliance", implementationState: "PLANNED", domainOwnerRole: "Compliance Owner", policyOwnerRole: "General Manager", purpose: "Control licenses, permits, renewals, inspections, obligations, and evidence readiness." },
  { code: "LEGAL_ACCOUNTING", name: "Legal and Accounting", implementationState: "PLANNED", domainOwnerRole: "Legal and Accounting Operations Owner", policyOwnerRole: "General Manager", purpose: "Control obligations, requests, documents, reconciliations, and follow-up." },
  { code: "LIBRARY_TRAINING", name: "Library and Training", implementationState: "PLANNED", domainOwnerRole: "Knowledge and Training Owner", policyOwnerRole: "General Manager", purpose: "Govern forms, procedures, acknowledgements, and competency evidence." },
  { code: "INSIGHTS", name: "Insights", implementationState: "FOUNDATIONAL", domainOwnerRole: "Reporting and Insights Owner", policyOwnerRole: "General Manager", purpose: "Present governed measures, trends, and decision evidence without becoming a competing source of truth." },
  { code: "ADMINISTRATION", name: "Administration", implementationState: "FOUNDATIONAL", domainOwnerRole: "System Administration Owner", policyOwnerRole: "General Manager", purpose: "Govern configuration, access, integrations, policies, and operational controls." }
];

export type InformationAuthority =
  | "CANONICAL"
  | "GOVERNING"
  | "EVIDENTIARY"
  | "DERIVED"
  | "ADVISORY"
  | "DELIVERY"
  | "PLANNED";

export type DataClassification =
  | "AUTHORITATIVE_FACT"
  | "OBSERVED_SIGNAL"
  | "CALCULATED_VALUE"
  | "ESTIMATE"
  | "PREDICTION"
  | "RECOMMENDATION";

export type EnterpriseRecordReference = {
  organizationId: string;
  console: EnterpriseConsoleCode;
  domain: string;
  recordType: string;
  recordId: string;
};

function normalizeRecordKeyPart(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  if (normalized.includes(":")) throw new Error(`${label} cannot contain a colon.`);
  return normalized;
}

export function enterpriseRecordKey(reference: EnterpriseRecordReference) {
  return [
    normalizeRecordKeyPart(reference.organizationId, "Organization id"),
    reference.console,
    normalizeRecordKeyPart(reference.domain, "Domain"),
    normalizeRecordKeyPart(reference.recordType, "Record type"),
    normalizeRecordKeyPart(reference.recordId, "Record id")
  ].join(":");
}
