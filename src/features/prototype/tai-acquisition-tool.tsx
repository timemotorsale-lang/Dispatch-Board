"use client";

import { BadgeCheck, Calculator, Check, CircleAlert, Gauge, LockKeyhole, ShieldCheck, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";
import { PrototypeVinScanCard, type PrototypeVinScanEvidence } from "./prototype-vin-scan-card";
import { evaluateTaiAcquisition, type TaiAcquisitionInput } from "./tai-acquisition-rules";

export type TaiWorkflowProgress = {
  appraisalComplete: boolean;
  authorityComplete: boolean;
  commitmentComplete: boolean;
  economicsComplete: boolean;
  identityComplete: boolean;
  titleComplete: boolean;
};

const initialInput: TaiAcquisitionInput = {
  acquisitionFees: 675,
  comparablesReviewed: true,
  conditionInspected: true,
  conditionRisk: 2,
  demandStrength: 5,
  expectedRetail: 31995,
  holdingReserve: 495,
  identityVerified: true,
  inventoryNeed: 4,
  marketPosition: 4,
  proposedPurchase: 23400,
  recon: 1650,
  riskReserve: 500,
  sellerAuthorityVerified: true,
  targetGross: 3250,
  titleAndDocs: 300,
  titleReviewed: true,
  transport: 525,
};

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const ratingLabels = ["", "Weak", "Limited", "Balanced", "Strong", "Excellent"];
const expectedVin = "2T3W1RFVXRW333586";

export function TaiAcquisitionTool({ onProgressChange }: { onProgressChange: (progress: TaiWorkflowProgress) => void }) {
  const [input, setInput] = useState(initialInput);
  const [evaluationVersion, setEvaluationVersion] = useState(0);
  const [approval, setApproval] = useState<"DRAFT" | "REQUESTED" | "APPROVED">("DRAFT");
  const [finalPrice, setFinalPrice] = useState(24300);
  const [committed, setCommitted] = useState(false);
  const [vinEvidence, setVinEvidence] = useState<PrototypeVinScanEvidence | null>(null);
  const [notice, setNotice] = useState("Review the sample opportunity and run the first TAI evaluation.");
  const result = useMemo(() => evaluateTaiAcquisition(input), [input]);
  const evaluated = evaluationVersion > 0;
  const eligibleForApproval = evaluated && result.blockers.length === 0 && !["Pass", "Watch", "Hold"].includes(result.recommendation);
  const finalPriceEligible = finalPrice > 0 && finalPrice <= result.purchaseCeiling;

  useEffect(() => {
    onProgressChange({
      appraisalComplete: evaluated && input.conditionInspected && input.comparablesReviewed,
      authorityComplete: approval === "APPROVED",
      commitmentComplete: committed,
      economicsComplete: evaluated,
      identityComplete: input.identityVerified && input.sellerAuthorityVerified,
      titleComplete: input.titleReviewed,
    });
  }, [approval, committed, evaluated, input.comparablesReviewed, input.conditionInspected, input.identityVerified, input.sellerAuthorityVerified, input.titleReviewed, onProgressChange]);

  function updateNumber(field: keyof TaiAcquisitionInput, value: string) {
    setInput((current) => ({ ...current, [field]: Number(value) || 0 }));
    setEvaluationVersion(0);
    setApproval("DRAFT");
    setCommitted(false);
    setNotice("Inputs changed. Run a new TAI evaluation before requesting authority.");
  }

  function updateEvidence(field: keyof TaiAcquisitionInput, checked: boolean) {
    setInput((current) => ({ ...current, [field]: checked }));
    setEvaluationVersion(0);
    setApproval("DRAFT");
    setCommitted(false);
    setNotice("Evidence changed. Run a new TAI evaluation before requesting authority.");
  }

  function applyVinEvidence(evidence: PrototypeVinScanEvidence) {
    setVinEvidence(evidence);
    setInput((current) => ({ ...current, identityVerified: evidence.vinCaptured && evidence.vinMatched }));
    setEvaluationVersion(0);
    setApproval("DRAFT");
    setCommitted(false);
    setNotice(
      evidence.vinCaptured
        ? `${evidence.mode} processed. ${evidence.vinMatched ? "VIN matched the acquisition unit" : "Review the scanned VIN before approval."}${evidence.auctionLocation ? ` Source recognized: ${evidence.auctionLocation}.` : ""}`
        : "No VIN was captured from the provided scan text.",
    );
  }

  function runEvaluation() {
    setEvaluationVersion((current) => current + 1);
    setApproval("DRAFT");
    setCommitted(false);
    setNotice(result.blockers.length ? `TAI found ${result.blockers.length} blocker${result.blockers.length === 1 ? "" : "s"}. Resolve them before authorization.` : `TAI evaluation complete. ${result.explanation}`);
  }

  function requestApproval() {
    if (!eligibleForApproval) return;
    setApproval("REQUESTED");
    setNotice(`Manager review requested for TAI evaluation v${evaluationVersion} and a ${money(result.purchaseCeiling)} ceiling.`);
  }

  function approve() {
    if (approval !== "REQUESTED") return;
    setApproval("APPROVED");
    setNotice(`Acquisition manager approved evaluation v${evaluationVersion} up to ${money(result.purchaseCeiling)}. Record the purchase outcome next.`);
  }

  function recordPurchase() {
    if (approval !== "APPROVED" || !finalPriceEligible) return;
    setCommitted(true);
    setNotice(`Purchase commitment recorded at ${money(finalPrice)}. The Acquisition handoff gate is now ready.`);
  }

  return <section className={styles.taiWorkspace} aria-label="TMS Acquisition Intelligence buyer tool">
    <header className={styles.taiHeader}>
      <div><span><TrendingUp size={15} />TMS Acquisition Intelligence</span><h3>TAI buyer decision workspace</h3><p>Calculate a disciplined purchase ceiling before ownership begins.</p></div>
      <div className={styles.taiVersion}><small>Evaluation</small><strong>{evaluated ? `v${evaluationVersion} · ${approval.toLowerCase()}` : "Draft · not evaluated"}</strong></div>
    </header>

    <div className={styles.taiBody}>
      <div className={styles.taiInputs}>
        <section>
          <header><h4>Opportunity economics</h4><span>Retail-back inputs</span></header>
          <div className={styles.taiFieldGrid}>
            <label><span>Expected retail</span><div><b>$</b><input aria-label="Expected retail" min="0" onChange={(event) => updateNumber("expectedRetail", event.target.value)} type="number" value={input.expectedRetail} /></div></label>
            <label><span>Proposed purchase</span><div><b>$</b><input aria-label="Proposed purchase" min="0" onChange={(event) => updateNumber("proposedPurchase", event.target.value)} type="number" value={input.proposedPurchase} /></div></label>
            <label><span>Target gross</span><div><b>$</b><input aria-label="Target gross" min="0" onChange={(event) => updateNumber("targetGross", event.target.value)} type="number" value={input.targetGross} /></div></label>
            <label><span>Recon estimate</span><div><b>$</b><input aria-label="Recon estimate" min="0" onChange={(event) => updateNumber("recon", event.target.value)} type="number" value={input.recon} /></div></label>
            <label><span>Fees</span><div><b>$</b><input aria-label="Acquisition fees" min="0" onChange={(event) => updateNumber("acquisitionFees", event.target.value)} type="number" value={input.acquisitionFees} /></div></label>
            <label><span>Transport</span><div><b>$</b><input aria-label="Transport" min="0" onChange={(event) => updateNumber("transport", event.target.value)} type="number" value={input.transport} /></div></label>
            <label><span>Title &amp; docs</span><div><b>$</b><input aria-label="Title and documents" min="0" onChange={(event) => updateNumber("titleAndDocs", event.target.value)} type="number" value={input.titleAndDocs} /></div></label>
            <label><span>Holding reserve</span><div><b>$</b><input aria-label="Holding reserve" min="0" onChange={(event) => updateNumber("holdingReserve", event.target.value)} type="number" value={input.holdingReserve} /></div></label>
            <label><span>Risk reserve</span><div><b>$</b><input aria-label="Risk reserve" min="0" onChange={(event) => updateNumber("riskReserve", event.target.value)} type="number" value={input.riskReserve} /></div></label>
          </div>
        </section>

        <section>
          <header><h4>Fit, market, and evidence</h4><span>Buyer-reviewed inputs</span></header>
          <div className={styles.taiEvidenceBlock}>
            <PrototypeVinScanCard
              expectedVin={expectedVin}
              helperText="Use direct VIN scan text or paste Manheim / ADESA windshield details so acquisition identity evidence is captured before approval."
              onEvidenceChange={applyVinEvidence}
              stageLabel="Acquisition"
            />
          </div>
          <div className={styles.taiRatings}>
            {([
              ["demandStrength", "Demand strength"],
              ["inventoryNeed", "TMS inventory need"],
              ["marketPosition", "Market position"],
              ["conditionRisk", "Condition risk"],
            ] as const).map(([field, label]) => <label key={field}><span>{label}<b>{ratingLabels[input[field]]}</b></span><input aria-label={label} max="5" min="1" onChange={(event) => updateNumber(field, event.target.value)} type="range" value={input[field]} /></label>)}
          </div>
          <div className={styles.taiEvidence}>
            {([
              ["identityVerified", vinEvidence?.auctionLocation ? `VIN and identity verified (${vinEvidence.auctionLocation})` : "VIN and identity verified"],
              ["sellerAuthorityVerified", "Seller authority verified"],
              ["titleReviewed", "Title and ownership reviewed"],
              ["conditionInspected", "Condition inspection complete"],
              ["comparablesReviewed", "Comparable set reviewed"],
            ] as const).map(([field, label]) => <label key={field}><input checked={input[field]} onChange={(event) => updateEvidence(field, event.target.checked)} type="checkbox" /><span>{label}</span></label>)}
          </div>
        </section>
      </div>

      <aside className={styles.taiDecision}>
        <header><Gauge /><div><span>TAI recommendation</span><strong>{evaluated ? result.recommendation : "Run evaluation"}</strong></div><em className={result.blockers.length ? styles.taiHold : ""}>{result.acquisitionScore}/100</em></header>
        <dl>
          <div><dt>Purchase ceiling</dt><dd>{money(result.purchaseCeiling)}</dd></div>
          <div><dt>Proposed purchase</dt><dd>{money(input.proposedPurchase)}</dd></div>
          <div><dt>Remaining room</dt><dd className={result.remainingRoom < 0 ? styles.taiNegative : ""}>{money(result.remainingRoom)}</dd></div>
          <div><dt>Total investment</dt><dd>{money(result.totalInvestment)}</dd></div>
          <div><dt>Expected gross</dt><dd>{money(result.expectedGross)}</dd></div>
          <div><dt>Confidence</dt><dd>{result.confidence}</dd></div>
        </dl>
        <p className={styles.taiExplanation}>{evaluated ? result.explanation : "Review the inputs, then freeze a versioned recommendation for approval."}</p>
        {evaluated ? <div className={styles.taiDrivers}>
          <div><strong>Why it works</strong>{result.positiveDrivers.length ? result.positiveDrivers.map((item) => <span key={item}><Check />{item}</span>) : <span>No strong positive driver recorded.</span>}</div>
          <div><strong>Watch items</strong>{result.negativeDrivers.length ? result.negativeDrivers.map((item) => <span key={item}><CircleAlert />{item}</span>) : <span><Check />No material watch item.</span>}</div>
        </div> : null}
        <button className={styles.taiPrimary} onClick={runEvaluation} type="button"><Calculator />{evaluated ? "Run revised evaluation" : "Run TAI evaluation"}</button>
      </aside>
    </div>

    <section className={styles.taiApproval}>
      <div><span><LockKeyhole />Step 1</span><strong>Request exact-ceiling authority</strong><small>{eligibleForApproval ? `Evaluation v${evaluationVersion} is eligible for manager review.` : "Run an eligible evaluation with no blockers."}</small><button disabled={!eligibleForApproval || approval !== "DRAFT"} onClick={requestApproval} type="button">Submit for approval</button></div>
      <div><span><ShieldCheck />Step 2</span><strong>Independent manager decision</strong><small>{approval === "REQUESTED" ? `Review ceiling of ${money(result.purchaseCeiling)}.` : approval === "APPROVED" ? "Approved for this exact evaluation." : "Waiting for buyer submission."}</small><button disabled={approval !== "REQUESTED"} onClick={approve} type="button">Approve ceiling</button></div>
      <div><span><BadgeCheck />Step 3</span><strong>Record accepted purchase</strong><small>{approval === "APPROVED" ? `Must be at or below ${money(result.purchaseCeiling)}.` : "Manager authority is required first."}</small><label><span className="sr-only">Final purchase price</span><b>$</b><input aria-label="Final purchase price" min="0" onChange={(event) => { setFinalPrice(Number(event.target.value) || 0); setCommitted(false); }} type="number" value={finalPrice} /></label><button disabled={approval !== "APPROVED" || !finalPriceEligible || committed} onClick={recordPurchase} type="button">{committed ? "Purchase recorded" : "Record purchase"}</button></div>
    </section>

    <footer className={styles.taiNotice} aria-live="polite"><CircleAlert />{notice}</footer>
  </section>;
}
