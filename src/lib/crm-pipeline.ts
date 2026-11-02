/** Shared browser/server contract. Business dates use the store clock, never the host clock. */
export const PIPELINE_TIMEZONE = "America/Chicago";
export const PIPELINE_PERIODS = {
  today: "Today", yesterday: "Yesterday", this_week: "This week", last_week: "Last week",
  two_weeks_ago: "Two weeks ago", last_two_weeks: "Last two completed weeks", this_month: "This month",
  last_month: "Last month", past_14_days: "Past 14 completed days", custom: "Custom dates"
} as const;
export type PipelinePeriod = keyof typeof PIPELINE_PERIODS;
export const PIPELINE_STAGES = ["NEW_INQUIRY", "QUALIFIED", "APPOINTMENT_SET", "WORKING_DEAL", "QUOTE_PRESENTED", "CUSTOMER_DECIDING", "WON", "LOST"] as const;
export const PIPELINE_PATHS = ["retail-sale", "outside-finance-one-pay", "finance", "bhph", "lease-to-own", "wholesale", "repairs", "daily-rental", "vehicle-loaner", "test-drive", "warranty-products", "financing-products"] as const;
export const PIPELINE_DISPOSITIONS = ["ACTIVE", "WAITING", "NURTURE", "DO_NOT_CONTACT", "ARCHIVED"] as const;
export const pipelineLabel = (value: string) => value.toLowerCase().replaceAll(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
export function localPipelineDate(value: Date | string, timezone = PIPELINE_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  return ["year", "month", "day"].map(k => parts.find(p => p.type === k)!.value).join("-");
}
export function validPipelineDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function day(value: string, shift: number) { const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + shift); return date.toISOString().slice(0, 10); }
export function pipelineMidnight(value: string, timezone = PIPELINE_TIMEZONE) {
  if (!validPipelineDate(value)) throw new Error("Choose a valid calendar date.");
  const target = Date.parse(`${value}T00:00:00Z`); let candidate = target;
  for (let i = 0; i < 6; i++) {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(candidate);
    const n = (key: string) => Number(parts.find(p => p.type === key)!.value);
    const actual = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
    if (actual === target) return new Date(candidate);
    candidate += target - actual;
  }
  throw new Error("The store calendar boundary could not be resolved.");
}
export function resolvePipelinePeriod(period: string, now = new Date(), customStart = "", customEnd = "", timezone = PIPELINE_TIMEZONE) {
  if (!Object.hasOwn(PIPELINE_PERIODS, period)) throw new Error("Choose a reporting period.");
  const today = localPipelineDate(now, timezone), date = new Date(`${today}T12:00:00Z`), monday = day(today, -((date.getUTCDay() + 6) % 7));
  let start = today, end = day(today, 1);
  if (period === "yesterday") { start = day(today, -1); end = today; }
  if (period === "this_week") { start = monday; end = day(monday, 7); }
  if (period === "last_week") { start = day(monday, -7); end = monday; }
  if (period === "two_weeks_ago") { start = day(monday, -14); end = day(monday, -7); }
  if (period === "last_two_weeks") { start = day(monday, -14); end = monday; }
  if (period === "past_14_days") { start = day(today, -14); end = today; }
  if (period === "this_month" || period === "last_month") {
    date.setUTCDate(1); if (period === "last_month") date.setUTCMonth(date.getUTCMonth() - 1);
    start = date.toISOString().slice(0, 10); date.setUTCMonth(date.getUTCMonth() + 1); end = date.toISOString().slice(0, 10);
  }
  if (period === "custom") {
    if (!validPipelineDate(customStart) || !validPipelineDate(customEnd) || customEnd < customStart) throw new Error("Choose valid start and end dates in order.");
    start = customStart; end = day(customEnd, 1);
    if ((Date.parse(end) - Date.parse(start)) / 86400000 > 731) throw new Error("Choose a range of two years or less.");
  }
  return { key: period as PipelinePeriod, label: PIPELINE_PERIODS[period as PipelinePeriod], startDate: start, endDate: day(end, -1), start: pipelineMidnight(start, timezone).toISOString(), endExclusive: pipelineMidnight(end, timezone).toISOString(), timezone };
}
export function inPipelinePeriod(value: string | null, range: ReturnType<typeof resolvePipelinePeriod>) { return Boolean(value && value >= range.start && value < range.endExclusive); }
export const PIPELINE_SEQUENCES = {
  inquiry: { label: "New inquiry response", steps: ["Respond to inquiry", "Confirm interest", "Offer appointment"] },
  no_response: { label: "No response", steps: ["Review permitted contact channel", "Follow up on inquiry", "Review nurture decision"] },
  appointment: { label: "Appointment confirmation", steps: ["Confirm appointment", "Record attendance", "Record next commitment"] },
  no_show: { label: "No-show recovery", steps: ["Check missed appointment", "Offer another appointment", "Review outcome"] },
  quote: { label: "Quote follow-up", steps: ["Confirm quote received", "Answer questions", "Record customer decision"] },
  paperwork: { label: "Sold paperwork", steps: ["Collect signed documents", "Review insurance and DMV items", "Review funding and delivery"] },
  delivery: { label: "Post-delivery support", steps: ["Confirm delivery experience", "Resolve outstanding concerns", "Schedule permitted support review"] }
} as const;
export type PipelineSequenceCode = keyof typeof PIPELINE_SEQUENCES;
export type PipelineTemplateVersion = { code: PipelineSequenceCode; version: number; steps: string[]; reason: string; savedAt: string | null; actor: string };
export type PipelineException = { id: string; code: string; reason: string; firstSeenAt: string; reviewDueAt: string; ownerUserId: string | null; queue: string; state: string };
export type PipelineRow = {
  inquiryReviewedAt?: string | null;
  dealReviewState?: string | null;
  responseTargetMinutes?: number;
  followUpPushCount?: number;
  appointments?: { id: string; title: string; startsAt: string | null; attendance: string; status: string }[];
  contact?: { phone: string; email: string };
  firstResponseAt?: string | null;
  stalledAfterDays?: number;
  dealChoices?: { id: string; status: string; vehicle: string; pathway: string }[];
  id: string; opportunityNumber: string; title: string; summary: string | null; stage: string; version: number;
  customerId: string | null; customerName: string; ownerUserId: string | null; ownerName: string; ownerActive: boolean;
  sourceCode: string; sourceLeadId: string | null; vehicle: string; pathway: string; temperature: string; disposition: string;
  nextActionLabel: string | null; nextActionDueAt: string | null; expectedCloseAt: string | null; estimatedValueCents: number | null;
  receivedAt: string; updatedAt: string; stageEnteredAt: string | null; soldAt: string | null; completedAt: string | null;
  reviewAt: string | null; pushCount: number; pendingOwnerId: string | null; handoffDueAt: string | null; dealId: string | null; dealStatus: string | null;
  exceptions: PipelineException[];
  tasks: { id: string; title: string; dueAt: string; status: string; completedAt: string | null; requiresManagerApproval: boolean; assignedUserId: string }[];
  history: { id: string; eventType: string; reason: string; actor: string; occurredAt: string; priorValue: unknown; newValue: unknown }[];
  sequence: { taskId?: string | null; id: string; code: PipelineSequenceCode; version: number; step: number; state: string; nextRunAt: string | null; reason: string | null; steps: string[] } | null;
};
export type PipelineWorkspace = { templateVersions?: PipelineTemplateVersion[]; importBatches?: { id: string; receivedAt: string; ownerUserId: string; remaining: number; reason: string }[]; generatedAt: string; actorId: string; organizationId: string; canManage: boolean; canWrite: boolean; scope: string; rows: PipelineRow[]; owners: { id: string; name: string }[]; customers: { id: string; name: string }[]; truncated: boolean; nextCursor?: string | null; moreLeads?: boolean; unlinkedLeads: { id: string; title: string; customerId: string; ownerUserId: string; sourceCode: string; stage?: string; nextActionAt: string; createdAt: string }[]; health: { pending: number; failed: number; oldestPendingAt: string | null; lastWorkerAt: string | null }; };
export const activePipelineRow = (r: PipelineRow) => !["WON", "LOST"].includes(r.stage) && r.disposition !== "ARCHIVED";
export function pipelineSignals(row: PipelineRow, now: Date) {
  const codes: [string, string][] = [];
  if (!activePipelineRow(row)) return codes;
  if (!row.ownerUserId) codes.push(["UNASSIGNED", "Assign an authorized owner; Intake queue remains responsible."]);
  else if (!row.ownerActive) codes.push(["INACTIVE_OWNER", "The assigned owner is inactive. A manager must transfer responsibility."]);
  if (!row.customerId) codes.push(["CONTACT_REVIEW", "Link the captured inquiry to a verified customer before conversion."]);
  if (row.contact && !(/^\+?[\d ()-]{7,}$/.test(row.contact.phone) && row.contact.phone.replace(/\D/g, "").length >= 7 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.contact.email))) codes.push(["CONTACT_REVIEW", "Verify a usable phone number or email. Keep the inquiry in review until contact details are corrected."]);
  if (!row.firstResponseAt && Date.parse(row.receivedAt) < now.getTime() - (row.responseTargetMinutes ?? 30) * 60000) codes.push(["FIRST_RESPONSE_OVERDUE", "No first response is recorded within the configured response target. Review the inquiry and contact eligibility."]);
  if ((row.followUpPushCount ?? 0) >= 3) codes.push(["REPEATED_SNOOZE", "Follow-up has been postponed at least three times without a recorded outcome. Review the blocker."]);
  if (row.disposition === "ACTIVE" && (!row.nextActionDueAt || !row.nextActionLabel)) codes.push(["NO_NEXT_ACTION", "Set a dated next action or an explicit waiting or nurture review."]);
  if (row.nextActionDueAt && row.nextActionDueAt < now.toISOString()) codes.push(["OVERDUE", "The next action is overdue and remains assigned."]);
  if (["NURTURE", "WAITING"].includes(row.disposition) && (!row.reviewAt || row.reviewAt < now.toISOString())) codes.push(["REVIEW_DUE", "The waiting or nurture review is due."]);
  if (row.pendingOwnerId && row.handoffDueAt && row.handoffDueAt < now.toISOString()) codes.push(["HANDOFF_OVERDUE", "The receiving owner has not accepted this handoff."]);
  if (row.expectedCloseAt && row.expectedCloseAt < pipelineMidnight(localPipelineDate(now)).toISOString()) codes.push(["CLOSE_OVERDUE", "The expected closing date has passed. Record a decision or a revised plan."]);
  if (row.pushCount >= 3) codes.push(["REPEATED_PUSH", "This closing plan has been moved at least three times. Manager review is needed."]);
  if (row.stageEnteredAt && Date.parse(row.stageEnteredAt) < now.getTime() - (row.stalledAfterDays ?? 14) * 86400000) codes.push(["STALLED", `More than ${row.stalledAfterDays ?? 14} calendar days in this stage. Review the blocker.`]);
  return [...new Map(codes.map(entry => [entry[0], entry])).values()];
}
