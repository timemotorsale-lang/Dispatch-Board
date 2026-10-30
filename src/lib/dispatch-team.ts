export type DispatchState = "WORKING" | "AVAILABLE" | "BLOCKED" | "OFF_DUTY" | "UNKNOWN";
export const dispatchStateLabel: Record<DispatchState, string> = {
  WORKING: "Working", AVAILABLE: "Available", BLOCKED: "Blocked", OFF_DUTY: "Off duty", UNKNOWN: "No current update",
};
export type TeamTask = {
  id: string; title: string; status: string; assignedUserId: string; ownerUserId: string | null;
  updatedAt: string; boardDate: string; blockerReason: string | null; isClaimable: boolean;
  workflowArea?: string; carryoverSourceTaskId?: string | null;
};
export type TeamFocus = { id: string; title: string; status: string; taskId: string | null; businessDate: string; updatedAt?: string };
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
  unassigned: TeamTask[]; limitation: string | null; timezone?: string;
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
  const { person, focuses, date, presence } = input;
  const tasks = input.tasks.filter(item => item.assignedUserId === person.id && !item.isClaimable);
  const task = tasks.find(item => item.id === presence?.primaryTaskId && item.status !== "COMPLETED");
  const focus = focuses.find(item => item.id === presence?.primaryFocusId && item.status !== "DONE" && item.businessDate === date);
  const overnight = Boolean(task && task.boardDate < date && task.status === "IN_PROGRESS");
  const currentPresence = presence && (presence.businessDate === date || overnight) ? presence : null;
  const recordedState = currentPresence ? safeDispatchState(currentPresence.state) : "UNKNOWN";
  const manualFocus = currentPresence && !currentPresence.primaryTaskId && focus && ["WORKING", "BLOCKED"].includes(recordedState) ? focus : null;
  const active = tasks.find(item => item.status === "IN_PROGRESS");
  const waiting = tasks.find(item => ["BLOCKED", "WAITING_ON_PARTS", "WAITING_ON_APPROVAL"].includes(item.status));
  // Explicit availability and a just-accepted handoff are not inferred starts.
  const explicit = currentPresence && !currentPresence.primaryTaskId && !manualFocus && ["AVAILABLE", "OFF_DUTY", "UNKNOWN"].includes(recordedState);
  const newerWork = active && currentPresence && ["AVAILABLE", "OFF_DUTY"].includes(recordedState) && Date.parse(active.updatedAt) > Date.parse(currentPresence.updatedAt);
  const selected = task?.status === "IN_PROGRESS" ? task
    : manualFocus || explicit && !newerWork ? null
    : active ?? task ?? waiting ?? null;
  const state: DispatchState = selected ? selected.status === "IN_PROGRESS" ? "WORKING"
    : ["BLOCKED", "WAITING_ON_PARTS", "WAITING_ON_APPROVAL"].includes(selected.status) ? "BLOCKED" : "UNKNOWN"
    : manualFocus ? recordedState : explicit ? recordedState : "UNKNOWN";
  const hasCurrent = state === "WORKING" || state === "BLOCKED";
  const dates = [selected?.updatedAt, manualFocus?.updatedAt, currentPresence?.updatedAt,
    ...focuses.filter(item => item.businessDate === date).map(item => item.updatedAt)].filter((value): value is string => Boolean(value));
  const updatedAt = dates.sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
  return {
    ...person, state, title: hasCurrent ? selected?.title ?? manualFocus?.title ?? null : null,
    taskId: hasCurrent ? selected?.id ?? null : null, focusId: manualFocus?.id ?? null,
    updatedAt, startedAt: selected?.id === currentPresence?.primaryTaskId ? currentPresence?.startedAt ?? null : manualFocus ? currentPresence?.startedAt ?? null : null,
    overnight: Boolean(selected?.status === "IN_PROGRESS" && selected.boardDate < date),
    updateNeeded: Boolean(updatedAt && state === "WORKING" && Date.parse(input.now) - Date.parse(updatedAt) > (input.freshnessMinutes ?? 60) * 60000),
    nextAction: selected ? selected.blockerReason ?? "" : manualFocus || explicit ? currentPresence?.nextAction ?? "" : "",
    version: presence?.version ?? 0, tasks, focuses,
  };
}
export function dispatchReportLink(date: string, personId: string, canReview: boolean) {
  return `/reports?${new URLSearchParams({ tab: canReview ? "Team Reports" : "My Reports", cadence: "DAILY", date, rangeMode: "day", ...(canReview ? { subject: personId } : {}) })}`;
}
