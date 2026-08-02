"use client";

import {
  BadgeCheck,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileBadge2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";

export type TlrWorkflowProgress = {
  blockerCount: number;
  brandLienComplete: boolean;
  custodyComplete: boolean;
  decisionComplete: boolean;
  identityComplete: boolean;
  odometerComplete: boolean;
  ownershipComplete: boolean;
  recommendation: "Match title identity" | "Verify ownership chain" | "Clear lien and brand status" | "Verify odometer compliance" | "Confirm title control" | "Issue readiness decision" | "Ready for Selling";
  trailCount: number;
};

type StepKey = "identity" | "ownership" | "brand" | "odometer" | "custody" | "decision";
type TrailEntry = { actor: string; evidence: string; result: string; step: StepKey; timestamp: string };
type BrandState = "Clear" | "Disclosure required" | "Open issue";
type LienState = "Released" | "Electronic title pending" | "Open lien issue";
type ReadinessDecision = "Title ready" | "Conditional disclosure" | "Hold";

type TitleInput = {
  assignmentsAndPoaComplete: boolean;
  billOfSaleAndSellerDocsComplete: boolean;
  brandState: BrandState;
  currentCustodianRecorded: boolean;
  identityFieldsMatch: boolean;
  lienState: LienState;
  odometerDisclosureRecorded: boolean;
  titleLocationRecorded: boolean;
  titlePackageReviewed: boolean;
  titleReceivedOrExpectedDateKnown: boolean;
  transferChainVerified: boolean;
  vinOwnerJurisdictionMatch: boolean;
  mileageStatusAccurate: boolean;
  readinessDecision: ReadinessDecision;
  readinessNotesRecorded: boolean;
};

const initialInput: TitleInput = {
  assignmentsAndPoaComplete: false,
  billOfSaleAndSellerDocsComplete: false,
  brandState: "Open issue",
  currentCustodianRecorded: false,
  identityFieldsMatch: false,
  lienState: "Open lien issue",
  mileageStatusAccurate: false,
  odometerDisclosureRecorded: false,
  readinessDecision: "Hold",
  readinessNotesRecorded: false,
  titleLocationRecorded: false,
  titlePackageReviewed: false,
  titleReceivedOrExpectedDateKnown: false,
  transferChainVerified: false,
  vinOwnerJurisdictionMatch: false,
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

function evaluateTitle(input: TitleInput) {
  const identityComplete = input.identityFieldsMatch && input.vinOwnerJurisdictionMatch && input.titlePackageReviewed;
  const ownershipComplete = input.assignmentsAndPoaComplete && input.billOfSaleAndSellerDocsComplete && input.transferChainVerified;
  const brandLienComplete = (input.brandState === "Clear" || input.brandState === "Disclosure required") && (input.lienState === "Released" || input.lienState === "Electronic title pending");
  const odometerComplete = input.mileageStatusAccurate && input.odometerDisclosureRecorded;
  const custodyComplete = input.titleLocationRecorded && input.currentCustodianRecorded && input.titleReceivedOrExpectedDateKnown;
  const decisionComplete = input.readinessNotesRecorded && (
    (input.readinessDecision === "Title ready" && identityComplete && ownershipComplete && brandLienComplete && odometerComplete && custodyComplete)
    || input.readinessDecision === "Conditional disclosure"
    || input.readinessDecision === "Hold"
  );

  const blockers = [
    !identityComplete ? "Title identity does not yet fully match VIN, owner, or jurisdiction records." : null,
    !ownershipComplete ? "Ownership chain, assignments, or seller transfer documents are still incomplete." : null,
    !brandLienComplete ? "Lien release, electronic title, brand, or correction issue is still open." : null,
    !odometerComplete ? "Mileage status or odometer disclosure is still incomplete." : null,
    !custodyComplete ? "Title location, custodian, or received-date control is still incomplete." : null,
    !decisionComplete ? "Title readiness decision has not yet been fully issued." : null,
  ].filter((item): item is string => Boolean(item));

  const recommendation: TlrWorkflowProgress["recommendation"] =
    !identityComplete ? "Match title identity"
      : !ownershipComplete ? "Verify ownership chain"
        : !brandLienComplete ? "Clear lien and brand status"
          : !odometerComplete ? "Verify odometer compliance"
            : !custodyComplete ? "Confirm title control"
              : !decisionComplete ? "Issue readiness decision"
                : "Ready for Selling";

  const positiveDrivers = [
    identityComplete ? "Title identity, VIN, owner, and jurisdiction records agree." : null,
    ownershipComplete ? "Ownership chain and seller transfer package are complete." : null,
    brandLienComplete ? "Brand and lien state are controlled for sale readiness." : null,
    odometerComplete ? "Mileage and odometer disclosure controls are complete." : null,
    custodyComplete ? "Title location, custodian, and receipt expectation are controlled." : null,
    decisionComplete ? `Title readiness decision recorded as ${input.readinessDecision}.` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    blockerCount: blockers.length,
    blockers,
    brandLienComplete,
    custodyComplete,
    decisionComplete,
    identityComplete,
    odometerComplete,
    ownershipComplete,
    positiveDrivers,
    recommendation,
  };
}

export function TlrTitleReadinessTool({ onProgressChange }: { onProgressChange: (progress: TlrWorkflowProgress) => void }) {
  const [input, setInput] = useState(initialInput);
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    brand: false,
    custody: false,
    decision: false,
    identity: false,
    odometer: false,
    ownership: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Start Title Readiness by matching the title identity against the vehicle, seller, and jurisdiction record before release decisions are made.");
  const result = useMemo(() => evaluateTitle(input), [input]);

  useEffect(() => {
    onProgressChange({
      blockerCount: result.blockerCount,
      brandLienComplete: completedSteps.brand && result.brandLienComplete,
      custodyComplete: completedSteps.custody && result.custodyComplete,
      decisionComplete: completedSteps.decision && result.decisionComplete,
      identityComplete: completedSteps.identity && result.identityComplete,
      odometerComplete: completedSteps.odometer && result.odometerComplete,
      ownershipComplete: completedSteps.ownership && result.ownershipComplete,
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
      const order: StepKey[] = ["identity", "ownership", "brand", "odometer", "custody", "decision"];
      const startIndex = order.indexOf(step);
      order.forEach((key, index) => {
        if (index >= startIndex && current[key]) {
          next[key] = false;
          reopened = true;
        }
      });
      return next;
    });
    if (reopened) appendTrail(step, "System", message, "Title control reopened");
    setNotice(message);
  }

  function updateBoolean<K extends keyof TitleInput>(field: K, value: TitleInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Title facts changed. Reconfirm this step and every downstream legal-readiness control.");
  }

  function updateValue<K extends keyof TitleInput>(field: K, value: TitleInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Title facts changed. Reconfirm this step and every downstream legal-readiness control.");
  }

  function completeIdentity() {
    if (!result.identityComplete) return;
    setCompletedSteps((current) => ({ ...current, identity: true }));
    appendTrail("identity", "Title specialist", "VIN, owner, jurisdiction, and title identity fields were matched and reviewed.", "Identity match");
    setNotice("Title identity is complete. Verify the ownership chain next.");
  }
  function completeOwnership() {
    if (!completedSteps.identity || !result.ownershipComplete) return;
    setCompletedSteps((current) => ({ ...current, ownership: true }));
    appendTrail("ownership", "Title specialist", "Assignments, POA, bill of sale, and transfer chain were confirmed.", "Chain review");
    setNotice("Ownership chain is complete. Clear lien and brand status next.");
  }
  function completeBrand() {
    if (!completedSteps.ownership || !result.brandLienComplete) return;
    setCompletedSteps((current) => ({ ...current, brand: true }));
    appendTrail("brand", "Title specialist", "Lien, electronic title, and brand status were controlled for sale-readiness.", "Lien and brand proof");
    setNotice("Lien and brand status are complete. Verify odometer compliance next.");
  }
  function completeOdometer() {
    if (!completedSteps.brand || !result.odometerComplete) return;
    setCompletedSteps((current) => ({ ...current, odometer: true }));
    appendTrail("odometer", "Title specialist", "Mileage status and odometer disclosure were verified.", "Odometer record");
    setNotice("Odometer compliance is complete. Confirm title control and custody next.");
  }
  function completeCustody() {
    if (!completedSteps.odometer || !result.custodyComplete) return;
    setCompletedSteps((current) => ({ ...current, custody: true }));
    appendTrail("custody", "Title specialist", "Title location, custodian, and receipt expectation were recorded.", "Custody record");
    setNotice("Title control is complete. Issue the legal sale-readiness decision next.");
  }
  function completeDecision() {
    if (!completedSteps.custody || !result.decisionComplete) return;
    setCompletedSteps((current) => ({ ...current, decision: true }));
    appendTrail("decision", "Title manager", `Title readiness decision recorded as ${input.readinessDecision}.`, "Readiness release");
    setNotice(input.readinessDecision === "Title ready" ? "Title Readiness is complete. The vehicle can now move into Selling." : "Title readiness decision recorded. The unit remains governed by the issued decision.");
  }

  const lifecycleHref = `/vehicles/inventory/prototype`;
  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  return <section className={styles.wopWorkspace} aria-label="TMS Title Readiness workspace">
    <header className={styles.wopHeader}>
      <div>
        <span><FileBadge2 size={15} />TMS Title Readiness</span>
        <h3>TLR legal-readiness workspace</h3>
        <p>Guide the title team through identity, ownership chain, lien and brand status, odometer compliance, custody control, and final sale-readiness release.</p>
        <div className={styles.wopHeaderActions}>
          <Link className={styles.wopHeaderLink} href={lifecycleHref}><FileText size={14} />Return to lifecycle</Link>
        </div>
      </div>
      <div className={styles.wopVersion}>
        <small>Title state</small>
        <strong>{result.recommendation}</strong>
      </div>
    </header>

    <div className={styles.wopBody}>
      <div className={styles.wopSteps}>
        <section className={styles.wopStepCard}>
          <header><div><span>Step 1</span><h4>Match title identity</h4></div><em className={completedSteps.identity ? styles.wopComplete : ""}>{completedSteps.identity ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.identityFieldsMatch} onChange={(event) => updateBoolean("identityFieldsMatch", event.target.checked, "identity")} type="checkbox" /><span>Title identity fields match the vehicle record</span></label>
            <label><input checked={input.vinOwnerJurisdictionMatch} onChange={(event) => updateBoolean("vinOwnerJurisdictionMatch", event.target.checked, "identity")} type="checkbox" /><span>VIN, owner, and jurisdiction records agree</span></label>
            <label><input checked={input.titlePackageReviewed} onChange={(event) => updateBoolean("titlePackageReviewed", event.target.checked, "identity")} type="checkbox" /><span>Title packet was reviewed for identity accuracy</span></label>
          </div>
          <button className={styles.wopAction} disabled={!result.identityComplete || completedSteps.identity} onClick={completeIdentity} type="button">Lock identity match</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 2</span><h4>Verify ownership chain</h4></div><em className={completedSteps.ownership ? styles.wopComplete : ""}>{completedSteps.ownership ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.assignmentsAndPoaComplete} onChange={(event) => updateBoolean("assignmentsAndPoaComplete", event.target.checked, "ownership")} type="checkbox" /><span>Assignments and powers of attorney are complete</span></label>
            <label><input checked={input.billOfSaleAndSellerDocsComplete} onChange={(event) => updateBoolean("billOfSaleAndSellerDocsComplete", event.target.checked, "ownership")} type="checkbox" /><span>Bill of sale and seller documents are complete</span></label>
            <label><input checked={input.transferChainVerified} onChange={(event) => updateBoolean("transferChainVerified", event.target.checked, "ownership")} type="checkbox" /><span>Transfer chain was verified end to end</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.identity || !result.ownershipComplete || completedSteps.ownership} onClick={completeOwnership} type="button">Lock ownership chain</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 3</span><h4>Clear lien and brand status</h4></div><em className={completedSteps.brand ? styles.wopComplete : ""}>{completedSteps.brand ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Brand state</span><select onChange={(event) => updateValue("brandState", event.target.value as BrandState, "brand")} value={input.brandState}><option>Clear</option><option>Disclosure required</option><option>Open issue</option></select></label>
            <label><span>Lien state</span><select onChange={(event) => updateValue("lienState", event.target.value as LienState, "brand")} value={input.lienState}><option>Released</option><option>Electronic title pending</option><option>Open lien issue</option></select></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.ownership || !result.brandLienComplete || completedSteps.brand} onClick={completeBrand} type="button">Lock lien and brand status</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 4</span><h4>Verify odometer compliance</h4></div><em className={completedSteps.odometer ? styles.wopComplete : ""}>{completedSteps.odometer ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.mileageStatusAccurate} onChange={(event) => updateBoolean("mileageStatusAccurate", event.target.checked, "odometer")} type="checkbox" /><span>Mileage status is accurate</span></label>
            <label><input checked={input.odometerDisclosureRecorded} onChange={(event) => updateBoolean("odometerDisclosureRecorded", event.target.checked, "odometer")} type="checkbox" /><span>Required odometer disclosure is recorded</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.brand || !result.odometerComplete || completedSteps.odometer} onClick={completeOdometer} type="button">Lock odometer compliance</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 5</span><h4>Confirm title location and control</h4></div><em className={completedSteps.custody ? styles.wopComplete : ""}>{completedSteps.custody ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.titleLocationRecorded} onChange={(event) => updateBoolean("titleLocationRecorded", event.target.checked, "custody")} type="checkbox" /><span>Title location is recorded</span></label>
            <label><input checked={input.currentCustodianRecorded} onChange={(event) => updateBoolean("currentCustodianRecorded", event.target.checked, "custody")} type="checkbox" /><span>Current custodian is recorded</span></label>
            <label><input checked={input.titleReceivedOrExpectedDateKnown} onChange={(event) => updateBoolean("titleReceivedOrExpectedDateKnown", event.target.checked, "custody")} type="checkbox" /><span>Title received date or expected date is known</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.odometer || !result.custodyComplete || completedSteps.custody} onClick={completeCustody} type="button">Lock title control</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 6</span><h4>Issue the sale-readiness decision</h4></div><em className={completedSteps.decision ? styles.wopComplete : ""}>{completedSteps.decision ? "Issued" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Readiness decision</span><select onChange={(event) => updateValue("readinessDecision", event.target.value as ReadinessDecision, "decision")} value={input.readinessDecision}><option>Title ready</option><option>Conditional disclosure</option><option>Hold</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.readinessNotesRecorded} onChange={(event) => updateBoolean("readinessNotesRecorded", event.target.checked, "decision")} type="checkbox" /><span>Decision notes and rationale were recorded</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.custody || !result.decisionComplete || completedSteps.decision} onClick={completeDecision} type="button">Issue title decision</button>
        </section>
      </div>

      <aside className={styles.wopDecision}>
        <header><FileBadge2 size={18} /><div><span>Title recommendation</span><strong>{result.recommendation}</strong></div><em className={result.recommendation === "Ready for Selling" ? styles.wopComplete : result.recommendation === "Issue readiness decision" ? styles.wopHold : ""}>{stepCount}/6</em></header>
        <dl>
          <div><dt>Controls complete</dt><dd>{stepCount}/6</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockerCount}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
          <div><dt>Brand state</dt><dd>{input.brandState}</dd></div>
          <div><dt>Lien state</dt><dd>{input.lienState}</dd></div>
          <div><dt>Readiness decision</dt><dd>{input.readinessDecision}</dd></div>
        </dl>
        <p className={styles.wopExplanation}>{result.recommendation === "Ready for Selling" ? "Title Readiness is complete and the vehicle can now move into the Selling stage." : "Title readiness should remain fail-closed until the exact legal-readiness blocker is resolved."}</p>
        <div className={styles.wopDrivers}>
          <div>
            <strong>What is working</strong>
            {(result.positiveDrivers.length ? result.positiveDrivers : ["No confirmed title-readiness strength yet."]).map((item) => <span key={item}>{result.positiveDrivers.length ? <Check size={14} /> : <CircleAlert size={14} />}{item}</span>)}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.blockers.map((item) => <span key={item}><CircleAlert size={14} />{item}</span>)}
          </div>
        </div>
        <section className={styles.wopTrail}>
          <header><Clock3 size={18} /><h4>Operational work trail</h4></header>
          {trail.length ? <ul>{trail.map((item, index) => <li key={`${item.step}-${item.timestamp}-${index}`}><strong>{item.timestamp}</strong><span>{item.actor}</span><div>{item.result}</div><small>{item.evidence}</small></li>)}</ul> : <p>No title-readiness action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.wopApproval}>
      <div>
        <span><ClipboardCheck size={14} />Identity and chain</span>
        <strong>{completedSteps.ownership ? "Ownership chain confirmed" : "Identity or chain still active"}</strong>
        <small>VIN, ownership chain, and seller transfer package should be complete before sale-readiness is considered.</small>
      </div>
      <div>
        <span><ShieldCheck size={14} />Legal control</span>
        <strong>{completedSteps.custody ? "Title control confirmed" : "Title control still active"}</strong>
        <small>Title location, custodian, lien/brand state, and odometer controls should be explicit.</small>
      </div>
      <div>
        <span><BadgeCheck size={14} />Stage readiness</span>
        <strong>{completedSteps.decision && input.readinessDecision === "Title ready" ? "Ready for Selling" : "Title Readiness still active"}</strong>
        <small>{completedSteps.decision && input.readinessDecision === "Title ready" ? "This unit can now hand off into the Selling stage." : "Finish the legal-readiness decision before the lifecycle handoff opens."}</small>
      </div>
    </section>

    <footer className={styles.wopNotice} aria-live="polite"><CircleAlert size={14} />{notice}</footer>
  </section>;
}
