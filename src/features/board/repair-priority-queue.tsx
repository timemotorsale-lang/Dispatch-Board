"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

const endpoint = "/api/dispatch/repair-priorities";
const statuses = { READY: "Ready", IN_PROGRESS: "In progress", BLOCKED: "Blocked", DONE: "Done" };
const priorities = ["", "High", "Normal", "Low"];
const locationTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "short", timeStyle: "short", timeZone: "America/Chicago"
});

type RepairRow = {
  id: string;
  version: number;
  summary: string;
  vehicle: string;
  planDate: string;
  priority: number;
  status: keyof typeof statuses;
  nextAction: string;
  blocker: string;
  durationMinutes: number | null;
  ownerUserId: string | null;
  sourceHref: string | null;
  task: { id: string; status: string; dueAt: string } | null;
  appointment: { appointmentNumber: string; bookingStatus: string; startsAt: string | null } | null;
};

type Queue = {
  date: string;
  today: string;
  viewerId: string;
  canPlan: boolean;
  staff: { id: string; name: string }[];
  rows: RepairRow[];
};

export function RepairPriorityQueue({ initialDate, initialToday, fixedDate, linkRow, linkAppointment }: {
  initialDate: string;
  initialToday: string;
  fixedDate: boolean;
  linkRow?: string;
  linkAppointment?: string;
}) {
  const [selectedDate, setSelectedDate] = useState(fixedDate ? initialDate : "");
  const [queue, setQueue] = useState<Queue | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [carriedTo, setCarriedTo] = useState("");
  const [resolveHandoff, setResolveHandoff] = useState(Boolean(linkRow && linkAppointment));
  const date = selectedDate || queue?.date || initialDate;

  useEffect(() => {
    const onRefresh = () => setRefresh((value) => value + 1);
    const timer = window.setInterval(onRefresh, 30_000);
    window.addEventListener("focus", onRefresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onRefresh);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (selectedDate) params.set("date", selectedDate);
    if (resolveHandoff && linkRow) params.set("linkRow", linkRow);
    const url = params.size ? `${endpoint}?${params}` : endpoint;
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        if (!controller.signal.aborted) {
          setError("");
          setQueue(payload);
          if (resolveHandoff) {
            setSelectedDate(payload.date);
          }
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setQueue(null);
          setError(reason.message);
        }
      });
    return () => controller.abort();
  }, [selectedDate, refresh, resolveHandoff, linkRow]);

  return (
    <section className="page-stack">
      <header>
        <h1>{date === (queue?.today ?? initialToday) ? "Today’s Daily Priorities" : "Daily Priorities"}</h1>
        <p>See what your location team has shared for this day. Unfinished priorities move to another day only when someone carries them forward.</p>
        <Link href={`/board?date=${date}`}>Dispatch Board</Link>
        {" · "}
        <Link href={`/appointments?view=calendar&localDate=${date}`}>Appointment calendar</Link>
      </header>
      <div>
        <label>Plan date <input type="date" value={date} onChange={(event) => {
          if (event.target.value) {
            setSelectedDate(event.target.value);
            setResolveHandoff(false);
            setCarriedTo("");
          }
        }} /></label>
        {" "}
        <button onClick={() => {
          setSelectedDate("");
          setResolveHandoff(false);
          setCarriedTo("");
          setRefresh((value) => value + 1);
        }} type="button">Today</button>
        {" "}
        <button onClick={() => setRefresh((value) => value + 1)} type="button">Refresh</button>
      </div>
      {carriedTo && <p role="status">Priority carried forward. <Link href={`/board/repair-priorities?date=${carriedTo}`}>Open {carriedTo}</Link></p>}
      {error ? <p role="alert">{error}</p> : !queue || queue.date !== date ? <p>Loading Daily Priorities…</p> :
        queue.rows.length ? queue.rows.map((row) => (
          <RepairCard
            key={`${row.id}:${row.version}`}
            row={row}
            queue={queue}
            proposedAppointment={linkRow === row.id ? linkAppointment : undefined}
            onSave={(carriedDate) => {
              if (carriedDate) setCarriedTo(carriedDate);
              setRefresh((value) => value + 1);
            }}
          />
        )) : <p>No priorities have been published for this date.</p>}
    </section>
  );
}

function RepairCard({ row, queue, proposedAppointment, onSave }: {
  row: RepairRow;
  queue: Queue;
  proposedAppointment?: string;
  onSave: (carriedDate?: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const owner = queue.staff.find((staff) => staff.id === row.ownerUserId);
  const canEdit = queue.canPlan || queue.viewerId === row.ownerUserId;
  const open = row.status !== "DONE" && row.task?.status !== "COMPLETED";
  const canClaim = open && row.planDate === queue.today && row.status === "READY" && !row.ownerUserId;
  const canCarry = open && (canEdit || Boolean(row.sourceHref));
  const followingDay = new Date(`${row.planDate}T00:00:00Z`);
  followingDay.setUTCDate(followingDay.getUTCDate() + 1);
  const nextDate = followingDay.toISOString().slice(0, 10);
  const firstCarryDate = nextDate > queue.today ? nextDate : queue.today;
  const returnTo = `/board/repair-priorities?${new URLSearchParams({ date: queue.date, linkRow: row.id })}`;
  const schedule = new URLSearchParams({
    action: "new", purpose: "repair", localDate: queue.date,
    vehicleReference: row.vehicle, reason: row.summary.slice(0, 500), returnTo
  });
  if (row.durationMinutes) schedule.set("durationMinutes", String(row.durationMinutes));
  if (row.task) schedule.set("sourceTask", row.task.id);
  const activeAppointment = row.appointment && row.appointment.bookingStatus !== "CANCELLED";

  async function send(action: "save" | "claim" | "carry", details: object = {}) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...details, action, id: row.id, version: row.version
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      onSave(action === "carry" ? payload.date : undefined);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update this priority.");
    } finally {
      setBusy(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const duration = form.get("durationMinutes");
    void send("save", {
      ...Object.fromEntries(form), priority: Number(form.get("priority")),
      durationMinutes: duration ? Number(duration) : null
    });
  }

  return (
    <article className="panel-card page-stack">
      <header>
        <h2>{row.vehicle ? `${row.vehicle} · ` : ""}{row.summary}</h2>
        <p>{priorities[row.priority]} priority · {owner?.name ?? (row.ownerUserId ? "Inactive owner" : "Unassigned")} · {row.task?.status === "COMPLETED" ? "Done" : statuses[row.status]} · {row.planDate}{row.durationMinutes ? ` · ${row.durationMinutes} min` : ""}</p>
        {row.nextAction && <p><strong>Next action</strong> · {row.nextAction}</p>}
        {row.blocker && row.status === "BLOCKED" && <p><strong>Blocker</strong> · {row.blocker}</p>}
        {row.task && <p><Link href={`/tasks/${encodeURIComponent(row.task.id)}`}>Open linked task</Link> · {row.task.status.toLowerCase().replaceAll("_", " ")} · Due {locationTime.format(new Date(row.task.dueAt))}</p>}
        {row.appointment ? (
          <p><Link href={`/appointments?view=board&appointment=${encodeURIComponent(row.appointment.appointmentNumber)}`}>{row.appointment.appointmentNumber}</Link>
            {" · "}{row.appointment.bookingStatus.toLowerCase()}
            {row.appointment.startsAt && ` · ${locationTime.format(new Date(row.appointment.startsAt))}`}
          </p>
        ) : <p>Unscheduled</p>}
      </header>
      {row.sourceHref && <Link href={row.sourceHref}>Open originating checklist item</Link>}
      {canClaim && <button disabled={busy} onClick={() => void send("claim")} type="button">Claim priority</button>}
      {canCarry && <details>
        <summary>Carry forward</summary>
        <form onSubmit={(event) => {
          event.preventDefault();
          void send("carry", { planDate: new FormData(event.currentTarget).get("planDate") });
        }}>
          <label>New plan date <input type="date" name="planDate" defaultValue={firstCarryDate} min={firstCarryDate} required /></label>
          <button disabled={busy} type="submit">Move priority</button>
        </form>
      </details>}
      {queue.canPlan && row.status === "READY" && !activeAppointment && row.task?.status !== "COMPLETED" &&
        <Link href={`/appointments?${schedule}`}>Plan appointment</Link>}
      {canEdit && (
        <details open={proposedAppointment && proposedAppointment !== row.appointment?.appointmentNumber ? true : undefined}>
          <summary>{queue.canPlan ? "Edit plan or link work" : "Update progress"}</summary>
          <form className="page-stack" onSubmit={save}>
            <fieldset className="repair-priority-fields" disabled={busy}>
              {queue.canPlan && <>
                <label>Priority summary <textarea name="summary" defaultValue={row.summary} maxLength={5000} required /></label>
                <label>Vehicle <input name="vehicle" defaultValue={row.vehicle} maxLength={250} /></label>
                <label>Priority <select name="priority" defaultValue={row.priority}>
                  {priorities.slice(1).map((priority, index) => <option key={priority} value={index + 1}>{priority}</option>)}
                </select></label>
                <label>Owner <select name="ownerUserId" defaultValue={row.ownerUserId ?? ""}>
                  <option value="">Unassigned</option>
                  {row.ownerUserId && !owner && <option value={row.ownerUserId}>Inactive owner</option>}
                  {queue.staff.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
                </select></label>
                <label>Estimated minutes <input name="durationMinutes" type="number" min={5} max={1440} defaultValue={row.durationMinutes ?? ""} /></label>
                <label>Existing task ID <input name="taskId" defaultValue={row.task?.id ?? ""} maxLength={120} /></label>
                <label>Appointment number <input name="appointmentNumber" defaultValue={proposedAppointment ?? row.appointment?.appointmentNumber ?? ""} maxLength={120} /></label>
              </>}
              <label>Status <select name="status" defaultValue={row.status}>
                {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select></label>
              <label>Next action <input name="nextAction" defaultValue={row.nextAction} maxLength={500} /></label>
              <label>Blocker <input name="blocker" defaultValue={row.blocker} maxLength={500} /></label>
            </fieldset>
            <button disabled={busy} type="submit">{busy ? "Saving…" : "Save priority"}</button>
          </form>
        </details>
      )}
      {notice && <p role="alert">{notice}</p>}
    </article>
  );
}
