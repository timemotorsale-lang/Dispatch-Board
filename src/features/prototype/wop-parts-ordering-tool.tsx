"use client";

import {
  Check,
  CircleAlert,
  ClipboardList,
  Clock3,
  DollarSign,
  Package,
  ScanBarcode,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";
import {
  evaluateWopPartsOrdering,
  type WopPartsOrderingInput,
  type WopPartsRecommendation,
  type WopPartsSourceType,
  type WopPartsUrgency,
} from "./wop-parts-ordering-rules";

export type WopPartsWorkflowProgress = {
  approvalComplete: boolean;
  blockerCount: number;
  demandComplete: boolean;
  readinessComplete: boolean;
  receivingComplete: boolean;
  recommendation: WopPartsRecommendation;
  sourcingComplete: boolean;
  supplementRequired: boolean;
  trailCount: number;
};

type StepKey = "demand" | "source" | "approval" | "receive";
type TrailEntry = { actor: string; evidence: string; result: string; step: StepKey; timestamp: string };

const sourceOptions: WopPartsSourceType[] = ["Stock", "Local aftermarket", "OEM dealer", "Used / recycled", "Autobody / paint", "Special order"];
const urgencyOptions: WopPartsUrgency[] = ["Required to start work", "Required before final QC", "Advisory"];

const initialInput: WopPartsOrderingInput = {
  demandCreated: false,
  etaConfirmed: false,
  fitmentConfirmed: false,
  linkedJobConfirmed: false,
  orderPlaced: false,
  quantityConfirmed: false,
  quantityMatched: false,
  readyForRepairConfirmed: false,
  received: false,
  revisedWorkOrderTotalDollars: 0,
  sourceCommitted: false,
  sourceType: "Stock",
  supplementApproved: false,
  urgentExceptionUsed: false,
  urgency: "Required to start work",
  vendorQuoteCaptured: false,
  visibleDamageClear: false,
};

const helperReturnTo = "/vehicles/inventory";

function timeStamp() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

export function WopPartsOrderingTool({
  approvedBudgetDollars,
  onProgressChange,
}: {
  approvedBudgetDollars: number;
  onProgressChange: (progress: WopPartsWorkflowProgress) => void;
}) {
  const [input, setInput] = useState<WopPartsOrderingInput>({ ...initialInput, revisedWorkOrderTotalDollars: approvedBudgetDollars });
  const [introResponses, setIntroResponses] = useState({
    autobodyGuideReviewed: false,
    mechanicalGuideReviewed: false,
    partsWorkspaceOpened: false,
  });
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    approval: false,
    demand: false,
    receive: false,
    source: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Create an exact parts demand from labor guide or work-order findings before sourcing begins.");
  const result = useMemo(() => evaluateWopPartsOrdering(input, approvedBudgetDollars), [approvedBudgetDollars, input]);

  useEffect(() => {
    onProgressChange({
      approvalComplete: completedSteps.approval && result.approvalComplete,
      blockerCount: result.blockerCount,
      demandComplete: completedSteps.demand && result.demandComplete,
      readinessComplete: result.readinessComplete && completedSteps.receive,
      receivingComplete: completedSteps.receive && result.receivingComplete,
      recommendation: result.recommendation,
      sourcingComplete: completedSteps.source && result.sourcingComplete,
      supplementRequired: result.supplementRequired,
      trailCount: trail.length,
    });
  }, [completedSteps, onProgressChange, result, trail.length]);

  function appendTrail(step: StepKey, actor: string, resultText: string, evidence: string) {
    setTrail((current) => [{ actor, evidence, result: resultText, step, timestamp: timeStamp() }, ...current]);
  }

  function invalidate(step: StepKey, message: string) {
    setCompletedSteps((current) => ({
      ...current,
      ...(step === "demand" ? { demand: false, source: false, approval: false, receive: false } : {}),
      ...(step === "source" ? { source: false, approval: false, receive: false } : {}),
      ...(step === "approval" ? { approval: false, receive: false } : {}),
      ...(step === "receive" ? { receive: false } : {}),
    }));
    setNotice(message);
  }

  function updateBoolean<K extends keyof WopPartsOrderingInput>(field: K, value: WopPartsOrderingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidate(step, "Parts facts changed. Reconfirm sourcing, approval, and receiving controls.");
  }

  function updateValue<K extends keyof WopPartsOrderingInput>(field: K, value: WopPartsOrderingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidate(step, "Parts facts changed. Reconfirm sourcing, approval, and receiving controls.");
  }

  function updateIntroResponse(field: keyof typeof introResponses, value: boolean) {
    setIntroResponses((current) => ({ ...current, [field]: value }));
    setNotice("Parts access path was updated. Continue documenting the exact demand, source, approval, and receiving chain below.");
  }

  function completeDemand() {
    if (!result.demandComplete) return;
    setCompletedSteps((current) => ({ ...current, demand: true }));
    appendTrail("demand", "Recon planner", "A controlled parts demand was created from the approved work-order scope.", "Parts demand");
    setNotice("Demand is ready. Choose the source path and commit the ordering plan next.");
  }

  function completeSource() {
    if (!completedSteps.demand || !result.sourcingComplete) return;
    setCompletedSteps((current) => ({ ...current, source: true }));
    appendTrail("source", "Parts lead", "Source, quote, and ETA were preserved for this parts path.", "Quote and ETA");
    setNotice(result.supplementRequired ? "Sourcing is complete. Resolve supplement approval before repair readiness." : "Sourcing is complete. Move into receiving and match controls next.");
  }

  function completeApproval() {
    if (!completedSteps.source || !result.approvalComplete) return;
    setCompletedSteps((current) => ({ ...current, approval: true }));
    appendTrail("approval", result.supplementRequired ? "Manager" : "Parts lead", result.supplementRequired ? "The revised parts total was approved as a controlled supplement." : "No supplement approval was required for the current parts path.", "Approval control");
    setNotice("Approval control is complete. Match the physical parts before repair begins.");
  }

  function completeReceive() {
    if (!completedSteps.approval || !result.receivingComplete || !input.readyForRepairConfirmed) return;
    setCompletedSteps((current) => ({ ...current, receive: true }));
    appendTrail("receive", "Parts receiver", "Received parts matched quantity, fitment, and condition and were released to repair readiness.", "Receiving match");
    setNotice("Parts ordering chain is complete. Work Order can now use this readiness proof.");
  }

  const laborGuideHref = `/diagnostics/labor-guide?returnTo=${encodeURIComponent(helperReturnTo)}`;
  const autobodyLaborGuideHref = `/diagnostics/autobody-estimate?returnTo=${encodeURIComponent(helperReturnTo)}`;
  const partsWorkspaceHref = `/vehicles/parts-operations?returnTo=${encodeURIComponent(helperReturnTo)}`;

  return <section className={styles.wopSubworkspace} aria-label="Parts ordering chain">
    <header className={styles.wopSubworkspaceHeader}>
      <div>
        <span><Package size={14} />Governed parts ordering chain</span>
        <strong>Turn work-order scope into exact parts demand, sourcing, receipt, and repair readiness.</strong>
        <p>Labor guide creates the need. This chain proves who sourced it, how it was approved, and when the right part became usable.</p>
        <div className={styles.wopHelperLinks}>
          <Link className={styles.wopHelperLink} href={laborGuideHref}>Mechanical labor guide</Link>
          <Link className={styles.wopHelperLink} href={autobodyLaborGuideHref}>Autobody labor guide</Link>
          <Link className={styles.wopHelperLink} href={partsWorkspaceHref}>Open parts workspace</Link>
        </div>
        <div className={styles.wopIntroResponses}>
          <label><input checked={introResponses.mechanicalGuideReviewed} onChange={(event) => updateIntroResponse("mechanicalGuideReviewed", event.target.checked)} type="checkbox" /><span>Mechanical labor guide reviewed where needed</span></label>
          <label><input checked={introResponses.autobodyGuideReviewed} onChange={(event) => updateIntroResponse("autobodyGuideReviewed", event.target.checked)} type="checkbox" /><span>Autobody labor guide reviewed where needed</span></label>
          <label><input checked={introResponses.partsWorkspaceOpened} onChange={(event) => updateIntroResponse("partsWorkspaceOpened", event.target.checked)} type="checkbox" /><span>Parts workspace opened or sourcing path confirmed</span></label>
        </div>
      </div>
      <div className={styles.wopVersion}>
        <small>Parts state</small>
        <strong>{result.recommendation} / {result.confidence}</strong>
      </div>
    </header>

    <div className={styles.wopSubworkspaceGrid}>
      <div className={styles.wopSteps}>
        <section className={styles.wopStepCard}>
          <header><div><span>Parts step 1</span><h4>Create parts demand</h4></div><em className={completedSteps.demand ? styles.wopComplete : ""}>{completedSteps.demand ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Source classification</span><select aria-label="Source classification" onChange={(event) => updateValue("sourceType", event.target.value as WopPartsSourceType, "demand")} value={input.sourceType}>{sourceOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><span>Urgency</span><select aria-label="Urgency" onChange={(event) => updateValue("urgency", event.target.value as WopPartsUrgency, "demand")} value={input.urgency}>{urgencyOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><span>Revised work-order total</span><input aria-label="Revised work-order total" min={0} onChange={(event) => updateValue("revisedWorkOrderTotalDollars", Number(event.target.value), "demand")} type="number" value={input.revisedWorkOrderTotalDollars} /></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.demandCreated} onChange={(event) => updateBoolean("demandCreated", event.target.checked, "demand")} type="checkbox" /><span>Demand line created from labor guide or work-order scope</span></label>
            <label><input checked={input.linkedJobConfirmed} onChange={(event) => updateBoolean("linkedJobConfirmed", event.target.checked, "demand")} type="checkbox" /><span>Linked repair job confirmed</span></label>
            <label><input checked={input.quantityConfirmed} onChange={(event) => updateBoolean("quantityConfirmed", event.target.checked, "demand")} type="checkbox" /><span>Quantity and fitment request confirmed</span></label>
          </div>
          <button className={styles.wopAction} disabled={!result.demandComplete || completedSteps.demand} onClick={completeDemand} type="button"><ClipboardList size={14} />Lock parts demand</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Parts step 2</span><h4>Source or reserve the part</h4></div><em className={completedSteps.source ? styles.wopComplete : ""}>{completedSteps.source ? "Sourced" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.sourceCommitted} onChange={(event) => updateBoolean("sourceCommitted", event.target.checked, "source")} type="checkbox" /><span>Vendor or stock source selected</span></label>
            <label><input checked={input.vendorQuoteCaptured} onChange={(event) => updateBoolean("vendorQuoteCaptured", event.target.checked, "source")} type="checkbox" /><span>Quote or stock cost captured</span></label>
            <label><input checked={input.orderPlaced} onChange={(event) => updateBoolean("orderPlaced", event.target.checked, "source")} type="checkbox" /><span>Order placed or stock reserved</span></label>
            <label><input checked={input.etaConfirmed} onChange={(event) => updateBoolean("etaConfirmed", event.target.checked, "source")} type="checkbox" /><span>ETA or pickup timing confirmed</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.demand || !result.sourcingComplete || completedSteps.source} onClick={completeSource} type="button"><Truck size={14} />Confirm sourcing plan</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Parts step 3</span><h4>Resolve supplement and approval</h4></div><em className={completedSteps.approval ? styles.wopComplete : ""}>{completedSteps.approval ? "Controlled" : result.supplementRequired ? "Approval required" : "No supplement"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Approved work-order budget</span><input disabled type="text" value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(approvedBudgetDollars || 0)} /></label>
            <label><span>Revised work-order total</span><input disabled type="text" value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(input.revisedWorkOrderTotalDollars || 0)} /></label>
            <label><span>Supplement status</span><input disabled type="text" value={result.supplementRequired ? "Supplement review required" : "Within approved plan"} /></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.supplementApproved} onChange={(event) => updateBoolean("supplementApproved", event.target.checked, "approval")} type="checkbox" /><span>Manager approved the supplement or revised amount</span></label>
            <label><input checked={input.urgentExceptionUsed} onChange={(event) => updateBoolean("urgentExceptionUsed", event.target.checked, "approval")} type="checkbox" /><span>Urgent safety exception used with audit trail</span></label>
          </div>
          <p className={styles.wopExplanation}>{result.supplementRequired ? "The revised total is above the current approved plan, so parts cannot silently move forward. Preserve the supplement decision here before repair readiness is trusted." : "The current parts plan remains inside the approved work-order total, so no supplement approval is needed."}</p>
          <button className={styles.wopAction} disabled={!completedSteps.source || !result.approvalComplete || completedSteps.approval} onClick={completeApproval} type="button"><DollarSign size={14} />Lock approval control</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Parts step 4</span><h4>Receive and match before repair</h4></div><em className={completedSteps.receive ? styles.wopComplete : ""}>{completedSteps.receive ? "Ready" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.received} onChange={(event) => updateBoolean("received", event.target.checked, "receive")} type="checkbox" /><span>Part received physically</span></label>
            <label><input checked={input.quantityMatched} onChange={(event) => updateBoolean("quantityMatched", event.target.checked, "receive")} type="checkbox" /><span>Quantity matched the order</span></label>
            <label><input checked={input.fitmentConfirmed} onChange={(event) => updateBoolean("fitmentConfirmed", event.target.checked, "receive")} type="checkbox" /><span>Fitment confirmed for the vehicle or job</span></label>
            <label><input checked={input.visibleDamageClear} onChange={(event) => updateBoolean("visibleDamageClear", event.target.checked, "receive")} type="checkbox" /><span>No shipping or receiving damage remains</span></label>
            <label><input checked={input.readyForRepairConfirmed} onChange={(event) => updateBoolean("readyForRepairConfirmed", event.target.checked, "receive")} type="checkbox" /><span>Ready for technician use</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.approval || !result.receivingComplete || !input.readyForRepairConfirmed || completedSteps.receive} onClick={completeReceive} type="button"><ScanBarcode size={14} />Lock receiving match</button>
        </section>
      </div>

      <aside className={styles.wopDecision}>
        <header><Package size={18} /><div><span>Parts recommendation</span><strong>{result.recommendation}</strong></div><em className={result.recommendation === "Ready for repair" ? styles.wopComplete : result.recommendation === "Exception" ? styles.wopHold : ""}>{trail.length} trail</em></header>
        <dl>
          <div><dt>Demand</dt><dd>{completedSteps.demand ? "Locked" : "Active"}</dd></div>
          <div><dt>Sourcing</dt><dd>{completedSteps.source ? "Controlled" : "Pending"}</dd></div>
          <div><dt>Supplement</dt><dd>{result.supplementRequired ? "Required" : "Not required"}</dd></div>
          <div><dt>Receiving</dt><dd>{completedSteps.receive ? "Matched" : "Pending"}</dd></div>
          <div><dt>Urgency</dt><dd>{input.urgency}</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockerCount}</dd></div>
        </dl>
        <p className={styles.wopExplanation}>{result.explanation}</p>
        <div className={styles.wopDrivers}>
          <div>
            <strong>What is working</strong>
            {(result.positiveDrivers.length ? result.positiveDrivers : ["No controlled parts strength yet."]).map((item) => <span key={item}>{result.positiveDrivers.length ? <Check size={14} /> : <CircleAlert size={14} />}{item}</span>)}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.blockers.map((item) => <span key={item}><CircleAlert size={14} />{item}</span>)}
          </div>
        </div>
        <section className={styles.wopTrail}>
          <header><Clock3 size={18} /><h4>Parts work trail</h4></header>
          {trail.length ? <ul>{trail.map((item, index) => <li key={`${item.step}-${item.timestamp}-${index}`}><strong>{item.timestamp}</strong><span>{item.actor}</span><div>{item.result}</div><small>{item.evidence}</small></li>)}</ul> : <p>No parts-ordering action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <footer className={styles.wopNotice} aria-live="polite"><CircleAlert size={14} />{notice}</footer>
  </section>;
}
