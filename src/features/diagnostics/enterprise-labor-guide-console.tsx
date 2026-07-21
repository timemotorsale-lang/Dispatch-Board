"use client";

import { AlertTriangle, BadgeCheck, BarChart3, CarFront, CheckCircle2, FileText, History, Info, Layers3, Search, Settings2, ShieldAlert, Wrench } from "lucide-react";

import styles from "./diagnostics.module.css";

const systems = [
  { label: "Engine & Cooling", open: true },
  { label: "Cooling System" },
  { label: "Charging System", open: true },
  { label: "Replace Alternator Assembly", selected: true },
  { label: "Battery & Cables" },
  { label: "Accessory Drive Belt" },
  { label: "Fuel Injection & Ignition" },
  { label: "Engine Mechanical" },
  { label: "Exhaust System" },
  { label: "Electrical" },
  { label: "Drivetrain" },
  { label: "Brakes" },
  { label: "Suspension & Steering" }
];

const laborSources = [
  { label: "OEM Time", value: "1.8", note: "Warranty time · 1.8 hrs" },
  { label: "Aftermarket Guide", value: "2.1", note: "Guide source · Motor" },
  { label: "Shop Historical Actuals", value: "2.0", note: "95% confidence · last 12 months" }
];

const requirements = [
  ["Skill Level", "Technician"],
  ["Primary Tools", "Hand tools, torque wrench"],
  ["Special Tools", "None"],
  ["Bay Type", "General repair bay"],
  ["Lift Required", "No"]
];

export function EnterpriseLaborGuideConsole() {
  return (
    <section className={styles.laborGuideConsole} aria-label="Enterprise Labor Guide Intelligence Console">
      <header className={styles.laborGuideTopbar}>
        <div>
          <span className={styles.eyebrow}>Enterprise Labor Guide Intelligence</span>
          <h1>Labor Guide</h1>
          <p>Review VIN-specific labor, overlap, dynamic rate, GP safeguard, and advisor draft impact before anything becomes customer-facing.</p>
        </div>
        <div className={styles.laborGuideStatus}>
          <span><i aria-hidden="true" />System online</span>
          <strong>Preview foundation</strong>
        </div>
      </header>

      <section className={styles.laborGuideContextBar} aria-label="Active vehicle and repair order context">
        <label className={styles.laborGuideSearch}>
          <Search size={17} />
          <span className="sr-only">VIN or YMM search</span>
          <input readOnly value="1FTFW1E84KFC12345" />
        </label>
        <div className={styles.laborVehicleCard}>
          <CarFront size={34} />
          <span><strong>2018 Ford F-150 3.5L V6 EcoBoost</strong><small>Engine Code: EcoBoost V6</small></span>
        </div>
        <div className={styles.laborRoCard}>
          <strong>Active RO #3411</strong>
          <small>Opened: May 20, 2025 · 9:41 AM</small>
        </div>
      </section>

      <div className={styles.laborGuideGrid}>
        <aside className={styles.operationNavigator}>
          <header><span>1</span><strong>System / Operation Navigator</strong></header>
          <label className={styles.navigatorSearch}><Search size={15} /><input readOnly value="Search systems & operations" /></label>
          <nav aria-label="Labor operation hierarchy">
            {systems.map((item) => (
              <button className={item.selected ? styles.selectedOperation : ""} key={item.label} type="button">
                <span>{item.open ? "▾" : item.selected ? "•" : "▸"}</span>{item.label}{item.selected ? <i aria-hidden="true" /> : null}
              </button>
            ))}
          </nav>
          <div className={styles.vehicleDiagramCard}>
            <div className={styles.vehicleSketch}><Wrench aria-hidden="true" /></div>
            <button type="button">View diagram</button>
          </div>
        </aside>

        <main className={styles.laborEnginePanel}>
          <header><span>2</span><div><strong>Labor Intelligence Engine</strong><small><Info size={13} /> explainable draft calculations</small></div></header>
          <div className={styles.operationName}><strong>Labor Operation:</strong> Replace Alternator Assembly <span>R&R</span></div>

          <section className={styles.laborSourceGrid} aria-label="Labor source comparison">
            {laborSources.map((source) => (
              <article key={source.label}>
                <span>{source.label}</span>
                <strong>{source.value}<small>hrs</small></strong>
                <p>{source.note}</p>
                <CheckCircle2 aria-hidden="true" />
              </article>
            ))}
          </section>

          <section className={styles.complexityBand}>
            <h2>Three-Tier Complexity: <span>High</span></h2>
            <div>
              <article><Layers3 /><strong>Low</strong><span>1.4-1.7 hrs</span><small>Ideal conditions</small></article>
              <article><Settings2 /><strong>Medium</strong><span>1.7-2.1 hrs</span><small>Typical conditions</small></article>
              <article className={styles.highComplexity}><AlertTriangle /><strong>High</strong><span>2.1-2.6 hrs</span><small>Challenging conditions</small></article>
            </div>
          </section>

          <div className={styles.laborDetailGrid}>
            <section>
              <h2>Overlap & Teardown Logic <BadgeCheck size={18} /></h2>
              <dl>
                <div><dt>Overlap detected</dt><dd>Serpentine belt removal <strong>-0.2 hrs</strong></dd></div>
                <div><dt>Teardown overlap</dt><dd>Battery disconnect <strong>-0.1 hrs</strong></dd></div>
                <div><dt>Net overlap adjustment</dt><dd><strong>-0.3 hrs</strong></dd></div>
              </dl>
            </section>
            <section>
              <h2>Required Skill / Tool / Bay</h2>
              <table>
                <tbody>{requirements.map(([label, value]) => <tr key={label}><th>{label}</th><td>{value}</td><td><CheckCircle2 size={15} /></td></tr>)}</tbody>
              </table>
            </section>
          </div>

          <div className={styles.laborFinancialGrid}>
            <article>
              <span>Dynamic Labor Rate</span>
              <p>Base labor rate $175.00/hr<br />Asset class adjustment +$15.00/hr</p>
              <strong>$190.00/hr</strong>
            </article>
            <article>
              <span>Estimated Labor GP</span>
              <p>Total labor $380.00<br />Labor GP $181.60</p>
              <strong>74.2%</strong>
            </article>
          </div>
        </main>

        <aside className={styles.advisorDraftPanel}>
          <header><span>3</span><strong>Advisor Estimate Draft</strong><b>Draft</b></header>
          <div className={styles.authorityWarning}><ShieldAlert size={18} />Authority boundary: no parts order, no dispatch, no authorization</div>
          <button className={styles.createDraftButton} type="button"><FileText size={18} />Create Advisor Draft</button>
          <section className={styles.draftCard}>
            <header><strong>Advisor Draft — Not Customer Presented</strong><small>Draft v1</small></header>
            <table>
              <thead><tr><th>Labor Line</th><th>Time</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody>
                <tr><td>Replace Alternator Assembly</td><td>2.0</td><td>$190.00</td><td>$380.00</td></tr>
                <tr><td>Overlap Adjustment</td><td>-0.3</td><td>$190.00</td><td>-$57.00</td></tr>
              </tbody>
              <tfoot><tr><th>Total Labor</th><th>1.7</th><th /><th>$323.00</th></tr></tfoot>
            </table>
            <p>Alternator replacement with overlap for belt removal and battery disconnect.</p>
          </section>
          <section className={styles.marginSafeguard}>
            <h2>Margin Safeguard</h2>
            <div><span>Estimated GP%</span><strong>74.2%</strong></div>
            <div><span>GP Target</span><strong>70%</strong></div>
            <div><span>Status</span><strong>On Target</strong></div>
          </section>
          <section className={styles.managerReviewCard}>
            <AlertTriangle />
            <div><strong>Manager Review Required</strong><span>Estimated GP% above target threshold.</span></div>
          </section>
          <footer>
            <button type="button"><BarChart3 size={17} />Compare Models</button>
            <button type="button"><History size={17} />View History</button>
          </footer>
        </aside>
      </div>
    </section>
  );
}
