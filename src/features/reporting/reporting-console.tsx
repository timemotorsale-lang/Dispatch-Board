"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, Check, ChevronRight, Download, FileText, RefreshCw, Save, Search, Send, Star, X } from "lucide-react";
import { reportDefinitions, type ReportDefinitionId, type ReportResult, type ReportRow } from "@/lib/reporting/contracts";
import type { ReportCadence, ReportCalendar } from "@/lib/reporting/calendar";
import { ReportingCalendarPanel } from "./reporting-calendar-panel";
import { ReportingRecoveryPanel } from "./reporting-recovery-panel";
import { ReportingCoveragePanel } from "./reporting-coverage-panel";
import type { reportingManagementCoverage } from "@/server/reporting/management-service";
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
  const timeout = AbortSignal.timeout(20000);
  const boundedSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const response = await fetch(query instanceof URLSearchParams ? `/api/reports?${query}` : "/api/reports", query instanceof URLSearchParams ? { signal: boundedSignal, cache: "no-store" } : { signal: boundedSignal, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query) });
  const data = await response.json().catch(() => ({ error: "The report service returned an unreadable response. Retry the request." }));
  if (response.redirected || response.status === 401) throw new Error("Your session expired. Sign in again to open reports.");
  if (!response.ok || typeof data?.error === "string") throw new Error(data.error ?? "The report could not be loaded.");
  if (query instanceof URLSearchParams && query.get("view") === "history" && (!Array.isArray(data.rows) || !Array.isArray(data.legacy))) throw new Error("The archive returned incomplete results. Retry to load saved reports.");
  return data as T;
}
function errorMessage(error: unknown) { if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return "The report request timed out. Retry to load your saved reports."; return error instanceof Error ? error.message : "The request could not be completed."; }
function displayState(state: string) { return state.replaceAll("_", " "); }
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function rows(value: unknown) { return Array.isArray(value) ? value.map(object) : []; }

export function ReportingConsole({ userId, userName, canReview, today, initialContext: serverContext }: { userId: string; userName: string; canReview: boolean; today: string; initialContext?: ReportingNavigation }) {
  const searchParams = useSearchParams();
  const initialContext = searchParams.toString() ? parseReportingNavigation(new URLSearchParams(searchParams.toString()), today, canReview) : serverContext;
  const [tab, setTab] = useState<Tab>(initialContext?.tab ?? (canReview ? "Team Reports" : "My Reports"));
  const [date, setDate] = useState(initialContext?.date ?? today), [cadence, setCadence] = useState<ReportCadence>(initialContext?.cadence ?? "DAILY");
  const [definition, setDefinition] = useState<ReportDefinitionId>(initialContext?.definition ?? "operations"), [location, setLocation] = useState(initialContext?.location ?? "");
  const [subject, setSubject] = useState(initialContext?.subject ?? "");
  const [settings, setSettings] = useState<Settings>({ people: [{ id: userId, name: userName }], locations: [] });
  const [live, setLive] = useState<ReportResult | null>(null), [prepared, setPrepared] = useState<Prepared | null>(null);
  const [history, setHistory] = useState<History | null>(null), [library, setLibrary] = useState<Library | null>(null);
  const [coverage, setCoverage] = useState<Awaited<ReturnType<typeof reportingManagementCoverage>> | null>(null);
  const [recordedDay, setRecordedDay] = useState<Prepared | null>(null);
  const [revision, setRevision] = useState<Revision | null>(null), [query, setQuery] = useState(initialContext?.query ?? "");
  const [context, setContext] = useState(""), [priorities, setPriorities] = useState(""), [confirmed, setConfirmed] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [comment, setComment] = useState(""), [metric, setMetric] = useState<string | null>(initialContext?.metric ?? null);
  const [auxiliaryError, setAuxiliaryError] = useState("");
  const [expectationsError, setExpectationsError] = useState("");
  const [notice, setNotice] = useState(""), [error, setError] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [saveState, setSaveState] = useState("");
  const [refresh, setRefresh] = useState(0), [dialog, setDialog] = useState<"view" | "snapshot" | "export" | "schedule" | null>(null), [dialogText, setDialogText] = useState("");
  const [download, setDownload] = useState<string | null>(null);
  const [frozen, setFrozen] = useState<ReportResult | null>(null);
  const [expectations, setExpectations] = useState<Awaited<ReturnType<typeof reportingExpectations>>>([]);
  const [historyFrom, setHistoryFrom] = useState(initialContext?.from ?? ""), [historyTo, setHistoryTo] = useState(initialContext?.to ?? "");
  const [rangeMode, setRangeMode] = useState<"day" | "range">(initialContext?.rangeMode ?? (initialContext?.from || initialContext?.to ? "range" : "day"));
  const [reportStatus, setReportStatus] = useState(initialContext?.reportStatus ?? "ALL");
  const historyScope = useMemo(() => { const scope: Record<string, string> = {}; if (rangeMode === "day") { scope.rangeMode = "day"; scope.date = date; } else { if (historyFrom) scope.from = historyFrom; if (historyTo) scope.to = historyTo; } return scope; }, [rangeMode, date, historyFrom, historyTo]);
  const dirty = useRef(false), draftVersion = useRef(0), submissionKey = useRef("");
  const saving = useRef<Promise<boolean> | null>(null);
  const editNumber = useRef(0);
  const dialogRef = useRef<HTMLElement | null>(null);
  const outputKey = useRef("");
  useEffect(() => {
    const url = reportingNavigationUrl({ tab, date, cadence, definition, location, subject, query, metric, from: historyFrom, to: historyTo, rangeMode, reportStatus });
    if (`${window.location.pathname}${window.location.search}` !== url) window.history.pushState(window.history.state, "", url);
  }, [tab, date, cadence, definition, location, subject, query, metric, historyFrom, historyTo, rangeMode, reportStatus]);
  useEffect(() => {
    function restore() {
      if (dirty.current) { setError("Save your report edits before changing the report view."); return; }
      const next = parseReportingNavigation(new URLSearchParams(window.location.search), today, canReview);
      setTab(next.tab); setDate(next.date); setCadence(next.cadence); setSubject(next.subject);
      setHistoryFrom(next.from); setHistoryTo(next.to); setRangeMode(next.rangeMode ?? (next.from || next.to ? "range" : "day"));
      setReportStatus(next.reportStatus ?? "ALL"); setRevision(null); setLoading(true);
    }
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [today, canReview]);
  useEffect(() => { if (dialog) outputKey.current = crypto.randomUUID(); }, [dialog, dialogText]);

  useEffect(() => { const abort = new AbortController(); request<Settings>(new URLSearchParams({ view: "settings" }), abort.signal).then(result => { if (!abort.signal.aborted) { setSettings(result); setAuxiliaryError(""); } }).catch(e => { if (!abort.signal.aborted) setAuxiliaryError(errorMessage(e)); }); return () => abort.abort(); }, [refresh]);
  useEffect(() => {
    const abort = new AbortController();
    const params = new URLSearchParams({ date, cadence });
    if (tab === "My Reports") {
      params.set("view", "prepare");
      request<Prepared>(params, abort.signal).then(result => { if (abort.signal.aborted) return; setPrepared(result); setContext(result.content.context); setPriorities(result.content.priorities); draftVersion.current = result.draftVersion; dirty.current = false; setConfirmed(false); submissionKey.current = crypto.randomUUID(); setSaveState(result.draftVersion ? "Saved" : ""); }).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
      request<History>(new URLSearchParams({ view: "history", cadence, ...historyScope, ...(reportStatus !== "ALL" ? { reportStatus } : {}), ...(query.trim() ? { query: query.trim() } : {}) }), abort.signal).then(result => { if (!abort.signal.aborted) setHistory(result); }).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); });
      request<Awaited<ReturnType<typeof reportingExpectations>>>(new URLSearchParams({ view: "expectations", cadence, ...historyScope }), abort.signal).then(result => { if (!abort.signal.aborted) setExpectations(result); }).catch(e => { if (!abort.signal.aborted) setExpectationsError(errorMessage(e)); });
    } else if (tab === "Team Reports") {
      request<Awaited<ReturnType<typeof reportingManagementCoverage>>>(new URLSearchParams({ view: "coverage", date, cadence, ...(subject ? { subject } : {}) }), abort.signal).then(result => { if (!abort.signal.aborted) setCoverage(result); }).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); });
      params.set("view", "history"); params.set("team", "true"); if (subject) params.set("subject", subject);
      for (const [key, value] of Object.entries(historyScope)) params.set(key, value);
      if (query.trim()) params.set("query", query.trim());
      if (reportStatus !== "ALL") params.set("reportStatus", reportStatus);
      request<Awaited<ReturnType<typeof reportingExpectations>>>(new URLSearchParams({ view: "expectations", cadence, ...historyScope, team: "true", ...(subject ? { subject } : {}) }), abort.signal).then(result => { if (!abort.signal.aborted) { setExpectations(result); setExpectationsError(""); } }).catch(e => { if (!abort.signal.aborted) setExpectationsError(errorMessage(e)); });
      request<History>(params, abort.signal).then(result => { if (!abort.signal.aborted) setHistory(result); }).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    } else if (tab === "Library") {
      request<Library>(new URLSearchParams({ view: "library" }), abort.signal).then(result => { if (!abort.signal.aborted) setLibrary(result); }).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    } else {
      params.set("view", "live"); params.set("definition", definition); if (location) params.set("location", location);
      request<ReportResult>(params, abort.signal).then(result => { if (!abort.signal.aborted) setLive(result); }).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    }
    return () => abort.abort();
  }, [tab, date, cadence, definition, location, subject, refresh, historyFrom, historyTo, rangeMode, reportStatus, query, historyScope]);

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
    if (await saveDraft() && !dirty.current) { setLoading(true); setHistory(null); setCoverage(null); setPrepared(null); setExpectations([]); setExpectationsError(""); setError(""); setMetric(null); setDownload(null); setRevision(null); setRecordedDay(null); setNotice(""); next(); }
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
      const result = await request<{ id: string }>({ action: "submit", date, cadence, context, priorities, expectedVersion: draftVersion.current, accuracyConfirmed: confirmed, correctionReason, idempotencyKey: submissionKey.current });
      setRevision(await request<Revision>(new URLSearchParams({ view: "revision", id: result.id })));
      setNotice("Report submitted. Your submission is saved in history."); dirty.current = false; setRefresh(value => value + 1);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function openPersonDay(person: string, revisionId?: string | null) {
    if (revisionId) { await openRevision(revisionId); return; }
    setBusy(true); setError(""); setRecordedDay(null);
    try {
      setRecordedDay(await request<Prepared>(new URLSearchParams({ view: "prepare", date, cadence, subject: person })));
    } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  async function openRevision(id: string) {
    setBusy(true); setError(""); setComment(""); setRecordedDay(null);
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
      const next = await request<History>(new URLSearchParams({ view: "history", cadence, date, ...(query.trim() ? { query: query.trim() } : {}), ...(reportStatus !== "ALL" ? { reportStatus } : {}), cursor: history.nextCursor, ...(tab === "Team Reports" ? { team: "true", ...(subject ? { subject } : {}) } : {}), ...historyScope }));
      setHistory({ ...next, rows: [...history.rows, ...next.rows], legacy: [...history.legacy, ...next.legacy], workbooks: [...history.workbooks, ...next.workbooks] });
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
    {error ? <div role="alert" className={styles.error}>{error}<button disabled={busy} onClick={() => void navigate(() => setRefresh(value => value + 1))}>Retry report request</button>{error.includes("Sign in") ? <Link href="/login">Sign in</Link> : null}</div> : null}{auxiliaryError ? <p role="status" className={styles.quality}>{auxiliaryError} <button onClick={() => setRefresh(value => value + 1)}>Retry filters</button></p> : null}{notice ? <p role="status" className={styles.notice}>{notice}{download ? <a href={download}><Download size={16} /> Download CSV</a> : null}</p> : null}
    <section className={styles.filters} aria-label="Report filters">
      {tab === "Overview" ? <label>Report<select value={definition} disabled={busy} onChange={e => { const value = e.target.value as ReportDefinitionId; void navigate(() => setDefinition(value)); }}>{available.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label> : null}
      {tab !== "Library" ? <><label>Covered date<input type="date" value={date} disabled={busy} onChange={e => { const value = e.target.value; if (value && value !== date) void navigate(() => setDate(value)); }} /></label><fieldset><legend>Frequency</legend>{(["DAILY", "WEEKLY", "MONTHLY"] as ReportCadence[]).map(value => <button key={value} aria-pressed={cadence === value} disabled={busy} onClick={() => { if (value !== cadence) void navigate(() => setCadence(value)); }}>{value[0] + value.slice(1).toLowerCase()}</button>)}</fieldset></> : null}
      {tab === "Overview" && settings.locations.length ? <label>Location<select value={location} onChange={e => { const value = e.target.value; void navigate(() => setLocation(value)); }}><option value="">All locations</option>{settings.locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
      {tab === "Team Reports" ? <label>Person<select aria-label="Person" value={subject} onChange={e => { const value = e.target.value; void navigate(() => setSubject(value)); }}><option value="">All staff</option>{settings.people.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
    </section>
    {tab === "My Reports" || tab === "Team Reports" ? <section className={styles.filters} aria-label="Archive range"><label>Find reports<select aria-label="Find reports" value={rangeMode} onChange={e => { const value = e.target.value as "day" | "range"; void navigate(() => { setRangeMode(value); setHistoryFrom(""); setHistoryTo(""); }); }}><option value="day">Selected day or period</option><option value="range">Date range</option></select></label>{rangeMode === "range" ? <><label>Archive from<input type="date" value={historyFrom} onChange={e => { const value = e.target.value; void navigate(() => setHistoryFrom(value)); }} /></label><label>Archive through<input type="date" value={historyTo} onChange={e => { const value = e.target.value; void navigate(() => setHistoryTo(value)); }} /></label></> : null}{tab === "Team Reports" ? <label>Report status<select value={reportStatus} onChange={e => { const value = e.target.value; void navigate(() => setReportStatus(value)); }}><option value="ALL">All reports</option><option value="SUBMITTED">Submitted</option><option value="DRAFT">Draft</option><option value="NOT_SUBMITTED">Not submitted</option></select></label> : null}<label>Search saved reports<input aria-label="Search saved reports" placeholder="Name, report title or notes" maxLength={200} value={query} onChange={event => { const value = event.target.value; void navigate(() => setQuery(value)); }} /></label>{history?.nextCursor ? <button disabled={busy} onClick={() => void nextHistoryPage()}>Load older reports</button> : null}</section> : null}
    {(tab === "My Reports" || tab === "Team Reports") && expectations.length ? <section><h2>Reporting expectations</h2><div className={styles.tableWrap}><table><thead><tr><th>Person</th><th>Period</th><th>Due</th><th>Status</th></tr></thead><tbody>{expectations.filter(item => (!subject || item.subjectUserId === subject) && (rangeMode === "range" ? (!historyFrom || item.periodStart >= historyFrom) && (!historyTo || item.periodStart <= historyTo) : item.periodStart === (coverage?.periodStart ?? prepared?.content.startDate ?? date)) && item.cadence === cadence).map(item => <tr key={item.id}><td>{item.subject}{"sourceKind" in item && item.sourceKind === "WORKBOOK_DRAFT" ? <small>Workbook draft</small> : null}</td><td>{item.periodStart} · {item.cadence.toLowerCase()}</td><td>{new Date(item.dueAt).toLocaleString()}</td><td>{displayState(item.status)}{item.reason ? <small>{item.reason}</small> : null}</td></tr>)}</tbody></table></div></section> : null}
    {frozen ? <section className={styles.reportDetail}><header className={styles.sectionHeader}><div><h2>Saved report</h2><p>{new Date(frozen.generatedAt).toLocaleString()} · {displayState(frozen.quality)}</p></div><button aria-label="Close saved report" title="Close saved report" onClick={() => setFrozen(null)}><X size={18} /></button></header>{frozen.limitation ? <p className={styles.quality}>{frozen.limitation}</p> : null}<ReportTable items={frozen.rows} /></section> : null}
    {expectationsError ? <p role="alert">{expectationsError} <button onClick={() => setRefresh(value => value + 1)}>Retry reporting expectations</button></p> : null}
    {recordedDay ? <section className={styles.reportDetail}><header className={styles.sectionHeader}><div><h2>{recordedDay.subject.name}</h2><p>{recordedDay.content.startDate} · Recorded activity · Not a submitted report</p></div><button onClick={() => setRecordedDay(null)}>Close recorded activity</button></header><Evidence title="Today's focus" items={recordedDay.content.plannedFocus ?? []} /><Evidence title="Completed work" items={recordedDay.content.completed} /><Evidence title="Open work and blockers" items={recordedDay.content.carryover} /><Evidence title="Handoffs" items={recordedDay.content.handoffs ?? []} /><Evidence title="Recorded activity" items={recordedDay.content.activity} /><p className={styles.quality}>{recordedDay.content.sourceCoverage}</p></section> : null}
    {loading ? <p role="status" className={styles.empty}>Loading report...</p> : null}
    {!loading && revision ? <section className={styles.reportDetail}>
      <header className={styles.sectionHeader}><div><h2>{revision.subject}</h2><p>{revision.periodStart} · {revision.cadence.toLowerCase()} · Revision {revision.version} · {displayState(revision.status)}</p></div><button title="Close report" aria-label="Close report" onClick={() => setRevision(null)}><X size={18} /></button></header>
      {revision.revisions.length > 1 ? <label>Revision<select value={revision.id} onChange={e => void openRevision(e.target.value)}>{revision.revisions.map(item => <option key={item.id} value={item.id}>Revision {item.version} · {new Date(item.submittedAt).toLocaleString()}</option>)}</select></label> : null}
      {rows(evidence.workbookSections).map((section, index) => <Evidence key={index} title={String(section.title ?? "Workbook details")} items={rows(section.items).map(item => ({ ...item, id: item.id ?? item.sourceId, href: item.href ?? item.sourceHref }))} />)}<Evidence title="Today's focus" items={rows(evidence.plannedFocus ?? snapshot.plannedFocus)} /><Evidence title="Completed work" items={mergeReportEvidence(evidence.completed ?? snapshot.completedTasks, snapshot.dispatchCompleted)} /><Evidence title="Carryover and blockers" items={rows(evidence.carryover ?? snapshot.carryover)} />{rows(evidence.reopened).length ? <Evidence title="Reopened work" items={rows(evidence.reopened)} /> : null}<Evidence title="Recorded activity" items={rows(evidence.activity ?? snapshot.recordedActivity)} /><Evidence title="Handoffs" items={rows(evidence.handoffs ?? snapshot.handoffs)} />
      {typeof evidence.sourceCoverage === "string" ? <p className={styles.muted}>{evidence.sourceCoverage}</p> : null}
      <h3>Context</h3><p className={styles.prose}>{String(evidence.context || "No additional context.")}</p><h3>Next priorities</h3><p className={styles.prose}>{String(evidence.priorities || "No additional priorities.")}</p>
      {revision.correctionReason ? <p>Correction reason: {revision.correctionReason}</p> : null}
      {revision.reviews.map((item, index) => <p key={index} className={styles.reviewNote}>{displayState(item.action)} · {item.comment || "Reviewed"}</p>)}
      {revision.canReview ? <footer className={styles.reviewActions}><label>Review comment<textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={5000} /></label><div><button className={styles.primary} disabled={busy} onClick={() => void review("APPROVE")}><Check size={17} /> Mark reviewed</button><button disabled={busy || comment.trim().length < 10} onClick={() => void review("RETURN")}><ArrowLeft size={17} /> Request follow-up</button></div></footer> : null}
    </section> : null}
    {!loading && !revision && tab === "Overview" && live ? <>
      <header className={styles.sectionHeader}><div><h2>{available.find(item => item.id === definition)?.title}</h2><p>Updated {new Date(live.generatedAt).toLocaleString()} · {displayState(live.quality)}</p></div><div className={styles.toolbar}><label className={styles.search}><Search size={16} /><input aria-label="Search report records" placeholder="Search records" value={query} onChange={e => setQuery(e.target.value)} /></label><button title="Save view" aria-label="Save view" onClick={() => { setDialog("view"); setDialogText(""); }}><Save size={17} /></button>{canReview ? <><button title="Save snapshot" aria-label="Save snapshot" onClick={() => { setDialog("snapshot"); setDialogText(""); }}><FileText size={17} /></button><button title="Controlled export" aria-label="Controlled export" onClick={() => { setDialog("export"); setDialogText(""); }}><Download size={17} /></button></> : null}<button title="Schedule delivery" aria-label="Schedule delivery" onClick={() => { setDialog("schedule"); setDialogText(""); }}><CalendarDays size={17} /></button></div></header>
      {live.limitation ? <p className={styles.quality}>{live.limitation}</p> : null}
      <section className={styles.metrics} aria-label="Report measures">{live.metrics.map(item => <button key={item.code} aria-pressed={metric === item.code} onClick={() => setMetric(metric === item.code ? null : item.code)}><span>{item.label}</span><strong>{item.value === null ? "Unavailable" : `${item.value}${item.unit === "PERCENT" ? "%" : ""}`}</strong></button>)}</section>
      {live.quality === "UNAVAILABLE" ? <section className={styles.empty}><p>This live report is unavailable for the selected period. Saved reports may still be available.</p><button onClick={() => void navigate(() => setTab(canReview ? "Team Reports" : "My Reports"))}>Open saved reports</button></section> : <ReportTable items={liveRows} />}
    </> : null}
    {!loading && !revision && tab === "My Reports" && prepared ? <>
      <section className={styles.reportDetail}><header className={styles.sectionHeader}><div><h2>{userName}</h2><p>{prepared.content.startDate} through {new Date(`${prepared.content.endDate}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "America/Chicago" })} · {cadence.toLowerCase()}</p></div><span className={styles.badge}>{displayState(prepared.expectation)} · {prepared.calendar.toLowerCase()} calendar</span></header>
        <p className={styles.quality}>{prepared.content.sourceCoverage}</p>
        <Evidence title="Today's focus" items={prepared.content.plannedFocus ?? []} /><Evidence title="Handoffs" items={prepared.content.handoffs ?? []} /><Evidence title="Completed work" items={prepared.content.completed} /><Evidence title="Carryover and blockers" items={prepared.content.carryover} />{prepared.content.reopened?.length ? <Evidence title="Reopened work" items={prepared.content.reopened} /> : null}<Evidence title="Updates" items={prepared.content.activity} />
        <div className={styles.editor}>
          <div><label htmlFor="report-context">Context</label><textarea id="report-context" value={context} disabled={!prepared.writesEnabled || busy} maxLength={10000} onChange={e => { dirty.current = true; editNumber.current++; setSaveState("Unsaved changes"); setContext(e.target.value); }} /></div>
          <div><label htmlFor="report-priorities">Next priorities</label><textarea id="report-priorities" value={priorities} disabled={!prepared.writesEnabled || busy} maxLength={5000} onChange={e => { dirty.current = true; editNumber.current++; setSaveState("Unsaved changes"); setPriorities(e.target.value); }} /></div>
        </div>
        {prepared.latest ? <label>Reason for this correction<input maxLength={500} value={correctionReason} onChange={event => setCorrectionReason(event.target.value)} /></label> : null}
        <footer className={styles.submitBar}><label><input type="checkbox" checked={confirmed} disabled={!prepared.writesEnabled || busy} onChange={e => setConfirmed(e.target.checked)} /> I confirm this report is accurate.</label><span role="status">{saveState}</span>{saveState === "Could not save" ? <button aria-label="Retry saving draft" title="Retry saving draft" disabled={busy} onClick={() => void retrySave()}><RefreshCw size={17} /></button> : null}<button className={styles.primary} disabled={!confirmed || !prepared.writesEnabled || busy || Boolean(prepared.latest && !correctionReason.trim())} onClick={() => void submit()}><Send size={17} /> {busy ? "Submitting..." : "Submit report"}</button></footer>
        {!prepared.writesEnabled ? <p className={styles.quality}>Submission is awaiting rollout activation. Your history remains available.</p> : null}
      </section>
    </> : null}
    {!loading && !revision && tab === "My Reports" ? <HistoryTable failed={Boolean(error)} onShowAll={() => void navigate(() => { setRangeMode("range"); setHistoryFrom(""); setHistoryTo(""); setReportStatus("ALL"); setQuery(""); setSubject(""); })} history={history} onOpen={openRevision} /> : null}
    {!loading && !revision && tab === "Team Reports" ? <>{rangeMode === "day" && coverage ? <ReportingCoveragePanel coverage={coverage} reportStatus={reportStatus} busy={busy} onOpen={(person, revisionId) => void openPersonDay(person, revisionId)} /> : null}{reportStatus !== "NOT_SUBMITTED" ? <HistoryTable failed={Boolean(error)} onShowAll={() => void navigate(() => { setRangeMode("range"); setHistoryFrom(""); setHistoryTo(""); setReportStatus("ALL"); setQuery(""); })} history={history} onOpen={openRevision} team /> : null}{settings.calendarConfig ? <details><summary>Reporting calendar</summary><ReportingCalendarPanel calendar={settings.calendarConfig} today={today} /></details> : null}</> : null}
    {!loading && !revision && tab === "Library" && library ? <section><header className={styles.sectionHeader}><h2>Report library</h2><label className={styles.search}><Search size={16} /><input aria-label="Search report library" placeholder="Search reports" value={query} onChange={e => setQuery(e.target.value)} /></label></header><div className={styles.tableWrap}><table><thead><tr><th>Report</th><th>Area</th><th></th></tr></thead><tbody>{library.definitions.filter(item => `${item.title} ${item.area}`.toLowerCase().includes(query.toLowerCase())).map(item => <tr key={item.id}><td>{item.title}</td><td>{item.area}</td><td><button onClick={() => { setDefinition(item.id); setTab("Overview"); }} aria-label={`Open ${item.title}`}><ChevronRight size={17} /></button></td></tr>)}</tbody></table></div>
      <h3>Saved views</h3>{library.views.length ? library.views.map(view => <div className={styles.toolbar} key={view.id}><button className={styles.savedView} onClick={() => { const filters = object(view.filters); setDefinition(view.definitionId as ReportDefinitionId); setDate(String(filters.date ?? today)); setCadence(String(filters.cadence ?? "DAILY") as ReportCadence); setLocation(String(filters.locationId ?? "")); setQuery(String(filters.query ?? "")); setMetric(typeof filters.metric === "string" ? filters.metric : null); setLoading(true); setTab("Overview"); }}><FileText size={16} /> {view.name}<ChevronRight size={16} /></button><button title={view.favorite ? "Remove favorite" : "Add favorite"} aria-label={`${view.favorite ? "Remove favorite" : "Favorite"} ${view.name}`} aria-pressed={view.favorite} disabled={busy} onClick={() => void favoriteView(view.id, !view.favorite, view.favoriteVersion)}><Star size={17} fill={view.favorite ? "currentColor" : "none"} /></button></div>) : <p className={styles.muted}>No saved views.</p>}
      <h3>Scheduled deliveries</h3>{library.schedules.length ? library.schedules.map(schedule => <div className={styles.schedule} key={schedule.id}><strong>{reportDefinitions.find(item => item.id === schedule.definitionId)?.title}</strong><span>{schedule.cadence.toLowerCase()} · {schedule.enabled ? "Active" : "Inactive"} · {schedule.timezone}</span><label><input type="checkbox" checked={schedule.enabled} disabled={busy} onChange={e => void toggleSchedule(schedule.id, e.target.checked, schedule.version)} /> Delivery enabled</label>{schedule.jobs.map(job => <span key={job.id}>{displayState(job.status)}{job.lastError ? ` · ${job.lastError}` : ""}{job.status === "SUCCEEDED" ? <button disabled={busy} onClick={() => void openFrozen("delivery", job.id)}>Open delivery</button> : null}</span>)}</div>) : <p className={styles.muted}>No scheduled deliveries.</p>}
      {canReview ? library.schedules.filter(schedule => schedule.enabled).flatMap(schedule => schedule.jobs.filter(job => job.status === "DEAD_LETTER").map(job => <ReportingRecoveryPanel key={job.id} id={job.id} version={schedule.version} title={reportDefinitions.find(item => item.id === schedule.definitionId)?.title ?? "Report"} onRecovered={() => { setNotice("Recovery approved. Delivery is pending the next authorized worker run."); setRefresh(value => value + 1); }} />)) : null}
      <h3>Saved snapshots and exports</h3>{library.snapshots?.length ? library.snapshots.map(item => <div className={styles.schedule} key={item.id}><strong>{reportDefinitions.find(definition => definition.id === item.subjectId)?.title}</strong><span>{new Date(item.createdAt).toLocaleString()}</span>{item.recordType === "REPORT_SNAPSHOT" ? <button disabled={busy} onClick={() => void openFrozen("snapshot", item.id)}>Open snapshot</button> : <a href={`/api/reports/exports/${item.id}`}>Download controlled CSV</a>}</div>) : <p className={styles.muted}>No saved outputs.</p>}
    </section> : null}
    {dialog ? <div className={styles.backdrop}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="report-dialog-title" className={styles.dialog}><header className={styles.sectionHeader}><h2 id="report-dialog-title">{dialog === "view" ? "Save view" : dialog === "export" ? "Controlled export" : dialog === "snapshot" ? "Save snapshot" : "Schedule delivery"}</h2><button title="Cancel" aria-label="Cancel" onClick={() => setDialog(null)} disabled={busy}><X size={18} /></button></header>{dialog === "schedule" ? <p>{cadence.toLowerCase()} · America/Chicago · Secure delivery to your account. Saved inactive until scheduling is approved.</p> : <label>{dialog === "view" ? "View name" : "Business reason"}<textarea value={dialogText} onChange={e => setDialogText(e.target.value)} maxLength={dialog === "view" ? 100 : 500} /></label>}<button className={styles.primary} disabled={busy || (dialog !== "schedule" && dialogText.trim().length < (dialog === "view" ? 1 : 20))} onClick={() => void dialogAction()}><Save size={17} /> {busy ? "Saving..." : "Save"}</button></section></div> : null}
  </main>;
}

function mergeReportEvidence(...values: unknown[]) {
  const unique = new Map<string, Record<string, unknown>>();
  for (const value of values.flatMap(rows)) {
    const id = String(value.id ?? value.title ?? "").replace(/^task:/, "");
    unique.set(id, value);
  }
  return [...unique.values()];
}
function Evidence({ title, items }: { title: string; items: Record<string, unknown>[] | ReportRow[] }) {
  if (!items.length) return null;
  return <section className={styles.evidence}><h3>{title} <span>{items.length}</span></h3><ul>{items.map((item, index) => { const value = item as Record<string, unknown>; return <li key={String(value.id ?? index)}><strong>{String(value.title ?? "Recorded work")}</strong>{value.state || value.status ? <span>{displayState(String(value.state ?? value.status))}</span> : null}{typeof value.occurredAt === "string" ? <small>Observed {value.occurredAt}</small> : null}{value.detail || value.blockerReason ? <p>{String(value.detail ?? value.blockerReason)}</p> : null}{typeof value.href === "string" && value.href.startsWith("/") && !value.href.startsWith("//") ? <Link href={value.href}>Open record <ChevronRight size={14} /></Link> : null}</li>; })}</ul></section>;
}
function ReportTable({ items }: { items: ReportRow[] }) {
  return items.length ? <div className={styles.tableWrap}><table><thead><tr><th>Record</th><th>Status</th><th>Owner</th><th>Age</th><th></th></tr></thead><tbody>{items.map(row => <tr key={row.id}><td><strong>{row.title}</strong>{row.detail ? <small>{row.detail}</small> : null}</td><td>{displayState(row.state)}</td><td>{row.owner}</td><td>{row.ageDays === undefined ? "-" : `${row.ageDays} days`}</td><td><Link href={row.href} aria-label={`Open ${row.title}`}><ChevronRight size={18} /></Link></td></tr>)}</tbody></table></div> : <p className={styles.empty}>No records for this view.</p>;
}
function HistoryTable({ history, onOpen, team, onShowAll, failed }: { history: History | null; onOpen: (id: string) => Promise<void>; team?: boolean; onShowAll?: () => void; failed?: boolean }) {
  const items = [...(history?.rows ?? []), ...(history?.legacy ?? []), ...(history?.workbooks ?? [])].sort((a, b) => b.periodStart.localeCompare(a.periodStart) || a.id.localeCompare(b.id));
  if (!history) return <section aria-busy={!failed}><h2>{team ? "Team reports" : "Report history"}</h2><p role="status">{failed ? "The archive request failed. Retry above to load saved reports." : "Loading saved report history..."}</p></section>;
  return <section><h2>{team ? "Team reports" : "Report history"}</h2>{items.length ? <div className={styles.tableWrap}><table><thead><tr><th>Person</th><th>Covered period</th><th>Frequency</th><th>Status</th><th></th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.subject}{item.sourceKind === "WORKBOOK_DRAFT" ? <small>{item.title} · Workbook draft</small> : null}</td><td>{item.periodStart}</td><td>{item.cadence.toLowerCase()}</td><td>{displayState(item.status)}</td><td>{item.revisionId ? <button onClick={() => void onOpen((team ? item.latestRevisionId : item.revisionId)!)} aria-label={`Open ${item.subject} ${item.periodStart}`}><ChevronRight size={17} /></button> : "Draft"}</td></tr>)}</tbody></table></div> : <div className={styles.empty}><p>No saved reports match these filters.</p>{onShowAll ? <button onClick={onShowAll}>Browse all saved reports</button> : null}</div>}{history?.nextCursor ? <p className={styles.muted}>More report history is available.</p> : null}</section>;
}
