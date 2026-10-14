import Link from "next/link";
import { BarChart3, CheckCircle2, Eye, FileText, Lock, ShieldCheck, TrendingUp } from "lucide-react";

import type { GrowthResultsDashboardModel } from "@/server/growth/operational-service";

import styles from "./growth-console-foundation.module.css";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" }).format(cents / 100);
}

function statusClass(status: string) {
  if (status === "Value proven" || status === "Proof found") return styles.ready;
  if (status === "Proof building") return styles.review;
  return styles.blocked;
}

export function GrowthResultsDashboard({ model }: { model: GrowthResultsDashboardModel }) {
  return (
    <section className={styles.shell} aria-labelledby="growth-results-title">
      <div className={styles.reviewBar}>
        <ShieldCheck size={16} aria-hidden="true" />
        <span><strong>Results proof mode.</strong> Outcomes are read from saved Growth records. Live sends, paid spend, and CRM writeback remain locked.</span>
      </div>

      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Growth Results</span>
          <h1 id="growth-results-title">Performance + Proof</h1>
          <p>Review what Growth claims happened, what source systems prove, and where follow-up still needs manager attention.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.secondaryButton} href="/growth/admin">Admin Queue</Link>
          <Link className={styles.secondaryButton} href="/growth/policy">Policy Controls</Link>
          <Link className={styles.secondaryButton} href="/growth">Growth Console</Link>
        </div>
      </header>

      <div className={styles.metricsGrid} aria-label="Growth results summary">
        <article><BarChart3 size={18} /><span>Campaigns measured</span><strong>{model.summary.totalCampaigns}</strong></article>
        <article><CheckCircle2 size={18} /><span>Proof events</span><strong>{model.summary.proofEvents}</strong></article>
        <article><TrendingUp size={18} /><span>Value proven</span><strong>{money(model.summary.totalValueCents)}</strong></article>
        <article><Eye size={18} /><span>Proof coverage</span><strong>{model.summary.proofCoveragePercent}%</strong></article>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabel}>Manager Proof Panel</span>
            <h2>What can be trusted now</h2>
          </div>
          <span className={statusClass(model.summary.roiStatus)}>{model.summary.roiStatus}</span>
        </div>
        <div className={styles.controlGrid}>
          <article><CheckCircle2 size={18} /><strong>Direct results</strong><p>{model.summary.directResults} source-backed replies, appointments, leads, sales, or service outcomes.</p></article>
          <article><FileText size={18} /><strong>Assisted results</strong><p>{model.summary.assistedResults} follow-up task or staff-assist result(s) connected to Growth work.</p></article>
          <article><Eye size={18} /><strong>Influenced results</strong><p>{model.summary.influencedResults} softer signal(s) that can inform follow-up but should not be overclaimed.</p></article>
          <article><Lock size={18} /><strong>Locked writebacks</strong><p>{model.summary.lockedWritebacks} CRM/task writeback preview(s) are waiting for explicit mutation approval.</p></article>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabel}>Campaign ROI</span>
            <h2>Campaigns with evidence</h2>
          </div>
          <span className={styles.statusNote}>{model.campaigns.length} campaign(s)</span>
        </div>
        <div className={styles.campaignTable} role="table" aria-label="Growth campaign result proof">
          <div role="row">
            <span>Campaign</span>
            <span>Status</span>
            <span>Proof</span>
            <span>Value</span>
            <span>Writeback</span>
            <span>Open</span>
          </div>
          {model.campaigns.map((campaign) => (
            <div role="row" key={campaign.id}>
              <strong>{campaign.title}</strong>
              <span className={campaign.launchLocked ? styles.blocked : styles.review}>{campaign.status}</span>
              <span className={statusClass(campaign.roiSignal)}>{campaign.proofEvents}/{campaign.resultEvents} proof</span>
              <span>{money(campaign.totalValueCents)}</span>
              <span>{campaign.lockedWritebacks} locked</span>
              <Link href={`/growth/campaigns/${campaign.id}`}>Open proof</Link>
            </div>
          ))}
          {!model.campaigns.length ? (
            <div role="row">
              <strong>No campaigns measured yet</strong>
              <span>Waiting</span>
              <span>0 proof</span>
              <span>$0</span>
              <span>0 locked</span>
              <Link href="/growth">Start Growth work</Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className={styles.detailGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionLabel}>Source Proof</span>
              <h2>Where proof came from</h2>
            </div>
            <span className={styles.statusNote}>{model.proofBySource.length} source(s)</span>
          </div>
          <div className={styles.adminList}>
            {model.proofBySource.map((source) => (
              <section key={source.source}>
                <h3>{source.source}</h3>
                <p>{source.proofEvents} proof event(s) · {money(source.valueCents)} value · {source.lastProofAt ? formatDate(source.lastProofAt) : "No date yet"}</p>
                <strong className={statusClass(source.status)}>{source.status}</strong>
              </section>
            ))}
            {!model.proofBySource.length ? <section><h3>No source proof yet</h3><p>Imported results will appear here after campaign outcomes are recorded.</p></section> : null}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionLabel}>Attribution Timeline</span>
              <h2>Recent result events</h2>
            </div>
            <span className={styles.statusNote}>{model.timeline.length} shown</span>
          </div>
          <div className={styles.auditList}>
            {model.timeline.map((event) => (
              <article key={`${event.campaignId}-${event.source}-${event.eventType}-${event.occurredAt}`}>
                <span>{formatDate(event.occurredAt)}</span>
                <strong>{event.eventType} · {event.attributionTier}</strong>
                <p>{event.source} · {event.campaignTitle} · {money(event.valueCents)}</p>
              </article>
            ))}
            {!model.timeline.length ? (
              <article>
                <span>{formatDate(model.generatedAt)}</span>
                <strong>No result events yet</strong>
                <p>Growth can prepare campaigns now. Proof appears after results are imported as read-only evidence.</p>
              </article>
            ) : null}
          </div>
        </article>
      </section>
    </section>
  );
}
