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
  Stamp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";

export type StlWorkflowProgress = {
  blockerCount: number;
  buyerComplete: boolean;
  figuresComplete: boolean;
  packetComplete: boolean;
  qcComplete: boolean;
  recommendation: "Verify buyer" | "Prepare transfer packet" | "Reconcile figures" | "Collect signatures" | "Complete document QC" | "Submit transfer" | "Ready for Filing";
  signaturesComplete: boolean;
  submissionComplete: boolean;
  trailCount: number;
};

type StepKey = "buyer" | "packet" | "figures" | "signatures" | "qc" | "submission";
type TrailEntry = { actor: string; evidence: string; result: string; step: StepKey; timestamp: string };
type BuyerType = "Individual" | "Business" | "Trust";
type SubmissionMethod = "Pending" | "State portal" | "Mail or courier" | "In-person counter";
type SubmissionState = "Not submitted" | "Submitted" | "Correction pending";

type SaleTitlingInput = {
  addressAndJurisdictionVerified: boolean;
  buyerIdentityVerified: boolean;
  buyerType: BuyerType;
  figuresMatchContract: boolean;
  fundingAndPayoffVerified: boolean;
  insuranceAndEntityDocsVerified: boolean;
  lienholderAndPlateDataPrepared: boolean;
  namesAndAmountsQcPassed: boolean;
  odometerAndDisclosureFormsPrepared: boolean;
  platesTaxRegistrationPrepared: boolean;
  signaturesCaptured: boolean;
  notaryOrPoaCaptured: boolean;
  dealerExecutionCaptured: boolean;
  packetAttachmentsQcPassed: boolean;
  submissionConfirmationRecorded: boolean;
  submissionFollowUpRecorded: boolean;
  submissionMethod: SubmissionMethod;
  submissionState: SubmissionState;
  transferAssignmentPrepared: boolean;
  vinAndMileageQcPassed: boolean;
};

const initialInput: SaleTitlingInput = {
  addressAndJurisdictionVerified: false,
  buyerIdentityVerified: false,
  buyerType: "Individual",
  dealerExecutionCaptured: false,
  figuresMatchContract: false,
  fundingAndPayoffVerified: false,
  insuranceAndEntityDocsVerified: false,
  lienholderAndPlateDataPrepared: false,
  namesAndAmountsQcPassed: false,
  notaryOrPoaCaptured: false,
  odometerAndDisclosureFormsPrepared: false,
  packetAttachmentsQcPassed: false,
  platesTaxRegistrationPrepared: false,
  signaturesCaptured: false,
  submissionConfirmationRecorded: false,
  submissionFollowUpRecorded: false,
  submissionMethod: "Pending",
  submissionState: "Not submitted",
  transferAssignmentPrepared: false,
  vinAndMileageQcPassed: false,
};

function timeStamp() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

function evaluateSaleTitling(input: SaleTitlingInput) {
  const buyerComplete = input.buyerIdentityVerified && input.addressAndJurisdictionVerified && input.insuranceAndEntityDocsVerified;
  const packetComplete = input.transferAssignmentPrepared && input.platesTaxRegistrationPrepared && input.odometerAndDisclosureFormsPrepared && input.lienholderAndPlateDataPrepared;
  const figuresComplete = input.figuresMatchContract && input.fundingAndPayoffVerified;
  const signaturesComplete = input.signaturesCaptured && input.dealerExecutionCaptured && input.notaryOrPoaCaptured;
  const qcComplete = input.vinAndMileageQcPassed && input.namesAndAmountsQcPassed && input.packetAttachmentsQcPassed;
  const submissionComplete = input.submissionState === "Submitted" && input.submissionMethod !== "Pending" && input.submissionConfirmationRecorded && input.submissionFollowUpRecorded;

  const blockers = [
    !buyerComplete ? "Buyer identity, jurisdiction, or entity records are still incomplete." : null,
    !packetComplete ? "Transfer packet documents are still incomplete." : null,
    !figuresComplete ? "Deal figures do not yet fully match the accepted contract." : null,
    !signaturesComplete ? "Required signatures, dealer execution, or notary and POA controls are still incomplete." : null,
    !qcComplete ? "Exact-document QC has not yet fully passed." : null,
    !submissionComplete ? "Submission method, confirmation, or follow-up accountability is still incomplete." : null,
  ].filter((item): item is string => Boolean(item));

  const recommendation: StlWorkflowProgress["recommendation"] =
    !buyerComplete ? "Verify buyer"
      : !packetComplete ? "Prepare transfer packet"
        : !figuresComplete ? "Reconcile figures"
          : !signaturesComplete ? "Collect signatures"
            : !qcComplete ? "Complete document QC"
              : !submissionComplete ? "Submit transfer"
                : "Ready for Filing";

  const positiveDrivers = [
    buyerComplete ? "Buyer identity, insurance, and jurisdiction details are verified." : null,
    packetComplete ? "Transfer packet, taxes, plates, lienholder data, and disclosures are prepared." : null,
    figuresComplete ? "Sale, tax, fee, payoff, and funding figures reconcile to the contract." : null,
    signaturesComplete ? "Required signatures and execution controls are complete." : null,
    qcComplete ? "VIN, mileage, names, amounts, and attachments passed exact-document QC." : null,
    submissionComplete ? `Transfer package was submitted using ${input.submissionMethod}.` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    blockerCount: blockers.length,
    blockers,
    buyerComplete,
    figuresComplete,
    packetComplete,
    positiveDrivers,
    qcComplete,
    recommendation,
    signaturesComplete,
    submissionComplete,
  };
}

export function StlSaleTitlingTool({
  onProgressChange,
  onReturnToLifecycle,
}: {
  onProgressChange: (progress: StlWorkflowProgress) => void;
  onReturnToLifecycle: () => void;
}) {
  const [input, setInput] = useState(initialInput);
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    buyer: false,
    figures: false,
    packet: false,
    qc: false,
    signatures: false,
    submission: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Start Sale Titling by verifying the exact buyer identity and jurisdiction before packet preparation begins.");
  const result = useMemo(() => evaluateSaleTitling(input), [input]);
  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  useEffect(() => {
    onProgressChange({
      blockerCount: result.blockerCount,
      buyerComplete: completedSteps.buyer && result.buyerComplete,
      figuresComplete: completedSteps.figures && result.figuresComplete,
      packetComplete: completedSteps.packet && result.packetComplete,
      qcComplete: completedSteps.qc && result.qcComplete,
      recommendation: result.recommendation,
      signaturesComplete: completedSteps.signatures && result.signaturesComplete,
      submissionComplete: completedSteps.submission && result.submissionComplete,
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
      const order: StepKey[] = ["buyer", "packet", "figures", "signatures", "qc", "submission"];
      const startIndex = order.indexOf(step);
      order.forEach((key, index) => {
        if (index >= startIndex && current[key]) {
          next[key] = false;
          reopened = true;
        }
      });
      return next;
    });
    if (reopened) appendTrail(step, "System", message, "Sale titling reopened");
    setNotice(message);
  }

  function updateBoolean<K extends keyof SaleTitlingInput>(field: K, value: SaleTitlingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Sale titling facts changed. Reconfirm this step and every downstream transfer control.");
  }

  function updateValue<K extends keyof SaleTitlingInput>(field: K, value: SaleTitlingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Sale titling facts changed. Reconfirm this step and every downstream transfer control.");
  }

  function completeBuyer() {
    if (!result.buyerComplete) return;
    setCompletedSteps((current) => ({ ...current, buyer: true }));
    appendTrail("buyer", "Title specialist", `Buyer identity and ${input.buyerType.toLowerCase()} jurisdiction controls were verified.`, "Buyer verification");
    setNotice("Buyer verification is complete. Prepare the transfer packet next.");
  }

  function completePacket() {
    if (!completedSteps.buyer || !result.packetComplete) return;
    setCompletedSteps((current) => ({ ...current, packet: true }));
    appendTrail("packet", "Title specialist", "Transfer assignment, registration, tax, plates, lienholder data, and disclosures were prepared.", "Transfer packet");
    setNotice("Transfer packet is complete. Reconcile the financial figures next.");
  }

  function completeFigures() {
    if (!completedSteps.packet || !result.figuresComplete) return;
    setCompletedSteps((current) => ({ ...current, figures: true }));
    appendTrail("figures", "Deal clerk", "Accepted contract figures, tax, fees, funding, and payoff were reconciled.", "Figure audit");
    setNotice("Financial figures are complete. Collect the required signatures next.");
  }

  function completeSignatures() {
    if (!completedSteps.figures || !result.signaturesComplete) return;
    setCompletedSteps((current) => ({ ...current, signatures: true }));
    appendTrail("signatures", "Title specialist", "Buyer, dealer, and notary or POA execution controls were completed.", "Signed packet");
    setNotice("Signature control is complete. Finish the exact-document QC next.");
  }

  function completeQc() {
    if (!completedSteps.signatures || !result.qcComplete) return;
    setCompletedSteps((current) => ({ ...current, qc: true }));
    appendTrail("qc", "Title reviewer", "VIN, mileage, names, amounts, and packet attachments passed exact-document QC.", "Document QC");
    setNotice("Document QC is complete. Submit the transfer package next.");
  }

  function completeSubmission() {
    if (!completedSteps.qc || !result.submissionComplete) return;
    setCompletedSteps((current) => ({ ...current, submission: true }));
    appendTrail("submission", "Title specialist", `Transfer package submitted by ${input.submissionMethod} with confirmation and follow-up accountability recorded.`, "Submission proof");
    setNotice("Sale Titling is complete. The deal can now move into Filing.");
  }

  return <section className={styles.wopWorkspace} aria-label="TMS Sale Titling workspace">
    <header className={styles.wopHeader}>
      <div>
        <span><Stamp size={15} />TMS Sale Titling</span>
        <h3>STL transfer workspace</h3>
        <p>Guide the title team through buyer verification, transfer packet preparation, figure audit, signatures, exact-document QC, and submission accountability.</p>
        <div className={styles.wopHeaderActions}>
          <button className={`${styles.wopHeaderLink} ${styles.wopHeaderButton}`} onClick={onReturnToLifecycle} type="button"><FileText size={14} />Return to lifecycle</button>
        </div>
      </div>
      <div className={styles.wopVersion}>
        <small>Transfer state</small>
        <strong>{result.recommendation}</strong>
      </div>
    </header>

    <div className={styles.wopBody}>
      <div className={styles.wopSteps}>
        <section className={styles.wopStepCard}>
          <header><div><span>Step 1</span><h4>Verify buyer and jurisdiction</h4></div><em className={completedSteps.buyer ? styles.wopComplete : ""}>{completedSteps.buyer ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Buyer type</span><select onChange={(event) => updateValue("buyerType", event.target.value as BuyerType, "buyer")} value={input.buyerType}><option>Individual</option><option>Business</option><option>Trust</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.buyerIdentityVerified} onChange={(event) => updateBoolean("buyerIdentityVerified", event.target.checked, "buyer")} type="checkbox" /><span>Buyer identity was verified</span></label>
            <label><input checked={input.addressAndJurisdictionVerified} onChange={(event) => updateBoolean("addressAndJurisdictionVerified", event.target.checked, "buyer")} type="checkbox" /><span>Address and jurisdiction details were verified</span></label>
            <label><input checked={input.insuranceAndEntityDocsVerified} onChange={(event) => updateBoolean("insuranceAndEntityDocsVerified", event.target.checked, "buyer")} type="checkbox" /><span>Insurance and entity documents were verified</span></label>
          </div>
          <button className={styles.wopAction} disabled={!result.buyerComplete || completedSteps.buyer} onClick={completeBuyer} type="button">Lock buyer verification</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 2</span><h4>Prepare transfer documents</h4></div><em className={completedSteps.packet ? styles.wopComplete : ""}>{completedSteps.packet ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.transferAssignmentPrepared} onChange={(event) => updateBoolean("transferAssignmentPrepared", event.target.checked, "packet")} type="checkbox" /><span>Transfer assignment documents were prepared</span></label>
            <label><input checked={input.platesTaxRegistrationPrepared} onChange={(event) => updateBoolean("platesTaxRegistrationPrepared", event.target.checked, "packet")} type="checkbox" /><span>Registration, tax, and plate forms were prepared</span></label>
            <label><input checked={input.odometerAndDisclosureFormsPrepared} onChange={(event) => updateBoolean("odometerAndDisclosureFormsPrepared", event.target.checked, "packet")} type="checkbox" /><span>Odometer and disclosure forms were prepared</span></label>
            <label><input checked={input.lienholderAndPlateDataPrepared} onChange={(event) => updateBoolean("lienholderAndPlateDataPrepared", event.target.checked, "packet")} type="checkbox" /><span>Lienholder and plate data were prepared</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.buyer || !result.packetComplete || completedSteps.packet} onClick={completePacket} type="button">Lock transfer packet</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 3</span><h4>Reconcile financial figures</h4></div><em className={completedSteps.figures ? styles.wopComplete : ""}>{completedSteps.figures ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.figuresMatchContract} onChange={(event) => updateBoolean("figuresMatchContract", event.target.checked, "figures")} type="checkbox" /><span>Price, tax, fees, and title amounts match the contract</span></label>
            <label><input checked={input.fundingAndPayoffVerified} onChange={(event) => updateBoolean("fundingAndPayoffVerified", event.target.checked, "figures")} type="checkbox" /><span>Funding, payoff, and payment figures were verified</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.packet || !result.figuresComplete || completedSteps.figures} onClick={completeFigures} type="button">Lock figure audit</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 4</span><h4>Obtain required signatures</h4></div><em className={completedSteps.signatures ? styles.wopComplete : ""}>{completedSteps.signatures ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.signaturesCaptured} onChange={(event) => updateBoolean("signaturesCaptured", event.target.checked, "signatures")} type="checkbox" /><span>Buyer and co-buyer signatures were captured</span></label>
            <label><input checked={input.dealerExecutionCaptured} onChange={(event) => updateBoolean("dealerExecutionCaptured", event.target.checked, "signatures")} type="checkbox" /><span>Dealer execution was completed</span></label>
            <label><input checked={input.notaryOrPoaCaptured} onChange={(event) => updateBoolean("notaryOrPoaCaptured", event.target.checked, "signatures")} type="checkbox" /><span>Notary or POA execution was completed</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.figures || !result.signaturesComplete || completedSteps.signatures} onClick={completeSignatures} type="button">Lock signatures</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 5</span><h4>Perform exact-document QC</h4></div><em className={completedSteps.qc ? styles.wopComplete : ""}>{completedSteps.qc ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.vinAndMileageQcPassed} onChange={(event) => updateBoolean("vinAndMileageQcPassed", event.target.checked, "qc")} type="checkbox" /><span>VIN and mileage fields passed QC</span></label>
            <label><input checked={input.namesAndAmountsQcPassed} onChange={(event) => updateBoolean("namesAndAmountsQcPassed", event.target.checked, "qc")} type="checkbox" /><span>Names, dates, and amounts passed QC</span></label>
            <label><input checked={input.packetAttachmentsQcPassed} onChange={(event) => updateBoolean("packetAttachmentsQcPassed", event.target.checked, "qc")} type="checkbox" /><span>Packet attachments passed QC</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.signatures || !result.qcComplete || completedSteps.qc} onClick={completeQc} type="button">Lock document QC</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 6</span><h4>Submit and record accountability</h4></div><em className={completedSteps.submission ? styles.wopComplete : ""}>{completedSteps.submission ? "Submitted" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Submission method</span><select onChange={(event) => updateValue("submissionMethod", event.target.value as SubmissionMethod, "submission")} value={input.submissionMethod}><option>Pending</option><option>State portal</option><option>Mail or courier</option><option>In-person counter</option></select></label>
            <label><span>Submission state</span><select onChange={(event) => updateValue("submissionState", event.target.value as SubmissionState, "submission")} value={input.submissionState}><option>Not submitted</option><option>Submitted</option><option>Correction pending</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.submissionConfirmationRecorded} onChange={(event) => updateBoolean("submissionConfirmationRecorded", event.target.checked, "submission")} type="checkbox" /><span>Submission confirmation was recorded</span></label>
            <label><input checked={input.submissionFollowUpRecorded} onChange={(event) => updateBoolean("submissionFollowUpRecorded", event.target.checked, "submission")} type="checkbox" /><span>Follow-up owner and due date were recorded</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.qc || !result.submissionComplete || completedSteps.submission} onClick={completeSubmission} type="button">Release submission</button>
        </section>
      </div>

      <aside className={styles.wopDecision}>
        <header><FileBadge2 size={18} /><div><span>Sale titling recommendation</span><strong>{result.recommendation}</strong></div><em className={result.recommendation === "Ready for Filing" ? styles.wopComplete : result.recommendation === "Submit transfer" ? styles.wopHold : ""}>{stepCount}/6</em></header>
        <dl>
          <div><dt>Controls complete</dt><dd>{stepCount}/6</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockerCount}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
          <div><dt>Buyer type</dt><dd>{input.buyerType}</dd></div>
          <div><dt>Submission method</dt><dd>{input.submissionMethod}</dd></div>
          <div><dt>Submission state</dt><dd>{input.submissionState}</dd></div>
        </dl>
        <p className={styles.wopExplanation}>{result.recommendation === "Ready for Filing" ? "Sale Titling is complete. The buyer transfer package has been verified, submitted, and is ready to hand off into Filing." : "Sale titling should remain fail-closed until the exact-document blocker is cleared and submission accountability is explicit."}</p>
        <div className={styles.wopDrivers}>
          <div>
            <strong>What is working</strong>
            {(result.positiveDrivers.length ? result.positiveDrivers : ["No confirmed transfer-package strength yet."]).map((item) => <span key={item}>{result.positiveDrivers.length ? <Check size={14} /> : <CircleAlert size={14} />}{item}</span>)}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.blockers.map((item) => <span key={item}><CircleAlert size={14} />{item}</span>)}
          </div>
        </div>
        <section className={styles.wopTrail}>
          <header><Clock3 size={18} /><h4>Operational work trail</h4></header>
          {trail.length ? <ul>{trail.map((item, index) => <li key={`${item.step}-${item.timestamp}-${index}`}><strong>{item.timestamp}</strong><span>{item.actor}</span><div>{item.result}</div><small>{item.evidence}</small></li>)}</ul> : <p>No sale-titling action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.wopApproval}>
      <div>
        <span><ClipboardCheck size={14} />Buyer and packet</span>
        <strong>{completedSteps.packet ? "Transfer packet prepared" : "Buyer or packet still active"}</strong>
        <small>Buyer identity, jurisdiction, transfer packet, and disclosures should be explicit before signature collection begins.</small>
      </div>
      <div>
        <span><ShieldCheck size={14} />Exact-document control</span>
        <strong>{completedSteps.qc ? "Document QC complete" : "Document QC still active"}</strong>
        <small>Figures, signatures, VIN, mileage, names, amounts, and attachments should pass exact review before submission.</small>
      </div>
      <div>
        <span><BadgeCheck size={14} />Stage readiness</span>
        <strong>{completedSteps.submission ? "Ready for Filing" : "Sale Titling still active"}</strong>
        <small>{completedSteps.submission ? "This deal can now hand off into the Filing stage." : "Finish submission proof and accountability before the lifecycle handoff opens."}</small>
      </div>
    </section>

    <footer className={styles.wopNotice} aria-live="polite"><CircleAlert size={14} />{notice}</footer>
  </section>;
}
