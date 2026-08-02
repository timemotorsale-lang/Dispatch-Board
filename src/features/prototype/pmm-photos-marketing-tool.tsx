"use client";

import {
  BadgeCheck,
  Camera,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileText,
  Megaphone,
  ShieldCheck,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";

export type PmmWorkflowProgress = {
  blockerCount: number;
  complianceComplete: boolean;
  listingComplete: boolean;
  mediaComplete: boolean;
  pricingComplete: boolean;
  publicationComplete: boolean;
  recommendation: "Capture media" | "Verify specs" | "Write listing" | "Approve pricing" | "Complete compliance review" | "Publish channels" | "Ready for Title Readiness";
  specsComplete: boolean;
  trailCount: number;
};

type StepKey = "media" | "specs" | "listing" | "pricing" | "compliance" | "publish";
type TrailEntry = { actor: string; evidence: string; result: string; step: StepKey; timestamp: string };
type PricingState = "Pending approval" | "Approved" | "Exception review";
type PublicationState = "Not published" | "Published to website" | "Published to all channels";

type MarketingInput = {
  cargoAndDefectPhotosCaptured: boolean;
  channelPackageVerified: boolean;
  complianceClaimsReviewed: boolean;
  complianceDisclosuresReviewed: boolean;
  equipmentAndSpecsVerified: boolean;
  exteriorInteriorPhotoSetCaptured: boolean;
  featurePhotosCaptured: boolean;
  floorPriceProtected: boolean;
  listingCopyApproved: boolean;
  listingStoryWritten: boolean;
  marketInputsReviewed: boolean;
  pricingState: PricingState;
  privacyAndPlateReviewComplete: boolean;
  publicationState: PublicationState;
  titleOrSafetyHoldCleared: boolean;
  vinAndDashPhotosCaptured: boolean;
};

const initialInput: MarketingInput = {
  cargoAndDefectPhotosCaptured: false,
  channelPackageVerified: false,
  complianceClaimsReviewed: false,
  complianceDisclosuresReviewed: false,
  equipmentAndSpecsVerified: false,
  exteriorInteriorPhotoSetCaptured: false,
  featurePhotosCaptured: false,
  floorPriceProtected: false,
  listingCopyApproved: false,
  listingStoryWritten: false,
  marketInputsReviewed: false,
  pricingState: "Pending approval",
  privacyAndPlateReviewComplete: false,
  publicationState: "Not published",
  titleOrSafetyHoldCleared: false,
  vinAndDashPhotosCaptured: false,
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

function evaluateMarketing(input: MarketingInput) {
  const mediaComplete = input.exteriorInteriorPhotoSetCaptured && input.featurePhotosCaptured && input.vinAndDashPhotosCaptured && input.cargoAndDefectPhotosCaptured;
  const specsComplete = input.equipmentAndSpecsVerified;
  const listingComplete = input.listingStoryWritten && input.listingCopyApproved;
  const pricingComplete = input.marketInputsReviewed && input.floorPriceProtected && input.pricingState === "Approved";
  const complianceComplete = input.complianceClaimsReviewed && input.complianceDisclosuresReviewed && input.privacyAndPlateReviewComplete && input.titleOrSafetyHoldCleared;
  const publicationComplete = input.publicationState === "Published to website" || input.publicationState === "Published to all channels";
  const channelsReleased = input.publicationState === "Published to all channels";

  const blockers = [
    !mediaComplete ? "Required media set is still incomplete." : null,
    !specsComplete ? "Canonical specifications and observed equipment are not yet verified." : null,
    !listingComplete ? "Listing copy has not been fully written and approved." : null,
    !pricingComplete ? "Pricing inputs or approval are still incomplete." : null,
    !complianceComplete ? "Compliance review, disclosure review, privacy review, or safety/title hold is still open." : null,
    !publicationComplete ? "The merchandising package has not yet been published." : null,
  ].filter((item): item is string => Boolean(item));

  const recommendation: PmmWorkflowProgress["recommendation"] =
    !mediaComplete ? "Capture media"
      : !specsComplete ? "Verify specs"
        : !listingComplete ? "Write listing"
          : !pricingComplete ? "Approve pricing"
            : !complianceComplete ? "Complete compliance review"
              : !publicationComplete ? "Publish channels"
                : "Ready for Title Readiness";

  const positiveDrivers = [
    mediaComplete ? "The required merchandising photo set is complete." : null,
    specsComplete ? "Canonical vehicle facts and observed equipment are reconciled." : null,
    listingComplete ? "Listing story and copy are approved." : null,
    pricingComplete ? "Pricing strategy, cost floor, and approval are locked." : null,
    complianceComplete ? "Claims, disclosures, privacy, and hold review are complete." : null,
    publicationComplete ? `Publication package is live${channelsReleased ? " across all channels" : " on the website"}.` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    blockerCount: blockers.length,
    blockers,
    complianceComplete,
    listingComplete,
    mediaComplete,
    positiveDrivers,
    pricingComplete,
    publicationComplete,
    recommendation,
    specsComplete,
  };
}

export function PmmPhotosMarketingTool({ onProgressChange }: { onProgressChange: (progress: PmmWorkflowProgress) => void }) {
  const [input, setInput] = useState(initialInput);
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    compliance: false,
    listing: false,
    media: false,
    pricing: false,
    publish: false,
    specs: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Start Photos & Marketing by completing the required media set before copy, pricing, and publication move forward.");
  const result = useMemo(() => evaluateMarketing(input), [input]);

  useEffect(() => {
    onProgressChange({
      blockerCount: result.blockerCount,
      complianceComplete: completedSteps.compliance && result.complianceComplete,
      listingComplete: completedSteps.listing && result.listingComplete,
      mediaComplete: completedSteps.media && result.mediaComplete,
      pricingComplete: completedSteps.pricing && result.pricingComplete,
      publicationComplete: completedSteps.publish && result.publicationComplete,
      recommendation: result.recommendation,
      specsComplete: completedSteps.specs && result.specsComplete,
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
      const order: StepKey[] = ["media", "specs", "listing", "pricing", "compliance", "publish"];
      const startIndex = order.indexOf(step);
      order.forEach((key, index) => {
        if (index >= startIndex && current[key]) {
          next[key] = false;
          reopened = true;
        }
      });
      return next;
    });
    if (reopened) appendTrail(step, "System", message, "Marketing control reopened");
    setNotice(message);
  }

  function updateBoolean<K extends keyof MarketingInput>(field: K, value: MarketingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Photos & Marketing facts changed. Reconfirm this step and every downstream merchandising control.");
  }

  function updateValue<K extends keyof MarketingInput>(field: K, value: MarketingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Photos & Marketing facts changed. Reconfirm this step and every downstream merchandising control.");
  }

  function completeMedia() {
    if (!result.mediaComplete) return;
    setCompletedSteps((current) => ({ ...current, media: true }));
    appendTrail("media", "Photographer", "Required exterior, interior, feature, VIN, dash, cargo, and defect media were captured.", "Photo set");
    setNotice("Media is complete. Verify canonical specifications next.");
  }

  function completeSpecs() {
    if (!completedSteps.media || !result.specsComplete) return;
    setCompletedSteps((current) => ({ ...current, specs: true }));
    appendTrail("specs", "Merchandiser", "Decoded vehicle facts and observed equipment were reconciled.", "Spec review");
    setNotice("Specifications are complete. Finish the listing copy next.");
  }

  function completeListing() {
    if (!completedSteps.specs || !result.listingComplete) return;
    setCompletedSteps((current) => ({ ...current, listing: true }));
    appendTrail("listing", "Merchandiser", "Listing story and approved copy were completed for publication.", "Listing copy");
    setNotice("Listing content is complete. Lock pricing inputs next.");
  }

  function completePricing() {
    if (!completedSteps.listing || !result.pricingComplete) return;
    setCompletedSteps((current) => ({ ...current, pricing: true }));
    appendTrail("pricing", "Manager", "Pricing inputs, cost floor, and governed approval were locked.", "Pricing approval");
    setNotice("Pricing is complete. Finish compliance review next.");
  }

  function completeCompliance() {
    if (!completedSteps.pricing || !result.complianceComplete) return;
    setCompletedSteps((current) => ({ ...current, compliance: true }));
    appendTrail("compliance", "Compliance", "Claims, disclosures, privacy review, and title or safety hold checks were completed.", "Media review");
    setNotice("Compliance is complete. Publish and verify channels next.");
  }

  function completePublish() {
    if (!completedSteps.compliance || !result.publicationComplete) return;
    setCompletedSteps((current) => ({ ...current, publish: true }));
    appendTrail("publish", "Merchandiser", `Merchandising package was published${input.publicationState === "Published to all channels" ? " across all channels" : " to the website"}.`, "Publication proof");
    setNotice("Photos & Marketing is complete. The vehicle can now move into Title Readiness.");
  }

  const detailingHref = `/vehicles/inventory/prototype`;
  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  return <section className={styles.wopWorkspace} aria-label="TMS Photos and Marketing workspace">
    <header className={styles.wopHeader}>
      <div>
        <span><Megaphone size={15} />TMS Photos &amp; Marketing</span>
        <h3>PMM merchandising workspace</h3>
        <p>Guide the merchandising team through media capture, specs, listing copy, pricing, compliance, and publication.</p>
        <div className={styles.wopHeaderActions}>
          <Link className={styles.wopHeaderLink} href={detailingHref}><Camera size={14} />Return to lifecycle</Link>
        </div>
      </div>
      <div className={styles.wopVersion}>
        <small>Media state</small>
        <strong>{result.recommendation}</strong>
      </div>
    </header>

    <div className={styles.wopBody}>
      <div className={styles.wopSteps}>
        <section className={styles.wopStepCard}>
          <header><div><span>Step 1</span><h4>Capture the required media set</h4></div><em className={completedSteps.media ? styles.wopComplete : ""}>{completedSteps.media ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.exteriorInteriorPhotoSetCaptured} onChange={(event) => updateBoolean("exteriorInteriorPhotoSetCaptured", event.target.checked, "media")} type="checkbox" /><span>Exterior and interior photo set captured</span></label>
            <label><input checked={input.featurePhotosCaptured} onChange={(event) => updateBoolean("featurePhotosCaptured", event.target.checked, "media")} type="checkbox" /><span>Feature and option photos captured</span></label>
            <label><input checked={input.vinAndDashPhotosCaptured} onChange={(event) => updateBoolean("vinAndDashPhotosCaptured", event.target.checked, "media")} type="checkbox" /><span>VIN and dash photos captured</span></label>
            <label><input checked={input.cargoAndDefectPhotosCaptured} onChange={(event) => updateBoolean("cargoAndDefectPhotosCaptured", event.target.checked, "media")} type="checkbox" /><span>Cargo and disclosure-defect photos captured</span></label>
          </div>
          <button className={styles.wopAction} disabled={!result.mediaComplete || completedSteps.media} onClick={completeMedia} type="button">Lock media set</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 2</span><h4>Verify canonical specifications</h4></div><em className={completedSteps.specs ? styles.wopComplete : ""}>{completedSteps.specs ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.equipmentAndSpecsVerified} onChange={(event) => updateBoolean("equipmentAndSpecsVerified", event.target.checked, "specs")} type="checkbox" /><span>Decoded facts and observed equipment were verified</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.media || !result.specsComplete || completedSteps.specs} onClick={completeSpecs} type="button">Lock specifications</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 3</span><h4>Write accurate listing content</h4></div><em className={completedSteps.listing ? styles.wopComplete : ""}>{completedSteps.listing ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.listingStoryWritten} onChange={(event) => updateBoolean("listingStoryWritten", event.target.checked, "listing")} type="checkbox" /><span>Listing story and value message were written</span></label>
            <label><input checked={input.listingCopyApproved} onChange={(event) => updateBoolean("listingCopyApproved", event.target.checked, "listing")} type="checkbox" /><span>Listing copy was approved for publication</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.specs || !result.listingComplete || completedSteps.listing} onClick={completeListing} type="button"><FileText size={14} />Lock listing copy</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 4</span><h4>Set governed pricing inputs</h4></div><em className={completedSteps.pricing ? styles.wopComplete : ""}>{completedSteps.pricing ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Pricing state</span><select onChange={(event) => updateValue("pricingState", event.target.value as PricingState, "pricing")} value={input.pricingState}><option>Pending approval</option><option>Approved</option><option>Exception review</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.marketInputsReviewed} onChange={(event) => updateBoolean("marketInputsReviewed", event.target.checked, "pricing")} type="checkbox" /><span>Market data and strategy inputs reviewed</span></label>
            <label><input checked={input.floorPriceProtected} onChange={(event) => updateBoolean("floorPriceProtected", event.target.checked, "pricing")} type="checkbox" /><span>Cost floor and margin guardrail protected</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.listing || !result.pricingComplete || completedSteps.pricing} onClick={completePricing} type="button"><Tags size={14} />Lock pricing</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 5</span><h4>Complete compliance review</h4></div><em className={completedSteps.compliance ? styles.wopComplete : ""}>{completedSteps.compliance ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.complianceClaimsReviewed} onChange={(event) => updateBoolean("complianceClaimsReviewed", event.target.checked, "compliance")} type="checkbox" /><span>Claims and representation review complete</span></label>
            <label><input checked={input.complianceDisclosuresReviewed} onChange={(event) => updateBoolean("complianceDisclosuresReviewed", event.target.checked, "compliance")} type="checkbox" /><span>Disclosure review complete</span></label>
            <label><input checked={input.privacyAndPlateReviewComplete} onChange={(event) => updateBoolean("privacyAndPlateReviewComplete", event.target.checked, "compliance")} type="checkbox" /><span>Privacy and plate review complete</span></label>
            <label><input checked={input.titleOrSafetyHoldCleared} onChange={(event) => updateBoolean("titleOrSafetyHoldCleared", event.target.checked, "compliance")} type="checkbox" /><span>Title or safety hold reviewed for publication</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.pricing || !result.complianceComplete || completedSteps.compliance} onClick={completeCompliance} type="button">Lock compliance review</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 6</span><h4>Publish and verify channels</h4></div><em className={completedSteps.publish ? styles.wopComplete : ""}>{completedSteps.publish ? "Published" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Publication state</span><select onChange={(event) => updateValue("publicationState", event.target.value as PublicationState, "publish")} value={input.publicationState}><option>Not published</option><option>Published to website</option><option>Published to all channels</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.channelPackageVerified} onChange={(event) => updateBoolean("channelPackageVerified", event.target.checked, "publish")} type="checkbox" /><span>Published package was verified in channel output</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.compliance || !result.publicationComplete || !input.channelPackageVerified || completedSteps.publish} onClick={completePublish} type="button">Release publication</button>
        </section>
      </div>

      <aside className={styles.wopDecision}>
        <header><Megaphone size={18} /><div><span>Marketing recommendation</span><strong>{result.recommendation}</strong></div><em className={result.recommendation === "Ready for Title Readiness" ? styles.wopComplete : result.recommendation === "Complete compliance review" ? styles.wopHold : ""}>{stepCount}/6</em></header>
        <dl>
          <div><dt>Controls complete</dt><dd>{stepCount}/6</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockerCount}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
          <div><dt>Pricing state</dt><dd>{input.pricingState}</dd></div>
          <div><dt>Publication state</dt><dd>{input.publicationState}</dd></div>
          <div><dt>Channel verification</dt><dd>{input.channelPackageVerified ? "Verified" : "Pending"}</dd></div>
        </dl>
        <p className={styles.wopExplanation}>{result.recommendation === "Ready for Title Readiness" ? "Media, content, pricing, compliance, and publication are complete. The unit can move into Title Readiness." : "Photos & Marketing should remain controlled until every media, compliance, and publication requirement is satisfied."}</p>
        <div className={styles.wopDrivers}>
          <div>
            <strong>What is working</strong>
            {(result.positiveDrivers.length ? result.positiveDrivers : ["No confirmed merchandising strength yet."]).map((item) => <span key={item}>{result.positiveDrivers.length ? <Check size={14} /> : <CircleAlert size={14} />}{item}</span>)}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.blockers.map((item) => <span key={item}><CircleAlert size={14} />{item}</span>)}
          </div>
        </div>
        <section className={styles.wopTrail}>
          <header><Clock3 size={18} /><h4>Operational work trail</h4></header>
          {trail.length ? <ul>{trail.map((item, index) => <li key={`${item.step}-${item.timestamp}-${index}`}><strong>{item.timestamp}</strong><span>{item.actor}</span><div>{item.result}</div><small>{item.evidence}</small></li>)}</ul> : <p>No merchandising action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.wopApproval}>
      <div>
        <span><ClipboardCheck size={14} />Media package</span>
        <strong>{completedSteps.media ? "Media set complete" : "Media still active"}</strong>
        <small>The required photo set should be complete before copy and publication controls move forward.</small>
      </div>
      <div>
        <span><ShieldCheck size={14} />Compliance and publication</span>
        <strong>{completedSteps.compliance ? "Compliance cleared" : "Compliance still active"}</strong>
        <small>Claims, disclosures, privacy, and hold review should be complete before channel release.</small>
      </div>
      <div>
        <span><BadgeCheck size={14} />Stage readiness</span>
        <strong>{completedSteps.publish ? "Ready for Title Readiness" : "Photos & Marketing still active"}</strong>
        <small>{completedSteps.publish ? "This unit can now hand off into the Title Readiness stage." : "Finish publication and channel verification before the lifecycle handoff opens."}</small>
      </div>
    </section>

    <footer className={styles.wopNotice} aria-live="polite"><CircleAlert size={14} />{notice}</footer>
  </section>;
}
