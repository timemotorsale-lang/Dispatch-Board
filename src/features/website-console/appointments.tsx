"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppointmentCalendarPreview } from "../../../packages/appointment-preview/calendar";
import styles from "./appointments.module.css";

type CalendarRow = { id: string; appointmentNumber: string; title: string; startsAt: string | null; endsAt: string | null; bookingStatus: string; confirmationStatus: string; ownerName: string };
type CalendarSnapshot = { date: string; timezone: string; source: "SHARED_STAFF_CALENDAR"; readOnly: true; websiteIntakeConnected: false; truncated: boolean; rows: CalendarRow[] };

export function WebsiteAppointments({ initialDate, previewUrl }: { initialDate: string; previewUrl: string | null }) {
  const [mode, setMode] = useState<"setup" | "demo" | "shared">("setup");
  const [date, setDate] = useState(initialDate);
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<CalendarSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function refreshCalendar(nextDate = date) {
    setSnapshot(null); setError(""); setLoading(true); setDate(nextDate); setRevision(current => current + 1);
  }

  useEffect(() => {
    if (mode !== "shared") return;
    const controller = new AbortController();
    void fetch(`/api/website-console/appointments?date=${encodeURIComponent(date)}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load the shared calendar.");
      if (!Array.isArray(result.rows) || result.source !== "SHARED_STAFF_CALENDAR" || result.date !== date) throw new Error("The calendar returned an unexpected response. No schedule is shown.");
      if (!controller.signal.aborted) setSnapshot(result);
    }).catch(problem => { if (!controller.signal.aborted) setError(problem instanceof Error ? problem.message : "Unable to load the shared calendar."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [mode, date, revision]);

  return <section className={styles.workspace} aria-labelledby="website-appointments">
    <header><p className={styles.eyebrow}>One scheduling authority · two experiences</p><h2 id="website-appointments">Appointments</h2><p>A customer preview, a private staff workspace and the existing appointment backend—not two calendars to merge later.</p></header>
    <div className={styles.modes} aria-label="Appointment workspace views">{[["setup", "Connection & launch plan"], ["demo", "Isolated calendar demo"], ["shared", "Shared staff calendar"]].map(([value, label]) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => { setMode(value as typeof mode); if (value === "shared") refreshCalendar(); }}>{label}</button>)}</div>
    {mode === "setup" && <>
      <div className={styles.notice}><strong>Website appointment intake is not connected.</strong><p>No public request has been delivered to this workspace or CRM by this feature. The demo does not create bookings. The staff-calendar view reads existing authorized records through a private API.</p></div>
      <div className={styles.cards}><article><h3>Customer experience</h3><p>Review the clearly labeled example calendar. Existing service and test-drive forms remain private previews, not live requests or guaranteed slots.</p>{previewUrl ? <a className={styles.link} href={`${previewUrl}/appointments`} target="_blank" rel="noopener noreferrer">Open customer calendar preview ↗</a> : <p>Customer preview URL is not configured. The isolated demo here remains available.</p>}</article><article><h3>Staff operations</h3><p>Use the same authoritative appointments, drafts, resource checks and scheduling permissions. No daily dispatch screen has to be open.</p><Link className={styles.link} href="/appointments?view=board">Open shared Appointment Board</Link><Link className={styles.link} href="/appointments?action=new">Create a staff appointment</Link><p>These are real staff tools—not demo actions. Opening them does not confirm an appointment.</p></article></div>
      <article className={styles.panel}><h3>Launch separately without duplicating bookings</h3><ol><li>Deploy the shared appointment backend and a private staff sign-in/workspace, even if daily dispatch is not launched.</li><li>Connect the website server to a restricted intake API. Save one durable pending request with an idempotency key and a receipt only after acceptance.</li><li>Link the verified customer and route a structured request to the responsible team. CRM notification is not a substitute for an appointment record.</li><li>Staff reviews and schedules through the existing conflict/resource controls. A preferred time is not a reservation or confirmation.</li><li>Send verified customer updates; support authorized rescheduling, cancellation, retry/reconciliation and outage handling before launch.</li></ol><p>Steps 2–5 of the public intake bridge are not implemented here. Do not manually copy demo records into operational calendars or turn on a competing booking writer.</p></article>
      <article className={styles.panel}><h3>What remains to configure</h3><ul><li>Separate sales/service hours, owners, capacity, buffers and appointment categories.</li><li>Public anti-abuse controls, server-to-server authentication, secure customer/request access and duplicate protection.</li><li>Approved confirmation, reminders, cancellation rules and message-delivery evidence.</li><li>Monitored backend hosting, backups, recovery and framework security remediation.</li></ul><Link className={styles.link} href="/website-console?section=providers">Review scheduling and messaging providers</Link></article>
    </>}
    {mode === "demo" && <AppointmentCalendarPreview />}
    {mode === "shared" && <section className={styles.panel} aria-labelledby="shared-calendar-heading"><h3 id="shared-calendar-heading">Shared staff appointments — read only</h3><p>Existing authorized appointments from the Minneapolis backend, across sources. This is not a website-request inbox or public availability feed. Booking status and customer confirmation remain separate.</p><div className={styles.controls}><label>Staff calendar date (America/Chicago)<input type="date" required value={date} onChange={event => refreshCalendar(event.target.value)} /></label><button type="button" disabled={loading} onClick={() => refreshCalendar()}>Refresh shared calendar</button><Link href="/appointments?view=board">Manage in Appointment Board</Link></div>
      {loading && <p role="status">Loading the shared appointment backend…</p>}{error && <p role="alert" className={styles.error}>{error} No appointments are inferred from this error.</p>}
      {!loading && !error && snapshot && <><p role="status">{snapshot.rows.length} existing appointments shown for {snapshot.date}. {snapshot.truncated ? "Limited to 100 records; open Appointment Board for the complete view." : "This view does not update automatically; refresh for current information."}</p>{!snapshot.rows.length ? <p>No records were returned for this date. This does not mean the dealership has available booking slots.</p> : <ul className={styles.appointments}>{snapshot.rows.map(appointment => <li key={appointment.id}><div><strong>{appointment.title}</strong><p>{appointment.startsAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: snapshot.timezone }).format(new Date(appointment.startsAt)) : "Unscheduled draft — no time booked"} · America/Chicago</p><p>Booking: {appointment.bookingStatus} · Customer confirmation: {appointment.confirmationStatus}</p><p>Owner: {appointment.ownerName}</p></div><Link href={`/appointments?view=board&appointment=${encodeURIComponent(appointment.appointmentNumber)}`}>Open {appointment.appointmentNumber}</Link></li>)}</ul>}</>}
    </section>}
  </section>;
}
