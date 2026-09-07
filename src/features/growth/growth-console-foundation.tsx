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

import styles from "./growth-console-foundation.module.css";

type Opportunity = {
  audience: string;
  impact: string;
  nextAction: string;
  owner: string;
  readiness: "Ready" | "Review needed" | "Blocked";
  source: string;
  title: string;
  type: string;
};

type Automation = {
  action: string;
  owner: string;
  state: "Draft" | "Ready for review" | "Approved inactive";
  title: string;
  trigger: string;
};

const opportunities: Opportunity[] = [
  {
    audience: "48 CRM contacts",
    impact: "$42K expected pipeline",
    nextAction: "Review audience",
    owner: "Marketing Manager",
    readiness: "Ready",
    source: "CRM + Sales quotes",
    title: "Recover unsold estimates and quotes",
    type: "Customer recovery"
  },
  {
    audience: "12 vehicles",
    impact: "$68K aged inventory exposure",
    nextAction: "Approve vehicle list",
    owner: "Inventory Manager",
    readiness: "Review needed",
    source: "Inventory + Sales policy",
    title: "Promote aging retail-ready inventory",
    type: "Advertising"
  },
  {
    audience: "31 customers",
    impact: "$18K service opportunity",
    nextAction: "Check consent",
    owner: "Service Manager",
    readiness: "Blocked",
    source: "Service + CRM consent",
    title: "Seasonal service reminder",
    type: "Retention"
  },
  {
    audience: "22 leads",
    impact: "$29K possible reactivation",
    nextAction: "Edit message",
    owner: "Sales Manager",
    readiness: "Ready",
    source: "CRM lifecycle",
    title: "Reactivate cold leads with trade-in interest",
    type: "Lead nurture"
  }
];

const audienceRows = [
  ["Included", "64", "Valid CRM contact, relevant vehicle or service signal"],
  ["Excluded", "17", "Sold vehicle, stale quote, wrong lifecycle, or duplicate campaign"],
  ["Suppressed", "9", "Opt-out, missing consent, quiet window, or complaint flag"],
  ["Needs cleanup", "6", "Missing phone, email, owner, or source freshness"]
] as const;

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

function readinessClass(readiness: Opportunity["readiness"]) {
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
  return (
    <section className={styles.shell} aria-labelledby="growth-title">
      <div className={styles.reviewBar}>
        <Eye size={16} aria-hidden="true" />
        <span><strong>Review foundation.</strong> This is the first Growth Console implementation for user review before adoption. No live send is enabled.</span>
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
        <article><Target size={17} /><span>Opportunities</span><strong>4</strong></article>
        <article><UsersRound size={17} /><span>Reachable audience</span><strong>165</strong></article>
        <article><ShieldCheck size={17} /><span>Approval needed</span><strong>3</strong></article>
        <article><CircleDollarSign size={17} /><span>Expected value</span><strong>$157K</strong></article>
        <article><DatabaseZap size={17} /><span>Suppressed records</span><strong>9</strong></article>
      </div>

      <div className={styles.mainGrid} id="growth-home">
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionLabel}>Daily queue</span>
              <h2>What should we grow today?</h2>
            </div>
            <span className={styles.statusNote}>Review data</span>
          </div>
          <div className={styles.queue}>
            {opportunities.map((opportunity) => (
              <article className={styles.queueCard} key={opportunity.title}>
                <div>
                  <span className={styles.typePill}>{opportunity.type}</span>
                  <h3>{opportunity.title}</h3>
                  <p>{opportunity.source}</p>
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
            <div><CheckCircle2 size={17} /><span>Opportunity selected</span><strong>Quote recovery</strong></div>
            <div><CheckCircle2 size={17} /><span>Audience source</span><strong>CRM + Sales</strong></div>
            <div><ShieldCheck size={17} /><span>Approval state</span><strong>Manager needed</strong></div>
            <div><PauseCircle size={17} /><span>Live launch</span><strong>Unavailable</strong></div>
          </div>
          <p className={styles.guardrail}>Backend expansion is intentionally deferred. This page prepares the work and makes the next review step clear.</p>
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

      <div className={styles.twoColumn}>
        <section className={styles.panel} id="audiences">
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionLabel}>Audience Review</span>
              <h2>Know who is included before anything launches</h2>
            </div>
          </div>
          <div className={styles.audienceTable}>
            {audienceRows.map(([label, count, reason]) => (
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

      <section className={styles.crmPanel} aria-label="CRM writeback plan">
        <Sparkles size={22} aria-hidden="true" />
        <div>
          <span className={styles.sectionLabel}>CRM connection</span>
          <h2>Every growth action returns to the customer record</h2>
          <p>Planned writeback events: campaign prepared, audience approved, message approved, launch scheduled, reply received, appointment created, opportunity updated, sale/service outcome, opt-out, and cleanup needed.</p>
        </div>
        <Link className={styles.secondaryButton} href="/crm">Open CRM relationship record</Link>
      </section>
    </section>
  );
}

function MailIcon() {
  return <Mail size={25} aria-hidden="true" />;
}
