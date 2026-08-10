"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Gauge,
  PackageCheck,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { TechnicianRepairWorkbenchModel } from "@/server/technician-workspace/service";

function label(value: string) {
  return value.toLowerCase().split("_").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
}

function formatTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function TechnicianRepairWorkbench({ model }: { model: TechnicianRepairWorkbenchModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState("COMPLETED");
  const [workPerformed, setWorkPerformed] = useState("");
  const [additionalFinding, setAdditionalFinding] = useState("");
  const [blockerReason, setBlockerReason] = useState(model.job.executionBlockerReason ?? "");
  const [recommendedNextStep, setRecommendedNextStep] = useState("");
  const [verification, setVerification] = useState("");
  const [qcNotes, setQcNotes] = useState(model.job.qcHandoffNotes ?? "");

  const clockState = model.clock.state;
  const canStart = model.actor.canExecute && model.assignment?.position === "CURRENT" && clockState === "NOT_STARTED";
  const canPause = model.actor.canExecute && clockState === "RUNNING";
  const canResume = model.actor.canExecute && clockState === "PAUSED";
  const completed = model.job.status === "READY_FOR_QC" || model.job.status === "QC_PASSED" || clockState === "FINISHED";
  const incomplete = outcome !== "COMPLETED";
  const offsite = Boolean(
    model.repairOrder.vendorName &&
    model.repairOrder.currentLocation &&
    model.repairOrder.currentLocation !== model.repairOrder.location
  );

  function submitLabor(eventType: "START" | "PAUSE" | "RESUME" | "FINISH") {
    setError(null);
    setMessage(null);

    if (eventType === "FINISH" && (!workPerformed.trim() || !qcNotes.trim() || !verification.trim())) {
      setError("Work performed, verification, and QC handoff notes are required before sending the repair to QC.");
      return;
    }
    if (eventType === "PAUSE" && blockerReason.trim().length < 10) {
      setError("Explain the blocker or incomplete repair in at least 10 characters.");
      return;
    }
    if (incomplete && eventType === "PAUSE" && !recommendedNextStep.trim()) {
      setError("Add a recommended next step so management can decide what happens next.");
      return;
    }

    startTransition(async () => {
      const reason = eventType === "START"
        ? "Technician started the assigned repair job."
        : eventType === "RESUME"
          ? "Technician resumed the assigned repair job."
          : eventType === "FINISH"
            ? `Technician completed repair work. Verification: ${verification.trim()}`
            : [
              `Technician submitted ${label(outcome)} update.`,
              workPerformed.trim() ? `Work performed: ${workPerformed.trim()}` : "",
              additionalFinding.trim() ? `Finding: ${additionalFinding.trim()}` : "",
              recommendedNextStep.trim() ? `Next step: ${recommendedNextStep.trim()}` : ""
            ].filter(Boolean).join(" ");

      const response = await fetch(`/api/repair-jobs/${encodeURIComponent(model.job.id)}/labor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvedNonProductiveCode: null,
          blockerReason: eventType === "PAUSE" ? blockerReason.trim() : null,
          correctionMinutes: null,
          eventType,
          evidence: eventType === "FINISH"
            ? [workPerformed.trim(), verification.trim(), additionalFinding.trim()].filter(Boolean)
            : [],
          idempotencyKey: crypto.randomUUID(),
          occurredAt: new Date().toISOString(),
          qcHandoffNotes: eventType === "FINISH" ? qcNotes.trim() : null,
          reason,
          technicianUserId: model.actor.id
        })
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(result?.error ?? "The repair update could not be recorded.");
        return;
      }
      setMessage(eventType === "FINISH" ? "Repair accepted and routed to Quality Control." : "Repair status updated.");
      router.refresh();
    });
  }

  return (
    <section className="technician-repair-workbench">
      <header className="technician-workbench-header">
        <div className="technician-workbench-heading">
          <Link href="/my-tasks"><ArrowLeft size={15} /> My Work</Link>
          <span className="eyebrow">Technician Repair Workbench</span>
          <h1>{model.repairOrder.vehicle.label}</h1>
          <p>{model.job.jobNumber} · {model.job.description}</p>
        </div>
        <div className="technician-workbench-header-status">
          <span className="technician-state-pill">{label(model.job.status)}</span>
          <span><Clock3 size={15} /> {model.clock.accumulatedMinutes} min recorded</span>
          <span>{model.assignment?.bay ?? model.repairOrder.currentLocation}</span>
        </div>
      </header>

      <section className="technician-now-band">
        <div className="technician-now-icon"><Wrench aria-hidden="true" size={24} /></div>
        <div>
          <span>Do this now</span>
          <strong>{model.job.plannedCorrection || model.job.description}</strong>
          <p>{model.repairOrder.vendorNextAction ?? "Complete the authorized work, document what happened, and send verified work to QC."}</p>
        </div>
        <div className="technician-clock-actions">
          {canStart ? <button disabled={pending} onClick={() => submitLabor("START")} type="button"><Play size={16} /> Start Work</button> : null}
          {canPause ? <button disabled={pending} onClick={() => submitLabor("PAUSE")} type="button"><Pause size={16} /> Pause / Report Blocker</button> : null}
          {canResume ? <button disabled={pending} onClick={() => submitLabor("RESUME")} type="button"><RotateCcw size={16} /> Resume Work</button> : null}
          {completed ? <span className="technician-complete-indicator"><CheckCircle2 size={18} /> Submitted</span> : null}
        </div>
      </section>

      <nav className="technician-linked-work" aria-label="Linked work">
        <Link href={model.repairOrder.href}><ClipboardList size={17} /><span><b>{model.repairOrder.number}</b><small>Work Order</small></span></Link>
        <a href="#job-parts"><PackageCheck size={17} /><span><b>{model.parts.length}</b><small>Parts</small></span></a>
        <Link href={model.repairOrder.vehicle.href}><Camera size={17} /><span><b>{model.job.executionEvidence.length}</b><small>Evidence</small></span></Link>
        <Link href={`/diagnostics/intake?repairOrderId=${encodeURIComponent(model.repairOrder.id)}`}><Stethoscope size={17} /><span><b>Open</b><small>Diagnostics &amp; Tools</small></span></Link>
      </nav>

      <div className="technician-workbench-grid">
        <main className="technician-workbench-main">
          <section className="technician-workbench-card technician-concern-card">
            <header><div><span>Customer concern</span><h2>What the customer reported</h2></div><ShieldCheck size={20} /></header>
            <blockquote>{model.repairOrder.concern}</blockquote>
            <small>Preserved from the governed repair order. Technician findings remain separate.</small>
          </section>

          <section className="technician-workbench-card">
            <header><div><span>Authorized scope</span><h2>{model.job.description}</h2></div><Gauge size={20} /></header>
            <p>{model.job.plannedCorrection}</p>
            <div className="technician-scope-facts">
              <span>Labor guide <b>{model.job.laborGuideMinutes} min</b></span>
              <span>Priority <b>{model.job.priority}</b></span>
              <span>Work type <b>{model.job.workTypeCode}</b></span>
              <span>Promise <b>{formatTime(model.repairOrder.promiseAt)}</b></span>
            </div>
          </section>

          <section className="technician-workbench-card">
            <header><div><span>Procedure &amp; safety</span><h2>{model.procedure?.title ?? "Procedure not attached"}</h2></div><FileText size={20} /></header>
            {model.procedure ? (
              <div className="technician-procedure-grid">
                <div><h3>Required steps</h3><ol>{model.procedure.instructions.map((item) => <li key={item}>{item}</li>)}</ol></div>
                <div><h3>Safety checks</h3><ul>{model.procedure.safetySteps.map((item) => <li key={item}>{item}</li>)}</ul></div>
              </div>
            ) : <p className="technician-muted">A governed procedure must be attached by shop planning before execution can be treated as fully ready.</p>}
          </section>

          <section className="technician-workbench-card technician-update-card">
            <header><div><span>Technician work update</span><h2>Document the repair once</h2></div><Wrench size={20} /></header>

            <div className="technician-outcome-row" role="group" aria-label="Repair outcome">
              {[
                ["COMPLETED", "Completed"],
                ["PARTIALLY_COMPLETED", "Partially Completed"],
                ["UNABLE_TO_COMPLETE", "Unable to Complete"],
                ["FURTHER_DIAGNOSIS", "Further Diagnosis"]
              ].map(([value, text]) => (
                <button aria-pressed={outcome === value} className={outcome === value ? "active" : ""} key={value} onClick={() => setOutcome(value)} type="button">{text}</button>
              ))}
            </div>

            <label>
              <span>Work performed</span>
              <textarea onChange={(event) => setWorkPerformed(event.target.value)} placeholder="Document the work, tests, measurements, and correction performed…" rows={5} value={workPerformed} />
            </label>
            <div className="technician-update-two-column">
              <label>
                <span>Additional finding</span>
                <textarea onChange={(event) => setAdditionalFinding(event.target.value)} placeholder="Record any new condition or observation…" rows={3} value={additionalFinding} />
              </label>
              <label>
                <span>Verification performed</span>
                <textarea onChange={(event) => setVerification(event.target.value)} placeholder="Road test, scan, measurement, visual verification…" rows={3} value={verification} />
              </label>
            </div>

            {incomplete ? (
              <div className="technician-exception-fields">
                <label>
                  <span>Why the repair is incomplete</span>
                  <textarea onChange={(event) => setBlockerReason(event.target.value)} placeholder="Explain the blocker, unresolved condition, or safety concern…" rows={3} value={blockerReason} />
                </label>
                <label>
                  <span>Recommended next step</span>
                  <textarea onChange={(event) => setRecommendedNextStep(event.target.value)} placeholder="What should management, the advisor, Parts, or Diagnostics do next?" rows={3} value={recommendedNextStep} />
                </label>
              </div>
            ) : (
              <label>
                <span>QC handoff notes</span>
                <textarea onChange={(event) => setQcNotes(event.target.value)} placeholder="Tell QC exactly what to verify…" rows={3} value={qcNotes} />
              </label>
            )}

            {error ? <div className="notice notice-danger" role="alert"><p>{error}</p></div> : null}
            {message ? <div className="notice notice-success" role="status"><p>{message}</p></div> : null}

            <footer>
              <span><ShieldCheck size={15} /> Updates are linked to {model.repairOrder.number} and {model.job.jobNumber}.</span>
              {incomplete ? (
                <button className="technician-submit-exception" disabled={pending || !model.actor.canExecute || !canPause} onClick={() => submitLabor("PAUSE")} type="button">
                  <AlertTriangle size={17} /> Submit Update &amp; Request Next Action
                </button>
              ) : (
                <button className="technician-submit-complete" disabled={pending || !model.actor.canExecute || completed || !["RUNNING", "PAUSED"].includes(clockState)} onClick={() => submitLabor("FINISH")} type="button">
                  <CheckCircle2 size={17} /> Complete Work &amp; Send to QC
                </button>
              )}
            </footer>
          </section>
        </main>

        <aside className="technician-workbench-rail">
          <section id="job-parts">
            <span>Repair context</span>
            <h2>{model.repairOrder.number}</h2>
            <dl>
              <div><dt>Customer</dt><dd>{model.repairOrder.customer}</dd></div>
              <div><dt>Current physical location</dt><dd>{model.repairOrder.currentLocation}</dd></div>
              {offsite ? <div><dt>Home / accountable site</dt><dd>{model.repairOrder.location}</dd></div> : null}
              {offsite ? <div><dt>Vendor status</dt><dd>{`Offsite · ${model.repairOrder.vendorName}`}</dd></div> : null}
              <div><dt>Technician</dt><dd>{model.actor.name}</dd></div>
              <div><dt>Assignment</dt><dd>{model.assignment ? label(model.assignment.position) : "Read only"}</dd></div>
              <div><dt>Clock</dt><dd>{label(clockState)}</dd></div>
            </dl>
          </section>

          <section>
            <span>Parts allocation</span>
            <h2>{model.parts.length ? `${model.parts.length} linked demand${model.parts.length === 1 ? "" : "s"}` : "No parts required"}</h2>
            {model.parts.length ? <ul>{model.parts.map((part) => <li key={part.id}><div><b>{part.partNumber}</b><small>{part.description}</small></div><span>{part.reserved}/{part.required} · {label(part.status)}</span></li>)}</ul> : <p>No job-specific part demand is linked.</p>}
          </section>

          <section>
            <span>Readiness</span>
            <h2>Before completion</h2>
            <ul className="technician-readiness-list">
              <li><CheckCircle2 size={15} /> Assignment verified</li>
              <li><CheckCircle2 size={15} /> Authorization linked</li>
              <li><CheckCircle2 size={15} /> Work order linked</li>
              <li className={model.procedure ? "" : "warning"}>{model.procedure ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} Procedure attached</li>
              <li><CheckCircle2 size={15} /> QC required after completion</li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}
