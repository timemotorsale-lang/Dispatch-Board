"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CalendarDetailDialog } from "./calendar-detail-dialog";

export type PersonalCalendar = { id: string; name: string };
export type PersonalEvent = { id: string; calendarId: string | null; title: string; startsAt: string; endsAt: string };
type PersonalSchedule = { calendars: PersonalCalendar[]; events: PersonalEvent[] };
export const personalCalendarKey = "personal";
const endpoint = "/api/appointments/personal-calendar";

export function usePersonalSchedule(start: string, end: string, enabled: boolean) {
  const key = new URLSearchParams({ start, end }).toString();
  const [result, setResult] = useState<{ key: string; data: PersonalSchedule | null }>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void fetch(`${endpoint}?${key}`, { cache: "no-store", signal: controller.signal })
      .then(async response => response.ok ? await response.json() as PersonalSchedule : null)
      .then(data => { if (!controller.signal.aborted) setResult({ key, data }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ key, data: null }); });
    return () => controller.abort();
  }, [enabled, key, revision]);

  return {
    calendars: result?.data?.calendars ?? [],
    events: result?.key === key ? result.data?.events ?? [] : [],
    loading: result?.key !== key,
    unavailable: result?.key === key && !result.data,
    refresh: () => setRevision(value => value + 1)
  };
}

export function PersonalCalendarEditor({ draft, calendars, onClose, onSaved, toIso }: {
  draft: { kind: "calendar" } | { kind: "event"; event?: PersonalEvent; date: string; time: string; duration: number; calendarId?: string };
  calendars: PersonalCalendar[];
  onClose: () => void;
  onSaved: (calendarId: string | null) => void;
  toIso: (date: string, time: string) => string;
}) {
  const event = draft.kind === "event" ? draft.event : undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const fields = new FormData(formEvent.currentTarget);
    const title = String(fields.get("title") ?? "");
    if (draft.kind === "calendar") {
      await submit("POST", { kind: "calendar", title });
      return;
    }
    try {
      const startsAt = toIso(String(fields.get("date")), String(fields.get("time")));
      const duration = Number(fields.get("duration"));
      if (!Number.isInteger(duration) || duration < 1 || duration > 1440) throw new Error("Enter a duration from 1 to 1,440 minutes.");
      await submit(event ? "PATCH" : "POST", {
        id: event?.id, title, calendarId: fields.get("calendarId") || null,
        startsAt, endsAt: new Date(Date.parse(startsAt) + duration * 60000).toISOString()
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Choose a valid date and time.");
    }
  }

  async function submit(method: string, body?: object) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(method === "DELETE" ? `${endpoint}?id=${encodeURIComponent(event!.id)}` : endpoint, {
        method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Unable to save the personal calendar.");
      onSaved(data?.calendar?.id ?? (body && "calendarId" in body ? body.calendarId as string | null : null));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save the personal calendar.");
    } finally {
      setBusy(false);
    }
  }

  return <CalendarDetailDialog onClose={() => { if (!busy) onClose(); }} onSubmit={formEvent => void save(formEvent)}>
    <header><strong>{draft.kind === "calendar" ? "New personal calendar" : event ? "Edit personal event" : "New personal event"}</strong><button type="button" disabled={busy} onClick={onClose}>Close</button></header>
    <div className="calendar-enterprise-draft-form">
      <p>Only you can see entries on your personal calendars.</p>
      <label>{draft.kind === "calendar" ? "Calendar name" : "Title"}<input autoFocus name="title" required maxLength={draft.kind === "calendar" ? 60 : 160} defaultValue={event?.title} /></label>
      {draft.kind === "event" && <>
        <label>Calendar<select name="calendarId" defaultValue={event?.calendarId ?? draft.calendarId ?? ""}><option value="">Personal</option>{calendars.map(calendar => <option key={calendar.id} value={calendar.id}>{calendar.name}</option>)}</select></label>
        <div className="calendar-enterprise-draft-row">
          <label>Date<input name="date" type="date" required defaultValue={draft.date} /></label>
          <label>Time (Central)<input name="time" type="time" required defaultValue={draft.time} /></label>
          <label>Duration (minutes)<input name="duration" type="number" min={1} max={1440} required defaultValue={draft.duration} /></label>
        </div>
      </>}
      {error && <p role="alert">{error}</p>}
      <footer>
        <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        {event && <button type="button" disabled={busy} onClick={() => confirmDelete ? void submit("DELETE") : setConfirmDelete(true)}>{confirmDelete ? "Confirm delete" : "Delete event"}</button>}
      </footer>
    </div>
  </CalendarDetailDialog>;
}
