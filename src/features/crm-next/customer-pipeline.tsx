"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { companyPipelineHref, pipelineLabel, type CustomerPipeline, type CustomerPipelineOpportunity } from "@/lib/crm-pipeline";
import styles from "./customer360-workspace.module.css";

const localDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short",
}).format(new Date(value)) : "No date";

export function useCustomerPipeline(customerId: string, initialOpportunityId?: string) {
  const [data, setData] = useState<CustomerPipeline | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ customer: customerId });
    if (initialOpportunityId) params.set("opportunity", initialOpportunityId);
    void fetch(`/api/crm-next/pipeline?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error);
        if (!controller.signal.aborted) { setData(json); setError(""); }
      }).catch(error => { if (!controller.signal.aborted) { setData(null); setError(error instanceof Error ? error.message : "Pipeline unavailable."); } });
    return () => controller.abort();
  }, [customerId, initialOpportunityId, revision]);
  return { data, error, refresh: () => setRevision(value => value + 1) };
}

export function opportunityStage(row: CustomerPipelineOpportunity) {
  if (row.dealReviewState === "UNWIND_PENDING") return "Unwind review";
  if (row.dealStatus === "SOLD") return row.dealReviewState === "CLOSED" ? "Sold · documentation complete" : "Sold · paperwork pending";
  if (row.dealStatus === "COMPLETED") return "Deal completed";
  return pipelineLabel(row.stage);
}

export function CustomerPipelinePanel({ data, error, refresh, customerId, selected, select, exactMissing }: {
  data: CustomerPipeline | null; error: string; refresh(): void; customerId: string;
  selected: CustomerPipelineOpportunity | null; select(id: string): void; exactMissing: boolean;
}) {
  const [adoption, setAdoption] = useState<{ id: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const selectorId = useId();
  const captureHref = `/crm-next/pipeline?${new URLSearchParams({ customerId, intake: "1" })}`;
  async function adopt(id: string) {
    const key = adoption?.id === id ? adoption.key : crypto.randomUUID();
    setAdoption({ id, key }); setBusy(true); setSaveError("");
    try {
      const response = await fetch("/api/crm-next/pipeline", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADOPT_LEAD", leadId: id, pathway: "retail-sale", idempotencyKey: key }) });
      const results = await response.json();
      if (!response.ok) throw new Error(results.error || "Lead could not be linked.");
      select(results.id); refresh(); setAdoption(null);
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Lead could not be linked."); }
    finally { setBusy(false); }
  }
  const openTasks = selected?.tasks.filter(task => !["COMPLETED", "CANCELLED"].includes(task.status)) ?? [];
  return <>
    <header className={styles.actions}>
      <h2>Customer pipeline</h2>
      <button type="button" onClick={refresh}>Refresh</button>
      {data?.canWrite && <Link href={captureHref}>Capture a new inquiry</Link>}
    </header>
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">Loading customer opportunities…</p>}
    {data && <>
      {exactMissing && <p role="status">The requested opportunity is unavailable on this customer record. Select an available opportunity to continue.</p>}
      {!data.opportunities.length && <p>No linked opportunities are available. Capture a new inquiry only for a distinct customer interest.</p>}
      {data.more && <p>Showing recent records. Use the company pipeline for older opportunities.</p>}
      {!!data.opportunities.length && <div><label htmlFor={selectorId}>Opportunity</label> <select id={selectorId} value={selected?.id ?? ""} onChange={event => select(event.target.value)}>
        {!selected && <option value="">Choose an opportunity</option>}
        {data.opportunities.map(row => <option key={row.id} value={row.id}>{row.opportunityNumber} · {row.vehicle || row.title} · {opportunityStage(row)}</option>)}
      </select></div>}
      {selected && <>
        <section className={styles.subsection} aria-label="Current opportunity stage">
          <h3>{opportunityStage(selected)}</h3>
          <p>{selected.ownerName} · {pipelineLabel(selected.pathway)} · {pipelineLabel(selected.disposition)}</p>
          {selected.lostReason && <p>Lost reason · {selected.lostReason}</p>}
          <Link href={companyPipelineHref(selected.id)}>Open in company pipeline</Link>
          {selected.dealHref && <> · <Link href={selected.dealHref}>Open linked deal</Link></>}
        </section>
        <section className={styles.subsection} aria-label="Open opportunity work">
          <h3>Open work</h3>
          <p>{selected.nextActionLabel ?? (selected.active ? "Set a dated next action" : "No next action recorded")} · {localDate(selected.dueAt)}</p>
          {selected.handoffDueAt && <p>Handoff acceptance due {localDate(selected.handoffDueAt)}</p>}
          {!!selected.warnings.length && <ul>{selected.warnings.map(warning => <li key={warning.code}><strong>{pipelineLabel(warning.code)}</strong> · {warning.reason}</li>)}</ul>}
          {!!openTasks.length && <ul className={styles.rows}>{openTasks.map(task => <li key={task.id}><Link href={`/tasks/${encodeURIComponent(task.id)}`}>{task.title}</Link><small>{localDate(task.dueAt)} · {pipelineLabel(task.status)}</small></li>)}</ul>}
          {!!selected.appointments?.length && <details><summary>Linked appointments</summary><ul className={styles.rows}>{selected.appointments.map(appointment => <li key={appointment.id}>
            {appointment.number ? <Link href={`/appointments?${new URLSearchParams({ view: "board", appointment: appointment.number })}`}>{appointment.title}</Link> : appointment.title}
            <small>{localDate(appointment.startsAt)} · {pipelineLabel(appointment.attendance)}</small>
          </li>)}</ul></details>}
          {selected.dealHref && selected.dealReviewState && <p>Deal paperwork · {pipelineLabel(selected.dealReviewState)} <Link href={selected.dealHref}>Review in deal</Link></p>}
        </section>
        <section className={styles.subsection} aria-label="Opportunity activity">
          <h3>Recent opportunity activity</h3>
          {selected.activity.length ? <ul className={styles.rows}>{selected.activity.map(event => <li key={event.id}>{pipelineLabel(event.eventType)} · {localDate(event.occurredAt)}</li>)}</ul> : <p>No opportunity activity recorded yet.</p>}
          <p>Customer-wide calls and notes are kept in <a href="#timeline">Activity</a> unless recorded against an opportunity.</p>
        </section>
      </>}
      {!!data.legacyLeads.length && <section className={styles.subsection} aria-label="Unlinked customer leads">
        <h3>Existing leads to review</h3>
        <p>Bring existing inquiries into the pipeline rather than capturing them again.</p>
        {saveError && <p role="alert">{saveError}</p>}
        <ul className={styles.rows}>{data.legacyLeads.map(lead => <li key={lead.id}>
          <div>{lead.number} · {pipelineLabel(lead.stage)} <small>{localDate(lead.dueAt)}</small></div>
          {data.canWrite && <button type="button" disabled={busy} onClick={() => void adopt(lead.id)}>Open existing lead in pipeline</button>}
        </li>)}</ul>
      </section>}
    </>}
  </>;
}
