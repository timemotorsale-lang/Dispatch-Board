"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { notifyRepairReviewSaved, repairReviewHref } from "@/lib/repair-workflow-review";
import styles from "./repair-workflow.module.css";
type Job = { id: string; jobNumber: string; description: string; status: string; qcFailedAt?: string | null; executionBlockerReason?: string | null; dispatches: { technicianUserId: string; status: string }[]; laborClocks: { technicianUserId: string; state: string; accumulatedMinutes: number; finishedAt?: string | null }[] };
const actions = {
  START: "Start repair",
  PAUSE: "Pause / record blocker",
  RESUME: "Resume repair",
  FINISH: "Complete repair & send to QC",
};
type RepairAction = keyof typeof actions | "PROGRESS";
const actionLabel = (action: RepairAction) => action === "PROGRESS" ? "Record progress update" : actions[action];
export function RepairExecutionTool({ repairOrderId, jobs }: { repairOrderId: string; jobs: Job[] }) {
  const [selected, setSelected] = useState(jobs.find(job => ["DISPATCHED", "IN_PROGRESS", "PAUSED"].includes(job.status))?.id ?? jobs[0]?.id ?? "");
  const [chosenAction, setChosenAction] = useState<RepairAction | null>(null);
  const [evidence, setEvidence] = useState(""), [notes, setNotes] = useState(""), [blocker, setBlocker] = useState("");
  const [progress, setProgress] = useState("");
  const [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const pending = useRef<{ signature: string; body: Record<string, unknown> } | null>(null);
  const job = jobs.find(job => job.id === selected);
  const technician = job?.dispatches.find(dispatch => dispatch.status === "ACTIVE")?.technicianUserId;
  const clock = job?.laborClocks.find(item => item.technicianUserId === technician);
  const complete = job?.status === "READY_FOR_QC" || job?.status === "QC_PASSED";
  const available: RepairAction[] = !technician || complete ? []
    : clock?.state === "RUNNING" ? ["FINISH", "PROGRESS", "PAUSE"]
    : clock?.state === "PAUSED" ? ["RESUME", "FINISH"]
    : !clock || clock.state === "NOT_STARTED" || (clock.state === "FINISHED" && job?.status === "DISPATCHED" && job.qcFailedAt && clock.finishedAt && Date.parse(clock.finishedAt) <= Date.parse(job.qcFailedAt)) ? ["START"] : [];
  const eventType = chosenAction && available.includes(chosenAction) ? chosenAction : available[0];
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy || !job || !technician || !eventType) return;
    setBusy(true); setNotice("");
    try {
      const values = eventType === "PROGRESS" ? {
        action: "RECORD_REPAIR_PROGRESS", contactChannel: "INTERNAL", contactDirection: "INTERNAL",
        contactOutcome: "Repair progress updated", customerVisibleSummary: progress.trim(),
        exceptionCodes: [], reason: "Record a repair progress update.", statusCode: "REPAIR_IN_PROGRESS",
      } : { eventType, technicianUserId: technician, evidence: evidence.split("\n").map(value => value.trim()).filter(Boolean), qcHandoffNotes: notes, blockerReason: blocker || null, reason: eventType === "FINISH" ? "Record completed repair and evidence for quality control." : "Record technician repair execution from the review workbench." };
      const signature = JSON.stringify({ jobId: job.id, ...values });
      if (pending.current?.signature !== signature) pending.current = { signature, body: { ...values, occurredAt: new Date().toISOString(), idempotencyKey: crypto.randomUUID() } };
      const url = eventType === "PROGRESS" ? `/api/repair-orders/${encodeURIComponent(repairOrderId)}/planning` : `/api/repair-jobs/${encodeURIComponent(job.id)}/labor`;
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current.body) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Repair action could not be recorded.");
      pending.current = null; setProgress(""); setNotice("Repair update saved."); notifyRepairReviewSaved(repairOrderId);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Request interrupted. Retry unchanged to recover the saved action."); }
    finally { setBusy(false); }
  }
  if (!jobs.length) return <p role="status">Create an authorized repair job in Parts &amp; release, then assign it before recording technician work.</p>;
  return <form className={styles.form} onSubmit={save}>
    <label>Repair job<select disabled={busy} value={selected} onChange={event => {
      setSelected(event.target.value); setChosenAction(null); setEvidence(""); setNotes(""); setBlocker(""); setProgress(""); setNotice("");
    }}>{jobs.map(job => <option key={job.id} value={job.id}>{job.jobNumber} · {job.description}</option>)}</select></label>
    {job && <p role="status">{job.status.replaceAll("_", " ").toLowerCase()} · {job.laborClocks.reduce((total, item) => total + item.accumulatedMinutes, 0)} minutes recorded</p>}
    {job?.executionBlockerReason && <p>{job.executionBlockerReason}</p>}
    {complete ? <Link href={repairReviewHref(repairOrderId, "qc")}>Open Quality Check</Link>
      : !technician ? <p>Book this job as the technician’s current assignment. <Link href={repairReviewHref(repairOrderId, "assignment")}>Open assignment</Link></p>
      : !eventType ? <p>Review the assignment and saved labor before continuing. <Link href={repairReviewHref(repairOrderId, "assignment")}>Review assignment</Link></p> : null}
    {available.length > 1 && <label>Next action<select disabled={busy} value={eventType} onChange={event => setChosenAction(event.target.value as RepairAction)}>{available.map(action => <option key={action} value={action}>{actionLabel(action)}</option>)}</select></label>}
    {eventType === "PROGRESS" && <label>Progress summary (customer-visible)<textarea required value={progress} onChange={event => setProgress(event.target.value)} /></label>}
    {eventType === "PAUSE" && <label>Blocker / next action<textarea minLength={10} value={blocker} onChange={event => setBlocker(event.target.value)} /></label>}
    {eventType === "FINISH" && <>
      <label>Completion evidence (one reference per line)<textarea required value={evidence} onChange={event => setEvidence(event.target.value)} /></label>
      <label>QC handoff — work performed and what to verify<textarea required value={notes} onChange={event => setNotes(event.target.value)} /></label>
    </>}
    {eventType && <button disabled={busy} type="submit">{busy ? "Saving…" : actionLabel(eventType)}</button>}
    {notice && <p role="alert">{notice}</p>}
  </form>;
}
