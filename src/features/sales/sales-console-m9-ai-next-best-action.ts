import { salesConsoleAuditReadModel } from "./sales-console-m9-audit-trails";
import { salesConsoleEnterprisePermissionReadModel } from "./sales-console-m9-enterprise-permissions";

export type SalesConsoleAiRecommendationType =
  | "call-customer"
  | "manager-review"
  | "verify-inventory"
  | "work-stale-lead";

export type SalesConsoleAiBlockedAction =
  | "approve"
  | "finance-decide"
  | "hold"
  | "message"
  | "mutate-crm-dms"
  | "quote";

export type SalesConsoleAiNextBestActionRecommendation = {
  actionType: SalesConsoleAiRecommendationType;
  autoExecute: false;
  blockedActions: SalesConsoleAiBlockedAction[];
  confidence: "high" | "low" | "medium";
  evidenceLinks: string[];
  humanConfirmationRequired: true;
  reason: string;
  recommendationId: string;
  sourceRecordIds: string[];
};

export type SalesConsoleAiNextBestActionReadModel = {
  guardrails: string[];
  readOnly: true;
  recommendations: SalesConsoleAiNextBestActionRecommendation[];
};

export const salesConsoleAiNextBestActionReadModel = {
  guardrails: [
    "AI recommendations are advisory only and cannot execute customer messages, quotes, holds, approvals, finance decisions, or CRM/DMS mutations.",
    "Every recommendation requires source evidence, reason, confidence, and human confirmation.",
    "Low-confidence or stale-source recommendations must be verify-first.",
    "User action taken from a recommendation requires audit and permission gates in a later approved branch."
  ],
  readOnly: true,
  recommendations: [
    {
      actionType: "manager-review",
      autoExecute: false,
      blockedActions: ["approve", "finance-decide", "hold", "message", "mutate-crm-dms", "quote"],
      confidence: "medium",
      evidenceLinks: ["/deals/D-12457", "/tasks/task-101", "/sales#audit-trail-foundation"],
      humanConfirmationRequired: true,
      reason: "Deal has terms-review blocker and pending manager visibility.",
      recommendationId: "nba-placeholder-1001",
      sourceRecordIds: ["D-12457", "task-101", "audit-placeholder-1001"]
    },
    {
      actionType: "verify-inventory",
      autoExecute: false,
      blockedActions: ["approve", "finance-decide", "hold", "message", "mutate-crm-dms", "quote"],
      confidence: "low",
      evidenceLinks: ["/vehicles/360/veh-103", "/sales#inventory-intelligence"],
      humanConfirmationRequired: true,
      reason: "Vehicle match is verify-first because recon status is unknown.",
      recommendationId: "nba-placeholder-1002",
      sourceRecordIds: ["veh-103", "F241512"]
    }
  ]
} as const satisfies SalesConsoleAiNextBestActionReadModel;

export function aiRecommendationsAreAdvisoryOnly(readModel = salesConsoleAiNextBestActionReadModel) {
  return readModel.readOnly === true &&
    readModel.recommendations.every((item) => item.autoExecute === false && item.humanConfirmationRequired === true);
}

export function aiRecommendationsHaveEvidenceReasonAndConfidence(readModel = salesConsoleAiNextBestActionReadModel) {
  return readModel.recommendations.every((item) =>
    item.evidenceLinks.length > 0 &&
    item.reason.length > 0 &&
    item.confidence.length > 0 &&
    item.sourceRecordIds.length > 0
  );
}

export function aiCannotExecuteRiskyActions(readModel = salesConsoleAiNextBestActionReadModel) {
  const requiredBlocked: SalesConsoleAiBlockedAction[] = ["approve", "finance-decide", "hold", "message", "mutate-crm-dms", "quote"];

  return readModel.recommendations.every((item) =>
    requiredBlocked.every((blockedAction) => item.blockedActions.includes(blockedAction))
  );
}

export function aiActionsRequireFutureAuditAndPermissionCoverage() {
  const hasAuditCoverage = salesConsoleAuditReadModel.futureActionCoverage.every((coverage) => coverage.enabled === false);
  const hasPermissionCoverage = salesConsoleEnterprisePermissionReadModel.gates.every((gate) => gate.enabled === false && gate.auditRequired);

  return hasAuditCoverage && hasPermissionCoverage;
}
