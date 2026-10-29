"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { dispatchReportLink, dispatchStateLabel, type DispatchTeam, type TeamHandoff, type TeamRow } from "@/lib/dispatch-team";
import styles from "./team-now.module.css";

type TeamNowProps = { date: string; manager?: boolean; onPerson?: (id: string) => void };
type Attention = "handoffs" | "unassigned" | "help";
const needsHelp = (row: TeamRow) => row.state === "BLOCKED" || row.tasks.some(task => ["BLOCKED", "WAITING_ON_PARTS", "WAITING_ON_APPROVAL"].includes(task.status));
function shortTime(value: string) { return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function Handoff({ item }: { item: TeamHandoff }) {
  return <article className={styles.item}><strong>{item.title}</strong><span>{item.sender} → {item.receiver} · Awaiting acceptance</span><p>{item.nextAction}</p></article>;
}

// This is a display of canonical workbook and task records. All work commands stay in their source workspaces.
export function TeamNow(props: TeamNowProps) { return <TeamNowDay key={props.date} {...props} />; }
function TeamNowDay({ date, onPerson }: TeamNowProps) {
  const [data, setData] = useState<DispatchTeam | null>(null);
  const [expanded, setExpanded] = useState(true), [syncError, setSyncError] = useState("");
  const [personId, setPersonId] = useState<string | null>(null), [list, setList] = useState<Attention | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null), controller = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    try {
      const response = await fetch(`/api/dispatch/team?date=${encodeURIComponent(date)}`, { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]), cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.rows)) throw new Error(result.error ?? "Team activity could not be loaded.");
      if (!abort.signal.aborted) { setData(result); setSyncError(""); }
    } catch (failure) {
      if (!abort.signal.aborted) setSyncError(failure instanceof Error ? failure.message : "Team activity could not be loaded.");
    }
  }, [date]);
  useEffect(() => {
    const initial = window.setTimeout(() => { void load(); }, 0);
    const interval = window.setInterval(() => { if (document.visibilityState === "visible" && navigator.onLine) void load(); }, 15000);
    return () => { controller.current?.abort(); window.clearTimeout(initial); window.clearInterval(interval); };
  }, [load]);
  useLiveRefresh(() => { void load(); });
  useEffect(() => {
    const timer = window.setTimeout(() => { try { const saved = localStorage.getItem("dispatch-team-expanded"); if (saved != null) setExpanded(saved === "true"); } catch { /* Optional preference. */ } }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const panelOpen = Boolean(personId || list);
  useEffect(() => {
    if (!panelOpen) return;
    const previous = document.activeElement as HTMLElement | null, panel = dialog.current;
    if (panel && !panel.open) panel.showModal();
    return () => { panel?.close(); previous?.focus(); };
  }, [panelOpen]);
  function close() { setPersonId(null); setList(null); }
  function openPerson(id: string) { setPersonId(id); setList(null); }
  const selected = data?.rows.find(person => person.id === personId);
  return <section className={styles.team} aria-label="Team operations">
    <header className={styles.header}><div><h2>{data?.historical ? "Team day" : "Team operations"}</h2><span>{data ? data.historical ? "Dated workbook focuses and reports" : `${data.rows.filter(row => row.state === "WORKING").length} working · ${data.rows.filter(row => row.state === "BLOCKED").length} blocked` : syncError ? "Team activity unavailable" : "Loading team activity..."}</span></div>
      <button aria-expanded={expanded} onClick={() => { setExpanded(!expanded); try { localStorage.setItem("dispatch-team-expanded", String(!expanded)); } catch { /* Optional preference. */ } }}>{expanded ? "Compact view" : "See team"}</button>
    </header>
    {data?.historical ? <p className={styles.note}>{data.limitation}</p> : null}
    {syncError ? <div role="alert" className={styles.error}>{data ? "Updates delayed. Last known activity is retained. " : ""}{syncError} <button onClick={() => void load()}>Retry team sync</button></div> : null}
    {data && !data.historical ? <nav className={styles.attention} aria-label="Operations summary">
      <button onClick={() => { setList("help"); setPersonId(null); }}>{data.rows.filter(needsHelp).length} people need help</button>
      <button onClick={() => { setList("unassigned"); setPersonId(null); }}>{data.unassigned.length} unassigned jobs</button>
      <button onClick={() => { setList("handoffs"); setPersonId(null); }}>{data.handoffs.length} pending handoffs</button>
      <small>Last synced {shortTime(data.syncedAt)}</small>
    </nav> : null}
    {data && expanded ? <TeamOperationsRows data={data} onSelect={openPerson} /> : null}
    {panelOpen && data ? <dialog aria-label="Team activity detail" ref={dialog} className={styles.panel} onCancel={event => { event.preventDefault(); close(); }}>
      <header className={styles.header}><h2>{selected?.name ?? (list === "handoffs" ? "Pending handoffs" : list === "help" ? "People needing help" : "Unassigned work")}</h2><button onClick={close} aria-label="Close team detail">Close</button></header>
      {selected ? <><TeamPersonDetails person={selected} data={data} />
        {onPerson ? <button onClick={() => { onPerson(selected.id); close(); }}>Show assigned work on board</button> : null}
      </> : null}
      {list === "handoffs" ? data.handoffs.length ? data.handoffs.map(item => <Handoff key={item.id} item={item} />) : <p>No pending handoffs.</p> : null}
      {list === "help" ? data.rows.filter(needsHelp).length ? <ul>{data.rows.filter(needsHelp).map(row => <li key={row.id}><button onClick={() => openPerson(row.id)}>{row.name} · {row.nextAction || "View blockers"}</button></li>)}</ul> : <p>No blockers recorded.</p> : null}
      {list === "unassigned" ? data.unassigned.length ? <ul>{data.unassigned.map(task => <li key={task.id}><Link href={`/tasks/${encodeURIComponent(task.id)}`}>{task.title}</Link></li>)}</ul> : <p>No unassigned work recorded.</p> : null}
    </dialog> : null}
  </section>;
}

export function TeamOperationsRows({ data, onSelect }: { data: DispatchTeam; onSelect: (id: string) => void }) {
  return <div className={styles.tableWrap}><table className={styles.roster}><caption className={styles.srOnly}>Team status and workbook focuses</caption><thead><tr><th>Team member</th><th>Status</th><th>Current work</th><th>Workbook focuses</th><th>Last update</th></tr></thead><tbody>{data.rows.map(person => {
    const focuses = person.focuses.filter(focus => focus.businessDate === data.date);
    const additional = person.tasks.filter(task => task.status === "IN_PROGRESS" && task.id !== person.taskId).length;
    return <tr key={person.id}><td data-label="Team member"><button className={styles.person} onClick={() => onSelect(person.id)}>{person.name}</button></td>
      <td data-label="Status"><span className={styles[person.state.toLowerCase()]}>{data.historical ? "Historical view" : dispatchStateLabel[person.state]}</span></td>
      <td data-label="Current work"><strong className={styles.current}>{data.historical ? "See dated report" : person.title ?? "No current work recorded"}</strong>{!data.historical && additional > 0 ? <small>+{additional} other active work</small> : null}{person.overnight ? <small>Overnight work</small> : null}</td>
      <td data-label="Workbook focuses">{focuses.length ? <><ol className={styles.focuses}>{focuses.slice(0, 3).map(focus => <li key={focus.id}>{focus.title}{focus.status === "DONE" ? <span className={styles.done}> · Done</span> : null}</li>)}</ol>{focuses.length > 3 ? <small>+{focuses.length - 3} more in details</small> : null}</> : <span className={styles.note}>No workbook focuses recorded</span>}</td>
      <td data-label="Last update"><time dateTime={person.updatedAt ?? undefined}>{person.updatedAt ? shortTime(person.updatedAt) : "Not recorded"}</time></td></tr>;
  })}</tbody></table>{!data.rows.length ? <p>No team members are visible for this date.</p> : null}</div>;
}

export function TeamPersonDetails({ person, data }: { person: TeamRow; data: DispatchTeam }) {
  const focuses = person.focuses.filter(focus => focus.businessDate === data.date);
  const handoffs = data.handoffs.filter(item => item.senderUserId === person.id || item.receiverUserId === person.id);
  return <>
    <p><strong>{data.historical ? "Historical view" : dispatchStateLabel[person.state]}</strong>{person.title ? ` · ${person.title}` : ""}</p>
    {person.nextAction ? <p>Next action: {person.nextAction}</p> : null}
    {person.updatedAt ? <p className={styles.note}>Last update {shortTime(person.updatedAt)}</p> : null}
    <h3>Workbook focuses</h3>
    {focuses.length ? focuses.map(focus => <article key={focus.id} className={styles.item}><strong>{focus.title}</strong>{focus.taskId ? <Link href={`/tasks/${encodeURIComponent(focus.taskId)}`}>View linked work</Link> : null}<span>{focus.status === "DONE" ? "Completed" : focus.id === person.focusId ? "Current focus" : "Planned"}</span></article>) : <p>No workbook focuses recorded for this day.</p>}
    {person.tasks.length ? <><h3>Assigned work</h3>{person.tasks.map(task => <article key={task.id} className={styles.item}><Link href={`/tasks/${encodeURIComponent(task.id)}`}>{task.title}</Link><span>{task.status.replaceAll("_", " ").toLowerCase()}</span>{task.blockerReason ? <p>{task.blockerReason}</p> : null}</article>)}</> : null}
    {handoffs.length ? <><h3>Pending handoffs</h3>{handoffs.map(item => <Handoff key={item.id} item={item} />)}</> : null}
    {person.id === data.actorUserId || data.canReviewReports ? <Link className={styles.reportLink} href={dispatchReportLink(data.date, person.id, data.canReviewReports)}>View daily report</Link> : null}
  </>;
}
