import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  DatabaseZap,
  Eye,
  Gauge,
  Mail,
  Megaphone,
  MessageSquareText,
  PauseCircle,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound
} from "lucide-react";

import { buildGrowthAdvertisingReviewModel } from "@/server/growth/advertising-activation";
import { buildGrowthAutomationActivationReviewModel } from "@/server/growth/automation-activation";
import { buildGrowthCampaignPlanReviewModel, buildGrowthConsoleReadModel, type GrowthReadiness } from "@/server/growth/read-model";
import { buildGrowthPolicyReviewModel } from "@/server/growth/policy";
import { buildGrowthProviderPilotReviewModel } from "@/server/growth/provider-pilot";

import styles from "./growth-console-foundation.module.css";

type Automation = {
  action: string;
  owner: string;
  state: "Draft" | "Ready for review" | "Approved inactive";
  title: string;
  trigger: string;
};

const automations: Automation[] = [
  {
    action: "Create follow-up task and prepare message",
    owner: "Sales Manager",
    state: "Ready for review",
    title: "Unsold quote recovery",
    trigger: "Quote saved but not accepted after approved wait"
  },
  {
    action: "Prepare ad set and vehicle audience signal",
    owner: "Inventory Manager + GM",
    state: "Draft",
    title: "Aged inventory boost",
    trigger: "Retail-ready vehicle crosses age threshold"
  },
  {
    action: "Prepare reminder and appointment call-to-action",
    owner: "Service Manager",
    state: "Draft",
    title: "Service reminder",
    trigger: "Customer reaches service interval or seasonal timing"
  },
  {
    action: "Prepare review request after cooling period",
    owner: "General Manager",
    state: "Approved inactive",
    title: "Review request",
    trigger: "Sale or service completion recorded"
  }
];

const pathSteps = [
  ["1", "Find opportunity", "Ranked by value, urgency, readiness, and risk."],
  ["2", "Review audience", "See included, excluded, suppressed, and cleanup records."],
  ["3", "Approve message or ad", "Confirm offer, claim, budget, timing, and owner."],
  ["4", "Schedule launch", "Live activation waits for approved backend controls."],
  ["5", "Track results", "Write outcomes back to CRM and assign follow-up."]
] as const;

function readinessClass(readiness: GrowthReadiness) {
  if (readiness === "Ready") return styles.ready;
  if (readiness === "Review needed") return styles.review;
  return styles.blocked;
}

function automationClass(state: Automation["state"]) {
  if (state === "Ready for review") return styles.ready;
  if (state === "Approved inactive") return styles.inactive;
  return styles.review;
}

export function GrowthConsoleFoundation() {
  const model = buildGrowthConsoleReadModel();
  const campaignPlan = buildGrowthCampaignPlanReviewModel();
  const policy = buildGrowthPolicyReviewModel();
  const pilot = buildGrowthProviderPilotReviewModel();
  const advertising = buildGrowthAdvertisingReviewModel();
  const automationActivation = buildGrowthAutomationActivationReviewModel();
  const selectedOpportunity = model.opportunities[0];
  const sourceHealthText = model.sourceHealth.map((source) => `${source.label}: ${source.state}`).join(" | ");

  return (
    <section className={styles.shell} aria-labelledby="growth-title">
      <div className={styles.reviewBar}>
        <Eye size={16} aria-hidden="true" />
        <span><strong>G1 read-only foundation.</strong> Source-labeled Growth signals are available for review. No live send is enabled.</span>
      </div>

      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Marketing + Advertising Command Center</span>
          <h1 id="growth-title">Growth Console</h1>
          <p>CRM is the record. Growth is the action plan: find the opportunity, approve the audience and message, then track the result.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.secondaryButton} href="/crm">Open CRM</Link>
          <Link className={styles.secondaryButton} href="/sales">Open Sales</Link>
          <button className={styles.primaryButton} type="button" disabled title="Backend launch controls are not implemented yet">
            <PauseCircle size={16} aria-hidden="true" /> Launch disabled
          </button>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Growth workspaces">
        {["Growth Home", "Marketing Workspace", "Advertising Workspace", "Audiences", "Message Studio", "Automations", "Results"].map((item) => (
          <a href={`#${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>{item}</a>
        ))}
      </nav>

      <section className={styles.pathPanel} aria-label="Growth execution path">
        {pathSteps.map(([number, title, detail]) => (
          <article key={title}>
            <span>{number}</span>
            <div>
              <strong>{title}</strong>
              <p>{detail}</p>
            </div>
          </article>
        ))}
      </section>

      <div className={styles.metricsGrid} aria-label="Growth summary">
        {model.metrics.map((metric, index) => {
          const MetricIcon = [Target, UsersRound, ShieldCheck, CircleDollarSign, DatabaseZap][index] ?? Gauge;
          return <article key={metric.label}><MetricIcon size={17} /><span>{metric.label}</span><strong>{metric.value}</strong></article>;
        })}
      </div>

      <div className={styles.mainGrid} id="growth-home">
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionLabel}>Daily queue</span>
              <h2>What should we grow today?</h2>
            </div>
            <span className={styles.statusNote}>{model.sourceMode}</span>
          </div>
          <p className={styles.sourceLine}>{sourceHealthText}</p>
          <div className={styles.queue}>
            {model.opportunities.map((opportunity) => (
              <article className={styles.queueCard} key={opportunity.title}>
                <div>
                  <span className={styles.typePill}>{opportunity.type}</span>
                  <h3>{opportunity.title}</h3>
                  <p>{opportunity.sourceSummary}</p>
                  <p>{opportunity.reason}</p>
                </div>
                <dl>
                  <div><dt>Audience</dt><dd>{opportunity.audience}</dd></div>
                  <div><dt>Impact</dt><dd>{opportunity.impact}</dd></div>
                  <div><dt>Owner</dt><dd>{opportunity.owner}</dd></div>
                </dl>
                <div className={styles.cardActions}>
                  <span className={readinessClass(opportunity.readiness)}>{opportunity.readiness}</span>
                  <a href={opportunity.nextAction === "Edit message" ? "#message-studio" : "#audiences"}>
                    {opportunity.nextAction} <ArrowRight size={15} aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionLabel}>Selected plan</span>
              <h2>Review before launch</h2>
            </div>
          </div>
          <div className={styles.readinessList}>
            <div><CheckCircle2 size={17} /><span>Opportunity selected</span><strong>{selectedOpportunity.title}</strong></div>
            <div><CheckCircle2 size={17} /><span>Audience source</span><strong>{selectedOpportunity.sourceSummary}</strong></div>
            <div><ShieldCheck size={17} /><span>Approval state</span><strong>{selectedOpportunity.readiness === "Ready" ? "Ready for manager review" : selectedOpportunity.readiness}</strong></div>
            <div><PauseCircle size={17} /><span>Live launch</span><strong>Unavailable</strong></div>
          </div>
          <p className={styles.guardrail}>G1 is read-only. It prepares the work and makes the next review step clear without changing CRM, customer, inventory, quote, invoice, appointment, task, or repair records.</p>
        </aside>
      </div>

      <section className={styles.workspaceGrid}>
        <article className={styles.workspaceCard} id="marketing-workspace">
          <MailIcon />
          <span className={styles.sectionLabel}>Marketing Workspace</span>
          <h2>Owned-channel follow-up</h2>
          <p>Email, SMS-ready drafts, call scripts, review requests, website prompts, and CRM follow-up tasks.</p>
          <a href="#message-studio">Review marketing plan</a>
        </article>
        <article className={styles.workspaceCard} id="advertising-workspace">
          <Megaphone size={25} aria-hidden="true" />
          <span className={styles.sectionLabel}>Advertising Workspace</span>
          <h2>Paid and public promotion</h2>
          <p>Vehicle ads, retargeting, audience signals, creative review, budget request, and performance tracking.</p>
          <a href="#message-studio">Review ad plan</a>
        </article>
        <article className={styles.workspaceCard} id="message-studio">
          <MessageSquareText size={25} aria-hidden="true" />
          <span className={styles.sectionLabel}>Message Studio</span>
          <h2>Approve what customers see</h2>
          <p>Plain-language offer, call to action, disclosure check, owner assignment, and reply handling.</p>
          <a href="#audiences">Review audience first</a>
        </article>
      </section>

      <section className={styles.panel} id="campaign-plan">
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabel}>Campaign Plan</span>
            <h2>Prepared plan waiting for approval</h2>
          </div>
          <span className={styles.statusNote}>Version {campaignPlan.version} | {campaignPlan.planStatus}</span>
        </div>
        <div className={styles.planGrid}>
          <article>
            <span>Opportunity</span>
            <strong>{campaignPlan.opportunity.title}</strong>
            <p>{campaignPlan.objective}</p>
          </article>
          <article>
            <span>Channel</span>
            <strong>{campaignPlan.channel}</strong>
            <p>{campaignPlan.budget}</p>
          </article>
          <article>
            <span>Saved versions</span>
            <strong>Audience v{campaignPlan.audienceSnapshotVersion} | Message v{campaignPlan.messageDraftVersion}</strong>
            <p>Prior versions are preserved for review and rollback.</p>
          </article>
          <article>
            <span>Next action</span>
            <strong>Manager approval</strong>
            <p>Approval request is saved; live sending still waits for policy and provider controls.</p>
          </article>
        </div>
        <div className={styles.versionStrip}>
          {campaignPlan.versionHistory.map((item, index) => <span key={item}>{index + 1}. {item}</span>)}
        </div>
      </section>

      <section className={styles.panel} id="approval">
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabel}>Launch Readiness</span>
            <h2>Blocked safely until policy clears</h2>
          </div>
          <span className={styles.statusNote}>Next: {policy.nextAction}</span>
        </div>
        <div className={styles.policyGrid}>
          {policy.checks.map((check) => (
            <article data-passed={check.passed ? "true" : "false"} key={check.label}>
              <span>{check.passed ? "Clear" : "Needs action"}</span>
              <strong>{check.label}</strong>
              <p>{check.action}</p>
            </article>
          ))}
        </div>
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.panel} id="audiences">
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionLabel}>Audience Review</span>
              <h2>Know who is included before anything launches</h2>
            </div>
          </div>
          <div className={styles.audienceTable}>
            {model.audienceRows.map(({ count, label, reason }) => (
              <div key={label}>
                <strong>{label}</strong>
                <span>{count}</span>
                <p>{reason}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel} id="results">
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionLabel}>Results</span>
              <h2>Measure outcomes, not noise</h2>
            </div>
          </div>
          <div className={styles.resultsGrid}>
            <article><BarChart3 size={17} /><span>Direct</span><strong>Appointments, replies, forms, sales</strong></article>
            <article><Gauge size={17} /><span>Assisted</span><strong>CRM follow-up within window</strong></article>
            <article><RadioTower size={17} /><span>Influenced</span><strong>Relevant exposure, incomplete identity</strong></article>
          </div>
          <p className={styles.guardrail}>Open rates are context, not proof. Replies, appointments, sales, and service outcomes matter more.</p>
        </section>
      </div>

      <section className={styles.panel} id="automations">
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabel}>Automation Library</span>
            <h2>Playbooks that wait for approval</h2>
          </div>
          <span className={styles.statusNote}>Source: docs/growth-console/AUTOMATIONS.md</span>
        </div>
        <div className={styles.automationGrid}>
          {automations.map((automation) => (
            <article key={automation.title}>
              <span className={automationClass(automation.state)}>{automation.state}</span>
              <h3>{automation.title}</h3>
              <p><strong>Trigger:</strong> {automation.trigger}</p>
              <p><strong>Action:</strong> {automation.action}</p>
              <small>{automation.owner}</small>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panel} id="automation-activation">
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabel}>Automation Activation</span>
            <h2>Automations stay inactive until the review path is clear</h2>
          </div>
          <span className={styles.statusNote}>{automationActivation.state}</span>
        </div>
        <div className={styles.activationGrid}>
          <article>
            <span>Playbook</span>
            <strong>{automationActivation.playbook}</strong>
            <p>{automationActivation.summary}</p>
          </article>
          <article>
            <span>Touch limit</span>
            <strong>{automationActivation.touchLimit}</strong>
            <p>{automationActivation.writeback}</p>
          </article>
          {automationActivation.checks.map((check) => (
            <article data-passed={check.passed ? "true" : "false"} key={check.label}>
              <span>{check.passed ? "Clear" : "Needs action"}</span>
              <strong>{check.label}</strong>
              <p>{check.nextAction}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panel} id="provider-pilot">
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabel}>Provider Pilot</span>
            <h2>Safe first launch path</h2>
          </div>
          <span className={styles.statusNote}>{pilot.health.mode} | {pilot.health.state}</span>
        </div>
        <div className={styles.pilotGrid}>
          <article>
            <span>Health</span>
            <strong>{pilot.health.summary}</strong>
          </article>
          <article>
            <span>Last dry run</span>
            <strong>{pilot.lastResult.deliveryState}</strong>
            <p>{pilot.lastResult.reconciliation}</p>
          </article>
          <article>
            <span>Next action</span>
            <strong>{pilot.lastResult.nextAction}</strong>
            <p>Pause, retry, and reconciliation are required before any real provider launch.</p>
          </article>
        </div>
      </section>

      <section className={styles.panel} id="paid-advertising">
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabel}>Paid Advertising</span>
            <h2>Ad launch stays locked until every approval is clear</h2>
          </div>
          <span className={styles.statusNote}>{advertising.state}</span>
        </div>
        <div className={styles.activationGrid}>
          <article>
            <span>Budget</span>
            <strong>{advertising.budget}</strong>
            <p>{advertising.summary}</p>
          </article>
          {advertising.checks.map((check) => (
            <article data-passed={check.passed ? "true" : "false"} key={check.label}>
              <span>{check.passed ? "Clear" : "Needs action"}</span>
              <strong>{check.label}</strong>
              <p>{check.nextAction}</p>
            </article>
          ))}
          <article>
            <span>Performance intake</span>
            <strong>{advertising.performance.impressions} impressions | {advertising.performance.clicks} clicks</strong>
            <p>No provider performance is ingested until an approved pilot exists.</p>
          </article>
        </div>
      </section>

      <section className={styles.crmPanel} aria-label="CRM writeback plan">
        <Sparkles size={22} aria-hidden="true" />
        <div>
          <span className={styles.sectionLabel}>CRM connection</span>
          <h2>Every growth action returns to the customer record</h2>
          <p>Planned writeback events are visible now, but CRM updates stay blocked until governed command and policy controls are implemented.</p>
          <div className={styles.writebackList}>
            {model.crmWritebackEvents.map((event) => <span key={event.event}>{event.event}: {event.state}</span>)}
          </div>
        </div>
        <Link className={styles.secondaryButton} href="/crm">Open CRM relationship record</Link>
      </section>
    </section>
  );
}

function MailIcon() {
  return <Mail size={25} aria-hidden="true" />;
}
