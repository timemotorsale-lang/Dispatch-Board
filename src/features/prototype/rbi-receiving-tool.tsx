"use client";

import {
  BadgeCheck,
  Camera,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";
import { PrototypeVinScanCard, type PrototypeVinScanEvidence } from "./prototype-vin-scan-card";
import {
  evaluateRbiReceiving,
  type RbiChargeState,
  type RbiCustodyDecision,
  type RbiFuelState,
  type RbiLocation,
  type RbiReceivingInput,
  type RbiVarianceSeverity,
} from "./rbi-receiving-rules";

export type RbiWorkflowProgress = {
  arrivalFactsComplete: boolean;
  baselinePhotosComplete: boolean;
  blockerCount: number;
  custodyAccepted: boolean;
  recommendation: string;
  trailCount: number;
  varianceControlled: boolean;
  vinComplete: boolean;
};

type StepKey = "vin" | "arrival" | "photos" | "variance" | "custody" | "exceptions";

type TrailEntry = {
  actor: string;
  evidence: string;
  result: string;
  step: StepKey;
  timestamp: string;
};

const initialInput: RbiReceivingInput = {
  acceptedKeysCount: 2,
  arrivalOdometer: 53446,
  chargeState: "N/A",
  conditionVarianceFound: false,
  custodyDecision: "Pending review",
  documentsReceived: true,
  enginePhotoCaptured: false,
  exteriorPhotosCaptured: false,
  fuelState: "Quarter",
  interiorPhotosCaptured: false,
  keysCountMatchesTransport: true,
  locationConfirmed: true,
  locationPlaced: "Receiving lane",
  photoVarianceCaptured: false,
  pickupVsArrivalCompared: false,
  releasingPartyRecorded: true,
  varianceAssigned: false,
  varianceNoteRecorded: false,
  varianceSeverity: "None",
  vinDashPhotoCaptured: false,
  vinMatched: true,
  vinScanned: true,
};

const stepIndex: Record<StepKey, number> = {
  vin: 0,
  arrival: 1,
  photos: 2,
  variance: 3,
  custody: 4,
  exceptions: 5,
};

const locationOptions: RbiLocation[] = ["Receiving lane", "Front lot", "Service drive", "Outside storage", "Off-site lot"];
const fuelOptions: RbiFuelState[] = ["Empty", "Low", "Quarter", "Half", "Three quarters", "Full", "Unknown"];
const chargeOptions: RbiChargeState[] = ["0-10%", "11-25%", "26-50%", "51-75%", "76-100%", "N/A"];
const varianceOptions: RbiVarianceSeverity[] = ["None", "Minor", "Moderate", "Major", "Critical"];
const custodyOptions: RbiCustodyDecision[] = ["Pending review", "Accepted", "Conditional hold", "Disputed"];

function timeStamp() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

export function RbiReceivingTool({ expectedVin = "2T3W1RFVXRW333586", onProgressChange }: { expectedVin?: string; onProgressChange: (progress: RbiWorkflowProgress) => void }) {
  const [input, setInput] = useState(initialInput);
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    vin: false,
    arrival: false,
    photos: false,
    variance: false,
    custody: false,
    exceptions: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [vinEvidence, setVinEvidence] = useState<PrototypeVinScanEvidence | null>(null);
  const [notice, setNotice] = useState("Start Receiving by matching the physical VIN and documenting the arrival facts before anything changes the unit.");
  const result = useMemo(() => evaluateRbiReceiving(input), [input]);

  useEffect(() => {
    onProgressChange({
      arrivalFactsComplete: completedSteps.arrival && result.arrivalFactsComplete,
      baselinePhotosComplete: completedSteps.photos && result.baselinePhotosComplete,
      blockerCount: result.blockers.length,
      custodyAccepted: completedSteps.custody && result.custodyAccepted,
      recommendation: result.recommendation,
      trailCount: trail.length,
      varianceControlled: completedSteps.variance && result.varianceControlled,
      vinComplete: completedSteps.vin && result.vinComplete,
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

  function updateBoolean<K extends keyof RbiReceivingInput>(field: K, value: RbiReceivingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Receiving details changed. Reconfirm this step and any downstream baseline actions.");
  }

  function updateNumber<K extends keyof RbiReceivingInput>(field: K, value: RbiReceivingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Receiving details changed. Reconfirm this step and any downstream baseline actions.");
  }

  function updateText<K extends keyof RbiReceivingInput>(field: K, value: RbiReceivingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Receiving details changed. Reconfirm this step and any downstream baseline actions.");
  }

  function applyVinEvidence(evidence: PrototypeVinScanEvidence) {
    setVinEvidence(evidence);
    setInput((current) => ({
      ...current,
      vinMatched: evidence.vinMatched,
      vinScanned: evidence.vinCaptured,
    }));
    invalidateFrom(
      "vin",
      evidence.vinCaptured
        ? `${evidence.mode} processed for receiving. ${evidence.vinMatched ? "VIN matched the expected unit." : "Review the captured VIN before custody is accepted."}`
        : "The captured text did not produce a VIN. Re-scan the windshield or barcode before moving on.",
    );
  }

  function completeVin() {
    if (!result.vinComplete) return;
    setCompletedSteps((current) => ({ ...current, vin: true }));
    appendTrail(
      "vin",
      "Receiver",
      `Physical VIN was scanned and matched to the transportation and acquisition records.${vinEvidence?.auctionLocation ? ` Auction evidence recognized ${vinEvidence.auctionLocation.toLowerCase()}.` : ""}`,
      vinEvidence?.auctionDetected ? "VIN match and auction capture" : "VIN match",
    );
    setNotice("VIN identity is locked. Record the arrival facts next.");
  }

  function completeArrival() {
    if (!completedSteps.vin || !result.arrivalFactsComplete) return;
    setCompletedSteps((current) => ({ ...current, arrival: true }));
    appendTrail("arrival", "Receiver", `Arrival facts recorded at ${input.arrivalOdometer.toLocaleString()} miles in ${input.locationPlaced.toLowerCase()}.`, "Arrival record");
    setNotice("Arrival facts are complete. Capture the receiving baseline photos next.");
  }

  function completePhotos() {
    if (!completedSteps.arrival || !result.baselinePhotosComplete) return;
    setCompletedSteps((current) => ({ ...current, photos: true }));
    appendTrail("photos", "Receiver", "VIN/dash, exterior, interior, and engine baseline photos were captured.", "Baseline photo set");
    setNotice("Baseline photo set is complete. Compare pickup to arrival and control any variance.");
  }

  function completeVariance() {
    if (!completedSteps.photos || !result.varianceControlled) return;
    setCompletedSteps((current) => ({ ...current, variance: true, exceptions: true }));
    appendTrail(
      "variance",
      "Receiver",
      input.conditionVarianceFound
        ? `Pickup-to-arrival variance recorded as ${input.varianceSeverity.toLowerCase()} and assigned.`
        : "Pickup-to-arrival comparison found no variance.",
      input.conditionVarianceFound ? "Variance control" : "Condition comparison",
    );
    setNotice("Variance control is complete. Finalize the receiving custody decision next.");
  }

  function completeCustody() {
    if (!completedSteps.variance || !result.custodyAccepted) return;
    setCompletedSteps((current) => ({ ...current, custody: true }));
    appendTrail("custody", "Receiving coordinator", `Receiving custody decision recorded as ${input.custodyDecision.toLowerCase()}.`, "Custody acceptance");
    setNotice("Receiving custody is complete. This unit can now hand off into Intake.");
  }

  const scoreSummary = `${result.readinessScore}/100`;
  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  return <section className={styles.rbiWorkspace} aria-label="TMS Receiving Baseline Intelligence workspace">
    <header className={styles.rbiHeader}>
      <div>
        <span><ClipboardCheck size={15} />TMS Receiving Baseline Intelligence</span>
        <h3>RBI receiving baseline workspace</h3>
        <p>Lock the arrival facts, photo baseline, variance control, and custody decision before intake begins.</p>
      </div>
      <div className={styles.rbiVersion}>
        <small>Baseline state</small>
        <strong>{result.recommendation} / {result.confidence}</strong>
      </div>
    </header>

    <div className={styles.rbiBody}>
      <div className={styles.rbiSteps}>
        <section className={styles.rbiStepCard}>
          <header>
            <div><span>Step 1</span><h4>Scan and match the VIN</h4></div>
            <em className={completedSteps.vin ? styles.rbiComplete : ""}>{completedSteps.vin ? "Locked" : "Required"}</em>
          </header>
          <div className={styles.rbiEvidenceBlock}>
            <PrototypeVinScanCard
              expectedVin={expectedVin}
              helperText="Use normal VIN scans or paste Manheim / ADESA windshield details so receiving can match the physical unit without manual retyping."
              onEvidenceChange={applyVinEvidence}
              stageLabel="Receiving"
            />
          </div>
          <div className={styles.rbiChecks}>
            <label><input checked={input.vinScanned} onChange={(event) => updateBoolean("vinScanned", event.target.checked as RbiReceivingInput["vinScanned"], "vin")} type="checkbox" /><span>Physical VIN scanned</span></label>
            <label><input checked={input.vinMatched} onChange={(event) => updateBoolean("vinMatched", event.target.checked as RbiReceivingInput["vinMatched"], "vin")} type="checkbox" /><span>VIN matches transport and acquisition record</span></label>
          </div>
          <button className={styles.rbiAction} disabled={!result.vinComplete || completedSteps.vin} onClick={completeVin} type="button"><ScanLine size={14} />Lock VIN identity</button>
        </section>

        <section className={styles.rbiStepCard}>
          <header>
            <div><span>Step 2</span><h4>Record arrival facts</h4></div>
            <em className={completedSteps.arrival ? styles.rbiComplete : ""}>{completedSteps.arrival ? "Recorded" : "Required"}</em>
          </header>
          <div className={styles.rbiFieldGrid}>
            <label>
              <span>Arrival odometer</span>
              <div className={styles.rbiInputWrap}><b>mi</b><input aria-label="Arrival odometer" min="0" onChange={(event) => updateNumber("arrivalOdometer", Number(event.target.value) as RbiReceivingInput["arrivalOdometer"], "arrival")} type="number" value={input.arrivalOdometer} /></div>
            </label>
            <label>
              <span>Placed location</span>
              <select aria-label="Placed location" onChange={(event) => updateText("locationPlaced", event.target.value as RbiLocation, "arrival")} value={input.locationPlaced}>
                {locationOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Accepted keys</span>
              <div className={styles.rbiInputWrap}><b>#</b><input aria-label="Accepted keys" min="0" onChange={(event) => updateNumber("acceptedKeysCount", Number(event.target.value) as RbiReceivingInput["acceptedKeysCount"], "arrival")} type="number" value={input.acceptedKeysCount} /></div>
            </label>
            <label>
              <span>Fuel state</span>
              <select aria-label="Fuel state" onChange={(event) => updateText("fuelState", event.target.value as RbiFuelState, "arrival")} value={input.fuelState}>
                {fuelOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Charge state</span>
              <select aria-label="Charge state" onChange={(event) => updateText("chargeState", event.target.value as RbiChargeState, "arrival")} value={input.chargeState}>
                {chargeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.rbiChecks}>
            <label><input checked={input.locationConfirmed} onChange={(event) => updateBoolean("locationConfirmed", event.target.checked as RbiReceivingInput["locationConfirmed"], "arrival")} type="checkbox" /><span>Receiving placement confirmed</span></label>
            <label><input checked={input.releasingPartyRecorded} onChange={(event) => updateBoolean("releasingPartyRecorded", event.target.checked as RbiReceivingInput["releasingPartyRecorded"], "arrival")} type="checkbox" /><span>Releasing party recorded</span></label>
            <label><input checked={input.documentsReceived} onChange={(event) => updateBoolean("documentsReceived", event.target.checked as RbiReceivingInput["documentsReceived"], "arrival")} type="checkbox" /><span>Documents received</span></label>
            <label><input checked={input.keysCountMatchesTransport} onChange={(event) => updateBoolean("keysCountMatchesTransport", event.target.checked as RbiReceivingInput["keysCountMatchesTransport"], "arrival")} type="checkbox" /><span>Key count matches transport handoff</span></label>
          </div>
          <button className={styles.rbiAction} disabled={!completedSteps.vin || !result.arrivalFactsComplete || completedSteps.arrival} onClick={completeArrival} type="button">Record arrival facts</button>
        </section>

        <section className={styles.rbiStepCard}>
          <header>
            <div><span>Step 3</span><h4>Capture the receiving baseline photo set</h4></div>
            <em className={completedSteps.photos ? styles.rbiComplete : ""}>{completedSteps.photos ? "Captured" : "Required"}</em>
          </header>
          <div className={styles.rbiChecks}>
            <label><input checked={input.vinDashPhotoCaptured} onChange={(event) => updateBoolean("vinDashPhotoCaptured", event.target.checked as RbiReceivingInput["vinDashPhotoCaptured"], "photos")} type="checkbox" /><span>VIN and dash photos captured</span></label>
            <label><input checked={input.exteriorPhotosCaptured} onChange={(event) => updateBoolean("exteriorPhotosCaptured", event.target.checked as RbiReceivingInput["exteriorPhotosCaptured"], "photos")} type="checkbox" /><span>Exterior baseline photos captured</span></label>
            <label><input checked={input.interiorPhotosCaptured} onChange={(event) => updateBoolean("interiorPhotosCaptured", event.target.checked as RbiReceivingInput["interiorPhotosCaptured"], "photos")} type="checkbox" /><span>Interior baseline photos captured</span></label>
            <label><input checked={input.enginePhotoCaptured} onChange={(event) => updateBoolean("enginePhotoCaptured", event.target.checked as RbiReceivingInput["enginePhotoCaptured"], "photos")} type="checkbox" /><span>Engine / under-hood photo captured</span></label>
          </div>
          <button className={styles.rbiAction} disabled={!completedSteps.arrival || !result.baselinePhotosComplete || completedSteps.photos} onClick={completePhotos} type="button"><Camera size={14} />Complete baseline photo set</button>
        </section>

        <section className={styles.rbiStepCard}>
          <header>
            <div><span>Step 4</span><h4>Compare pickup and arrival condition</h4></div>
            <em className={completedSteps.variance ? styles.rbiComplete : ""}>{completedSteps.variance ? "Controlled" : "Required"}</em>
          </header>
          <div className={styles.rbiFieldGrid}>
            <label>
              <span>Variance severity</span>
              <select aria-label="Variance severity" disabled={!input.conditionVarianceFound} onChange={(event) => updateText("varianceSeverity", event.target.value as RbiVarianceSeverity, "variance")} value={input.varianceSeverity}>
                {varianceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.rbiChecks}>
            <label><input checked={input.pickupVsArrivalCompared} onChange={(event) => updateBoolean("pickupVsArrivalCompared", event.target.checked as RbiReceivingInput["pickupVsArrivalCompared"], "variance")} type="checkbox" /><span>Pickup-to-arrival comparison completed</span></label>
            <label><input checked={input.conditionVarianceFound} onChange={(event) => updateBoolean("conditionVarianceFound", event.target.checked as RbiReceivingInput["conditionVarianceFound"], "variance")} type="checkbox" /><span>Condition or equipment variance found</span></label>
            <label><input checked={input.varianceNoteRecorded} disabled={!input.conditionVarianceFound} onChange={(event) => updateBoolean("varianceNoteRecorded", event.target.checked as RbiReceivingInput["varianceNoteRecorded"], "variance")} type="checkbox" /><span>Variance note recorded</span></label>
            <label><input checked={input.photoVarianceCaptured} disabled={!input.conditionVarianceFound} onChange={(event) => updateBoolean("photoVarianceCaptured", event.target.checked as RbiReceivingInput["photoVarianceCaptured"], "variance")} type="checkbox" /><span>Variance photos captured</span></label>
            <label><input checked={input.varianceAssigned} disabled={!input.conditionVarianceFound} onChange={(event) => updateBoolean("varianceAssigned", event.target.checked as RbiReceivingInput["varianceAssigned"], "variance")} type="checkbox" /><span>Variance owner assigned</span></label>
          </div>
          <button className={styles.rbiAction} disabled={!completedSteps.photos || !result.varianceControlled || completedSteps.variance} onClick={completeVariance} type="button">Control variance and exceptions</button>
        </section>

        <section className={styles.rbiStepCard}>
          <header>
            <div><span>Step 5</span><h4>Accept accountable custody</h4></div>
            <em className={completedSteps.custody ? styles.rbiComplete : ""}>{completedSteps.custody ? "Accepted" : "Required"}</em>
          </header>
          <div className={styles.rbiFieldGrid}>
            <label>
              <span>Custody decision</span>
              <select aria-label="Custody decision" onChange={(event) => updateText("custodyDecision", event.target.value as RbiCustodyDecision, "custody")} value={input.custodyDecision}>
                {custodyOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <button className={styles.rbiAction} disabled={!completedSteps.variance || !result.custodyAccepted || completedSteps.custody} onClick={completeCustody} type="button"><ShieldCheck size={14} />Record custody decision</button>
        </section>
      </div>

      <aside className={styles.rbiDecision}>
        <header>
          <LockKeyhole />
          <div>
            <span>RBI recommendation</span>
            <strong>{result.recommendation}</strong>
          </div>
          <em className={result.blockers.length ? styles.rbiHold : styles.rbiComplete}>{scoreSummary}</em>
        </header>
        <dl>
          <div><dt>Baseline score</dt><dd>{scoreSummary}</dd></div>
          <div><dt>Controls complete</dt><dd>{stepCount}/5</dd></div>
          <div><dt>Confidence</dt><dd>{result.confidence}</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockers.length}</dd></div>
          <div><dt>Placed location</dt><dd>{input.locationPlaced}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
        </dl>
        <p className={styles.rbiExplanation}>{result.explanation}</p>
        <div className={styles.rbiDrivers}>
          <div>
            <strong>What is working</strong>
            {result.positiveDrivers.length ? result.positiveDrivers.map((item) => <span key={item}><Check />{item}</span>) : <span><CircleAlert />No confirmed receiving strength yet.</span>}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.negativeDrivers.length ? result.negativeDrivers.map((item) => <span key={item}><CircleAlert />{item}</span>) : <span><Check />No active concern recorded.</span>}
          </div>
        </div>
        <section className={styles.rbiTrail}>
          <header><Clock3 /><h4>Operational work trail</h4></header>
          {trail.length ? <ol>
            {trail.map((entry, index) => <li key={`${entry.step}-${entry.timestamp}-${index}`}>
              <div><strong>{entry.timestamp}</strong><span>{entry.actor}</span></div>
              <p>{entry.result}</p>
              <em>{entry.evidence}</em>
            </li>)}
          </ol> : <p>No receiving action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.rbiApproval}>
      <div>
        <span><LockKeyhole />Control state</span>
        <strong>{result.vinComplete && result.arrivalFactsComplete ? "Identity and arrival locked" : "Receiving baseline still open"}</strong>
        <small>RBI preserves the exact receiving baseline before inspection or recon changes the unit.</small>
      </div>
      <div>
        <span><Camera />Photo baseline</span>
        <strong>{result.baselinePhotosComplete ? "Photo baseline complete" : "Baseline photos still required"}</strong>
        <small>Receiving is the authoritative stage for VIN/dash, exterior, interior, and engine baseline images.</small>
      </div>
      <div>
        <span><BadgeCheck />Stage readiness</span>
        <strong>{completedSteps.custody ? "Ready for intake" : "Receiving still active"}</strong>
        <small>{completedSteps.custody ? "The unit can move into governed intake next." : "Complete variance control and custody decision before the handoff."}</small>
      </div>
    </section>

    <footer className={styles.rbiNotice} aria-live="polite"><CircleAlert />{notice}</footer>
  </section>;
}
