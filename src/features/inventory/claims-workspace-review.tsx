import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./claims-workspace-review.module.css";

const snapshot = [
  ["Customer", "Deqo Roble"],
  ["Vehicle", "2018 Toyota Camry"],
  ["VIN", "4T1B11HK9JU128441"],
  ["Owner", "Eli Manager"],
  ["Carrier", "State Farm"],
  ["Adjuster", "Needed"],
  ["Loss date", "Sep 15, 2026"],
  ["Deductible", "$500 confirmed"],
];

const needs = [
  { label: "Claim number", detail: "Captured from customer", state: "done" },
  { label: "Customer authorization", detail: "Signature required before repair handoff", state: "blocked" },
  { label: "Carrier and policy", detail: "Insurance card attached", state: "done" },
  { label: "Adjuster contact", detail: "Call carrier or customer", state: "warning" },
  { label: "Damage photos", detail: "Need left-front and VIN photo", state: "blocked" },
  { label: "Deductible", detail: "$500 confirmed", state: "done" },
] as const;

const evidence = [
  { title: "Initial damage photos", detail: "3 attached. Missing left-front closeup and VIN photo.", status: "Partial", tone: "warning", thumbs: 3 },
  { title: "Insurance card", detail: "Stored in document library and linked to customer and claim.", status: "Complete", tone: "good", thumbs: 1 },
  { title: "Repair authorization", detail: "Prepared but not signed. E-sign can be added later.", status: "Needed", tone: "danger", thumbs: 1 },
] as const;

const readiness = [
  { label: "Estimate readiness", percent: 88, status: "Ready", tone: "good" },
  { label: "Repair order handoff", percent: 56, status: "Blocked", tone: "warning" },
  { label: "Payment follow-up", percent: 32, status: "Later", tone: "info" },
  { label: "Closeout", percent: 18, status: "Not yet", tone: "info" },
] as const;

const tools = [
  { title: "Adjuster details", detail: "Visible because carrier claim is active.", active: true },
  { title: "Estimate", detail: "Ready to upload or link appraisal.", active: true },
  { title: "Supplement", detail: "Hidden until estimate exists.", active: false },
  { title: "Payment recovery", detail: "Hidden until repair or payment issue.", active: false },
] as const;

function StatusBadge({ tone = "info", children }: { tone?: "good" | "warning" | "danger" | "info"; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

function NeedIcon({ state }: { state: (typeof needs)[number]["state"] }) {
  const symbol = state === "done" ? "✓" : state === "warning" ? "?" : "!";
  return <span className={`${styles.needIcon} ${styles[state]}`}>{symbol}</span>;
}

export function ClaimsWorkspaceReview() {
  return (
    <section className={styles.page}>
      <div className={styles.topbar}>
        <span className={styles.eyebrow}>Service Console / Insurance Claim Assistant</span>
        <div className={styles.topActions}>
          <Link href="/crm-next/customers">Customer 360</Link>
          <Link href="/vehicles/360/demo">Vehicle 360</Link>
          <button type="button">Save claim</button>
        </div>
      </div>

      <header className={styles.hero}>
        <div>
          <h1>Claims Workspace</h1>
          <p>A simple execution desk for moving insurance claims from first contact to repair, payment, or follow-up handoff.</p>
        </div>
        <aside className={styles.currentClaim}>
          <span className={styles.cardEyebrow}>Current claim</span>
          <div className={styles.statusLine}>
            <strong>Waiting on adjuster</strong>
            <StatusBadge tone="warning">2 days open</StatusBadge>
          </div>
          <p>Next action is assigned to service advisor. Repair handoff is blocked until authorization and damage photos are complete.</p>
        </aside>
      </header>

      <div className={styles.workspace}>
        <div className={styles.mainStack}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Claim Snapshot</h2>
                <p>Enough context to work the claim without making staff complete every advanced field up front.</p>
              </div>
              <StatusBadge>Claim # MN-48291</StatusBadge>
            </div>
            <div className={styles.snapshotGrid}>
              {snapshot.map(([label, value]) => (
                <div className={styles.fact} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
              <div className={`${styles.fact} ${styles.wide}`}>
                <span>Incident summary</span>
                <strong>Front bumper and left fender damage. Customer reports vehicle was driveable after loss.</strong>
              </div>
              <div className={`${styles.fact} ${styles.wide}`}>
                <span>Current blocker</span>
                <strong>Missing adjuster contact and signed repair authorization.</strong>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>What We Need</h2>
                <p>A focused checklist replaces a long intake form. Staff can mark items complete, blocked, or not applicable.</p>
              </div>
              <StatusBadge tone="warning">5/9 ready</StatusBadge>
            </div>
            <div className={styles.needGrid}>
              {needs.map((item) => (
                <article className={styles.need} key={item.label}>
                  <NeedIcon state={item.state} />
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Evidence and Documents</h2>
                <p>Documents store once in the library, then link to claim, customer, vehicle, and repair order when available.</p>
              </div>
              <button className={styles.secondaryButton} type="button">Add evidence</button>
            </div>
            <div className={styles.evidenceList}>
              {evidence.map((item) => (
                <article className={styles.evidenceRow} key={item.title}>
                  <div className={styles.thumbs} aria-hidden="true">
                    {Array.from({ length: item.thumbs }).map((_, index) => <span key={index} />)}
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className={styles.sideStack}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Next Action</h2>
                <p>Deterministic workflow logic keeps the desk simple.</p>
              </div>
            </div>
            <div className={styles.nextAction}>
              <span className={styles.cardEyebrow}>Recommended now</span>
              <strong>Contact adjuster</strong>
              <p>Carrier is captured, but adjuster contact and approval status are missing. Repair handoff remains blocked until authorization and required photos are complete.</p>
              <button type="button">Record carrier call</button>
              <div className={styles.ownerGrid}>
                <div className={styles.fact}>
                  <span>Owner</span>
                  <strong>Service advisor</strong>
                </div>
                <div className={styles.fact}>
                  <span>Due</span>
                  <strong>Today, 4:00 PM</strong>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Handoff Readiness</h2>
                <p>Clear gates prevent premature handoff while allowing approved exceptions.</p>
              </div>
            </div>
            <div className={styles.gateList}>
              {readiness.map((gate) => (
                <article className={styles.gate} key={gate.label}>
                  <div>
                    <strong>{gate.label}</strong>
                    <StatusBadge tone={gate.tone}>{gate.status}</StatusBadge>
                  </div>
                  <span className={styles.progress}><i style={{ width: `${gate.percent}%` }} /></span>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Progressive Tools</h2>
                <p>Advanced panels appear only when claim complexity requires them.</p>
              </div>
            </div>
            <div className={styles.toolGrid}>
              {tools.map((tool) => (
                <article className={tool.active ? styles.tool : `${styles.tool} ${styles.muted}`} key={tool.title}>
                  <strong>{tool.title}</strong>
                  <span>{tool.detail}</span>
                </article>
              ))}
            </div>
            <p className={styles.note}>Review implementation: a short execution workspace, not a long insurance form.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
