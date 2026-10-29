export type DispatchState = "WORKING" | "AVAILABLE" | "BLOCKED" | "OFF_DUTY" | "UNKNOWN";
export const dispatchStateLabel: Record<DispatchState, string> = {
  WORKING: "Working", AVAILABLE: "Available", BLOCKED: "Blocked", OFF_DUTY: "Off duty", UNKNOWN: "No current update",
};
export type TeamTask = {
  id: string; title: string; status: string; assignedUserId: string; ownerUserId: string | null;
  updatedAt: string; boardDate: string; blockerReason: string | null; isClaimable: boolean;
};
export type TeamFocus = { id: string; title: string; status: string; taskId: string | null; businessDate: string };
export type TeamHandoff = {
  id: string; taskId: string; title: string; senderUserId: string; receiverUserId: string;
  sender: string; receiver: string; nextAction: string; status: string; version: number; createdAt: string;
};
export type TeamRow = {
  id: string; name: string; state: DispatchState; title: string | null; taskId: string | null; focusId: string | null;
  updatedAt: string | null; startedAt: string | null; overnight: boolean; updateNeeded: boolean;
  nextAction: string; version: number; tasks: TeamTask[]; focuses: TeamFocus[];
};
export type DispatchTeam = {
  date: string; today: string; historical: boolean; syncedAt: string; actorUserId: string; canReviewReports: boolean;
  canManage: boolean; people: Array<{ id: string; name: string }>; rows: TeamRow[]; handoffs: TeamHandoff[];
  unassigned: TeamTask[]; limitation: string | null;
};
export function safeDispatchState(value: string): DispatchState {
  return Object.hasOwn(dispatchStateLabel, value) ? value as DispatchState : "UNKNOWN";
}
export function projectTeamRow(input: {
  person: { id: string; name: string }; tasks: TeamTask[]; focuses: TeamFocus[]; date: string;
  now: string; freshnessMinutes?: number;
  presence?: { state: string; businessDate: string; primaryTaskId: string | null; primaryFocusId: string | null;
    updatedAt: string; startedAt: string | null; nextAction: string; version: number } | null;
}): TeamRow {
  const { person, tasks, focuses, date, presence } = input;
  const task = tasks.find(item => item.id === presence?.primaryTaskId && item.status !== "COMPLETED");
  const focus = focuses.find(item => item.id === presence?.primaryFocusId && item.status !== "DONE");
  const overnight = Boolean(task && task.boardDate < date && task.status === "IN_PROGRESS");
  const validPresence = presence && (presence.businessDate === date || overnight);
  const fallback = !validPresence ? tasks.find(item => item.status === "IN_PROGRESS") : null;
  const selected = validPresence ? task : fallback;
  const state = validPresence ? safeDispatchState(presence.state) : fallback ? "WORKING" : "UNKNOWN";
  const hasCurrent = state === "WORKING" || state === "BLOCKED";
  const updatedAt = validPresence ? presence.updatedAt : fallback?.updatedAt ?? null;
  return {
    ...person, state: hasCurrent && !selected && !focus ? "UNKNOWN" : state,
    title: hasCurrent ? selected?.title ?? (validPresence ? focus?.title : null) ?? null : null,
    taskId: hasCurrent ? selected?.id ?? null : null, focusId: hasCurrent && validPresence ? focus?.id ?? null : null,
    updatedAt, startedAt: validPresence ? presence.startedAt : null,
    overnight: Boolean(selected && selected.boardDate < date),
    updateNeeded: Boolean(updatedAt && state === "WORKING" && Date.parse(input.now) - Date.parse(updatedAt) > (input.freshnessMinutes ?? 60) * 60000),
    nextAction: validPresence ? presence.nextAction : "", version: presence?.version ?? 0, tasks, focuses,
  };
}
export function dispatchReportLink(date: string, personId: string, canReview: boolean) {
  return `/reports?${new URLSearchParams({ tab: canReview ? "Team Reports" : "My Reports", cadence: "DAILY", date, rangeMode: "day", ...(canReview ? { subject: personId } : {}) })}`;
}
