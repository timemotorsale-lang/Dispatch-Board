import { salesConsoleMvpExecution, type SalesConsoleMvpRole } from "./sales-console-mvp-execution";

export type SalesConsoleAuditActor = {
  displayName: string;
  role: SalesConsoleMvpRole;
  storeId: string;
  teamId?: string;
  userId: string;
};

export type SalesConsoleAuditedSourceRecord = {
  recordId: string;
  sourceSystem: "CRM" | "DMS" | "Finance" | "Inventory" | "Lead Source" | "Sales Console";
  sourceUrl: string;
  type: "approval" | "customer" | "deal" | "finance" | "inventory" | "lead" | "message" | "quote" | "reservation" | "task";
};

export type SalesConsoleAuditEventType =
  | "approval-requested"
  | "customer-message-drafted"
  | "deal-stage-review-requested"
  | "finance-handoff-prepared"
  | "quote-scenario-drafted"
  | "vehicle-hold-requested";

export type SalesConsoleAuditEvent = {
  actor: SalesConsoleAuditActor;
  afterSummary: string;
  auditId: string;
  beforeSummary: string;
  eventType: SalesConsoleAuditEventType;
  immutable: true;
  reason: string;
  sourceRecord: SalesConsoleAuditedSourceRecord;
  timestampIso: string;
};

export type SalesConsoleFutureActionAuditCoverage = {
  action: string;
  auditEventType: SalesConsoleAuditEventType;
  coverage: "audit-required";
  enabled: false;
  requiredFields: Array<keyof SalesConsoleAuditEvent>;
  sourceRecordType: SalesConsoleAuditedSourceRecord["type"];
};

export type SalesConsoleAuditReadModel = {
  events: SalesConsoleAuditEvent[];
  futureActionCoverage: SalesConsoleFutureActionAuditCoverage[];
  guardrails: string[];
  readOnly: true;
};

const requiredAuditFields = [
  "actor",
  "afterSummary",
  "auditId",
  "beforeSummary",
  "eventType",
  "reason",
  "sourceRecord",
  "timestampIso"
] as const satisfies Array<keyof SalesConsoleAuditEvent>;

export const salesConsoleAuditReadModel = {
  events: [
    {
      actor: {
        displayName: "A. Carter",
        role: "sales-manager",
        storeId: "time-motor-sales-main",
        teamId: "sales-team-a",
        userId: "user-sales-manager-placeholder"
      },
      afterSummary: "Manager review requested; no approval decision made.",
      auditId: "audit-placeholder-1001",
      beforeSummary: "Deal visible with terms review blocker.",
      eventType: "approval-requested",
      immutable: true,
      reason: "Pilot evidence for future manager approval workflow.",
      sourceRecord: {
        recordId: "D-12457",
        sourceSystem: "DMS",
        sourceUrl: "/deals/D-12457",
        type: "deal"
      },
      timestampIso: "2026-07-28T09:00:00.000-05:00"
    },
    {
      actor: {
        displayName: "A. Carter",
        role: "salesperson",
        storeId: "time-motor-sales-main",
        teamId: "sales-team-a",
        userId: "user-salesperson-placeholder"
      },
      afterSummary: "Estimate-only scenario drafted; quote submission remains disabled.",
      auditId: "audit-placeholder-1002",
      beforeSummary: "Customer deal visible without final quote.",
      eventType: "quote-scenario-drafted",
      immutable: true,
      reason: "Pilot evidence for future quote/scenario builder.",
      sourceRecord: {
        recordId: "D-12457",
        sourceSystem: "DMS",
        sourceUrl: "/deals/D-12457",
        type: "quote"
      },
      timestampIso: "2026-07-28T09:15:00.000-05:00"
    }
  ],
  futureActionCoverage: [
    {
      action: "Customer messaging automation",
      auditEventType: "customer-message-drafted",
      coverage: "audit-required",
      enabled: false,
      requiredFields: [...requiredAuditFields],
      sourceRecordType: "message"
    },
    {
      action: "Quote submission",
      auditEventType: "quote-scenario-drafted",
      coverage: "audit-required",
      enabled: false,
      requiredFields: [...requiredAuditFields],
      sourceRecordType: "quote"
    },
    {
      action: "Vehicle holds or reservations",
      auditEventType: "vehicle-hold-requested",
      coverage: "audit-required",
      enabled: false,
      requiredFields: [...requiredAuditFields],
      sourceRecordType: "reservation"
    },
    {
      action: "Finance decisions",
      auditEventType: "finance-handoff-prepared",
      coverage: "audit-required",
      enabled: false,
      requiredFields: [...requiredAuditFields],
      sourceRecordType: "finance"
    },
    {
      action: "Discount approvals",
      auditEventType: "approval-requested",
      coverage: "audit-required",
      enabled: false,
      requiredFields: [...requiredAuditFields],
      sourceRecordType: "approval"
    }
  ],
  guardrails: [
    "Append-only audit events; no edit/delete workflow in the Sales Console.",
    "Actor, role, source record, timestamp, reason, before summary, and after summary are required.",
    "Sensitive fields stay summarized until privacy rules are approved.",
    "Future enterprise write actions cannot activate without audit coverage."
  ],
  readOnly: true
} as const satisfies SalesConsoleAuditReadModel;

export function sensitiveActionsHaveAuditCoverage(readModel: SalesConsoleAuditReadModel = salesConsoleAuditReadModel) {
  return salesConsoleMvpExecution.readOnlyGuardrails.every((guardrail) =>
    readModel.futureActionCoverage.some((coverage) =>
      coverage.action === guardrail.action &&
      coverage.coverage === "audit-required" &&
      coverage.enabled === false &&
      requiredAuditFields.every((field) => coverage.requiredFields.includes(field))
    )
  );
}

export function auditEventsAreImmutable(readModel: SalesConsoleAuditReadModel = salesConsoleAuditReadModel) {
  return readModel.events.every((event) => event.immutable === true);
}
