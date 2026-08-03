"use client";

import {
  BadgeCheck,
  Check,
  CircleAlert,
  ClipboardList,
  Clock3,
  DollarSign,
  Gauge,
  LockKeyhole,
  Package,
  Paintbrush2,
  Settings2,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";
import {
  type WopPartsWorkflowProgress,
  WopPartsOrderingTool,
} from "./wop-parts-ordering-tool";
import {
  evaluateWopWorkOrder,
  type WopPlanType,
  type WopRecommendation,
  type WopWorkOrderInput,
} from "./wop-work-order-rules";

export type WopWorkflowProgress = {
  assignmentComplete: boolean;
  authorizationComplete: boolean;
  blockerCount: number;
  estimateComplete: boolean;
  jobsComplete: boolean;
  readinessComplete: boolean;
  recommendation: WopRecommendation;
  sequencingComplete: boolean;
  trailCount: number;
};

type StepKey = "jobs" | "estimate" | "sequence" | "assign" | "readiness" | "authorize";
type TrailEntry = { actor: string; evidence: string; result: string; step: StepKey; timestamp: string };

const initialInput: WopWorkOrderInput = {
  acceptedFindingsMapped: false,
  contingencyCaptured: false,
  criticalPathSequenced: false,
  diagnosisJobsCreated: false,
  estimatedTotalDollars: 0,
  estimateVersionLocked: false,
  laborHoursConfirmed: false,
  managerApprovalReceived: false,
  nextStageTargetConfirmed: false,
  outsideCapacityConfirmed: false,
  partsAvailabilityConfirmed: false,
  planType: "Retail recon",
  readinessRisksAssigned: false,
  repairJobsCreated: false,
  subletAndFeesConfirmed: false,
  technicianOrVendorAssigned: false,
  totalBudgetApproved: false,
  workDependenciesLinked: false,
};

const stepIndex: Record<StepKey, number> = {
  jobs: 0,
  estimate: 1,
  sequence: 2,
  assign: 3,
  readiness: 4,
  authorize: 5,
};

const planOptions: WopPlanType[] = ["Retail recon", "Safety first", "Fast frontline", "Exception"];
const workOrderReturnTo = "/vehicles/inventory";

function timeStamp() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

export function WopWorkOrderTool({ onProgressChange }: { onProgressChange: (progress: WopWorkflowProgress) => void }) {
  const [input, setInput] = useState(initialInput);
  const [partsProgress, setPartsProgress] = useState<WopPartsWorkflowProgress>({
    approvalComplete: false,
    blockerCount: 0,
    demandComplete: false,
    readinessComplete: false,
    receivingComplete: false,
    recommendation: "Create demand",
    sourcingComplete: false,
    supplementRequired: false,
    trailCount: 0,
  });
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    jobs: false,
    estimate: false,
    sequence: false,
    assign: false,
    readiness: false,
    authorize: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Start Work Order planning by mapping every accepted finding into governed jobs before estimating.");
  const effectiveInput = useMemo(() => ({
    ...input,
    partsAvailabilityConfirmed: input.partsAvailabilityConfirmed || partsProgress.readinessComplete,
  }), [input, partsProgress.readinessComplete]);
  const result = useMemo(() => evaluateWopWorkOrder(effectiveInput), [effectiveInput]);

  useEffect(() => {
    onProgressChange({
      assignmentComplete: completedSteps.assign && result.assignmentComplete,
      authorizationComplete: completedSteps.authorize && result.authorizationComplete,
      blockerCount: result.blockerCount,
      estimateComplete: completedSteps.estimate && result.estimateComplete,
      jobsComplete: completedSteps.jobs && result.jobsComplete,
      readinessComplete: completedSteps.readiness && result.readinessComplete,
      recommendation: result.recommendation,
      sequencingComplete: completedSteps.sequence && result.sequencingComplete,
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
      (Object.keys(stepIndex) as StepKey[]).forEach((key) => {
        if (stepIndex[key] >= stepIndex[step] && current[key]) {
          next[key] = false;
          reopened = true;
        }
      });
      return next;
    });
    if (reopened) appendTrail(step, "System", message, "Workflow reopened");
    setNotice(message);
  }

  function updateBoolean<K extends keyof WopWorkOrderInput>(field: K, value: WopWorkOrderInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Work-order facts changed. Reconfirm this step and all downstream authorization controls.");
  }

  function updateText<K extends keyof WopWorkOrderInput>(field: K, value: WopWorkOrderInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Work-order facts changed. Reconfirm this step and all downstream authorization controls.");
  }

  const managerApprovalRequired = input.estimatedTotalDollars > 500;
  const diagnosticHref = `/vehicles/shop-planning?returnTo=${encodeURIComponent(workOrderReturnTo)}`;
  const laborGuideHref = `/diagnostics/labor-guide?returnTo=${encodeURIComponent(workOrderReturnTo)}`;
  const autobodyLaborGuideHref = `/diagnostics/autobody-estimate?returnTo=${encodeURIComponent(workOrderReturnTo)}`;
  const repairWorkbenchHref = `/vehicles/repair-workbench?view=all&returnTo=${encodeURIComponent(workOrderReturnTo)}`;
  const partsHref = `/vehicles/parts-operations?returnTo=${encodeURIComponent(workOrderReturnTo)}`;

  function completeJobs() {
    if (!result.jobsComplete) return;
    setCompletedSteps((current) => ({ ...current, jobs: true }));
    appendTrail("jobs", "Recon planner", "Accepted findings were split into governed diagnostic and repair jobs.", "Job map");
    setNotice("Job map is locked. Build the estimate version next.");
  }

  function completeEstimate() {
    if (!completedSteps.jobs || !result.estimateComplete) return;
    setCompletedSteps((current) => ({ ...current, estimate: true }));
    appendTrail("estimate", "Estimator", "Labor, fees, contingency, and estimate version were locked for this work order.", "Estimate");
    setNotice("Estimate is complete. Sequence dependencies next.");
  }

  function completeSequence() {
    if (!completedSteps.estimate || !result.sequencingComplete) return;
    setCompletedSteps((current) => ({ ...current, sequence: true }));
    appendTrail("sequence", "Recon planner", "Dependencies and critical path were sequenced for recon execution.", "Dependency plan");
    setNotice("Dependency plan is complete. Assign work and target dates next.");
  }

  function completeAssign() {
    if (!completedSteps.sequence || !result.assignmentComplete) return;
    setCompletedSteps((current) => ({ ...current, assign: true }));
    appendTrail("assign", "Dispatcher", "Technician or vendor ownership and target dates were assigned.", "Assignments");
    setNotice("Assignments are complete. Confirm readiness proof next.");
  }

  function completeReadiness() {
    if (!completedSteps.assign || !result.readinessComplete) return;
    setCompletedSteps((current) => ({ ...current, readiness: true }));
    appendTrail("readiness", "Parts lead", "Parts availability, outside capacity, and readiness risks were confirmed.", "Readiness proof");
    setNotice("Readiness proof is complete. Obtain final authorization next.");
  }

  function completeAuthorize() {
    if (!completedSteps.readiness || !result.authorizationComplete) return;
    setCompletedSteps((current) => ({ ...current, authorize: true }));
    appendTrail("authorize", "Manager", "The exact work-order plan version and budget were authorized for recon dispatch.", "Authorization");
    setNotice("Work Order planning is complete. The unit can now hand off into Recon & Repair.");
  }

  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  return <section className={styles.wopWorkspace} aria-label="TMS Work Order Planning workspace">
    <header className={styles.wopHeader}>
      <div>
        <span><ClipboardList size={15} />TMS Work Order Planning</span>
        <h3>WOP work-order workspace</h3>
        <p>Convert approved findings into sequenced, costed, assigned, readiness-gated work before recon dispatch begins.</p>
        <div className={styles.wopHeaderActions}>
          <Link className={styles.wopHeaderLink} href={diagnosticHref}><Settings2 size={14} />Diagnostic Planning</Link>
          <Link className={styles.wopHeaderLink} href={laborGuideHref}><Gauge size={14} />Labor Guide</Link>
          <Link className={styles.wopHeaderLink} href={autobodyLaborGuideHref}><Paintbrush2 size={14} />Autobody Labor Guide</Link>
          <Link className={styles.wopHeaderLink} href={repairWorkbenchHref}><Wrench size={14} />Assign Repair Jobs</Link>
          <Link className={styles.wopHeaderLink} href={partsHref}><Package size={14} />Parts Ordering</Link>
          <a className={styles.wopHeaderLink} href="#wop-budget-approval"><DollarSign size={14} />Budget Approval</a>
        </div>
      </div>
      <div className={styles.wopVersion}>
        <small>Planning state</small>
        <strong>{result.recommendation} / {result.confidence}</strong>
      </div>
    </header>

    <div className={styles.wopBody}>
      <div className={styles.wopSteps}>
        <section className={styles.wopStepCard}>
          <header><div><span>Step 1</span><h4>Create jobs from accepted findings</h4></div><em className={completedSteps.jobs ? styles.wopComplete : ""}>{completedSteps.jobs ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Plan type</span><select aria-label="Plan type" value={input.planType} onChange={(event) => updateText("planType", event.target.value as WopPlanType, "jobs")}>{planOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.acceptedFindingsMapped} onChange={(event) => updateBoolean("acceptedFindingsMapped", event.target.checked as WopWorkOrderInput["acceptedFindingsMapped"], "jobs")} type="checkbox" /><span>Accepted findings mapped into jobs</span></label>
            <label><input checked={input.diagnosisJobsCreated} onChange={(event) => updateBoolean("diagnosisJobsCreated", event.target.checked as WopWorkOrderInput["diagnosisJobsCreated"], "jobs")} type="checkbox" /><span>Diagnostic jobs created where needed</span></label>
            <label><input checked={input.repairJobsCreated} onChange={(event) => updateBoolean("repairJobsCreated", event.target.checked as WopWorkOrderInput["repairJobsCreated"], "jobs")} type="checkbox" /><span>Repair or vendor jobs created</span></label>
          </div>
          <button className={styles.wopAction} disabled={!result.jobsComplete || completedSteps.jobs} onClick={completeJobs} type="button">Lock job map</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 2</span><h4>Estimate labor and parts</h4></div><em className={completedSteps.estimate ? styles.wopComplete : ""}>{completedSteps.estimate ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Estimated total budget</span><input aria-label="Estimated total budget" min={0} onChange={(event) => updateText("estimatedTotalDollars", Number(event.target.value), "estimate")} type="number" value={input.estimatedTotalDollars} /></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.laborHoursConfirmed} onChange={(event) => updateBoolean("laborHoursConfirmed", event.target.checked as WopWorkOrderInput["laborHoursConfirmed"], "estimate")} type="checkbox" /><span>Labor hours and rates confirmed</span></label>
            <label><input checked={input.subletAndFeesConfirmed} onChange={(event) => updateBoolean("subletAndFeesConfirmed", event.target.checked as WopWorkOrderInput["subletAndFeesConfirmed"], "estimate")} type="checkbox" /><span>Parts, sublet, and fees confirmed</span></label>
            <label><input checked={input.contingencyCaptured} onChange={(event) => updateBoolean("contingencyCaptured", event.target.checked as WopWorkOrderInput["contingencyCaptured"], "estimate")} type="checkbox" /><span>Contingency captured</span></label>
            <label><input checked={input.estimateVersionLocked} onChange={(event) => updateBoolean("estimateVersionLocked", event.target.checked as WopWorkOrderInput["estimateVersionLocked"], "estimate")} type="checkbox" /><span>Estimate version locked</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.jobs || !result.estimateComplete || completedSteps.estimate} onClick={completeEstimate} type="button">Lock estimate version</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 3</span><h4>Sequence dependencies</h4></div><em className={completedSteps.sequence ? styles.wopComplete : ""}>{completedSteps.sequence ? "Sequenced" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.workDependenciesLinked} onChange={(event) => updateBoolean("workDependenciesLinked", event.target.checked as WopWorkOrderInput["workDependenciesLinked"], "sequence")} type="checkbox" /><span>Dependencies linked</span></label>
            <label><input checked={input.criticalPathSequenced} onChange={(event) => updateBoolean("criticalPathSequenced", event.target.checked as WopWorkOrderInput["criticalPathSequenced"], "sequence")} type="checkbox" /><span>Critical path sequenced</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.estimate || !result.sequencingComplete || completedSteps.sequence} onClick={completeSequence} type="button"><Wrench size={14} />Confirm dependency plan</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 4</span><h4>Assign work and targets</h4></div><em className={completedSteps.assign ? styles.wopComplete : ""}>{completedSteps.assign ? "Assigned" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.technicianOrVendorAssigned} onChange={(event) => updateBoolean("technicianOrVendorAssigned", event.target.checked as WopWorkOrderInput["technicianOrVendorAssigned"], "assign")} type="checkbox" /><span>Technician or vendor assigned</span></label>
            <label><input checked={input.nextStageTargetConfirmed} onChange={(event) => updateBoolean("nextStageTargetConfirmed", event.target.checked as WopWorkOrderInput["nextStageTargetConfirmed"], "assign")} type="checkbox" /><span>Completion target confirmed</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.sequence || !result.assignmentComplete || completedSteps.assign} onClick={completeAssign} type="button">Lock assignments</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 5</span><h4>Secure parts and outside capacity</h4></div><em className={completedSteps.readiness ? styles.wopComplete : ""}>{completedSteps.readiness ? "Ready" : "Required"}</em></header>
          <WopPartsOrderingTool approvedBudgetDollars={input.estimatedTotalDollars} onProgressChange={setPartsProgress} />
          <div className={styles.wopChecks}>
            <label><input checked={input.outsideCapacityConfirmed} onChange={(event) => updateBoolean("outsideCapacityConfirmed", event.target.checked as WopWorkOrderInput["outsideCapacityConfirmed"], "readiness")} type="checkbox" /><span>Outside capacity confirmed</span></label>
            <label><input checked={input.readinessRisksAssigned} onChange={(event) => updateBoolean("readinessRisksAssigned", event.target.checked as WopWorkOrderInput["readinessRisksAssigned"], "readiness")} type="checkbox" /><span>Readiness risks assigned</span></label>
          </div>
          <p className={styles.wopExplanation}>{partsProgress.readinessComplete ? "Parts ordering has produced receiving-backed readiness proof for this work order." : `Parts chain is still active: ${partsProgress.recommendation}. Work Order will not clear until the exact parts path is ready for repair.`}</p>
          <button className={styles.wopAction} disabled={!completedSteps.assign || !result.readinessComplete || completedSteps.readiness} onClick={completeReadiness} type="button">Confirm readiness proof</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 6</span><h4>Authorize the exact plan version</h4></div><em className={completedSteps.authorize ? styles.wopComplete : ""}>{completedSteps.authorize ? "Approved" : "Required"}</em></header>
          <div className={styles.wopFieldGrid} id="wop-budget-approval">
            <label><span>Approval threshold</span><input disabled type="text" value={managerApprovalRequired ? "Manager approval required above $500" : "Within $500 shop approval limit"} /></label>
            <label><span>Current estimated total</span><input disabled type="text" value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(input.estimatedTotalDollars || 0)} /></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.totalBudgetApproved} onChange={(event) => updateBoolean("totalBudgetApproved", event.target.checked as WopWorkOrderInput["totalBudgetApproved"], "authorize")} type="checkbox" /><span>Total budget approved</span></label>
            <label><input checked={input.managerApprovalReceived} onChange={(event) => updateBoolean("managerApprovalReceived", event.target.checked as WopWorkOrderInput["managerApprovalReceived"], "authorize")} type="checkbox" /><span>Manager approval received for budgets above $500</span></label>
            <label><input checked={input.estimateVersionLocked} onChange={(event) => updateBoolean("estimateVersionLocked", event.target.checked as WopWorkOrderInput["estimateVersionLocked"], "authorize")} type="checkbox" /><span>Authorized estimate version locked</span></label>
          </div>
          <p className={styles.wopExplanation}>{managerApprovalRequired ? "This work order is above your $500 operating threshold and cannot hand off until a manager approves the exact plan version." : "This work order is within the current $500 operating threshold and can be approved inside the stage once the exact plan version is locked."}</p>
          <button className={styles.wopAction} disabled={!completedSteps.readiness || !result.authorizationComplete || completedSteps.authorize} onClick={completeAuthorize} type="button"><LockKeyhole size={14} />Authorize work order</button>
        </section>
      </div>

      <aside className={styles.wopDecision}>
        <header><Wrench size={18} /><div><span>WOP recommendation</span><strong>{result.recommendation}</strong></div><em className={result.recommendation === "Ready for recon dispatch" ? styles.wopComplete : result.recommendation === "Exception" ? styles.wopHold : ""}>{result.readinessScore}/100</em></header>
        <dl>
          <div><dt>Planning score</dt><dd>{result.readinessScore}/100</dd></div>
          <div><dt>Controls complete</dt><dd>{stepCount}/6</dd></div>
          <div><dt>Confidence</dt><dd>{result.confidence}</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockerCount}</dd></div>
          <div><dt>Plan type</dt><dd>{input.planType}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
        </dl>
        <p className={styles.wopExplanation}>{result.explanation}</p>
        <div className={styles.wopDrivers}>
          <div>
            <strong>What is working</strong>
            {(result.positiveDrivers.length ? result.positiveDrivers : ["No confirmed work-order strength yet."]).map((item) => <span key={item}>{result.positiveDrivers.length ? <Check size={14} /> : <CircleAlert size={14} />}{item}</span>)}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.blockers.map((item) => <span key={item}><CircleAlert size={14} />{item}</span>)}
          </div>
        </div>
        <section className={styles.wopTrail}>
          <header><Clock3 size={18} /><h4>Operational work trail</h4></header>
          {trail.length ? <ul>{trail.map((item, index) => <li key={`${item.step}-${item.timestamp}-${index}`}><strong>{item.timestamp}</strong><span>{item.actor}</span><div>{item.result}</div><small>{item.evidence}</small></li>)}</ul> : <p>No work-order planning action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.wopApproval}>
      <div>
        <span><ClipboardList size={14} />Job map</span>
        <strong>{completedSteps.jobs ? "Controlled jobs created" : "Job map still active"}</strong>
        <small>Every accepted finding should live inside an exact governed job before estimating begins.</small>
      </div>
      <div>
        <span><ShieldCheck size={14} />Readiness and assignment</span>
        <strong>{completedSteps.readiness ? "Ready for dispatch" : "Readiness still active"}</strong>
        <small>Assignments, parts, outside capacity, and readiness risks should support recon dispatch.</small>
      </div>
      <div>
        <span><BadgeCheck size={14} />Stage readiness</span>
        <strong>{completedSteps.authorize ? "Ready for Recon & Repair" : "Work Order still active"}</strong>
        <small>{completedSteps.authorize ? "The unit can move into governed recon execution next." : "Complete final budget authorization before handoff."}</small>
      </div>
    </section>

    <footer className={styles.wopNotice} aria-live="polite"><CircleAlert size={14} />{notice}</footer>
  </section>;
}
