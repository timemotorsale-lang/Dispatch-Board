"use client";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { CategoryBadge, categoryRowStyle } from "@/features/appointments/category-badge";
import { dailyFlowHref, flowDay, flowMidnight, flowRange, FLOW_TIME_ZONE, shiftFlowDate, validFlowDate, type FlowPeriod } from "./workbook-flow-dates";
import styles from "./workbook-appointment-flow.module.css";
import type { WorkdayWorkbookReadModel } from "@/server/services/workday-workbook";

type Appointment = { id: string; appointmentNumber: string; title: string; startsAt: string | null; category?: string | null; bookingStatus: string; attendanceStatus: string; owner: { name: string } | null; customer: { displayName: string } | null };
type Reminder = { id: string; text: string; category?: string; person: string; phoneNumber?: string; company: string; date: string; convertedTaskId: string | null };
type Result = { key: string; appointments: Appointment[]; reminders: Reminder[]; appointmentError: boolean; reminderError: boolean };

type PurseTool = "flow" | "activity" | "past" | "focus";
export function WorkbookAppointmentFlow({ date, workbook, pendingWork, generating, onGenerateReport }: {
  date: string;
  workbook: WorkdayWorkbookReadModel;
  pendingWork: Array<{ id: string; title: string; detail: string; href: string }>;
  generating: boolean;
  onGenerateReport: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<PurseTool>("flow");
  const id = useId();
  return <section className={styles.shell} aria-label="Workbook appointment flow">
    <button className={styles.toggle} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><CalendarDays size={20} /> Daily Purse <small>Flow · accomplishments · past attention · focus</small><ChevronDown size={18} /></button>
    <div id={id} hidden={!open}>{open ? <>
      <nav className={styles.tools} aria-label="Daily Purse tools">
        {([['flow','Daily Flow'],['activity','Daily Activities Updates'],['past','Past Activities'],['focus','Daily Focus']] as const).map(([value,label]) => <button key={value} type="button" aria-current={tool === value ? "page" : undefined} onClick={() => setTool(value)}>{label}</button>)}
      </nav>
      {tool === "flow" ? <FlowContents key={date} initialDate={date} /> : null}
      {tool === "activity" ? <DailyActivity workbook={workbook} date={date} generating={generating} onGenerateReport={onGenerateReport} /> : null}
      {tool === "past" ? <PastActivity date={date} scope={workbook.scope} workbook={workbook} pendingWork={pendingWork} /> : null}
      {tool === "focus" ? <DailyFocus workbook={workbook} date={date} /> : null}
    </> : null}</div>
  </section>;
}

function DailyActivity({ workbook, date, generating, onGenerateReport }: { workbook: WorkdayWorkbookReadModel; date: string; generating: boolean; onGenerateReport: () => Promise<void> }) {
  const doneFocus = workbook.dailyFocusItems.filter(item => item.status === "DONE");
  const doneChecklist = workbook.checklistItems.filter(item => item.done);
  const latestDraft = workbook.reportDrafts.find(item => item.cadence === "DAILY");
  const signals = workbook.activitySignals.filter(item => item.reportRelevant).slice(0, 12);
  return <section className={styles.pursePanel} aria-label="Daily Activities Updates">
    <header><div><strong>What you have accomplished · {date}</strong><small>{doneFocus.length} focus outcomes · {doneChecklist.length} checklist items · {signals.length} captured app activities</small></div><button disabled={generating} type="button" onClick={() => void onGenerateReport()}>{generating ? "Generating…" : latestDraft ? "Regenerate daily report" : "Generate daily report"}</button></header>
    {latestDraft ? <p className={styles.reportState}>Latest daily report: {latestDraft.title} · version {latestDraft.version}</p> : <p className={styles.help}>Your report has not been generated yet. The preview below updates as work is recorded.</p>}
    <div className={styles.summaryGrid}>
      <article><strong>Completed focus</strong>{doneFocus.length ? doneFocus.map(item => <div key={item.id}><b>{item.outcome}</b>{item.progressUpdate ? <small>{item.progressUpdate}</small> : null}</div>) : <p>Nothing marked done yet.</p>}</article>
      <article><strong>Completed checklist</strong>{doneChecklist.length ? doneChecklist.map(item => <div key={item.id}><b>{item.text}</b>{item.update ? <small>{item.update}</small> : null}</div>) : <p>Nothing marked done yet.</p>}</article>
      <article><strong>Work captured across the app</strong>{signals.length ? signals.map(item => <div key={item.id}><b>{item.actionType.replaceAll("_", " ").replaceAll(".", " · ").toLowerCase().replace(/^./, letter => letter.toUpperCase())}</b><small>{item.businessImpact || item.sourceModule}</small></div>) : <p>No report-worthy app activity captured yet.</p>}</article>
      <article><strong>Updates recorded</strong>{workbook.quickUpdates.length ? workbook.quickUpdates.map(item => <div key={item.id}><b>{item.text}</b><small>{[item.person,item.phoneNumber,item.company].filter(Boolean).join(" · ")}</small></div>) : <p>No Quick Updates recorded yet.</p>}</article>
    </div>
  </section>;
}

type HistoryDay = { id: string; date: string; status: string; checklistItems: Array<{id:string;text:string;update:string;done:boolean;carryoverReady:boolean;convertedTaskId:string|null}>; dailyFocusItems:Array<{id:string;outcome:string;progressUpdate:string;status:string;mustCloseToday:boolean;convertedTaskId:string|null}>; quickUpdates:Array<{id:string;text:string;followUpNeeded:boolean;dueWindow:string;carryoverReady:boolean;convertedTaskId:string|null}>; reportDrafts:Array<{id:string;title:string;version:number}> };
function PastActivity({ date, scope, workbook, pendingWork }: { date: string; scope: string; workbook: WorkdayWorkbookReadModel; pendingWork: Array<{ id: string; title: string; detail: string; href: string }> }) {
  const carryovers = workbook.carryovers.filter(item => item.status !== "DISMISSED" && item.status !== "CONVERTED");
  const [history, setHistory] = useState<HistoryDay[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  useEffect(() => { const controller = new AbortController(); fetch(`/api/coo-workbook/history?before=${encodeURIComponent(date)}&scope=${scope === "STAFF" ? "STAFF" : "COO"}`, { signal: controller.signal, cache: "no-store" }).then(async response => { const value = await response.json(); if (!response.ok || !Array.isArray(value.days)) throw new Error(); setHistory(value.days); }).catch(() => { if (!controller.signal.aborted) setHistoryError(true); }); return () => controller.abort(); }, [date,scope]);
  return <section className={styles.pursePanel} aria-label="Past Activities">
    <header><div><strong>Past work that still needs attention</strong><small>Yesterday, prior weeks, and unfinished operating work carried into today.</small></div></header>
    <div className={styles.summaryGrid}>
      <article><strong>Workbook carryovers · {carryovers.length}</strong>{carryovers.length ? carryovers.map(item => <div key={item.id}><b>{item.title}</b><small>{item.detail} · target {item.targetBoardDate}</small>{item.sourceHref ? <Link href={item.sourceHref}>Open source →</Link> : null}</div>) : <p>No open workbook carryovers.</p>}</article>
      <article><strong>Tasks and repair-order attention · {pendingWork.length}</strong>{pendingWork.length ? pendingWork.slice(0,25).map(item => <div key={item.id}><Link href={item.href}>{item.title}</Link><small>{item.detail}</small></div>) : <p>No unresolved work is waiting for attention.</p>}</article>
    </div>
    <section className={styles.history}><strong>Previous 4 weeks</strong>
      {!history && !historyError ? <p role="status">Loading past activities…</p> : null}
      {historyError ? <p role="alert">Past workbook activity could not be loaded.</p> : null}
      {history?.length === 0 ? <p>No workbook activity was found in the previous four weeks.</p> : null}
      {history?.map(day => { const pending = [...day.dailyFocusItems.filter(item => item.status !== "DONE").map(item => ({id:`focus-${item.id}`,text:item.outcome,kind:"Focus",task:item.convertedTaskId})), ...day.checklistItems.filter(item => !item.done).map(item => ({id:`check-${item.id}`,text:item.text,kind:"Checklist",task:item.convertedTaskId})), ...day.quickUpdates.filter(item => item.followUpNeeded || item.carryoverReady).map(item => ({id:`update-${item.id}`,text:item.text,kind:"Update",task:item.convertedTaskId}))]; return <details key={day.id}><summary><b>{day.date}</b> · {day.dailyFocusItems.length} focus · {day.checklistItems.length} checklist · {day.quickUpdates.length} updates · {pending.length} pending</summary><div>{pending.length ? pending.map(item => <p key={item.id}><span>{item.kind}</span> {item.task ? <Link href={`/tasks/${encodeURIComponent(item.task)}`}>{item.text}</Link> : item.text}</p>) : <p>Nothing from this day remains pending.</p>}{day.reportDrafts[0] ? <small>Saved report: {day.reportDrafts[0].title} · version {day.reportDrafts[0].version}</small> : <small>No saved daily report.</small>}</div></details>; })}
    </section>
    <p className={styles.help}>Past completed work remains visible by day; unresolved focus, checklist, update, task, and repair-order attention is emphasized.</p>
  </section>;
}

function DailyFocus({ workbook, date }: { workbook: WorkdayWorkbookReadModel; date: string }) {
  const items = [...workbook.dailyFocusItems].sort((a,b) => a.sortOrder-b.sortOrder);
  return <section className={styles.pursePanel} aria-label="Daily Focus summary">
    <header><div><strong>Today’s Daily Focus · {date}</strong><small>A polished summary of the outcomes chosen in Start The Day.</small></div><Link href="/vehicles/coo-workbook/effectiveness-pilot#start-the-day">Open Start The Day →</Link></header>
    <div className={styles.focusList}>{items.length ? items.map((item,index) => <article key={item.id}><span>{index+1}</span><div><strong>{item.outcome}</strong><small>{item.priority.replaceAll("_"," ")} · {item.status.replaceAll("_"," ")}{item.mustCloseToday ? " · Must close today" : ""}</small>{item.progressUpdate ? <p>{item.progressUpdate}</p> : null}{item.supportNeeded ? <p>Support: {item.supportNeeded}</p> : null}</div></article>) : <p>No focus outcomes selected yet. Use Start The Day to choose up to three meaningful outcomes.</p>}</div>
  </section>;
}
function FlowContents({ initialDate }: { initialDate: string }) {
  const [date, setDate] = useState(initialDate.slice(0, 10));
  const [period, setPeriod] = useState<FlowPeriod>("daily");
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const { start, end } = flowRange(date, period);
  const key = `${start}:${end}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    let sequence = 0;
    const read = async (url: string) => {
      const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load flow");
      return response.json();
    };
    const load = async () => {
      const requestSequence = ++sequence;
      const query = new URLSearchParams({ date: start, windowStart: flowMidnight(start), windowEnd: flowMidnight(end) });
      const [appointments, reminders] = await Promise.allSettled([read(`/api/appointments?${query}`), read(`/api/appointments/reminders?date=${start}&through=${shiftFlowDate(end, -1)}`)]);
      if (controller.signal.aborted || sequence !== requestSequence) return;
      const appointmentError = appointments.status !== "fulfilled" || !Array.isArray(appointments.value?.appointments);
      const reminderError = reminders.status !== "fulfilled" || !Array.isArray(reminders.value?.reminders);
      setResult({ key, appointmentError, reminderError, appointments: !appointmentError && appointments.status === "fulfilled" ? appointments.value.appointments : [], reminders: !reminderError && reminders.status === "fulfilled" ? reminders.value.reminders : [] });
    };
    void load(); window.addEventListener("focus", load);
    return () => { controller.abort(); window.removeEventListener("focus", load); };
  }, [start, end, key]);
  const current = result?.key === key ? result : null;
  const days: string[] = [];
  for (let day = start; day < end; day = shiftFlowDate(day, 1)) days.push(day);
  return <div className={styles.content}>
    <div className={styles.toolbar}>
      <div className={styles.periods} role="group" aria-label="Flow period">{(["daily", "weekly", "monthly"] as const).map(value => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
      <label>Flow date <input type="date" value={date} onChange={event => { if (validFlowDate(event.target.value)) setDate(event.target.value); }} /></label>
      <button type="button" onClick={() => setRevision(value => value + 1)}>Refresh flow</button>
      <Link href={dailyFlowHref(date)}>Open Appointment Console →</Link>
    </div>
    <p className={styles.help}>Live appointments and your Quick Update / checklist reminders · Central time · Weeks start Monday.</p>
    <strong>{start}{period !== "daily" ? ` — ${shiftFlowDate(end, -1)}` : ""}</strong>
    {!current ? <p role="status">Loading flow…</p> : <>
      {current.appointmentError ? <p role="alert">Appointments could not be loaded. Use Refresh flow to retry.</p> : null}
      {current.reminderError ? <p role="alert">Reminders could not be loaded. Use Refresh flow to retry.</p> : null}
      <div className={styles.days}>{days.map(day => {
        const appointments = current.appointments.filter(item => item.startsAt && flowDay(item.startsAt) === day).sort((a, b) => a.startsAt!.localeCompare(b.startsAt!));
        const reminders = current.reminders.filter(item => item.date === day);
        return <article className={styles.day} key={day}>
          <header><Link href={dailyFlowHref(day)}>{new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })} →</Link><small>{!current.appointmentError ? `${appointments.length} appointments` : "Appointments unavailable"} · {!current.reminderError ? `${reminders.length} reminders` : "Reminders unavailable"}</small></header>
          {appointments.map(item => <div className={styles.item} style={categoryRowStyle(item.category)} key={item.id}>
            <div><strong>{new Date(item.startsAt!).toLocaleTimeString("en-US", { timeZone: FLOW_TIME_ZONE, hour: "numeric", minute: "2-digit" })}</strong> <CategoryBadge category={item.category} /></div>
            <Link href={`/appointments?view=board&appointment=${encodeURIComponent(item.appointmentNumber)}`}>{item.title}</Link>
            <small>{[item.customer?.displayName, item.owner?.name, item.bookingStatus?.replaceAll("_", " "), item.attendanceStatus?.replaceAll("_", " ")].filter(Boolean).join(" · ")}</small>
          </div>)}
          {reminders.map(item => <div className={styles.item} style={categoryRowStyle(item.category)} key={item.id}>
            <div><strong>Reminder · no reserved time</strong> <CategoryBadge category={item.category} /></div>
            <details><summary>{item.text}</summary><p>{item.text}</p><small>{[item.person, item.phoneNumber, item.company].filter(Boolean).join(" · ")}</small></details>
            <Link href={item.convertedTaskId ? `/tasks/${encodeURIComponent(item.convertedTaskId)}` : dailyFlowHref(day)}>{item.convertedTaskId ? "Open task" : "Open daily flow"} →</Link>
          </div>)}
          {!appointments.length && !reminders.length && !current.appointmentError && !current.reminderError ? <p className={styles.help}>Nothing scheduled.</p> : null}
        </article>;
      })}</div>
      {current.appointments.some(item => !item.startsAt) ? <p>Some appointments have no start time. <Link href="/appointments?view=board">Review them on the Schedule Board.</Link></p> : null}
    </>}
  </div>;
}
