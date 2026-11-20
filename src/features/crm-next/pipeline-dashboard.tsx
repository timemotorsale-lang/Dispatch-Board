"use client";

import Link from "next/link";
import Papa from "papaparse";
import { LeadsInbox, PipelineBoard } from "./pipeline-workspaces";
import { PipelineAutomationWorkbench } from "./pipeline-automation-workbench";
import { PipelineForecast } from "./pipeline-forecast";
import { PipelineInsights } from "./pipeline-insights";
import { createContext, useContext, useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { PIPELINE_PERIODS, PIPELINE_PATHS, PIPELINE_SEQUENCES, PIPELINE_DISPOSITIONS, activePipelineRow, pipelineLabel, pipelineSignals, resolvePipelinePeriod, inPipelinePeriod, type PipelineRow, type PipelineWorkspace } from "@/lib/crm-pipeline";
import { applyPipelineView, defaultPipelineFilters, filterPipelineRelatedWork, filterPipelineRows, latestPipelineActivity, pipelineBasisDate, mergePipelinePages, pipelineWorkPriority, PIPELINE_VIEWS, type PipelineFilters } from "@/lib/crm-pipeline-views";
import { listAllowedUnifiedCrmOpportunityTransitions, type UnifiedCrmOpportunityStage } from "@/server/unified-crm/opportunity-lifecycle";
import { SALES_DOCUMENT_PATHWAYS } from "@/lib/sales-document-pathways";
import s from "./pipeline-dashboard.module.css";

const money = (value: number | null) => value === null ? "Unknown" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "No date";
const pathLabel = (value: string) => SALES_DOCUMENT_PATHWAYS[value as keyof typeof SALES_DOCUMENT_PATHWAYS] ?? pipelineLabel(value);
const tabNames = ["Leads", "Pipeline", "Activities", "Insights", "Automation"];
const startFilters = { ...defaultPipelineFilters, view: "continuity" };
const queueFilters = ["All records", "Needs attention", "Due today", "No due date", "Upcoming", "Sold", "Customer follow-up"] as const;
type QueueFilter = typeof queueFilters[number];
type BulkPreview = { action: "BULK"; operation: FormDataEntryValue; fields: Record<string, unknown>; rows: { id: string; expectedVersion: number }[] };
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className={s.field}><span>{label}</span>{children}</label>; }
function FutureField({ label = "Next action time · your local time", name = "nextActionDueAt", required = true }: { label?: string; name?: string; required?: boolean }) { return <Field label={label}><input name={name} type="datetime-local" required={required} /></Field>; }
function IntakeDialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={s.overlay} aria-labelledby="pipeline-intake-title" onCancel={event => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}
type FormContextValue = { submit: (action: string, record?: PipelineRow, extra?: Record<string, unknown>) => (event: FormEvent<HTMLFormElement>) => Promise<void>; chosen: PipelineRow | null; busy: boolean; canWrite: boolean; markDirty: () => void };
const FormContext = createContext<FormContextValue | null>(null);
function Form({ action, children, extra = {}, label = "Save", record }: { action: string; children: ReactNode; extra?: Record<string, unknown>; label?: string; record?: PipelineRow | null }) {
  const value = useContext(FormContext)!;
  return <form className={s.form} onChange={value.markDirty} onSubmit={value.submit(action, record ?? value.chosen ?? undefined, extra)}>{children}<button disabled={value.busy || !value.canWrite} className={s.primary}>{value.busy ? "Saving…" : label}</button></form>;
}

export function PipelineDashboard() {
  const [data, setData] = useState<PipelineWorkspace | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("Pipeline"), [filters, setFilters] = useState<PipelineFilters>(startFilters), [selected, setSelected] = useState<string | null>(null), [showIntake, setShowIntake] = useState(false), [panel, setPanel] = useState("Up next");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("All records");
  const [saved, setSaved] = useState<{ name: string; filters: PipelineFilters }[]>([]), [importRows, setImportRows] = useState<Record<string, unknown>[]>([]), [importResults, setImportResults] = useState<{ index: number; ok: boolean; error?: string }[]>([]);
  const [drill, setDrill] = useState<{ label: string; ids: string[] } | null>(null);
  const [matches, setMatches] = useState<{ id: string; name: string; phoneHint: string }[]>([]);
  const [reviewImport, setReviewImport] = useState<{ id: string; rows: { index: number; payload: Record<string, string>; error?: string }[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]), [bulkPreview, setBulkPreview] = useState<BulkPreview | null>(null), [bulkResults, setBulkResults] = useState<{ id: string; ok: boolean; error?: string }[]>([]);
  const [clock, setClock] = useState(() => Date.now()), [intakeKey, setIntakeKey] = useState("");
  const requestKeys = useRef(new Map<string, string>()), dirty = useRef(false), mounted = useRef(true), loadedPages = useRef(1), preferencesLoaded = useRef(false);
  const refreshVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    const pageCount = loadedPages.current;
    try {
      let combined: PipelineWorkspace | null = null, cursor: string | null | undefined;
      for (let page = 0; page < pageCount; page++) {
        const params = new URLSearchParams({ leadPage: String(page) });
        if (cursor) params.set("cursor", cursor); else if (page) params.set("skipOpportunities", "1");
        const response = await fetch(`/api/crm-next/pipeline?${params}`, { cache: "no-store" }); const result = await response.json();
        if (!response.ok) throw new Error(`${result.error}${result.reference ? ` Reference: ${result.reference}` : ""}`);
        const current = result as PipelineWorkspace;
        if (version !== refreshVersion.current) return;
        combined = mergePipelinePages(combined, current);
        cursor = current.nextCursor;
        if (!cursor && !current.moreLeads && !current.moreRelatedWork) break;
      }
      if (mounted.current && combined) {
        setData(combined);
        setError("");
        if (!preferencesLoaded.current) {
          preferencesLoaded.current = true;
          let preference: { tab?: string; filters?: Partial<PipelineFilters> } | null = null;
          try { preference = JSON.parse(localStorage.getItem(`crm-pipeline:queue-start:${combined.actorId}`) ?? "null"); } catch { /* Use the sales queue when a saved preference cannot be read. */ }
          const stored = Object.fromEntries(Object.entries(preference?.filters ?? {}).filter(([, value]) => typeof value === "string"));
          if (preference?.tab && tabNames.includes(preference.tab)) setTab(preference.tab);
          setFilters({ ...startFilters, owner: combined.canManage ? "all" : "mine", ...stored });
        }
      }
    }
    catch (e) { if (mounted.current && version === refreshVersion.current) setError(e instanceof Error ? e.message : "Pipeline is unavailable."); }
  }, []);
  useEffect(() => { mounted.current = true; const initial = setTimeout(() => void refresh(), 0); const timer = setInterval(() => { setClock(Date.now()); if (!dirty.current) void refresh(); }, 60000); return () => { mounted.current = false; clearTimeout(initial); clearInterval(timer); }; }, [refresh]);
  const command = async (body: Record<string, unknown>, record?: PipelineRow) => {
    setBusy(true); setError(""); setNotice("");
    const payload = { ...(record ? { id: record.id, expectedVersion: record.version } : {}), ...body }, fingerprint = JSON.stringify(payload);
    const key = requestKeys.current.get(fingerprint) ?? crypto.randomUUID(); requestKeys.current.set(fingerprint, key);
    try {
      const response = await fetch("/api/crm-next/pipeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, idempotencyKey: key }) });
      const result = await response.json(); if (!response.ok) throw new Error(`${result.error}${result.reference ? ` Reference: ${result.reference}` : ""}`);
      const partial = Array.isArray(result.results) && result.results.some((r: { ok: boolean }) => !r.ok);
      if (!partial) requestKeys.current.delete(fingerprint);
      dirty.current = false; setNotice(partial ? "Some records were saved. Review failed rows before retrying with the same references." : "Saved. Responsibility and history retained.");
      if (result.id) setSelected(result.id);
      await refresh(); return result;
    } catch (e) { setError(e instanceof Error ? e.message : "This request could not be saved. Your entries remain available."); return null; }
    finally { setBusy(false); }
  };
  const submit = (action: string, record?: PipelineRow, extra: Record<string, unknown> = {}) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget, values: Record<string, unknown> = Object.fromEntries(new FormData(form));
    for (const key of ["nextActionDueAt", "reviewAt"]) if (values[key]) values[key] = new Date(String(values[key])).toISOString();
    if ("amount" in values) { values.estimatedValueCents = values.amount === "" ? null : Math.round(Number(values.amount) * 100); delete values.amount; }
    const result = await command({ action, ...values, ...extra }, record);
    if (result && action === "CAPTURE") { form.reset(); setShowIntake(false); setTab("Leads"); }
  };
  const now = new Date(clock), range = (() => { try { return resolvePipelinePeriod(filters.period, now, filters.start, filters.end); } catch { return null; } })();
  const rows = data && range ? filterPipelineRows(data.rows, filters, data.actorId, now) : [];
  const reportingRows = data?.rows.filter(r => (filters.owner === "all" || (filters.owner === "mine" ? r.ownerUserId === data.actorId || r.pendingOwnerId === data.actorId : r.ownerUserId === filters.owner)) && (filters.pathway === "all" || r.pathway === filters.pathway) && (!filters.q || `${r.title} ${r.customerName} ${r.vehicle} ${r.opportunityNumber} ${r.sourceCode}`.toLowerCase().includes(filters.q.toLowerCase()))) ?? [];
  const visibleRows = drill ? reportingRows.filter(r => drill.ids.includes(r.id)) : rows;
  const operational = !drill && filters.view === "continuity" && ["Pipeline", "Activities"].includes(tab);
  const currentQueue = operational && filters.mode !== "board";
  const relatedWork = operational && data ? filterPipelineRelatedWork(data.relatedWork ?? [], filters, data.actorId) : [];
  const coveredTasks = new Set(relatedWork.flatMap(item => item.kind === "deal" && item.taskId ? [item.taskId] : []));
  const coveredCustomers = new Set(relatedWork.flatMap(item => item.customerId && (item.kind !== "customer" || item.taskId || item.dueAt) ? [item.customerId] : []));
  const today = resolvePipelinePeriod("today", now);
  const endOfToday = today.endExclusive;
  const nowIso = now.toISOString();
  const queue = [
    ...visibleRows.map(row => {
      const restricted = row.contactReview || (row.disposition === "DO_NOT_CONTACT" ? "Internal review · do not contact" : "");
      const needsReview = ["WAITING", "NURTURE"].includes(row.disposition);
      const task = restricted ? undefined : row.tasks.filter(item => !["COMPLETED", "CANCELLED"].includes(item.status)).sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
      const appointment = restricted ? undefined : row.appointments?.filter(item => item.status === "SCHEDULED" && item.attendance !== "NO_SHOW" && item.startsAt && item.startsAt >= nowIso)
        .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""))[0];
      const planned = pipelineBasisDate(row, "due");
      const fallback = row.dealStatus === "SOLD" ? "Review paperwork and delivery" : "Set next action";
      const scheduled = [
        { dueAt: planned, label: row.nextActionLabel || fallback },
        ...(!needsReview && task ? [{ dueAt: task.dueAt, label: task.title }] : []),
        ...(!needsReview && appointment ? [{ dueAt: appointment.startsAt, label: appointment.title }] : []),
      ].sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"))[0];
      const dueAt = scheduled.dueAt;
      const nextAction = restricted || (needsReview ? row.nextActionLabel || "Review waiting commitment" : scheduled.label);
      const sold = row.dealStatus === "SOLD" || row.stage === "WON";
      const completed = !task && !row.exceptions.length && (row.dealReviewState === "CLOSED" || row.dealStatus === "COMPLETED" || row.disposition === "ARCHIVED" || sold && !row.dealId && !dueAt);
      const attention = Boolean(restricted) || row.exceptions.length > 0 || pipelineSignals(row, now).length > 0;
      const activity = latestPipelineActivity(row);
      return { kind: "opportunity" as const, row, dueAt, nextAction, sold, activity, updatedAt: row.updatedAt, priority: pipelineWorkPriority(dueAt, attention, completed, endOfToday, nowIso) };
    }),
    ...relatedWork.filter(row => row.kind !== "customer" ||
      (row.taskId ? !coveredTasks.has(row.taskId) : row.dueAt || !row.customerId || !coveredCustomers.has(row.customerId))).map(row => ({
      kind: "related" as const, row, dueAt: row.dueAt, nextAction: row.nextAction, sold: row.sold, activity: row.activity, updatedAt: row.updatedAt,
      priority: pipelineWorkPriority(row.dueAt, !row.ownerId || row.sold === true && !row.completed, row.completed ?? false, endOfToday, nowIso),
    })),
  ].sort((a, b) => a.priority - b.priority || (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") || b.updatedAt.localeCompare(a.updatedAt) || a.row.id.localeCompare(b.row.id));
  function matchesQueue(item: typeof queue[number], focus: QueueFilter) {
    if (focus === "Needs attention") return item.priority === 0;
    if (focus === "Due today") return item.priority < 4 && inPipelinePeriod(item.dueAt, today);
    if (focus === "No due date") return !item.dueAt && item.priority < 4;
    if (focus === "Upcoming") return item.priority < 4 && Boolean(item.dueAt && item.dueAt >= endOfToday);
    if (focus === "Sold") return Boolean(item.sold);
    if (focus === "Customer follow-up") return item.kind === "related" && item.row.kind === "customer" && Boolean(item.row.dueAt);
    return true;
  }
  const visibleWork = currentQueue ? queue.filter(item => matchesQueue(item, queueFilter)) : [];
  const actionableRows = currentQueue ? visibleWork.flatMap(item => item.kind === "opportunity" ? [item.row] : []) : visibleRows;
  const bulkTargets = actionableRows.filter(row => selectedIds.includes(row.id));
  const reviewedBulk = bulkPreview && bulkPreview.rows.length === bulkTargets.length &&
    bulkPreview.rows.every(target => bulkTargets.some(row => row.id === target.id && row.version === target.expectedVersion)) ? bulkPreview : null;
  const exportRows = () => {
    const records = currentQueue ? visibleWork.map(item => item.kind === "opportunity"
      ? { Customer: item.row.customerName, Reference: item.row.opportunityNumber, Vehicle: item.row.vehicle, Stage: pipelineLabel(item.row.dealStatus ?? item.row.stage), Pathway: pathLabel(item.row.pathway), Owner: item.row.ownerName, "Next action": item.nextAction, "Due UTC": item.dueAt ?? "", "Estimated USD": item.row.estimatedValueCents === null ? "" : item.row.estimatedValueCents / 100 }
      : { Customer: item.row.name, Reference: item.row.reference, Vehicle: item.row.vehicle, Stage: item.row.stage, Pathway: item.row.pathway ? pathLabel(item.row.pathway) : "", Owner: item.row.ownerName, "Next action": item.nextAction, "Due UTC": item.dueAt ?? "", "Estimated USD": "" })
      : visibleRows.map(row => ({ Customer: row.customerName, Reference: row.opportunityNumber, Vehicle: row.vehicle, Stage: pipelineLabel(row.stage), Pathway: pathLabel(row.pathway), Owner: row.ownerName, "Next action": row.contactReview || row.nextActionLabel || "", "Due UTC": row.nextActionDueAt ?? "", "Estimated USD": row.estimatedValueCents === null ? "" : row.estimatedValueCents / 100 }));
    const csv = Papa.unparse(records, { escapeFormulae: true });
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "time-motor-sales-pipeline.csv";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const legacyLeads = data && range ? data.unlinkedLeads.filter(l => {
    if (filters.owner === "mine" && l.ownerUserId !== data.actorId || filters.owner !== "mine" && filters.owner !== "all" && l.ownerUserId !== filters.owner) return false;
    if (filters.pathway !== "all" || filters.q && !`${l.title} ${l.sourceCode}`.toLowerCase().includes(filters.q.toLowerCase())) return false;
    if (filters.view === "archived") return ["WON", "LOST"].includes(l.stage ?? "");
    if (filters.basis === "received") return inPipelinePeriod(l.createdAt, range);
    if (filters.basis === "due") return !["WON", "LOST"].includes(l.stage ?? "") && (inPipelinePeriod(l.nextActionAt, range) || ["today", "this_week", "this_month"].includes(filters.period) && l.nextActionAt < range.start);
    return false;
  }) : [];
  const chosen = data?.rows.find(r => r.id === selected) ?? null;
  const signals = chosen ? pipelineSignals(chosen, now) : []; const canWork = chosen && (activePipelineRow(chosen) || chosen.stage === "WON" && Boolean(chosen.dealId));
  const change = (key: keyof PipelineFilters, value: string) => { setDrill(null); setBulkPreview(null); setFilters(f => ({ ...f, [key]: value })); };
  const resetQueue = () => {
    if (dirty.current && !window.confirm("Leave the unsaved form before returning to the sales work queue?")) return;
    dirty.current = false;
    setTab("Pipeline");
    setDrill(null);
    setBulkPreview(null);
    setQueueFilter("All records");
    setFilters({ ...startFilters, owner: data?.canManage ? "all" : "mine" });
  };
  const choose = (id: string) => { if (dirty.current && !window.confirm("Leave the unsaved form on this opportunity?")) return; dirty.current = false; setSelected(id); setPanel("Up next"); };
  const pickWorkspaceRecord = (id: string, section = "Up next") => { if (dirty.current && !window.confirm("Leave the unsaved form on this opportunity?")) return; dirty.current = false; setSelected(id); setPanel(section); setTab("Pipeline"); };
  const drillInto = (label: string, records: PipelineRow[]) => { if (dirty.current && !window.confirm("Leave the unsaved form?")) return; dirty.current = false; setDrill({ label, ids: records.map(r => r.id) }); setFilters(f => ({ ...f, mode: "list" })); setTab("Pipeline"); setSelected(null); };
  const readSaved = () => { try { setSaved(JSON.parse(localStorage.getItem(`crm-pipeline:views:${data?.actorId}`) ?? "[]")); } catch { setSaved([]); } };
  const loadImportReview = async (id: string) => {
    const response = await fetch(`/api/crm-next/pipeline?importId=${encodeURIComponent(id)}`, { cache: "no-store" }), result = await response.json();
    if (!response.ok) { setError(result.error); return; } setReviewImport(result);
  };
  const stats = data && range ? {
    open: reportingRows.filter(activePipelineRow).length,
    overdue: reportingRows.filter(r => activePipelineRow(r) && pipelineBasisDate(r, "due") && pipelineBasisDate(r, "due")! < now.toISOString()).length,
    missing: reportingRows.filter(r => activePipelineRow(r) && !r.nextActionDueAt).length,
    attention: reportingRows.filter(r => r.exceptions.length || pipelineSignals(r, now).length).length,
    known: visibleRows.filter(r => r.estimatedValueCents !== null).reduce((sum, r) => sum + r.estimatedValueCents!, 0),
    unknown: visibleRows.filter(r => r.estimatedValueCents === null).length
  } : null;
  const toggleRecord = (id: string, checked: boolean) => {
    setSelectedIds(ids => checked ? [...new Set([...ids, id])].slice(-25) : ids.filter(value => value !== id));
    setBulkPreview(null);
  };
  const queueTable = <div className={s.queueTable}><table>
    <thead><tr><th>Customer / record</th><th>Stage / owner</th><th>Next action</th><th>Latest activity</th><th>Open</th></tr></thead>
    <tbody>{visibleWork.map(item => {
      const row = item.kind === "opportunity" ? item.row : null;
      const related = item.kind === "related" ? item.row : null;
      const name = row?.customerName ?? related?.name ?? "";
      const stage = row ? row.dealReviewState === "UNWIND_PENDING" ? "Unwind review"
        : row.dealReviewState === "DELIVERED_FUNDING_PENDING" ? "Awaiting funding"
        : row.dealStatus === "SOLD" ? row.dealReviewState === "CLOSED" ? "Sold · finalized" : "Sold · paperwork pending"
        : pipelineLabel(row.stage) : related?.stage;
      const kind = row ? row.dealId ? "Deal" : row.stage === "NEW_INQUIRY" ? "Lead" : "Opportunity" : pipelineLabel(related?.kind ?? "");
      const customerId = row?.customerId ?? related?.customerId;
      const customerHref = customerId && related?.kind !== "deal" ? `/crm-next/customers/${encodeURIComponent(customerId)}` : undefined;
      const dealHref = row?.dealHref;
      return <tr key={`${item.kind}:${related?.kind ?? ""}:${item.row.id}`} className={row && selected === row.id ? s.selected : undefined}>
        <td data-label="Customer / record">
          {row && <input type="checkbox" aria-label={`Select ${name}`} checked={selectedIds.includes(row.id)} onChange={event => toggleRecord(row.id, event.target.checked)} />}
          {row ? <button className={s.textButton} onClick={() => choose(row.id)}>{name}</button> : <strong>{name}</strong>}
          <small>{kind} · {row?.opportunityNumber ?? related?.reference}{row?.sourceCode ? ` · ${row.sourceCode}` : ""}</small>
          {(row?.vehicle || related?.vehicle) && <small>{row?.vehicle || related?.vehicle}</small>}
        </td>
        <td data-label="Stage / owner">
          <span className={item.priority === 4 ? s.complete : item.priority === 0 ? s.amber : s.badge}>{stage}</span>
          {row && row.disposition !== "ACTIVE" && <small>{pipelineLabel(row.disposition)}</small>}
          <small>{row?.ownerName ?? related?.ownerName}{row?.pendingOwnerId ? " · Handoff pending" : ""}</small>
        </td>
        <td data-label="Next action">
          <strong>{item.nextAction}</strong>
          <small className={item.dueAt && item.priority < 4 && item.dueAt < nowIso ? s.attention : undefined}>{item.dueAt ? `${item.dueAt < nowIso && item.priority < 4 ? "Overdue · " : ""}${date(item.dueAt)}` : item.priority === 4 ? "Completed work" : "No due date"}</small>
          {tab === "Activities" && row && !row.contactReview && row.disposition !== "DO_NOT_CONTACT" && row.tasks.filter(task => !["COMPLETED", "CANCELLED"].includes(task.status) && !(task.title === item.nextAction && task.dueAt === item.dueAt)).map(task =>
            <button className={s.textButton} key={task.id} onClick={() => choose(row.id)}>{task.title} · {date(task.dueAt)}</button>
          )}
          {row && item.priority === 0 && <small>{[...new Set([...pipelineSignals(row, now).map(([code]) => code), ...row.exceptions.map(e => e.code)])].slice(0, 3).map(pipelineLabel).join(" · ")}</small>}
        </td>
        <td data-label="Latest activity">
          {item.activity ? <><span>{item.activity.label}</span><small>{date(item.activity.at)}</small></> : <small>Updated {date(item.updatedAt)}</small>}
          {row && item.activity && <button className={s.textButton} onClick={() => pickWorkspaceRecord(row.id, "Activity")}>View activity<span className={s.srOnly}> for {name}</span></button>}
        </td>
        <td data-label="Open">
          {row ? <button aria-label={`Work ${name}`} onClick={() => choose(row.id)}>Work →</button> : related && <Link href={related.href}>{related.kind === "deal" ? "Open deal" : related.href.startsWith("/tasks/") ? "Open task" : "Open customer"}</Link>}
          {dealHref && <small><Link href={dealHref}>Open deal</Link></small>}
          {customerHref && (row || related?.href.startsWith("/tasks/")) && <small><Link href={customerHref}>Customer history</Link></small>}
          {related?.kind === "lead" && !related.completed && data?.canWrite && <small><button className={s.textButton} type="button" disabled={busy} onClick={async () => {
            if (dirty.current && !window.confirm("Leave the unsaved form before opening this lead?")) return;
            const result = await command({ action: "ADOPT_LEAD", leadId: related.id, pathway: "retail-sale" });
            if (result?.id) { setPanel("Up next"); setTab("Pipeline"); }
          }}>Open as opportunity</button></small>}
        </td>
      </tr>;
    })}</tbody>
  </table></div>;
  return <FormContext.Provider value={{ submit, chosen, busy, canWrite: data?.canWrite ?? false, markDirty: () => { dirty.current = true; } }}><section className={s.workspace} aria-label="Pipeline operations">
    <header className={s.header}><div><h1>{tab === "Leads" ? "Leads inbox" : tab === "Insights" ? "Revenue insights" : tab === "Automation" ? "Automation" : tab === "Activities" ? "Activities" : "Pipeline"}</h1><p>{tab === "Leads" ? "Capture, review, and qualify every inquiry." : tab === "Automation" ? "Make repeatable work visible, governed, and accountable." : tab === "Insights" ? "Find the next management action in your numbers." : "See who owns each relationship, what happened, and what’s due next."}</p></div><div className={s.buttons}><Link href="/crm-next/deals">Deals</Link><button onClick={() => void refresh()} disabled={busy}>Refresh</button><button className={s.primary} disabled={!data?.canWrite} onClick={() => { if (dirty.current && !window.confirm("Leave the unsaved changes before capturing another inquiry?")) return; dirty.current = false; setIntakeKey(crypto.randomUUID()); setMatches([]); setShowIntake(true); }}>+ Lead</button>{data && <details className={s.routines}><summary>Operating routines</summary><div aria-label="Operating routines"><button onClick={() => { if (dirty.current && !window.confirm("Leave the unsaved changes before changing work views?")) return; dirty.current = false; setDrill(null); setTab("Activities"); setFilters(f => ({ ...f, owner: "mine", view: "all", basis: "due", period: "today", mode: "queue" })); }}>My work today</button>{data.canManage && <button onClick={() => { if (dirty.current && !window.confirm("Leave the unsaved changes before changing work views?")) return; dirty.current = false; setDrill(null); setTab("Pipeline"); setFilters(f => ({ ...f, owner: "all", view: "exceptions", mode: "list" })); }}>Manager daily review</button>}<button onClick={() => { if (dirty.current && !window.confirm("Leave the unsaved changes before changing work views?")) return; dirty.current = false; setDrill(null); setTab("Pipeline"); setFilters(f => applyPipelineView(f, "close_week")); }}>Close this week</button><button onClick={() => { if (dirty.current && !window.confirm("Leave the unsaved changes before changing work views?")) return; dirty.current = false; setDrill(null); setTab("Insights"); setFilters(f => ({ ...f, period: "this_month" })); }}>Month review</button><button onClick={() => { try { localStorage.setItem(`crm-pipeline:queue-start:${data.actorId}`, JSON.stringify({ tab, filters })); setNotice("Your starting workspace is saved on this browser."); } catch { setError("The browser could not save your preference. The current workspace remains available."); } }}>Use this as my start view</button></div></details>}</div></header>
    <nav className={s.tabs} aria-label="Pipeline areas">{tabNames.map(name => <button key={name} aria-pressed={tab === name} onClick={() => { if (dirty.current && !window.confirm("Leave the unsaved changes in this workspace?")) return; dirty.current = false; setTab(name); }}>{name}</button>)}</nav>
    {error && <div role="alert" className={s.error}>{error} <button onClick={() => void refresh()}>Refresh records</button></div>}
    {notice && <p role="status" className={s.notice}>{notice} <button aria-label="Dismiss notice" onClick={() => setNotice("")}>×</button></p>}

    {!data && !error && <p role="status">Loading authorized pipeline records…</p>}
    {data && <>
      {!currentQueue && <div className={s.queueReturn}><button type="button" onClick={resetQueue}>Back to sales work queue</button></div>}
      <div className={s.toolbar}>
        <Field label="Work view"><select value={filters.view} onChange={e => { setDrill(null); setFilters(f => ({ ...applyPipelineView(f, e.target.value), ...(e.target.value === "unassigned" && data.canManage ? { owner: "all" } : {}) })); }}>{Object.entries(PIPELINE_VIEWS).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></Field>
        <Field label="Owner"><select value={filters.owner} onChange={e => change("owner", e.target.value)}><option value="mine">My work</option>{data.canManage && <option value="all">Team work</option>}{data.owners.map(o => <option value={o.id} key={o.id}>{o.name}</option>)}</select></Field>
        <Field label="Period"><select value={operational ? "ongoing" : filters.period} onChange={e => { setDrill(null); setFilters(f => ({ ...f, period: e.target.value, view: "all" })); }}>{operational && <option value="ongoing">All dates</option>}{Object.entries(PIPELINE_PERIODS).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></Field>
        <Field label="Date basis"><select value={filters.basis} onChange={e => { setDrill(null); setFilters(f => ({ ...f, basis: e.target.value, view: operational ? "all" : f.view })); }}>{[["due", "Next action due"], ["received", "Inquiry received"], ["close", "Expected close"], ["sold", "Actually sold"], ["completed", "Completed"]].map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></Field>
        <Field label="Search"><input value={filters.q} onChange={e => change("q", e.target.value)} placeholder="Customer, vehicle, reference…" /></Field>
        <details className={s.filters}><summary>Filters and saved views</summary><div>
          <Field label="Revenue pathway"><select value={filters.pathway} onChange={e => change("pathway", e.target.value)}><option value="all">All pathways</option>{PIPELINE_PATHS.map(path => <option key={path} value={path}>{pathLabel(path)}</option>)}</select></Field>
          <Field label="Historical view"><select value={filters.history} onChange={e => change("history", e.target.value)}><option value="current">Current status of selected cohort</option><option value="plan">Closing plan at period end · recorded history</option></select></Field>
          <button onClick={readSaved}>Load my saved views</button>
          {saved.map((v, index) => <div key={v.name}><button onClick={() => { setDrill(null); setFilters(v.filters); }}>{v.name}</button><button aria-label={`Delete view ${v.name}`} onClick={() => { const next = saved.filter((_, i) => i !== index); setSaved(next); localStorage.setItem(`crm-pipeline:views:${data.actorId}`, JSON.stringify(next)); }}>Remove</button></div>)}
          <form onSubmit={e => { e.preventDefault(); const name = String(new FormData(e.currentTarget).get("name") ?? "").trim(); if (!name) return; const next = [...saved.filter(v => v.name !== name), { name, filters }].slice(-20); setSaved(next); localStorage.setItem(`crm-pipeline:views:${data.actorId}`, JSON.stringify(next)); setNotice("Personal view saved on this browser."); }}><Field label="View name"><input name="name" maxLength={60} required /></Field><button>Save current view</button></form>
        </div></details>
      </div>
      {!operational && filters.period === "custom" && <div className={s.buttons}><Field label="Start date"><input type="date" value={filters.start} onChange={e => change("start", e.target.value)} /></Field><Field label="End date"><input type="date" value={filters.end} onChange={e => change("end", e.target.value)} /></Field></div>}
      {drill && ["Pipeline", "Leads", "Activities"].includes(tab) && <p className={s.notice}>Showing {drill.ids.length} records from Insights: {drill.label}. <button onClick={() => setDrill(null)}>Return to filtered workspace</button></p>}
      <p className={s.meta}>{operational ? "All dates · America/Chicago" : range ? `${range.startDate} – ${range.endDate} · ${range.timezone}` : "Choose valid calendar boundaries."} · {data.scope} · Updated {date(data.generatedAt)}.</p>
      {clock - Date.parse(data.generatedAt) > 120000 && <p role="status" className={s.warning}>Records are over two minutes old. Refresh before acting. Unsaved forms are preserved.</p>}
      {data.truncated && <p className={s.warning}>More authorized records are available. Counts and search cover loaded records. <button disabled={busy} onClick={async () => { loadedPages.current++; setBusy(true); await refresh(); setBusy(false); }}>Load more records</button></p>}
      {currentQueue && <div className={s.queueFilters} role="group" aria-label="Sales work queue filters">
        {queueFilters.map(focus => <button key={focus} type="button" aria-pressed={queueFilter === focus} onClick={() => { setQueueFilter(focus); setBulkPreview(null); }}>{focus} <strong>{queue.filter(item => matchesQueue(item, focus)).length}</strong></button>)}
      </div>}
      {filters.history === "plan" && <p className={s.warning}>Period-end closing plans use recorded change history. Records without sufficient evidence are excluded; this is not a complete historical snapshot.</p>}
      {stats && !currentQueue && !["Insights", "Automation", "Leads"].includes(tab) && filters.mode !== "board" && <div className={s.metrics}>{[[stats.open, "Open opportunities"], [stats.overdue, "Overdue"], [stats.missing, "Missing next date"], [stats.attention, "Need attention"], [stats.unknown === visibleRows.length && visibleRows.length > 0 ? "Unknown" : money(stats.known), "Visible estimated value"]].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>}
      {!!data.importBatches?.length && tab !== "Automation" && <p className={s.warning}>Retained imports need review. Failed rows remain assigned and recoverable. <button onClick={() => setTab("Automation")}>Review retained imports</button></p>}
      {["Pipeline", "Leads", "Activities"].includes(tab) && <>
        {tab === "Leads" && legacyLeads.length > 0 && <details className={s.legacy}><summary>{legacyLeads.length} existing leads not yet linked to an opportunity</summary>{legacyLeads.map(l => <div key={l.id}><span>{l.title} · {l.sourceCode} · Next action {date(l.nextActionAt)}</span><Link href={`/crm-next/customers/${encodeURIComponent(l.customerId)}`}>Customer history</Link>{!["WON", "LOST"].includes(l.stage ?? "") && <button disabled={busy} onClick={() => void command({ action: "ADOPT_LEAD", leadId: l.id, pathway: "retail-sale" })}>Open in pipeline</button>}</div>)}</details>}
        <div className={s.buttons}><strong>{currentQueue ? visibleWork.length : visibleRows.length} results</strong>{(tab === "Leads" ? [] : ["queue", "list", "board"]).map(mode => <button aria-pressed={filters.mode === mode} onClick={() => { change("mode", mode); if (mode === "board") setTab("Pipeline"); }} key={mode}>{pipelineLabel(mode)}</button>)}<button onClick={exportRows}>Export visible rows</button></div>
        <details className={s.bulkTools}><summary>Bulk tasks and handoffs · {selectedIds.length} selected</summary><p>Select up to 25 visible rows. Review the exact operation before applying it. Each record keeps its own permission and version checks.</p>
          <label><input type="checkbox" checked={actionableRows.length > 0 && actionableRows.slice(0, 25).every(r => selectedIds.includes(r.id))} onChange={e => { setSelectedIds(e.target.checked ? actionableRows.slice(0, 25).map(r => r.id) : []); setBulkPreview(null); }} /> Select first 25 visible opportunities</label>
          <form className={s.form} onChange={() => setBulkPreview(null)} onSubmit={e => { e.preventDefault(); const fields: Record<string, unknown> = Object.fromEntries(new FormData(e.currentTarget)), operation = fields.operation; delete fields.operation; if (fields.nextActionDueAt) fields.nextActionDueAt = new Date(String(fields.nextActionDueAt)).toISOString(); const targets = bulkTargets; if (typeof operation !== "string") return; if (!targets.length || targets.length > 25) { setError("Select between 1 and 25 visible opportunities."); return; } setBulkPreview({ action: "BULK", operation, fields, rows: targets.map(r => ({ id: r.id, expectedVersion: r.version })) }); }}>
            <Field label="Bulk operation"><select name="operation"><option value="FOLLOW_UP">Schedule internal follow-ups</option>{data.canManage && <option value="REQUEST_HANDOFF">Request ownership handoffs</option>}</select></Field>
            <Field label="Bulk next action"><input name="nextActionLabel" /></Field><FutureField required={false} />
            {data.canManage && <Field label="Bulk receiving owner"><select name="ownerUserId">{data.owners.map(o => <option value={o.id} key={o.id}>{o.name}</option>)}</select></Field>}
            <Field label="Bulk reason"><input name="reason" required /></Field><button disabled={busy}>Preview selected work</button>
          </form>
          {reviewedBulk && <><p>Review {pipelineLabel(String(reviewedBulk.operation))} for {reviewedBulk.rows.length} records: {bulkTargets.map(r => r.customerName).join(", ")}.</p><dl>{Object.entries(reviewedBulk.fields as Record<string, string>).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt>{({ nextActionLabel: "Next action", nextActionDueAt: "Due · store time", ownerUserId: "Receiving owner", reason: "Reason" } as Record<string, string>)[key] ?? pipelineLabel(key)}</dt><dd>{key === "nextActionDueAt" ? date(value) : key === "ownerUserId" ? data.owners.find(o => o.id === value)?.name ?? "Review owner" : value}</dd></div>)}</dl><button disabled={busy} onClick={async () => { const result = await command(reviewedBulk); if (result) { setBulkResults(result.results); setSelectedIds(result.results.filter((r: { ok: boolean }) => !r.ok).map((r: { id: string }) => r.id)); setBulkPreview(null); } }}>Apply reviewed bulk work</button></>}
          {bulkResults.map(r => <p key={r.id}>{data.rows.find(row => row.id === r.id)?.customerName ?? "Record"}: {r.ok ? "Saved" : r.error}</p>)}
        </details>
        <div className={`${s.layout} ${chosen ? s.withPanel : ""}`}>
          <div className={s.results}>
            {tab === "Leads" ? <LeadsInbox rows={visibleRows} now={now} onPick={pickWorkspaceRecord} onReview={r => void command({ action: "ACKNOWLEDGE_INQUIRY", reason: "Reviewed inquiry and its ownership and next activity" }, r)} busy={busy} canWrite={data.canWrite} onQueue={view => { setDrill(null); setFilters(f => ({ ...f, view: view === "archived" ? "archived" : "all" })); }} selectedIds={selectedIds} onToggle={(id, checked) => { setSelectedIds(ids => checked ? [...new Set([...ids, id])].slice(-25) : ids.filter(v => v !== id)); setBulkPreview(null); }} /> : filters.mode === "board" ? <PipelineBoard rows={visibleRows} now={now} onPick={pickWorkspaceRecord} onClosed={() => { setDrill(null); setFilters(f => ({ ...f, view: "archived", mode: "list" })); }} />
              : currentQueue ? queueTable : <div className={s.tableScroll}><table><thead><tr><th>Customer / vehicle</th><th>Stage / pathway</th><th>Next action</th><th>Owner</th><th>Due</th><th>Open</th></tr></thead><tbody>{visibleRows.map(r => {
                const warnings = pipelineSignals(r, now), due = pipelineBasisDate(r, filters.basis);
                return <tr key={r.id} className={selected === r.id ? s.selected : ""}><td><input type="checkbox" aria-label={`Select ${r.customerName}`} checked={selectedIds.includes(r.id)} onChange={e => { setSelectedIds(ids => e.target.checked ? [...ids, r.id].slice(-25) : ids.filter(id => id !== r.id)); setBulkPreview(null); }} /> <button className={s.textButton} onClick={() => choose(r.id)}>{r.customerName}</button> <span className={s.badge}>{r.temperature}</span><small>{r.vehicle || r.title}</small><small>{r.opportunityNumber} · {r.sourceCode}</small></td><td><span className={r.dealReviewState === "CLOSED" && r.dealStatus === "SOLD" ? s.complete : r.dealStatus === "SOLD" || r.dealReviewState === "UNWIND_PENDING" ? s.amber : s.badge}>{r.dealReviewState === "UNWIND_PENDING" ? "Unwind review" : r.dealStatus === "SOLD" ? r.dealReviewState === "CLOSED" ? "Sold · documentation complete" : "Sold · paperwork pending" : pipelineLabel(r.stage)}</span><small>{pathLabel(r.pathway)} · {pipelineLabel(r.disposition)}</small></td><td>{r.contactReview || (tab === "Activities" ? r.tasks.filter(t => !["COMPLETED", "CANCELLED"].includes(t.status)).map(t => <button key={t.id} className={s.textButton} onClick={() => choose(r.id)}>{t.title} · {date(t.dueAt)}</button>) : r.nextActionLabel || "Set next action")}{warnings.length > 0 && <small className={s.attention}>{warnings.map(([code]) => pipelineLabel(code)).join(" · ")}</small>}</td><td>{r.ownerName}{r.pendingOwnerId && <small>Handoff pending</small>}</td><td>{date(due)}</td><td><button aria-label={`Work ${r.customerName}`} onClick={() => choose(r.id)}>Work →</button></td></tr>;
              })}</tbody></table></div>}
            {!(currentQueue ? visibleWork.length : visibleRows.length) && <p className={s.empty}>No records match this view.</p>}
          </div>
          {chosen && <aside key={chosen.id} className={s.panel} aria-label={`Opportunity ${chosen.customerName}`} onChange={() => { dirty.current = true; }}>
            <header className={s.header}><div><h2>{chosen.customerName}</h2><p>{chosen.vehicle || chosen.title}</p><small>{chosen.opportunityNumber} · Version {chosen.version}</small></div><button aria-label="Close opportunity panel" onClick={() => { if (!dirty.current || window.confirm("Leave this unsaved form?")) { dirty.current = false; setSelected(null); } }}>×</button></header>
            <nav className={s.panelTabs} aria-label="Opportunity sections">{["Up next", "Details", "Activity", "Documents", "Sequence", "Forecast"].map(name => <button key={name} aria-pressed={panel === name} onClick={() => { if (dirty.current && !window.confirm("Leave the unsaved form in this section?")) return; dirty.current = false; setPanel(name); }}>{name}</button>)}</nav>
            {panel === "Up next" && <>
              <div className={s.next}><strong>UP NEXT</strong><h3>{chosen.contactReview || chosen.nextActionLabel || "Set a dated next action"}</h3><p>{chosen.ownerName} · {date(chosen.nextActionDueAt)}</p><p>{chosen.contact?.phone || "Phone needs review"} · {chosen.contact?.email || "Email not provided"}</p></div>
              {signals.map(([code, reason]) => <p className={s.warning} key={code}>{reason}</p>)}
              {chosen.exceptions.filter(e => !signals.some(([code]) => code === e.code)).map(e => <p className={s.warning} key={e.id}>{e.reason} · {e.queue} · Review {date(e.reviewDueAt)}</p>)}
              {chosen.exceptions.filter(e => ["INBOUND_REVIEW", "DELIVERY_REVIEW", "MISSED_APPOINTMENT", "CONTACT_PREFERENCE"].includes(e.code)).map(e => <details key={`review-${e.id}`}><summary>Review {pipelineLabel(e.code)}</summary><p>{e.reason}</p><Form action="REVIEW_EXCEPTION" extra={{ code: e.code }} label="Record review and next commitment"><Field label="Review outcome"><textarea name="reason" required maxLength={1000} /></Field><Field label="Next internal action"><input name="nextActionLabel" required /></Field><FutureField /></Form></details>)}
              {chosen.pendingOwnerId && (chosen.pendingOwnerId === data.actorId || data.canManage) && <Form action="ACCEPT_HANDOFF" label="Accept responsibility"><Field label="Acceptance reason"><input name="reason" required /></Field></Form>}
              {canWork ? <Form action="OUTCOME" label="Record outcome and next action">
                <Field label="Activity completed"><select name="taskId" defaultValue={chosen.tasks.filter(t => t.status !== "COMPLETED").at(-1)?.id ?? ""}><option value="">Manual conversation or review</option>{chosen.tasks.filter(t => !["COMPLETED", "CANCELLED"].includes(t.status)).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></Field>
                {!chosen.contactSuppressed && <Field label="Recorded activity channel"><select name="channel">{["PHONE", "EMAIL", "TEXT", "MEETING", "VISIT"].map(v => <option key={v}>{v}</option>)}</select></Field>}
                <Field label="Outcome"><select name="outcome" required>{(chosen.contactSuppressed ? ["Internal review"] : ["Spoke with customer", "Left message", "No answer", "Customer decision", "Delivery failed", "Delivery uncertain", "Internal review"]).map(v => <option key={v}>{v}</option>)}</select></Field>
                <Field label="Short note"><textarea name="reason" required maxLength={1000} /></Field><Field label="Next action"><input name="nextActionLabel" required maxLength={240} /></Field><FutureField />
              </Form> : <p>Sales follow-up is closed. Continue fulfillment on the linked deal and resolve remaining activities in the staff task queue, or ask a manager to reopen the opportunity.</p>}
              {canWork && <details><summary>Schedule a follow-up without completing an activity</summary><Form action="FOLLOW_UP"><Field label="Next action"><input name="nextActionLabel" required /></Field><FutureField /></Form></details>}
              <div className={s.buttons}>{chosen.customerId && <Link href={`/crm-next/customers/${encodeURIComponent(chosen.customerId)}`}>Customer record</Link>}{chosen.dealId ? <Link href={chosen.dealHref ?? `/crm-next/deals/start?draftId=${encodeURIComponent(chosen.dealId)}`}>Continue existing deal</Link> : <button disabled={busy} onClick={() => chosen.dealChoices?.length ? setPanel("Documents") : void command({ action: "CONVERT" }, chosen)}>Open deal</button>}</div>
            </>}
            {panel === "Details" && <>
              <Form action="EDIT" label="Save opportunity details"><Field label="Customer link"><select name="customerId" defaultValue={chosen.customerId ?? ""}><option value="">Customer not linked</option>{data.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}{matches.filter(m => !data.customers.some(c => c.id === m.id)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field><Field label="Revenue pathway"><select name="pathway" defaultValue={chosen.pathway}>{PIPELINE_PATHS.map(path => <option key={path} value={path}>{pathLabel(path)}</option>)}</select></Field><Field label="Engagement temperature"><select name="temperature" defaultValue={chosen.temperature}>{["HOT", "WARM", "COLD"].map(v => <option key={v}>{v}</option>)}</select></Field><Field label="Estimated value · USD"><input name="amount" type="number" min="0" step="0.01" defaultValue={chosen.estimatedValueCents === null ? "" : chosen.estimatedValueCents / 100} /></Field><Field label="Expected close date · store calendar"><input type="date" name="expectedCloseDate" defaultValue={chosen.expectedCloseAt?.slice(0, 10) ?? ""} /></Field><Field label="Reason for changes"><input name="reason" required /></Field></Form>
              {listAllowedUnifiedCrmOpportunityTransitions(chosen.stage as UnifiedCrmOpportunityStage).length > 0 && <details><summary>Change stage</summary><Form action="STAGE"><Field label="Next stage"><select name="toStage" required>{listAllowedUnifiedCrmOpportunityTransitions(chosen.stage as UnifiedCrmOpportunityStage).filter(stage => stage !== "WON").map(stage => <option key={stage} value={stage}>{pipelineLabel(stage)}</option>)}</select></Field><Field label="Stage reason"><input name="reason" required /></Field><Field label="Next action for active stage"><input name="nextActionLabel" /></Field><FutureField required={false} /></Form><p>Record an actual sale through the linked deal. Documents can be completed afterward.</p></details>}
              <details><summary>Relationship disposition</summary><Form action="DISPOSITION"><Field label="Disposition"><select name="disposition" defaultValue={chosen.disposition}>{PIPELINE_DISPOSITIONS.map(v => <option key={v}>{v}</option>)}</select></Field><Field label="Disposition reason"><input name="reason" required /></Field><FutureField label="Waiting or nurture review · your local time" name="reviewAt" required={false} /></Form></details>
              {data.canManage && <details><summary>Manager ownership and reopening</summary><Form action="REQUEST_HANDOFF" label="Request ownership handoff"><Field label="Receiving owner"><select name="ownerUserId">{data.owners.map(o => <option value={o.id} key={o.id}>{o.name}</option>)}</select></Field><Field label="Handoff reason"><input name="reason" required /></Field></Form>{(!activePipelineRow(chosen)) && <Form action="REOPEN" label="Reopen opportunity"><Field label="Reopening reason"><input name="reason" required /></Field><Field label="Next action"><input name="nextActionLabel" required /></Field><FutureField /></Form>}</details>}
            </>}
            {panel === "Forecast" && <PipelineForecast record={chosen} canManage={data.canManage} canWrite={data.canWrite} onSaved={() => { dirty.current = false; void refresh(); }} />}
            {panel === "Activity" && !!chosen.appointments?.length && <><h3>Linked appointments</h3>{chosen.appointments.map(p => <p key={p.id}>{p.title} · {date(p.startsAt)} · {pipelineLabel(p.status)} · {pipelineLabel(p.attendance)}</p>)}<Link href="/crm-next/appointments">Open appointment workspace</Link></>}
            {panel === "Activity" && <><h3>Activity and inspection</h3><p>Closing plan moved {chosen.pushCount} times. Stage entered {date(chosen.stageEnteredAt)}.</p>{chosen.tasks.map(t => <p key={t.id}><strong>{t.title}</strong><small>{pipelineLabel(t.status)} · Due {date(t.dueAt)}{t.completedAt ? ` · Completed ${date(t.completedAt)}` : ""}</small></p>)}{chosen.history.map(h => <details key={h.id}><summary>{pipelineLabel(h.eventType)} · {date(h.occurredAt)}</summary><p>{h.reason} · {h.actor}</p><pre>{JSON.stringify({ before: h.priorValue, after: h.newValue }, null, 2)}</pre></details>)}{!chosen.history.length && <p>No recorded change history is available. Historical values are not inferred.</p>}</>}
            {panel === "Documents" && <><h3>Deal and documentation</h3><p>Generate and preview on the existing deal. Signed documents, insurance, DMV paperwork, funding, delivery and returns remain separate steps.</p>{chosen.dealId ? <Link href={chosen.dealHref ?? `/crm-next/deals/start?draftId=${encodeURIComponent(chosen.dealId)}`}>Open this deal and its packet</Link> : <Form action="CONVERT" label="Link existing deal or open a separate transaction">
                <Field label="Existing customer deals"><select name="existingDealId"><option value="">Create a separate transaction</option>{chosen.dealChoices?.map(d => <option key={d.id} value={d.id}>{pathLabel(d.pathway)} · {d.vehicle || "Vehicle not selected"} · {pipelineLabel(d.status)} · {d.id.slice(0, 8)}</option>)}</select></Field>
                {!!chosen.dealChoices?.length && <><label><input type="checkbox" name="confirmSeparateIntent" /> A new deal represents a separate transaction</label><Field label="Reason if creating a separate transaction"><input name="reason" /></Field></>}
              </Form>}<p>Actual receipts, refunds and reversals remain in the governed Deals workspace.</p><Link href="/crm-next/deals">Deal dashboard and fulfillment checklists</Link></>}
            {panel === "Sequence" && <><h3>Follow-up sequence</h3>{chosen.sequence && <><p>{PIPELINE_SEQUENCES[chosen.sequence.code]?.label ?? chosen.sequence.code} · Version {chosen.sequence.version} · {chosen.sequence.state}</p><ol>{chosen.sequence.steps.map((step, i) => <li key={`${i}:${step}`}>{i < chosen.sequence!.step ? "Completed or skipped · " : i === chosen.sequence!.step ? `${pipelineLabel(chosen.sequence!.state)} · ` : "Upcoming · "}{step}</li>)}</ol><p>{chosen.sequence.reason}</p>{!["COMPLETED", "STOPPED"].includes(chosen.sequence.state) && <><Form action={chosen.sequence.state === "ACTIVE" ? "PAUSE_SEQUENCE" : "RESUME_SEQUENCE"} label={chosen.sequence.state === "ACTIVE" ? "Pause with review date" : "Resume sequence"}><Field label="Sequence reason"><input name="reason" required /></Field><FutureField label="Review or resume time · your local time" name="reviewAt" /></Form><Form action="STOP_SEQUENCE" label="Stop sequence"><Field label="Stop reason"><input name="reason" required /></Field></Form>{chosen.sequence.state === "ACTIVE" && chosen.tasks.some(t => t.id === chosen.sequence!.taskId && t.status !== "COMPLETED") && <details><summary>Skip current step with a reason</summary><Form action="SKIP_STEP" extra={{ taskId: chosen.sequence.taskId }} label="Record skip and next commitment"><Field label="Skip reason"><textarea name="reason" required /></Field><Field label="Next internal action"><input name="nextActionLabel" required /></Field><FutureField /></Form></details>}</>}</>}{(!chosen.sequence || ["COMPLETED", "STOPPED"].includes(chosen.sequence.state)) && <Form action="ENROLL" label="Enroll in internal follow-up sequence"><Field label="Sequence template"><select name="sequenceCode">{Object.entries(PIPELINE_SEQUENCES).map(([code, template]) => <option value={code} key={code}>{template.label}</option>)}</select></Field><FutureField /></Form>}<p>These sequences create internal tasks. No customer text or email is sent. Completed and skipped steps retain distinct outcomes in Activity history.</p></>}
          </aside>}
        </div>
      </>}
      {tab === "Automation" && <div className={s.insights}><h2>Internal sequences and recovery</h2><p>Trigger → condition → assigned task → recorded outcome. Select an opportunity and open Sequence to enroll or manage its steps. Customer messaging remains inactive.</p><PipelineAutomationWorkbench rows={reportingRows} versions={data.templateVersions ?? []} canManage={data.canManage} canWrite={data.canWrite} busy={busy} onSave={body => command(body)} onPick={id => pickWorkspaceRecord(id, "Sequence")} onDirty={value => { dirty.current = value; }} /><details className={s.legacy}><summary>Recovery, configuration & inquiry imports</summary><h3>Recovery health</h3><p>Pending events: {data.health.pending} · Failed events: {data.health.failed} · Oldest pending {date(data.health.oldestPendingAt)} · Last successful worker {date(data.health.lastWorkerAt)}</p>{(!data.health.lastWorkerAt || clock - Date.parse(data.health.lastWorkerAt) > 10 * 60000) && <p className={s.warning}>Recovery worker is not current. Configure its schedule or run recovery below. Manual staff work remains available.</p>}{data.canManage && <button disabled={busy} onClick={async () => { let cursor: string | undefined; do { const result = await command({ action: "RECONCILE", cursor, retryFailed: true }); if (!result) break; cursor = result.nextCursor ?? undefined; setNotice(`Recovery processed ${result.reconciled} records; ${result.failed} failed processing.`); } while (cursor); }}>Run recovery and retry failed internal work</button>}<h3>Configuration</h3><p>Intake response, owner assignment, handoff acceptance and stalled-stage thresholds use administrator-configured policies. Deadlines currently use calendar time. Schedule the worker and approve a business calendar before treating these as business-hour service levels.</p><h3>Import inquiries</h3><p>Upload a CSV with columns Name, Source, Reference, Phone, Email, and Vehicle. Name, Source, and Reference are required. Import up to 25 rows; use the same references when retrying. New records are assigned to you for review and are not automatically merged.</p>
        <Field label="Inquiry CSV file"><input type="file" accept=".csv,text/csv" onChange={async e => {
          const file = e.target.files?.[0]; if (!file) return;
          if (file.size > 128 * 1024) { setError("Choose a compact CSV under 128 KB."); return; }
          const parsed = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: "greedy" });
          if (parsed.errors.length || parsed.data.length > 25 || !parsed.data.length || parsed.data.some(r => !r.Name || !r.Source || !r.Reference)) { setError("Use 1–25 valid rows with Name, Source, and Reference columns. The file has not been imported."); return; }
          const rows = await Promise.all(parsed.data.map(async r => {
            const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${r.Source}:${r.Reference}`));
            const idempotencyKey = `import-${Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("")}`;
            return { title: r.Name, sourceCode: r.Source, sourceKey: r.Reference, phone: r.Phone ?? "", email: r.Email ?? "", vehicle: r.Vehicle ?? "", pathway: "retail-sale", ownerUserId: data.actorId, idempotencyKey };
          }));
          setImportRows(rows); setImportResults([]); setNotice(`${rows.length} inquiries ready for review and import.`);
        }} /></Field>
        <button disabled={busy || !importRows.length} onClick={async () => { const result = await command({ action: "IMPORT", rows: importRows }); if (result) setImportResults(result.results); }}>Import {importRows.length || "selected"} inquiries</button>{importResults.map(r => <p key={r.index}>Row {r.index + 1}: {r.ok ? "Saved or safely replayed" : r.error}</p>)}</details></div>}
      {tab === "Automation" && !!data.importBatches?.length && <section className={s.insights} aria-label="Retained import recovery"><h2>Retained imports needing review</h2><p>The oldest 25 unresolved batches are shown. Successful rows are preserved. Correct or retry failed rows; do not create replacement inquiries.</p>
        {data.importBatches.map(batch => <p key={batch.id}>Received {date(batch.receivedAt)} · {batch.remaining} rows need review · {data.owners.find(o => o.id === batch.ownerUserId)?.name ?? "Intake manager review"} · {batch.reason} <button disabled={busy} onClick={() => void loadImportReview(batch.id)}>Review retained rows</button></p>)}
        {reviewImport && <form className={s.form} onChange={() => { dirty.current = true; }} onSubmit={async e => {
          e.preventDefault(); const values = new FormData(e.currentTarget);
          const corrections = reviewImport.rows.map(row => ({ index: row.index, payload: Object.fromEntries(["title", "phone", "email", "sourceCode", "sourceKey"].map(field => [field, String(values.get(`${row.index}:${field}`) ?? "")])) }));
          const result = await command({ action: "IMPORT", batchId: reviewImport.id, corrections, reason: String(values.get("reason") ?? "") });
          if (result) { setImportResults(result.results); if (result.results.every((r: { ok: boolean }) => r.ok)) setReviewImport(null); else await loadImportReview(reviewImport.id); }
        }}>
          {reviewImport.rows.map(row => <fieldset key={`${reviewImport.id}:${row.index}`}><legend>Row {row.index + 1}</legend><p className={s.warning}>{row.error}</p>{[["title", "Name or inquiry"], ["phone", "Phone"], ["email", "Email"], ["sourceCode", "Source"], ["sourceKey", "Source reference"]].map(([field, label]) => <Field key={field} label={label}><input name={`${row.index}:${field}`} defaultValue={row.payload[field] ?? ""} required={["title", "sourceCode", "sourceKey"].includes(field)} /></Field>)}</fieldset>)}
          <Field label="Import correction reason"><input name="reason" required minLength={8} maxLength={500} /></Field><button disabled={busy}>Correct and retry retained rows</button>
        </form>}
      </section>}
      {tab === "Insights" && range && <div className={s.insights}><PipelineInsights rows={reportingRows} range={range} now={now} onDrill={drillInto} /></div>}
    </>}
    {showIntake && data && <IntakeDialog onClose={() => { if (!dirty.current || window.confirm("Discard the unsaved inquiry?")) { dirty.current = false; setShowIntake(false); } }}><div className={s.intake}><header className={s.header}><h2 id="pipeline-intake-title">Capture inquiry</h2><button onClick={() => { if (!dirty.current || window.confirm("Discard the unsaved inquiry?")) { dirty.current = false; setShowIntake(false); } }}>Close</button></header><p>Capture incomplete inquiries now. Missing contact or ownership stays in an accountable review queue.</p>{error && <p role="alert" className={s.error}>{error}</p>}<form className={s.form} onChange={() => { dirty.current = true; }} onSubmit={submit("CAPTURE")}><Field label="Name or inquiry description"><input autoFocus name="title" required maxLength={160} /></Field><Field label="Existing customer · verify identity"><select name="customerId"><option value="">Unverified inquiry · review required</option>{data.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}{matches.filter(m => !data.customers.some(c => c.id === m.id)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field><Field label="Phone"><input name="phone" maxLength={80} /></Field><Field label="Email"><input name="email" maxLength={160} /></Field><button type="button" onClick={async e => {
          const form = e.currentTarget.closest("form")!, values = new FormData(form), q = String(values.get("phone") || values.get("email") || values.get("title") || "");
          const response = await fetch(`/api/crm-next/pipeline?match=${encodeURIComponent(q)}`, { cache: "no-store" }); const result = await response.json();
          if (!response.ok) { setError(result.error); return; } setMatches(result.items); setNotice(result.items.length ? "Review possible customer matches before linking." : "No accessible match found. The inquiry can still be captured for review.");
        }}>Check existing customers</button>
        {matches.map(m => <p key={m.id}>{m.name} · {m.phoneHint}</p>)}<p className={s.meta}>Choose a verified match in Existing customer above. Shared contact details alone do not prove identity.</p><Field label="Source"><input name="sourceCode" required defaultValue="MANUAL" maxLength={80} /></Field><Field label="Source reference · keep for retries"><input name="sourceKey" required defaultValue={intakeKey} maxLength={160} /></Field><Field label="Vehicle interest"><input name="vehicle" maxLength={240} /></Field><Field label="Revenue pathway"><select name="pathway">{PIPELINE_PATHS.map(path => <option key={path} value={path}>{pathLabel(path)}</option>)}</select></Field><Field label="Owner"><select name="ownerUserId" defaultValue={data.actorId}>{data.canManage && <option value="">Intake manager queue</option>}{data.owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="Inquiry note"><textarea name="note" maxLength={1000} /></Field><button className={s.primary} disabled={busy}>Capture and retain inquiry</button></form><p>Possible duplicates must be reviewed before linking; matching names or shared contact details do not automatically merge people.</p></div></IntakeDialog>}
  </section></FormContext.Provider>;
}
