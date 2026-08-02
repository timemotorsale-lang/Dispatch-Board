"use client";

import {
  BadgeCheck,
  Camera,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";

export type DtgWorkflowProgress = {
  blockerCount: number;
  exteriorComplete: boolean;
  interiorComplete: boolean;
  qcComplete: boolean;
  recommendation: "Confirm detail scope" | "Complete exterior" | "Complete interior" | "Finish specialty work" | "Pass detail QC" | "Stage for photography" | "Ready for Photos & Marketing";
  scopeComplete: boolean;
  specialtyComplete: boolean;
  stageComplete: boolean;
  trailCount: number;
};

type StepKey = "scope" | "exterior" | "interior" | "specialty" | "qc" | "stage";
type TrailEntry = { actor: string; evidence: string; result: string; step: StepKey; timestamp: string };
type SpecialtyState = "Not needed" | "Required and completed" | "Pending";
type FuelState = "Ready" | "Needs fuel" | "Needs charge";

type DetailingInput = {
  cargoAndAccessoriesVerified: boolean;
  dealershipLocationConfirmed: boolean;
  detailMaterialsReady: boolean;
  exteriorFinishComplete: boolean;
  exteriorGlassComplete: boolean;
  exteriorWashComplete: boolean;
  fuelState: FuelState;
  interiorGlassAndSurfacesComplete: boolean;
  interiorVacuumAndExtractionComplete: boolean;
  keysReady: boolean;
  mediaAppointmentBooked: boolean;
  noNewDamageObserved: boolean;
  odorOrSpecialConditionResolved: boolean;
  photoLocationReady: boolean;
  presentationDefectsCleared: boolean;
  specialtyState: SpecialtyState;
  tiresAndWheelsComplete: boolean;
  trimAndJambsComplete: boolean;
  vehicleDisclosureReviewed: boolean;
};

const initialInput: DetailingInput = {
  cargoAndAccessoriesVerified: false,
  dealershipLocationConfirmed: false,
  detailMaterialsReady: false,
  exteriorFinishComplete: false,
  exteriorGlassComplete: false,
  exteriorWashComplete: false,
  fuelState: "Needs fuel",
  interiorGlassAndSurfacesComplete: false,
  interiorVacuumAndExtractionComplete: false,
  keysReady: false,
  mediaAppointmentBooked: false,
  noNewDamageObserved: false,
  odorOrSpecialConditionResolved: false,
  photoLocationReady: false,
  presentationDefectsCleared: false,
  specialtyState: "Pending",
  tiresAndWheelsComplete: false,
  trimAndJambsComplete: false,
  vehicleDisclosureReviewed: false,
};

const returnTo = "/vehicles/inventory/prototype";

function timeStamp() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

function evaluateDetailing(input: DetailingInput) {
  const scopeComplete = input.vehicleDisclosureReviewed && input.detailMaterialsReady && input.dealershipLocationConfirmed;
  const exteriorComplete = input.exteriorWashComplete && input.exteriorFinishComplete && input.exteriorGlassComplete && input.tiresAndWheelsComplete && input.trimAndJambsComplete;
  const interiorComplete = input.interiorVacuumAndExtractionComplete && input.interiorGlassAndSurfacesComplete;
  const specialtyComplete = input.specialtyState === "Not needed" || (input.specialtyState === "Required and completed" && input.odorOrSpecialConditionResolved);
  const qcComplete = input.noNewDamageObserved && input.presentationDefectsCleared;
  const stageComplete = input.fuelState === "Ready" && input.keysReady && input.photoLocationReady && input.mediaAppointmentBooked && input.cargoAndAccessoriesVerified;

  const blockers = [
    !scopeComplete ? "Detail scope, disclosure context, or materials are not fully confirmed." : null,
    !exteriorComplete ? "Exterior preparation is still incomplete." : null,
    !interiorComplete ? "Interior preparation is still incomplete." : null,
    !specialtyComplete ? "Specialty detail or odor-condition work is still open." : null,
    !qcComplete ? "Detail quality check has not fully cleared presentation defects." : null,
    !stageComplete ? "Photo staging, keys, fuel/charge, or media appointment is not ready." : null,
  ].filter((item): item is string => Boolean(item));

  const recommendation: DtgWorkflowProgress["recommendation"] =
    !scopeComplete ? "Confirm detail scope"
      : !exteriorComplete ? "Complete exterior"
        : !interiorComplete ? "Complete interior"
          : !specialtyComplete ? "Finish specialty work"
            : !qcComplete ? "Pass detail QC"
              : !stageComplete ? "Stage for photography"
                : "Ready for Photos & Marketing";

  const positiveDrivers = [
    scopeComplete ? "Detail scope and disclosure context are confirmed." : null,
    exteriorComplete ? "Exterior finish, glass, trim, wheels, and jambs meet standard." : null,
    interiorComplete ? "Interior cleaning and surface presentation meet standard." : null,
    specialtyComplete ? "Specialty detail conditions are resolved or not required." : null,
    qcComplete ? "Detail QC has cleared presentation defects and new damage concerns." : null,
    stageComplete ? "Photo staging, keys, media slot, and fuel/charge are ready." : null,
  ].filter((item): item is string => Boolean(item));

  return {
    blockerCount: blockers.length,
    blockers,
    exteriorComplete,
    interiorComplete,
    positiveDrivers,
    qcComplete,
    recommendation,
    scopeComplete,
    specialtyComplete,
    stageComplete,
  };
}

export function DtgDetailingTool({ onProgressChange }: { onProgressChange: (progress: DtgWorkflowProgress) => void }) {
  const [input, setInput] = useState(initialInput);
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    exterior: false,
    interior: false,
    qc: false,
    scope: false,
    specialty: false,
    stage: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Start detailing by confirming the exact scope, disclosures, materials, and location before cleaning begins.");
  const result = useMemo(() => evaluateDetailing(input), [input]);

  useEffect(() => {
    onProgressChange({
      blockerCount: result.blockerCount,
      exteriorComplete: completedSteps.exterior && result.exteriorComplete,
      interiorComplete: completedSteps.interior && result.interiorComplete,
      qcComplete: completedSteps.qc && result.qcComplete,
      recommendation: result.recommendation,
      scopeComplete: completedSteps.scope && result.scopeComplete,
      specialtyComplete: completedSteps.specialty && result.specialtyComplete,
      stageComplete: completedSteps.stage && result.stageComplete,
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
      const order: StepKey[] = ["scope", "exterior", "interior", "specialty", "qc", "stage"];
      const startIndex = order.indexOf(step);
      order.forEach((key, index) => {
        if (index >= startIndex && current[key]) {
          next[key] = false;
          reopened = true;
        }
      });
      return next;
    });
    if (reopened) appendTrail(step, "System", message, "Detail control reopened");
    setNotice(message);
  }

  function updateBoolean<K extends keyof DetailingInput>(field: K, value: DetailingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Detailing facts changed. Reconfirm this step and every downstream presentation control.");
  }

  function updateValue<K extends keyof DetailingInput>(field: K, value: DetailingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Detailing facts changed. Reconfirm this step and every downstream presentation control.");
  }

  function completeScope() {
    if (!result.scopeComplete) return;
    setCompletedSteps((current) => ({ ...current, scope: true }));
    appendTrail("scope", "Detail lead", "Detail scope, disclosures, materials, and working location were confirmed.", "Detail scope");
    setNotice("Scope is locked. Exterior preparation should be completed next.");
  }

  function completeExterior() {
    if (!completedSteps.scope || !result.exteriorComplete) return;
    setCompletedSteps((current) => ({ ...current, exterior: true }));
    appendTrail("exterior", "Detailer", "Exterior preparation, finish, glass, wheels, and jambs were completed.", "Exterior checklist");
    setNotice("Exterior work is complete. Finish the interior preparation next.");
  }

  function completeInterior() {
    if (!completedSteps.exterior || !result.interiorComplete) return;
    setCompletedSteps((current) => ({ ...current, interior: true }));
    appendTrail("interior", "Detailer", "Interior cleaning, extraction, surfaces, and glass were completed.", "Interior checklist");
    setNotice("Interior work is complete. Finish any specialty detail work next.");
  }

  function completeSpecialty() {
    if (!completedSteps.interior || !result.specialtyComplete) return;
    setCompletedSteps((current) => ({ ...current, specialty: true }));
    appendTrail("specialty", "Detail lead", input.specialtyState === "Not needed" ? "No specialty detail work was required for this vehicle." : "Specialty detail and odor-condition work were completed.", "Specialty record");
    setNotice("Specialty work is complete. Run the detail quality check next.");
  }

  function completeQc() {
    if (!completedSteps.specialty || !result.qcComplete) return;
    setCompletedSteps((current) => ({ ...current, qc: true }));
    appendTrail("qc", "Detail lead", "Detail quality check passed with no unresolved presentation defect or new damage concern.", "Detail QC");
    setNotice("Detail QC is complete. Stage the vehicle for photography next.");
  }

  function completeStage() {
    if (!completedSteps.qc || !result.stageComplete) return;
    setCompletedSteps((current) => ({ ...current, stage: true }));
    appendTrail("stage", "Detail lead", "Vehicle was staged with keys, fuel or charge, media slot, accessories, and photo location ready.", "Media handoff");
    setNotice("Detailing is complete. The vehicle can now hand off into Photos & Marketing.");
  }

  const qcHref = `/vehicles/quality-control?returnTo=${encodeURIComponent(returnTo)}`;
  const lifecycleHref = "/vehicles/inventory/prototype";
  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  return <section className={styles.wopWorkspace} aria-label="TMS Detailing workspace">
    <header className={styles.wopHeader}>
      <div>
        <span><Sparkles size={15} />TMS Detailing</span>
        <h3>DTG presentation workspace</h3>
        <p>Guide the detail team through scope control, exterior and interior preparation, specialty work, detail QC, and photo staging.</p>
        <div className={styles.wopHeaderActions}>
          <Link className={styles.wopHeaderLink} href={qcHref}><ClipboardCheck size={14} />Final QC workspace</Link>
          <Link className={styles.wopHeaderLink} href={lifecycleHref}><Camera size={14} />Lifecycle rail</Link>
        </div>
      </div>
      <div className={styles.wopVersion}>
        <small>Detail state</small>
        <strong>{result.recommendation}</strong>
      </div>
    </header>

    <div className={styles.wopBody}>
      <div className={styles.wopSteps}>
        <section className={styles.wopStepCard}>
          <header><div><span>Step 1</span><h4>Confirm detail scope and condition</h4></div><em className={completedSteps.scope ? styles.wopComplete : ""}>{completedSteps.scope ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.vehicleDisclosureReviewed} onChange={(event) => updateBoolean("vehicleDisclosureReviewed", event.target.checked, "scope")} type="checkbox" /><span>Vehicle disclosures and condition limits were reviewed</span></label>
            <label><input checked={input.detailMaterialsReady} onChange={(event) => updateBoolean("detailMaterialsReady", event.target.checked, "scope")} type="checkbox" /><span>Approved materials and supplies are ready</span></label>
            <label><input checked={input.dealershipLocationConfirmed} onChange={(event) => updateBoolean("dealershipLocationConfirmed", event.target.checked, "scope")} type="checkbox" /><span>Work location and custody are confirmed</span></label>
          </div>
          <button className={styles.wopAction} disabled={!result.scopeComplete || completedSteps.scope} onClick={completeScope} type="button">Lock detail scope</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 2</span><h4>Complete exterior preparation</h4></div><em className={completedSteps.exterior ? styles.wopComplete : ""}>{completedSteps.exterior ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.exteriorWashComplete} onChange={(event) => updateBoolean("exteriorWashComplete", event.target.checked, "exterior")} type="checkbox" /><span>Wash and decontamination complete</span></label>
            <label><input checked={input.exteriorFinishComplete} onChange={(event) => updateBoolean("exteriorFinishComplete", event.target.checked, "exterior")} type="checkbox" /><span>Finish and presentation complete</span></label>
            <label><input checked={input.exteriorGlassComplete} onChange={(event) => updateBoolean("exteriorGlassComplete", event.target.checked, "exterior")} type="checkbox" /><span>Exterior glass is complete</span></label>
            <label><input checked={input.tiresAndWheelsComplete} onChange={(event) => updateBoolean("tiresAndWheelsComplete", event.target.checked, "exterior")} type="checkbox" /><span>Tires and wheels meet standard</span></label>
            <label><input checked={input.trimAndJambsComplete} onChange={(event) => updateBoolean("trimAndJambsComplete", event.target.checked, "exterior")} type="checkbox" /><span>Trim and jambs are complete</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.scope || !result.exteriorComplete || completedSteps.exterior} onClick={completeExterior} type="button">Lock exterior prep</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 3</span><h4>Complete interior preparation</h4></div><em className={completedSteps.interior ? styles.wopComplete : ""}>{completedSteps.interior ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.interiorVacuumAndExtractionComplete} onChange={(event) => updateBoolean("interiorVacuumAndExtractionComplete", event.target.checked, "interior")} type="checkbox" /><span>Vacuum and extraction are complete</span></label>
            <label><input checked={input.interiorGlassAndSurfacesComplete} onChange={(event) => updateBoolean("interiorGlassAndSurfacesComplete", event.target.checked, "interior")} type="checkbox" /><span>Interior glass and surfaces are complete</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.exterior || !result.interiorComplete || completedSteps.interior} onClick={completeInterior} type="button">Lock interior prep</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 4</span><h4>Complete specialty work</h4></div><em className={completedSteps.specialty ? styles.wopComplete : ""}>{completedSteps.specialty ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Specialty work state</span><select onChange={(event) => updateValue("specialtyState", event.target.value as SpecialtyState, "specialty")} value={input.specialtyState}><option>Not needed</option><option>Required and completed</option><option>Pending</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.odorOrSpecialConditionResolved} disabled={input.specialtyState !== "Required and completed"} onChange={(event) => updateBoolean("odorOrSpecialConditionResolved", event.target.checked, "specialty")} type="checkbox" /><span>Odor, stain, pet hair, engine bay, or specialty condition is resolved</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.interior || !result.specialtyComplete || completedSteps.specialty} onClick={completeSpecialty} type="button">Lock specialty work</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 5</span><h4>Perform detail quality check</h4></div><em className={completedSteps.qc ? styles.wopComplete : ""}>{completedSteps.qc ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.noNewDamageObserved} onChange={(event) => updateBoolean("noNewDamageObserved", event.target.checked, "qc")} type="checkbox" /><span>No new damage or missed-area issue remains</span></label>
            <label><input checked={input.presentationDefectsCleared} onChange={(event) => updateBoolean("presentationDefectsCleared", event.target.checked, "qc")} type="checkbox" /><span>No residue, wet area, odor, or presentation defect remains</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.specialty || !result.qcComplete || completedSteps.qc} onClick={completeQc} type="button">Lock detail QC</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 6</span><h4>Stage for photography</h4></div><em className={completedSteps.stage ? styles.wopComplete : ""}>{completedSteps.stage ? "Ready" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Fuel / charge state</span><select onChange={(event) => updateValue("fuelState", event.target.value as FuelState, "stage")} value={input.fuelState}><option>Ready</option><option>Needs fuel</option><option>Needs charge</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.keysReady} onChange={(event) => updateBoolean("keysReady", event.target.checked, "stage")} type="checkbox" /><span>Keys are ready for media and movement</span></label>
            <label><input checked={input.photoLocationReady} onChange={(event) => updateBoolean("photoLocationReady", event.target.checked, "stage")} type="checkbox" /><span>Photo location or staging pad is ready</span></label>
            <label><input checked={input.mediaAppointmentBooked} onChange={(event) => updateBoolean("mediaAppointmentBooked", event.target.checked, "stage")} type="checkbox" /><span>Media appointment is booked</span></label>
            <label><input checked={input.cargoAndAccessoriesVerified} onChange={(event) => updateBoolean("cargoAndAccessoriesVerified", event.target.checked, "stage")} type="checkbox" /><span>Cargo items, mats, and accessories are verified</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.qc || !result.stageComplete || completedSteps.stage} onClick={completeStage} type="button">Release to media</button>
        </section>
      </div>

      <aside className={styles.wopDecision}>
        <header><Sparkles size={18} /><div><span>Detail recommendation</span><strong>{result.recommendation}</strong></div><em className={result.recommendation === "Ready for Photos & Marketing" ? styles.wopComplete : result.recommendation === "Pass detail QC" ? styles.wopHold : ""}>{stepCount}/6</em></header>
        <dl>
          <div><dt>Controls complete</dt><dd>{stepCount}/6</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockerCount}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
          <div><dt>Specialty state</dt><dd>{input.specialtyState}</dd></div>
          <div><dt>Fuel / charge</dt><dd>{input.fuelState}</dd></div>
          <div><dt>Media slot</dt><dd>{input.mediaAppointmentBooked ? "Booked" : "Pending"}</dd></div>
        </dl>
        <p className={styles.wopExplanation}>{result.recommendation === "Ready for Photos & Marketing" ? "Detailing is complete and the vehicle is staged cleanly for merchandising." : "Detailing should remain controlled until every presentation and staging requirement is satisfied."}</p>
        <div className={styles.wopDrivers}>
          <div>
            <strong>What is working</strong>
            {(result.positiveDrivers.length ? result.positiveDrivers : ["No confirmed detail strength yet."]).map((item) => <span key={item}>{result.positiveDrivers.length ? <Check size={14} /> : <CircleAlert size={14} />}{item}</span>)}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.blockers.map((item) => <span key={item}><CircleAlert size={14} />{item}</span>)}
          </div>
        </div>
        <section className={styles.wopTrail}>
          <header><Clock3 size={18} /><h4>Operational work trail</h4></header>
          {trail.length ? <ul>{trail.map((item, index) => <li key={`${item.step}-${item.timestamp}-${index}`}><strong>{item.timestamp}</strong><span>{item.actor}</span><div>{item.result}</div><small>{item.evidence}</small></li>)}</ul> : <p>No detailing action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.wopApproval}>
      <div>
        <span><ClipboardCheck size={14} />Presentation scope</span>
        <strong>{completedSteps.scope ? "Detail scope confirmed" : "Scope still active"}</strong>
        <small>Disclosures, materials, and work location should be confirmed before cleaning begins.</small>
      </div>
      <div>
        <span><ShieldCheck size={14} />Quality and staging</span>
        <strong>{completedSteps.qc ? "Detail QC passed" : "Detail QC still active"}</strong>
        <small>The vehicle should be presentation-clean and free of obvious defects before media staging.</small>
      </div>
      <div>
        <span><BadgeCheck size={14} />Stage readiness</span>
        <strong>{completedSteps.stage ? "Ready for Photos & Marketing" : "Detailing still active"}</strong>
        <small>{completedSteps.stage ? "This unit can now hand off into the Photos & Marketing stage." : "Finish media staging before the lifecycle handoff opens."}</small>
      </div>
    </section>

    <footer className={styles.wopNotice} aria-live="polite"><CircleAlert size={14} />{notice}</footer>
  </section>;
}
