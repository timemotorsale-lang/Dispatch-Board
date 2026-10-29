"use client";

import { useId, useState } from "react";
import { applyDemoAction, createDemoAppointments, demoStatusLabels, exampleDays, exampleTimes, type DemoAction } from "./domain";
import styles from "./calendar.module.css";

export function AppointmentCalendarPreview() {
  const headingId = useId();
  const [appointments, setAppointments] = useState(createDemoAppointments);
  const [selectedId, setSelectedId] = useState("sample-test-drive");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selected = appointments.find(appointment => appointment.id === selectedId)!;

  function act(action: DemoAction) {
    setError(""); setMessage("");
    try {
      setAppointments(applyDemoAction(appointments, selectedId, action));
      setMessage("Demo updated only. No real booking, calendar write, CRM message or customer notification was created.");
    } catch (problem) { setError(problem instanceof Error ? problem.message : "The demo could not update."); }
  }

  return <section className={styles.preview} aria-labelledby={headingId}>
    <header><p className={styles.eyebrow}>Isolated design demo · fictitious appointments</p><h2 id={headingId}>One request. One calendar.</h2><p>Explore request → staff review → confirmation, then try a conflict, reschedule or cancellation. Nothing here is live availability.</p></header>
    <div className={styles.notice}><strong>Example week: November 2–6, 2026 · America/Chicago.</strong><p>Dates, times, people and capacity are invented. This is not dealership operating hours, an available slot or a booking service. Changes stay in this view and reset when you leave or reload.</p></div>
    <div className={styles.calendar} aria-label="Fictitious example calendar">{exampleDays.map(date => <section className={styles.day} key={date} aria-label={`Example day ${date}`}><h3>{new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</h3>{appointments.filter(appointment => appointment.date === date).map(appointment => <button type="button" key={appointment.id} aria-pressed={selectedId === appointment.id} className={styles.event} onClick={() => { setSelectedId(appointment.id); setMessage(""); setError(""); }}><strong>{appointment.time} · {appointment.title}</strong><span>{appointment.name}</span><span>{demoStatusLabels[appointment.status]}</span></button>)}{!appointments.some(appointment => appointment.date === date) && <p>No example events.<br />Not an availability claim.</p>}</section>)}</div>
    <section className={styles.detail} aria-label="Selected sample request"><div><h3>{selected.title} — {selected.name}</h3><p>{demoStatusLabels[selected.status]} · {selected.date} · {selected.time} America/Chicago</p></div>
      <form key={`${selected.id}-${selected.status}-${selected.date}-${selected.time}`} className={styles.form} onSubmit={event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        act({ kind: selected.status === "CONFIRMED" ? "RESCHEDULE" : "CONFIRM", date: String(form.get("date")), time: String(form.get("time")), reason: String(form.get("reason") || "") });
      }}>
        {selected.status !== "CANCELLED" && <><div className={styles.fields}><label>Example date<select name="date" defaultValue={selected.date}>{exampleDays.map(date => <option key={date} value={date}>{date}</option>)}</select></label><label>Example time<select name="time" defaultValue={selected.time}>{exampleTimes.map(time => <option key={time} value={time}>{time} America/Chicago</option>)}</select></label></div><label>Sample change reason (no personal information)<input name="reason" maxLength={200} placeholder="For example: shopper requested another time" /></label><div className={styles.actions}>{selected.status === "REQUESTED" ? <button type="button" onClick={() => act({ kind: "REVIEW" })}>Start sample staff review</button> : <button type="submit">{selected.status === "CONFIRMED" ? "Simulate reschedule" : "Simulate confirmation"}</button>}<button type="button" onClick={event => { const form = new FormData(event.currentTarget.form!); act({ kind: "CANCEL", reason: String(form.get("reason") || "") }); }}>Simulate cancellation</button></div></>}
      </form>
      {error && <p role="alert" className={styles.error}>{error}</p>}<p role="status">{message || "Select an example event to explore its workflow. No personal information is needed."}</p><details><summary>Sample activity trail</summary><ol>{selected.history.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol></details>
    </section>
    <div className={styles.actions}><button type="button" onClick={() => { setAppointments(createDemoAppointments()); setSelectedId("sample-test-drive"); setError(""); setMessage("Example calendar reset. No real records were changed."); }}>Reset example calendar</button><p>Demo changes never sync to staff records or My Garage.</p></div>
  </section>;
}
