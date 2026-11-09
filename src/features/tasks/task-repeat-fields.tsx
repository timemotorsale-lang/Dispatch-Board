import type { TaskRepeat } from "@/lib/calendar-task-repeat";
import styles from "./quick-calendar-task.module.css";

type RepeatChoice = "none" | "custom" | TaskRepeat["unit"];
export type TaskRepeatDraft = { choice: RepeatChoice; unit?: TaskRepeat["unit"]; every?: number; until?: string; weekdays?: number[] };
export const noTaskRepeat: TaskRepeatDraft = { choice: "none" };

export function toTaskRepeat(draft: TaskRepeatDraft): TaskRepeat | null {
  if (draft.choice === "none") return null;
  const custom = draft.choice === "custom";
  return {
    unit: custom ? draft.unit ?? "week" : draft.choice as TaskRepeat["unit"],
    every: custom ? draft.every ?? 1 : 1,
    ...(draft.until ? { until: draft.until } : {}),
    ...(custom && (draft.unit ?? "week") === "week" && draft.weekdays?.length ? { weekdays: draft.weekdays } : {})
  };
}

export function TaskRepeatFields({ date, draft, onChange, shared = false }: {
  date: string;
  draft: TaskRepeatDraft;
  onChange: (draft: TaskRepeatDraft) => void;
  shared?: boolean;
}) {
  const parsedDate = new Date(`${date}T12:00:00Z`);
  const valid = Number.isFinite(parsedDate.getTime());
  const weekday = valid ? new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(parsedDate) : null;
  const monthDay = valid ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(parsedDate) : null;
  const unit = draft.unit ?? "week";
  return <div className={styles.repeat}>
    <label>Repeat<select value={draft.choice} onChange={event => onChange({ ...draft, choice: event.target.value as RepeatChoice })}>
      <option value="none">Does not repeat</option><option value="day">Daily</option>
      <option value="week">{weekday ? `Weekly on ${weekday}` : "Weekly"}</option>
      <option value="month">{valid ? `Monthly on day ${parsedDate.getUTCDate()}` : "Monthly"}</option>
      <option value="year">{monthDay ? `Annually on ${monthDay}` : "Annually"}</option>
      <option value="custom">Custom</option>
    </select></label>
    {draft.choice === "custom" && <>
      <div className={styles.row}>
        <label>Repeat every<input type="number" min={1} max={12} value={draft.every ?? 1} onChange={event => onChange({ ...draft, every: Number(event.target.value) })} required /></label>
        <label>Interval<select value={unit} onChange={event => onChange({ ...draft, unit: event.target.value as TaskRepeat["unit"] })}>
          <option value="day">Days</option><option value="week">Weeks</option><option value="month">Months</option><option value="year">Years</option>
        </select></label>
      </div>
      {unit === "week" && <fieldset className={styles.weekdays}><legend>Repeat on (optional)</legend>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => <label key={day}><input type="checkbox" checked={draft.weekdays?.includes(index) ?? false} onChange={event => onChange({
          ...draft, weekdays: event.target.checked ? [...(draft.weekdays ?? []), index] : (draft.weekdays ?? []).filter(value => value !== index)
        })} />{day}</label>)}
      </fieldset>}
    </>}
    {draft.choice !== "none" && (shared || draft.choice === "custom") && <label>End date{shared ? " (required)" : " (optional)"}<input type="date" min={date || undefined} value={draft.until ?? ""} onChange={event => onChange({ ...draft, until: event.target.value })} required={shared} /></label>}
    {shared && draft.choice !== "none" && <small>Creates up to 60 separate Dispatch tasks through the end date. Each is completed independently.</small>}
  </div>;
}
