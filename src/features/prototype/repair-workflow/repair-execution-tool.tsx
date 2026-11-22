"use client";

import Link from "next/link";
import { RepairProcedureEvidenceFields } from "@/features/technician/repair-procedure-evidence-fields";
import { repairProcedureEvidenceRequirements } from "@/lib/repair-procedure-evidence";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { notifyRepairReviewSaved, repairReviewHref } from "@/lib/repair-workflow-review";
import { laborActionLabels, technicianExecutionState, type LaborAction, type TechnicianExecutionJob } from "./technician-execution-state";
import styles from "./repair-workflow.module.css";

const actions = {
  ...laborActionLabels,
  PROGRESS: "Record progress update",
  FINDING: "Report finding to advisor",
};
type RepairAction = LaborAction | "PROGRESS" | "FINDING";

export function RepairExecutionTool({ repairOrderId, jobs, actorId, manager }: {
  repairOrderId: string;
  jobs: TechnicianExecutionJob[];
  actorId: string;
  manager: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(jobs.find(job => ["DISPATCHED", "IN_PROGRESS", "PAUSED"].includes(job.status))?.id);
  const [chosenAction, setChosenAction] = useState<RepairAction | null>(null);
  const [evidence, setEvidence] = useState(""), [notes, setNotes] = useState(""), [blocker, setBlocker] = useState("");
  const [procedureEvidence, setProcedureEvidence] = useState<Record<string, string>>({});
  const [verification, setVerification] = useState(""), [finding, setFinding] = useState("");
  const [progress, setProgress] = useState("");
  const [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const pending = useRef<{ signature: string; body: Record<string, unknown> } | null>(null);
  const job = jobs.find(item => item.id === selected) ?? jobs[0];
  const currentJobId = useRef(job?.id);
  const requiredEvidence = repairProcedureEvidenceRequirements(job?.procedureVersion?.requiredEvidence);
  const state = job ? technicianExecutionState(job) : undefined;
  const technician = state?.active?.technicianUserId;
  const canRecordLabor = Boolean(technician && (manager || technician === actorId));
  const canRecordProgress = Boolean(technician && state?.executable && !state.waitingForParts);
  const available: RepairAction[] = canRecordLabor && state ? [...state.actions] : [];
  if (canRecordProgress) available.push("PROGRESS");
  if (canRecordLabor && state?.executable) available.push("FINDING");
  const eventType = chosenAction && available.includes(chosenAction) ? chosenAction : available[0];

  function selectJob(id: string) {
    currentJobId.current = id;
    setSelected(id); setChosenAction(null); setEvidence(""); setNotes(""); setVerification("");
    setBlocker(""); setProgress(""); setFinding(""); setProcedureEvidence({}); setNotice("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving.current || !job || !technician || !eventType) return;
    if (eventType === "FINISH" && (!notes.trim() || !verification.trim())) {
      setNotice("Enter the work completed and verification performed.");
      return;
    }
    if (eventType === "FINDING" && !finding.trim()) {
      setNotice("Describe the finding for the advisor.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setNotice("");

    try {
      const orderUrl = `/api/repair-orders/${encodeURIComponent(repairOrderId)}/planning`;
      let url = orderUrl;
      let values: Record<string, unknown>;
      if (eventType === "FINDING") {
        values = { action: "REPORT_TECHNICIAN_FINDING", jobId: job.id, finding: finding.trim() };
      } else if (eventType === "PROGRESS") {
        values = {
          action: "RECORD_REPAIR_PROGRESS", contactChannel: "INTERNAL", contactDirection: "INTERNAL",
          contactOutcome: "Repair progress updated", customerVisibleSummary: progress.trim(),
          exceptionCodes: [], reason: "Record a repair progress update.", statusCode: "REPAIR_IN_PROGRESS",
        };
      } else {
        url = `/api/repair-jobs/${encodeURIComponent(job.id)}/labor`;
        values = {
          eventType, technicianUserId: technician,
          ...(eventType === "FINISH" && requiredEvidence.length ? { procedureEvidence } : {}),
          evidence: eventType === "FINISH" ? [
            `Work completed: ${notes.trim()}`, `Verification performed: ${verification.trim()}`,
            ...evidence.split("\n").map(value => value.trim()).filter(Boolean),
          ] : [],
          qcHandoffNotes: eventType === "FINISH" ? `${notes.trim()}\nVerification performed: ${verification.trim()}` : null,
          blockerReason: eventType === "PAUSE" ? blocker.trim() || null : null,
          reason: eventType === "FINISH" ? "Record completed repair and evidence for quality control."
            : "Record technician repair execution from the repair workbench.",
        };
      }
      const signature = JSON.stringify({ jobId: job.id, ...values });
      if (pending.current?.signature !== signature) {
        pending.current = { signature, body: { ...values, occurredAt: new Date().toISOString(), idempotencyKey: crypto.randomUUID() } };
      }
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current.body) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Repair action could not be recorded.");

      pending.current = null;
      setChosenAction(null);
      setProgress("");
      setFinding("");
      setBlocker("");
      setEvidence("");
      setProcedureEvidence({});
      setNotes("");
      setVerification("");
      setNotice(eventType === "FINDING" ? "Update saved to the advisor’s team inbox."
        : eventType === "FINISH" ? "Repair update saved. Ready for QC."
        : eventType === "PAUSE" ? "Update saved. This job is paused." : "Repair update saved.");
      notifyRepairReviewSaved(repairOrderId);
      if (eventType === "FINISH") router.push(repairReviewHref(repairOrderId, "qc"));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Request interrupted. Retry unchanged to recover the saved action.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  if (!job || !state) return <p role="status">Create an authorized repair job in Parts &amp; release, then assign it before recording technician work.</p>;
  return <form className={styles.form} aria-label={`Execution for ${job.jobNumber}`} onSubmit={save}>
      <label>Repair job<select disabled={busy} value={job.id} onChange={event => selectJob(event.target.value)}>{jobs.map(item => <option key={item.id} value={item.id}>{item.jobNumber} · {item.description}</option>)}</select></label>
      <p><strong>Technician instructions</strong><br />{job.plannedCorrection || job.description}</p>
      <p role="status">{job.status.replaceAll("_", " ").toLowerCase()} · {job.laborClocks.reduce((total, item) => total + item.accumulatedMinutes, 0)} minutes recorded</p>
      {job.executionBlockerReason && <p>{job.executionBlockerReason}</p>}
      {job.status === "QC_PASSED" ? <Link href={repairReviewHref(repairOrderId, "handoff")}>Continue to closeout</Link>
        : state.complete ? <Link href={repairReviewHref(repairOrderId, "qc")}>Open Quality Check</Link>
        : state.waitingForParts ? <p>Reserve the required parts for this job before assigning it. <Link href={repairReviewHref(repairOrderId, "parts")}>Open parts for this repair</Link></p>
        : !technician ? <p>Book this job as the technician’s current assignment. <Link href={repairReviewHref(repairOrderId, "assignment")}>Open assignment</Link></p>
        : !eventType ? <p>Review the assignment and saved labor before continuing. <Link href={repairReviewHref(repairOrderId, "assignment")}>Review assignment</Link></p> : null}
      {canRecordProgress && !canRecordLabor && <p>The assigned technician or a manager can complete this job and send it to QC.</p>}
    {available.length > 1 && <label>Repair action<select disabled={busy} value={eventType} onChange={event => setChosenAction(event.target.value as RepairAction)}>{available.map(action => <option key={action} value={action}>{actions[action]}</option>)}</select></label>}
    {eventType === "PROGRESS" && <label>Progress summary (customer-visible)<textarea rows={2} required value={progress} onChange={event => setProgress(event.target.value)} /></label>}
    {eventType === "FINDING" && <>
      <label>Finding or additional work requested<textarea rows={3} required maxLength={1000} value={finding} onChange={event => setFinding(event.target.value)} /></label>
      <p>The advisor reviews the finding and obtains approval for any additional work.</p>
    </>}
    {eventType === "PAUSE" && <label>Blocker / next action<textarea minLength={10} value={blocker} onChange={event => setBlocker(event.target.value)} /></label>}
    {eventType === "FINISH" && <>
      <label>Work completed and QC handoff notes<textarea rows={2} required value={notes} onChange={event => setNotes(event.target.value)} /></label>
      <label>Verification performed<textarea rows={2} required value={verification} onChange={event => setVerification(event.target.value)} /></label>
      <RepairProcedureEvidenceFields key={job.id} requirements={requiredEvidence} values={procedureEvidence} jobId={job.id}
        onChange={(item, value) => {
          if (currentJobId.current === job.id) setProcedureEvidence(previous => ({ ...previous, [item]: value }));
        }} />
      <details><summary>Add supporting references (optional)</summary><label>References, one per line<textarea rows={2} value={evidence} onChange={event => setEvidence(event.target.value)} /></label></details>
    </>}
    {eventType && <button disabled={busy} type="submit">{busy ? "Saving…" : actions[eventType]}</button>}
    {notice && <p role="status">{notice}</p>}
  </form>;
}
