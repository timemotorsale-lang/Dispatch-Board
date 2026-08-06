"use client";

import { BadgeCheck, Check, CircleAlert, Clock3, Route, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";
import {
  evaluateTciTransport,
  type TciDriverPlan,
  type TciExceptionType,
  type TciMobilityDecision,
  type TciSourceLocation,
  type TciTransportInput,
} from "./tci-transport-rules";

export type TciWorkflowProgress = {
  blockerCount: number;
  blockersAssignedComplete: boolean;
  deliveryComplete: boolean;
  destinationWindowComplete: boolean;
  keysAndPaperworkComplete: boolean;
  movementComplete: boolean;
  pickupComplete: boolean;
  planComplete: boolean;
  recommendation: string;
  releaseComplete: boolean;
  safetyPreTripComplete: boolean;
  sourceComplete: boolean;
  trackingComplete: boolean;
  trailCount: number;
};

type BuilderStep = "source" | "release" | "driver" | "safety";

type TrailEntry = {
  actor: string;
  evidence: string;
  result: string;
  step: BuilderStep;
  timestamp: string;
};

const initialInput: TciTransportInput = {
  arrivalOdometer: 84193,
  arrivalPhotosCaptured: false,
  conditionVariance: "Pending review",
  currentLocation: "Manheim Minneapolis ready line",
  destinationConfirmed: true,
  documentsConfirmed: true,
  driverAssigned: true,
  driverPlan: "Internal driver",
  etaHours: 2,
  exceptionResolved: false,
  exceptionType: "None",
  gatePassReady: true,
  gateReleaseConfirmed: true,
  jumperReminderConfirmed: false,
  keysConfirmed: true,
  keysReceivedCount: 0,
  keysTypicallyHeldByAuction: true,
  keysTransferredCount: 0,
  mobilityDecision: "Drive to dealership",
  oilChecked: false,
  pickupOdometer: 84192,
  pickupPerson: "Manheim release desk",
  pickupPhotosCaptured: false,
  pickupSignatureCaptured: false,
  plateReminderConfirmed: false,
  receivingAccepted: false,
  receivingLocationConfirmed: false,
  routeRisk: 2,
  sourceLocation: "Manheim Minneapolis / Maple Grove",
  towVendorConfirmed: false,
  trackingStatus: "At source",
  transportCost: 45,
  uberNeeded: false,
  uberPlanned: false,
  vehicleLocatedAtSource: true,
  coolantChecked: false,
};

const sourceOptions: TciSourceLocation[] = [
  "Manheim Minneapolis / Maple Grove",
  "Manheim Northstar / Shakopee",
  "Adesa / Dayton",
  "Other source",
];
const planOptions: TciDriverPlan[] = ["Internal driver", "Driver with Uber support", "Tow vendor", "Carrier", "Pending dispatch"];
const movementOptions: TciMobilityDecision[] = ["Drive to dealership", "Tow to dealership", "Carrier to dealership", "Assessment required"];
const exceptionOptions: TciExceptionType[] = ["None", "Delay", "Damage", "No release", "Unsafe to drive", "Reroute"];

function timeStamp() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

export function TciTransportTool({ onProgressChange }: { onProgressChange: (progress: TciWorkflowProgress) => void }) {
  const [input, setInput] = useState(initialInput);
  const [completedSteps, setCompletedSteps] = useState<Record<BuilderStep, boolean>>({
    driver: false,
    release: false,
    safety: false,
    source: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Open the Transportation Custody Builder, then confirm each section once the facts are recorded.");
  const result = useMemo(() => evaluateTciTransport(input), [input]);

  const keysAndPaperworkComplete = completedSteps.release && input.keysConfirmed && input.documentsConfirmed;
  const destinationWindowComplete = completedSteps.driver && input.destinationConfirmed && input.etaHours > 0;
  const safetyPreTripComplete = completedSteps.safety && result.movementComplete;
  const blockersReady = input.exceptionType === "None" || input.exceptionResolved;
  const blockersAssignedComplete = completedSteps.safety && blockersReady;
  const progress = useMemo<TciWorkflowProgress>(() => ({
    blockerCount: result.blockers.length,
    blockersAssignedComplete,
    deliveryComplete: completedSteps.safety && result.deliveryComplete,
    destinationWindowComplete,
    keysAndPaperworkComplete,
    movementComplete: completedSteps.safety && input.mobilityDecision !== "Assessment required",
    pickupComplete: completedSteps.driver && input.pickupOdometer > 0,
    planComplete: completedSteps.driver && result.planComplete,
    recommendation: result.recommendation,
    releaseComplete: completedSteps.release && result.releaseComplete,
    safetyPreTripComplete,
    sourceComplete: completedSteps.source && result.sourceComplete,
    trackingComplete: result.trackingComplete,
    trailCount: trail.length,
  }), [blockersAssignedComplete, completedSteps, destinationWindowComplete, input.mobilityDecision, input.pickupOdometer, keysAndPaperworkComplete, result, safetyPreTripComplete, trail.length]);

  useEffect(() => {
    onProgressChange(progress);
  }, [onProgressChange, progress]);

  function appendTrail(step: BuilderStep, resultText: string, evidence: string) {
    setTrail((current) => [{ actor: step === "driver" || step === "safety" ? "Transportation" : "Logistics", evidence, result: resultText, step, timestamp: timeStamp() }, ...current]);
  }

  function reopen(step: BuilderStep) {
    setCompletedSteps((current) => ({ ...current, [step]: false }));
    setNotice("Transportation facts changed. Reconfirm the affected section so the checklist evidence stays clean.");
  }

  function update<K extends keyof TciTransportInput>(field: K, value: TciTransportInput[K], step: BuilderStep) {
    setInput((current) => ({ ...current, [field]: value }));
    reopen(step);
  }

  function confirmSource() {
    if (!result.sourceComplete) return;
    setCompletedSteps((current) => ({ ...current, source: true }));
    appendTrail("source", `Source confirmed at ${input.sourceLocation}: ${input.currentLocation}.`, "Source confirmation");
    setNotice("Source location confirmed. Release readiness is next.");
  }

  function confirmRelease() {
    if (!result.releaseComplete || !input.keysConfirmed) return;
    setCompletedSteps((current) => ({ ...current, release: true }));
    appendTrail("release", "Gate pass, release paperwork, and keys are ready for dispatch.", "Release readiness");
    setNotice("Release readiness confirmed. Coordinate driver or carrier movement next.");
  }

  function confirmDriver() {
    if (!result.planComplete) return;
    setCompletedSteps((current) => ({ ...current, driver: true }));
    appendTrail("driver", `${input.driverPlan} assigned with ${input.etaHours} hour ETA and $${input.transportCost} estimated cost.`, "Driver coordination");
    setNotice("Driver coordination recorded. Finish movement safety and blocker control next.");
  }

  function confirmSafety() {
    if (!result.movementComplete || !blockersReady) return;
    setCompletedSteps((current) => ({ ...current, safety: true }));
    appendTrail("safety", `${input.mobilityDecision} selected with pre-trip and exception controls recorded.`, "Movement safety");
    setNotice("Transportation custody builder is complete enough for the stage checklist to unlock.");
  }

  const controlsComplete = [
    progress.sourceComplete,
    progress.releaseComplete,
    progress.keysAndPaperworkComplete,
    progress.planComplete,
    progress.destinationWindowComplete,
    progress.movementComplete,
    progress.safetyPreTripComplete,
    progress.blockersAssignedComplete,
  ].filter(Boolean).length;

  return <section className={styles.tciWorkspace} id="transportation-custody-builder" aria-label="Transportation Custody Builder">
    <header className={styles.tciHeader}>
      <div>
        <span><Truck size={15} />TMS Transport Custody Intelligence</span>
        <h3>Transportation Custody Builder</h3>
        <p>Confirm source, release, driver coordination, movement safety, and receiving handoff.</p>
      </div>
      <div className={styles.tciVersion}>
        <small>Stage 2 · Transportation</small>
        <strong>Draft</strong>
      </div>
    </header>

    <div className={styles.tciBody}>
      <div className={styles.tciSteps}>
        <section className={styles.tciStepCard}>
          <header>
            <div><span>1</span><h4>Source location</h4></div>
            <em className={completedSteps.source ? styles.tciComplete : ""}>{completedSteps.source ? "Recorded" : "Required"}</em>
          </header>
          <div className={styles.tciFieldGrid}>
            <label><span>Source type</span><select aria-label="Source type" onChange={(event) => update("sourceLocation", event.target.value as TciSourceLocation, "source")} value={input.sourceLocation}>{sourceOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Exact current location</span><input aria-label="Exact current location" onChange={(event) => update("currentLocation", event.target.value, "source")} value={input.currentLocation} /></label>
            <label><span>Source contact</span><input aria-label="Source contact" onChange={(event) => update("pickupPerson", event.target.value, "source")} value={input.pickupPerson} /></label>
          </div>
          <div className={styles.tciChecks}><label><input checked={input.vehicleLocatedAtSource} onChange={(event) => update("vehicleLocatedAtSource", event.target.checked, "source")} type="checkbox" /><span>Vehicle physically verified at source</span></label></div>
          <button className={styles.tciAction} disabled={!result.sourceComplete || completedSteps.source} onClick={confirmSource} type="button">Confirm source location</button>
        </section>

        <section className={styles.tciStepCard}>
          <header>
            <div><span>2</span><h4>Release readiness</h4></div>
            <em className={completedSteps.release ? styles.tciComplete : ""}>{completedSteps.release ? "Recorded" : "Required"}</em>
          </header>
          <div className={styles.tciFieldGrid}>
            <label><span>Gate pass status</span><select aria-label="Gate pass status" onChange={(event) => update("gatePassReady", event.target.value === "Available", "release")} value={input.gatePassReady ? "Available" : "Missing"}><option>Available</option><option>Missing</option></select></label>
            <label><span>Keys status</span><select aria-label="Keys status" onChange={(event) => update("keysConfirmed", event.target.value === "Confirmed", "release")} value={input.keysConfirmed ? "Confirmed" : "Missing"}><option>Confirmed</option><option>Missing</option></select></label>
            <label><span>Release paperwork</span><select aria-label="Release paperwork" onChange={(event) => update("documentsConfirmed", event.target.value === "Ready", "release")} value={input.documentsConfirmed ? "Ready" : "Missing"}><option>Ready</option><option>Missing</option></select></label>
          </div>
          <div className={styles.tciChecks}><label><input checked={input.gateReleaseConfirmed} onChange={(event) => update("gateReleaseConfirmed", event.target.checked, "release")} type="checkbox" /><span>Release desk coordinated</span></label></div>
          <button className={styles.tciAction} disabled={!result.releaseComplete || !input.keysConfirmed || completedSteps.release} onClick={confirmRelease} type="button">Confirm release readiness</button>
        </section>

        <section className={styles.tciStepCard}>
          <header>
            <div><span>3</span><h4>Driver / carrier coordination</h4></div>
            <em className={completedSteps.driver ? styles.tciComplete : ""}>{completedSteps.driver ? "Recorded" : "Required"}</em>
          </header>
          <div className={styles.tciFieldGrid}>
            <label><span>Movement method</span><select aria-label="Movement method" onChange={(event) => update("driverPlan", event.target.value as TciDriverPlan, "driver")} value={input.driverPlan}>{planOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Pickup window / ETA hours</span><input aria-label="Pickup window ETA hours" min="0" onChange={(event) => update("etaHours", Number(event.target.value), "driver")} type="number" value={input.etaHours} /></label>
            <label><span>Estimated cost</span><input aria-label="Estimated cost" min="0" onChange={(event) => update("transportCost", Number(event.target.value), "driver")} type="number" value={input.transportCost} /></label>
          </div>
          <div className={styles.tciChecks}>
            <label><input checked={input.driverAssigned} onChange={(event) => update("driverAssigned", event.target.checked, "driver")} type="checkbox" /><span>Driver/vendor assigned</span></label>
            <label><input checked={input.destinationConfirmed} onChange={(event) => update("destinationConfirmed", event.target.checked, "driver")} type="checkbox" /><span>Destination confirmed</span></label>
            <label><input checked={input.uberNeeded} onChange={(event) => update("uberNeeded", event.target.checked, "driver")} type="checkbox" /><span>Uber needed</span></label>
            <label><input checked={input.uberPlanned} disabled={!input.uberNeeded} onChange={(event) => update("uberPlanned", event.target.checked, "driver")} type="checkbox" /><span>Uber planned</span></label>
          </div>
          <button className={styles.tciAction} disabled={!result.planComplete || completedSteps.driver} onClick={confirmDriver} type="button">Record driver coordination</button>
        </section>

        <section className={styles.tciStepCard}>
          <header>
            <div><span>4</span><h4>Movement safety</h4></div>
            <em className={completedSteps.safety ? styles.tciComplete : ""}>{completedSteps.safety ? "Recorded" : "Required"}</em>
          </header>
          <div className={styles.tciFieldGrid}>
            <label><span>Starts / runs</span><select aria-label="Starts runs"><option>Yes</option><option>No</option><option>Unknown</option></select></label>
            <label><span>Drive / tow decision</span><select aria-label="Drive tow decision" onChange={(event) => update("mobilityDecision", event.target.value as TciMobilityDecision, "safety")} value={input.mobilityDecision}>{movementOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Exception needed</span><select aria-label="Exception needed" onChange={(event) => update("exceptionType", event.target.value as TciExceptionType, "safety")} value={input.exceptionType}>{exceptionOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className={styles.tciChecks}>
            <label><input checked={input.oilChecked} disabled={input.mobilityDecision !== "Drive to dealership"} onChange={(event) => update("oilChecked", event.target.checked, "safety")} type="checkbox" /><span>Oil checked before drive</span></label>
            <label><input checked={input.coolantChecked} disabled={input.mobilityDecision !== "Drive to dealership"} onChange={(event) => update("coolantChecked", event.target.checked, "safety")} type="checkbox" /><span>Coolant checked before drive</span></label>
            <label><input checked={input.plateReminderConfirmed} onChange={(event) => update("plateReminderConfirmed", event.target.checked, "safety")} type="checkbox" /><span>Dealer plate reminder confirmed</span></label>
            <label><input checked={input.jumperReminderConfirmed} onChange={(event) => update("jumperReminderConfirmed", event.target.checked, "safety")} type="checkbox" /><span>Jumper reminder confirmed</span></label>
            <label><input checked={input.exceptionResolved} disabled={input.exceptionType === "None"} onChange={(event) => update("exceptionResolved", event.target.checked, "safety")} type="checkbox" /><span>Open blocker resolved or assigned</span></label>
          </div>
          <button className={styles.tciAction} disabled={!result.movementComplete || !blockersReady || completedSteps.safety} onClick={confirmSafety} type="button">Record movement decision</button>
        </section>
      </div>

      <aside className={styles.tciDecision}>
        <header>
          <Route />
          <div><span>Transportation readiness</span><strong>{result.recommendation} / {result.confidence}</strong></div>
          <em className={result.blockers.length ? styles.tciHold : styles.tciComplete}>{result.transportScore}/100</em>
        </header>
        <dl>
          <div><dt>Controls complete</dt><dd>{controlsComplete}/8</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockers.length}</dd></div>
          <div><dt>Vehicle</dt><dd>2024 Toyota RAV4</dd></div>
          <div><dt>Owner</dt><dd>Alex Carter</dd></div>
          <div><dt>Current location</dt><dd>{input.currentLocation}</dd></div>
          <div><dt>Handoff target</dt><dd>Receiving</dd></div>
        </dl>
        <p className={styles.tciExplanation}>{result.explanation}</p>
        <div className={styles.tciDrivers}>
          <div><strong>What is working</strong>{result.positiveDrivers.length ? result.positiveDrivers.map((item) => <span key={item}><Check />{item}</span>) : <span><CircleAlert />No confirmed transportation strength yet.</span>}</div>
          <div><strong>What still needs attention</strong>{result.negativeDrivers.length ? result.negativeDrivers.map((item) => <span key={item}><CircleAlert />{item}</span>) : <span><Check />No active concern recorded.</span>}</div>
        </div>
        <section className={styles.tciTrail}>
          <header><Clock3 /><h4>Operational work trail</h4></header>
          {trail.length ? <ol>{trail.map((entry, index) => <li key={`${entry.step}-${entry.timestamp}-${index}`}><div><strong>{entry.timestamp}</strong><span>{entry.actor}</span></div><p>{entry.result}</p><em>{entry.evidence}</em></li>)}</ol> : <p>No transportation action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.tciApproval}>
      <div><span><ShieldCheck />Checklist progress</span><strong>{controlsComplete}/8 checklist lines cleared</strong><small>The tool records evidence that checks the stage lines below.</small></div>
      <div><span><BadgeCheck />Readiness</span><strong>{controlsComplete === 8 ? "Ready for Receiving" : "Not ready for Receiving"}</strong><small>Receiving stays locked until every transportation control is cleared.</small></div>
      <div><span><Truck />Completion path</span><strong>Source → Release → Driver → Safety</strong><small>Staff should work the builder from top to bottom.</small></div>
    </section>

    <footer className={styles.tciNotice} aria-live="polite"><CircleAlert />{notice}</footer>
  </section>;
}
