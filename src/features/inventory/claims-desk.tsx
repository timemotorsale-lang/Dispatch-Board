"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import type { ClaimsDeskReadModel } from "@/server/claims-workspace/service";

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

const fallbackMetrics = {
  agingClaims: 4,
  blockedClaims: 3,
  openClaims: 14,
  paymentWatch: 2,
  readyHandoff: 3,
  waitingCarrier: 5
};

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

export function ClaimsDesk({ model }: { model?: ClaimsDeskReadModel }) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const candidates = model?.claims ?? claimCandidates.map((candidate) => ({ ...candidate, href: "/vehicles/claims-workspace" }));
  const metrics = model?.metrics ?? fallbackMetrics;
  const deskSignals = [
    ["Open claims", String(metrics.openClaims), "Across service and repair."],
    ["Waiting carrier", String(metrics.waitingCarrier), "Adjuster or approval pending."],
    ["Ready handoff", String(metrics.readyHandoff), "Can move to repair order."],
    ["Payment watch", String(metrics.paymentWatch), "Deductible or short-pay."],
    ["Blocked", String(metrics.blockedClaims), "Needs exception or missing required facts."],
    ["Aging", String(metrics.agingClaims), "Open at least 3 days."]
  ] as const;

  async function startClaim(formData: FormData) {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/claims-workspace/claims", {
        body: JSON.stringify(Object.fromEntries(formData.entries())),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Claim could not be started.");
      const claimId = payload?.readModel?.claim?.id;
      window.location.assign(claimId ? `/vehicles/claims-workspace?claimId=${encodeURIComponent(claimId)}` : "/vehicles/claims-workspace");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Claim could not be started.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
              <Badge tone="warning">{candidates.filter((candidate) => candidate.blocker !== "Ready for repair order").length} need action</Badge>
            </div>
            <div className={styles.queue}>
              <div className={styles.queueHead}>
                <span>Customer / vehicle</span>
                <span>Claim</span>
                <span>Blocker</span>
                <span>Action</span>
              </div>
              {candidates.map((candidate) => (
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
                  <Link className={candidate.action === "Open" ? styles.primaryAction : styles.secondaryAction} href={candidate.href}>
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
            <form action={startClaim} className={styles.intakeForm}>
              <label>
                <span>Customer name</span>
                <input name="customerName" placeholder="Customer full name" required />
              </label>
              <label>
                <span>Phone</span>
                <input name="customerPhone" placeholder="Phone number" />
              </label>
              <label>
                <span>VIN or vehicle identity</span>
                <input name="vehicleVin" placeholder="VIN, plate, or stock" required />
              </label>
              <label>
                <span>Carrier</span>
                <input name="carrierName" placeholder="Insurance carrier" />
              </label>
              <label>
                <span>Claim number</span>
                <input name="claimNumber" placeholder="Claim number or leave draft" />
              </label>
              <label>
                <span>Loss date</span>
                <input name="lossDate" type="date" />
              </label>
              <label className={styles.fullField}>
                <span>First loss summary</span>
                <textarea name="description" placeholder="Short description of loss, damage, and customer needs" rows={3} />
              </label>
              <div className={styles.formFooter}>
                {error ? <strong>{error}</strong> : <span>Creates a controlled claim record and opens the workspace.</span>}
                <button disabled={isSubmitting} type="submit">{isSubmitting ? "Starting..." : "Start claim workspace"}</button>
              </div>
            </form>
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
