import Link from "next/link";
import { Clock, DollarSign, Lock, ShieldCheck, SlidersHorizontal } from "lucide-react";

import type { GrowthPolicyControlCenterModel, GrowthPolicyControlState } from "@/server/growth/policy-control-center";

import styles from "./growth-console-foundation.module.css";

function stateClass(state: GrowthPolicyControlState) {
  if (state === "Ready") return styles.ready;
  if (state === "Review needed") return styles.review;
  return styles.blocked;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function GrowthPolicyControlCenter({ model }: { model: GrowthPolicyControlCenterModel }) {
  return (
    <section className={styles.shell} aria-labelledby="growth-policy-title">
      <div className={styles.reviewBar}>
        <ShieldCheck size={16} aria-hidden="true" />
        <span><strong>Policy control mode.</strong> These controls are visible for review. Live sends, paid spend, provider activation, and source mutation remain locked.</span>
      </div>

      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Growth Policy</span>
          <h1 id="growth-policy-title">Control Center</h1>
          <p>Review the safety rules that govern Growth work before any campaign can move toward live execution.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.secondaryButton} href="/growth/admin">Admin Queue</Link>
          <Link className={styles.secondaryButton} href="/growth">Growth Console</Link>
        </div>
      </header>

      <div className={styles.metricsGrid} aria-label="Growth policy summary">
        <article><Lock size={18} /><span>Launch posture</span><strong>{model.launchPosture}</strong></article>
        <article><ShieldCheck size={18} /><span>Locked controls</span><strong>{model.summary.locked}</strong></article>
        <article><SlidersHorizontal size={18} /><span>Need review</span><strong>{model.summary.reviewNeeded}</strong></article>
        <article><Clock size={18} /><span>Last reviewed</span><strong>{formatDate(model.generatedAt)}</strong></article>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabel}>Operating Policy</span>
            <h2>What Growth is allowed to do</h2>
          </div>
          <span className={styles.statusNote}>{model.summary.total} controls</span>
        </div>
        <div className={styles.policyGrid}>
          {model.controls.map((control) => (
            <article key={control.area}>
              <div>
                <span className={stateClass(control.state)}>{control.state}</span>
                <h3>{control.area}</h3>
                <p>{control.evidence}</p>
              </div>
              <dl>
                <div><dt>Owner</dt><dd>{control.owner}</dd></div>
                <div><dt>Next action</dt><dd>{control.nextAction}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabel}>Budget Policy</span>
            <h2>Spend remains blocked</h2>
          </div>
          <span className={styles.statusNote}>No live spend</span>
        </div>
        <div className={styles.campaignTable} role="table" aria-label="Growth budget policies">
          <div role="row">
            <span>Channel</span>
            <span>Current limit</span>
            <span>Status</span>
            <span>Approval</span>
            <span>Next</span>
            <span>Protection</span>
          </div>
          {model.budgetPolicies.map((policy) => (
            <div role="row" key={policy.channel}>
              <strong>{policy.channel}</strong>
              <span>{policy.currentLimit}</span>
              <span className={stateClass(policy.state)}>{policy.state}</span>
              <span>{policy.approvalRequired}</span>
              <span>Review before activation</span>
              <span>No money moves here</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.controlGrid}>
          <article><Lock size={18} /><strong>Fail closed</strong><p>If a rule is missing, stale, or unclear, Growth stays locked and tells the manager what to review.</p></article>
          <article><DollarSign size={18} /><strong>No hidden spend</strong><p>Paid campaigns can be planned, but spend cannot activate from this layer.</p></article>
          <article><ShieldCheck size={18} /><strong>Source protection</strong><p>CRM, inventory, service, appointment, task, and sales records remain the source of truth.</p></article>
          <article><SlidersHorizontal size={18} /><strong>Future admin settings</strong><p>The next version can make approved limits editable with audit history and rollback.</p></article>
        </div>
      </section>
    </section>
  );
}
