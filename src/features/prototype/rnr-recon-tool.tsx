"use client";

import {
  BadgeCheck,
  Check,
  CircleAlert,
  ClipboardList,
  Clock3,
  LockKeyhole,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";

export type RnrWorkflowProgress = {
  acceptanceComplete: boolean;
  blockerCount: number;
  changeApprovalComplete: boolean;
  completionProofComplete: boolean;
  diagnosisComplete: boolean;
  executionComplete: boolean;
  reconciliationComplete: boolean;
  recommendation: "Acknowledge job" | "Diagnose" | "Authorize change" | "Perform work" | "Attach completion proof" | "Reconcile and release" | "Ready for Final QC";
  trailCount: number;
};

type StepKey = "accept" | "diagnosis" | "change" | "execute" | "proof" | "reconcile";
type TrailEntry = { actor: string; evidence: string; result: string; step: StepKey; timestamp: string };
type ChangeState = "No scope change" | "Approved change" | "Approval pending";
type DiagnosisState = "Not needed" | "Required and completed" | "Still open";

type ReconInput = {
  bayConfirmed: boolean;
  beforeAfterEvidenceLogged: boolean;
  changeState: ChangeState;
  diagnosticFindingLogged: boolean;
  diagnosisState: DiagnosisState;
  expectedFinishConfirmed: boolean;
  jobAccepted: boolean;
  partsAndSubletReconciled: boolean;
  qcReadySignoffCaptured: boolean;
  repairOrVendorWorkPerformed: boolean;
  rootCauseCaptured: boolean;
  safetyImpactReviewed: boolean;
  scanRoadTestOrMeasurementLogged: boolean;
  technicianAssigned: boolean;
  technicianNotesPublished: boolean;
  totalCostAndLaborReconciled: boolean;
  vendorOrCalibrationClosed: boolean;
};

const initialInput: ReconInput = {
  bayConfirmed: false,
  beforeAfterEvidenceLogged: false,
  changeState: "No scope change",
  diagnosticFindingLogged: false,
  diagnosisState: "Not needed",
  expectedFinishConfirmed: false,
  jobAccepted: false,
  partsAndSubletReconciled: false,
  qcReadySignoffCaptured: false,
  repairOrVendorWorkPerformed: false,
  rootCauseCaptured: false,
  safetyImpactReviewed: false,
  scanRoadTestOrMeasurementLogged: false,
  technicianAssigned: false,
  technicianNotesPublished: false,
  totalCostAndLaborReconciled: false,
  vendorOrCalibrationClosed: false,
};

const returnTo = "/vehicles/inventory";

function timeStamp() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

function evaluateRecon(input: ReconInput) {
  const acceptanceComplete = input.jobAccepted && input.technicianAssigned && input.expectedFinishConfirmed && input.bayConfirmed;
  const diagnosisComplete = input.diagnosisState === "Not needed" || (
    input.diagnosisState === "Required and completed" &&
    input.diagnosticFindingLogged &&
    input.rootCauseCaptured &&
    input.safetyImpactReviewed
  );
  const changeApprovalComplete = input.changeState !== "Approval pending";
  const executionComplete = input.repairOrVendorWorkPerformed && input.vendorOrCalibrationClosed && input.technicianNotesPublished;
  const completionProofComplete = input.beforeAfterEvidenceLogged && input.scanRoadTestOrMeasurementLogged && input.qcReadySignoffCaptured;
  const reconciliationComplete = input.partsAndSubletReconciled && input.totalCostAndLaborReconciled;

  const blockers = [
    !acceptanceComplete ? "Next ready job has not been fully accepted into accountable execution." : null,
    !diagnosisComplete ? "Diagnosis or root-cause evidence is still incomplete." : null,
    !changeApprovalComplete ? "A scope or cost change is waiting for approval." : null,
    !executionComplete ? "Approved repair or outside work is still in progress." : null,
    !completionProofComplete ? "Completion proof is not yet strong enough for Final QC." : null,
    !reconciliationComplete ? "Parts, sublet, labor, or cost reconciliation remains open." : null,
  ].filter((item): item is string => Boolean(item));

  const recommendation: RnrWorkflowProgress["recommendation"] =
    !acceptanceComplete ? "Acknowledge job"
      : !diagnosisComplete ? "Diagnose"
        : !changeApprovalComplete ? "Authorize change"
          : !executionComplete ? "Perform work"
            : !completionProofComplete ? "Attach completion proof"
              : !reconciliationComplete ? "Reconcile and release"
                : "Ready for Final QC";

  const positiveDrivers = [
    acceptanceComplete ? "The job has an accountable technician, bay, and target." : null,
    diagnosisComplete ? "Diagnosis and safety impact are controlled for this execution cycle." : null,
    changeApprovalComplete ? "No unapproved scope or cost change is blocking work." : null,
    executionComplete ? "Repair execution and outside dependencies are complete." : null,
    completionProofComplete ? "Final evidence package is strong enough for independent QC." : null,
    reconciliationComplete ? "Parts, outside services, and actual cost trail are reconciled." : null,
  ].filter((item): item is string => Boolean(item));

  return {
    acceptanceComplete,
    blockerCount: blockers.length,
    blockers,
    changeApprovalComplete,
    completionProofComplete,
    diagnosisComplete,
    executionComplete,
    positiveDrivers,
    recommendation,
    reconciliationComplete,
  };
}

export function RnrReconTool({ onProgressChange }: { onProgressChange: (progress: RnrWorkflowProgress) => void }) {
  const [input, setInput] = useState(initialInput);
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    accept: false,
    change: false,
    diagnosis: false,
    execute: false,
    proof: false,
    reconcile: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Start with the exact next ready job so the technician, bay, target, and expected output are explicit before work begins.");
  const result = useMemo(() => evaluateRecon(input), [input]);

  useEffect(() => {
    onProgressChange({
      acceptanceComplete: completedSteps.accept && result.acceptanceComplete,
      blockerCount: result.blockerCount,
      changeApprovalComplete: completedSteps.change && result.changeApprovalComplete,
      completionProofComplete: completedSteps.proof && result.completionProofComplete,
      diagnosisComplete: completedSteps.diagnosis && result.diagnosisComplete,
      executionComplete: completedSteps.execute && result.executionComplete,
      reconciliationComplete: completedSteps.reconcile && result.reconciliationComplete,
      recommendation: result.recommendation,
      trailCount: trail.length,
    });
  }, [completedSteps, onProgressChange, result, trail.length]);

  function appendTrail(step: StepKey, actor: string, resultText: string, evidence: string) {
    setTrail((current) => [{ actor, evidence, result: resultText, step, timestamp: timeStamp() }, ...current]);
  }

  function invalidateFrom(step: StepKey, message: string) {
    let reopened = false;
    setCompletedSteps((current) => {
      const next = { ...current };
      const order: StepKey[] = ["accept", "diagnosis", "change", "execute", "proof", "reconcile"];
      const startIndex = order.indexOf(step);
      order.forEach((key, index) => {
        if (index >= startIndex && current[key]) {
          next[key] = false;
          reopened = true;
        }
      });
      return next;
    });
    if (reopened) appendTrail(step, "System", message, "Execution control reopened");
    setNotice(message);
  }

  function updateBoolean<K extends keyof ReconInput>(field: K, value: ReconInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Recon facts changed. Reconfirm this step and every downstream control before handoff.");
  }

  function updateValue<K extends keyof ReconInput>(field: K, value: ReconInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Recon facts changed. Reconfirm this step and every downstream control before handoff.");
  }

  function completeAccept() {
    if (!result.acceptanceComplete) return;
    setCompletedSteps((current) => ({ ...current, accept: true }));
    appendTrail("accept", "Recon lead", "The next ready job was acknowledged with technician, bay, and completion target.", "Job acceptance");
    setNotice("Execution start is controlled. Confirm diagnosis evidence next.");
  }

  function completeDiagnosis() {
    if (!completedSteps.accept || !result.diagnosisComplete) return;
    setCompletedSteps((current) => ({ ...current, diagnosis: true }));
    appendTrail("diagnosis", "Technician", input.diagnosisState === "Not needed" ? "No additional diagnosis was required before execution." : "Diagnosis, root cause, and safety relevance were documented.", "Diagnosis");
    setNotice("Diagnosis control is complete. Resolve any scope or cost change authorization next.");
  }

  function completeChange() {
    if (!completedSteps.diagnosis || !result.changeApprovalComplete) return;
    setCompletedSteps((current) => ({ ...current, change: true }));
    appendTrail("change", input.changeState === "Approved change" ? "Manager" : "Recon lead", input.changeState === "Approved change" ? "Scope or cost change was approved before execution continued." : "No scope or cost change approval was needed for this cycle.", "Change approval");
    setNotice("Authorization is current. Record the actual repair and recon work next.");
  }

  function completeExecute() {
    if (!completedSteps.change || !result.executionComplete) return;
    setCompletedSteps((current) => ({ ...current, execute: true }));
    appendTrail("execute", "Technician", "Approved repair, outside service, and technician execution notes were completed.", "Work record");
    setNotice("Execution is complete. Attach completion proof for Final QC next.");
  }

  function completeProof() {
    if (!completedSteps.execute || !result.completionProofComplete) return;
    setCompletedSteps((current) => ({ ...current, proof: true }));
    appendTrail("proof", "Technician", "Before/after evidence, test or measurement proof, and QC-ready signoff were attached.", "Completion proof");
    setNotice("Completion proof is complete. Reconcile parts, outside services, and actual cost next.");
  }

  function completeReconcile() {
    if (!completedSteps.proof || !result.reconciliationComplete) return;
    setCompletedSteps((current) => ({ ...current, reconcile: true }));
    appendTrail("reconcile", "Recon team lead", "Parts, sublet, labor, and actual cost were reconciled and the job was released to Final QC.", "Reconciliation");
    setNotice("Recon & Repair is complete. The vehicle can now move into Final QC.");
  }

  const repairWorkbenchHref = `/vehicles/repair-workbench?view=all&returnTo=${encodeURIComponent(returnTo)}`;
  const partsOrderingHref = `/diagnostics/parts-ordering?returnTo=${encodeURIComponent(returnTo)}`;
  const shopReconHref = `/vehicles/shop-recon?returnTo=${encodeURIComponent(returnTo)}`;
  const qcHref = `/vehicles/quality-control?returnTo=${encodeURIComponent(returnTo)}`;
  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  return <section className={styles.wopWorkspace} aria-label="TMS Recon and Repair workspace">
    <header className={styles.wopHeader}>
      <div>
        <span><Wrench size={15} />TMS Recon &amp; Repair</span>
        <h3>RNR execution workspace</h3>
        <p>Guide the technician and recon lead through job acceptance, diagnosis, approval, execution, proof, and reconciliation before Final QC.</p>
        <div className={styles.wopHeaderActions}>
          <Link className={styles.wopHeaderLink} href={shopReconHref}><ClipboardList size={14} />Shop &amp; Recon board</Link>
          <Link className={styles.wopHeaderLink} href={repairWorkbenchHref}><Wrench size={14} />Repair Workbench</Link>
          <Link className={styles.wopHeaderLink} href={partsOrderingHref}><ShieldCheck size={14} />Parts ordering</Link>
          <Link className={styles.wopHeaderLink} href={qcHref}><BadgeCheck size={14} />Final QC queue</Link>
        </div>
      </div>
      <div className={styles.wopVersion}>
        <small>Execution state</small>
        <strong>{result.recommendation}</strong>
      </div>
    </header>

    <div className={styles.wopBody}>
      <div className={styles.wopSteps}>
        <section className={styles.wopStepCard}>
          <header><div><span>Step 1</span><h4>Acknowledge the next ready job</h4></div><em className={completedSteps.accept ? styles.wopComplete : ""}>{completedSteps.accept ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.jobAccepted} onChange={(event) => updateBoolean("jobAccepted", event.target.checked, "accept")} type="checkbox" /><span>Technician or vendor accepted the ready job</span></label>
            <label><input checked={input.technicianAssigned} onChange={(event) => updateBoolean("technicianAssigned", event.target.checked, "accept")} type="checkbox" /><span>Accountable technician or vendor is assigned</span></label>
            <label><input checked={input.bayConfirmed} onChange={(event) => updateBoolean("bayConfirmed", event.target.checked, "accept")} type="checkbox" /><span>Bay or work location is confirmed</span></label>
            <label><input checked={input.expectedFinishConfirmed} onChange={(event) => updateBoolean("expectedFinishConfirmed", event.target.checked, "accept")} type="checkbox" /><span>Completion target is confirmed with the team</span></label>
          </div>
          <button className={styles.wopAction} disabled={!result.acceptanceComplete || completedSteps.accept} onClick={completeAccept} type="button">Lock job acceptance</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 2</span><h4>Complete required diagnosis</h4></div><em className={completedSteps.diagnosis ? styles.wopComplete : ""}>{completedSteps.diagnosis ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Diagnosis state</span><select onChange={(event) => updateValue("diagnosisState", event.target.value as DiagnosisState, "diagnosis")} value={input.diagnosisState}><option>Not needed</option><option>Required and completed</option><option>Still open</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.diagnosticFindingLogged} disabled={input.diagnosisState === "Not needed"} onChange={(event) => updateBoolean("diagnosticFindingLogged", event.target.checked, "diagnosis")} type="checkbox" /><span>Diagnostic findings were documented</span></label>
            <label><input checked={input.rootCauseCaptured} disabled={input.diagnosisState === "Not needed"} onChange={(event) => updateBoolean("rootCauseCaptured", event.target.checked, "diagnosis")} type="checkbox" /><span>Root cause or confirmed condition was captured</span></label>
            <label><input checked={input.safetyImpactReviewed} disabled={input.diagnosisState === "Not needed"} onChange={(event) => updateBoolean("safetyImpactReviewed", event.target.checked, "diagnosis")} type="checkbox" /><span>Safety impact was reviewed and classified</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.accept || !result.diagnosisComplete || completedSteps.diagnosis} onClick={completeDiagnosis} type="button">Lock diagnosis</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 3</span><h4>Obtain change authorization</h4></div><em className={completedSteps.change ? styles.wopComplete : ""}>{completedSteps.change ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Scope / cost change</span><select onChange={(event) => updateValue("changeState", event.target.value as ChangeState, "change")} value={input.changeState}><option>No scope change</option><option>Approved change</option><option>Approval pending</option></select></label>
          </div>
          <p className={styles.wopExplanation}>{input.changeState === "Approval pending" ? "Execution should not continue past diagnosis until the exact change is approved." : input.changeState === "Approved change" ? "A controlled scope or cost change was approved and can be executed." : "No extra authorization was needed for this repair cycle."}</p>
          <button className={styles.wopAction} disabled={!completedSteps.diagnosis || !result.changeApprovalComplete || completedSteps.change} onClick={completeChange} type="button"><LockKeyhole size={14} />Lock change control</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 4</span><h4>Perform repair or recon work</h4></div><em className={completedSteps.execute ? styles.wopComplete : ""}>{completedSteps.execute ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.repairOrVendorWorkPerformed} onChange={(event) => updateBoolean("repairOrVendorWorkPerformed", event.target.checked, "execute")} type="checkbox" /><span>Approved repair or vendor work was performed</span></label>
            <label><input checked={input.vendorOrCalibrationClosed} onChange={(event) => updateBoolean("vendorOrCalibrationClosed", event.target.checked, "execute")} type="checkbox" /><span>Outside service, calibration, or vendor dependency is closed</span></label>
            <label><input checked={input.technicianNotesPublished} onChange={(event) => updateBoolean("technicianNotesPublished", event.target.checked, "execute")} type="checkbox" /><span>Technician notes were published for the work performed</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.change || !result.executionComplete || completedSteps.execute} onClick={completeExecute} type="button">Lock execution record</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 5</span><h4>Prove job completion</h4></div><em className={completedSteps.proof ? styles.wopComplete : ""}>{completedSteps.proof ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.beforeAfterEvidenceLogged} onChange={(event) => updateBoolean("beforeAfterEvidenceLogged", event.target.checked, "proof")} type="checkbox" /><span>Before and after evidence is attached</span></label>
            <label><input checked={input.scanRoadTestOrMeasurementLogged} onChange={(event) => updateBoolean("scanRoadTestOrMeasurementLogged", event.target.checked, "proof")} type="checkbox" /><span>Scan, road test, or measurement proof is logged</span></label>
            <label><input checked={input.qcReadySignoffCaptured} onChange={(event) => updateBoolean("qcReadySignoffCaptured", event.target.checked, "proof")} type="checkbox" /><span>QC-ready signoff was captured</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.execute || !result.completionProofComplete || completedSteps.proof} onClick={completeProof} type="button">Lock completion proof</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 6</span><h4>Reconcile execution dependencies</h4></div><em className={completedSteps.reconcile ? styles.wopComplete : ""}>{completedSteps.reconcile ? "Released" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.partsAndSubletReconciled} onChange={(event) => updateBoolean("partsAndSubletReconciled", event.target.checked, "reconcile")} type="checkbox" /><span>Parts, sublet, and returns are reconciled</span></label>
            <label><input checked={input.totalCostAndLaborReconciled} onChange={(event) => updateBoolean("totalCostAndLaborReconciled", event.target.checked, "reconcile")} type="checkbox" /><span>Actual labor and total cost are reconciled</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.proof || !result.reconciliationComplete || completedSteps.reconcile} onClick={completeReconcile} type="button">Release to Final QC</button>
        </section>
      </div>

      <aside className={styles.wopDecision}>
        <header><Wrench size={18} /><div><span>Recon recommendation</span><strong>{result.recommendation}</strong></div><em className={result.recommendation === "Ready for Final QC" ? styles.wopComplete : result.recommendation === "Authorize change" ? styles.wopHold : ""}>{stepCount}/6</em></header>
        <dl>
          <div><dt>Controls complete</dt><dd>{stepCount}/6</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockerCount}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
          <div><dt>Next action</dt><dd>{result.recommendation}</dd></div>
          <div><dt>Technician assignment</dt><dd>{input.technicianAssigned ? "Assigned" : "Pending"}</dd></div>
          <div><dt>Change control</dt><dd>{input.changeState}</dd></div>
        </dl>
        <p className={styles.wopExplanation}>{result.recommendation === "Ready for Final QC" ? "Execution is complete, evidence is attached, and reconciliation is current. The vehicle can now move into Final QC." : "Work in this stage should stay visible until the exact blocker is resolved and the next controlled action is confirmed."}</p>
        <div className={styles.wopDrivers}>
          <div>
            <strong>What is working</strong>
            {(result.positiveDrivers.length ? result.positiveDrivers : ["No confirmed recon strength yet."]).map((item) => <span key={item}>{result.positiveDrivers.length ? <Check size={14} /> : <CircleAlert size={14} />}{item}</span>)}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.blockers.map((item) => <span key={item}><CircleAlert size={14} />{item}</span>)}
          </div>
        </div>
        <section className={styles.wopTrail}>
          <header><Clock3 size={18} /><h4>Operational work trail</h4></header>
          {trail.length ? <ul>{trail.map((item, index) => <li key={`${item.step}-${item.timestamp}-${index}`}><strong>{item.timestamp}</strong><span>{item.actor}</span><div>{item.result}</div><small>{item.evidence}</small></li>)}</ul> : <p>No recon execution action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.wopApproval}>
      <div>
        <span><ClipboardList size={14} />Execution intake</span>
        <strong>{completedSteps.accept ? "Ready job acknowledged" : "Waiting for job acceptance"}</strong>
        <small>The next executable job should be accepted with a real technician, bay, and target.</small>
      </div>
      <div>
        <span><ShieldCheck size={14} />Proof and control</span>
        <strong>{completedSteps.proof ? "Completion proof attached" : "Completion proof still active"}</strong>
        <small>Before/after evidence and test proof should exist before Final QC begins.</small>
      </div>
      <div>
        <span><BadgeCheck size={14} />Stage readiness</span>
        <strong>{completedSteps.reconcile ? "Ready for Final QC" : "Recon & Repair still active"}</strong>
        <small>{completedSteps.reconcile ? "This unit can now hand off into the Final QC stage." : "Finish reconciliation before the lifecycle handoff opens."}</small>
      </div>
    </section>

    <footer className={styles.wopNotice} aria-live="polite"><CircleAlert size={14} />{notice}</footer>
  </section>;
}
