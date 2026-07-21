"use client";

import { AlertTriangle, ClipboardCheck, FileText, PackageCheck, Send, ShieldAlert, UserCheck, Wrench } from "lucide-react";
import Link from "next/link";

import styles from "./diagnostics.module.css";

const reviewPackets = [
  { label: "Repair estimate", state: "Review packet only", detail: "Draft lines, strategy output, lineage checksums, and tax boundary." },
  { label: "Parts", state: "Parts authority required", detail: "Demand candidates only; no reservation, purchase, or substitute approval." },
  { label: "Dispatch capacity", state: "Read-only capacity", detail: "Skill, bay, tool, and cycle-time impact without assignment or scheduling." },
  { label: "Customer / insurance", state: "Draft language", detail: "Advisor-editable explanation package; send/submission blocked." },
  { label: "Quality control", state: "Verification planning", detail: "QC review packet without case closure authority." }
];

export function DiagnosticAdvisorReviewConsole() {
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
        </main>

        <aside className={styles.reviewRail}>
          <section>
            <h2><UserCheck /> Advisor actions</h2>
            <button type="button">Review draft package</button>
            <button type="button">Request technician clarification</button>
            <button type="button">Route to manager review</button>
            <small>Actions are staged for workflow integration; no customer estimate mutation is performed here.</small>
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
          <Link href="/diagnostics">Back to Diagnostics Command Center</Link>
        </aside>
      </div>
    </section>
  );
}
