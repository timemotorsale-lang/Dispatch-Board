import { CarFront, Check, ChevronRight } from "lucide-react";
import Link from "next/link";

const prototypeStages = ["Intake", "Diagnose", "Estimate", "Approval", "Vendor Repair", "Final QC", "Handoff"];

export default function RepairWorkbenchSummaryCardPrototypePage() {
  return (
    <section className="rowb-shell" aria-label="Vehicle summary card prototype">
      <div className="panel-card page-stack" style={{ margin: "14px" }}>
        <header className="page-copy">
          <span className="eyebrow">Prototype review</span>
          <h1>Vehicle summary card</h1>
          <p>
            This is the compact operational card for staff review. It keeps the vehicle card simple,
            shows where recon is, and keeps the detailed record available only when needed.
          </p>
        </header>
      </div>

      <section className="rowb-summary-card" aria-label="Prototype summary card">
        <div className="rowb-summary-top">
          <div className="rowb-summary-vehicle">
            <span className="rowb-summary-icon"><CarFront /></span>
            <div>
              <small>Inventory recon</small>
              <h2>2019 HONDA Accord</h2>
              <p>RO-8534C883 · 033428</p>
            </div>
          </div>
          <div className="rowb-summary-status">
            <span>Ready for Final QC</span>
            <strong>Vendor repaired and returned</strong>
            <p>Open Final QC to record pass/fail, complete recon, and hand off the vehicle.</p>
          </div>
          <div className="rowb-summary-actions">
            <Link className="primary" href="/vehicles/quality-control?repairOrderId=ro-prototype">
              Continue to Final QC
              <ChevronRight />
            </Link>
            <a href="#repair-order-details">View full details</a>
          </div>
        </div>

        <dl className="rowb-summary-facts">
          <div><dt>Custody / location</dt><dd>Time Motor Sales - Minneapolis</dd></div>
          <div><dt>Owner</dt><dd>Walter Hernandez</dd></div>
          <div><dt>Target</dt><dd>8/21/2026, 10:54 AM</dd></div>
          <div><dt>Vendor amount</dt><dd>$1,650.00</dd></div>
        </dl>

        <div className="rowb-summary-rail" aria-label="Recon progress">
          {prototypeStages.map((stage, index) => (
            <span className={index < 5 ? "done" : index === 5 ? "current" : "next"} key={stage}>
              <i>{index < 5 ? <Check /> : index + 1}</i>
              {stage}
            </span>
          ))}
        </div>

        <details className="rowb-summary-details" id="repair-order-details" open>
          <summary>
            <span>Full repair order details</span>
            <strong>Open the deeper record when staff need vendor notes, approvals, amounts, and QC context.</strong>
          </summary>
          <div>
            <article>
              <small>Vehicle information</small>
              <strong>2019 HONDA Accord</strong>
              <span>VIN 1HGCV1F1XKA033428 · RO Version 11</span>
            </article>
            <article>
              <small>Vendor progress</small>
              <strong>Simba Collision</strong>
              <span>Simba Collision completed the approved repair and returned the vehicle.</span>
            </article>
            <article>
              <small>Approved work</small>
              <strong>Approved</strong>
              <span>Timing chain repair completed. Approval and payable vendor record remain on the RO.</span>
            </article>
            <article>
              <small>Repair outcome</small>
              <strong>Vendor repaired and returned</strong>
              <span>The vehicle is ready for Final QC pass/fail before recon completion and handoff.</span>
            </article>
          </div>
        </details>
      </section>
    </section>
  );
}
