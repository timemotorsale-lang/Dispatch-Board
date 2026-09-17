import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./claims-desk.module.css";

const startPaths = [
  {
    action: "Find existing",
    detail: "Open an active insurance claim, repair order, or prior estimate and continue work without creating another record.",
    title: "Existing claim or RO"
  },
  {
    action: "Start from record",
    detail: "Select a customer and vehicle first, then capture claim number, carrier, loss date, and first evidence.",
    title: "Known customer / vehicle"
  },
  {
    action: "Create draft",
    detail: "Create a controlled draft when staff has incomplete identity details but needs to preserve the first contact.",
    title: "Unknown or walk-in claim"
  }
] as const;

const claimCandidates = [
  {
    action: "Open",
    blocker: "Adjuster needed",
    blockerTone: "warning",
    claim: "MN-48291",
    customer: "Deqo Roble",
    detail: "2018 Toyota Camry - 4T1B11HK",
    provider: "State Farm"
  },
  {
    action: "Resume",
    blocker: "Identity gap",
    blockerTone: "danger",
    claim: "Draft",
    customer: "Abdi Hassan",
    detail: "2016 Honda Accord - plate HJA-221",
    provider: "Carrier unknown"
  },
  {
    action: "Open",
    blocker: "Ready for RO",
    blockerTone: "good",
    claim: "IL-22804",
    customer: "Maria Lopez",
    detail: "2020 Nissan Rogue - RO-10482",
    provider: "Progressive"
  }
] as const;

const intakeFacts = [
  ["Required first", "4 facts", "Customer, vehicle, loss date, owner."],
  ["Duplicate check", "Before save", "Claim #, VIN, phone, open RO."],
  ["Draft allowed", "Yes", "With reason and next owner."],
  ["Opens to", "Workspace", "Once claim/account context exists."]
] as const;

const deskSignals = [
  ["Open claims", "14", "Across service and repair."],
  ["Waiting carrier", "5", "Adjuster or approval pending."],
  ["Ready handoff", "3", "Can move to repair order."],
  ["Payment watch", "2", "Deductible or short-pay."]
] as const;

const handoffLanes = [
  ["1", "Evidence intake", "Photos, insurance card, signed authorization, tow/storage docs."],
  ["2", "Estimate / supplement", "Route to estimator or mark carrier estimate received."],
  ["3", "Repair order", "Open the claim workspace and hand off to service execution."],
  ["4", "Payment recovery", "Deductible, insurance payment, short-pay, or accounting follow-up."]
] as const;

const guardrails = [
  { label: "Before create", tone: "warning", title: "Duplicate warning", detail: "Exact claim number or same VIN/open claim." },
  { label: "Controlled", tone: "info", title: "Draft reason required", detail: "Unknown identity requires owner and follow-up." },
  { label: "Routing", tone: "good", title: "Workspace opens after context", detail: "Claim workspace is not the landing page." }
] as const;

function Badge({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "good" | "warning" | "danger" }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

export function ClaimsDesk() {
  return (
    <section className={styles.page}>
      <div className={styles.topbar}>
        <span className={styles.eyebrow}>Service Console / Desk a Claim</span>
        <div className={styles.topActions}>
          <Link href="/vehicles/claims-workspace">Open claim queue</Link>
          <Link href="/operations-coordinator#paperwork-command-center">Document library</Link>
          <button type="button">Start new claim</button>
        </div>
      </div>

      <header className={styles.hero}>
        <div>
          <h1>Desk an insurance claim</h1>
          <p>Start with the customer, vehicle, or claim number. The desk keeps intake short, checks for duplicates, and opens the right claim workspace when enough context exists.</p>
        </div>
        <aside className={styles.searchPanel}>
          <span className={styles.cardEyebrow}>Find before creating</span>
          <div className={styles.searchBox}>
            <span>Customer, VIN, plate, phone, claim #, RO #</span>
            <strong>Search</strong>
          </div>
          <p>Search prevents duplicate claims and routes staff to an existing workspace when one is already open.</p>
        </aside>
      </header>

      <div className={styles.workspace}>
        <div className={styles.mainStack}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Choose how this claim starts</h2>
                <p>Three short paths keep the desk clean while preserving the enterprise record underneath.</p>
              </div>
              <Badge>Intake desk</Badge>
            </div>
            <div className={styles.startGrid}>
              {startPaths.map((path) => (
                <article className={styles.startCard} key={path.title}>
                  <div>
                    <h3>{path.title}</h3>
                    <p>{path.detail}</p>
                  </div>
                  <span>{path.action}</span>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Active claim candidates</h2>
                <p>Picking a row opens the already-started claim workspace. The desk should make duplicate risk obvious.</p>
              </div>
              <Badge tone="warning">3 need action</Badge>
            </div>
            <div className={styles.queue}>
              <div className={styles.queueHead}>
                <span>Customer / vehicle</span>
                <span>Claim</span>
                <span>Blocker</span>
                <span>Action</span>
              </div>
              {claimCandidates.map((candidate) => (
                <div className={styles.claimRow} key={`${candidate.customer}-${candidate.claim}`}>
                  <div>
                    <strong>{candidate.customer}</strong>
                    <span>{candidate.detail}</span>
                  </div>
                  <div>
                    <strong>{candidate.claim}</strong>
                    <small>{candidate.provider}</small>
                  </div>
                  <div>
                    <Badge tone={candidate.blockerTone}>{candidate.blocker}</Badge>
                  </div>
                  <Link className={candidate.action === "Open" ? styles.primaryAction : styles.secondaryAction} href="/vehicles/claims-workspace">
                    {candidate.action}
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Start claim intake</h2>
                <p>This area appears after staff chooses a path. It captures only the facts needed to open the workspace.</p>
              </div>
              <Badge>Progressive form</Badge>
            </div>
            <div className={styles.metricGrid}>
              {intakeFacts.map(([label, value, detail]) => (
                <article className={styles.metric} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className={styles.sideStack}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Desk signals</h2>
                <p>Lightweight operations view for the front desk and service advisor.</p>
              </div>
            </div>
            <div className={styles.metricGrid}>
              {deskSignals.map(([label, value, detail]) => (
                <article className={styles.metric} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Handoff lanes</h2>
                <p>The desk should route work, not bury staff in claim administration.</p>
              </div>
            </div>
            <div className={styles.laneList}>
              {handoffLanes.map(([number, title, detail]) => (
                <article className={styles.lane} key={title}>
                  <span>{number}</span>
                  <div>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Desk guardrails</h2>
                <p>Enterprise controls stay underneath the simple start page.</p>
              </div>
            </div>
            <div className={styles.guardrailList}>
              {guardrails.map((guardrail) => (
                <article className={styles.guardrail} key={guardrail.title}>
                  <div>
                    <strong>{guardrail.title}</strong>
                    <small>{guardrail.detail}</small>
                  </div>
                  <Badge tone={guardrail.tone}>{guardrail.label}</Badge>
                </article>
              ))}
            </div>
            <p className={styles.note}>A short claim desk that starts, finds, or resumes the correct claim before opening the detailed workspace.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
