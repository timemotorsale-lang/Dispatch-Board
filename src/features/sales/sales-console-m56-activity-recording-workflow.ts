import {
  hasRequiredAuditMetadata,
  type SalesActivityKind,
  type SalesConsoleAuditMetadata,
  type SalesConsoleCommandName
} from "./sales-console-m50-record-command-contract";

export const salesActivityRecordingActions = [
  "log call outcome",
  "log walk-in outcome",
  "log appointment outcome",
  "add sales note",
  "set next action",
  "record vehicle shown",
  "record document requested",
  "record document received",
  "create promise",
  "request manager help"
] as const;

export const salesActivityBlockedRiskyActions = [
  "send customer message",
  "submit quote",
  "approve discount",
  "decide finance",
  "hold vehicle",
  "reserve vehicle",
  "execute contract"
] as const;

export type SalesActivityRecordingIntent = {
  opportunityId: string;
  action: (typeof salesActivityRecordingActions)[number];
  summary: string;
  nextAction?: string;
  relatedVehicleStockNumber?: string;
  relatedEvidenceId?: string;
  audit: Partial<SalesConsoleAuditMetadata>;
};

export type SalesActivityRecordingResult = {
  allowed: boolean;
  commandName?: SalesConsoleCommandName;
  activityKind?: SalesActivityKind;
  reasons: string[];
};

const actionCommandMap: Record<(typeof salesActivityRecordingActions)[number], SalesConsoleCommandName> = {
  "log call outcome": "LogSalesActivity",
  "log walk-in outcome": "LogSalesActivity",
  "log appointment outcome": "LogSalesActivity",
  "add sales note": "AddSalesNote",
  "set next action": "SetNextAction",
  "record vehicle shown": "LogSalesActivity",
  "record document requested": "LogSalesActivity",
  "record document received": "LogSalesActivity",
  "create promise": "AddSalesPromise",
  "request manager help": "RequestManagerReview"
};

const actionKindMap: Partial<Record<(typeof salesActivityRecordingActions)[number], SalesActivityKind>> = {
  "log call outcome": "call-outcome",
  "log walk-in outcome": "walk-in-outcome",
  "log appointment outcome": "appointment-outcome",
  "record vehicle shown": "vehicle-shown",
  "record document requested": "document-requested",
  "record document received": "document-received",
  "request manager help": "manager-help-requested"
};

export function evaluateSalesActivityRecording(intent: SalesActivityRecordingIntent): SalesActivityRecordingResult {
  const reasons: string[] = [];

  if (!intent.opportunityId) {
    reasons.push("opportunity is required");
  }

  if (!intent.summary.trim()) {
    reasons.push("summary is required");
  }

  if (!hasRequiredAuditMetadata(intent.audit)) {
    reasons.push("audit and idempotency metadata required");
  }

  return {
    allowed: reasons.length === 0,
    commandName: reasons.length === 0 ? actionCommandMap[intent.action] : undefined,
    activityKind: actionKindMap[intent.action],
    reasons
  };
}

export function salesActivityActionIsRisky(action: string) {
  return salesActivityBlockedRiskyActions.some((blocked) => action.toLowerCase().includes(blocked));
}
