"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, Check, ChevronRight, Download, FileText, RefreshCw, Save, Search, Send, Star, X } from "lucide-react";
import { reportDefinitions, type ReportDefinitionId, type ReportResult, type ReportRow } from "@/lib/reporting/contracts";
import type { ReportCadence, ReportCalendar } from "@/lib/reporting/calendar";
import { ReportingCalendarPanel } from "./reporting-calendar-panel";
import { ReportingRecoveryPanel } from "./reporting-recovery-panel";
import { ReportingCoveragePanel } from "./reporting-coverage-panel";
import type { reportingManagementCoverage } from "@/server/reporting/management-service";
import { addReportDays } from "@/lib/reporting/calendar";
import { parseReportingNavigation, reportingNavigationUrl, type ReportingNavigation } from "@/lib/reporting/navigation";
import type { preparePeriodReport, reportingHistory, reportingRevision } from "@/server/reporting/period-service";
import type { reportingLibrary, savedReportingSnapshots } from "@/server/reporting/library-service";
import type { reportingExpectations } from "@/server/reporting/calendar-service";
import styles from "./reporting-console.module.css";

type Prepared = Awaited<ReturnType<typeof preparePeriodReport>>;
type History = Awaited<ReturnType<typeof reportingHistory>>;
type Revision = Awaited<ReturnType<typeof reportingRevision>>;
type Library = Awaited<ReturnType<typeof reportingLibrary>> & { snapshots: Awaited<ReturnType<typeof savedReportingSnapshots>> };
type Settings = { people: { id: string; name: string }[]; locations: { id: string; name: string }[]; calendarConfig?: ReportCalendar };
type Tab = "Overview" | "My Reports" | "Team Reports" | "Library";

async function request<T>(query: URLSearchParams | Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(query instanceof URLSearchParams ? `/api/reports?${query}` : "/api/reports", query instanceof URLSearchParams ? { signal, cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "The report could not be loaded.");
  return data as T;
}
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "The request could not be completed."; }
function displayState(state: string) { return state.replaceAll("_", " "); }
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function rows(value: unknown) { return Array.isArray(value) ? value.map(object) : []; }

export function ReportingConsole({ userId, userName, canReview, today, initialContext: serverContext }: { userId: string; userName: string; canReview: boolean; today: string; initialContext?: ReportingNavigation }) {
  const searchParams = useSearchParams();
  const initialContext = searchParams.toString() ? parseReportingNavigation(new URLSearchParams(searchParams.toString()), today, canReview) : serverContext;
  const [tab, setTab] = useState<Tab>(initialContext?.tab ?? "Overview");
  const [date, setDate] = useState(initialContext?.date ?? today), [cadence, setCadence] = useState<ReportCadence>(initialContext?.cadence ?? "DAILY");
  const [definition, setDefinition] = useState<ReportDefinitionId>(initialContext?.definition ?? "operations"), [location, setLocation] = useState(initialContext?.location ?? "");
  const [subject, setSubject] = useState(initialContext?.subject ?? "");
  const [settings, setSettings] = useState<Settings>({ people: [{ id: userId, name: userName }], locations: [] });
  const [live, setLive] = useState<ReportResult | null>(null), [prepared, setPrepared] = useState<Prepared | null>(null);
  const [history, setHistory] = useState<History | null>(null), [library, setLibrary] = useState<Library | null>(null);
  const [coverage, setCoverage] = useState<Awaited<ReturnType<typeof reportingManagementCoverage>> | null>(null);
  const [revision, setRevision] = useState<Revision | null>(null), [query, setQuery] = useState(initialContext?.query ?? "");
  const [context, setContext] = useState(""), [priorities, setPriorities] = useState(""), [confirmed, setConfirmed] = useState(false);
  const [comment, setComment] = useState(""), [metric, setMetric] = useState<string | null>(initialContext?.metric ?? null);
  const [notice, setNotice] = useState(""), [error, setError] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [saveState, setSaveState] = useState("");
  const [refresh, setRefresh] = useState(0), [dialog, setDialog] = useState<"view" | "snapshot" | "export" | "schedule" | null>(null), [dialogText, setDialogText] = useState("");
  const [download, setDownload] = useState<string | null>(null);
  const [frozen, setFrozen] = useState<ReportResult | null>(null);
  const [expectations, setExpectations] = useState<Awaited<ReturnType<typeof reportingExpectations>>>([]);
  const [historyFrom, setHistoryFrom] = useState(initialContext?.from ?? ""), [historyTo, setHistoryTo] = useState(initialContext?.to ?? "");
  const dirty = useRef(false), draftVersion = useRef(0), submissionKey = useRef("");
  const saving = useRef<Promise<boolean> | null>(null);
  const editNumber = useRef(0);
  const dialogRef = useRef<HTMLElement | null>(null);
  const outputKey = useRef("");
  useEffect(() => {
    const url = reportingNavigationUrl({ tab, date, cadence, definition, location, subject, query, metric, from: historyFrom, to: historyTo });
    if (`${window.location.pathname}${window.location.search}` !== url) window.history.replaceState(window.history.state, "", url);
  }, [tab, date, cadence, definition, location, subject, query, metric, historyFrom, historyTo]);
  useEffect(() => { if (dialog) outputKey.current = crypto.randomUUID(); }, [dialog, dialogText]);

  useEffect(() => { const abort = new AbortController(); request<Settings>(new URLSearchParams({ view: "settings" }), abort.signal).then(setSettings).catch(() => {}); return () => abort.abort(); }, []);
  useEffect(() => {
    const abort = new AbortController();
    const params = new URLSearchParams({ date, cadence });
    if (tab === "My Reports") {
      params.set("view", "prepare");
      request<Prepared>(params, abort.signal).then(result => { setPrepared(result); setContext(result.content.context); setPriorities(result.content.priorities); draftVersion.current = result.draftVersion; dirty.current = false; setConfirmed(false); submissionKey.current = crypto.randomUUID(); setSaveState(result.draftVersion ? "Saved" : ""); }).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
      request<History>(new URLSearchParams({ view: "history", cadence, ...(historyFrom ? { from: historyFrom } : {}), ...(historyTo ? { to: historyTo } : {}) }), abort.signal).then(setHistory).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); });
      request<Awaited<ReturnType<typeof reportingExpectations>>>(new URLSearchParams({ view: "expectations" }), abort.signal).then(setExpectations).catch(() => {});
    } else if (tab === "Team Reports") {
      request<Awaited<ReturnType<typeof reportingManagementCoverage>>>(new URLSearchParams({ view: "coverage", date, cadence, ...(subject ? { subject } : {}) }), abort.signal).then(setCoverage).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); });
      params.set("view", "history"); params.set("team", "true"); if (subject) params.set("subject", subject);
      if (historyFrom) params.set("from", historyFrom); if (historyTo) params.set("to", historyTo);
      request<Awaited<ReturnType<typeof reportingExpectations>>>(new URLSearchParams({ view: "expectations", team: "true" }), abort.signal).then(setExpectations).catch(() => {});
      request<History>(params, abort.signal).then(setHistory).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    } else if (tab === "Library") {
      request<Library>(new URLSearchParams({ view: "library" }), abort.signal).then(setLibrary).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    } else {
      params.set("view", "live"); params.set("definition", definition); if (location) params.set("location", location);
      request<ReportResult>(params, abort.signal).then(setLive).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    }
    return () => abort.abort();
  }, [tab, date, cadence, definition, location, subject, refresh, historyFrom, historyTo]);

  const saveDraft = useCallback(async () => {
    if (saving.current) return saving.current;
    if (!dirty.current || !prepared?.writesEnabled) return true;
    setSaveState("Saving...");
    const savedEditNumber = editNumber.current;
    const operation = request<{ version: number }>({ action: "save", date, cadence, context, priorities, expectedVersion: draftVersion.current }).then(result => {
      draftVersion.current = result.version;
      dirty.current = editNumber.current !== savedEditNumber; setSaveState(dirty.current ? "Unsaved changes" : "Saved"); return true;
    }).catch(async e => {
      try {
        const recovered = await request<Prepared>(new URLSearchParams({ view: "prepare", date, cadence }));
        if (recovered.content.context === context && recovered.content.priorities === priorities && recovered.draftVersion > draftVersion.current) {
          draftVersion.current = recovered.draftVersion;
          dirty.current = editNumber.current !== savedEditNumber;
          setSaveState(dirty.current ? "Unsaved changes" : "Saved");
          return true;
        }
      } catch { /* Retain the local edits if acknowledgement cannot be recovered. */ }
      setError(errorMessage(e)); setSaveState("Could not save"); return false;
    });
    saving.current = operation;
    const result = await operation;
    saving.current = null;
    return result;
  }, [prepared?.writesEnabled, date, cadence, context, priorities]);
  useEffect(() => {
    if (!dirty.current || saveState === "Could not save") return;
    const timer = setTimeout(() => { void saveDraft(); }, 800);
    return () => clearTimeout(timer);
  }, [context, priorities, saveDraft, saveState]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty.current) event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, []);

  async function navigate(next: () => void) {
    if (await saveDraft() && !dirty.current) { setLoading(true); setHistory(null); setCoverage(null); setError(""); setMetric(null); setDownload(null); setRevision(null); setNotice(""); next(); }
  }
  async function retrySave() { setError(""); await saveDraft(); }
  useEffect(() => {
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = dialogRef.current;
    panel?.querySelector<HTMLElement>("textarea, button")?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) { setDialog(null); event.preventDefault(); }
      if (event.key !== "Tab" || !panel) return;
      const elements = [...panel.querySelectorAll<HTMLElement>("button:not(:disabled), textarea, input, select, a[href]")];
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { last?.focus(); event.preventDefault(); }
      else if (!event.shiftKey && document.activeElement === last) { first?.focus(); event.preventDefault(); }
    };
    document.addEventListener("keydown", handle);
    return () => { document.removeEventListener("keydown", handle); previous?.focus(); };
  }, [dialog, busy]);
  async function submit() {
    setBusy(true); setError("");
    try {
      if (!await saveDraft() || dirty.current) return;
      const result = await request<{ id: string }>({ action: "submit", date, cadence, context, priorities, expectedVersion: draftVersion.current, accuracyConfirmed: confirmed, idempotencyKey: submissionKey.current });
      setRevision(await request<Revision>(new URLSearchParams({ view: "revision", id: result.id })));
      setNotice("Report submitted. Your submission is saved in history."); dirty.current = false; setRefresh(value => value + 1);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function openRevision(id: string) {
    setBusy(true); setError(""); setComment("");
    try { setRevision(await request<Revision>(new URLSearchParams({ view: "revision", id }))); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function review(action: "APPROVE" | "RETURN") {
    if (!revision) return;
    setBusy(true); setError("");
    try { await request({ action: "review", revisionId: revision.id, reviewAction: action, comment, expectedVersion: revision.seriesVersion }); setNotice(action === "APPROVE" ? "Report approved." : "Report returned for revision."); await openRevision(revision.id); setRefresh(value => value + 1); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function dialogAction() {
    if (!dialog) return;
    setBusy(true); setError("");
    try {
      const result = await request<{ id: string }>({ action: dialog === "view" ? "save-view" : dialog, definitionId: definition, locationId: location, date, cadence, query, metric, name: dialogText, reason: dialogText, idempotencyKey: outputKey.current });
      if (dialog === "export") setDownload(`/api/reports/exports/${result.id}`);
      setNotice(dialog === "schedule" ? "Delivery schedule saved inactive, pending rollout approval." : dialog === "export" ? "Controlled export ready." : dialog === "snapshot" ? "Snapshot saved." : "View saved.");
      setDialog(null); setRefresh(value => value + 1);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function nextHistoryPage() {
    if (!history?.nextCursor) return;
    setBusy(true); setError("");
    try {
      const next = await request<History>(new URLSearchParams({ view: "history", cadence, cursor: history.nextCursor, ...(tab === "Team Reports" ? { team: "true", ...(subject ? { subject } : {}) } : {}), ...(historyFrom ? { from: historyFrom } : {}), ...(historyTo ? { to: historyTo } : {}) }));
      setHistory({ ...next, rows: [...history.rows, ...next.rows], legacy: [...history.legacy, ...next.legacy] });
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function openFrozen(view: "snapshot" | "delivery", id: string) {
    setBusy(true); setError("");
    try { setFrozen(await request<ReportResult>(new URLSearchParams({ view, id }))); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function toggleSchedule(id: string, enabled: boolean, expectedVersion: number) {
    setBusy(true); setError("");
    try { await request({ action: "toggle-schedule", id, enabled, expectedVersion }); setRefresh(value => value + 1); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function favoriteView(id: string, favorite: boolean, expectedVersion: number) {
    setBusy(true); setError("");
    try { await request({ action: "favorite-view", id, favorite, expectedVersion }); setLoading(true); setRefresh(value => value + 1); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  const available = reportDefinitions.filter(item => canReview || ["operations", "reviews"].includes(item.id));
  const liveRows = live?.rows.filter(row => (!metric || live.metrics.find(item => item.code === metric)?.rowIds.includes(row.id)) && `${row.title} ${row.owner} ${row.state}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  const evidence = object(revision?.content), snapshot = object(evidence.snapshot);

  return <main className={styles.console}>
    <header className={styles.header}><div><span className={styles.eyebrow}>Time Motor Sales</span><h1>Reports</h1></div><div className={styles.headerActions}><Link href="/vehicles/coo-workbook"><FileText size={16} /> Workbook</Link><button title="Refresh" aria-label="Refresh reports" disabled={busy || loading || saveState === "Saving..."} onClick={() => void navigate(() => setRefresh(value => value + 1))}><RefreshCw size={17} /></button></div></header>
    <nav className={styles.tabs} aria-label="Reporting views">{(["Overview", "My Reports", ...(canReview ? ["Team Reports"] : []), "Library"] as Tab[]).map(item => <button key={item} aria-current={tab === item ? "page" : undefined} onClick={() => { if (item !== tab) void navigate(() => setTab(item)); }} disabled={busy}>{item}</button>)}</nav>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}{notice ? <p role="status" className={styles.notice}>{notice}{download ? <a href={download}><Download size={16} /> Download CSV</a> : null}</p> : null}
    <section className={styles.filters} aria-label="Report filters">
      {tab === "Overview" ? <label>Report<select value={definition} disabled={busy} onChange={e => { const value = e.target.value as ReportDefinitionId; void navigate(() => setDefinition(value)); }}>{available.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label> : null}
      {tab !== "Library" ? <><label>Covered date<input type="date" value={date} disabled={busy} onChange={e => { const value = e.target.value; if (value && value !== date) void navigate(() => setDate(value)); }} /></label><fieldset><legend>Frequency</legend>{(["DAILY", "WEEKLY", "MONTHLY"] as ReportCadence[]).map(value => <button key={value} aria-pressed={cadence === value} disabled={busy} onClick={() => { if (value !== cadence) void navigate(() => setCadence(value)); }}>{value[0] + value.slice(1).toLowerCase()}</button>)}</fieldset></> : null}
      {tab === "Overview" && settings.locations.length ? <label>Location<select value={location} onChange={e => { const value = e.target.value; void navigate(() => setLocation(value)); }}><option value="">All locations</option>{settings.locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
      {tab === "Team Reports" ? <label>Person<select aria-label="Person" value={subject} onChange={e => { const value = e.target.value; void navigate(() => setSubject(value)); }}><option value="">All staff</option>{settings.people.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
    </section>
    {tab === "My Reports" || tab === "Team Reports" ? <section className={styles.filters} aria-label="Archive range"><label>Archive from<input type="date" value={historyFrom} onChange={e => { const value = e.target.value; void navigate(() => setHistoryFrom(value)); }} /></label><label>Archive through<input type="date" value={historyTo} onChange={e => { const value = e.target.value; void navigate(() => setHistoryTo(value)); }} /></label>{history?.nextCursor ? <button disabled={busy} onClick={() => void nextHistoryPage()}>Load older reports</button> : null}</section> : null}
    {(tab === "My Reports" || tab === "Team Reports") && expectations.length ? <section><h2>Reporting expectations</h2><div className={styles.tableWrap}><table><thead><tr><th>Person</th><th>Period</th><th>Due</th><th>Status</th></tr></thead><tbody>{expectations.filter(item => !subject || settings.people.find(person => person.id === subject)?.name === item.subject).map(item => <tr key={item.id}><td>{item.subject}</td><td>{item.periodStart} · {item.cadence.toLowerCase()}</td><td>{new Date(item.dueAt).toLocaleString()}</td><td>{displayState(item.status)}{item.reason ? <small>{item.reason}</small> : null}</td></tr>)}</tbody></table></div></section> : null}
    {frozen ? <section className={styles.reportDetail}><header className={styles.sectionHeader}><div><h2>Saved report</h2><p>{new Date(frozen.generatedAt).toLocaleString()} · {displayState(frozen.quality)}</p></div><button aria-label="Close saved report" title="Close saved report" onClick={() => setFrozen(null)}><X size={18} /></button></header>{frozen.limitation ? <p className={styles.quality}>{frozen.limitation}</p> : null}<ReportTable items={frozen.rows} /></section> : null}
    {loading ? <p role="status" className={styles.empty}>Loading report...</p> : null}
    {!loading && revision ? <section className={styles.reportDetail}>
      <header className={styles.sectionHeader}><div><h2>{revision.subject}</h2><p>{revision.periodStart} · {revision.cadence.toLowerCase()} · Revision {revision.version} · {displayState(revision.status)}</p></div><button title="Close report" aria-label="Close report" onClick={() => setRevision(null)}><X size={18} /></button></header>
      {revision.revisions.length > 1 ? <label>Revision<select value={revision.id} onChange={e => void openRevision(e.target.value)}>{revision.revisions.map(item => <option key={item.id} value={item.id}>Revision {item.version} · {new Date(item.submittedAt).toLocaleString()}</option>)}</select></label> : null}
      <Evidence title="Completed work" items={rows(evidence.completed ?? snapshot.completedTasks)} /><Evidence title="Carryover and blockers" items={rows(evidence.carryover ?? snapshot.carryover)} />{rows(evidence.reopened).length ? <Evidence title="Reopened work" items={rows(evidence.reopened)} /> : null}<Evidence title="Updates" items={rows(evidence.activity)} />
      {typeof evidence.sourceCoverage === "string" ? <p className={styles.muted}>{evidence.sourceCoverage}</p> : null}
      <h3>Context</h3><p className={styles.prose}>{String(evidence.context || "No additional context.")}</p><h3>Next priorities</h3><p className={styles.prose}>{String(evidence.priorities || "No additional priorities.")}</p>
      {revision.reviews.map((item, index) => <p key={index} className={styles.reviewNote}>{displayState(item.action)} · {item.comment || "Reviewed"}</p>)}
      {revision.canReview ? <footer className={styles.reviewActions}><label>Review comment<textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={5000} /></label><div><button className={styles.primary} disabled={busy} onClick={() => void review("APPROVE")}><Check size={17} /> Approve</button><button disabled={busy || comment.trim().length < 10} onClick={() => void review("RETURN")}><ArrowLeft size={17} /> Return for revision</button></div></footer> : null}
    </section> : null}
    {!loading && !revision && tab === "Overview" && live ? <>
      <header className={styles.sectionHeader}><div><h2>{available.find(item => item.id === definition)?.title}</h2><p>Updated {new Date(live.generatedAt).toLocaleString()} · {displayState(live.quality)}</p></div><div className={styles.toolbar}><label className={styles.search}><Search size={16} /><input aria-label="Search report records" placeholder="Search records" value={query} onChange={e => setQuery(e.target.value)} /></label><button title="Save view" aria-label="Save view" onClick={() => { setDialog("view"); setDialogText(""); }}><Save size={17} /></button>{canReview ? <><button title="Save snapshot" aria-label="Save snapshot" onClick={() => { setDialog("snapshot"); setDialogText(""); }}><FileText size={17} /></button><button title="Controlled export" aria-label="Controlled export" onClick={() => { setDialog("export"); setDialogText(""); }}><Download size={17} /></button></> : null}<button title="Schedule delivery" aria-label="Schedule delivery" onClick={() => { setDialog("schedule"); setDialogText(""); }}><CalendarDays size={17} /></button></div></header>
      {live.limitation ? <p className={styles.quality}>{live.limitation}</p> : null}
      <section className={styles.metrics} aria-label="Report measures">{live.metrics.map(item => <button key={item.code} aria-pressed={metric === item.code} onClick={() => setMetric(metric === item.code ? null : item.code)}><span>{item.label}</span><strong>{item.value === null ? "Unavailable" : `${item.value}${item.unit === "PERCENT" ? "%" : ""}`}</strong></button>)}</section>
      <ReportTable items={liveRows} />
    </> : null}
    {!loading && !revision && tab === "My Reports" && prepared ? <>
      <section className={styles.reportDetail}><header className={styles.sectionHeader}><div><h2>{userName}</h2><p>{prepared.content.startDate} through {new Date(`${prepared.content.endDate}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "America/Chicago" })} · {cadence.toLowerCase()}</p></div><span className={styles.badge}>{displayState(prepared.expectation)} · {prepared.calendar.toLowerCase()} calendar</span></header>
        <p className={styles.quality}>{prepared.content.sourceCoverage}</p>
        <Evidence title="Completed work" items={prepared.content.completed} /><Evidence title="Carryover and blockers" items={prepared.content.carryover} />{prepared.content.reopened?.length ? <Evidence title="Reopened work" items={prepared.content.reopened} /> : null}<Evidence title="Updates" items={prepared.content.activity} />
        <div className={styles.editor}>
          <div><label htmlFor="report-context">Context</label><textarea id="report-context" value={context} disabled={!prepared.writesEnabled || busy} maxLength={10000} onChange={e => { dirty.current = true; editNumber.current++; setSaveState("Unsaved changes"); setContext(e.target.value); }} /></div>
          <div><label htmlFor="report-priorities">Next priorities</label><textarea id="report-priorities" value={priorities} disabled={!prepared.writesEnabled || busy} maxLength={5000} onChange={e => { dirty.current = true; editNumber.current++; setSaveState("Unsaved changes"); setPriorities(e.target.value); }} /></div>
        </div>
        <footer className={styles.submitBar}><label><input type="checkbox" checked={confirmed} disabled={!prepared.writesEnabled || busy} onChange={e => setConfirmed(e.target.checked)} /> I confirm this report is accurate.</label><span role="status">{saveState}</span>{saveState === "Could not save" ? <button aria-label="Retry saving draft" title="Retry saving draft" disabled={busy} onClick={() => void retrySave()}><RefreshCw size={17} /></button> : null}<button className={styles.primary} disabled={!confirmed || !prepared.writesEnabled || busy} onClick={() => void submit()}><Send size={17} /> {busy ? "Submitting..." : "Submit report"}</button></footer>
        {!prepared.writesEnabled ? <p className={styles.quality}>Submission is awaiting rollout activation. Your history remains available.</p> : null}
      </section><HistoryTable history={history} onOpen={openRevision} />
    </> : null}
    {!loading && !revision && tab === "Team Reports" ? <>{coverage ? <ReportingCoveragePanel coverage={coverage} busy={busy} onOpen={person => void navigate(() => { setSubject(person); setHistoryFrom(coverage.periodStart); setHistoryTo(addReportDays(coverage.periodEnd, -1)); })} /> : null}<HistoryTable history={history} onOpen={openRevision} team />{settings.calendarConfig ? <details><summary>Reporting calendar</summary><ReportingCalendarPanel calendar={settings.calendarConfig} today={today} /></details> : null}</> : null}
    {!loading && !revision && tab === "Library" && library ? <section><header className={styles.sectionHeader}><h2>Report library</h2><label className={styles.search}><Search size={16} /><input aria-label="Search report library" placeholder="Search reports" value={query} onChange={e => setQuery(e.target.value)} /></label></header><div className={styles.tableWrap}><table><thead><tr><th>Report</th><th>Area</th><th></th></tr></thead><tbody>{library.definitions.filter(item => `${item.title} ${item.area}`.toLowerCase().includes(query.toLowerCase())).map(item => <tr key={item.id}><td>{item.title}</td><td>{item.area}</td><td><button onClick={() => { setDefinition(item.id); setTab("Overview"); }} aria-label={`Open ${item.title}`}><ChevronRight size={17} /></button></td></tr>)}</tbody></table></div>
      <h3>Saved views</h3>{library.views.length ? library.views.map(view => <div className={styles.toolbar} key={view.id}><button className={styles.savedView} onClick={() => { const filters = object(view.filters); setDefinition(view.definitionId as ReportDefinitionId); setDate(String(filters.date ?? today)); setCadence(String(filters.cadence ?? "DAILY") as ReportCadence); setLocation(String(filters.locationId ?? "")); setQuery(String(filters.query ?? "")); setMetric(typeof filters.metric === "string" ? filters.metric : null); setLoading(true); setTab("Overview"); }}><FileText size={16} /> {view.name}<ChevronRight size={16} /></button><button title={view.favorite ? "Remove favorite" : "Add favorite"} aria-label={`${view.favorite ? "Remove favorite" : "Favorite"} ${view.name}`} aria-pressed={view.favorite} disabled={busy} onClick={() => void favoriteView(view.id, !view.favorite, view.favoriteVersion)}><Star size={17} fill={view.favorite ? "currentColor" : "none"} /></button></div>) : <p className={styles.muted}>No saved views.</p>}
      <h3>Scheduled deliveries</h3>{library.schedules.length ? library.schedules.map(schedule => <div className={styles.schedule} key={schedule.id}><strong>{reportDefinitions.find(item => item.id === schedule.definitionId)?.title}</strong><span>{schedule.cadence.toLowerCase()} · {schedule.enabled ? "Active" : "Inactive"} · {schedule.timezone}</span><label><input type="checkbox" checked={schedule.enabled} disabled={busy} onChange={e => void toggleSchedule(schedule.id, e.target.checked, schedule.version)} /> Delivery enabled</label>{schedule.jobs.map(job => <span key={job.id}>{displayState(job.status)}{job.lastError ? ` · ${job.lastError}` : ""}{job.status === "SUCCEEDED" ? <button disabled={busy} onClick={() => void openFrozen("delivery", job.id)}>Open delivery</button> : null}</span>)}</div>) : <p className={styles.muted}>No scheduled deliveries.</p>}
      {canReview ? library.schedules.filter(schedule => schedule.enabled).flatMap(schedule => schedule.jobs.filter(job => job.status === "DEAD_LETTER").map(job => <ReportingRecoveryPanel key={job.id} id={job.id} version={schedule.version} title={reportDefinitions.find(item => item.id === schedule.definitionId)?.title ?? "Report"} onRecovered={() => { setNotice("Recovery approved. Delivery is pending the next authorized worker run."); setRefresh(value => value + 1); }} />)) : null}
      <h3>Saved snapshots and exports</h3>{library.snapshots?.length ? library.snapshots.map(item => <div className={styles.schedule} key={item.id}><strong>{reportDefinitions.find(definition => definition.id === item.subjectId)?.title}</strong><span>{new Date(item.createdAt).toLocaleString()}</span>{item.recordType === "REPORT_SNAPSHOT" ? <button disabled={busy} onClick={() => void openFrozen("snapshot", item.id)}>Open snapshot</button> : <a href={`/api/reports/exports/${item.id}`}>Download controlled CSV</a>}</div>) : <p className={styles.muted}>No saved outputs.</p>}
    </section> : null}
    {dialog ? <div className={styles.backdrop}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="report-dialog-title" className={styles.dialog}><header className={styles.sectionHeader}><h2 id="report-dialog-title">{dialog === "view" ? "Save view" : dialog === "export" ? "Controlled export" : dialog === "snapshot" ? "Save snapshot" : "Schedule delivery"}</h2><button title="Cancel" aria-label="Cancel" onClick={() => setDialog(null)} disabled={busy}><X size={18} /></button></header>{dialog === "schedule" ? <p>{cadence.toLowerCase()} · America/Chicago · Secure delivery to your account. Saved inactive until scheduling is approved.</p> : <label>{dialog === "view" ? "View name" : "Business reason"}<textarea value={dialogText} onChange={e => setDialogText(e.target.value)} maxLength={dialog === "view" ? 100 : 500} /></label>}<button className={styles.primary} disabled={busy || (dialog !== "schedule" && dialogText.trim().length < (dialog === "view" ? 1 : 20))} onClick={() => void dialogAction()}><Save size={17} /> {busy ? "Saving..." : "Save"}</button></section></div> : null}
  </main>;
}

function Evidence({ title, items }: { title: string; items: Record<string, unknown>[] | ReportRow[] }) {
  if (!items.length) return null;
  return <section className={styles.evidence}><h3>{title} <span>{items.length}</span></h3><ul>{items.map((item, index) => { const value = item as Record<string, unknown>; return <li key={String(value.id ?? index)}><strong>{String(value.title ?? "Recorded work")}</strong>{value.state || value.status ? <span>{displayState(String(value.state ?? value.status))}</span> : null}{typeof value.occurredAt === "string" ? <small>Observed {value.occurredAt}</small> : null}{value.detail || value.blockerReason ? <p>{String(value.detail ?? value.blockerReason)}</p> : null}{typeof value.href === "string" && value.href.startsWith("/") && !value.href.startsWith("//") ? <Link href={value.href}>Open record <ChevronRight size={14} /></Link> : null}</li>; })}</ul></section>;
}
function ReportTable({ items }: { items: ReportRow[] }) {
  return items.length ? <div className={styles.tableWrap}><table><thead><tr><th>Record</th><th>Status</th><th>Owner</th><th>Age</th><th></th></tr></thead><tbody>{items.map(row => <tr key={row.id}><td><strong>{row.title}</strong>{row.detail ? <small>{row.detail}</small> : null}</td><td>{displayState(row.state)}</td><td>{row.owner}</td><td>{row.ageDays === undefined ? "-" : `${row.ageDays} days`}</td><td><Link href={row.href} aria-label={`Open ${row.title}`}><ChevronRight size={18} /></Link></td></tr>)}</tbody></table></div> : <p className={styles.empty}>No records for this view.</p>;
}
function HistoryTable({ history, onOpen, team }: { history: History | null; onOpen: (id: string) => Promise<void>; team?: boolean }) {
  const items = [...(history?.rows ?? []), ...(history?.legacy ?? [])].sort((a, b) => b.periodStart.localeCompare(a.periodStart) || a.id.localeCompare(b.id));
  return <section><h2>{team ? "Team submissions" : "Report history"}</h2>{items.length ? <div className={styles.tableWrap}><table><thead><tr><th>Person</th><th>Covered period</th><th>Frequency</th><th>Status</th><th></th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.subject}</td><td>{item.periodStart}</td><td>{item.cadence.toLowerCase()}</td><td>{displayState(item.status)}</td><td>{item.revisionId ? <button onClick={() => void onOpen((team ? item.latestRevisionId : item.revisionId)!)} aria-label={`Open ${item.subject} ${item.periodStart}`}><ChevronRight size={17} /></button> : "Draft"}</td></tr>)}</tbody></table></div> : <p className={styles.empty}>No submissions for this view.</p>}{history?.nextCursor ? <p className={styles.muted}>More report history is available.</p> : null}</section>;
}
