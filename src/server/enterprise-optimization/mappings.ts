import type {
  DataClassification,
  EnterpriseConceptCode,
  EnterpriseConsoleCode,
  InformationAuthority
} from "./domain";

export type EnterpriseSourceMapping = {
  mappingId: string;
  module: string;
  console: EnterpriseConsoleCode;
  domainRecord: string;
  sourceLocation: string;
  authority: InformationAuthority;
  dataClassification: DataClassification;
  concepts: readonly EnterpriseConceptCode[];
  notes: string;
};

export type TranslationDisposition = "DIRECT" | "CONTEXT_REQUIRED" | "DOMAIN_ONLY";

export type EnterpriseCodeTranslation = {
  sourceDomain: string;
  sourceCode: string;
  enterpriseCode: string | null;
  disposition: TranslationDisposition;
  notes: string;
};

export const ENTERPRISE_SOURCE_MAPPINGS: readonly EnterpriseSourceMapping[] = [
  { mappingId: "dispatch.board-day", module: "Dispatch Board", console: "DISPATCH", domainRecord: "BoardDay", sourceLocation: "prisma/schema.prisma", authority: "CANONICAL", dataClassification: "AUTHORITATIVE_FACT", concepts: ["WORKFLOW", "RESOURCE", "EVENT"], notes: "Canonical daily Dispatch board identity and generation state within the application." },
  { mappingId: "dispatch.task", module: "Tasks and My Tasks", console: "DISPATCH", domainRecord: "Task", sourceLocation: "prisma/schema.prisma", authority: "CANONICAL", dataClassification: "AUTHORITATIVE_FACT", concepts: ["WORK_ITEM", "COMMITMENT", "RESOURCE", "DEPENDENCY", "DECISION", "OUTCOME"], notes: "Canonical accountable executable-work record for the current Dispatch domain." },
  { mappingId: "dispatch.activity-event", module: "Activity", console: "DISPATCH", domainRecord: "ActivityEvent", sourceLocation: "prisma/schema.prisma", authority: "EVIDENTIARY", dataClassification: "OBSERVED_SIGNAL", concepts: ["EVENT", "EVIDENCE"], notes: "Dispatch activity evidence; it does not replace enterprise audit or domain-event history." },
  { mappingId: "dispatch.appointment", module: "Appointments", console: "DISPATCH", domainRecord: "Appointment", sourceLocation: "prisma/schema.prisma", authority: "CANONICAL", dataClassification: "AUTHORITATIVE_FACT", concepts: ["WORKFLOW", "COMMITMENT", "RESOURCE", "EVENT", "OUTCOME"], notes: "Canonical in-application appointment lifecycle and scheduling record." },
  { mappingId: "dispatch.customer", module: "Customers", console: "DISPATCH", domainRecord: "Customer", sourceLocation: "prisma/schema.prisma", authority: "CANONICAL", dataClassification: "AUTHORITATIVE_FACT", concepts: ["RESOURCE", "COMMITMENT", "EVIDENCE", "OUTCOME"], notes: "Canonical operational customer record within the application; external-provider authority remains separately governed." },
  { mappingId: "dispatch.project-projection", module: "Projects", console: "DISPATCH", domainRecord: "Task.projectArea projection", sourceLocation: "src/features/projects", authority: "DERIVED", dataClassification: "CALCULATED_VALUE", concepts: ["WORKFLOW", "WORK_ITEM", "OUTCOME"], notes: "Projects currently organize task records; no independent Project system of record is asserted." },
  { mappingId: "dispatch.vehicle", module: "Vehicles", console: "DISPATCH", domainRecord: "Vehicle", sourceLocation: "prisma/schema.prisma", authority: "CANONICAL", dataClassification: "AUTHORITATIVE_FACT", concepts: ["RESOURCE", "EVIDENCE", "EVENT"], notes: "Canonical operational vehicle identity after governed identity reconciliation." },
  { mappingId: "dispatch.inventory-unit", module: "Inventory", console: "DISPATCH", domainRecord: "InventoryUnit", sourceLocation: "prisma/schema.prisma", authority: "CANONICAL", dataClassification: "AUTHORITATIVE_FACT", concepts: ["RESOURCE", "WORKFLOW", "COMMITMENT", "RISK", "DECISION", "OUTCOME"], notes: "Canonical in-application retail inventory lifecycle record." },
  { mappingId: "enterprise.domain-event", module: "Enterprise Foundation", console: "ADMINISTRATION", domainRecord: "EnterpriseDomainEvent", sourceLocation: "prisma/schema.prisma", authority: "EVIDENTIARY", dataClassification: "AUTHORITATIVE_FACT", concepts: ["EVENT", "EVIDENCE"], notes: "Immutable domain occurrence history for enterprise command-backed aggregates." },
  { mappingId: "enterprise.audit-event", module: "Enterprise Foundation", console: "ADMINISTRATION", domainRecord: "EnterpriseAuditEvent", sourceLocation: "prisma/schema.prisma", authority: "EVIDENTIARY", dataClassification: "AUTHORITATIVE_FACT", concepts: ["EVENT", "EVIDENCE", "DECISION"], notes: "Immutable actor, reason, prior-value, and new-value audit evidence." },
  { mappingId: "insights.governed-projection", module: "Insights", console: "INSIGHTS", domainRecord: "Governed domain projections", sourceLocation: "src/app/(app)/insights", authority: "DERIVED", dataClassification: "CALCULATED_VALUE", concepts: ["BUSINESS_OUTCOME", "SERVICE", "WORKFLOW", "RISK", "EXCEPTION", "OUTCOME"], notes: "Insights may present reproducible calculations from governed sources but does not own the underlying business facts." },
  { mappingId: "planned.time-attendance", module: "Time and Attendance", console: "TIME_ATTENDANCE", domainRecord: "Not implemented", sourceLocation: "Future domain architecture", authority: "PLANNED", dataClassification: "AUTHORITATIVE_FACT", concepts: ["WORKFLOW", "WORK_ITEM", "COMMITMENT", "EVIDENCE", "OUTCOME"], notes: "No current application record is authorized as the timekeeping or payroll source of truth." },
  { mappingId: "planned.people-hr", module: "People and HR", console: "PEOPLE_HR", domainRecord: "Not implemented", sourceLocation: "Future domain architecture", authority: "PLANNED", dataClassification: "AUTHORITATIVE_FACT", concepts: ["WORKFLOW", "WORK_ITEM", "COMMITMENT", "EVIDENCE", "RISK", "OUTCOME"], notes: "No current application record is authorized as an HR system of record." },
  { mappingId: "planned.compliance", module: "Compliance", console: "COMPLIANCE", domainRecord: "Not implemented", sourceLocation: "Future domain architecture", authority: "PLANNED", dataClassification: "AUTHORITATIVE_FACT", concepts: ["WORKFLOW", "WORK_ITEM", "COMMITMENT", "RISK", "EXCEPTION", "EVIDENCE", "OUTCOME"], notes: "Existing task reminders may support work but are not a compliance system of record." },
  { mappingId: "planned.legal-accounting", module: "Legal and Accounting", console: "LEGAL_ACCOUNTING", domainRecord: "Not implemented", sourceLocation: "Future domain architecture", authority: "PLANNED", dataClassification: "AUTHORITATIVE_FACT", concepts: ["WORKFLOW", "WORK_ITEM", "COMMITMENT", "RISK", "EVIDENCE", "DECISION", "OUTCOME"], notes: "No current application record is authorized as the accounting ledger or legal matter source of truth." },
  { mappingId: "planned.library-training", module: "Library and Training", console: "LIBRARY_TRAINING", domainRecord: "Not implemented", sourceLocation: "Future domain architecture", authority: "PLANNED", dataClassification: "AUTHORITATIVE_FACT", concepts: ["SERVICE", "WORKFLOW", "WORK_ITEM", "EVIDENCE", "OUTCOME"], notes: "Operational files and tasks do not yet constitute controlled knowledge or competency records." }
];

export const ENTERPRISE_EVENT_TRANSLATIONS: readonly EnterpriseCodeTranslation[] = [
  { sourceDomain: "dispatch.activity", sourceCode: "TASK_CREATED", enterpriseCode: "enterprise.work.created", disposition: "DIRECT", notes: "The source event identifies the created Task as accountable Dispatch work." },
  { sourceDomain: "dispatch.activity", sourceCode: "STATUS_CHANGED", enterpriseCode: "enterprise.work.state-changed", disposition: "DIRECT", notes: "Translation must retain prior status, next status, subject, actor, and occurrence time when available." },
  { sourceDomain: "dispatch.activity", sourceCode: "DAILY_BOARD_GENERATED", enterpriseCode: null, disposition: "DOMAIN_ONLY", notes: "Board generation remains a Dispatch workflow event until a shared workflow event is approved." }
];

export const ENTERPRISE_REASON_TRANSLATIONS: readonly EnterpriseCodeTranslation[] = [
  { sourceDomain: "dispatch.assignment", sourceCode: "MANAGER_REVIEW_NEEDED", enterpriseCode: "AUTHORITY.HUMAN_REVIEW_REQUIRED", disposition: "DIRECT", notes: "The absence of a clear eligible match requires human review." },
  { sourceDomain: "dispatch.assignment", sourceCode: "DIRECT_DUTY_MATCH", enterpriseCode: null, disposition: "DOMAIN_ONLY", notes: "This is a Dispatch assignment explanation, not a shared enterprise constraint." },
  { sourceDomain: "dispatch.assignment", sourceCode: "ROLE_MATCH", enterpriseCode: null, disposition: "DOMAIN_ONLY", notes: "This is a Dispatch assignment explanation, not a shared enterprise constraint." },
  { sourceDomain: "dispatch.assignment", sourceCode: "TEMPLATE_OWNER_MATCH", enterpriseCode: null, disposition: "DOMAIN_ONLY", notes: "This is a Dispatch assignment explanation, not a shared enterprise constraint." },
  { sourceDomain: "dispatch.assignment", sourceCode: "WORKFLOW_AREA_MATCH", enterpriseCode: null, disposition: "DOMAIN_ONLY", notes: "This is a Dispatch assignment explanation, not a shared enterprise constraint." }
];

export function mappingsForConsole(console: EnterpriseConsoleCode) {
  return ENTERPRISE_SOURCE_MAPPINGS.filter((mapping) => mapping.console === console);
}

export function findEnterpriseSourceMapping(mappingId: string) {
  return ENTERPRISE_SOURCE_MAPPINGS.find((mapping) => mapping.mappingId === mappingId) ?? null;
}
