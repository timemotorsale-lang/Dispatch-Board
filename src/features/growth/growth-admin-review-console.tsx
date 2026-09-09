import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, Lock, ShieldCheck } from "lucide-react";

import type { GrowthAdminReviewModel, GrowthCampaignAdminDetail } from "@/server/growth/operational-service";

import { GrowthApprovalDecisionControls } from "./growth-approval-decision-controls";
import styles from "./growth-console-foundation.module.css";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" }).format(cents / 100);
}

export function GrowthAdminUnavailable({ message }: { message: string }) {
  return (
    <section className={styles.shell} aria-labelledby="growth-admin-title">
      <div className={styles.reviewBar}>
        <AlertTriangle size={16} aria-hidden="true" />
        <span><strong>Growth admin unavailable.</strong> {message}</span>
      </div>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Manager Review</span>
          <h1 id="growth-admin-title">Growth Admin</h1>
          <p>This area is reserved for managers reviewing campaign approvals, locks, and audit evidence.</p>
        </div>
        <Link className={styles.secondaryButton} href="/growth">Back to Growth Console</Link>
      </header>
    </section>
  );
}

export function GrowthAdminReviewConsole({ model }: { model: GrowthAdminReviewModel }) {
  return (
    <section className={styles.shell} aria-labelledby="growth-admin-title">
      <div className={styles.reviewBar}>
        <ShieldCheck size={16} aria-hidden="true" />
        <span><strong>Manager review mode.</strong> Approvals can be decided here. Live sends, ad spend, and CRM changes remain locked.</span>
      </div>

      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Growth Admin</span>
          <h1 id="growth-admin-title">Review Growth Work</h1>
          <p>Approve or reject prepared Growth work, inspect launch locks, and review the audit trail before anything goes live.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.secondaryButton} href="/growth">Growth Console</Link>
          <a className={styles.primaryButton} href="#approval-queue">Review approvals</a>
        </div>
      </header>

      <div className={styles.metricsGrid} aria-label="Growth admin summary">
        <article><FileText size={18} /><span>Pending approvals</span><strong>{model.approvalQueue.length}</strong></article>
        <article><Lock size={18} /><span>Campaigns</span><strong>{model.campaigns.length}</strong></article>
        <article><CheckCircle2 size={18} /><span>Your role</span><strong>{model.role}</strong></article>
        <article><ShieldCheck size={18} /><span>Live activation</span><strong>Locked</strong></article>
      </div>

      <section className={styles.panel} id="approval-queue">
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabel}>Approval Queue</span>
            <h2>Decisions waiting now</h2>
          </div>
          <span className={styles.statusNote}>{model.approvalQueue.length} pending</span>
        </div>
        <div className={styles.adminList}>
          {model.approvalQueue.length ? model.approvalQueue.map((approval) => (
            <article key={approval.approvalId}>
              <div>
                <span className={styles.review}>{approval.requestedRole}</span>
                <h3>{approval.campaignTitle}</h3>
                <p>{approval.approvalType} requested {formatDate(approval.requestedAt)}. Campaign status: {approval.campaignStatus}.</p>
              </div>
              <GrowthApprovalDecisionControls approvalId={approval.approvalId} campaignId={approval.campaignId} />
              <Link className={styles.smallLink} href={`/growth/campaigns/${approval.campaignId}`}>Open detail</Link>
            </article>
          )) : (
            <article>
              <div>
                <span className={styles.ready}>Clear</span>
                <h3>No Growth approvals are waiting</h3>
                <p>Prepared campaigns will appear here after audience and message drafts are ready for manager review.</p>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabel}>Campaign Detail</span>
            <h2>Prepared Growth campaigns</h2>
          </div>
          <span className={styles.statusNote}>{model.campaigns.length} total</span>
        </div>
        <div className={styles.campaignTable} role="table" aria-label="Prepared Growth campaigns">
          <div role="row">
            <span>Campaign</span>
            <span>Type</span>
            <span>Status</span>
            <span>Owner</span>
            <span>Next action</span>
            <span>Evidence</span>
          </div>
          {model.campaigns.map((campaign) => (
            <div role="row" key={campaign.id}>
              <strong>{campaign.title}</strong>
              <span>{campaign.campaignType}</span>
              <span className={campaign.status === "REJECTED" ? styles.blocked : styles.review}>{campaign.status}</span>
              <span>{campaign.ownerRole}</span>
              <Link href={`/growth/campaigns/${campaign.id}`}>{campaign.nextAction}</Link>
              <span>{campaign.audienceSnapshotCount} audience · {campaign.messageDraftCount} draft · {campaign.approvalCount} approval</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.controlGrid}>
          <article><Lock size={18} /><strong>Live sends locked</strong><p>{model.controls.liveSendLocked ? "No live customer messaging can run from this review layer." : "Live send lock needs review."}</p></article>
          <article><Lock size={18} /><strong>Paid spend locked</strong><p>{model.controls.paidSpendLocked ? "Paid advertising remains blocked until later approval." : "Paid spend lock needs review."}</p></article>
          <article><Lock size={18} /><strong>CRM mutation locked</strong><p>{model.controls.sourceMutationLocked ? "CRM and source records are protected from this screen." : "Source mutation lock needs review."}</p></article>
          <article><ShieldCheck size={18} /><strong>Durable records</strong><p>{model.controls.durableRecordsEnabled ? "Campaigns, decisions, locks, and ledger events are stored." : "Durable records need review."}</p></article>
        </div>
      </section>
    </section>
  );
}

export function GrowthCampaignAdminDetailConsole({ detail }: { detail: GrowthCampaignAdminDetail }) {
  const pendingApprovals = detail.approvals.filter((approval) => approval.status === "REQUESTED");

  return (
    <section className={styles.shell} aria-labelledby="growth-campaign-title">
      <div className={styles.reviewBar}>
        <ShieldCheck size={16} aria-hidden="true" />
        <span><strong>Campaign detail.</strong> Review evidence, approvals, locks, and audit events before live activation is considered.</span>
      </div>

      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Growth Campaign</span>
          <h1 id="growth-campaign-title">{detail.title}</h1>
          <p>{detail.objective}</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.secondaryButton} href="/growth/admin">Admin Queue</Link>
          <Link className={styles.secondaryButton} href="/growth">Growth Console</Link>
        </div>
      </header>

      <div className={styles.metricsGrid} aria-label="Campaign summary">
        <article><FileText size={18} /><span>Status</span><strong>{detail.status}</strong></article>
        <article><CheckCircle2 size={18} /><span>Version</span><strong>{detail.version}</strong></article>
        <article><Lock size={18} /><span>Budget</span><strong>{money(detail.budgetCents)}</strong></article>
        <article><ShieldCheck size={18} /><span>Source records</span><strong>{detail.sourceRecordCount}</strong></article>
      </div>

      {pendingApprovals.length ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionLabel}>Pending Decision</span>
              <h2>Approve or reject</h2>
            </div>
            <span className={styles.statusNote}>{pendingApprovals.length} pending</span>
          </div>
          <div className={styles.adminList}>
            {pendingApprovals.map((approval) => (
              <article key={approval.approvalId}>
                <div>
                  <span className={styles.review}>{approval.requestedRole}</span>
                  <h3>{approval.approvalType}</h3>
                  <p>Requested {formatDate(approval.requestedAt)} by {approval.requestedByUserId}.</p>
                </div>
                <GrowthApprovalDecisionControls approvalId={approval.approvalId} campaignId={detail.id} />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.detailGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><span className={styles.sectionLabel}>Audience</span><h2>Snapshots</h2></div><span className={styles.statusNote}>{detail.audienceSnapshotCount}</span></div>
          <div className={styles.adminList}>
            {detail.audienceSnapshots.map((snapshot) => (
              <section key={snapshot.version}>
                <h3>Version {snapshot.version}</h3>
                <p>{snapshot.reason}</p>
                <ul>{snapshot.rows.map((row) => <li key={row.label}>{row.label}: {row.count} · {row.reason}</li>)}</ul>
              </section>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><span className={styles.sectionLabel}>Message</span><h2>Drafts</h2></div><span className={styles.statusNote}>{detail.messageDraftCount}</span></div>
          <div className={styles.adminList}>
            {detail.messageDrafts.map((draft) => (
              <section key={draft.version}>
                <h3>Version {draft.version}: {draft.subject}</h3>
                <p>{draft.body}</p>
                <strong>{draft.callToAction}</strong>
              </section>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><span className={styles.sectionLabel}>Approvals</span><h2>Decision history</h2></div><span className={styles.statusNote}>{detail.approvalCount}</span></div>
          <div className={styles.adminList}>
            {detail.approvals.map((approval) => (
              <section key={approval.approvalId}>
                <h3>{approval.requestedRole} · {approval.status}</h3>
                <p>{approval.decisionReason ?? `Requested ${formatDate(approval.requestedAt)}.`}</p>
              </section>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><span className={styles.sectionLabel}>Launch Locks</span><h2>Execution remains locked</h2></div><span className={styles.statusNote}>{detail.launchLockCount}</span></div>
          <div className={styles.adminList}>
            {detail.launchLocks.map((lock) => (
              <section key={`${lock.createdAt}-${lock.lockedReason}`}>
                <h3>{lock.lockState}</h3>
                <p>{lock.lockedReason}</p>
                <strong>{lock.nextAction}</strong>
              </section>
            ))}
            {!detail.launchLocks.length ? <section><h3>No launch lock attempted</h3><p>Launch is still unavailable until all controls are reviewed.</p></section> : null}
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabel}>Audit Trail</span>
            <h2>What happened</h2>
          </div>
          <span className={styles.statusNote}>{detail.ledgerEvents.length} events</span>
        </div>
        <div className={styles.auditList}>
          {detail.ledgerEvents.map((event) => (
            <article key={`${event.version}-${event.eventType}-${event.occurredAt}`}>
              <span>{formatDate(event.occurredAt)}</span>
              <strong>{event.eventType}</strong>
              <p>{event.actorRole} · {event.reason}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.detailGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><span className={styles.sectionLabel}>Results</span><h2>Read-only preview</h2></div><span className={styles.statusNote}>{detail.resultCount}</span></div>
          <div className={styles.adminList}>
            {detail.resultEvents.map((event) => <section key={`${event.source}-${event.eventType}-${event.occurredAt}`}><h3>{event.eventType} · {event.attributionTier}</h3><p>{event.source} · {formatDate(event.occurredAt)} · {money(event.valueCents)}</p></section>)}
            {!detail.resultEvents.length ? <section><h3>No results imported yet</h3><p>Results can be imported as preview evidence without changing CRM records.</p></section> : null}
          </div>
        </article>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><span className={styles.sectionLabel}>CRM Writeback</span><h2>Preview only</h2></div><span className={styles.statusNote}>{detail.writebackPreviewCount}</span></div>
          <div className={styles.adminList}>
            {detail.writebackPreviews.map((preview) => <section key={`${preview.targetSystem}-${preview.eventType}`}><h3>{preview.eventType}</h3><p>{preview.targetSystem} · {preview.approvalNeeded}</p><strong>{preview.nextAction}</strong></section>)}
            {!detail.writebackPreviews.length ? <section><h3>No writeback preview yet</h3><p>CRM and task writebacks remain locked until explicitly approved later.</p></section> : null}
          </div>
        </article>
      </section>
    </section>
  );
}
