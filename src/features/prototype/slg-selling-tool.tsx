"use client";

import {
  BadgeCheck,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileText,
  Handshake,
  ShieldCheck,
  Tags,
  UserRoundCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";

export type SlgWorkflowProgress = {
  approvalsComplete: boolean;
  availabilityComplete: boolean;
  blockerCount: number;
  engagementComplete: boolean;
  offerComplete: boolean;
  recommendation: "Confirm availability" | "Manage customer engagement" | "Control test drive" | "Version offer" | "Complete approvals" | "Accept and reserve" | "Ready for Sale Titling";
  reservationComplete: boolean;
  testDriveComplete: boolean;
  trailCount: number;
};

type StepKey = "availability" | "engagement" | "testDrive" | "offer" | "approvals" | "reservation";
type TrailEntry = { actor: string; evidence: string; result: string; step: StepKey; timestamp: string };
type OfferState = "No active offer" | "Negotiating" | "Accepted";
type ApprovalState = "Pending manager review" | "Approved" | "Exception review";
type ReservationState = "Not reserved" | "Deposit received" | "Reserved for contracting";

type SellingInput = {
  appointmentOrDemoRecorded: boolean;
  buyerIdentityForTestDriveVerified: boolean;
  contractingHandoffPrepared: boolean;
  customerInquiryLinked: boolean;
  disclosuresCurrent: boolean;
  exactTermsCaptured: boolean;
  financeAndProductsCaptured: boolean;
  followUpRecorded: boolean;
  keysAndLocationReady: boolean;
  managerApprovalState: ApprovalState;
  mediaAndListingLive: boolean;
  offerState: OfferState;
  offerVersionSaved: boolean;
  priceCurrent: boolean;
  reservationExpiryRecorded: boolean;
  reservationState: ReservationState;
  returnConditionRecorded: boolean;
  testDriveOutAndBackRecorded: boolean;
  testDriveReady: boolean;
  vehiclePresentedToBuyer: boolean;
  vehicleReservedToBuyer: boolean;
};

const initialInput: SellingInput = {
  appointmentOrDemoRecorded: false,
  buyerIdentityForTestDriveVerified: false,
  contractingHandoffPrepared: false,
  customerInquiryLinked: false,
  disclosuresCurrent: false,
  exactTermsCaptured: false,
  financeAndProductsCaptured: false,
  followUpRecorded: false,
  keysAndLocationReady: false,
  managerApprovalState: "Pending manager review",
  mediaAndListingLive: false,
  offerState: "No active offer",
  offerVersionSaved: false,
  priceCurrent: false,
  reservationExpiryRecorded: false,
  reservationState: "Not reserved",
  returnConditionRecorded: false,
  testDriveOutAndBackRecorded: false,
  testDriveReady: false,
  vehiclePresentedToBuyer: false,
  vehicleReservedToBuyer: false,
};

function timeStamp() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

function evaluateSelling(input: SellingInput) {
  const availabilityComplete = input.keysAndLocationReady && input.priceCurrent && input.disclosuresCurrent && input.mediaAndListingLive && input.testDriveReady;
  const engagementComplete = input.customerInquiryLinked && input.appointmentOrDemoRecorded && input.vehiclePresentedToBuyer && input.followUpRecorded;
  const testDriveComplete = input.buyerIdentityForTestDriveVerified && input.testDriveOutAndBackRecorded && input.returnConditionRecorded;
  const offerComplete = input.offerVersionSaved && input.exactTermsCaptured && input.financeAndProductsCaptured && (input.offerState === "Negotiating" || input.offerState === "Accepted");
  const approvalsComplete = input.managerApprovalState === "Approved";
  const reservationComplete = input.offerState === "Accepted" && (input.reservationState === "Deposit received" || input.reservationState === "Reserved for contracting") && input.vehicleReservedToBuyer && input.reservationExpiryRecorded && input.contractingHandoffPrepared;

  const blockers = [
    !availabilityComplete ? "Frontline availability is still incomplete for sales presentation." : null,
    !engagementComplete ? "Customer inquiry, appointment, demo, or follow-up is still missing." : null,
    !testDriveComplete ? "Test-drive custody record is still incomplete." : null,
    !offerComplete ? "Offer terms have not yet been fully versioned." : null,
    !approvalsComplete ? "Manager approval or exception review is still open." : null,
    !reservationComplete ? "Accepted terms, reservation control, or contracting handoff is still incomplete." : null,
  ].filter((item): item is string => Boolean(item));

  const recommendation: SlgWorkflowProgress["recommendation"] =
    !availabilityComplete ? "Confirm availability"
      : !engagementComplete ? "Manage customer engagement"
        : !testDriveComplete ? "Control test drive"
          : !offerComplete ? "Version offer"
            : !approvalsComplete ? "Complete approvals"
              : !reservationComplete ? "Accept and reserve"
                : "Ready for Sale Titling";

  const positiveDrivers = [
    availabilityComplete ? "Vehicle, keys, pricing, disclosures, media, and test-drive readiness are current." : null,
    engagementComplete ? "Customer activity is linked and the selling conversation is documented." : null,
    testDriveComplete ? "Test-drive identity, route, and return custody were recorded." : null,
    offerComplete ? "Offer version, terms, and finance/product structure were preserved." : null,
    approvalsComplete ? "Manager approval is complete for the current sale version." : null,
    reservationComplete ? "Buyer terms were accepted and the vehicle is reserved for contracting handoff." : null,
  ].filter((item): item is string => Boolean(item));

  return {
    approvalsComplete,
    availabilityComplete,
    blockerCount: blockers.length,
    blockers,
    engagementComplete,
    offerComplete,
    positiveDrivers,
    recommendation,
    reservationComplete,
    testDriveComplete,
  };
}

export function SlgSellingTool({
  onProgressChange,
  onReturnToLifecycle,
}: {
  onProgressChange: (progress: SlgWorkflowProgress) => void;
  onReturnToLifecycle: () => void;
}) {
  const [input, setInput] = useState(initialInput);
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    approvals: false,
    availability: false,
    engagement: false,
    offer: false,
    reservation: false,
    testDrive: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Start Selling by confirming the exact frontline availability before customer activity and offer versioning move forward.");
  const result = useMemo(() => evaluateSelling(input), [input]);
  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  useEffect(() => {
    onProgressChange({
      approvalsComplete: completedSteps.approvals && result.approvalsComplete,
      availabilityComplete: completedSteps.availability && result.availabilityComplete,
      blockerCount: result.blockerCount,
      engagementComplete: completedSteps.engagement && result.engagementComplete,
      offerComplete: completedSteps.offer && result.offerComplete,
      recommendation: result.recommendation,
      reservationComplete: completedSteps.reservation && result.reservationComplete,
      testDriveComplete: completedSteps.testDrive && result.testDriveComplete,
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
      const order: StepKey[] = ["availability", "engagement", "testDrive", "offer", "approvals", "reservation"];
      const startIndex = order.indexOf(step);
      order.forEach((key, index) => {
        if (index >= startIndex && current[key]) {
          next[key] = false;
          reopened = true;
        }
      });
      return next;
    });
    if (reopened) appendTrail(step, "System", message, "Selling control reopened");
    setNotice(message);
  }

  function updateBoolean<K extends keyof SellingInput>(field: K, value: SellingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Selling facts changed. Reconfirm this step and every downstream commercial control.");
  }

  function updateValue<K extends keyof SellingInput>(field: K, value: SellingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Selling facts changed. Reconfirm this step and every downstream commercial control.");
  }

  function completeAvailability() {
    if (!result.availabilityComplete) return;
    setCompletedSteps((current) => ({ ...current, availability: true }));
    appendTrail("availability", "Sales coordinator", "Frontline availability, pricing, disclosures, media, and test-drive readiness were confirmed.", "Availability");
    setNotice("Availability is complete. Link the customer engagement trail next.");
  }

  function completeEngagement() {
    if (!completedSteps.availability || !result.engagementComplete) return;
    setCompletedSteps((current) => ({ ...current, engagement: true }));
    appendTrail("engagement", "Sales advisor", "Inquiry, appointment, presentation, and follow-up were linked to this vehicle.", "Activity log");
    setNotice("Customer engagement is complete. Control the test-drive custody next.");
  }

  function completeTestDrive() {
    if (!completedSteps.engagement || !result.testDriveComplete) return;
    setCompletedSteps((current) => ({ ...current, testDrive: true }));
    appendTrail("testDrive", "Sales advisor", "Buyer identity, route, return, and condition were recorded for the test drive.", "Test-drive record");
    setNotice("Test-drive custody is complete. Preserve the active offer next.");
  }

  function completeOffer() {
    if (!completedSteps.testDrive || !result.offerComplete) return;
    setCompletedSteps((current) => ({ ...current, offer: true }));
    appendTrail("offer", "Sales advisor", `Offer state set to ${input.offerState} with exact terms and finance/products captured.`, "Offer version");
    setNotice("Offer version is complete. Finish the required approvals next.");
  }

  function completeApprovals() {
    if (!completedSteps.offer || !result.approvalsComplete) return;
    setCompletedSteps((current) => ({ ...current, approvals: true }));
    appendTrail("approvals", "Sales manager", "Manager approvals and disclosures were acknowledged for the active sale version.", "Sale approval");
    setNotice("Approvals are complete. Accept terms and reserve the vehicle next.");
  }

  function completeReservation() {
    if (!completedSteps.approvals || !result.reservationComplete) return;
    setCompletedSteps((current) => ({ ...current, reservation: true }));
    appendTrail("reservation", "Sales manager", "Buyer terms were accepted, reservation was recorded, and contracting handoff was prepared.", "Accepted terms");
    setNotice("Selling is complete. The deal can now move into Sale Titling.");
  }

  return <section className={styles.wopWorkspace} aria-label="TMS Selling workspace">
    <header className={styles.wopHeader}>
      <div>
        <span><Handshake size={15} />TMS Selling</span>
        <h3>SLG governed sales workspace</h3>
        <p>Guide the staff through frontline availability, customer engagement, test-drive custody, offer versioning, approvals, and exact reservation control.</p>
        <div className={styles.wopHeaderActions}>
          <button className={`${styles.wopHeaderLink} ${styles.wopHeaderButton}`} onClick={onReturnToLifecycle} type="button"><FileText size={14} />Return to lifecycle</button>
        </div>
      </div>
      <div className={styles.wopVersion}>
        <small>Sale state</small>
        <strong>{result.recommendation}</strong>
      </div>
    </header>

    <div className={styles.wopBody}>
      <div className={styles.wopSteps}>
        <section className={styles.wopStepCard}>
          <header><div><span>Step 1</span><h4>Confirm frontline availability</h4></div><em className={completedSteps.availability ? styles.wopComplete : ""}>{completedSteps.availability ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.keysAndLocationReady} onChange={(event) => updateBoolean("keysAndLocationReady", event.target.checked, "availability")} type="checkbox" /><span>Vehicle, keys, and exact location are ready</span></label>
            <label><input checked={input.priceCurrent} onChange={(event) => updateBoolean("priceCurrent", event.target.checked, "availability")} type="checkbox" /><span>Frontline price is current</span></label>
            <label><input checked={input.disclosuresCurrent} onChange={(event) => updateBoolean("disclosuresCurrent", event.target.checked, "availability")} type="checkbox" /><span>Required disclosures are current</span></label>
            <label><input checked={input.mediaAndListingLive} onChange={(event) => updateBoolean("mediaAndListingLive", event.target.checked, "availability")} type="checkbox" /><span>Media and listing package are live</span></label>
            <label><input checked={input.testDriveReady} onChange={(event) => updateBoolean("testDriveReady", event.target.checked, "availability")} type="checkbox" /><span>Vehicle is ready for test drive</span></label>
          </div>
          <button className={styles.wopAction} disabled={!result.availabilityComplete || completedSteps.availability} onClick={completeAvailability} type="button">Lock availability</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 2</span><h4>Manage customer engagement</h4></div><em className={completedSteps.engagement ? styles.wopComplete : ""}>{completedSteps.engagement ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.customerInquiryLinked} onChange={(event) => updateBoolean("customerInquiryLinked", event.target.checked, "engagement")} type="checkbox" /><span>Customer inquiry is linked to this vehicle</span></label>
            <label><input checked={input.appointmentOrDemoRecorded} onChange={(event) => updateBoolean("appointmentOrDemoRecorded", event.target.checked, "engagement")} type="checkbox" /><span>Appointment or demo was recorded</span></label>
            <label><input checked={input.vehiclePresentedToBuyer} onChange={(event) => updateBoolean("vehiclePresentedToBuyer", event.target.checked, "engagement")} type="checkbox" /><span>Vehicle presentation was completed</span></label>
            <label><input checked={input.followUpRecorded} onChange={(event) => updateBoolean("followUpRecorded", event.target.checked, "engagement")} type="checkbox" /><span>Follow-up activity was recorded</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.availability || !result.engagementComplete || completedSteps.engagement} onClick={completeEngagement} type="button">Lock engagement trail</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 3</span><h4>Control test-drive custody</h4></div><em className={completedSteps.testDrive ? styles.wopComplete : ""}>{completedSteps.testDrive ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.buyerIdentityForTestDriveVerified} onChange={(event) => updateBoolean("buyerIdentityForTestDriveVerified", event.target.checked, "testDrive")} type="checkbox" /><span>Buyer identity and insurance were verified</span></label>
            <label><input checked={input.testDriveOutAndBackRecorded} onChange={(event) => updateBoolean("testDriveOutAndBackRecorded", event.target.checked, "testDrive")} type="checkbox" /><span>Test-drive route, time out, and return were recorded</span></label>
            <label><input checked={input.returnConditionRecorded} onChange={(event) => updateBoolean("returnConditionRecorded", event.target.checked, "testDrive")} type="checkbox" /><span>Return condition was recorded on vehicle return</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.engagement || !result.testDriveComplete || completedSteps.testDrive} onClick={completeTestDrive} type="button">Lock test-drive custody</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 4</span><h4>Version the offer</h4></div><em className={completedSteps.offer ? styles.wopComplete : ""}>{completedSteps.offer ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Offer state</span><select onChange={(event) => updateValue("offerState", event.target.value as OfferState, "offer")} value={input.offerState}><option>No active offer</option><option>Negotiating</option><option>Accepted</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.offerVersionSaved} onChange={(event) => updateBoolean("offerVersionSaved", event.target.checked, "offer")} type="checkbox" /><span>Offer version was saved</span></label>
            <label><input checked={input.exactTermsCaptured} onChange={(event) => updateBoolean("exactTermsCaptured", event.target.checked, "offer")} type="checkbox" /><span>Price, trade, taxes, fees, and conditions were captured</span></label>
            <label><input checked={input.financeAndProductsCaptured} onChange={(event) => updateBoolean("financeAndProductsCaptured", event.target.checked, "offer")} type="checkbox" /><span>Finance and product structure were captured</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.testDrive || !result.offerComplete || completedSteps.offer} onClick={completeOffer} type="button"><Tags size={14} />Lock offer version</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 5</span><h4>Complete disclosures and approvals</h4></div><em className={completedSteps.approvals ? styles.wopComplete : ""}>{completedSteps.approvals ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Approval state</span><select onChange={(event) => updateValue("managerApprovalState", event.target.value as ApprovalState, "approvals")} value={input.managerApprovalState}><option>Pending manager review</option><option>Approved</option><option>Exception review</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.disclosuresCurrent} onChange={(event) => updateBoolean("disclosuresCurrent", event.target.checked, "approvals")} type="checkbox" /><span>Vehicle, condition, warranty, and recall disclosures are acknowledged</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.offer || !result.approvalsComplete || completedSteps.approvals} onClick={completeApprovals} type="button">Lock approvals</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 6</span><h4>Accept and reserve the vehicle</h4></div><em className={completedSteps.reservation ? styles.wopComplete : ""}>{completedSteps.reservation ? "Accepted" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Reservation state</span><select onChange={(event) => updateValue("reservationState", event.target.value as ReservationState, "reservation")} value={input.reservationState}><option>Not reserved</option><option>Deposit received</option><option>Reserved for contracting</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.vehicleReservedToBuyer} onChange={(event) => updateBoolean("vehicleReservedToBuyer", event.target.checked, "reservation")} type="checkbox" /><span>Vehicle is reserved to the buyer</span></label>
            <label><input checked={input.reservationExpiryRecorded} onChange={(event) => updateBoolean("reservationExpiryRecorded", event.target.checked, "reservation")} type="checkbox" /><span>Reservation expiration was recorded</span></label>
            <label><input checked={input.contractingHandoffPrepared} onChange={(event) => updateBoolean("contractingHandoffPrepared", event.target.checked, "reservation")} type="checkbox" /><span>Contracting handoff package is prepared</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.approvals || !result.reservationComplete || completedSteps.reservation} onClick={completeReservation} type="button"><UserRoundCheck size={14} />Lock accepted terms</button>
        </section>
      </div>

      <aside className={styles.wopDecision}>
        <header><Handshake size={18} /><div><span>Selling recommendation</span><strong>{result.recommendation}</strong></div><em className={result.recommendation === "Ready for Sale Titling" ? styles.wopComplete : result.recommendation === "Complete approvals" ? styles.wopHold : ""}>{stepCount}/6</em></header>
        <dl>
          <div><dt>Controls complete</dt><dd>{stepCount}/6</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockerCount}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
          <div><dt>Offer state</dt><dd>{input.offerState}</dd></div>
          <div><dt>Approval state</dt><dd>{input.managerApprovalState}</dd></div>
          <div><dt>Reservation state</dt><dd>{input.reservationState}</dd></div>
        </dl>
        <p className={styles.wopExplanation}>{result.recommendation === "Ready for Sale Titling" ? "Selling is complete. Accepted terms, approvals, and reservation controls are ready to hand off into Sale Titling." : "Selling should remain governed until the exact commercial blocker is cleared and the accepted terms are fully controlled."}</p>
        <div className={styles.wopDrivers}>
          <div>
            <strong>What is working</strong>
            {(result.positiveDrivers.length ? result.positiveDrivers : ["No confirmed selling strength yet."]).map((item) => <span key={item}>{result.positiveDrivers.length ? <Check size={14} /> : <CircleAlert size={14} />}{item}</span>)}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.blockers.map((item) => <span key={item}><CircleAlert size={14} />{item}</span>)}
          </div>
        </div>
        <section className={styles.wopTrail}>
          <header><Clock3 size={18} /><h4>Operational work trail</h4></header>
          {trail.length ? <ul>{trail.map((item, index) => <li key={`${item.step}-${item.timestamp}-${index}`}><strong>{item.timestamp}</strong><span>{item.actor}</span><div>{item.result}</div><small>{item.evidence}</small></li>)}</ul> : <p>No selling action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.wopApproval}>
      <div>
        <span><ClipboardCheck size={14} />Customer activity</span>
        <strong>{completedSteps.engagement ? "Buyer engagement controlled" : "Engagement still active"}</strong>
        <small>Inquiry, appointment, demonstration, and test-drive custody should all be explicit before negotiation advances.</small>
      </div>
      <div>
        <span><ShieldCheck size={14} />Commercial authority</span>
        <strong>{completedSteps.approvals ? "Approvals complete" : "Approvals still active"}</strong>
        <small>Offer version, disclosures, and manager approval should be locked before reservation opens.</small>
      </div>
      <div>
        <span><BadgeCheck size={14} />Stage readiness</span>
        <strong>{completedSteps.reservation ? "Ready for Sale Titling" : "Selling still active"}</strong>
        <small>{completedSteps.reservation ? "This unit can now hand off into the Sale Titling stage." : "Finish accepted terms and reservation control before the lifecycle handoff opens."}</small>
      </div>
    </section>

    <footer className={styles.wopNotice} aria-live="polite"><CircleAlert size={14} />{notice}</footer>
  </section>;
}
