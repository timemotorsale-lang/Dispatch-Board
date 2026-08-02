"use client";

import {
  BadgeCheck,
  Check,
  CircleAlert,
  Clock3,
  LockKeyhole,
  Route,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";
import {
  evaluateTciTransport,
  type TciConditionVariance,
  type TciDriverPlan,
  type TciExceptionType,
  type TciMobilityDecision,
  type TciSourceLocation,
  type TciTrackingStatus,
  type TciTransportInput,
} from "./tci-transport-rules";

export type TciWorkflowProgress = {
  blockerCount: number;
  deliveryComplete: boolean;
  movementComplete: boolean;
  pickupComplete: boolean;
  planComplete: boolean;
  recommendation: string;
  releaseComplete: boolean;
  sourceComplete: boolean;
  trackingComplete: boolean;
  trailCount: number;
};

type StepKey = "source" | "release" | "plan" | "movement" | "pickup" | "delivery";

type TrailEntry = {
  actor: string;
  evidence: string;
  result: string;
  step: StepKey;
  timestamp: string;
};

const initialInput: TciTransportInput = {
  arrivalOdometer: 0,
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
  pickupOdometer: 0,
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

const stepIndex: Record<StepKey, number> = {
  source: 0,
  release: 1,
  plan: 2,
  movement: 3,
  pickup: 4,
  delivery: 5,
};

const sourceOptions: TciSourceLocation[] = [
  "Manheim Minneapolis / Maple Grove",
  "Manheim Northstar / Shakopee",
  "Adesa / Dayton",
  "Other source",
];
const planOptions: TciDriverPlan[] = ["Internal driver", "Driver with Uber support", "Tow vendor", "Carrier", "Pending dispatch"];
const movementOptions: TciMobilityDecision[] = ["Drive to dealership", "Tow to dealership", "Carrier to dealership", "Assessment required"];
const trackingOptions: TciTrackingStatus[] = ["At source", "Driver dispatched", "Picked up", "In transit", "Delivered"];
const exceptionOptions: TciExceptionType[] = ["None", "Delay", "Damage", "No release", "Unsafe to drive", "Reroute"];
const varianceOptions: TciConditionVariance[] = ["Pending review", "None", "Condition variance", "Missing item", "Document issue"];
const routeLabels = ["", "Low", "Controlled", "Moderate", "Elevated", "Critical"];

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
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    source: false,
    release: false,
    plan: false,
    movement: false,
    pickup: false,
    delivery: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Start TCI by confirming which auction holds the unit and how the driver will get to it.");
  const result = useMemo(() => evaluateTciTransport(input), [input]);

  useEffect(() => {
    onProgressChange({
      blockerCount: result.blockers.length,
      deliveryComplete: completedSteps.delivery && result.deliveryComplete,
      movementComplete: completedSteps.movement && result.movementComplete,
      pickupComplete: completedSteps.pickup && result.pickupComplete,
      planComplete: completedSteps.plan && result.planComplete,
      recommendation: result.recommendation,
      releaseComplete: completedSteps.release && result.releaseComplete,
      sourceComplete: completedSteps.source && result.sourceComplete,
      trackingComplete: result.trackingComplete,
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

  function updateNumber<K extends keyof TciTransportInput>(field: K, value: TciTransportInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Transportation details changed. Reconfirm this step and any downstream custody actions.");
  }

  function updateBoolean<K extends keyof TciTransportInput>(field: K, value: TciTransportInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Transportation evidence changed. Reconfirm this step and any downstream custody actions.");
  }

  function updateText<K extends keyof TciTransportInput>(field: K, value: TciTransportInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Transportation details changed. Reconfirm this step and any downstream custody actions.");
  }

  function completeSource() {
    if (!result.sourceComplete) return;
    setCompletedSteps((current) => ({ ...current, source: true }));
    appendTrail("source", "Transportation", `Vehicle located at ${input.sourceLocation} in ${input.currentLocation}.`, "Source confirmation");
    setNotice("Source location confirmed. Finish gate pass and release coordination next.");
  }

  function completeRelease() {
    if (!completedSteps.source || !result.releaseComplete) return;
    setCompletedSteps((current) => ({ ...current, release: true }));
    appendTrail("release", "Transportation", "Gate pass, release desk coordination, and source release are ready.", "Release readiness");
    setNotice("Release controls are complete. Coordinate the driver or outside transport next.");
  }

  function completePlan() {
    if (!completedSteps.release || !result.planComplete) return;
    setCompletedSteps((current) => ({ ...current, plan: true }));
    appendTrail("plan", "Transportation", `Movement plan approved using ${input.driverPlan.toLowerCase()}.`, input.uberNeeded ? "Driver and Uber coordination" : "Driver coordination");
    setNotice("Driver coordination is set. Complete the drive-or-tow readiness check next.");
  }

  function completeMovement() {
    if (!completedSteps.plan || !result.movementComplete) return;
    setCompletedSteps((current) => ({ ...current, movement: true }));
    appendTrail(
      "movement",
      "Driver",
      input.mobilityDecision === "Drive to dealership"
        ? "Vehicle cleared to drive after oil, coolant, plate, and jumper readiness checks."
        : `Vehicle routed as ${input.mobilityDecision.toLowerCase()}.`,
      "Movement readiness",
    );
    setNotice("Movement readiness is recorded. Capture pickup custody once the unit leaves the auction.");
  }

  function completePickup() {
    if (!completedSteps.movement || !result.pickupComplete) return;
    setCompletedSteps((current) => ({ ...current, pickup: true }));
    setInput((current) => ({ ...current, trackingStatus: "Picked up", currentLocation: "Departed auction / en route to dealership" }));
    appendTrail(
      "pickup",
      "Driver",
      result.pickupPhotosRecommended && !input.pickupPhotosCaptured
        ? `Pickup custody captured from ${input.pickupPerson} at ${input.pickupOdometer.toLocaleString()} miles. Pickup photos were deferred to receiving.`
        : `Pickup custody captured from ${input.pickupPerson} at ${input.pickupOdometer.toLocaleString()} miles.`,
      result.pickupPhotosRecommended && !input.pickupPhotosCaptured ? "Pickup proof / photos deferred" : "Pickup proof",
    );
    setNotice("Pickup custody is recorded. Keep location current until receiving accepts the unit.");
  }

  function completeDelivery() {
    if (!completedSteps.pickup || !result.deliveryComplete) return;
    setCompletedSteps((current) => ({ ...current, delivery: true }));
    appendTrail(
      "delivery",
      "Receiver",
      input.conditionVariance === "None"
        ? `Receiving accepted delivery at ${input.arrivalOdometer.toLocaleString()} miles with no variance.`
        : `Receiving accepted delivery with a recorded ${input.conditionVariance.toLowerCase()}.`,
      "Delivery proof",
    );
    setNotice("Transportation custody is complete. The unit is ready for intake.");
  }

  const scoredSummary = `${result.transportScore}/100`;
  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  return <section className={styles.tciWorkspace} aria-label="TMS Transport Custody Intelligence workspace">
    <header className={styles.tciHeader}>
      <div>
        <span><Truck size={15} />TMS Transport Custody Intelligence</span>
        <h3>TCI transportation custody workspace</h3>
        <p>Guide auction release, driver coordination, movement safety, pickup, and receiving with a visible work trail.</p>
      </div>
      <div className={styles.tciVersion}>
        <small>Custody state</small>
        <strong>{result.recommendation} / {result.confidence}</strong>
      </div>
    </header>

    <div className={styles.tciBody}>
      <div className={styles.tciSteps}>
        <section className={styles.tciStepCard}>
          <header>
            <div><span>Step 1</span><h4>Establish where the vehicle is currently</h4></div>
            <em className={completedSteps.source ? styles.tciComplete : ""}>{completedSteps.source ? "Recorded" : "Required"}</em>
          </header>
          <div className={styles.tciFieldGrid}>
            <label>
              <span>Auction source</span>
              <select aria-label="Auction source" onChange={(event) => updateText("sourceLocation", event.target.value as TciSourceLocation, "source")} value={input.sourceLocation}>
                {sourceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Exact current location</span>
              <input aria-label="Exact current location" onChange={(event) => updateText("currentLocation", event.target.value as TciTransportInput["currentLocation"], "source")} type="text" value={input.currentLocation} />
            </label>
            <label>
              <span>Route risk</span>
              <div className={styles.tciRangeLabel}><b>{routeLabels[input.routeRisk]}</b><input aria-label="Route risk" max="5" min="1" onChange={(event) => updateNumber("routeRisk", Number(event.target.value) as TciTransportInput["routeRisk"], "source")} type="range" value={input.routeRisk} /></div>
            </label>
          </div>
          <div className={styles.tciChecks}>
            <label><input checked={input.vehicleLocatedAtSource} onChange={(event) => updateBoolean("vehicleLocatedAtSource", event.target.checked as TciTransportInput["vehicleLocatedAtSource"], "source")} type="checkbox" /><span>Vehicle physically located at source</span></label>
          </div>
          <button className={styles.tciAction} disabled={!result.sourceComplete || completedSteps.source} onClick={completeSource} type="button">Confirm source location</button>
        </section>

        <section className={styles.tciStepCard}>
          <header>
            <div><span>Step 2</span><h4>Confirm gate pass and auction release</h4></div>
            <em className={completedSteps.release ? styles.tciComplete : ""}>{completedSteps.release ? "Verified" : "Required"}</em>
          </header>
          <div className={styles.tciChecks}>
            <label><input checked={input.gatePassReady} onChange={(event) => updateBoolean("gatePassReady", event.target.checked as TciTransportInput["gatePassReady"], "release")} type="checkbox" /><span>Gate pass ready</span></label>
            <label><input checked={input.gateReleaseConfirmed} onChange={(event) => updateBoolean("gateReleaseConfirmed", event.target.checked as TciTransportInput["gateReleaseConfirmed"], "release")} type="checkbox" /><span>Auction release desk coordinated</span></label>
            <label><input checked={input.documentsConfirmed} onChange={(event) => updateBoolean("documentsConfirmed", event.target.checked as TciTransportInput["documentsConfirmed"], "release")} type="checkbox" /><span>Release paperwork confirmed</span></label>
            <label><input checked={input.keysConfirmed} onChange={(event) => updateBoolean("keysConfirmed", event.target.checked as TciTransportInput["keysConfirmed"], "release")} type="checkbox" /><span>Keys confirmed with auction</span></label>
            <label><input checked={input.keysTypicallyHeldByAuction} onChange={(event) => updateBoolean("keysTypicallyHeldByAuction", event.target.checked as TciTransportInput["keysTypicallyHeldByAuction"], "release")} type="checkbox" /><span>Keys normally held at auction</span></label>
          </div>
          <button className={styles.tciAction} disabled={!completedSteps.source || !result.releaseComplete || completedSteps.release} onClick={completeRelease} type="button">Confirm release readiness</button>
        </section>

        <section className={styles.tciStepCard}>
          <header>
            <div><span>Step 3</span><h4>Coordinate driver movement to the auction</h4></div>
            <em className={completedSteps.plan ? styles.tciComplete : ""}>{completedSteps.plan ? "Planned" : "Required"}</em>
          </header>
          <div className={styles.tciFieldGrid}>
            <label>
              <span>Movement plan</span>
              <select aria-label="Movement plan" onChange={(event) => updateText("driverPlan", event.target.value as TciDriverPlan, "plan")} value={input.driverPlan}>
                {planOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Estimated hours</span>
              <div className={styles.tciInputWrap}><b>h</b><input aria-label="Estimated hours" min="0" onChange={(event) => updateNumber("etaHours", Number(event.target.value) as TciTransportInput["etaHours"], "plan")} type="number" value={input.etaHours} /></div>
            </label>
            <label>
              <span>Transport cost</span>
              <div className={styles.tciInputWrap}><b>$</b><input aria-label="Transport cost" min="0" onChange={(event) => updateNumber("transportCost", Number(event.target.value) as TciTransportInput["transportCost"], "plan")} type="number" value={input.transportCost} /></div>
            </label>
          </div>
          <div className={styles.tciChecks}>
            <label><input checked={input.driverAssigned} onChange={(event) => updateBoolean("driverAssigned", event.target.checked as TciTransportInput["driverAssigned"], "plan")} type="checkbox" /><span>Driver or vendor assigned</span></label>
            <label><input checked={input.destinationConfirmed} onChange={(event) => updateBoolean("destinationConfirmed", event.target.checked as TciTransportInput["destinationConfirmed"], "plan")} type="checkbox" /><span>Dealership destination confirmed</span></label>
            <label><input checked={input.uberNeeded} onChange={(event) => updateBoolean("uberNeeded", event.target.checked as TciTransportInput["uberNeeded"], "plan")} type="checkbox" /><span>Uber needed for driver coordination</span></label>
            <label><input checked={input.uberPlanned} disabled={!input.uberNeeded} onChange={(event) => updateBoolean("uberPlanned", event.target.checked as TciTransportInput["uberPlanned"], "plan")} type="checkbox" /><span>Uber coordination planned</span></label>
            <label><input checked={input.towVendorConfirmed} disabled={input.driverPlan !== "Tow vendor" && input.driverPlan !== "Carrier"} onChange={(event) => updateBoolean("towVendorConfirmed", event.target.checked as TciTransportInput["towVendorConfirmed"], "plan")} type="checkbox" /><span>Tow or carrier vendor confirmed</span></label>
          </div>
          <button className={styles.tciAction} disabled={!completedSteps.release || !result.planComplete || completedSteps.plan} onClick={completePlan} type="button">Record driver coordination</button>
        </section>

        <section className={styles.tciStepCard}>
          <header>
            <div><span>Step 4</span><h4>Decide whether to drive or tow and complete pre-trip checks</h4></div>
            <em className={completedSteps.movement ? styles.tciComplete : ""}>{completedSteps.movement ? "Ready" : "Required"}</em>
          </header>
          <div className={styles.tciFieldGrid}>
            <label>
              <span>Movement decision</span>
              <select aria-label="Movement decision" onChange={(event) => updateText("mobilityDecision", event.target.value as TciMobilityDecision, "movement")} value={input.mobilityDecision}>
                {movementOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Tracking status</span>
              <select aria-label="Tracking status" onChange={(event) => updateText("trackingStatus", event.target.value as TciTrackingStatus, "movement")} value={input.trackingStatus}>
                {trackingOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Exception</span>
              <select aria-label="Exception" onChange={(event) => updateText("exceptionType", event.target.value as TciExceptionType, "movement")} value={input.exceptionType}>
                {exceptionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.tciChecks}>
            <label><input checked={input.oilChecked} disabled={input.mobilityDecision !== "Drive to dealership"} onChange={(event) => updateBoolean("oilChecked", event.target.checked as TciTransportInput["oilChecked"], "movement")} type="checkbox" /><span>Oil checked before drive</span></label>
            <label><input checked={input.coolantChecked} disabled={input.mobilityDecision !== "Drive to dealership"} onChange={(event) => updateBoolean("coolantChecked", event.target.checked as TciTransportInput["coolantChecked"], "movement")} type="checkbox" /><span>Coolant checked before drive</span></label>
            <label><input checked={input.plateReminderConfirmed} onChange={(event) => updateBoolean("plateReminderConfirmed", event.target.checked as TciTransportInput["plateReminderConfirmed"], "movement")} type="checkbox" /><span>Dealer plate reminder confirmed</span></label>
            <label><input checked={input.jumperReminderConfirmed} onChange={(event) => updateBoolean("jumperReminderConfirmed", event.target.checked as TciTransportInput["jumperReminderConfirmed"], "movement")} type="checkbox" /><span>Jumper reminder confirmed</span></label>
            <label><input checked={input.exceptionResolved} disabled={input.exceptionType === "None"} onChange={(event) => updateBoolean("exceptionResolved", event.target.checked as TciTransportInput["exceptionResolved"], "movement")} type="checkbox" /><span>Open exception resolved or cleared</span></label>
          </div>
          <button className={styles.tciAction} disabled={!completedSteps.plan || !result.movementComplete || completedSteps.movement} onClick={completeMovement} type="button">Record movement readiness</button>
        </section>

        <section className={styles.tciStepCard}>
          <header>
            <div><span>Step 5</span><h4>Capture pickup custody and departure</h4></div>
            <em className={completedSteps.pickup ? styles.tciComplete : ""}>{completedSteps.pickup ? "Captured" : "Required"}</em>
          </header>
          <div className={styles.tciFieldGrid}>
            <label>
              <span>Release contact</span>
              <input aria-label="Release contact" onChange={(event) => updateText("pickupPerson", event.target.value as TciTransportInput["pickupPerson"], "pickup")} type="text" value={input.pickupPerson} />
            </label>
            <label>
              <span>Pickup odometer</span>
              <div className={styles.tciInputWrap}><b>mi</b><input aria-label="Pickup odometer" min="0" onChange={(event) => updateNumber("pickupOdometer", Number(event.target.value) as TciTransportInput["pickupOdometer"], "pickup")} type="number" value={input.pickupOdometer} /></div>
            </label>
            <label>
              <span>Keys received</span>
              <div className={styles.tciInputWrap}><b>#</b><input aria-label="Keys received" min="0" onChange={(event) => updateNumber("keysReceivedCount", Number(event.target.value) as TciTransportInput["keysReceivedCount"], "pickup")} type="number" value={input.keysReceivedCount} /></div>
            </label>
          </div>
          <div className={styles.tciChecks}>
            <label><input checked={input.pickupPhotosCaptured} onChange={(event) => updateBoolean("pickupPhotosCaptured", event.target.checked as TciTransportInput["pickupPhotosCaptured"], "pickup")} type="checkbox" /><span>{result.pickupPhotosRecommended ? "Pickup photos captured by TMS staff (recommended)" : "Pickup photos captured (optional)"}</span></label>
            <label><input checked={input.pickupSignatureCaptured} onChange={(event) => updateBoolean("pickupSignatureCaptured", event.target.checked as TciTransportInput["pickupSignatureCaptured"], "pickup")} type="checkbox" /><span>Pickup signature or release proof captured</span></label>
          </div>
          <button className={styles.tciAction} disabled={!completedSteps.movement || !result.pickupComplete || completedSteps.pickup} onClick={completePickup} type="button">Capture pickup custody</button>
        </section>

        <section className={styles.tciStepCard}>
          <header>
            <div><span>Step 6</span><h4>Prove delivery and receiving acceptance</h4></div>
            <em className={completedSteps.delivery ? styles.tciComplete : ""}>{completedSteps.delivery ? "Accepted" : "Required"}</em>
          </header>
          <div className={styles.tciFieldGrid}>
            <label>
              <span>Arrival odometer</span>
              <div className={styles.tciInputWrap}><b>mi</b><input aria-label="Arrival odometer" min="0" onChange={(event) => updateNumber("arrivalOdometer", Number(event.target.value) as TciTransportInput["arrivalOdometer"], "delivery")} type="number" value={input.arrivalOdometer} /></div>
            </label>
            <label>
              <span>Keys transferred</span>
              <div className={styles.tciInputWrap}><b>#</b><input aria-label="Keys transferred" min="0" onChange={(event) => updateNumber("keysTransferredCount", Number(event.target.value) as TciTransportInput["keysTransferredCount"], "delivery")} type="number" value={input.keysTransferredCount} /></div>
            </label>
            <label>
              <span>Delivery variance</span>
              <select aria-label="Delivery variance" onChange={(event) => updateText("conditionVariance", event.target.value as TciConditionVariance, "delivery")} value={input.conditionVariance}>
                {varianceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.tciChecks}>
            <label><input checked={input.arrivalPhotosCaptured} onChange={(event) => updateBoolean("arrivalPhotosCaptured", event.target.checked as TciTransportInput["arrivalPhotosCaptured"], "delivery")} type="checkbox" /><span>Arrival photos captured for receiving baseline</span></label>
            <label><input checked={input.receivingLocationConfirmed} onChange={(event) => updateBoolean("receivingLocationConfirmed", event.target.checked as TciTransportInput["receivingLocationConfirmed"], "delivery")} type="checkbox" /><span>Receiving location confirmed</span></label>
            <label><input checked={input.receivingAccepted} onChange={(event) => updateBoolean("receivingAccepted", event.target.checked as TciTransportInput["receivingAccepted"], "delivery")} type="checkbox" /><span>Receiving accepted custody</span></label>
          </div>
          <button className={styles.tciAction} disabled={!completedSteps.pickup || !result.deliveryComplete || completedSteps.delivery} onClick={completeDelivery} type="button">Accept delivery into receiving</button>
        </section>
      </div>

      <aside className={styles.tciDecision}>
        <header>
          <Route />
          <div>
            <span>TCI recommendation</span>
            <strong>{result.recommendation}</strong>
          </div>
          <em className={result.blockers.length ? styles.tciHold : styles.tciComplete}>{scoredSummary}</em>
        </header>
        <dl>
          <div><dt>Custody score</dt><dd>{scoredSummary}</dd></div>
          <div><dt>Controls complete</dt><dd>{stepCount}/6</dd></div>
          <div><dt>Confidence</dt><dd>{result.confidence}</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockers.length}</dd></div>
          <div><dt>Auction source</dt><dd>{input.sourceLocation}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
        </dl>
        <p className={styles.tciExplanation}>{result.explanation}</p>
        <div className={styles.tciDrivers}>
          <div>
            <strong>What is working</strong>
            {result.positiveDrivers.length ? result.positiveDrivers.map((item) => <span key={item}><Check />{item}</span>) : <span><CircleAlert />No confirmed transportation strength yet.</span>}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.negativeDrivers.length ? result.negativeDrivers.map((item) => <span key={item}><CircleAlert />{item}</span>) : <span><Check />No active concern recorded.</span>}
          </div>
        </div>
        <section className={styles.tciTrail}>
          <header><Clock3 /><h4>Operational work trail</h4></header>
          {trail.length ? <ol>
            {trail.map((entry, index) => <li key={`${entry.step}-${entry.timestamp}-${index}`}>
              <div><strong>{entry.timestamp}</strong><span>{entry.actor}</span></div>
              <p>{entry.result}</p>
              <em>{entry.evidence}</em>
            </li>)}
          </ol> : <p>No transportation action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.tciApproval}>
      <div>
        <span><LockKeyhole />Control state</span>
        <strong>{result.transportStepSummary}</strong>
        <small>Each completed action leaves a visible staff work trail.</small>
      </div>
      <div>
        <span><ShieldCheck />Stage readiness</span>
        <strong>{completedSteps.delivery ? "Transportation handoff ready" : "Transportation still active"}</strong>
        <small>{completedSteps.delivery ? "Receiving and intake can accept this unit next." : "Stay inside TCI until transport custody and receiving acceptance are complete."}</small>
      </div>
      <div>
        <span><BadgeCheck />Typical flow</span>
        <strong>{input.mobilityDecision === "Drive to dealership" ? "Direct drive workflow" : "Non-drive movement workflow"}</strong>
        <small>{input.keysTypicallyHeldByAuction ? "Keys are treated as auction-held unless the release proves otherwise." : "Keys are treated as a required pickup input."}</small>
      </div>
    </section>

    <footer className={styles.tciNotice} aria-live="polite"><CircleAlert />{notice}</footer>
  </section>;
}
