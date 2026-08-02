"use client";

import {
  BadgeCheck,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";
import {
  evaluateIqiQuality,
  type IqiDispositionDecision,
  type IqiQualityInput,
  type IqiRecommendation,
} from "./iqi-quality-rules";

export type IqiWorkflowProgress = {
  blockerCount: number;
  dispositionComplete: boolean;
  inspectionPackageComplete: boolean;
  readinessGateComplete: boolean;
  recommendation: IqiRecommendation;
  reviewComplete: boolean;
  trailCount: number;
};

type StepKey = "package" | "completeness" | "safety" | "evidence" | "disposition" | "release";
type TrailEntry = { actor: string; evidence: string; result: string; step: StepKey; timestamp: string };

const initialInput: IqiQualityInput = {
  completenessAuditPassed: false,
  correctionOwnersAssigned: false,
  evidencePackageReceived: true,
  evidenceQualityApproved: false,
  findingDispositionPublished: false,
  handoffDecisionLocked: false,
  identityPackageMatched: true,
  inspectionSectionsComplete: false,
  nextOwnerAssigned: false,
  noReleaseBlockersRemain: false,
  qcReviewerAssigned: true,
  roadTestRequirementReviewed: false,
  safetyClassificationApproved: false,
  severityDecisionApproved: false,
  vehicleLinkedToInspection: true,
  findingsDispositionDecision: "Pending",
};

const stepIndex: Record<StepKey, number> = {
  package: 0,
  completeness: 1,
  safety: 2,
  evidence: 3,
  disposition: 4,
  release: 5,
};

const dispositionOptions: IqiDispositionDecision[] = ["Pending", "Approved", "Correction required", "Hold"];

function timeStamp() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

export function IqiQualityTool({ onProgressChange }: { onProgressChange: (progress: IqiWorkflowProgress) => void }) {
  const [input, setInput] = useState(initialInput);
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    package: false,
    completeness: false,
    safety: false,
    evidence: false,
    disposition: false,
    release: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Start Initial QC by locking the received inspection package before reviewing completeness and disposition.");
  const result = useMemo(() => evaluateIqiQuality(input), [input]);

  useEffect(() => {
    onProgressChange({
      blockerCount: result.blockerCount,
      dispositionComplete: completedSteps.disposition && result.dispositionComplete,
      inspectionPackageComplete: completedSteps.package && result.inspectionPackageComplete,
      readinessGateComplete: completedSteps.release && result.readinessGateComplete,
      recommendation: result.recommendation,
      reviewComplete: completedSteps.evidence && result.reviewComplete,
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

  function updateBoolean<K extends keyof IqiQualityInput>(field: K, value: IqiQualityInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Initial QC facts changed. Reconfirm this step and any downstream release actions.");
  }

  function updateText<K extends keyof IqiQualityInput>(field: K, value: IqiQualityInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Initial QC facts changed. Reconfirm this step and any downstream release actions.");
  }

  function completePackage() {
    if (!result.inspectionPackageComplete) return;
    setCompletedSteps((current) => ({ ...current, package: true }));
    appendTrail("package", "QC reviewer", "Inspection package, identity linkage, and reviewer assignment were locked for independent QC.", "Package receipt");
    setNotice("Inspection package is locked. Audit completeness next.");
  }

  function completeCompleteness() {
    if (!completedSteps.package || !(input.completenessAuditPassed && input.inspectionSectionsComplete && input.roadTestRequirementReviewed)) return;
    setCompletedSteps((current) => ({ ...current, completeness: true }));
    appendTrail("completeness", "QC reviewer", "Inspection completeness audit passed across required sections and road-test requirements.", "Completeness audit");
    setNotice("Completeness review is recorded. Validate safety and severity decisions next.");
  }

  function completeSafety() {
    if (!completedSteps.completeness || !(input.safetyClassificationApproved && input.severityDecisionApproved)) return;
    setCompletedSteps((current) => ({ ...current, safety: true }));
    appendTrail("safety", "QC reviewer", "Safety classifications and severity decisions were independently approved.", "Safety decision");
    setNotice("Safety and severity review is complete. Approve evidence quality next.");
  }

  function completeEvidence() {
    if (!completedSteps.safety || !input.evidenceQualityApproved) return;
    setCompletedSteps((current) => ({ ...current, evidence: true }));
    appendTrail("evidence", "QC reviewer", "Evidence package quality was approved for photos, scan, notes, and road-test proof.", "Evidence review");
    setNotice("Evidence quality is approved. Publish the QC disposition next.");
  }

  function completeDisposition() {
    if (!completedSteps.evidence || !result.dispositionComplete) return;
    setCompletedSteps((current) => ({ ...current, disposition: true }));
    appendTrail("disposition", "QC reviewer", `QC disposition published as ${input.findingsDispositionDecision.toLowerCase()} with next owners assigned.`, "Disposition set");
    setNotice("Finding disposition is complete. Release the controlled handoff next.");
  }

  function completeRelease() {
    if (!completedSteps.disposition || !result.readinessGateComplete) return;
    setCompletedSteps((current) => ({ ...current, release: true }));
    appendTrail("release", "QC lead", "Initial QC release decision was locked and the package was handed into recon planning.", "QC release");
    setNotice("Initial QC is complete. The vehicle can now move into Work Order planning.");
  }

  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  return <section className={styles.iqiWorkspace} aria-label="TMS Initial Quality Control workspace">
    <header className={styles.iqiHeader}>
      <div>
        <span><ClipboardCheck size={15} />TMS Initial Quality Control</span>
        <h3>IQI initial QC workspace</h3>
        <p>Independently verify the inspection package, disposition every finding, and release only a complete package into recon planning.</p>
        <div className={styles.iqiHeaderActions}>
          <Link className={styles.iqiHeaderLink} href="/vehicles/quality-control?returnTo=%2Fvehicles%2Finventory%2Fprototype">Open live QC workspace</Link>
        </div>
      </div>
      <div className={styles.iqiVersion}>
        <small>QC state</small>
        <strong>{result.recommendation} / {result.confidence}</strong>
      </div>
    </header>

    <div className={styles.iqiBody}>
      <div className={styles.iqiSteps}>
        <section className={styles.iqiStepCard}>
          <header><div><span>Step 1</span><h4>Confirm inspection package received</h4></div><em className={completedSteps.package ? styles.iqiComplete : ""}>{completedSteps.package ? "Locked" : "Required"}</em></header>
          <div className={styles.iqiChecks}>
            <label><input checked={input.evidencePackageReceived} onChange={(event) => updateBoolean("evidencePackageReceived", event.target.checked as IqiQualityInput["evidencePackageReceived"], "package")} type="checkbox" /><span>Inspection package received</span></label>
            <label><input checked={input.qcReviewerAssigned} onChange={(event) => updateBoolean("qcReviewerAssigned", event.target.checked as IqiQualityInput["qcReviewerAssigned"], "package")} type="checkbox" /><span>QC reviewer assigned</span></label>
            <label><input checked={input.identityPackageMatched} onChange={(event) => updateBoolean("identityPackageMatched", event.target.checked as IqiQualityInput["identityPackageMatched"], "package")} type="checkbox" /><span>Identity package matched</span></label>
            <label><input checked={input.vehicleLinkedToInspection} onChange={(event) => updateBoolean("vehicleLinkedToInspection", event.target.checked as IqiQualityInput["vehicleLinkedToInspection"], "package")} type="checkbox" /><span>Vehicle linked to inspection package</span></label>
          </div>
          <button className={styles.iqiAction} disabled={!result.inspectionPackageComplete || completedSteps.package} onClick={completePackage} type="button">Lock inspection package</button>
        </section>

        <section className={styles.iqiStepCard}>
          <header><div><span>Step 2</span><h4>Audit inspection completeness</h4></div><em className={completedSteps.completeness ? styles.iqiComplete : ""}>{completedSteps.completeness ? "Approved" : "Required"}</em></header>
          <div className={styles.iqiChecks}>
            <label><input checked={input.completenessAuditPassed} onChange={(event) => updateBoolean("completenessAuditPassed", event.target.checked as IqiQualityInput["completenessAuditPassed"], "completeness")} type="checkbox" /><span>Completeness audit passed</span></label>
            <label><input checked={input.inspectionSectionsComplete} onChange={(event) => updateBoolean("inspectionSectionsComplete", event.target.checked as IqiQualityInput["inspectionSectionsComplete"], "completeness")} type="checkbox" /><span>Required inspection sections complete</span></label>
            <label><input checked={input.roadTestRequirementReviewed} onChange={(event) => updateBoolean("roadTestRequirementReviewed", event.target.checked as IqiQualityInput["roadTestRequirementReviewed"], "completeness")} type="checkbox" /><span>Road-test requirement reviewed</span></label>
          </div>
          <button className={styles.iqiAction} disabled={!completedSteps.package || !(input.completenessAuditPassed && input.inspectionSectionsComplete && input.roadTestRequirementReviewed) || completedSteps.completeness} onClick={completeCompleteness} type="button">Confirm completeness audit</button>
        </section>

        <section className={styles.iqiStepCard}>
          <header><div><span>Step 3</span><h4>Validate safety and severity decisions</h4></div><em className={completedSteps.safety ? styles.iqiComplete : ""}>{completedSteps.safety ? "Approved" : "Required"}</em></header>
          <div className={styles.iqiChecks}>
            <label><input checked={input.safetyClassificationApproved} onChange={(event) => updateBoolean("safetyClassificationApproved", event.target.checked as IqiQualityInput["safetyClassificationApproved"], "safety")} type="checkbox" /><span>Safety classifications approved</span></label>
            <label><input checked={input.severityDecisionApproved} onChange={(event) => updateBoolean("severityDecisionApproved", event.target.checked as IqiQualityInput["severityDecisionApproved"], "safety")} type="checkbox" /><span>Severity decisions approved</span></label>
          </div>
          <button className={styles.iqiAction} disabled={!completedSteps.completeness || !(input.safetyClassificationApproved && input.severityDecisionApproved) || completedSteps.safety} onClick={completeSafety} type="button"><ShieldCheck size={14} />Approve safety and severity</button>
        </section>

        <section className={styles.iqiStepCard}>
          <header><div><span>Step 4</span><h4>Validate evidence quality</h4></div><em className={completedSteps.evidence ? styles.iqiComplete : ""}>{completedSteps.evidence ? "Approved" : "Required"}</em></header>
          <div className={styles.iqiChecks}>
            <label><input checked={input.evidenceQualityApproved} onChange={(event) => updateBoolean("evidenceQualityApproved", event.target.checked as IqiQualityInput["evidenceQualityApproved"], "evidence")} type="checkbox" /><span>Evidence quality approved</span></label>
          </div>
          <button className={styles.iqiAction} disabled={!completedSteps.safety || !input.evidenceQualityApproved || completedSteps.evidence} onClick={completeEvidence} type="button">Approve evidence quality</button>
        </section>

        <section className={styles.iqiStepCard}>
          <header><div><span>Step 5</span><h4>Disposition every finding</h4></div><em className={completedSteps.disposition ? styles.iqiComplete : ""}>{completedSteps.disposition ? "Published" : "Required"}</em></header>
          <div className={styles.iqiFieldGrid}>
            <label>
              <span>Disposition decision</span>
              <select aria-label="Disposition decision" onChange={(event) => updateText("findingsDispositionDecision", event.target.value as IqiDispositionDecision, "disposition")} value={input.findingsDispositionDecision}>
                {dispositionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.iqiChecks}>
            <label><input checked={input.findingDispositionPublished} onChange={(event) => updateBoolean("findingDispositionPublished", event.target.checked as IqiQualityInput["findingDispositionPublished"], "disposition")} type="checkbox" /><span>Finding disposition published</span></label>
            <label><input checked={input.correctionOwnersAssigned} onChange={(event) => updateBoolean("correctionOwnersAssigned", event.target.checked as IqiQualityInput["correctionOwnersAssigned"], "disposition")} type="checkbox" /><span>Correction owners assigned</span></label>
            <label><input checked={input.nextOwnerAssigned} onChange={(event) => updateBoolean("nextOwnerAssigned", event.target.checked as IqiQualityInput["nextOwnerAssigned"], "disposition")} type="checkbox" /><span>Next owner assigned</span></label>
          </div>
          <button className={styles.iqiAction} disabled={!completedSteps.evidence || !result.dispositionComplete || completedSteps.disposition} onClick={completeDisposition} type="button">Publish QC disposition</button>
        </section>

        <section className={styles.iqiStepCard}>
          <header><div><span>Step 6</span><h4>Release the controlled handoff</h4></div><em className={completedSteps.release ? styles.iqiComplete : ""}>{completedSteps.release ? "Released" : "Required"}</em></header>
          <div className={styles.iqiChecks}>
            <label><input checked={input.handoffDecisionLocked} onChange={(event) => updateBoolean("handoffDecisionLocked", event.target.checked as IqiQualityInput["handoffDecisionLocked"], "release")} type="checkbox" /><span>Handoff decision locked</span></label>
            <label><input checked={input.noReleaseBlockersRemain} onChange={(event) => updateBoolean("noReleaseBlockersRemain", event.target.checked as IqiQualityInput["noReleaseBlockersRemain"], "release")} type="checkbox" /><span>No release blockers remain</span></label>
          </div>
          <button className={styles.iqiAction} disabled={!completedSteps.disposition || !result.readinessGateComplete || completedSteps.release} onClick={completeRelease} type="button"><LockKeyhole size={14} />Release to recon planning</button>
        </section>
      </div>

      <aside className={styles.iqiDecision}>
        <header>
          <LockKeyhole />
          <div><span>IQI recommendation</span><strong>{result.recommendation}</strong></div>
          <em className={result.blockerCount ? styles.iqiHold : styles.iqiComplete}>{`${result.readinessScore}/100`}</em>
        </header>
        <dl>
          <div><dt>QC score</dt><dd>{`${result.readinessScore}/100`}</dd></div>
          <div><dt>Controls complete</dt><dd>{stepCount}/6</dd></div>
          <div><dt>Confidence</dt><dd>{result.confidence}</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockerCount}</dd></div>
          <div><dt>Disposition</dt><dd>{input.findingsDispositionDecision}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
        </dl>
        <p className={styles.iqiExplanation}>{result.explanation}</p>
        <div className={styles.iqiDrivers}>
          <div>
            <strong>What is working</strong>
            {result.positiveDrivers.length ? result.positiveDrivers.map((item) => <span key={item}><Check />{item}</span>) : <span><CircleAlert />No confirmed QC strength yet.</span>}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.negativeDrivers.length ? result.negativeDrivers.map((item) => <span key={item}><CircleAlert />{item}</span>) : <span><Check />No active concern recorded.</span>}
          </div>
        </div>
        <section className={styles.iqiTrail}>
          <header><Clock3 /><h4>Operational work trail</h4></header>
          {trail.length ? <ol>{trail.map((entry, index) => <li key={`${entry.step}-${entry.timestamp}-${index}`}><div><strong>{entry.timestamp}</strong><span>{entry.actor}</span></div><p>{entry.result}</p><em>{entry.evidence}</em></li>)}</ol> : <p>No QC action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.iqiApproval}>
      <div>
        <span><LockKeyhole />Package state</span>
        <strong>{result.inspectionPackageComplete ? "Inspection package locked" : "Inspection package still open"}</strong>
        <small>QC should begin only after the exact inspection package is received and linked to the correct unit.</small>
      </div>
      <div>
        <span><ShieldCheck />Review quality</span>
        <strong>{result.reviewComplete ? "QC review passed" : "QC review still active"}</strong>
        <small>Completeness, safety, severity, and evidence decisions should support a governed release.</small>
      </div>
      <div>
        <span><BadgeCheck />Stage readiness</span>
        <strong>{completedSteps.release ? "Ready for recon planning" : "Initial QC still active"}</strong>
        <small>{completedSteps.release ? "The package can now move into Work Order planning." : "Complete disposition and release decisions before handoff."}</small>
      </div>
    </section>

    <footer className={styles.iqiNotice} aria-live="polite"><CircleAlert />{notice}</footer>
  </section>;
}
