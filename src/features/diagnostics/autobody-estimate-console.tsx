"use client";

import { AlertTriangle, Camera, CarFront, ClipboardList, Gauge, ImageUp, Layers3, Paintbrush, Ruler, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";

import styles from "./diagnostics.module.css";

const damageZones = ["Front bumper cover", "Left fender", "Hood edge", "Headlamp mount", "Radar/ADAS area"];
const estimateLines = [
  ["Body labor", "Repair/replace damaged panel operations", "Draft"],
  ["Refinish", "Paint, blend, material visibility", "Draft"],
  ["Structural", "Frame/measurement gate when needed", "Review"],
  ["ADAS", "Calibration and scan requirement", "Blocked until verified"]
];

export function DiagnosticAutobodyEstimateConsole() {
  return (
    <section className={styles.bodyConsole} aria-label="Autobody Estimate Intelligence Console">
      <header className={styles.bodyHero}>
        <div>
          <span className={styles.eyebrow}>Autobody estimate intelligence · DGN-048 planning carried into workflow</span>
          <h1>Autobody Estimate Console</h1>
          <p>Insurance-quality bodywork draft workspace for photo intake, damage mapping, operation planning, refinish logic, supplement risk, and ADAS gates.</p>
        </div>
        <div className={styles.bodyStatus}>
          <ShieldAlert />
          <strong>Photo-to-estimate is gated</strong>
          <span>Review UI only · no insurer submission</span>
        </div>
      </header>

      <div className={styles.bodyGrid}>
        <section className={styles.photoIntakePanel}>
          <header><ImageUp /><div><h2>Photo intake</h2><p>Designed for uploaded damage photos; current implementation keeps analysis in review mode until approved models and QA are ready.</p></div></header>
          <div className={styles.photoSlots}>
            <article><Camera /><strong>Front impact</strong><span>Required</span></article>
            <article><Camera /><strong>Left angle</strong><span>Required</span></article>
            <article><Camera /><strong>VIN / label</strong><span>Required</span></article>
            <article><Camera /><strong>Close-up damage</strong><span>Required</span></article>
          </div>
        </section>

        <section className={styles.damageMapPanel}>
          <header><CarFront /><div><h2>Damage map</h2><p>Visual zone review before labor, refinish, structural, or supplement assumptions are trusted.</p></div></header>
          <div className={styles.damageMap}>
            <div className={styles.vehicleSilhouette}><CarFront /></div>
            <ul>{damageZones.map((zone) => <li key={zone}><span />{zone}</li>)}</ul>
          </div>
        </section>

        <section className={styles.bodyEstimatePanel}>
          <header><ClipboardList /><div><h2>Body / collision estimate builder</h2><p>Use body labor guide minutes, vendor quote reality, TAI recon budget discipline, and supplement control before the work is released.</p></div></header>
          <div className={styles.bodyEstimateLines}>
            {estimateLines.map(([label, detail, state]) => (
              <article key={label}>
                <strong>{label}</strong>
                <p>{detail}</p>
                <span>{state}</span>
              </article>
            ))}
          </div>
        </section>

        <aside className={styles.bodyRail}>
          <section><h2><Layers3 /> Productivity logic</h2><p>Panel grouping, blend overlap, teardown dependencies, parts delay, vendor sublet, supplement risk, and cycle-time pressure should all shape the next action.</p></section>
          <section><h2><Paintbrush /> Refinish logic</h2><p>Paint/material visibility, blend adjacency, masking, hazardous material, and booth capacity remain estimator-review items, but should stay simple enough for fast recon execution.</p></section>
          <section><h2><Ruler /> Structural / ADAS gate</h2><p>Frame measurements, pre/post scans, calibration, and safety-critical conditions require explicit review before estimate movement, while pure bodywork can skip troubleshooting diagnosis.</p></section>
          <section className={styles.bodyWarning}><AlertTriangle /><span>Not an insurer submission tool yet. Not a final estimate. Not an authorization request.</span></section>
          <Link href="/diagnostics/labor-guide"><Gauge /> Open Body Labor Guide</Link>
          <Link href="/vehicles/shop-planning"><Sparkles /> Open Recon Estimate Planning</Link>
        </aside>
      </div>
    </section>
  );
}
