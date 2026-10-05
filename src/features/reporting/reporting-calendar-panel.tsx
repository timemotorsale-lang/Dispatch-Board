"use client";

import { useState } from "react";
import { CalendarDays, RefreshCw, Save } from "lucide-react";
import { addReportDays, type ReportCalendar } from "@/lib/reporting/calendar";
import type { previewReportingCalendar } from "@/server/reporting/calendar-service";
import styles from "./reporting-console.module.css";

type Preview = Awaited<ReturnType<typeof previewReportingCalendar>>;
export function ReportingCalendarPanel({ calendar, today }: { calendar: ReportCalendar; today: string }) {
  const [config, setConfig] = useState(calendar);
  const [from, setFrom] = useState(today), [to, setTo] = useState(addReportDays(today, 30));
  const [holidays, setHolidays] = useState(calendar.holidays.join("\n"));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const candidate = () => ({ ...config, holidays: holidays.split(/\s+/).filter(Boolean) });
  function edit(next: Partial<ReportCalendar>) { setConfig(value => ({ ...value, ...next })); setPreview(null); setNotice(""); }
  async function execute(action: "preview-calendar" | "save-calendar") {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, config: candidate(), from, to }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Calendar request failed.");
      if (action === "preview-calendar") setPreview(result as Preview);
      else { setNotice("Calendar draft saved. Obligations remain unchanged."); setPreview(null); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Calendar request failed."); }
    finally { setBusy(false); }
  }
  return <section className={styles.reportDetail} aria-label="Reporting calendar policy">
    <header className={styles.sectionHeader}><h2><CalendarDays size={18} /> Reporting calendar</h2><span className={styles.badge}>Draft only</span></header>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    {notice ? <p role="status" className={styles.notice}>{notice}</p> : null}
    <fieldset disabled={busy} className={styles.calendarFields}>
      <div className={styles.filters}>
        <label>Preview from<input type="date" value={from} onChange={event => { setFrom(event.target.value); setPreview(null); }} /></label>
        <label>Preview through<input type="date" value={to} onChange={event => { setTo(event.target.value); setPreview(null); }} /></label>
        <label>Timezone<input value={config.timezone} maxLength={100} onChange={event => edit({ timezone: event.target.value })} /></label>
        <label>Deadline minute<input type="number" min={0} max={1440} value={config.dailyDueMinute} onChange={event => edit({ dailyDueMinute: Number(event.target.value) })} /></label>
        <label>Grace minutes<input type="number" min={0} max={1440} value={config.graceMinutes} onChange={event => edit({ graceMinutes: Number(event.target.value) })} /></label>
      </div>
      <div className={styles.toolbar} role="group" aria-label="Reporting working days">{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((name, day) => <label key={name} className={styles.calendarDay}><input type="checkbox" checked={config.workingDays.includes(day)} onChange={event => edit({ workingDays: event.target.checked ? [...config.workingDays, day].sort() : config.workingDays.filter(value => value !== day) })} />{name}</label>)}</div>
      <label>Holiday dates<textarea value={holidays} placeholder="YYYY-MM-DD" onChange={event => { setHolidays(event.target.value); setPreview(null); }} /></label>
      <div className={styles.toolbar}><button className={styles.primary} onClick={() => void execute("preview-calendar")}><RefreshCw size={17} />{busy ? "Working..." : "Preview changes"}</button><button disabled={!preview || preview.rows.some(row => !row.canGenerate)} onClick={() => void execute("save-calendar")}><Save size={17} />Save draft</button></div>
    </fieldset>
    {preview ? <section aria-label="Calendar impact preview"><p role="status" className={styles.quality}>{preview.rows.length} projected periods · {preview.rows.filter(row => row.change !== "UNCHANGED").length} affected · {preview.removed.length} removed · Existing deadlines preserved</p>
      <div className={styles.tableWrap}><table><thead><tr><th>Person / Period</th><th>Reviewer</th><th>Current deadline</th><th>Proposed deadline</th><th>Impact</th></tr></thead><tbody>{preview.rows.map(row => <tr key={`${row.subjectUserId}:${row.cadence}:${row.periodStart}`}><td>{row.subject}<small>{row.periodStart} · {row.cadence.toLowerCase()} · {row.coveredDates.length}/{row.eligibleDays} working days</small></td><td>{row.reviewer}</td><td>{row.existingDueAt ?? row.previousDueAt ? new Date(row.existingDueAt ?? row.previousDueAt!).toLocaleString() : "Not required"}</td><td>{new Date(row.dueAt).toLocaleString()}</td><td>{row.change}{row.warnings.map(warning => <small key={warning}>{warning}</small>)}</td></tr>)}{preview.removed.map(row => <tr key={`removed:${row.subjectUserId}:${row.cadence}:${row.periodStart}`}><td>{row.subject}<small>{row.periodStart} · {row.cadence.toLowerCase()}</small></td><td>{row.reviewer}</td><td>{new Date(row.dueAt).toLocaleString()}</td><td>Not required</td><td>REMOVED</td></tr>)}</tbody></table></div>
    </section> : null}
  </section>;
}
