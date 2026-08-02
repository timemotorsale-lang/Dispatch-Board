"use client";

import {
  BadgeCheck,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";
import {
  evaluateIgiInspection,
  type IgiFindingDecision,
  type IgiInspectionInput,
  type IgiRecommendation,
  type IgiRoadTestDecision,
} from "./igi-inspection-rules";

export type IgiWorkflowProgress = {
  blockerCount: number;
  findingsComplete: boolean;
  identityAndSafetyComplete: boolean;
  mechanicalComplete: boolean;
  readinessGateComplete: boolean;
  recommendation: IgiRecommendation;
  roadTestComplete: boolean;
  trailCount: number;
};

type StepKey = "identity" | "mechanical" | "scan" | "road" | "condition" | "findings";
type TrailEntry = { actor: string; evidence: string; result: string; step: StepKey; timestamp: string };

const initialInput: IgiInspectionInput = {
  bodyworkChecklistComplete: false,
  bodyworkConditionReviewed: false,
  cosmeticConditionReviewed: false,
  criticalWarningsReviewed: false,
  diagnosticScanCaptured: false,
  equipmentReviewed: false,
  findingsStructured: false,
  findingsVersionLocked: false,
  identityMatchedToIntake: true,
  mechanicalChecklistComplete: false,
  merchandisingConditionReviewed: false,
  mobilitySafe: true,
  recallAndSafetyFlagsReviewed: false,
  roadTestCompleted: false,
  roadTestDecision: "Required",
  roadTestNotesRecorded: false,
  safetyCheckComplete: false,
  severityAssigned: false,
  triageOwnerAssigned: false,
  warningLightsRecorded: false,
};

const stepIndex: Record<StepKey, number> = {
  identity: 0,
  mechanical: 1,
  scan: 2,
  road: 3,
  condition: 4,
  findings: 5,
};

const roadTestOptions: IgiRoadTestDecision[] = ["Required", "Not required", "Unsafe"];
const findingOptions: IgiFindingDecision[] = ["Draft", "Published", "Hold"];

function timeStamp() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

export function IgiInspectionTool({
  onOpenInitialQc,
  onProgressChange,
}: {
  onOpenInitialQc?: () => void;
  onProgressChange: (progress: IgiWorkflowProgress) => void;
}) {
  const [input, setInput] = useState(initialInput);
  const [findingsDecision, setFindingsDecision] = useState<IgiFindingDecision>("Draft");
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    identity: false,
    mechanical: false,
    scan: false,
    road: false,
    condition: false,
    findings: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Start Inspection by confirming the intake-linked identity and safe-to-move controls before deeper evaluation begins.");
  const result = useMemo(() => evaluateIgiInspection(input), [input]);

  useEffect(() => {
    onProgressChange({
      blockerCount: result.blockerCount,
      findingsComplete: completedSteps.findings && result.findingsComplete,
      identityAndSafetyComplete: completedSteps.identity && result.identityAndSafetyComplete,
      mechanicalComplete: completedSteps.mechanical && result.mechanicalComplete && completedSteps.scan,
      readinessGateComplete: completedSteps.findings && result.readinessGateComplete,
      recommendation: result.recommendation,
      roadTestComplete: completedSteps.road && result.roadTestComplete,
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

  function updateBoolean<K extends keyof IgiInspectionInput>(field: K, value: IgiInspectionInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Inspection facts changed. Reconfirm this step and any downstream inspection actions.");
  }

  function updateText<K extends keyof IgiInspectionInput>(field: K, value: IgiInspectionInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Inspection facts changed. Reconfirm this step and any downstream inspection actions.");
  }

  function completeIdentity() {
    if (!result.identityAndSafetyComplete) return;
    setCompletedSteps((current) => ({ ...current, identity: true }));
    appendTrail("identity", "Inspector", "Identity, warnings, recall flags, and safe-to-move pre-checks were confirmed.", "Safety check");
    setNotice("Identity and safety pre-check is locked. Complete the mechanical inspection next.");
  }

  function completeMechanical() {
    if (!completedSteps.identity || !input.mechanicalChecklistComplete) return;
    setCompletedSteps((current) => ({ ...current, mechanical: true }));
    appendTrail("mechanical", "Inspector", "Mechanical and bodywork checklist completed across powertrain, fluids, suspension, charging, HVAC, body panels, paint condition, dents, scratches, and rust.", "Mechanical and bodywork checklist");
    setNotice("Mechanical and bodywork inspection is complete. Capture the diagnostic scan next.");
  }

  function completeScan() {
    if (!completedSteps.mechanical || !result.mechanicalComplete) return;
    setCompletedSteps((current) => ({ ...current, scan: true }));
    appendTrail("scan", "Technician", "Diagnostic scan, module state, warning lights, and monitor evidence were attached.", "Scan report");
    setNotice("Diagnostic evidence is complete. Resolve the road-test decision next.");
  }

  function completeRoad() {
    if (!completedSteps.scan || !result.roadTestComplete) return;
    setCompletedSteps((current) => ({ ...current, road: true }));
    appendTrail("road", "Inspector", `Road-test decision recorded as ${input.roadTestDecision.toLowerCase()}.`, "Road test");
    setNotice("Road-test evidence is complete. Finish cosmetic, bodywork, equipment, and merchandising condition next.");
  }

  function completeCondition() {
    if (!completedSteps.road || !(input.cosmeticConditionReviewed && input.bodyworkConditionReviewed && input.equipmentReviewed && input.merchandisingConditionReviewed)) return;
    setCompletedSteps((current) => ({ ...current, condition: true }));
    appendTrail("condition", "Inspector", "Cosmetic, bodywork, equipment, and merchandising condition reviews were completed.", "Condition report");
    setNotice("Condition grading is complete. Publish the structured findings next.");
  }

  function completeFindings() {
    if (!completedSteps.condition || !result.findingsComplete || findingsDecision !== "Published") return;
    setCompletedSteps((current) => ({ ...current, findings: true }));
    appendTrail("findings", "Inspector", "Structured findings were published with severity, triage ownership, and version lock for Initial QC.", "Finding set");
    setNotice("Inspection is complete. The unit can now hand off into Initial QC.");
  }

  const scoreSummary = `${result.readinessScore}/100`;
  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  return <section className={styles.igiWorkspace} aria-label="TMS Governed Inspection workspace">
    <header className={styles.igiHeader}>
      <div>
        <span><ClipboardCheck size={15} />TMS Governed Inspection</span>
        <h3>IGI inspection workspace</h3>
        <p>Turn the intake baseline into safety, mechanical, bodywork, road-test, cosmetic, and findings evidence before Initial QC begins.</p>
        <div className={styles.igiHeaderActions}>
          <button className={styles.igiHeaderButton} onClick={() => onOpenInitialQc?.()} type="button">Open Initial QC form</button>
        </div>
      </div>
      <div className={styles.igiVersion}>
        <small>Inspection state</small>
        <strong>{result.recommendation} / {result.confidence}</strong>
      </div>
    </header>

    <div className={styles.igiBody}>
      <div className={styles.igiSteps}>
        <section className={styles.igiStepCard}>
          <header><div><span>Step 1</span><h4>Perform identity and safety pre-check</h4></div><em className={completedSteps.identity ? styles.igiComplete : ""}>{completedSteps.identity ? "Locked" : "Required"}</em></header>
          <div className={styles.igiChecks}>
            <label><input checked={input.identityMatchedToIntake} onChange={(event) => updateBoolean("identityMatchedToIntake", event.target.checked as IgiInspectionInput["identityMatchedToIntake"], "identity")} type="checkbox" /><span>VIN and intake-linked identity match</span></label>
            <label><input checked={input.safetyCheckComplete} onChange={(event) => updateBoolean("safetyCheckComplete", event.target.checked as IgiInspectionInput["safetyCheckComplete"], "identity")} type="checkbox" /><span>Safety pre-check completed</span></label>
            <label><input checked={input.criticalWarningsReviewed} onChange={(event) => updateBoolean("criticalWarningsReviewed", event.target.checked as IgiInspectionInput["criticalWarningsReviewed"], "identity")} type="checkbox" /><span>Critical warnings reviewed</span></label>
            <label><input checked={input.recallAndSafetyFlagsReviewed} onChange={(event) => updateBoolean("recallAndSafetyFlagsReviewed", event.target.checked as IgiInspectionInput["recallAndSafetyFlagsReviewed"], "identity")} type="checkbox" /><span>Recall and safety flags reviewed</span></label>
            <label><input checked={input.mobilitySafe} onChange={(event) => updateBoolean("mobilitySafe", event.target.checked as IgiInspectionInput["mobilitySafe"], "identity")} type="checkbox" /><span>Vehicle is safe to move</span></label>
          </div>
          <button className={styles.igiAction} disabled={!result.identityAndSafetyComplete || completedSteps.identity} onClick={completeIdentity} type="button"><ShieldCheck size={14} />Lock identity and safety</button>
        </section>

        <section className={styles.igiStepCard}>
          <header><div><span>Step 2</span><h4>Complete mechanical and bodywork inspection</h4></div><em className={completedSteps.mechanical ? styles.igiComplete : ""}>{completedSteps.mechanical ? "Complete" : "Required"}</em></header>
          <div className={styles.igiChecks}>
            <label><input checked={input.mechanicalChecklistComplete} onChange={(event) => updateBoolean("mechanicalChecklistComplete", event.target.checked as IgiInspectionInput["mechanicalChecklistComplete"], "mechanical")} type="checkbox" /><span>Mechanical checklist completed</span></label>
            <label><input checked={input.bodyworkChecklistComplete} onChange={(event) => updateBoolean("bodyworkChecklistComplete", event.target.checked as IgiInspectionInput["bodyworkChecklistComplete"], "mechanical")} type="checkbox" /><span>Bodywork checklist completed</span></label>
          </div>
          <button className={styles.igiAction} disabled={!completedSteps.identity || !(input.mechanicalChecklistComplete && input.bodyworkChecklistComplete) || completedSteps.mechanical} onClick={completeMechanical} type="button">Record mechanical and bodywork inspection</button>
        </section>

        <section className={styles.igiStepCard}>
          <header><div><span>Step 3</span><h4>Complete diagnostic scan</h4></div><em className={completedSteps.scan ? styles.igiComplete : ""}>{completedSteps.scan ? "Captured" : "Required"}</em></header>
          <div className={styles.igiChecks}>
            <label><input checked={input.diagnosticScanCaptured} onChange={(event) => updateBoolean("diagnosticScanCaptured", event.target.checked as IgiInspectionInput["diagnosticScanCaptured"], "scan")} type="checkbox" /><span>Diagnostic scan attached</span></label>
            <label><input checked={input.warningLightsRecorded} onChange={(event) => updateBoolean("warningLightsRecorded", event.target.checked as IgiInspectionInput["warningLightsRecorded"], "scan")} type="checkbox" /><span>Warning lights recorded</span></label>
          </div>
          <button className={styles.igiAction} disabled={!completedSteps.mechanical || !result.mechanicalComplete || completedSteps.scan} onClick={completeScan} type="button"><ScanLine size={14} />Attach scan evidence</button>
        </section>

        <section className={styles.igiStepCard}>
          <header><div><span>Step 4</span><h4>Perform a qualified road test</h4></div><em className={completedSteps.road ? styles.igiComplete : ""}>{completedSteps.road ? "Recorded" : "Required"}</em></header>
          <div className={styles.igiFieldGrid}>
            <label>
              <span>Road-test decision</span>
              <select aria-label="Road-test decision" onChange={(event) => updateText("roadTestDecision", event.target.value as IgiRoadTestDecision, "road")} value={input.roadTestDecision}>
                {roadTestOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.igiChecks}>
            <label><input checked={input.roadTestCompleted} disabled={input.roadTestDecision !== "Required"} onChange={(event) => updateBoolean("roadTestCompleted", event.target.checked as IgiInspectionInput["roadTestCompleted"], "road")} type="checkbox" /><span>Road test completed</span></label>
            <label><input checked={input.roadTestNotesRecorded} disabled={input.roadTestDecision !== "Required"} onChange={(event) => updateBoolean("roadTestNotesRecorded", event.target.checked as IgiInspectionInput["roadTestNotesRecorded"], "road")} type="checkbox" /><span>Road-test notes recorded</span></label>
          </div>
          <button className={styles.igiAction} disabled={!completedSteps.scan || !result.roadTestComplete || completedSteps.road} onClick={completeRoad} type="button">Record road-test decision</button>
        </section>

        <section className={styles.igiStepCard}>
          <header><div><span>Step 5</span><h4>Inspect cosmetic, bodywork, and equipment condition</h4></div><em className={completedSteps.condition ? styles.igiComplete : ""}>{completedSteps.condition ? "Reviewed" : "Required"}</em></header>
          <div className={styles.igiChecks}>
            <label><input checked={input.cosmeticConditionReviewed} onChange={(event) => updateBoolean("cosmeticConditionReviewed", event.target.checked as IgiInspectionInput["cosmeticConditionReviewed"], "condition")} type="checkbox" /><span>Cosmetic condition reviewed</span></label>
            <label><input checked={input.bodyworkConditionReviewed} onChange={(event) => updateBoolean("bodyworkConditionReviewed", event.target.checked as IgiInspectionInput["bodyworkConditionReviewed"], "condition")} type="checkbox" /><span>Body panels, prior repairs, dents, scratches, rust, and paint reviewed</span></label>
            <label><input checked={input.equipmentReviewed} onChange={(event) => updateBoolean("equipmentReviewed", event.target.checked as IgiInspectionInput["equipmentReviewed"], "condition")} type="checkbox" /><span>Equipment and options reviewed</span></label>
            <label><input checked={input.merchandisingConditionReviewed} onChange={(event) => updateBoolean("merchandisingConditionReviewed", event.target.checked as IgiInspectionInput["merchandisingConditionReviewed"], "condition")} type="checkbox" /><span>Merchandising readiness reviewed</span></label>
          </div>
          <button className={styles.igiAction} disabled={!completedSteps.road || !(input.cosmeticConditionReviewed && input.bodyworkConditionReviewed && input.equipmentReviewed && input.merchandisingConditionReviewed) || completedSteps.condition} onClick={completeCondition} type="button">Record condition review</button>
        </section>

        <section className={styles.igiStepCard}>
          <header><div><span>Step 6</span><h4>Publish structured findings</h4></div><em className={completedSteps.findings ? styles.igiComplete : ""}>{completedSteps.findings ? "Released" : "Required"}</em></header>
          <div className={styles.igiFieldGrid}>
            <label>
              <span>Findings decision</span>
              <select aria-label="Findings decision" onChange={(event) => { setFindingsDecision(event.target.value as IgiFindingDecision); invalidateFrom("findings", "Inspection findings changed. Reconfirm structured publication before handoff."); }} value={findingsDecision}>
                {findingOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.igiChecks}>
            <label><input checked={input.findingsStructured} onChange={(event) => updateBoolean("findingsStructured", event.target.checked as IgiInspectionInput["findingsStructured"], "findings")} type="checkbox" /><span>Findings are structured</span></label>
            <label><input checked={input.severityAssigned} onChange={(event) => updateBoolean("severityAssigned", event.target.checked as IgiInspectionInput["severityAssigned"], "findings")} type="checkbox" /><span>Severity assigned</span></label>
            <label><input checked={input.triageOwnerAssigned} onChange={(event) => updateBoolean("triageOwnerAssigned", event.target.checked as IgiInspectionInput["triageOwnerAssigned"], "findings")} type="checkbox" /><span>Triage owner assigned</span></label>
            <label><input checked={input.findingsVersionLocked} onChange={(event) => updateBoolean("findingsVersionLocked", event.target.checked as IgiInspectionInput["findingsVersionLocked"], "findings")} type="checkbox" /><span>Inspection version locked</span></label>
          </div>
          <button className={styles.igiAction} disabled={!completedSteps.condition || !result.findingsComplete || findingsDecision !== "Published" || completedSteps.findings} onClick={completeFindings} type="button"><LockKeyhole size={14} />Release to Initial QC</button>
        </section>
      </div>

      <aside className={styles.igiDecision}>
        <header>
          <LockKeyhole />
          <div><span>IGI recommendation</span><strong>{result.recommendation}</strong></div>
          <em className={result.blockerCount ? styles.igiHold : styles.igiComplete}>{scoreSummary}</em>
        </header>
        <dl>
          <div><dt>Inspection score</dt><dd>{scoreSummary}</dd></div>
          <div><dt>Controls complete</dt><dd>{stepCount}/6</dd></div>
          <div><dt>Confidence</dt><dd>{result.confidence}</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockerCount}</dd></div>
          <div><dt>Road-test state</dt><dd>{input.roadTestDecision}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
        </dl>
        <p className={styles.igiExplanation}>{result.explanation}</p>
        <div className={styles.igiDrivers}>
          <div>
            <strong>What is working</strong>
            {result.positiveDrivers.length ? result.positiveDrivers.map((item) => <span key={item}><Check />{item}</span>) : <span><CircleAlert />No confirmed inspection strength yet.</span>}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.negativeDrivers.length ? result.negativeDrivers.map((item) => <span key={item}><CircleAlert />{item}</span>) : <span><Check />No active concern recorded.</span>}
          </div>
        </div>
        <section className={styles.igiTrail}>
          <header><Clock3 /><h4>Operational work trail</h4></header>
          {trail.length ? <ol>{trail.map((entry, index) => <li key={`${entry.step}-${entry.timestamp}-${index}`}><div><strong>{entry.timestamp}</strong><span>{entry.actor}</span></div><p>{entry.result}</p><em>{entry.evidence}</em></li>)}</ol> : <p>No inspection action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.igiApproval}>
      <div>
        <span><ShieldCheck />Identity and safety</span>
        <strong>{result.identityAndSafetyComplete ? "Pre-check released" : "Pre-check still active"}</strong>
        <small>Inspection begins only after the intake-linked unit is confirmed safe to evaluate.</small>
      </div>
      <div>
        <span><ScanLine />Evidence and findings</span>
        <strong>{result.mechanicalComplete && result.findingsComplete ? "Findings package complete" : "Inspection evidence still open"}</strong>
        <small>Mechanical, bodywork, scan, road-test, condition, and findings controls should support the exact Initial QC review.</small>
      </div>
      <div>
        <span><BadgeCheck />Stage readiness</span>
        <strong>{completedSteps.findings ? "Ready for Initial QC" : "Inspection still active"}</strong>
        <small>{completedSteps.findings ? "The unit can move into governed Initial QC next." : "Complete structured findings and release them before handoff."}</small>
      </div>
    </section>

    <footer className={styles.igiNotice} aria-live="polite"><CircleAlert />{notice}</footer>
  </section>;
}
