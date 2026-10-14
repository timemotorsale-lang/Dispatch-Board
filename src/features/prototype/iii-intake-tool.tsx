"use client";

import {
  BadgeCheck,
  Check,
  CircleAlert,
  ClipboardList,
  Clock3,
  LockKeyhole,
  MapPinned,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";
import {
  evaluateIiiIntake,
  type IiiIntakeInput,
  type IiiPriority,
  type IiiRecommendation,
  type IiiRequestedEvaluation,
  type IiiRetailPath,
  type IiiSafetyDecision,
} from "./iii-intake-rules";

export type IiiWorkflowProgress = {
  blockerCount: number;
  canonicalComplete: boolean;
  custodyComplete: boolean;
  decodedComplete: boolean;
  objectiveComplete: boolean;
  readinessGateComplete: boolean;
  recommendation: IiiRecommendation;
  safetyComplete: boolean;
  trailCount: number;
};

type StepKey = "canonical" | "decoded" | "safety" | "objective" | "custody" | "readiness";

type TrailEntry = {
  actor: string;
  evidence: string;
  result: string;
  step: StepKey;
  timestamp: string;
};

const initialInput: IiiIntakeInput = {
  canonicalVehicleLinked: true,
  currentCustodianRecorded: true,
  currentLocationRecorded: true,
  decodedFactsReviewed: false,
  duplicateCheckClear: true,
  frontlineTargetConfirmed: false,
  intakeNotesRecorded: false,
  inventoryOwnerConfirmed: true,
  inventoryUnitCreated: true,
  keysOnHandConfirmed: true,
  priority: "Priority",
  recallCampaignReviewed: false,
  requestedEvaluation: "Pending",
  retailPath: "Pending decision",
  safetyDecision: "Review required",
  safetyWarningsReviewed: false,
  stockNumberAssigned: true,
  targetFrontlineDateRecorded: false,
  vinVerificationReviewed: false,
};

const stepIndex: Record<StepKey, number> = {
  canonical: 0,
  decoded: 1,
  safety: 2,
  objective: 3,
  custody: 4,
  readiness: 5,
};

const retailPathOptions: IiiRetailPath[] = ["Pending decision", "Frontline retail", "Wholesale"];
const priorityOptions: IiiPriority[] = ["Standard", "Priority", "Hot"];
const requestedEvaluationOptions: IiiRequestedEvaluation[] = ["Pending", "Inspection only", "Full recon", "Safety first"];
const safetyDecisionOptions: IiiSafetyDecision[] = ["Review required", "Clear", "Hold"];

function timeStamp() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

export function IiiIntakeTool({ onProgressChange }: { onProgressChange: (progress: IiiWorkflowProgress) => void }) {
  const [input, setInput] = useState(initialInput);
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    canonical: false,
    decoded: false,
    safety: false,
    objective: false,
    custody: false,
    readiness: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Start Intake by locking the canonical vehicle linkage before adding any new operating context.");
  const result = useMemo(() => evaluateIiiIntake(input), [input]);

  useEffect(() => {
    onProgressChange({
      blockerCount: result.blockers.length,
      canonicalComplete: completedSteps.canonical && result.canonicalComplete,
      custodyComplete: completedSteps.custody && result.custodyComplete,
      decodedComplete: completedSteps.decoded && input.decodedFactsReviewed,
      objectiveComplete: completedSteps.objective && result.objectiveComplete,
      readinessGateComplete: completedSteps.readiness && result.readinessGateComplete,
      recommendation: result.recommendation,
      safetyComplete: completedSteps.safety && result.safetyComplete,
      trailCount: trail.length,
    });
  }, [completedSteps, input.decodedFactsReviewed, onProgressChange, result, trail.length]);

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

  function updateBoolean<K extends keyof IiiIntakeInput>(field: K, value: IiiIntakeInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Intake facts changed. Reconfirm this step and any downstream readiness actions.");
  }

  function updateText<K extends keyof IiiIntakeInput>(field: K, value: IiiIntakeInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Intake facts changed. Reconfirm this step and any downstream readiness actions.");
  }

  function completeCanonical() {
    if (!result.canonicalComplete) return;
    setCompletedSteps((current) => ({ ...current, canonical: true }));
    appendTrail("canonical", "Inventory coordinator", "Canonical vehicle, inventory unit, stock number, and duplicate controls were linked and confirmed.", "Canonical link");
    setNotice("Canonical linkage is locked. Validate the decoded vehicle facts next.");
  }

  function completeDecoded() {
    if (!completedSteps.canonical || !input.decodedFactsReviewed) return;
    setCompletedSteps((current) => ({ ...current, decoded: true }));
    appendTrail("decoded", "Inventory coordinator", "Decoded vehicle facts were reviewed against the receiving baseline.", "Decode snapshot");
    setNotice("Decoded facts are complete. Classify safety intelligence next.");
  }

  function completeSafety() {
    if (!completedSteps.decoded || !result.safetyComplete) return;
    setCompletedSteps((current) => ({ ...current, safety: true }));
    appendTrail("safety", "Inventory advisor", `Safety intelligence reviewed with decision recorded as ${input.safetyDecision.toLowerCase()}.`, "Safety review");
    setNotice("Safety review is complete. Set the inventory objective and evaluation path next.");
  }

  function completeObjective() {
    if (!completedSteps.safety || !result.objectiveComplete) return;
    setCompletedSteps((current) => ({ ...current, objective: true }));
    appendTrail("objective", "Inventory coordinator", `Inventory objective set to ${input.retailPath.toLowerCase()} with ${input.requestedEvaluation.toLowerCase()} requested.`, "Intake scope");
    setNotice("Inventory objective is set. Confirm live location, custody, and ownership facts next.");
  }

  function completeCustody() {
    if (!completedSteps.objective || !result.custodyComplete) return;
    setCompletedSteps((current) => ({ ...current, custody: true }));
    appendTrail("custody", "Inventory coordinator", "Location, custodian, keys-on-hand, and inventory owner facts were confirmed.", "Custody facts");
    setNotice("Custody facts are complete. Run the intake readiness gate next.");
  }

  function completeReadiness() {
    if (!completedSteps.custody || !result.readinessGateComplete) return;
    setCompletedSteps((current) => ({ ...current, readiness: true }));
    appendTrail("readiness", "Inventory lead", "Canonical intake readiness gate passed and the unit was released to governed inspection.", "Readiness check");
    setNotice("Intake readiness is complete. The unit can now hand off into Inspection.");
  }

  const scoreSummary = `${result.readinessScore}/100`;
  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  return <section className={styles.iiiWorkspace} aria-label="TMS Inventory Intake Intelligence workspace">
    <header className={styles.iiiHeader}>
      <div>
        <span><ClipboardList size={15} />TMS Inventory Intake Intelligence</span>
        <h3>III intake workspace</h3>
        <p>Carry forward verified facts once, set the inventory objective, and release a clean record into inspection.</p>
        <div className={styles.iiiHeaderActions}>
          <Link className={styles.iiiHeaderLink} href="/vehicles/workflows/add-vehicle?returnTo=%2Fvehicles%2Finventory">Open Vehicle Intake form</Link>
        </div>
      </div>
      <div className={styles.iiiVersion}>
        <small>Intake state</small>
        <strong>{result.recommendation} / {result.confidence}</strong>
      </div>
    </header>

    <div className={styles.iiiBody}>
      <div className={styles.iiiSteps}>
        <section className={styles.iiiStepCard}>
          <header>
            <div><span>Step 1</span><h4>Confirm canonical vehicle linkage</h4></div>
            <em className={completedSteps.canonical ? styles.iiiComplete : ""}>{completedSteps.canonical ? "Locked" : "Required"}</em>
          </header>
          <div className={styles.iiiChecks}>
            <label><input checked={input.canonicalVehicleLinked} onChange={(event) => updateBoolean("canonicalVehicleLinked", event.target.checked as IiiIntakeInput["canonicalVehicleLinked"], "canonical")} type="checkbox" /><span>Vehicle 360 linked to intake record</span></label>
            <label><input checked={input.inventoryUnitCreated} onChange={(event) => updateBoolean("inventoryUnitCreated", event.target.checked as IiiIntakeInput["inventoryUnitCreated"], "canonical")} type="checkbox" /><span>Inventory unit exists</span></label>
            <label><input checked={input.stockNumberAssigned} onChange={(event) => updateBoolean("stockNumberAssigned", event.target.checked as IiiIntakeInput["stockNumberAssigned"], "canonical")} type="checkbox" /><span>Stock number assigned</span></label>
            <label><input checked={input.duplicateCheckClear} onChange={(event) => updateBoolean("duplicateCheckClear", event.target.checked as IiiIntakeInput["duplicateCheckClear"], "canonical")} type="checkbox" /><span>Duplicate check clear</span></label>
          </div>
          <button className={styles.iiiAction} disabled={!result.canonicalComplete || completedSteps.canonical} onClick={completeCanonical} type="button">Lock canonical linkage</button>
        </section>

        <section className={styles.iiiStepCard}>
          <header>
            <div><span>Step 2</span><h4>Validate decoded vehicle facts</h4></div>
            <em className={completedSteps.decoded ? styles.iiiComplete : ""}>{completedSteps.decoded ? "Reviewed" : "Required"}</em>
          </header>
          <div className={styles.iiiChecks}>
            <label><input checked={input.decodedFactsReviewed} onChange={(event) => updateBoolean("decodedFactsReviewed", event.target.checked as IiiIntakeInput["decodedFactsReviewed"], "decoded")} type="checkbox" /><span>Year, make, model, trim, body, drivetrain, and engine reviewed</span></label>
          </div>
          <button className={styles.iiiAction} disabled={!completedSteps.canonical || !input.decodedFactsReviewed || completedSteps.decoded} onClick={completeDecoded} type="button">Confirm decoded facts</button>
        </section>

        <section className={styles.iiiStepCard}>
          <header>
            <div><span>Step 3</span><h4>Review safety intelligence</h4></div>
            <em className={completedSteps.safety ? styles.iiiComplete : ""}>{completedSteps.safety ? "Classified" : "Required"}</em>
          </header>
          <div className={styles.iiiFieldGrid}>
            <label>
              <span>Safety decision</span>
              <select aria-label="Safety decision" onChange={(event) => updateText("safetyDecision", event.target.value as IiiSafetyDecision, "safety")} value={input.safetyDecision}>
                {safetyDecisionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.iiiChecks}>
            <label><input checked={input.recallCampaignReviewed} onChange={(event) => updateBoolean("recallCampaignReviewed", event.target.checked as IiiIntakeInput["recallCampaignReviewed"], "safety")} type="checkbox" /><span>Recall campaigns reviewed</span></label>
            <label><input checked={input.vinVerificationReviewed} onChange={(event) => updateBoolean("vinVerificationReviewed", event.target.checked as IiiIntakeInput["vinVerificationReviewed"], "safety")} type="checkbox" /><span>VIN verification reviewed</span></label>
            <label><input checked={input.safetyWarningsReviewed} onChange={(event) => updateBoolean("safetyWarningsReviewed", event.target.checked as IiiIntakeInput["safetyWarningsReviewed"], "safety")} type="checkbox" /><span>Warnings and guidance reviewed</span></label>
          </div>
          <button className={styles.iiiAction} disabled={!completedSteps.decoded || !result.safetyComplete || completedSteps.safety} onClick={completeSafety} type="button"><ShieldCheck size={14} />Record safety review</button>
        </section>

        <section className={styles.iiiStepCard}>
          <header>
            <div><span>Step 4</span><h4>Record the inventory objective</h4></div>
            <em className={completedSteps.objective ? styles.iiiComplete : ""}>{completedSteps.objective ? "Set" : "Required"}</em>
          </header>
          <div className={styles.iiiFieldGrid}>
            <label>
              <span>Retail path</span>
              <select aria-label="Retail path" onChange={(event) => updateText("retailPath", event.target.value as IiiRetailPath, "objective")} value={input.retailPath}>
                {retailPathOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Priority</span>
              <select aria-label="Priority" onChange={(event) => updateText("priority", event.target.value as IiiPriority, "objective")} value={input.priority}>
                {priorityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Requested evaluation</span>
              <select aria-label="Requested evaluation" onChange={(event) => updateText("requestedEvaluation", event.target.value as IiiRequestedEvaluation, "objective")} value={input.requestedEvaluation}>
                {requestedEvaluationOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.iiiChecks}>
            <label><input checked={input.targetFrontlineDateRecorded} onChange={(event) => updateBoolean("targetFrontlineDateRecorded", event.target.checked as IiiIntakeInput["targetFrontlineDateRecorded"], "objective")} type="checkbox" /><span>Target frontline date recorded</span></label>
            <label><input checked={input.frontlineTargetConfirmed} onChange={(event) => updateBoolean("frontlineTargetConfirmed", event.target.checked as IiiIntakeInput["frontlineTargetConfirmed"], "objective")} type="checkbox" /><span>Frontline target confirmed</span></label>
            <label><input checked={input.intakeNotesRecorded} onChange={(event) => updateBoolean("intakeNotesRecorded", event.target.checked as IiiIntakeInput["intakeNotesRecorded"], "objective")} type="checkbox" /><span>Intake notes recorded</span></label>
          </div>
          <button className={styles.iiiAction} disabled={!completedSteps.safety || !result.objectiveComplete || completedSteps.objective} onClick={completeObjective} type="button">Set inventory objective</button>
        </section>

        <section className={styles.iiiStepCard}>
          <header>
            <div><span>Step 5</span><h4>Confirm location, custody, and ownership</h4></div>
            <em className={completedSteps.custody ? styles.iiiComplete : ""}>{completedSteps.custody ? "Current" : "Required"}</em>
          </header>
          <div className={styles.iiiChecks}>
            <label><input checked={input.currentLocationRecorded} onChange={(event) => updateBoolean("currentLocationRecorded", event.target.checked as IiiIntakeInput["currentLocationRecorded"], "custody")} type="checkbox" /><span>Current location recorded</span></label>
            <label><input checked={input.currentCustodianRecorded} onChange={(event) => updateBoolean("currentCustodianRecorded", event.target.checked as IiiIntakeInput["currentCustodianRecorded"], "custody")} type="checkbox" /><span>Current custodian recorded</span></label>
            <label><input checked={input.keysOnHandConfirmed} onChange={(event) => updateBoolean("keysOnHandConfirmed", event.target.checked as IiiIntakeInput["keysOnHandConfirmed"], "custody")} type="checkbox" /><span>Keys on hand confirmed</span></label>
            <label><input checked={input.inventoryOwnerConfirmed} onChange={(event) => updateBoolean("inventoryOwnerConfirmed", event.target.checked as IiiIntakeInput["inventoryOwnerConfirmed"], "custody")} type="checkbox" /><span>Inventory owner confirmed</span></label>
          </div>
          <button className={styles.iiiAction} disabled={!completedSteps.objective || !result.custodyComplete || completedSteps.custody} onClick={completeCustody} type="button"><MapPinned size={14} />Confirm custody facts</button>
        </section>

        <section className={styles.iiiStepCard}>
          <header>
            <div><span>Step 6</span><h4>Run the intake readiness gate</h4></div>
            <em className={completedSteps.readiness ? styles.iiiComplete : ""}>{completedSteps.readiness ? "Released" : "Required"}</em>
          </header>
          <div className={styles.iiiChecks}>
            <label><input checked={result.readinessGateComplete} readOnly type="checkbox" /><span>Every minimum canonical, safety, objective, and custody fact is complete</span></label>
          </div>
          <button className={styles.iiiAction} disabled={!completedSteps.custody || !result.readinessGateComplete || completedSteps.readiness} onClick={completeReadiness} type="button"><LockKeyhole size={14} />Release to inspection</button>
        </section>
      </div>

      <aside className={styles.iiiDecision}>
        <header>
          <LockKeyhole />
          <div>
            <span>III recommendation</span>
            <strong>{result.recommendation}</strong>
          </div>
          <em className={result.blockers.length ? styles.iiiHold : styles.iiiComplete}>{scoreSummary}</em>
        </header>
        <dl>
          <div><dt>Intake score</dt><dd>{scoreSummary}</dd></div>
          <div><dt>Controls complete</dt><dd>{stepCount}/6</dd></div>
          <div><dt>Confidence</dt><dd>{result.confidence}</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockers.length}</dd></div>
          <div><dt>Priority</dt><dd>{input.priority}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
        </dl>
        <p className={styles.iiiExplanation}>{result.explanation}</p>
        <div className={styles.iiiDrivers}>
          <div>
            <strong>What is working</strong>
            {result.positiveDrivers.length ? result.positiveDrivers.map((item) => <span key={item}><Check />{item}</span>) : <span><CircleAlert />No confirmed intake strength yet.</span>}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.negativeDrivers.length ? result.negativeDrivers.map((item) => <span key={item}><CircleAlert />{item}</span>) : <span><Check />No active concern recorded.</span>}
          </div>
        </div>
        <section className={styles.iiiTrail}>
          <header><Clock3 /><h4>Operational work trail</h4></header>
          {trail.length ? <ol>
            {trail.map((entry, index) => <li key={`${entry.step}-${entry.timestamp}-${index}`}>
              <div><strong>{entry.timestamp}</strong><span>{entry.actor}</span></div>
              <p>{entry.result}</p>
              <em>{entry.evidence}</em>
            </li>)}
          </ol> : <p>No intake action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.iiiApproval}>
      <div>
        <span><LockKeyhole />Control state</span>
        <strong>{result.canonicalComplete ? "Canonical identity locked" : "Canonical facts still open"}</strong>
        <small>III carries verified facts forward once and avoids duplicate intake entry.</small>
      </div>
      <div>
        <span><ShieldCheck />Safety and scope</span>
        <strong>{result.safetyComplete && result.objectiveComplete ? "Ready for governed inspection scope" : "Safety or objective still open"}</strong>
        <small>Inspection should receive a unit with a clear retail path, priority, and requested evaluation.</small>
      </div>
      <div>
        <span><BadgeCheck />Stage readiness</span>
        <strong>{completedSteps.readiness ? "Ready for inspection" : "Intake still active"}</strong>
        <small>{completedSteps.readiness ? "The unit can move into governed inspection next." : "Complete custody facts and the intake gate before handoff."}</small>
      </div>
    </section>

    <footer className={styles.iiiNotice} aria-live="polite"><CircleAlert />{notice}</footer>
  </section>;
}
