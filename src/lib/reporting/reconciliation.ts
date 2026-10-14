import type { ReportRow } from "./contracts";

export type TaskObservation = {
  row: ReportRow;
  taskId: string;
  parentTaskId?: string | null;
  boardDate: string;
};

// Only submitted evidence (and an explicitly labeled current-day overlay) can
// establish identity. Never reconstruct old outcomes from mutable task records.
export function reconcileReportTasks(observations: TaskObservation[]) {
  const parents = new Map<string, string | null | undefined>();
  const conflicts = new Set<string>();
  for (const item of observations) {
    if (item.parentTaskId === undefined) continue;
    if (parents.has(item.taskId) && parents.get(item.taskId) !== item.parentTaskId) conflicts.add(item.taskId);
    parents.set(item.taskId, item.parentTaskId);
  }
  const ids = new Set(observations.map(item => item.taskId));
  const unresolved = new Set<string>();
  function root(id: string) {
    let current = id;
    const seen = new Set<string>();
    for (let depth = 0; depth < 128; depth++) {
      if (seen.has(current) || conflicts.has(current)) { unresolved.add(id); return id; }
      seen.add(current);
      const parent = parents.get(current);
      if (parent === null) return current;
      if (parent === undefined || !ids.has(parent)) { unresolved.add(id); return current; }
      current = parent;
    }
    unresolved.add(id);
    return id;
  }
  const groups = new Map<string, { latest: TaskObservation; completedBefore: boolean; reopened: boolean }>();
  const sorted = [...observations].sort((a, b) => a.boardDate.localeCompare(b.boardDate) || a.taskId.localeCompare(b.taskId));
  for (const item of sorted) {
    const key = root(item.taskId), previous = groups.get(key);
    const completed = item.row.state === "COMPLETED";
    groups.set(key, { latest: item, completedBefore: completed || !!previous?.completedBefore,
      reopened: !completed && !!previous?.completedBefore });
  }
  const completed: ReportRow[] = [], carryover: ReportRow[] = [], reopened: ReportRow[] = [];
  for (const { latest, reopened: isReopened } of groups.values()) {
    const row = { ...latest.row, occurredAt: latest.boardDate };
    if (row.state === "COMPLETED") completed.push(row);
    else {
      carryover.push(row);
      if (isReopened) reopened.push({ ...row, detail: ["Observed open after an earlier completion.", row.detail].filter(Boolean).join(" ") });
    }
  }
  const order = (a: ReportRow, b: ReportRow) => a.id.localeCompare(b.id);
  return { completed: completed.sort(order), carryover: carryover.sort(order), reopened: reopened.sort(order), unresolvedLineageCount: unresolved.size };
}
