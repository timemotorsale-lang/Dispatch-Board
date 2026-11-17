"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CalendarDetailDialog } from "@/features/appointments/calendar-detail-dialog";
import { validateDispatchTaskRepeat, type TaskRepeat } from "@/lib/calendar-task-repeat";
import { noTaskRepeat, TaskRepeatFields, toTaskRepeat } from "./task-repeat-fields";
import styles from "./quick-calendar-task.module.css";

export type CalendarTask = {
  id: string;
  title: string;
  notes?: string;
  scope: "personal" | "dispatch";
  localDate: string | null;
  localTime: string | null;
  completed: boolean;
  canComplete?: boolean;
  workflowArea?: string;
  workType?: string | null;
  creatorName?: string;
  listId?: string | null;
  seriesId?: string;
  repeat?: TaskRepeat | null;
  repeatEnded?: boolean;
  canStopDispatchRepeat?: boolean;
  deadline?: string | null;
  starredAt?: string | null;
  archivedAt?: string | null;
  position?: number;
};

export type PersonalTaskList = { id: string; name: string };
type TaskOwner = { id: string; name: string };
type SavedCalendarTask = { id: string; title: string; taskCount?: number; ongoing?: boolean };
const endpoint = "/api/tasks/calendar";
export const calendarTaskTeams = [
  ["GENERAL_MANAGER", "General / Management"], ["SALES", "Sales"], ["SHOP", "Shop / Recon"],
  ["SERVICE_ADVISOR", "Service Advisor"], ["INVENTORY", "Inventory"], ["ADMIN", "Administration"],
  ["COLLECTIONS", "Collections"], ["MARKETING", "Marketing"], ["ADVERTISING", "Advertising"]
] as const;
const teams = calendarTaskTeams;
const times = Array.from({ length: 48 }, (_, index) =>
  `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`
);

export function useCalendarTasks(query: string, enabled: boolean) {
  const [result, setResult] = useState<{ query: string; tasks: CalendarTask[] | null; lists?: PersonalTaskList[] }>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void fetch(`${endpoint}?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => response.ok ? await response.json() as { tasks: CalendarTask[]; lists: PersonalTaskList[] } : null)
      .then(data => { if (!controller.signal.aborted) setResult({ query, tasks: data?.tasks ?? null, lists: data?.lists }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ query, tasks: null }); });
    return () => controller.abort();
  }, [enabled, query, revision]);
  const active = result?.query === query ? result : undefined;
  return { tasks: active?.tasks ?? [], lists: active?.lists ?? [], loading: !active, unavailable: active?.tasks === null, refresh: () => setRevision(value => value + 1) };
}

export function QuickCalendarTaskDialog({ date, time, defaultScope = "dispatch", defaultTeam, defaultOwnerId, ownerOptions, lists, defaultListId, onClose, onSaved }: {
  date: string;
  time?: string;
  defaultScope?: CalendarTask["scope"];
  defaultTeam?: string;
  defaultOwnerId?: string;
  ownerOptions?: TaskOwner[];
  lists?: PersonalTaskList[];
  defaultListId?: string;
  onClose: () => void;
  onSaved: (task: { id: string; title: string; scope: CalendarTask["scope"]; localDate: string | null }) => void;
}) {
  const [scope, setScope] = useState(defaultScope);
  const [when, setWhen] = useState<"timed" | "day" | "none">(time ? "timed" : "day");
  const [selectedDate, setSelectedDate] = useState(date);
  const [clockChoice, setClockChoice] = useState(time && !times.includes(time) ? "custom" : time ?? "09:00");
  const [repeatDraft, setRepeatDraft] = useState(noTaskRepeat);
  const [availableLists, setAvailableLists] = useState<PersonalTaskList[]>([]);
  const [staff, setStaff] = useState<TaskOwner[]>([]);
  const [saved, setSaved] = useState<SavedCalendarTask | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirmation = useRef<HTMLParagraphElement>(null);
  const submission = useRef<{ requestId: string; fingerprint: string } | null>(null);
  const inFlight = useRef(false);
  const repeat = when === "none" ? null : toTaskRepeat(repeatDraft);
  const noEnd = scope === "dispatch" && !!repeat && repeatDraft.noEnd === true;
  const repeatPlan = scope === "dispatch" && repeat && !noEnd ? validateDispatchTaskRepeat(selectedDate, repeat) : null;
  useEffect(() => {
    if (saved) confirmation.current?.focus();
  }, [saved]);
  useEffect(() => {
    if (scope !== "personal" || lists) return;
    const controller = new AbortController();
    void fetch(`${endpoint}?lists=1`, { signal: controller.signal, cache: "no-store" })
      .then(async response => response.ok ? (await response.json() as { lists: PersonalTaskList[] }).lists : [])
      .then(options => { if (!controller.signal.aborted) setAvailableLists(options); })
      .catch(() => {});
    return () => controller.abort();
  }, [scope, lists]);

  useEffect(() => {
    if (scope !== "dispatch" || ownerOptions) return;
    const controller = new AbortController();
    void fetch(`${endpoint}?staff=1`, { signal: controller.signal, cache: "no-store" })
      .then(async response => response.ok ? (await response.json() as { staff: TaskOwner[] }).staff : [])
      .then(options => { if (!controller.signal.aborted) setStaff(options); })
      .catch(() => {});
    return () => controller.abort();
  }, [scope, ownerOptions]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || saved) return;
    const fields = new FormData(event.currentTarget);
    const context = fields.get("operatingContext");
    const notes = String(fields.get("notes") ?? "");
    const input = {
      scope, title: String(fields.get("title") ?? "").trim(), notes: context ? [notes, `Context: ${context}`].filter(Boolean).join("\n\n") : notes,
      localDate: when === "none" ? null : String(fields.get("date") ?? ""),
      localTime: when === "timed" ? clockChoice === "custom" ? String(fields.get("time") ?? "") : clockChoice : null,
      assignedUserId: fields.get("owner"), workflowArea: fields.get("team"),
      listId: fields.get("listId") || null, deadline: fields.get("deadline") || null, repeat, noEnd,
      customerReference: fields.get("customerReference") || undefined,
      vehicleReference: fields.get("vehicleReference") || undefined
    };
    if (!input.title) { setError("Enter a task title."); return; }
    if (repeatPlan?.error) { setError(repeatPlan.error); return; }
    const fingerprint = JSON.stringify(input);
    if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, requestId: crypto.randomUUID() };
    inFlight.current = true;
    setBusy(true);
    setError("");
    let savedTask: SavedCalendarTask;
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, requestId: submission.current.requestId })
      });
      const data = await response.json().catch(() => null);
      if (response.status >= 500) throw new Error("Missing save confirmation.");
      if (!response.ok) {
        setError(data?.error ?? "The server rejected the save. Check your details and try again.");
        return;
      }
      if (!data?.task?.id) throw new Error("Missing save confirmation.");
      savedTask = { ...data.task, taskCount: data.taskCount, ongoing: data.ongoing };
      setSaved(savedTask);
    } catch {
      setError("No save confirmation received. Check the calendar before retrying to avoid a duplicate.");
      return;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
    onSaved({ id: savedTask.id, title: savedTask.title, scope, localDate: input.localDate });
  }

  return <CalendarDetailDialog onClose={() => { if (!busy) onClose(); }} onSubmit={event => void save(event)}>
    <header><strong>{saved ? "Task saved" : "New task"}</strong><button type="button" onClick={onClose} disabled={busy}>Close</button></header>
    {saved ? <div className={styles.form}>
      <p className={styles.confirmation} ref={confirmation} role="status" tabIndex={-1}>{saved.ongoing
        ? `Ongoing schedule saved for “${saved.title}”. Created ${saved.taskCount} so far; more will be added automatically.`
        : saved.taskCount ? `Saved ${saved.taskCount} Dispatch tasks for “${saved.title}”.` : `“${saved.title}” was saved.`}</p>
      <Link href={scope === "dispatch" ? `/tasks/${encodeURIComponent(saved.id)}` : "/my-tasks?personal=1"}>{saved.taskCount ? "Open first task" : "Open saved task"}</Link>
      {saved.ongoing && <p>To stop the schedule, open its first task on the calendar.</p>}
    </div> : <div className={styles.form} onChange={() => { if (error) setError(""); }}>
      <label>Title<input autoFocus name="title" required maxLength={160} placeholder="What needs to be done?" /></label>
      <label>List<select value={scope} onChange={event => {
        const next = event.target.value === "dispatch" ? "dispatch" : "personal";
        setScope(next);
        setRepeatDraft(draft => ({ ...draft, noEnd: false }));
        if (next === "dispatch" && when === "none") setWhen("day");
      }}>
        <option value="dispatch">Dispatch Board · Shared work</option>
        <option value="personal">Personal · Only me</option>
      </select></label>
      <div className={styles.row}>
        <label>{scope === "dispatch" ? "Due" : "When"}<select value={when} onChange={event => setWhen(event.target.value as typeof when)}>
          <option value="day">All day</option><option value="timed">At a time</option>
          {scope === "personal" && <option value="none">No date</option>}
        </select></label>
        {when !== "none" && <label>Date<input name="date" type="date" required value={selectedDate} onChange={event => setSelectedDate(event.target.value)} /></label>}
        {when === "timed" && <label>Time (Central)<select value={clockChoice} onChange={event => setClockChoice(event.target.value)}>
          {times.map(option => <option key={option} value={option}>{formatTaskClock(option)}</option>)}
          <option value="custom">Custom time</option>
        </select></label>}
        {when === "timed" && clockChoice === "custom" && <label>Exact time<input name="time" type="time" required defaultValue={time ?? "09:00"} /></label>}
      </div>
      {scope === "personal" && <label>Personal list<select name="listId" defaultValue={defaultListId ?? ""}><option value="">Personal</option>
          {(lists ?? availableLists).map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
        </select></label>}
      {when !== "none" && <TaskRepeatFields date={selectedDate} draft={repeatDraft} onChange={setRepeatDraft} shared={scope === "dispatch"} allowNoEnd />}
      {repeatPlan?.dates && <p role="status">This schedule will create {repeatPlan.dates.length} Dispatch tasks.</p>}
      {repeatDraft.until && repeatPlan?.error && <p className={styles.saveError}>{repeatPlan.error}</p>}
      {scope === "dispatch" && <div className={styles.row}>
        <label>Team<select name="team" defaultValue={defaultTeam ?? teams[0][0]}>{teams.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Assign to<select name="owner" defaultValue={defaultOwnerId ?? ""}><option value="">Me</option>{(ownerOptions ?? staff).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
      </div>}
      <label>Notes <span>(optional)</span><textarea name="notes" rows={3} maxLength={4000} /></label>
      <details className={styles.extra}><summary>{scope === "dispatch" ? "Add work context" : "More options"}</summary>
        {scope === "personal" ? <label>Deadline (optional)<input name="deadline" type="date" /></label> : <>
          <div className={styles.row}>
            <label>Customer reference<input name="customerReference" maxLength={160} placeholder="Customer name or record number" /></label>
            <label>Vehicle reference<input name="vehicleReference" maxLength={160} placeholder="Stock number or VIN" /></label>
          </div>
          <label>Operating context<textarea name="operatingContext" rows={2} maxLength={1000} placeholder="Example: All overdue titles for this month" /></label>
        </>}
      </details>
      <footer className={styles.saveFooter}>
        {error && <p className={styles.saveError} role="alert">{error.startsWith("No save confirmation") ? error : `Task not saved. ${error}`}</p>}
        {busy && <p role="status">Saving your task. Please wait.</p>}
        <button className="primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save task"}</button>
      </footer>
    </div>}
  </CalendarDetailDialog>;
}

export function formatTaskClock(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

export function CalendarTaskDetails({ task, onClose, onChanged }: {
  task: CalendarTask;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(task.completed);
  const [repeatStopped, setRepeatStopped] = useState(false);
  async function changeStatus() {
    if (busy) return;
    setBusy(true);
    setError("");
    const next = !completed;
    try {
      const response = await fetch(task.scope === "personal" ? endpoint : `/api/tasks/${encodeURIComponent(task.id)}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task.scope === "personal"
          ? { id: task.seriesId ?? task.id, completed: next, occurrence: task.seriesId ? task.localDate : undefined }
          : { status: "COMPLETED" })
      });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Unable to update this task.");
      setCompleted(next);
      onChanged();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to update this task.");
    } finally {
      setBusy(false);
    }
  }
  async function stopRepeat() {
    if (busy || !task.seriesId || !window.confirm("End the repeat schedule after this occurrence?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stopRepeat", id: task.seriesId, occurrence: task.localDate })
      });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Unable to end the repeat schedule.");
      setRepeatStopped(true);
      onChanged();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to end the repeat schedule.");
    } finally {
      setBusy(false);
    }
  }
  async function stopDispatchRepeat() {
    if (busy || !window.confirm("Stop creating new tasks for this schedule? Tasks already created will stay.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stopDispatchRepeat", id: task.id })
      });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Unable to stop the schedule.");
      setRepeatStopped(true);
      onChanged();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to stop the schedule.");
    } finally {
      setBusy(false);
    }
  }
  return <CalendarDetailDialog onClose={onClose} onSubmit={event => event.preventDefault()}>
    <header><strong>{task.title}</strong><button type="button" onClick={onClose}>Close</button></header>
    <div className={styles.form}>
      <p>{task.scope === "personal" ? "Personal · Only me" : "Dispatch Board"}{task.localDate ? ` · ${task.localDate}` : ""}{task.localTime ? ` · ${task.localTime} Central` : ""}</p>
      {task.notes && <p>{task.notes}</p>}
      {task.repeat && <p>{repeatStopped ? "Repeat schedule ends after this occurrence." : task.repeatEnded ? "Repeat schedule ended" : "Repeating task · completion applies to this date"}</p>}
      {task.seriesId && !repeatStopped && task.repeat?.until !== task.localDate && <button type="button" disabled={busy} onClick={() => void stopRepeat()}>End repeat after this date</button>}
      {task.canStopDispatchRepeat && (repeatStopped
        ? <p role="status">Schedule stopped. Tasks already created will stay.</p>
        : <button type="button" disabled={busy} onClick={() => void stopDispatchRepeat()}>Stop creating new tasks</button>)}
      {task.deadline && <p>Deadline {task.deadline}</p>}
      <label className={styles.checkbox}><input type="checkbox" checked={completed} disabled={busy || task.repeatEnded || (task.scope === "dispatch" && (completed || !task.canComplete))} onChange={() => void changeStatus()} /> Completed</label>
      {error && <p role="alert">{error}</p>}
      {task.scope === "dispatch" && <Link href={`/tasks/${encodeURIComponent(task.id)}`}>Open in Tasks</Link>}
    </div>
  </CalendarDetailDialog>;
}
