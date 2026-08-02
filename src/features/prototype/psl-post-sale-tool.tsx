"use client";

import {
  BadgeCheck,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileText,
  HandCoins,
  ShieldCheck,
  SmilePlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";

export type PslWorkflowProgress = {
  blockerCount: number;
  closureComplete: boolean;
  deliveryComplete: boolean;
  fundingComplete: boolean;
  recommendation: "Confirm delivery" | "Close promises" | "Verify funding" | "Track title" | "Manage concerns" | "Verify closure" | "Lifecycle complete";
  titleComplete: boolean;
  trailCount: number;
  warrantyComplete: boolean;
  weOweComplete: boolean;
};

type StepKey = "delivery" | "promises" | "funding" | "title" | "concerns" | "closure";
type TrailEntry = { actor: string; evidence: string; result: string; step: StepKey; timestamp: string };
type TitleFollowUpState = "Pending" | "In progress" | "Completed";
type ConcernState = "No active case" | "Active case" | "Resolved";
type LifecycleState = "Open obligations" | "Ready to close" | "Closed";

type PostSaleInput = {
  customerAcceptanceRecorded: boolean;
  deliveryConditionRecorded: boolean;
  titleFollowUpState: TitleFollowUpState;
  fundingVerified: boolean;
  tradePayoffVerified: boolean;
  warrantyConcernState: ConcernState;
  warrantyOrConcernOwnerAssigned: boolean;
  promisedItemsCompleted: boolean;
  dueBillAppointmentsCompleted: boolean;
  titleRegistrationUpdatesComplete: boolean;
  platesOrRegistrationDelivered: boolean;
  vehicleOrientationCompleted: boolean;
  keysAndDocumentsDelivered: boolean;
  unresolvedObligationOwnerRecorded: boolean;
  lifecycleState: LifecycleState;
  finalOutcomeRecorded: boolean;
};

const initialInput: PostSaleInput = {
  customerAcceptanceRecorded: false,
  deliveryConditionRecorded: false,
  dueBillAppointmentsCompleted: false,
  finalOutcomeRecorded: false,
  fundingVerified: false,
  keysAndDocumentsDelivered: false,
  lifecycleState: "Open obligations",
  platesOrRegistrationDelivered: false,
  promisedItemsCompleted: false,
  titleFollowUpState: "Pending",
  titleRegistrationUpdatesComplete: false,
  tradePayoffVerified: false,
  unresolvedObligationOwnerRecorded: false,
  vehicleOrientationCompleted: false,
  warrantyConcernState: "No active case",
  warrantyOrConcernOwnerAssigned: false,
};

function timeStamp() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

function evaluatePostSale(input: PostSaleInput) {
  const deliveryComplete = input.keysAndDocumentsDelivered && input.deliveryConditionRecorded && input.vehicleOrientationCompleted && input.customerAcceptanceRecorded;
  const weOweComplete = input.promisedItemsCompleted && input.dueBillAppointmentsCompleted;
  const fundingComplete = input.fundingVerified && input.tradePayoffVerified;
  const titleComplete = input.titleFollowUpState === "Completed" && input.titleRegistrationUpdatesComplete && input.platesOrRegistrationDelivered;
  const warrantyComplete = (input.warrantyConcernState === "No active case" || input.warrantyConcernState === "Resolved") && input.warrantyOrConcernOwnerAssigned;
  const closureComplete = input.lifecycleState === "Closed" && input.finalOutcomeRecorded && input.unresolvedObligationOwnerRecorded;

  const blockers = [
    !deliveryComplete ? "Delivery acceptance, condition, keys, documents, or orientation is still incomplete." : null,
    !weOweComplete ? "Promised items or due-bill commitments are still open." : null,
    !fundingComplete ? "Funding or trade-payoff reconciliation is still incomplete." : null,
    !titleComplete ? "Title, registration, or plate follow-up is still incomplete." : null,
    !warrantyComplete ? "Warranty, comeback, or customer-concern follow-up is still incomplete." : null,
    !closureComplete ? "Final outcome recording or lifecycle closure control is still incomplete." : null,
  ].filter((item): item is string => Boolean(item));

  const recommendation: PslWorkflowProgress["recommendation"] =
    !deliveryComplete ? "Confirm delivery"
      : !weOweComplete ? "Close promises"
        : !fundingComplete ? "Verify funding"
          : !titleComplete ? "Track title"
            : !warrantyComplete ? "Manage concerns"
              : !closureComplete ? "Verify closure"
                : "Lifecycle complete";

  const positiveDrivers = [
    deliveryComplete ? "Delivery, condition, orientation, keys, documents, and customer acceptance are complete." : null,
    weOweComplete ? "Promised items and due-bill commitments are closed." : null,
    fundingComplete ? "Funding and trade payoff are reconciled." : null,
    titleComplete ? "Title, registration, and plate follow-up reached completion." : null,
    warrantyComplete ? `Customer-care and warranty state is ${input.warrantyConcernState.toLowerCase()}.` : null,
    closureComplete ? "Every remaining obligation is closed or explicitly governed, and the lifecycle outcome is recorded." : null,
  ].filter((item): item is string => Boolean(item));

  return {
    blockerCount: blockers.length,
    blockers,
    closureComplete,
    deliveryComplete,
    fundingComplete,
    positiveDrivers,
    recommendation,
    titleComplete,
    warrantyComplete,
    weOweComplete,
  };
}

export function PslPostSaleTool({
  onProgressChange,
  onReturnToLifecycle,
}: {
  onProgressChange: (progress: PslWorkflowProgress) => void;
  onReturnToLifecycle: () => void;
}) {
  const [input, setInput] = useState(initialInput);
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    closure: false,
    concerns: false,
    delivery: false,
    funding: false,
    promises: false,
    title: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Start Post-Sale by confirming completed delivery, acceptance, and customer handoff before follow-up obligations are closed.");
  const result = useMemo(() => evaluatePostSale(input), [input]);
  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  useEffect(() => {
    onProgressChange({
      blockerCount: result.blockerCount,
      closureComplete: completedSteps.closure && result.closureComplete,
      deliveryComplete: completedSteps.delivery && result.deliveryComplete,
      fundingComplete: completedSteps.funding && result.fundingComplete,
      recommendation: result.recommendation,
      titleComplete: completedSteps.title && result.titleComplete,
      trailCount: trail.length,
      warrantyComplete: completedSteps.concerns && result.warrantyComplete,
      weOweComplete: completedSteps.promises && result.weOweComplete,
    });
  }, [completedSteps, onProgressChange, result, trail.length]);

  function appendTrail(step: StepKey, actor: string, resultText: string, evidence: string) {
    setTrail((current) => [{ actor, evidence, result: resultText, step, timestamp: timeStamp() }, ...current]);
  }

  function invalidateFrom(step: StepKey, message: string) {
    let reopened = false;
    setCompletedSteps((current) => {
      const next = { ...current };
      const order: StepKey[] = ["delivery", "promises", "funding", "title", "concerns", "closure"];
      const startIndex = order.indexOf(step);
      order.forEach((key, index) => {
        if (index >= startIndex && current[key]) {
          next[key] = false;
          reopened = true;
        }
      });
      return next;
    });
    if (reopened) appendTrail(step, "System", message, "Post-sale control reopened");
    setNotice(message);
  }

  function updateBoolean<K extends keyof PostSaleInput>(field: K, value: PostSaleInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Post-sale facts changed. Reconfirm this step and every downstream outcome-control gate.");
  }

  function updateValue<K extends keyof PostSaleInput>(field: K, value: PostSaleInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Post-sale facts changed. Reconfirm this step and every downstream outcome-control gate.");
  }

  function completeDelivery() {
    if (!result.deliveryComplete) return;
    setCompletedSteps((current) => ({ ...current, delivery: true }));
    appendTrail("delivery", "Delivery specialist", "Vehicle delivery, condition, orientation, keys, documents, and customer acceptance were recorded.", "Delivery proof");
    setNotice("Delivery is complete. Close promises and due-bill obligations next.");
  }

  function completePromises() {
    if (!completedSteps.delivery || !result.weOweComplete) return;
    setCompletedSteps((current) => ({ ...current, promises: true }));
    appendTrail("promises", "Coordinator", "Promised items and due-bill commitments were completed.", "Promise closure");
    setNotice("Promise closure is complete. Reconcile funding and payoff next.");
  }

  function completeFunding() {
    if (!completedSteps.promises || !result.fundingComplete) return;
    setCompletedSteps((current) => ({ ...current, funding: true }));
    appendTrail("funding", "Finance", "Funding and trade payoff were verified and reconciled.", "Funding proof");
    setNotice("Funding is complete. Finish title and registration follow-up next.");
  }

  function completeTitle() {
    if (!completedSteps.funding || !result.titleComplete) return;
    setCompletedSteps((current) => ({ ...current, title: true }));
    appendTrail("title", "Title specialist", "Title, registration, and plate follow-up reached completion.", "Title completion");
    setNotice("Title follow-up is complete. Close any customer concerns next.");
  }

  function completeConcerns() {
    if (!completedSteps.title || !result.warrantyComplete) return;
    setCompletedSteps((current) => ({ ...current, concerns: true }));
    appendTrail("concerns", "Customer care", `Warranty and customer-care state recorded as ${input.warrantyConcernState.toLowerCase()}.`, "Case record");
    setNotice("Customer-care follow-up is complete. Verify the final lifecycle outcome next.");
  }

  function completeClosure() {
    if (!completedSteps.concerns || !result.closureComplete) return;
    setCompletedSteps((current) => ({ ...current, closure: true }));
    appendTrail("closure", "Operations manager", "Final lifecycle outcome was verified and post-sale obligations were closed.", "Closure approval");
    setNotice("Post-Sale is complete. The lifecycle journey is fully closed.");
  }

  return <section className={styles.wopWorkspace} aria-label="TMS Post-Sale workspace">
    <header className={styles.wopHeader}>
      <div>
        <span><SmilePlus size={15} />TMS Post-Sale</span>
        <h3>PSL outcome workspace</h3>
        <p>Guide the team through delivery acceptance, promise closure, funding, title follow-up, customer care, and final lifecycle outcome verification.</p>
        <div className={styles.wopHeaderActions}>
          <button className={`${styles.wopHeaderLink} ${styles.wopHeaderButton}`} onClick={onReturnToLifecycle} type="button"><FileText size={14} />Return to lifecycle</button>
        </div>
      </div>
      <div className={styles.wopVersion}>
        <small>Outcome state</small>
        <strong>{result.recommendation}</strong>
      </div>
    </header>

    <div className={styles.wopBody}>
      <div className={styles.wopSteps}>
        <section className={styles.wopStepCard}>
          <header><div><span>Step 1</span><h4>Confirm delivery completion</h4></div><em className={completedSteps.delivery ? styles.wopComplete : ""}>{completedSteps.delivery ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.keysAndDocumentsDelivered} onChange={(event) => updateBoolean("keysAndDocumentsDelivered", event.target.checked, "delivery")} type="checkbox" /><span>Keys and documents were delivered</span></label>
            <label><input checked={input.deliveryConditionRecorded} onChange={(event) => updateBoolean("deliveryConditionRecorded", event.target.checked, "delivery")} type="checkbox" /><span>Delivery condition was recorded</span></label>
            <label><input checked={input.vehicleOrientationCompleted} onChange={(event) => updateBoolean("vehicleOrientationCompleted", event.target.checked, "delivery")} type="checkbox" /><span>Vehicle orientation was completed</span></label>
            <label><input checked={input.customerAcceptanceRecorded} onChange={(event) => updateBoolean("customerAcceptanceRecorded", event.target.checked, "delivery")} type="checkbox" /><span>Customer acceptance was recorded</span></label>
          </div>
          <button className={styles.wopAction} disabled={!result.deliveryComplete || completedSteps.delivery} onClick={completeDelivery} type="button">Lock delivery proof</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 2</span><h4>Close promises and due bills</h4></div><em className={completedSteps.promises ? styles.wopComplete : ""}>{completedSteps.promises ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.promisedItemsCompleted} onChange={(event) => updateBoolean("promisedItemsCompleted", event.target.checked, "promises")} type="checkbox" /><span>Promised items were completed</span></label>
            <label><input checked={input.dueBillAppointmentsCompleted} onChange={(event) => updateBoolean("dueBillAppointmentsCompleted", event.target.checked, "promises")} type="checkbox" /><span>Due-bill appointments were completed</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.delivery || !result.weOweComplete || completedSteps.promises} onClick={completePromises} type="button">Lock promise closure</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 3</span><h4>Verify funding and payoff</h4></div><em className={completedSteps.funding ? styles.wopComplete : ""}>{completedSteps.funding ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.fundingVerified} onChange={(event) => updateBoolean("fundingVerified", event.target.checked, "funding")} type="checkbox" /><span>Funding was verified</span></label>
            <label><input checked={input.tradePayoffVerified} onChange={(event) => updateBoolean("tradePayoffVerified", event.target.checked, "funding")} type="checkbox" /><span>Trade payoff was verified</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.promises || !result.fundingComplete || completedSteps.funding} onClick={completeFunding} type="button">Lock funding proof</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 4</span><h4>Track title and registration</h4></div><em className={completedSteps.title ? styles.wopComplete : ""}>{completedSteps.title ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Title follow-up state</span><select onChange={(event) => updateValue("titleFollowUpState", event.target.value as TitleFollowUpState, "title")} value={input.titleFollowUpState}><option>Pending</option><option>In progress</option><option>Completed</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.titleRegistrationUpdatesComplete} onChange={(event) => updateBoolean("titleRegistrationUpdatesComplete", event.target.checked, "title")} type="checkbox" /><span>Title and registration updates are complete</span></label>
            <label><input checked={input.platesOrRegistrationDelivered} onChange={(event) => updateBoolean("platesOrRegistrationDelivered", event.target.checked, "title")} type="checkbox" /><span>Plates or registration were delivered</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.funding || !result.titleComplete || completedSteps.title} onClick={completeTitle} type="button">Lock title completion</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 5</span><h4>Manage warranty and concerns</h4></div><em className={completedSteps.concerns ? styles.wopComplete : ""}>{completedSteps.concerns ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Customer-care state</span><select onChange={(event) => updateValue("warrantyConcernState", event.target.value as ConcernState, "concerns")} value={input.warrantyConcernState}><option>No active case</option><option>Active case</option><option>Resolved</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.warrantyOrConcernOwnerAssigned} onChange={(event) => updateBoolean("warrantyOrConcernOwnerAssigned", event.target.checked, "concerns")} type="checkbox" /><span>Warranty or concern owner was assigned</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.title || !result.warrantyComplete || completedSteps.concerns} onClick={completeConcerns} type="button">Lock case record</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 6</span><h4>Verify the lifecycle outcome</h4></div><em className={completedSteps.closure ? styles.wopComplete : ""}>{completedSteps.closure ? "Closed" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Lifecycle state</span><select onChange={(event) => updateValue("lifecycleState", event.target.value as LifecycleState, "closure")} value={input.lifecycleState}><option>Open obligations</option><option>Ready to close</option><option>Closed</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.unresolvedObligationOwnerRecorded} onChange={(event) => updateBoolean("unresolvedObligationOwnerRecorded", event.target.checked, "closure")} type="checkbox" /><span>Any remaining obligation owner or status is recorded</span></label>
            <label><input checked={input.finalOutcomeRecorded} onChange={(event) => updateBoolean("finalOutcomeRecorded", event.target.checked, "closure")} type="checkbox" /><span>Final lifecycle outcome was recorded</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.concerns || !result.closureComplete || completedSteps.closure} onClick={completeClosure} type="button"><HandCoins size={14} />Close lifecycle</button>
        </section>
      </div>

      <aside className={styles.wopDecision}>
        <header><SmilePlus size={18} /><div><span>Post-sale recommendation</span><strong>{result.recommendation}</strong></div><em className={result.recommendation === "Lifecycle complete" ? styles.wopComplete : result.recommendation === "Verify closure" ? styles.wopHold : ""}>{stepCount}/6</em></header>
        <dl>
          <div><dt>Controls complete</dt><dd>{stepCount}/6</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockerCount}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
          <div><dt>Title follow-up</dt><dd>{input.titleFollowUpState}</dd></div>
          <div><dt>Customer-care state</dt><dd>{input.warrantyConcernState}</dd></div>
          <div><dt>Lifecycle state</dt><dd>{input.lifecycleState}</dd></div>
        </dl>
        <p className={styles.wopExplanation}>{result.recommendation === "Lifecycle complete" ? "Post-Sale is complete. Delivery, promises, funding, title, customer care, and final closure are all governed and complete." : "Post-Sale should remain controlled until the exact open obligation is resolved or explicitly governed."}</p>
        <div className={styles.wopDrivers}>
          <div>
            <strong>What is working</strong>
            {(result.positiveDrivers.length ? result.positiveDrivers : ["No confirmed post-sale strength yet."]).map((item) => <span key={item}>{result.positiveDrivers.length ? <Check size={14} /> : <CircleAlert size={14} />}{item}</span>)}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.blockers.map((item) => <span key={item}><CircleAlert size={14} />{item}</span>)}
          </div>
        </div>
        <section className={styles.wopTrail}>
          <header><Clock3 size={18} /><h4>Operational work trail</h4></header>
          {trail.length ? <ul>{trail.map((item, index) => <li key={`${item.step}-${item.timestamp}-${index}`}><strong>{item.timestamp}</strong><span>{item.actor}</span><div>{item.result}</div><small>{item.evidence}</small></li>)}</ul> : <p>No post-sale action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.wopApproval}>
      <div>
        <span><ClipboardCheck size={14} />Delivery and promises</span>
        <strong>{completedSteps.promises ? "Delivery obligations closed" : "Delivery or promises still active"}</strong>
        <small>Delivery, customer acceptance, promised items, and due bills should be explicit before financial and title follow-up close.</small>
      </div>
      <div>
        <span><ShieldCheck size={14} />Funding and customer care</span>
        <strong>{completedSteps.concerns ? "Customer-care follow-up closed" : "Funding, title, or care still active"}</strong>
        <small>Funding, title follow-up, and customer-care ownership should be explicit before the final outcome is closed.</small>
      </div>
      <div>
        <span><BadgeCheck size={14} />Lifecycle readiness</span>
        <strong>{completedSteps.closure ? "Lifecycle complete" : "Post-Sale still active"}</strong>
        <small>{completedSteps.closure ? "This vehicle lifecycle is fully closed." : "Finish final outcome recording before the lifecycle closure opens."}</small>
      </div>
    </section>

    <footer className={styles.wopNotice} aria-live="polite"><CircleAlert size={14} />{notice}</footer>
  </section>;
}
