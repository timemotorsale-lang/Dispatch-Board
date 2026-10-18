"use client";
import { useRef, useState, type FormEvent } from "react";
import { notifyRepairReviewSaved } from "@/lib/repair-workflow-review";
import styles from "./repair-workflow.module.css";
type Job = { id: string; jobNumber: string; description: string; status: string; dispatches: { technicianUserId: string; status: string }[]; laborClocks: { technicianUserId: string; state: string; accumulatedMinutes: number }[] };
export function RepairExecutionTool({ repairOrderId, jobs }: { repairOrderId: string; jobs: Job[] }) {
  const [selected, setSelected] = useState(jobs.find(job => !["QC_PASSED", "COMPLETED", "READY_FOR_QC", "CANCELED"].includes(job.status))?.id ?? jobs[0]?.id ?? ""), [eventType, setEventType] = useState("START");
  const [evidence, setEvidence] = useState(""), [notes, setNotes] = useState(""), [blocker, setBlocker] = useState("");
  const [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const pending = useRef<{ signature: string; body: Record<string, unknown> } | null>(null);
  const job = jobs.find(job => job.id === selected);
  const technician = job?.dispatches.find(dispatch => dispatch.status === "ACTIVE")?.technicianUserId;
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy || !job || !technician) return;
    setBusy(true); setNotice("");
    try {
      const values = { eventType, technicianUserId: technician, evidence: evidence.split("\n").map(value => value.trim()).filter(Boolean), qcHandoffNotes: notes, blockerReason: blocker || null, reason: eventType === "FINISH" ? "Record completed repair and evidence for quality control." : "Record technician repair execution from the review workbench." };
      const signature = JSON.stringify({ jobId: job.id, ...values });
      if (pending.current?.signature !== signature) pending.current = { signature, body: { ...values, occurredAt: new Date().toISOString(), idempotencyKey: crypto.randomUUID() } };
      const response = await fetch(`/api/repair-jobs/${encodeURIComponent(job.id)}/labor`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current.body) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Repair action could not be recorded.");
      pending.current = null; setNotice("Repair event saved."); notifyRepairReviewSaved(repairOrderId);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Request interrupted. Retry unchanged to recover the saved action."); }
    finally { setBusy(false); }
  }
  if (!jobs.length) return <p role="status">Create an authorized repair job in Parts &amp; release, then assign it before recording technician work.</p>;
  return <form className={styles.form} onSubmit={save}><label>Repair job<select value={selected} onChange={event => setSelected(event.target.value)}>{jobs.map(job => <option key={job.id} value={job.id}>{job.jobNumber} · {job.description} · {job.status}</option>)}</select></label><p>Recorded labor: {job?.laborClocks.reduce((total, clock) => total + clock.accumulatedMinutes, 0) ?? 0} minutes. Only the assigned technician or an authorized manager can record this work.</p>{!technician && <p role="alert">Book an active technician assignment before starting repair work.</p>}<label>Action<select value={eventType} onChange={event => setEventType(event.target.value)}><option value="START">Start repair</option><option value="PAUSE">Pause / blocker</option><option value="RESUME">Resume repair</option><option value="FINISH">Complete repair &amp; send to QC</option></select></label>{eventType === "PAUSE" && <label>Blocker / next action<textarea value={blocker} onChange={event => setBlocker(event.target.value)} /></label>}{eventType === "FINISH" && <><label>Completion evidence (one reference per line)<textarea required value={evidence} onChange={event => setEvidence(event.target.value)} /></label><label>QC handoff — work performed and what to verify<textarea required value={notes} onChange={event => setNotes(event.target.value)} /></label></>}<button disabled={busy || !technician} type="submit">{busy ? "Saving…" : eventType === "FINISH" ? "Save completion & continue to QC" : "Save repair action"}</button>{notice && <p role="alert">{notice}</p>}</form>;
}
