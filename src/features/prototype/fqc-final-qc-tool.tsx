"use client";

import {
  BadgeCheck,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  ScanLine,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";

export type FqcWorkflowProgress = {
  blockerCount: number;
  decisionComplete: boolean;
  diagnosisScanComplete: boolean;
  jobsVerifiedComplete: boolean;
  leaksAndWorkmanshipComplete: boolean;
  recommendation: "Verify jobs" | "Complete final scan" | "Perform road test" | "Inspect workmanship" | "Resolve safety controls" | "Issue final QC decision" | "Ready for detailing";
  roadTestComplete: boolean;
  safetyComplete: boolean;
  trailCount: number;
};

type StepKey = "jobs" | "scan" | "road" | "workmanship" | "safety" | "decision";
type TrailEntry = { actor: string; evidence: string; result: string; step: StepKey; timestamp: string };
type RoadTestState = "Not required" | "Required and passed" | "Required and failed" | "Pending";
type SafetyState = "No open safety hold" | "Disclosure recorded" | "Open safety issue";
type FinalDecision = "Pass" | "Rework" | "Disclose" | "Hold";

type FinalQcInput = {
  calibrationVerified: boolean;
  codesClearedOrExplained: boolean;
  decisionState: FinalDecision;
  fitAndFinishVerified: boolean;
  fluidAndLeakCheckPassed: boolean;
  jobEvidenceReviewed: boolean;
  noComebackRiskObserved: boolean;
  qcDecisionNotesLogged: boolean;
  recallOrDisclosureHandled: boolean;
  roadTestEvidenceLogged: boolean;
  roadTestState: RoadTestState;
  safetyState: SafetyState;
  scanCompleted: boolean;
  torqueAndFastenersVerified: boolean;
  warningLightsResolved: boolean;
  workMatchesAuthorization: boolean;
};

type ChecklistResult = "PASS" | "FAIL" | "NOT_APPLICABLE";
type ChecklistItem = {
  code: string;
  detail: string;
  label: string;
  required: boolean;
};

const initialInput: FinalQcInput = {
  calibrationVerified: false,
  codesClearedOrExplained: false,
  decisionState: "Hold",
  fitAndFinishVerified: false,
  fluidAndLeakCheckPassed: false,
  jobEvidenceReviewed: false,
  noComebackRiskObserved: false,
  qcDecisionNotesLogged: false,
  recallOrDisclosureHandled: false,
  roadTestEvidenceLogged: false,
  roadTestState: "Pending",
  safetyState: "Open safety issue",
  scanCompleted: false,
  torqueAndFastenersVerified: false,
  warningLightsResolved: false,
  workMatchesAuthorization: false,
};

const checklistItems: ChecklistItem[] = [
  {
    code: "JOB_SCOPE_MATCH",
    detail: "The completed job matches the approved repair scope and there is no unauthorized work inside the release package.",
    label: "Authorized repair scope matches completed work",
    required: true,
  },
  {
    code: "EVIDENCE_REVIEW",
    detail: "Technician evidence, parts usage, and handoff notes support the claimed repair outcome.",
    label: "Completion evidence supports the repair",
    required: true,
  },
  {
    code: "FINAL_SCAN",
    detail: "Final diagnostic scan, codes, warning lights, monitors, and calibration evidence are acceptable.",
    label: "Final scan and warning-light state are acceptable",
    required: true,
  },
  {
    code: "ROAD_TEST",
    detail: "Road test passed when required, or the repair was correctly classified as not needing one.",
    label: "Road-test requirement is satisfied",
    required: true,
  },
  {
    code: "LEAKS_AND_ROUTING",
    detail: "No fluid leak, hose routing, fastener, torque, or unfinished workmanship concern remains.",
    label: "Leak and workmanship check passed",
    required: true,
  },
  {
    code: "FIT_FINISH",
    detail: "Panels, trim, cleanliness, and general fit/finish meet release standard.",
    label: "Fit, finish, and cleanliness meet standard",
    required: true,
  },
  {
    code: "PARTS_AND_RETURNS",
    detail: "Installed parts, unused parts, cores, and returns are all accounted for before release.",
    label: "Parts usage and returns are accounted for",
    required: true,
  },
  {
    code: "SAFETY_DISCLOSURE",
    detail: "No unresolved safety hold remains, and any disclosure or recall requirement is recorded correctly.",
    label: "Safety, disclosure, and recall controls are resolved",
    required: true,
  },
];

const returnTo = "/vehicles/inventory/prototype";

function timeStamp() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

function evaluateFinalQc(input: FinalQcInput) {
  const jobsVerifiedComplete = input.jobEvidenceReviewed && input.workMatchesAuthorization;
  const diagnosisScanComplete = input.scanCompleted && input.codesClearedOrExplained && input.warningLightsResolved && input.calibrationVerified;
  const roadTestComplete = input.roadTestState === "Not required" || (input.roadTestState === "Required and passed" && input.roadTestEvidenceLogged);
  const leaksAndWorkmanshipComplete = input.fluidAndLeakCheckPassed && input.torqueAndFastenersVerified && input.fitAndFinishVerified && input.noComebackRiskObserved;
  const safetyComplete = input.safetyState !== "Open safety issue" && input.recallOrDisclosureHandled;
  const decisionComplete = input.qcDecisionNotesLogged && (
    (input.decisionState === "Pass" && jobsVerifiedComplete && diagnosisScanComplete && roadTestComplete && leaksAndWorkmanshipComplete && safetyComplete)
      || input.decisionState === "Rework"
      || input.decisionState === "Disclose"
      || input.decisionState === "Hold"
  );

  const blockers = [
    !jobsVerifiedComplete ? "Completed jobs have not yet been fully matched to the authorized repair scope." : null,
    !diagnosisScanComplete ? "Final diagnostic scan, codes, warning lights, or calibration proof is incomplete." : null,
    !roadTestComplete ? "Required road-test proof is still missing or failed." : null,
    !leaksAndWorkmanshipComplete ? "Workmanship, leak, fastener, or comeback-risk inspection is still open." : null,
    !safetyComplete ? "Safety hold, recall, or disclosure control is still open." : null,
    !decisionComplete ? "Independent Final QC decision has not been fully issued." : null,
  ].filter((item): item is string => Boolean(item));

  const recommendation: FqcWorkflowProgress["recommendation"] =
    !jobsVerifiedComplete ? "Verify jobs"
      : !diagnosisScanComplete ? "Complete final scan"
        : !roadTestComplete ? "Perform road test"
          : !leaksAndWorkmanshipComplete ? "Inspect workmanship"
            : !safetyComplete ? "Resolve safety controls"
              : !decisionComplete ? "Issue final QC decision"
                : "Ready for detailing";

  const positiveDrivers = [
    jobsVerifiedComplete ? "Authorized repair scope matches the completed work evidence." : null,
    diagnosisScanComplete ? "Final scan, warnings, and calibration controls are complete." : null,
    roadTestComplete ? "Road-test requirement is satisfied for this repair cycle." : null,
    leaksAndWorkmanshipComplete ? "Leak, workmanship, and comeback-risk checks are complete." : null,
    safetyComplete ? "Safety and disclosure controls are resolved." : null,
    decisionComplete ? `Independent Final QC decision recorded: ${input.decisionState}.` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    blockerCount: blockers.length,
    blockers,
    decisionComplete,
    diagnosisScanComplete,
    jobsVerifiedComplete,
    leaksAndWorkmanshipComplete,
    positiveDrivers,
    recommendation,
    roadTestComplete,
    safetyComplete,
  };
}

export function FqcFinalQcTool({ onProgressChange }: { onProgressChange: (progress: FqcWorkflowProgress) => void }) {
  const [input, setInput] = useState(initialInput);
  const [checkResults, setCheckResults] = useState<Record<string, ChecklistResult>>(() =>
    Object.fromEntries(checklistItems.map((item) => [item.code, "FAIL" as ChecklistResult])),
  );
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    decision: false,
    jobs: false,
    road: false,
    safety: false,
    scan: false,
    workmanship: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Start Final QC by independently verifying that the completed repair jobs truly match the authorized work and evidence package.");
  const result = useMemo(() => evaluateFinalQc(input), [input]);
  const checklistSummary = useMemo(() => {
    const required = checklistItems.filter((item) => item.required);
    const passed = required.filter((item) => checkResults[item.code] === "PASS").length;
    const failed = required.filter((item) => checkResults[item.code] === "FAIL").length;
    const notApplicable = required.filter((item) => checkResults[item.code] === "NOT_APPLICABLE").length;
    return { failed, notApplicable, passed, total: required.length };
  }, [checkResults]);

  useEffect(() => {
    onProgressChange({
      blockerCount: result.blockerCount,
      decisionComplete: completedSteps.decision && result.decisionComplete,
      diagnosisScanComplete: completedSteps.scan && result.diagnosisScanComplete,
      jobsVerifiedComplete: completedSteps.jobs && result.jobsVerifiedComplete,
      leaksAndWorkmanshipComplete: completedSteps.workmanship && result.leaksAndWorkmanshipComplete,
      recommendation: result.recommendation,
      roadTestComplete: completedSteps.road && result.roadTestComplete,
      safetyComplete: completedSteps.safety && result.safetyComplete,
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
      const order: StepKey[] = ["jobs", "scan", "road", "workmanship", "safety", "decision"];
      const startIndex = order.indexOf(step);
      order.forEach((key, index) => {
        if (index >= startIndex && current[key]) {
          next[key] = false;
          reopened = true;
        }
      });
      return next;
    });
    if (reopened) appendTrail(step, "System", message, "QC control reopened");
    setNotice(message);
  }

  function updateBoolean<K extends keyof FinalQcInput>(field: K, value: FinalQcInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Final QC facts changed. Reconfirm this step and every downstream control before release.");
  }

  function updateValue<K extends keyof FinalQcInput>(field: K, value: FinalQcInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Final QC facts changed. Reconfirm this step and every downstream control before release.");
  }

  function updateChecklist(code: string, value: ChecklistResult) {
    setCheckResults((current) => ({ ...current, [code]: value }));
    setNotice("Final QC checklist updated. Continue recording each independent inspection result before issuing the final decision.");
  }

  function completeJobs() {
    if (!result.jobsVerifiedComplete) return;
    setCompletedSteps((current) => ({ ...current, jobs: true }));
    appendTrail("jobs", "Final QC inspector", "Completed jobs were independently matched to the approved repair scope and evidence package.", "Job verification");
    setNotice("Job verification is complete. Confirm the final diagnostic scan next.");
  }

  function completeScan() {
    if (!completedSteps.jobs || !result.diagnosisScanComplete) return;
    setCompletedSteps((current) => ({ ...current, scan: true }));
    appendTrail("scan", "Final QC inspector", "Final scan, code status, warning lights, and calibration proof were verified.", "Final scan");
    setNotice("Diagnostic confirmation is complete. Resolve the road-test requirement next.");
  }

  function completeRoad() {
    if (!completedSteps.scan || !result.roadTestComplete) return;
    setCompletedSteps((current) => ({ ...current, road: true }));
    appendTrail("road", "Final QC inspector", input.roadTestState === "Not required" ? "Road test was not required for this repair cycle." : "Final road-test outcome was captured and passed.", "Road test");
    setNotice("Road-test control is complete. Inspect workmanship and leak risk next.");
  }

  function completeWorkmanship() {
    if (!completedSteps.road || !result.leaksAndWorkmanshipComplete) return;
    setCompletedSteps((current) => ({ ...current, workmanship: true }));
    appendTrail("workmanship", "Final QC inspector", "Leak, fastener, workmanship, fit, and comeback-risk checks were completed.", "Workmanship check");
    setNotice("Workmanship control is complete. Resolve final safety and disclosure controls next.");
  }

  function completeSafety() {
    if (!completedSteps.workmanship || !result.safetyComplete) return;
    setCompletedSteps((current) => ({ ...current, safety: true }));
    appendTrail("safety", "QC lead", "Safety hold, recall, and disclosure controls were resolved for this repair cycle.", "Safety release");
    setNotice("Safety control is complete. Issue the independent Final QC decision next.");
  }

  function completeDecision() {
    if (!completedSteps.safety || !result.decisionComplete) return;
    setCompletedSteps((current) => ({ ...current, decision: true }));
    appendTrail("decision", "QC lead", `Independent Final QC decision recorded as ${input.decisionState}.`, "Final approval");
    setNotice(input.decisionState === "Pass" ? "Final QC is complete. The vehicle can now hand off into detailing." : "Final QC decision recorded. The vehicle remains governed by the issued decision.");
  }

  const qcHref = `/vehicles/quality-control?returnTo=${encodeURIComponent(returnTo)}`;
  const shopReconHref = `/vehicles/shop-recon?returnTo=${encodeURIComponent(returnTo)}`;
  const repairWorkbenchHref = `/vehicles/repair-workbench?view=all&returnTo=${encodeURIComponent(returnTo)}`;
  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  return <section className={styles.wopWorkspace} aria-label="TMS Final QC workspace">
    <header className={styles.wopHeader}>
      <div>
        <span><BadgeCheck size={15} />TMS Final Quality Control</span>
        <h3>FQC release workspace</h3>
        <p>Independently validate repair quality, safety, and release readiness before the vehicle moves into detailing.</p>
        <div className={styles.wopHeaderActions}>
          <Link className={styles.wopHeaderLink} href={qcHref}><ClipboardCheck size={14} />Live QC workspace</Link>
          <Link className={styles.wopHeaderLink} href={repairWorkbenchHref}><Wrench size={14} />Repair Workbench</Link>
          <Link className={styles.wopHeaderLink} href={shopReconHref}><ShieldCheck size={14} />Shop &amp; Recon board</Link>
        </div>
      </div>
      <div className={styles.wopVersion}>
        <small>QC state</small>
        <strong>{result.recommendation}</strong>
      </div>
    </header>

    <div className={styles.wopBody}>
      <div className={styles.wopSteps}>
        <section className={styles.wopStepCard}>
          <header><div><span>Step 1</span><h4>Verify every completed job</h4></div><em className={completedSteps.jobs ? styles.wopComplete : ""}>{completedSteps.jobs ? "Locked" : "Required"}</em></header>
          <div className={styles.fqcChecklistIntro}>
            <strong>Final QC inspection checklist form</strong>
            <small>Staff should walk this checklist item by item and record a result for each release-critical control.</small>
          </div>
          <div className={styles.fqcChecklistGrid}>
            {checklistItems.map((item) => <article className={styles.fqcChecklistItem} key={item.code}>
              <div className={styles.fqcChecklistCopy}>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </div>
              <div className={styles.fqcChecklistChoices} role="group" aria-label={item.label}>
                {(["PASS", "FAIL", "NOT_APPLICABLE"] as const).map((value) => <button
                  aria-pressed={checkResults[item.code] === value}
                  className={checkResults[item.code] === value ? styles.fqcChecklistChoiceActive : ""}
                  key={value}
                  onClick={() => updateChecklist(item.code, value)}
                  type="button"
                >
                  {value === "PASS" ? "Pass" : value === "FAIL" ? "Fail" : "N/A"}
                </button>)}
              </div>
            </article>)}
          </div>
          <div className={styles.fqcChecklistSummary}>
            <span><b>{checklistSummary.passed}</b> passed</span>
            <span><b>{checklistSummary.failed}</b> failed</span>
            <span><b>{checklistSummary.notApplicable}</b> N/A</span>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.jobEvidenceReviewed} onChange={(event) => updateBoolean("jobEvidenceReviewed", event.target.checked, "jobs")} type="checkbox" /><span>Technician completion evidence was reviewed</span></label>
            <label><input checked={input.workMatchesAuthorization} onChange={(event) => updateBoolean("workMatchesAuthorization", event.target.checked, "jobs")} type="checkbox" /><span>Completed work matches the authorized repair scope</span></label>
            <label><input checked={checklistSummary.failed === 0 && checklistSummary.passed >= 6} onChange={() => undefined} readOnly type="checkbox" /><span>Checklist form was completed and shows no failed release-critical item</span></label>
          </div>
          <button className={styles.wopAction} disabled={!result.jobsVerifiedComplete || completedSteps.jobs} onClick={completeJobs} type="button">Lock job verification</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 2</span><h4>Complete the final diagnostic scan</h4></div><em className={completedSteps.scan ? styles.wopComplete : ""}>{completedSteps.scan ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.scanCompleted} onChange={(event) => updateBoolean("scanCompleted", event.target.checked, "scan")} type="checkbox" /><span>Final diagnostic scan completed</span></label>
            <label><input checked={input.codesClearedOrExplained} onChange={(event) => updateBoolean("codesClearedOrExplained", event.target.checked, "scan")} type="checkbox" /><span>Codes and monitors were cleared or explained</span></label>
            <label><input checked={input.warningLightsResolved} onChange={(event) => updateBoolean("warningLightsResolved", event.target.checked, "scan")} type="checkbox" /><span>No unresolved warning indicators remain</span></label>
            <label><input checked={input.calibrationVerified} onChange={(event) => updateBoolean("calibrationVerified", event.target.checked, "scan")} type="checkbox" /><span>Calibration or reset proof was verified</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.jobs || !result.diagnosisScanComplete || completedSteps.scan} onClick={completeScan} type="button"><ScanLine size={14} />Lock final scan</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 3</span><h4>Perform the final road test</h4></div><em className={completedSteps.road ? styles.wopComplete : ""}>{completedSteps.road ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Road-test state</span><select onChange={(event) => updateValue("roadTestState", event.target.value as RoadTestState, "road")} value={input.roadTestState}><option>Not required</option><option>Required and passed</option><option>Required and failed</option><option>Pending</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.roadTestEvidenceLogged} disabled={input.roadTestState !== "Required and passed"} onChange={(event) => updateBoolean("roadTestEvidenceLogged", event.target.checked, "road")} type="checkbox" /><span>Road-test evidence is attached where required</span></label>
          </div>
          <p className={styles.wopExplanation}>{input.roadTestState === "Not required" ? "This repair cycle does not require a final road test." : input.roadTestState === "Required and passed" ? "Final road-test proof should support braking, drivability, steering, and outcome confirmation." : "Final QC cannot release the vehicle while the road-test requirement is pending or failed."}</p>
          <button className={styles.wopAction} disabled={!completedSteps.scan || !result.roadTestComplete || completedSteps.road} onClick={completeRoad} type="button">Lock road-test control</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 4</span><h4>Inspect leaks and workmanship</h4></div><em className={completedSteps.workmanship ? styles.wopComplete : ""}>{completedSteps.workmanship ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.fluidAndLeakCheckPassed} onChange={(event) => updateBoolean("fluidAndLeakCheckPassed", event.target.checked, "workmanship")} type="checkbox" /><span>Fluid, leak, and routing check passed</span></label>
            <label><input checked={input.torqueAndFastenersVerified} onChange={(event) => updateBoolean("torqueAndFastenersVerified", event.target.checked, "workmanship")} type="checkbox" /><span>Fasteners, torque, and assembly checks passed</span></label>
            <label><input checked={input.fitAndFinishVerified} onChange={(event) => updateBoolean("fitAndFinishVerified", event.target.checked, "workmanship")} type="checkbox" /><span>Fit, finish, and cleanliness meet standard</span></label>
            <label><input checked={input.noComebackRiskObserved} onChange={(event) => updateBoolean("noComebackRiskObserved", event.target.checked, "workmanship")} type="checkbox" /><span>No obvious comeback risk remains</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.road || !result.leaksAndWorkmanshipComplete || completedSteps.workmanship} onClick={completeWorkmanship} type="button">Lock workmanship check</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 5</span><h4>Resolve safety and recall controls</h4></div><em className={completedSteps.safety ? styles.wopComplete : ""}>{completedSteps.safety ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Safety state</span><select onChange={(event) => updateValue("safetyState", event.target.value as SafetyState, "safety")} value={input.safetyState}><option>No open safety hold</option><option>Disclosure recorded</option><option>Open safety issue</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.recallOrDisclosureHandled} onChange={(event) => updateBoolean("recallOrDisclosureHandled", event.target.checked, "safety")} type="checkbox" /><span>Recall, disclosure, or release control was handled</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.workmanship || !result.safetyComplete || completedSteps.safety} onClick={completeSafety} type="button">Lock safety release</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 6</span><h4>Issue the independent QC decision</h4></div><em className={completedSteps.decision ? styles.wopComplete : ""}>{completedSteps.decision ? "Issued" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>QC decision</span><select onChange={(event) => updateValue("decisionState", event.target.value as FinalDecision, "decision")} value={input.decisionState}><option>Pass</option><option>Rework</option><option>Disclose</option><option>Hold</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.qcDecisionNotesLogged} onChange={(event) => updateBoolean("qcDecisionNotesLogged", event.target.checked, "decision")} type="checkbox" /><span>Independent decision notes were recorded</span></label>
          </div>
          <p className={styles.wopExplanation}>{input.decisionState === "Pass" ? "A pass should only be issued once every critical quality and safety gate has been completed." : "A non-pass decision keeps the vehicle governed and routes the exact reason into the next controlled loop."}</p>
          <button className={styles.wopAction} disabled={!completedSteps.safety || !result.decisionComplete || completedSteps.decision} onClick={completeDecision} type="button">Issue Final QC decision</button>
        </section>
      </div>

      <aside className={styles.wopDecision}>
        <header><BadgeCheck size={18} /><div><span>Final QC recommendation</span><strong>{result.recommendation}</strong></div><em className={result.recommendation === "Ready for detailing" ? styles.wopComplete : result.recommendation === "Resolve safety controls" ? styles.wopHold : ""}>{stepCount}/6</em></header>
        <dl>
          <div><dt>Controls complete</dt><dd>{stepCount}/6</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockerCount}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
          <div><dt>Road test</dt><dd>{input.roadTestState}</dd></div>
          <div><dt>Safety state</dt><dd>{input.safetyState}</dd></div>
          <div><dt>Final decision</dt><dd>{input.decisionState}</dd></div>
        </dl>
        <p className={styles.wopExplanation}>{result.recommendation === "Ready for detailing" ? "Final QC has independently confirmed the repair, safety, and release package. The vehicle can move into detailing." : "Final QC should remain fail-closed until the exact blocker is resolved and the independent decision can be supported."}</p>
        <div className={styles.wopDrivers}>
          <div>
            <strong>What is working</strong>
            {(result.positiveDrivers.length ? result.positiveDrivers : ["No confirmed Final QC strength yet."]).map((item) => <span key={item}>{result.positiveDrivers.length ? <Check size={14} /> : <CircleAlert size={14} />}{item}</span>)}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.blockers.map((item) => <span key={item}><CircleAlert size={14} />{item}</span>)}
          </div>
        </div>
        <section className={styles.wopTrail}>
          <header><Clock3 size={18} /><h4>Operational work trail</h4></header>
          {trail.length ? <ul>{trail.map((item, index) => <li key={`${item.step}-${item.timestamp}-${index}`}><strong>{item.timestamp}</strong><span>{item.actor}</span><div>{item.result}</div><small>{item.evidence}</small></li>)}</ul> : <p>No Final QC action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.wopApproval}>
      <div>
        <span><ClipboardCheck size={14} />Independent verification</span>
        <strong>{completedSteps.jobs ? "Jobs independently verified" : "Job verification still active"}</strong>
        <small>Final QC should confirm the repair matches the approved scope and evidence package.</small>
      </div>
      <div>
        <span><ShieldCheck size={14} />Safety and release</span>
        <strong>{completedSteps.safety ? "Safety controls resolved" : "Safety controls still active"}</strong>
        <small>No unresolved safety hold should remain before a final release decision is issued.</small>
      </div>
      <div>
        <span><BadgeCheck size={14} />Stage readiness</span>
        <strong>{completedSteps.decision && input.decisionState === "Pass" ? "Ready for detailing" : "Final QC still active"}</strong>
        <small>{completedSteps.decision && input.decisionState === "Pass" ? "This unit can now hand off into the detailing stage." : "Finish the independent QC decision before the lifecycle handoff opens."}</small>
      </div>
    </section>

    <footer className={styles.wopNotice} aria-live="polite"><CircleAlert size={14} />{notice}</footer>
  </section>;
}
