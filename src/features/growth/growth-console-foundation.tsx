import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Lock,
  PauseCircle,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound
} from "lucide-react";

import { buildGrowthAdvertisingReviewModel } from "@/server/growth/advertising-activation";
import { buildGrowthAutomationActivationReviewModel } from "@/server/growth/automation-activation";
import type { GrowthOperationalHome } from "@/server/growth/operational-service";
import { buildGrowthCampaignPlanReviewModel, buildGrowthConsoleReadModel, type GrowthConsoleReadModel, type GrowthReadiness } from "@/server/growth/read-model";
import { buildGrowthOptimizationReviewModel } from "@/server/growth/optimization";
import { buildGrowthPolicyReviewModel } from "@/server/growth/policy";
import { buildGrowthProviderPilotReviewModel } from "@/server/growth/provider-pilot";
import { buildGrowthReleaseReadinessReviewModel } from "@/server/growth/release-readiness";
import { buildGrowthResultsAttributionReviewModel } from "@/server/growth/results-attribution";

import styles from "./growth-console-foundation.module.css";

type CampaignStatus = "Needs review" | "Approved inactive" | "Blocked";

const workspaceTabs = [
  { href: "#today", label: "Today" },
  { href: "#campaigns", label: "Campaigns" },
  { href: "#attention", label: "Needs Attention" },
  { href: "#results", label: "Results" },
  { href: "#controls", label: "Review Controls" }
] as const;

const workPath = [
  "Pick the best opportunity",
  "Review audience",
  "Approve message or ad",
  "Launch stays locked",
  "Track outcome"
] as const;

function readinessClass(readiness: GrowthReadiness) {
  if (readiness === "Ready") return styles.ready;
  if (readiness === "Review needed") return styles.review;
  return styles.blocked;
}

function campaignClass(status: CampaignStatus) {
  if (status === "Approved inactive") return styles.ready;
  if (status === "Needs review") return styles.review;
  return styles.blocked;
}

function isOperationalHome(model: GrowthConsoleReadModel | GrowthOperationalHome): model is GrowthOperationalHome {
  return "activeCampaigns" in model && Array.isArray(model.activeCampaigns);
}

export function GrowthConsoleFoundation({ model: providedModel }: { model?: GrowthConsoleReadModel | GrowthOperationalHome } = {}) {
  const model = providedModel ?? buildGrowthConsoleReadModel();
  const campaignPlan = buildGrowthCampaignPlanReviewModel();
  const policy = buildGrowthPolicyReviewModel();
  const pilot = buildGrowthProviderPilotReviewModel();
  const advertising = buildGrowthAdvertisingReviewModel();
  const automation = buildGrowthAutomationActivationReviewModel();
  const optimization = buildGrowthOptimizationReviewModel();
  const releaseReadiness = buildGrowthReleaseReadinessReviewModel();
  const results = buildGrowthResultsAttributionReviewModel();
  const primaryOpportunity = model.opportunities[0];
  const activeCampaigns = isOperationalHome(model) ? model.activeCampaigns : [];
  const operationalStatus = isOperationalHome(model) ? model.operationalStatus : null;
  const needsAttention = [
    { action: policy.nextAction, label: "Launch readiness", reason: "Policy checks must clear before scheduling.", status: "Needs review" },
    { action: advertising.nextAction, label: "Paid advertising", reason: advertising.state, status: "Blocked" },
    { action: automation.nextAction, label: "Automation", reason: automation.state, status: "Needs review" },
    { action: "Review this implementation before approving adoption", label: "Adoption", reason: releaseReadiness.adoptionStatus, status: "Needs review" }
  ];
  const campaigns: Array<{ name: string; nextAction: string; owner: string; performance: string; status: CampaignStatus; type: string }> = [
    {
      name: campaignPlan.opportunity.title,
      nextAction: "Approve campaign plan",
      owner: campaignPlan.opportunity.owner,
      performance: "Not launched",
      status: "Needs review",
      type: campaignPlan.channel
    },
    {
      name: "Aged inventory boost",
      nextAction: "Confirm inventory and budget",
      owner: "Inventory Manager",
      performance: "$0 spend",
      status: "Blocked",
      type: "Paid ads"
    },
    {
      name: automation.playbook,
      nextAction: "Approve message template",
      owner: "Sales Manager",
      performance: automation.writeback,
      status: "Approved inactive",
      type: "Automation"
    }
  ];

  return (
    <section className={styles.shell} aria-labelledby="growth-title">
      <div className={styles.reviewBar}>
        <Eye size={16} aria-hidden="true" />
        <span><strong>{operationalStatus ? "Operational review mode." : "Review mode."}</strong> Growth can prepare work and show next steps. Live sends, ad spend, and CRM changes stay locked.</span>
      </div>

      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Marketing + Advertising</span>
          <h1 id="growth-title">Growth Console</h1>
          <p>Start here each day: choose the best opportunity, review the audience, approve the message, then track what happened.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.secondaryButton} href="/crm">Open CRM</Link>
          <Link className={styles.secondaryButton} href="/growth/admin">Manager review</Link>
          <Link className={styles.secondaryButton} href="/growth/results">Results proof</Link>
          <Link className={styles.secondaryButton} href="/growth/policy">Policy controls</Link>
          <a className={styles.primaryButton} href="#today">
            <Target size={16} aria-hidden="true" /> Start today
          </a>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Growth workspaces">
        {workspaceTabs.map((item) => (
          <a href={item.href} key={item.href}>{item.label}</a>
        ))}
      </nav>

      <section className={styles.pathPanel} aria-label="Growth execution path">
        {workPath.map((step, index) => (
          <article key={step}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </article>
        ))}
      </section>

      <div className={styles.metricsGrid} aria-label="Growth summary">
        <article><Target size={18} /><span>Opportunities</span><strong>{model.metrics[0]?.value}</strong></article>
        <article><UsersRound size={18} /><span>Reachable audience</span><strong>{model.metrics[1]?.value}</strong></article>
        <article><AlertTriangle size={18} /><span>Needs review</span><strong>{model.metrics[2]?.value}</strong></article>
        <article><BarChart3 size={18} /><span>Expected value</span><strong>{model.metrics[3]?.value}</strong></article>
      </div>

      <main className={styles.operatorGrid}>
        <section className={styles.panel} id="today">
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionLabel}>Today&apos;s Growth Work</span>
              <h2>Do this first</h2>
            </div>
            <span className={styles.statusNote}>{model.sourceMode}</span>
          </div>
          {primaryOpportunity ? (
            <div className={styles.priorityCard}>
              <div>
                <span className={styles.typePill}>{primaryOpportunity.type}</span>
                <h3>{primaryOpportunity.title}</h3>
                <p>{primaryOpportunity.reason}</p>
              </div>
              <dl>
                <div><dt>Audience</dt><dd>{primaryOpportunity.audience}</dd></div>
                <div><dt>Value</dt><dd>{primaryOpportunity.impact}</dd></div>
                <div><dt>Owner</dt><dd>{primaryOpportunity.owner}</dd></div>
              </dl>
              <div className={styles.cardActions}>
                <span className={readinessClass(primaryOpportunity.readiness)}>{primaryOpportunity.readiness}</span>
                <a href="#campaigns">Review campaign <ArrowRight size={15} aria-hidden="true" /></a>
              </div>
            </div>
          ) : (
            <div className={styles.priorityCard}>
              <div>
                <span className={styles.typePill}>Source review</span>
                <h3>No Growth opportunities are ready yet</h3>
                <p>Growth is connected to the operational layer, but no current source signals are available to rank.</p>
              </div>
              <div className={styles.cardActions}>
                <span className={styles.review}>Review needed</span>
                <a href="#controls">Check source controls <ArrowRight size={15} aria-hidden="true" /></a>
              </div>
            </div>
          )}
          <div className={styles.workList}>
            {model.opportunities.slice(1).map((opportunity) => (
              <article key={opportunity.title}>
                <div>
                  <strong>{opportunity.title}</strong>
                  <p>{opportunity.sourceSummary}</p>
                </div>
                <span className={readinessClass(opportunity.readiness)}>{opportunity.readiness}</span>
                <a href={opportunity.readiness === "Ready" ? "#campaigns" : "#attention"}>{opportunity.nextAction}</a>
              </article>
            ))}
          </div>
        </section>
      </main>

      <section className={styles.panel} id="attention">
        <details className={styles.drawer}>
          <summary>
            <span>
              <span className={styles.sectionLabel}>Needs Attention</span>
              <strong>Open blocker drawer</strong>
            </span>
            <small>{needsAttention.length} items need review</small>
          </summary>
          <div className={styles.attentionList}>
            {needsAttention.map((item) => (
              <article key={item.label}>
                <span className={item.status === "Blocked" ? styles.blocked : styles.review}>{item.status}</span>
                <strong>{item.label}</strong>
                <p>{item.reason}</p>
                <small>{item.action}</small>
              </article>
            ))}
          </div>
        </details>
      </section>

      <section className={styles.panel} id="campaigns">
        <details className={styles.drawer}>
          <summary>
            <span>
              <span className={styles.sectionLabel}>Campaigns</span>
              <strong>Open campaign drawer</strong>
            </span>
            <small>{activeCampaigns.length || campaigns.length} plans prepared for review</small>
          </summary>
          <div className={styles.drawerIntro}>
            <p>Review, approve, then keep launch locked until backend controls are approved.</p>
            <a className={styles.smallLink} href="#controls">View controls</a>
          </div>
          <div className={styles.campaignTable} role="table" aria-label="Growth campaigns">
            <div role="row">
              <span>Campaign</span>
              <span>Type</span>
              <span>Status</span>
              <span>Owner</span>
              <span>Next action</span>
              <span>Performance</span>
            </div>
            {(activeCampaigns.length ? [] : campaigns).map((campaign) => (
              <div role="row" key={campaign.name}>
                <strong>{campaign.name}</strong>
                <span>{campaign.type}</span>
                <span className={campaignClass(campaign.status)}>{campaign.status}</span>
                <span>{campaign.owner}</span>
                <a href={campaign.status === "Blocked" ? "#attention" : "#controls"}>{campaign.nextAction}</a>
                <span>{campaign.performance}</span>
              </div>
            ))}
            {activeCampaigns.map((campaign) => (
              <div role="row" key={campaign.id}>
                <strong>{campaign.opportunityTitle}</strong>
                <span>{campaign.channel}</span>
                <span className={campaign.launchLocked ? styles.blocked : styles.review}>{campaign.status}</span>
                <span>{campaign.ownerRole}</span>
                <a href={`/api/growth/campaigns/${campaign.id}`}>{campaign.nextAction}</a>
                <span>{campaign.messageDraftCount} draft · {campaign.audienceSnapshotCount} audience · {campaign.approvalCount} approval</span>
              </div>
            ))}
          </div>
        </details>
      </section>

      <section className={styles.panel} id="results">
        <details className={styles.drawer}>
          <summary>
            <span>
              <span className={styles.sectionLabel}>Results Snapshot</span>
              <strong>Open results drawer</strong>
            </span>
            <small>Read-only attribution</small>
          </summary>
          <div className={styles.drawerIntro}>
            <p>Measure outcomes, not noise.</p>
            <Link className={styles.smallLink} href="/growth/results">Open full results dashboard</Link>
          </div>
          <div className={styles.resultsGrid}>
            <article><CheckCircle2 size={17} /><span>Direct</span><strong>{results.direct}</strong><p>Replies, appointments, forms, sales, or service outcomes.</p></article>
            <article><ClipboardCheck size={17} /><span>Assisted</span><strong>{results.assisted}</strong><p>CRM follow-up connected within the approved window.</p></article>
            <article><Sparkles size={17} /><span>Influenced</span><strong>{results.influenced}</strong><p>Relevant exposure with incomplete identity or softer proof.</p></article>
            <article><Eye size={17} /><span>Context only</span><strong>{results.contextOnly}</strong><p>Opens help with context, but never prove customer intent alone.</p></article>
          </div>
        </details>
      </section>

      <section className={styles.panel} id="controls">
        <details className={styles.drawer}>
          <summary>
            <span>
              <span className={styles.sectionLabel}>Review Controls</span>
              <strong>Open manager controls</strong>
            </span>
            <small>{releaseReadiness.adoptionStatus}</small>
          </summary>
          <div className={styles.drawerIntro}>
            <p>Manager details stay here so the daily path stays short.</p>
            <span className={styles.statusNote}>{releaseReadiness.adoptionStatus}</span>
          </div>
          <div className={styles.controlGrid}>
            <article>
              <Lock size={18} aria-hidden="true" />
              <strong>Launch lock</strong>
              <p>{policy.nextAction}. Provider: {pilot.health.state}. Paid ads: {advertising.state}.</p>
            </article>
            {operationalStatus ? (
              <article>
                <ShieldCheck size={18} aria-hidden="true" />
                <strong>Operational backend</strong>
                <p>Growth APIs, durable records, and source-backed read models are active. Live send, paid spend, and source mutation remain locked.</p>
              </article>
            ) : null}
            <article>
              <ShieldCheck size={18} aria-hidden="true" />
              <strong>Record protection</strong>
              <p>Existing CRM, customer, inventory, quote, invoice, appointment, task, and repair records are not changed from this page.</p>
            </article>
            <article>
              <PauseCircle size={18} aria-hidden="true" />
              <strong>Automation lock</strong>
              <p>{automation.state}. {automation.summary}</p>
            </article>
            <article>
              <BarChart3 size={18} aria-hidden="true" />
              <strong>Best next move</strong>
              <p>{optimization.nextAction}. Recommendations stay advisory until approved.</p>
            </article>
          </div>
        </details>
      </section>
    </section>
  );
}
