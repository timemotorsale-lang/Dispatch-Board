"use client";

import { AlertTriangle, ClipboardCheck, FileText, PackageCheck, Send, ShieldAlert, UserCheck, Wrench } from "lucide-react";
import { useState } from "react";

import styles from "./diagnostics.module.css";

const reviewPackets = [
  { label: "Repair estimate", state: "Review packet only", detail: "Draft lines, strategy output, lineage checksums, and tax boundary." },
  { label: "Parts", state: "Parts authority required", detail: "Demand candidates only; no reservation, purchase, or substitute approval." },
  { label: "Dispatch capacity", state: "Read-only capacity", detail: "Skill, bay, tool, and cycle-time impact without assignment or scheduling." },
  { label: "Customer / insurance", state: "Draft language", detail: "Advisor-editable explanation package; send/submission blocked." },
  { label: "Quality control", state: "Verification planning", detail: "QC review packet without case closure authority." }
];

type AdvisorReviewContext = {
  operation: { complexity: string; id: string; likelyHours: number; title: string; verification: string[] } | null;
  repairOrder: { concern: string; id: string; repairOrderNumber: string; vehicle: string } | null;
} | null;

export function DiagnosticAdvisorReviewConsole({ context = null }: { context?: AdvisorReviewContext }) {
  const [packageOpen, setPackageOpen] = useState(Boolean(context));
  return (
    <section className={styles.reviewConsole} aria-label="Diagnostic Advisor Review Console">
      <header className={styles.reviewHero}>
        <div>
          <span className={styles.eyebrow}>Advisor review workflow · DGN-047</span>
          <h1>Advisor Review Console</h1>
          <p>Review confirmed-diagnosis estimate intelligence before anything becomes customer-facing, insurance-facing, dispatched, authorized, or ordered.</p>
        </div>
        <div className={styles.reviewGateCard}>
          <ShieldAlert />
          <strong>Controlled pilot gate</strong>
          <span>Internal review only</span>
        </div>
      </header>

      <div className={styles.reviewGrid}>
        <main className={styles.reviewMain}>
          {context ? <section className={styles.reviewContextPanel}>
            <header><FileText /><div><h2>Selected review context</h2><p>Context received from the governed Labor Guide handoff.</p></div></header>
            <dl><div><dt>Repair order</dt><dd>{context.repairOrder?.repairOrderNumber ?? "Not linked"}</dd></div><div><dt>Vehicle</dt><dd>{context.repairOrder?.vehicle ?? "Not linked"}</dd></div><div><dt>Customer concern</dt><dd>{context.repairOrder?.concern ?? "Use the diagnostic case concern"}</dd></div><div><dt>Labor operation</dt><dd>{context.operation?.title ?? "Not selected"}</dd></div><div><dt>Guide time</dt><dd>{context.operation ? `${context.operation.likelyHours.toFixed(1)} hours · ${context.operation.complexity}` : "Not evaluated"}</dd></div><div><dt>Authority</dt><dd>Advisor review only</dd></div></dl>
          </section> : null}

          <section className={styles.reviewStagePanel}>
            <header><ClipboardCheck /><div><h2>Diagnosis-to-estimate review flow</h2><p>Simple path for the advisor: understand, verify, edit, then decide what can move forward.</p></div></header>
            <ol className={styles.reviewSteps}>
              <li><strong>Confirmed diagnosis</strong><span>Cause, proof, limitations, risk tier, and verification requirement.</span></li>
              <li><strong>Repair package</strong><span>Correction, labor operations, parts demand, required skills, tools, and hazards.</span></li>
              <li><strong>Estimate intelligence</strong><span>Selected strategy, labor guide recommendation, economics, GP safeguards, and capacity impact.</span></li>
              <li><strong>Advisor decision</strong><span>Approve for downstream review, request technician change, manager review, or hold.</span></li>
            </ol>
          </section>

          <section className={styles.reviewPacketPanel}>
            <header><PackageCheck /><div><h2>DGN-044 downstream packets</h2><p>Every packet remains review-only until the owning authority accepts it.</p></div></header>
            <div className={styles.reviewPacketGrid}>
              {reviewPackets.map((packet) => (
                <article key={packet.label}>
                  <strong>{packet.label}</strong>
                  <span>{packet.state}</span>
                  <p>{packet.detail}</p>
                </article>
              ))}
            </div>
          </section>

          {packageOpen ? <section className={styles.reviewPackageDetail} aria-label="Advisor draft package detail">
            <header><ClipboardCheck /><div><h2>Draft package review</h2><p>Inspect the selected operation and verification requirements before choosing a downstream route.</p></div></header>
            <div><article><strong>Operation</strong><span>{context?.operation?.title ?? "No Labor Guide operation was supplied."}</span></article><article><strong>Repair-order concern</strong><span>{context?.repairOrder?.concern ?? "No repair order was supplied."}</span></article><article><strong>Verification gate</strong><span>{context?.operation?.verification.join(" · ") || "Verification requirements must be established before presentation."}</span></article><article><strong>Next decision</strong><span>Clarify with the technician, route to manager review, or hold the package.</span></article></div>
          </section> : null}
        </main>

        <aside className={styles.reviewRail}>
          <section>
            <h2><UserCheck /> Advisor actions</h2>
            <button aria-expanded={packageOpen} onClick={() => setPackageOpen((current) => !current)} type="button">{packageOpen ? "Hide draft package" : "Review draft package"}</button>
            <a href={context?.repairOrder ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(context.repairOrder.id)}` : "/diagnostics"}>Request technician clarification</a>
            <a href="/manager-review">Route to manager review</a>
            <small>These actions open the authoritative owning workflows; no customer estimate mutation is performed here.</small>
          </section>
          <section>
            <h2><AlertTriangle /> Blocked by design</h2>
            <ul>
              <li><Send /> Customer presentation</li>
              <li><FileText /> Insurer submission</li>
              <li><Wrench /> Technician dispatch</li>
              <li><PackageCheck /> Parts order or reservation</li>
            </ul>
          </section>
          <a href="/diagnostics">Back to Diagnostics Command Center</a>
        </aside>
      </div>
    </section>
  );
}
