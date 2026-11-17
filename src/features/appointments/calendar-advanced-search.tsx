import { validFlowDate } from "@/features/advisor/workbook-flow-dates";
import { CalendarDetailDialog } from "./calendar-detail-dialog";
import styles from "./calendar-workspace.module.css";
import { useState, type FormEvent } from "react";

export const calendarSearchScopes = ["active", "all", "appointments", "tasks", "personal"] as const;
export type CalendarSearchScope = typeof calendarSearchScopes[number];
export type CalendarSearchFilters = {
  scope: CalendarSearchScope;
  what: string;
  who: string;
  where: string;
  exclude: string;
  from: string;
  to: string;
};

function words(value: string) {
  return value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function matchesAdvancedCalendarSearch(filters: CalendarSearchFilters, fields: {
  keywords: Array<string | null | undefined>;
  people: Array<string | null | undefined>;
  places: Array<string | null | undefined>;
}) {
  const includes = (text: string, values: Array<string | null | undefined>) => {
    const haystack = values.filter(Boolean).join(" ").toLowerCase();
    return words(text).every(word => haystack.includes(word));
  };
  const keywords = fields.keywords.filter(Boolean).join(" ").toLowerCase();
  return includes(filters.what, fields.keywords) && includes(filters.who, fields.people)
    && includes(filters.where, fields.places) && !words(filters.exclude).some(word => keywords.includes(word));
}

export function validCalendarSearchDates(from: string, to: string) {
  return validFlowDate(from) && validFlowDate(to) && to >= from && Date.parse(to) - Date.parse(from) < 42 * 86400000;
}

export function CalendarAdvancedSearch({ initial, onClose, onSearch }: {
  initial: CalendarSearchFilters;
  onClose: () => void;
  onSearch: (filters: CalendarSearchFilters) => void;
}) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const read = (name: string) => String(data.get(name) ?? "").trim();
    const scope = calendarSearchScopes.find(item => item === read("scope")) ?? "active";
    const from = read("from"), to = read("to");
    if (!validCalendarSearchDates(from, to)) {
      setError("Choose an ordered date range of up to 42 days.");
      return;
    }
    onSearch({ scope, from, to, what: read("what"), who: read("who"), where: read("where"), exclude: read("exclude") });
  }

  return <CalendarDetailDialog onClose={onClose} onSubmit={submit}>
    <header><strong>Advanced calendar search</strong><button type="button" onClick={onClose}>Close</button></header>
    <div className={styles.advancedSearch}>
      <label>Search in<select name="scope" defaultValue={initial.scope}>
        <option value="active">Active calendars and filters</option>
        <option value="all">All my calendar sources</option>
        <option value="appointments">Company appointments</option>
        <option value="tasks">My tasks</option>
        <option value="personal">Private events</option>
      </select></label>
      <label>What<input name="what" autoFocus defaultValue={initial.what} maxLength={100} placeholder="Title, category, team, or list" /></label>
      <label>Who<input name="who" defaultValue={initial.who} maxLength={100} placeholder="Customer, participant, or staff" /></label>
      <label>Where<input name="where" defaultValue={initial.where} maxLength={100} placeholder="Appointment location or resource" /></label>
      <label>Doesn’t have<input name="exclude" defaultValue={initial.exclude} maxLength={100} placeholder="Exclude keywords" /></label>
      <div className={styles.searchDates}>
        <label>From<input name="from" type="date" defaultValue={initial.from} required /></label>
        <label>Through<input name="to" type="date" defaultValue={initial.to} required /></label>
      </div>
      {error && <p role="alert">{error}</p>}
      <footer><button type="button" onClick={event => {
        const form = event.currentTarget.form;
        if (!form) return;
        for (const name of ["what", "who", "where", "exclude"]) {
          const field = form.elements.namedItem(name);
          if (field instanceof HTMLInputElement) field.value = "";
        }
        const scope = form.elements.namedItem("scope");
        if (scope instanceof HTMLSelectElement) scope.value = "active";
        const from = form.elements.namedItem("from");
        const to = form.elements.namedItem("to");
        if (from instanceof HTMLInputElement) from.value = initial.from;
        if (to instanceof HTMLInputElement) to.value = initial.to;
        setError("");
      }}>Reset</button><button className="primary" type="submit">Search</button></footer>
    </div>
  </CalendarDetailDialog>;
}
