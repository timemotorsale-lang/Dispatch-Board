import { WorkdayActivityPurpose } from "@prisma/client";

export const WORKDAY_ACTIVITY_TIME_ZONE = "America/Chicago";
export function workdayDate(at: Date, timeZone = WORKDAY_ACTIVITY_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const part = (name: string) => parts.find(value => value.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function workdayBounds(date: string, timeZone = WORKDAY_ACTIVITY_TIME_ZONE) {
  const midnight = (day: string) => {
    const target = Date.parse(`${day}T00:00:00Z`);
    let candidate = target;
    for (let i = 0; i < 4; i++) {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(candidate));
      const part = (name: string) => Number(parts.find(value => value.type === name)!.value);
      const shown = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
      candidate += target - shown;
    }
    return new Date(candidate);
  };
  const next = new Date(`${date}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
  return { gte: midnight(date), lt: midnight(next.toISOString().slice(0, 10)) };
}

// Command completion means the save succeeded, not that the repair itself is complete.
export function externalActivityPurpose(eventType: string, metadata: Record<string, unknown> = {}): WorkdayActivityPurpose {
  const action = eventType.toLowerCase();
  if (/heartbeat|page_view|navigation|telemetry|sign_in|login/.test(action)) return WorkdayActivityPurpose.TIME_ATTENTION;
  if (metadata.sourceType === "ENTERPRISE_AUDIT") {
    const command = String(metadata.commandType ?? eventType).toUpperCase().replace(/_COMPLETED$/, "");
    if (/^(COMPLETE_REPAIR|COMPLETE_REPAIR_JOB|CLOSE_REPAIR_ORDER|COMPLETE_TASK)$/.test(command)) return WorkdayActivityPurpose.COMPLETED_WORK;
    if (/REJECT|BLOCK|FAIL|REVOK/.test(command)) return WorkdayActivityPurpose.BLOCKER_RISK;
    return WorkdayActivityPurpose.REPORT_WORTHY_EVENT;
  }
  if (/blocked|risk|failed|rejected|reopened/.test(action)) return WorkdayActivityPurpose.BLOCKER_RISK;
  if (/^(task\.completed|task\.closed|task\.checklist_completed|task\.subtask_completed|concern\.closed|duty_item\.completed|repair_order\.task_closed)$/.test(action)) return WorkdayActivityPurpose.COMPLETED_WORK;
  if (action.includes("support")) return WorkdayActivityPurpose.SUPPORT_REQUEST;
  if (action.includes("promise")) return WorkdayActivityPurpose.PROMISE_COMMITMENT;
  if (action.includes("follow")) return WorkdayActivityPurpose.FOLLOW_UP;
  if (action.includes("customer")) return WorkdayActivityPurpose.CUSTOMER_COMMUNICATION;
  return WorkdayActivityPurpose.REPORT_WORTHY_EVENT;
}

export function activitySourceHref(subjectType: string, subjectId: string): string | null {
  const id = encodeURIComponent(subjectId);
  if (subjectType === "REPAIR_ORDER") return `/vehicles/repair-workbench?repairOrderId=${id}`;
  if (subjectType === "DIAGNOSTIC_CASE") return `/diagnostics/cases/${id}`;
  if (subjectType === "VEHICLE") return `/vehicles/repair-workbench?vehicleId=${id}`;
  if (subjectType === "TASK") return `/tasks/${id}`;
  return null;
}
