import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  DollarSign,
  FileSearch,
  FileText,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  Target,
  UserPlus,
  Users
} from "lucide-react";

import { CrmNextIntakeForm } from "@/features/crm-next/crm-next-intake-form";
import { CrmNextInlineTaskComposer } from "@/features/crm-next/crm-next-inline-task-composer";
import { CrmNextWorkbenchSections } from "@/features/crm-next/crm-next-workbench-sections";
import {
  CRM_CUSTOMER_LANDING_HREF,
  CRM_NEXT_CUSTOMERS_HREF,
  LEGACY_CRM_FALLBACK_HREF,
  LEGACY_CUSTOMER_ARCHIVE_HREF,
  crmNextCustomerAppointmentHref
} from "@/features/crm/crm-route-authority";
import type { CrmNextAccessReason } from "@/server/crm-next/access";
import type { CrmNextActionBridgePreview } from "@/server/crm-next/action-bridge";
import type { CrmNextAttentionItem, CrmNextCommandCenter, CrmNextCustomer360, CrmNextMilestoneStatus, CrmNextOperatingAction, CrmNextSalesRecord } from "@/server/crm-next/read-model";

import styles from "./crm-next-shell.module.css";

function levelClass(level: "High" | "Medium" | "Low") {
  if (level === "High") return styles.levelHigh;
  if (level === "Medium") return styles.levelMedium;
  return styles.levelLow;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function crmNextActionHref(actionId: string, customerId?: string) {
  const baseHref = `/crm-next/actions/${actionId}`;
  return customerId ? `${baseHref}?customerId=${encodeURIComponent(customerId)}` : baseHref;
}

const CUSTOMER_JOURNEY_STAGES = ["New", "Contact Attempt", "Contacted", "Appointment Scheduled", "Working Deal", "Missed Appt.", "Visit Follow-up", "Sold", "Lost"] as const;
const CRM_ACTIVITY_FILTERS = ["All", "Notes", "Appt", "Phone", "SMS", "Email", "Tasks", "Chat", "Other"] as const;

function customerJourneyStage(customer: CrmNextCustomer360, activeAttentionItem?: CrmNextAttentionItem) {
  const nextAction = `${customer.nextAction} ${activeAttentionItem?.nextAction ?? ""}`.toLowerCase();
  if (customer.openDeals > 0 || nextAction.includes("deal")) return "Working Deal";
  if (nextAction.includes("appointment") || nextAction.includes("schedule")) return "Appointment Scheduled";
  if (customer.communications.length > 0 || nextAction.includes("call") || nextAction.includes("contact")) return "Contacted";
  return "New";
}

function customerWorkIssue(item: CrmNextAttentionItem) {
  const reason = item.reason.toLowerCase();
  const nextAction = item.nextAction || "Review customer record";
  if (reason.includes("payment")) {
    return {
      done: "Payment status, customer promise, and next due date are recorded.",
      issue: item.reason,
      why: "Finance risk can interrupt delivery, collections, or the next customer commitment."
    };
  }
  if (reason.includes("title")) {
    return {
      done: "Title status is confirmed, blocker is owned, and the customer has a clear update.",
      issue: item.reason,
      why: "Title uncertainty can block delivery, registration, financing, or customer trust."
    };
  }
  if (reason.includes("service") || reason.includes("appointment")) {
    return {
      done: "Appointment or service plan is scheduled, confirmed, or clearly carried forward.",
      issue: item.reason,
      why: "The customer needs a clear service path before the issue becomes a complaint."
    };
  }
  if (reason.includes("insurance") || reason.includes("claim")) {
    return {
      done: "Claim status, responsible party, and customer follow-up window are recorded.",
      issue: item.reason,
      why: "Insurance work often depends on outside parties and needs visible ownership."
    };
  }
  return {
    done: `${nextAction} is completed or updated with the customer outcome and next follow-up.`,
    issue: item.reason || "Customer record needs review",
    why: "The customer record needs enough clarity for staff to take the next safe step."
  };
}

export function CrmNextUnavailable({ fallbackHref, reason }: { fallbackHref: string; reason: CrmNextAccessReason }) {
  const message = reason === "CRM_NEXT_OFF"
    ? "CRM Next is safely turned off. Customer Archive and the current CRM fallback remain available."
    : "CRM Next is not enabled for your current workspace.";

  return (
    <section className={styles.blocked} aria-label="CRM Next unavailable">
      <small>CRM NEXT</small>
      <h1>CRM Next is protected right now.</h1>
      <p>{message}</p>
      <div className={styles.buttonRow}>
        <Link className={styles.primaryButton} href={fallbackHref}>Return to my workspace</Link>
        <Link className={styles.secondaryButton} href={LEGACY_CUSTOMER_ARCHIVE_HREF}>Legacy customer archive</Link>
        <Link className={styles.secondaryButton} href={LEGACY_CRM_FALLBACK_HREF}>Legacy CRM fallback</Link>
      </div>
    </section>
  );
}

function CrmNextFrame({ active, children, userName }: { active: "command" | "new" | "attention" | "customer" | "customers" | "work" | "progress" | "search" | "pipeline" | "timeline" | "appointments" | "deals" | "support" | "execution" | "intelligence" | "pilot" | "hardening" | "coexistence" | "release" | "safety" | "review"; children: React.ReactNode; userName: string }) {
  const links = [
    { id: "command", href: "/crm-next", label: "Command Center", icon: LayoutDashboard },
    { id: "attention", href: "/crm-next/needs-attention", label: "Needs Attention", icon: Bell },
    { id: "work", href: "/crm-next/work/attn-michael-overdue-follow-up", label: "Work Customer", icon: ClipboardCheck },
    { id: "search", href: "/crm-next/search", label: "Search", icon: Search },
    { id: "pipeline", href: "/crm-next/pipeline", label: "Pipeline", icon: Target },
    { id: "timeline", href: "/crm-next/timeline", label: "Timeline", icon: FileSearch },
    { id: "appointments", href: "/crm-next/appointments", label: "Appointments", icon: CalendarDays },
    { id: "deals", href: "/crm-next/deals", label: "Deals", icon: DollarSign },
    { id: "support", href: "/crm-next/ownership-support", label: "Ownership & Support", icon: FileText },
    { id: "execution", href: "/crm-next/shared-execution", label: "Shared Execution", icon: ClipboardCheck },
    { id: "intelligence", href: "/crm-next/intelligence-foundation", label: "Intelligence", icon: Brain }
  ] as const;

  return (
    <section className={styles.shell}>
      <div className={styles.frame}>
        <aside className={styles.sidebar} aria-label="CRM Next navigation">
          <div className={styles.brand}>Time Motor Sales</div>
          <Link className={styles.consoleReturn} href={CRM_CUSTOMER_LANDING_HREF}>
            <ArrowLeft size={16} /> Customers console
          </Link>
          <nav className={styles.nav}>
            {links.slice(0, 1).map(({ id, href, label, icon: Icon }) => (
              <Link aria-current={active === id ? "page" : undefined} href={href} key={id}>
                <Icon size={17} /> {label}
              </Link>
            ))}
            <div className={styles.navGroup} data-active={active === "customers" || active === "customer" || active === "new" ? "true" : undefined}>
              <Link aria-current={active === "customers" || active === "customer" ? "page" : undefined} href={CRM_NEXT_CUSTOMERS_HREF}>
                <Users size={17} /> Customers
              </Link>
              <div className={styles.navChildren}>
                <Link aria-current={active === "customers" ? "page" : undefined} href={CRM_NEXT_CUSTOMERS_HREF}>Customer List</Link>
                <Link aria-current={active === "new" ? "page" : undefined} href="/crm-next/new">Add Customer</Link>
                <Link href="/crm-next/pipeline">Leads</Link>
              </div>
            </div>
            {links.slice(1).map(({ id, href, label, icon: Icon }) => (
              <Link aria-current={active === id ? "page" : undefined} href={href} key={id}>
                <Icon size={17} /> {label}
              </Link>
            ))}
            <Link href={LEGACY_CRM_FALLBACK_HREF}><ChevronRight size={17} /> Legacy CRM fallback</Link>
            <Link href={LEGACY_CUSTOMER_ARCHIVE_HREF}><ChevronRight size={17} /> Legacy customer archive</Link>
          </nav>
          <div className={styles.operator}>
            <strong>{userName}</strong>
            <small>Team workspace</small>
          </div>
        </aside>
        <main className={styles.content}>{children}</main>
      </div>
    </section>
  );
}

function Topbar({ defaultQuery = "" }: { defaultQuery?: string }) {
  return (
    <div className={styles.topbar}>
      <form action="/crm-next/search" className={styles.search} role="search">
        <Search size={20} aria-hidden="true" />
        <input
          aria-label="Search CRM Next"
          defaultValue={defaultQuery}
          name="q"
          placeholder="Search customers, vehicles, deals, stock #, RO..."
          type="search"
        />
        <button type="submit">Search</button>
      </form>
      <div className={styles.topActions}>
        <Link className={styles.secondaryButton} href="/crm-next/new"><UserPlus size={16} /> Add Customer / Prospect</Link>
        <div className={styles.governance}><ShieldCheck size={16} /> CRM Next active</div>
      </div>
    </div>
  );
}

function OperationalSourceStrip({ model }: { model: CrmNextCommandCenter }) {
  return (
    <section className={styles.sourceStrip} aria-label="CRM Next source status">
      <div>
        <span className={styles.eyebrow}>Operational read status</span>
        <strong>{model.operationalRead.state.replaceAll("_", " ")}</strong>
        <p>{model.operationalRead.safety}</p>
      </div>
      <div className={styles.sourcePills}>
        {model.operationalRead.sources.map((source) => (
          <Link className={styles.sourcePill} data-state={source.state} href={source.href} key={`${source.id}-${source.observedAt}`}>
            <span>{source.label}</span>
            <b>{source.state.replaceAll("_", " ")}</b>
            <small>{source.sourceOfTruth}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CompactSourceStatus({ model }: { model: CrmNextCommandCenter }) {
  return (
    <div className={styles.compactSourceStatus} aria-label="CRM Next compact source status">
      <span>Source status: <strong>{model.operationalRead.state.replaceAll("_", " ")}</strong></span>
      {model.operationalRead.sources.slice(0, 4).map((source) => (
        <Link data-state={source.state} href={source.href} key={`${source.id}-${source.label}`}>
          {source.label}: {source.state.replaceAll("_", " ")}
        </Link>
      ))}
      <small>No live communications</small>
    </div>
  );
}

function automationLevelClass(severity: string) {
  if (severity === "critical" || severity === "high") return styles.levelHigh;
  if (severity === "medium") return styles.levelMedium;
  return styles.levelLow;
}

function CrmNextRecommendedWork({ model }: { model: CrmNextCommandCenter }) {
  const recommendations = model.enterpriseLayer.automationRecommendations.slice(0, 4);
  if (recommendations.length === 0) return null;

  return (
    <article className={`${styles.card} ${styles.enterprisePanel}`}>
      <header>
        <div>
          <h2>Recommended by system</h2>
          <p className={styles.muted}>CRM Next is surfacing the next safest customer work from the signals already visible to the team.</p>
        </div>
        <span className={styles.pill}>{recommendations.length} ready</span>
      </header>
      <div className={styles.enterpriseActionList}>
        {recommendations.map((item) => (
          <Link className={styles.enterpriseActionRow} href={item.href} key={item.id}>
            <span>
              <strong>{item.title}</strong>
              <small>{item.explanation}</small>
            </span>
            <b className={automationLevelClass(item.severity)}>{item.actionLabel}</b>
          </Link>
        ))}
      </div>
    </article>
  );
}

function CrmNextSupportingParties({ model, compact = false }: { compact?: boolean; model: CrmNextCommandCenter }) {
  const parties = model.enterpriseLayer.supportingParties.slice(0, compact ? 3 : 3);
  if (parties.length === 0) return null;

  return (
    <article className={styles.sidePanel}>
      <header>
        <h2>Supporting Parties</h2>
        <span className={styles.pill}>{parties.length}</span>
      </header>
      <div className={styles.partyList}>
        {parties.map((context) => (
          <Link className={styles.partyItem} href={context.associations[0]?.href ?? "/crm-next/ownership-support"} key={context.party.id}>
            <strong>{context.party.name}</strong>
            <small>{context.party.typeLabel} · {context.openFollowUps.length} follow-up</small>
            <span>{context.workbookCandidates[0]?.title ?? context.associations[0]?.label ?? "Open supporting context"}</span>
          </Link>
        ))}
      </div>
    </article>
  );
}

function CrmNextReportReadiness({ model }: { model: CrmNextCommandCenter }) {
  const brief = model.enterpriseLayer.reportingBrief;
  return (
    <article className={styles.card}>
      <header>
        <div>
          <h2>Report readiness</h2>
          <p className={styles.muted}>{brief.managerSummary}</p>
        </div>
        <span className={styles.pill}>{brief.reviewableSeedCount} seeds</span>
      </header>
      <div className={styles.reportSectionList}>
        {brief.sections.slice(0, 4).map((section) => (
          <Link className={styles.reportSectionItem} href={section.items[0]?.href ?? "/crm-next/timeline"} key={section.reportType}>
            <span>{section.title}</span>
            <strong>{section.items.length}</strong>
          </Link>
        ))}
      </div>
    </article>
  );
}

function CrmNextAdminGuardrails({ model }: { model: CrmNextCommandCenter }) {
  const controls = model.enterpriseLayer.adminGuardrails.slice(0, 4);
  if (controls.length === 0) return null;

  return (
    <article className={styles.sidePanel}>
      <header>
        <h2>Admin guardrails</h2>
        <span className={styles.pill}>{controls.length}</span>
      </header>
      <div className={styles.guardrailList}>
        {controls.map((control) => (
          <Link href={control.href} key={control.title}>
            <strong>{control.title}</strong>
            <small>{control.summary}</small>
          </Link>
        ))}
      </div>
    </article>
  );
}

export function CrmNextCommandCenterView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="command" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Command Center Dashboard</span>
          <h1>{model.commandCenter.headline}</h1>
          <p>{model.commandCenter.guidance}</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/new"><UserPlus size={16} /> Add Customer / Prospect</Link>
          <Link className={styles.primaryButton} href="/crm-next/needs-attention"><Bell size={16} /> View attention queue</Link>
          <Link className={styles.secondaryButton} href="/crm-next/search"><Search size={16} /> Search CRM Next</Link>
          <Link className={styles.secondaryButton} href="/crm-next/customers/michael-johnson"><Users size={16} /> Open Customer 360</Link>
          <Link className={styles.secondaryButton} href="/crm-next/work/attn-michael-overdue-follow-up"><ClipboardCheck size={16} /> Work customer</Link>
          <Link className={styles.secondaryButton} href="/crm-next/pipeline"><Target size={16} /> Pipeline</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="CRM Next summary">
        {model.summary.map((item) => (
          <Link className={styles.summaryCard} data-tone={item.tone} href={item.href} key={item.label}>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
            <p>{item.trend}</p>
            <span>{item.source}</span>
          </Link>
        ))}
      </section>

      <section className={styles.enterpriseSurfaceGrid} aria-label="CRM Next operating intelligence">
        <CrmNextRecommendedWork model={model} />
        <CrmNextReportReadiness model={model} />
      </section>

      <section className={styles.dashboardGrid}>
        <article className={`${styles.card} ${styles.wide}`}>
          <header><h2>Needs Attention (Top 5)</h2><Link className={styles.textLink} href="/crm-next/needs-attention">View all</Link></header>
          <div className={styles.attentionList}>
            {model.attention.map((item) => <AttentionRow item={item} key={item.id} />)}
          </div>
        </article>
        <article className={styles.card}>
          <header><h2>Intelligence & Next Action</h2><span className={styles.pill}>Today</span></header>
          <div className={styles.nextList}>
            {model.nextActions.map((action) => (
              <Link className={styles.nextItem} href={action.href} key={action.id}>
                <CheckCircle2 size={20} />
                <span><strong>{action.label}</strong><small>{action.detail}</small></span>
                <b className={levelClass(action.impact)}>{action.impact}</b>
              </Link>
            ))}
          </div>
        </article>
        <CrmNextSupportingParties model={model} />
        <article className={styles.card} id="pipeline">
          <header><h2>Pipeline Overview</h2><Link className={styles.textLink} href="/crm-next/pipeline">Open board</Link></header>
          <div className={styles.pipelineRows}>
            {model.pipeline.map((row) => (
              <div className={styles.pipelineRow} key={row.label}>
                <span>{row.label}</span><span className={styles.bar}><i style={{ width: `${Math.max(12, row.value)}%` }} /></span><strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className={styles.card}>
          <header><h2>Revenue (MTD)</h2><Link className={styles.textLink} href="/crm-next/deals"><DollarSign size={18} /></Link></header>
          <div className={styles.revenueValue}>{model.revenue.monthToDate}</div>
          <p className={styles.muted}>{model.revenue.trend}</p>
        </article>
        <CrmNextAdminGuardrails model={model} />
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextCustomersListView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="customers" userName={model.userName}>
      <Topbar />
      <section className={styles.compactHero}>
        <div>
          <span className={styles.eyebrow}>Customers</span>
          <h1>Find the customer, then keep working.</h1>
          <p>Browse active customers when you do not remember the name, or jump into Customer 360, Attend Mode, leads, and intake.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/new"><UserPlus size={16} /> Add Customer / Prospect</Link>
          <Link className={styles.secondaryButton} href="/crm-next/search"><Search size={16} /> Search CRM Next</Link>
          <Link className={styles.secondaryButton} href="/crm-next/pipeline"><Target size={16} /> Leads</Link>
        </div>
      </section>

      <section className={styles.customerDirectoryGrid}>
        <article className={`${styles.card} ${styles.directoryCard}`}>
          <header>
            <h2>Customer List</h2>
            <span className={styles.pill}>{model.customers.length} visible</span>
          </header>
          <div className={styles.directoryRows}>
            {model.customers.map((customer) => {
              const activeAttentionItem = model.attention.find((item) => item.customerId === customer.id);
              const attendHref = activeAttentionItem?.workHref ?? `/crm-next/work/customer-read-${encodeURIComponent(customer.id)}`;
              return (
                <article className={styles.directoryRow} key={customer.id}>
                  <Link className={styles.directoryIdentity} href={`/crm-next/customers/${customer.id}`}>
                    <span className={styles.avatar}>{initials(customer.name)}</span>
                    <span>
                      <strong>{customer.name}</strong>
                      <small>{customer.phone} · {customer.email}</small>
                    </span>
                  </Link>
                  <dl>
                    <div><dt>Owner</dt><dd>{activeAttentionItem?.owner ?? "Unassigned"}</dd></div>
                    <div><dt>Risk</dt><dd>{customer.riskLevel}</dd></div>
                    <div><dt>Status</dt><dd>{customer.status}</dd></div>
                    <div><dt>Next</dt><dd>{customer.nextAction}</dd></div>
                  </dl>
                  <div className={styles.directoryActions}>
                    <Link className={styles.secondaryButton} href={`/crm-next/customers/${customer.id}`}>Open</Link>
                    <Link className={styles.primaryButton} href={attendHref}>Attend</Link>
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <aside className={styles.directorySide}>
          <article className={styles.sidePanel}>
            <h2>Customer tools</h2>
            <div className={styles.miniActionList}>
              <Link href="/crm-next/new"><UserPlus size={16} /> Add a customer or prospect</Link>
              <Link href="/crm-next/pipeline"><Target size={16} /> Open leads and pipeline</Link>
              <Link href="/crm-next/needs-attention"><Bell size={16} /> View customers needing attention</Link>
              <Link href="/crm-next/search"><Search size={16} /> Search all CRM Next records</Link>
            </div>
          </article>
        </aside>
      </section>
    </CrmNextFrame>
  );
}

function statusClass(status: CrmNextMilestoneStatus) {
  if (status === "VERIFIED") return styles.statusVerified;
  if (status === "IMPLEMENTED_UNVERIFIED") return styles.statusImplemented;
  if (status === "IN_PROGRESS") return styles.statusProgress;
  if (status === "HELD") return styles.statusHeld;
  if (status === "DEFERRED") return styles.statusDeferred;
  if (status === "CONTRACTED") return styles.statusContracted;
  return styles.statusPlanned;
}

export function CrmNextProgressView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="progress" userName={model.userName}>
      <Topbar />
      <OperationalSourceStrip model={model} />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Implementation Progress</span>
          <h1>CRM Next build cockpit</h1>
          <p>Review what is implemented, what is next, and what remains safely gated.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next">Open CRM Next</Link>
          <Link className={styles.secondaryButton} href={LEGACY_CRM_FALLBACK_HREF}>Legacy CRM fallback</Link>
          <Link className={styles.secondaryButton} href={LEGACY_CUSTOMER_ARCHIVE_HREF}>Legacy customer archive</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="CRM Next implementation scorecard">
        <article className={styles.summaryCard} data-tone="blue"><small>Envelope</small><strong>{model.progress.envelopeCount}</strong><p>next milestones staged</p></article>
        <article className={styles.summaryCard}><small>Implemented</small><strong>{model.progress.completedCount}</strong><p>not yet promoted</p></article>
        <article className={styles.summaryCard}><small>Verified</small><strong>{model.progress.verifiedCount}</strong><p>release-grade proof later</p></article>
        <article className={styles.summaryCard}><small>Held</small><strong>{model.progress.heldCount}</strong><p>blocked decisions</p></article>
        <article className={styles.summaryCard}><small>Next</small><strong>{model.progress.nextMilestone}</strong><p>current control slice</p></article>
      </section>

      <article className={styles.card} id="crm-next-envelope">
        <header>
          <div>
            <h2>CRM Next milestone envelope</h2>
            <p className={styles.muted}>Built sequentially. Each slice gets checks, honest status, and a commit checkpoint before the next one.</p>
          </div>
          <span className={styles.pill}>CRMN-016 → CRMN-119</span>
        </header>
        <div className={styles.progressList}>
          {model.progress.milestones.map((milestone) => (
            <Link className={styles.progressRow} href={milestone.reviewHref} key={milestone.id}>
              <span>
                <strong>{milestone.id}</strong>
                <small>{milestone.title}</small>
              </span>
              <span>{milestone.objective}</span>
              <b className={statusClass(milestone.status)}>{milestone.status}</b>
            </Link>
          ))}
        </div>
      </article>

      <section className={styles.dashboardGrid}>
        <article className={styles.card}>
          <header><h2>How to review progress</h2></header>
          <p>Start here, open the review link for any implemented milestone, and compare the screen against the approved UX baseline.</p>
        </article>
        <article className={styles.card}>
          <header><h2>Safety promise</h2></header>
          <p>CRM Next is available for internal use. Operational Dispatch handoff creation is enabled; customer communications, payments, documents, and route replacement remain controlled.</p>
        </article>
        <article className={styles.card}>
          <header><h2>Rollback posture</h2></header>
          <p>Turn off `CRM_NEXT` and CRM Next fails closed while Customer Archive and the current CRM fallback remain available.</p>
        </article>
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextReviewCenterView({ model }: { model: CrmNextCommandCenter }) {
  const reviewLinks = [
    {
      href: "/crm-next/progress",
      label: "Progress",
      detail: "Implementation milestones, evidence, and current proof state."
    },
    {
      href: "/crm-next/pilot-readiness",
      label: "Pilot Readiness",
      detail: "Pilot scenarios and review expectations before any rollout decision."
    },
    {
      href: "/crm-next/hardening",
      label: "Hardening",
      detail: "Testing, accessibility, security, rollback, and evidence controls."
    },
    {
      href: "/crm-next/coexistence",
      label: "Coexistence",
      detail: "Legacy customer archive and legacy CRM fallback protection, migration rules, and switchback posture."
    },
    {
      href: "/crm-next/pilot-release",
      label: "Pilot Release",
      detail: "Promotion checklist, training readiness, and leadership approval hold."
    },
    {
      href: "/crm-next/system/permissions",
      label: "Permissions Review",
      detail: "Who can access CRM Next and what remains blocked."
    },
    {
      href: "/crm-next/system/states",
      label: "State Review",
      detail: "Empty, partial, unavailable, and protected states."
    },
    {
      href: "/crm-next/system/rollback",
      label: "Rollback Review",
      detail: "How CRM Next fails closed while the legacy customer archive and legacy CRM fallback remain available."
    }
  ];

  return (
    <CrmNextFrame active="review" userName={model.userName}>
      <Topbar />
      <OperationalSourceStrip model={model} />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Review Center</span>
          <h1>Hidden build-review controls</h1>
          <p>These pages are kept for approval, safety, and release review. They are not regular staff workflow screens.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next">Return to operating CRM</Link>
          <Link className={styles.secondaryButton} href={LEGACY_CRM_FALLBACK_HREF}>Legacy CRM fallback</Link>
          <Link className={styles.secondaryButton} href={LEGACY_CUSTOMER_ARCHIVE_HREF}>Legacy customer archive</Link>
        </div>
      </section>

      <section className={styles.searchGroups} aria-label="CRM Next hidden review pages">
        {reviewLinks.map((link) => (
          <Link className={styles.card} href={link.href} key={link.href}>
            <header>
              <h2>{link.label}</h2>
              <span className={styles.pill}>Review only</span>
            </header>
            <p>{link.detail}</p>
            <p className={styles.safeNotice}>Hidden from regular staff navigation; available when called out for review.</p>
          </Link>
        ))}
      </section>

      <article className={styles.card}>
        <header>
          <div>
            <h2>Command Center implementation cards</h2>
            <p className={styles.muted}>These cards explain the build milestones behind the operating dashboard and stay here for review only.</p>
          </div>
          <span className={styles.pill}>Hidden from staff nav</span>
        </header>
        <section className={styles.commandModeGrid} aria-label="CRM Next command center review modes">
          {model.commandCenter.modes.map((mode) => (
            <Link className={styles.commandModeCard} href={mode.href} id={mode.id} key={mode.id}>
              <span className={styles.eyebrow}>{mode.milestone} · {mode.audience}</span>
              <div>
                <h2>{mode.title}</h2>
                <b>{mode.state}</b>
              </div>
              <p>{mode.objective}</p>
              <dl>
                <div><dt>Primary</dt><dd>{mode.primaryMetric}</dd></div>
                <div><dt>Secondary</dt><dd>{mode.secondaryMetric}</dd></div>
              </dl>
              <small>{mode.guidance}</small>
            </Link>
          ))}
        </section>
      </article>

      <article className={styles.card}>
        <header>
          <div>
            <h2>Dispatch bridge implementation proof</h2>
            <p className={styles.muted}>This is the builder-facing explanation that was removed from the staff Work Customer screen.</p>
          </div>
          <span className={styles.pill}>{model.bridge.liveTaskCreationEnabled ? "Task creation enabled" : "Review only"}</span>
        </header>
        <section className={styles.handoffGrid} aria-label="CRM Next dispatch bridge proof">
          <article className={styles.handoffCard}>
            <span>Backend contract</span>
            <strong>CRM action prepared</strong>
            <b>Customer follow-up</b>
            <small>CRM Next prepares the task payload from attention/customer context.</small>
          </article>
          <article className={styles.handoffCard}>
            <span>Dispatch Board</span>
            <strong>Task engine owns creation</strong>
            <b>Source-owned write</b>
            <small>The existing Dispatch task engine remains the source of truth after a handoff is created.</small>
          </article>
          <article className={styles.handoffCard}>
            <span>Activation boundary</span>
            <strong>Internal task only</strong>
            <b>No external send</b>
            <small>Calls, texts, emails, documents, payments, and customer writes remain gated.</small>
          </article>
        </section>
        <p className={styles.safeNotice}>{model.bridge.message}</p>
      </article>
    </CrmNextFrame>
  );
}

function AttentionRow({ item }: { item: CrmNextAttentionItem }) {
  return (
    <Link className={styles.attentionItem} href={item.workHref}>
      <span className={styles.avatar}>{initials(item.customerName)}</span>
      <span><strong>{item.customerName}</strong><small>{item.reason} · {item.area} · {item.owner}</small></span>
      <b className={levelClass(item.level)}>{item.level}</b>
    </Link>
  );
}

export function CrmNextNeedsAttentionView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="attention" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Needs Attention List</span>
          <h1>Prioritized customers that need action</h1>
          <p>Open one row, work the customer, and return here for the next priority.</p>
        </div>
        <Link className={styles.secondaryButton} href="/crm-next">Back to Command Center</Link>
      </section>
      <article className={styles.card}>
        <div className={styles.attentionList}>
          {model.attention.map((item) => <AttentionRow item={item} key={item.id} />)}
        </div>
      </article>
    </CrmNextFrame>
  );
}

export function CrmNextSearchView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="search" userName={model.userName}>
      <Topbar defaultQuery={model.search.activeQuery} />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Global Search</span>
          <h1>Find the customer, then take the next safe action</h1>
          <p>{model.search.queryPlaceholder}</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/new"><UserPlus size={16} /> Add Customer / Prospect</Link>
          <Link className={styles.secondaryButton} href="/crm-next">Back to Command Center</Link>
        </div>
      </section>
      <section className={styles.searchGroups} aria-label="CRM Next grouped search results">
        {model.search.groups.map((group) => (
          <Link className={styles.card} href={group.href} key={group.id}>
            <header><h2>{group.label}</h2><span className={styles.pill}>{group.count}</span></header>
            <p>{group.description}</p>
          </Link>
        ))}
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextIntakeView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="new" userName={model.userName}>
      <Topbar />
      <section className={styles.intakeHero}>
        <div>
          <span className={styles.eyebrow}>CRM Next Intake</span>
          <h1>Add a customer or prospect</h1>
          <p>Create the shared customer record once, then continue the sales or service workflow from CRM Next.</p>
        </div>
        <div className={styles.intakeHeroFacts}>
          <span><strong>Shared customer record</strong><small>Visible across CRM modes</small></span>
          <span><strong>Duplicate check</strong><small>Phone and email are matched</small></span>
          <span><strong>Prospect lead</strong><small>Optional after customer save</small></span>
        </div>
      </section>

      <section className={styles.intakeLayout}>
        <CrmNextIntakeForm />
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextTimelineView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="timeline" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Unified Timeline</span>
          <h1>Customer activity timeline</h1>
          <p>See recent customer activity, appointments, opportunities, and Dispatch work in one place.</p>
        </div>
        <Link className={styles.secondaryButton} href="/crm-next/customers/michael-johnson">Open Customer 360</Link>
      </section>
      <article className={styles.card}>
        <div className={styles.commList}>
          {model.timeline.map((event) => (
            <Link className={styles.communicationItem} href={event.href} key={event.id}>
              <strong>{event.source}</strong>
              <span>{event.label}<small>{event.detail}</small></span>
              <small>{event.occurredAt}</small>
            </Link>
          ))}
        </div>
      </article>
    </CrmNextFrame>
  );
}

function SalesTable({ records, title, summary }: { records: CrmNextSalesRecord[]; title: string; summary: string }) {
  return (
    <article className={styles.card}>
      <header>
        <div>
          <h2>{title}</h2>
          <p className={styles.muted}>{summary}</p>
        </div>
        <span className={styles.pill}>Open</span>
      </header>
      <div className={styles.salesRows}>
        {records.map((record) => (
          <Link className={styles.salesRow} href={record.href} key={record.id}>
            <span><strong>{record.customerName}</strong><small>{record.vehicle}</small></span>
            <span>{record.amount}</span>
            <span>{record.stage}</span>
            <span>{record.owner}</span>
            <span>{record.nextAction}</span>
          </Link>
        ))}
      </div>
    </article>
  );
}

export function CrmNextPipelineView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="pipeline" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Pipeline</span>
          <h1>Pipeline board</h1>
          <p>Review lead and opportunity flow, owners, value, stage, and next action.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.secondaryButton} href="/crm-next/deals">Deals</Link>
          <Link className={styles.secondaryButton} href="/crm-next/test-drives">Test drives</Link>
          <Link className={styles.secondaryButton} href="/crm-next/appointments">Appointments</Link>
        </div>
      </section>
      <SalesTable records={model.sales.opportunities} title="Opportunities" summary="Stage, amount, owner, and next action are visible for the sales team." />
    </CrmNextFrame>
  );
}

export function CrmNextAppointmentsView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="appointments" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Appointments</span>
          <h1>Appointments</h1>
          <p>See customer appointments and jump into the appointment workspace when scheduling work is needed.</p>
        </div>
        <Link className={styles.primaryButton} href="/appointments">Open existing appointment workspace</Link>
      </section>
      <SalesTable records={model.sales.appointments} title="Appointment-linked opportunities" summary="Customer appointment context for the sales team." />
    </CrmNextFrame>
  );
}

export function CrmNextTestDrivesView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="pipeline" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Test Drives</span>
          <h1>Test drives</h1>
          <p>Show who wants to drive what vehicle and what staff should do next.</p>
        </div>
        <Link className={styles.secondaryButton} href="/crm-next/pipeline">Back to pipeline</Link>
      </section>
      <SalesTable records={model.sales.testDrives} title="Test drives needing attention" summary="Customers, vehicles, owners, and next steps for upcoming test-drive work." />
    </CrmNextFrame>
  );
}

export function CrmNextDealsView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="deals" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Deals</span>
          <h1>Deals in progress</h1>
          <p>Deal value, stage, owner, and next action for active sales work.</p>
        </div>
        <Link className={styles.secondaryButton} href="/crm-next/pipeline">Back to pipeline</Link>
      </section>
      <SalesTable records={model.sales.deals} title="Deals in progress" summary="A compact operating view for sales staff." />
    </CrmNextFrame>
  );
}

export function CrmNextOwnershipSupportView({ model }: { model: CrmNextCommandCenter }) {
  const grouped = [
    { label: "Ownership", ids: ["Vehicle", "Finance", "Payment"] },
    { label: "Support", ids: ["Case", "Title/Document", "Service", "Rental/Loaner", "Customer Issue", "Insurance"] }
  ];

  return (
    <CrmNextFrame active="support" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Ownership & Support</span>
          <h1>Everything important, without turning Customer 360 into a maze</h1>
          <p>Vehicle, finance, payment, case, title, service, rental, issue, and insurance context grouped by customer need.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/customers/michael-johnson">Customer 360</Link>
          <Link className={styles.secondaryButton} href="/crm-next/work/attn-michael-overdue-follow-up">Attend Customer</Link>
        </div>
      </section>

      {grouped.map((group) => (
        <article className={styles.card} key={group.label}>
          <header>
            <div>
              <h2>{group.label}</h2>
              <p className={styles.muted}>Customer support context grouped for quick follow-up.</p>
            </div>
            <span className={styles.pill}>{group.label}</span>
          </header>
          <div className={styles.supportGrid}>
            {model.ownershipSupport
              .filter((record) => group.ids.includes(record.domain))
              .map((record) => (
                <Link className={styles.supportCard} href={record.href} id={record.href.startsWith("#") ? record.href.slice(1) : record.id} key={record.id}>
                  <span className={styles.eyebrow}>{record.domain}</span>
                  <h3>{record.title}</h3>
                  <p>{record.status}</p>
                  <p className={styles.muted}>{record.nextAction}</p>
                  <div className={styles.metaLine}>
                    <b className={levelClass(record.priority)}>{record.priority}</b>
                    <span>{record.permission}</span>
                    <small>{record.owner}</small>
                  </div>
                </Link>
              ))}
          </div>
        </article>
      ))}
    </CrmNextFrame>
  );
}

export function CrmNextSharedExecutionView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="execution" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Shared Execution</span>
          <h1>Shared customer execution</h1>
          <p>Keep customer tasks inside CRM, then create a Dispatch handoff only when operations must execute the work.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/work/attn-michael-overdue-follow-up#dispatch-task">Create Dispatch handoff</Link>
          <Link className={styles.secondaryButton} href="/crm-next/needs-attention">Needs Attention</Link>
        </div>
      </section>

      <article className={styles.card}>
        <header>
          <div>
            <h2>Customer work handoff</h2>
            <p className={styles.muted}>CRM tasks stay with the customer record. Dispatch handoffs are reserved for operational execution.</p>
          </div>
          <span className={styles.pill}>Active workflow</span>
        </header>
        <div className={styles.executionGrid}>
          {model.sharedExecution.map((record) => (
            <Link className={styles.executionCard} href={record.href.replace("#dispatch-preview", "#dispatch-task")} id={record.href.startsWith("#") ? record.href.slice(1) : record.id} key={record.id}>
              <span className={styles.eyebrow}>Customer work</span>
              <h3>{record.title}</h3>
              <p>{record.description}</p>
              <div className={styles.surfacePair}>
                <span><small>CRM Next</small><strong>{record.crmNextSurface}</strong></span>
                <span><small>Dispatch</small><strong>{record.dispatchSurface}</strong></span>
              </div>
              <div className={styles.metaLine}>
                <span>Open workflow</span>
                <small>Team execution</small>
              </div>
            </Link>
          ))}
        </div>
      </article>
    </CrmNextFrame>
  );
}

function LeadSourcePerformanceReport({ model }: { model: CrmNextCommandCenter }) {
  return (
    <article className={styles.card}>
      <header>
        <div>
          <h2>Lead source performance report</h2>
          <p className={styles.muted}>{model.leadSourceReport.summary}</p>
        </div>
        <span className={styles.pill}>{model.leadSourceReport.generatedFrom}</span>
      </header>
      <div className={styles.sourceReportLayout}>
        <div className={styles.sourceReportTable} aria-label="Lead source funnel performance">
          <div className={styles.sourceReportHead}>
            <span>Source</span>
            <span>Leads</span>
            <span>Contacted</span>
            <span>Appts</span>
            <span>Deals</span>
            <span>Sold</span>
            <span>Leak</span>
            <span>Action</span>
          </div>
          {model.leadSourceReport.sources.map((source) => (
            <Link className={styles.sourceReportRow} href={source.href} key={source.id}>
              <span><strong>{source.label}</strong><small>{source.health} · {source.conversionRate} sold</small></span>
              <b>{source.leads}</b>
              <b>{source.contacted}</b>
              <b>{source.appointments}</b>
              <b>{source.deals}</b>
              <b>{source.sold}</b>
              <span>{source.leak}</span>
              <span>{source.nextAction}</span>
            </Link>
          ))}
        </div>
        <aside className={styles.sourceActionQueue} aria-label="Lead source action queue">
          <h3>Work these first</h3>
          {model.leadSourceReport.actionQueue.length ? model.leadSourceReport.actionQueue.map((action) => (
            <Link href={action.href} key={action.id}>
              <strong>{action.label}</strong>
              <span>{action.customer}</span>
              <small>{action.source} · {action.reason}</small>
            </Link>
          )) : <p className={styles.muted}>No stale or uncontacted source work is exposed by the current read.</p>}
        </aside>
      </div>
      <div className={styles.sourceWorkflowStrip} aria-label="Lead source optimization workflow">
        {model.leadSourceReport.workflow.map((step) => (
          <span key={step.step}><strong>{step.step}</strong><small>{step.goal}</small></span>
        ))}
      </div>
    </article>
  );
}

export function CrmNextLeadSourceReportView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="intelligence" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Lead Source Report</span>
          <h1>Lead Source Performance</h1>
          <p>See which lead sources are creating real work, where the funnel is leaking, and what staff should do next.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/pipeline">Open pipeline</Link>
          <Link className={styles.secondaryButton} href="/crm-next/intelligence-foundation">Intelligence</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Lead source report summary">
        <article className={styles.summaryCard} data-tone="blue"><small>Sources</small><strong>{model.leadSourceReport.sources.length}</strong><p>classified</p></article>
        <article className={styles.summaryCard}><small>Total Leads</small><strong>{model.leadSourceReport.sources.reduce((total, source) => total + source.leads, 0)}</strong><p>in report</p></article>
        <article className={styles.summaryCard}><small>Stale Work</small><strong>{model.leadSourceReport.sources.reduce((total, source) => total + source.stale, 0)}</strong><p>needs action</p></article>
        <article className={styles.summaryCard}><small>Action Queue</small><strong>{model.leadSourceReport.actionQueue.length}</strong><p>work first</p></article>
        <article className={styles.summaryCard}><small>Mode</small><strong>Assist</strong><p>staff executes</p></article>
      </section>

      <LeadSourcePerformanceReport model={model} />
    </CrmNextFrame>
  );
}

export function CrmNextIntelligenceFoundationView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="intelligence" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Intelligence</span>
          <h1>Recommendations that explain themselves</h1>
          <p>See risk, next-action suggestions, opportunity signals, queue priority, and manager attention items with a clear reason.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/needs-attention">Open queue</Link>
          <Link className={styles.secondaryButton} href="/crm-next/work/attn-michael-overdue-follow-up">Attend customer</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="CRM Next intelligence summary">
        <article className={styles.summaryCard} data-tone="blue"><small>Mode</small><strong>Assist</strong><p>human decides</p></article>
        <article className={styles.summaryCard}><small>Signals</small><strong>{model.intelligence.length}</strong><p>explainable inputs</p></article>
        <article className={styles.summaryCard}><small>Automation</small><strong>Manual</strong><p>staff confirms</p></article>
        <article className={styles.summaryCard}><small>Risk items</small><strong>12</strong><p>need review</p></article>
        <article className={styles.summaryCard}><small>Actions</small><strong>23</strong><p>recommended</p></article>
      </section>

      <LeadSourcePerformanceReport model={model} />

      <article className={styles.card}>
        <header>
          <div>
            <h2>Recommended customer actions</h2>
            <p className={styles.muted}>Each recommendation explains the signal, the suggested next step, and why it matters.</p>
          </div>
          <span className={styles.pill}>Staff assist</span>
        </header>
        <div className={styles.intelligenceCards}>
          {model.intelligence.map((record) => (
            <Link className={styles.intelligenceCard} href={record.href} id={record.href.startsWith("#") ? record.href.slice(1) : record.id} key={record.id}>
              <span className={styles.eyebrow}>{record.kind}</span>
              <h3>{record.title}</h3>
              <p>{record.signal}</p>
              <div className={styles.recommendationBox}>
                <small>Recommended next step</small>
                <strong>{record.recommendation}</strong>
                <span>{record.explanation}</span>
              </div>
              <div className={styles.metaLine}>
                <span>{record.confidence}</span>
                <small>{record.sourceSystem}</small>
              </div>
              <p className={styles.safeNotice}>{record.safety}</p>
            </Link>
          ))}
        </div>
      </article>
    </CrmNextFrame>
  );
}

export function CrmNextPilotReadinessView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="pilot" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Pilot Readiness</span>
          <h1>Enough substance to review before we turn anything live</h1>
          <p>Expanded pilot scenarios show customers, queues, Customer 360 context, timeline activity, and manager review paths while preserving source-of-truth ownership.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next">Command Center</Link>
          <Link className={styles.secondaryButton} href="/crm-next/progress">Progress</Link>
          <Link className={styles.secondaryButton} href="/crm-next/intelligence-foundation">Intelligence</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="CRM Next pilot scenario summary">
        <article className={styles.summaryCard} data-tone="blue"><small>Pilot scenarios</small><strong>{model.pilotScenarios.length}</strong><p>review records</p></article>
        <article className={styles.summaryCard}><small>Writes</small><strong>0</strong><p>still disabled</p></article>
        <article className={styles.summaryCard}><small>Live comms</small><strong>0</strong><p>not enabled</p></article>
        <article className={styles.summaryCard}><small>Route replacement</small><strong>No</strong><p>Fallback protected</p></article>
        <article className={styles.summaryCard}><small>Next</small><strong>{model.progress.nextMilestone}</strong><p>hardening gate</p></article>
      </section>

      <article className={styles.card}>
        <header>
          <div>
            <h2>CRMN-075 → CRMN-079 pilot scenario expansion</h2>
            <p className={styles.muted}>Each scenario explains what reviewers should inspect, which source system owns the data, and what remains gated.</p>
          </div>
          <span className={styles.pill}>IMPLEMENTED_UNVERIFIED</span>
        </header>
        <div className={styles.pilotScenarioGrid}>
          {model.pilotScenarios.map((scenario) => (
            <Link className={styles.pilotScenarioCard} href={scenario.href} id={scenario.id} key={scenario.id}>
              <span className={styles.eyebrow}>{scenario.milestone} · {scenario.category}</span>
              <h3>{scenario.title}</h3>
              <p>{scenario.summary}</p>
              <div className={styles.metaLine}>
                <span>{scenario.reviewState}</span>
                <small>{scenario.sourceOfTruth}</small>
              </div>
              <p className={styles.safeNotice}>{scenario.nextReviewStep}</p>
            </Link>
          ))}
        </div>
      </article>
    </CrmNextFrame>
  );
}

export function CrmNextHardeningView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="hardening" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Release Hardening</span>
          <h1>Controls before pilot promotion</h1>
          <p>CRM Next can be reviewed with richer scenarios, but migration, live communication, customer writes, manager overrides, and route replacement remain gated.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/pilot-readiness">Pilot readiness</Link>
          <Link className={styles.secondaryButton} href="/crm-next/progress">Progress</Link>
          <Link className={styles.secondaryButton} href="/crm-next/system/rollback">Rollback proof</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="CRM Next hardening summary">
        <article className={styles.summaryCard} data-tone="blue"><small>Hardening gates</small><strong>{model.hardeningGates.length}</strong><p>review controls</p></article>
        <article className={styles.summaryCard}><small>Held gate</small><strong>CRMN-080</strong><p>migration approval</p></article>
        <article className={styles.summaryCard}><small>Customer writes</small><strong>0</strong><p>still disabled</p></article>
        <article className={styles.summaryCard}><small>Route replacement</small><strong>No</strong><p>Fallback protected</p></article>
        <article className={styles.summaryCard}><small>Next</small><strong>{model.progress.nextMilestone}</strong><p>coexistence plan</p></article>
      </section>

      <article className={styles.card}>
        <header>
          <div>
            <h2>CRMN-080 → CRMN-086 hardening packet</h2>
            <p className={styles.muted}>This packet makes the pilot controls reviewable without turning on live operational commands.</p>
          </div>
          <span className={styles.pill}>approval-gated</span>
        </header>
        <div className={styles.pilotScenarioGrid}>
          {model.hardeningGates.map((gate) => (
            <article className={styles.pilotScenarioCard} id={gate.id} key={gate.id}>
              <span className={styles.eyebrow}>{gate.milestone} · {gate.category}</span>
              <h3>{gate.title}</h3>
              <p>{gate.proof}</p>
              <div className={styles.metaLine}>
                <span>{gate.reviewState}</span>
                <b className={statusClass(gate.status)}>{gate.status}</b>
              </div>
              <p className={styles.safeNotice}>{gate.riskControl}</p>
              <p>{gate.nextStep}</p>
            </article>
          ))}
        </div>
      </article>
    </CrmNextFrame>
  );
}

export function CrmNextCoexistenceView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="coexistence" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Fallback Coexistence</span>
          <h1>CRM Next can be reviewed without replacing today’s CRM</h1>
          <p>Customer Archive and the current CRM fallback remain operational while CRM Next proves whether it is ready to become the replacement experience.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next">CRM Next</Link>
          <Link className={styles.secondaryButton} href={LEGACY_CUSTOMER_ARCHIVE_HREF}>Legacy customer archive</Link>
          <Link className={styles.secondaryButton} href={LEGACY_CRM_FALLBACK_HREF}>Legacy CRM fallback</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="CRM Next coexistence summary">
        <article className={styles.summaryCard} data-tone="blue"><small>Coexistence gates</small><strong>{model.coexistenceGates.length}</strong><p>review controls</p></article>
        <article className={styles.summaryCard}><small>Fallback routes</small><strong>Open</strong><p>protected</p></article>
        <article className={styles.summaryCard}><small>Default route</small><strong>No</strong><p>not replaced</p></article>
        <article className={styles.summaryCard}><small>Retirement</small><strong>Held</strong><p>approval needed</p></article>
        <article className={styles.summaryCard}><small>Next</small><strong>{model.progress.nextMilestone}</strong><p>pilot gates</p></article>
      </section>

      <article className={styles.card}>
        <header>
          <div>
            <h2>CRMN-087 → CRMN-090 coexistence packet</h2>
            <p className={styles.muted}>This page is the safe bridge between review, pilot, and any future cutover decision.</p>
          </div>
          <span className={styles.pill}>parallel replacement</span>
        </header>
        <div className={styles.pilotScenarioGrid}>
          {model.coexistenceGates.map((gate) => (
            <article className={styles.pilotScenarioCard} id={gate.id} key={gate.id}>
              <span className={styles.eyebrow}>{gate.milestone}</span>
              <h3>{gate.title}</h3>
              <p>{gate.crmNextRole}</p>
              <div className={styles.details}>
                <p><span>Fallback owner</span>{gate.legacyOwner}</p>
                <p><span>Cutover rule</span>{gate.cutoverRule}</p>
                <p><span>Rollback rule</span>{gate.rollbackRule}</p>
              </div>
              <div className={styles.metaLine}>
                <span>{gate.safety}</span>
                <b className={statusClass(gate.status)}>{gate.status}</b>
              </div>
            </article>
          ))}
        </div>
      </article>
    </CrmNextFrame>
  );
}

export function CrmNextPilotReleaseView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="release" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Pilot Release Gates</span>
          <h1>Ready for review, not ready for launch without approval</h1>
          <p>The final CRM Next pilot gates show what must be reviewed before any broader rollout, live command, or fallback replacement is allowed.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/progress">Progress cockpit</Link>
          <Link className={styles.secondaryButton} href="/crm-next/hardening">Hardening</Link>
          <Link className={styles.secondaryButton} href="/crm-next/coexistence">Coexistence</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="CRM Next pilot release summary">
        <article className={styles.summaryCard} data-tone="blue"><small>Release gates</small><strong>{model.pilotReleaseGates.length}</strong><p>final checks</p></article>
        <article className={styles.summaryCard}><small>Launch</small><strong>Held</strong><p>approval needed</p></article>
        <article className={styles.summaryCard}><small>Live commands</small><strong>0</strong><p>not enabled</p></article>
        <article className={styles.summaryCard}><small>Fallback</small><strong>Open</strong><p>archive kept</p></article>
        <article className={styles.summaryCard}><small>Next</small><strong>{model.progress.nextMilestone}</strong><p>decision gate</p></article>
      </section>

      <article className={styles.card}>
        <header>
          <div>
            <h2>CRMN-091 → CRMN-094 pilot release packet</h2>
            <p className={styles.muted}>This is the review checklist before CRM Next can become a controlled pilot instead of a protected preview.</p>
          </div>
          <span className={styles.pill}>launch held</span>
        </header>
        <div className={styles.pilotScenarioGrid}>
          {model.pilotReleaseGates.map((gate) => (
            <article className={styles.pilotScenarioCard} id={gate.id} key={gate.id}>
              <span className={styles.eyebrow}>{gate.milestone} · {gate.owner}</span>
              <h3>{gate.title}</h3>
              <p>{gate.requirement}</p>
              <div className={styles.details}>
                <p><span>Decision</span>{gate.decision}</p>
                <p><span>Proof</span>{gate.proof}</p>
                <p><span>Cannot proceed until</span>{gate.cannotProceedUntil}</p>
              </div>
              <div className={styles.metaLine}>
                <span>Promotion gate</span>
                <b className={statusClass(gate.status)}>{gate.status}</b>
              </div>
            </article>
          ))}
        </div>
      </article>
    </CrmNextFrame>
  );
}

export function CrmNextSafetyView({ kind, model }: { kind: "states" | "permissions" | "rollback"; model: CrmNextCommandCenter }) {
  const copy = {
    states: {
      eyebrow: "State Coverage",
      title: "Clear states instead of confusing dead ends",
      body: "Empty, loading, blocked, and unavailable states explain what happened and offer a safe next step."
    },
    permissions: {
      eyebrow: "Permission Safety",
      title: "Denied users fail closed",
      body: "CRM Next only opens for approved roles and workspaces. Otherwise users are routed back to the legacy customer archive or legacy CRM fallback."
    },
    rollback: {
      eyebrow: "Rollback Proof",
      title: "CRM Next can be turned off safely",
      body: "When CRM_NEXT is disabled, /crm-next shows the protected fallback and existing Dispatch Board routes continue working."
    }
  }[kind];

  return (
    <CrmNextFrame active="safety" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
        </div>
        <Link className={styles.secondaryButton} href="/crm-next/progress">Back to progress</Link>
      </section>
      <section className={styles.dashboardGrid}>
        <article className={styles.card}><header><h2>Feature flag</h2></header><p>CRM_NEXT controls access to the new experience and fails closed by default.</p></article>
        <article className={styles.card}><header><h2>Fallback</h2></header><p>Customer Archive and the current CRM fallback remain available during pilot review.</p></article>
        <article className={styles.card}><header><h2>Activation boundary</h2></header><p>Operational Dispatch handoff creation is enabled. Calls, texts, emails, payments, documents, and deal/customer writes remain protected.</p></article>
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextCustomer360View({ customer, model }: { customer: CrmNextCustomer360; model: CrmNextCommandCenter }) {
  const activeAttentionItem = model.attention.find((item) => item.customerId === customer.id);
  const attendHref = activeAttentionItem?.workHref ?? `/crm-next/work/customer-read-${encodeURIComponent(customer.id)}`;
  const currentJourneyStage = customerJourneyStage(customer, activeAttentionItem);
  const appointmentHref = crmNextCustomerAppointmentHref({
    customerId: customer.id,
    customerName: customer.name,
    reason: customer.nextAction,
    returnTo: `/crm-next/customers/${customer.id}`
  });
  const customerMetrics = [
    { label: "Open Leads", value: customer.openDeals, detail: "Active", tone: "green" },
    { label: "Open Cases", value: customer.openCases, detail: "Active", tone: "red" },
    { label: "Appointments", value: customer.glance.find((item) => item.label === "Appointments")?.value ?? "0", detail: "Upcoming", tone: "blue" },
    { label: "Tasks", value: model.attention.filter((item) => item.customerId === customer.id).length, detail: "Open", tone: "blue" },
    { label: "Documents", value: "0", detail: "Missing", tone: "amber" },
    { label: "SLA Risk", value: customer.riskLevel, detail: "Current", tone: customer.riskLevel === "High" ? "red" : customer.riskLevel === "Medium" ? "amber" : "green" }
  ];

  return (
    <CrmNextFrame active="customer" userName={model.userName}>
      <Topbar />
      <CompactSourceStatus model={model} />
      <section className={styles.customerWorkspace}>
        <main className={styles.customerMain}>
          <section className={styles.customerHeroCard}>
            <div className={styles.customerIdentity}>
              <span className={styles.profileAvatar}>{initials(customer.name)}</span>
              <div>
                <h1 className={styles.customerName}>{customer.name}</h1>
                <span className={styles.customerBadge}>Preferred Customer</span>
                <p>{customer.phone} · {customer.email}</p>
                <p>{customer.address}</p>
              </div>
            </div>
            <dl className={styles.customerFacts}>
              <div><dt>Customer Since</dt><dd>{customer.customerSince}</dd></div>
              <div><dt>Lifetime Value</dt><dd>{customer.lifetimeValue}</dd></div>
              <div><dt>Owner</dt><dd>Unassigned</dd></div>
              <div><dt>Status</dt><dd>{customer.status}</dd></div>
              <div><dt>Risk</dt><dd><b className={levelClass(customer.riskLevel)}>{customer.riskLevel}</b></dd></div>
            </dl>
            <div className={styles.customerHeroActions}>
              <Link className={styles.secondaryButton} href="/crm-next/new"><UserPlus size={16} /> Add Customer</Link>
              <Link className={styles.primaryButton} href={attendHref}>Attend</Link>
              <Link className={styles.secondaryButton} href={crmNextActionHref("send-text", customer.id)}><MessageSquare size={16} /> Message</Link>
              <Link className={styles.secondaryButton} href="/crm">Open fallback CRM</Link>
            </div>
          </section>

          <section className={styles.customerJourneyPanel} aria-label="Customer journey">
            <header>
              <div>
                <span className={styles.eyebrow}>Customer journey</span>
                <h2>Work the customer from first contact to outcome.</h2>
              </div>
              <Link className={styles.secondaryButton} href={attendHref}>Update progress</Link>
            </header>
            <ol className={styles.customerJourneyRail}>
              {CUSTOMER_JOURNEY_STAGES.map((stage) => (
                <li data-state={stage === currentJourneyStage ? "active" : "pending"} key={stage}>
                  <span>{stage}</span>
                </li>
              ))}
            </ol>
            <p className={styles.muted}>Stage changes should come from staff actions: calls, texts, appointments, CRM tasks, deal work, or a sold/lost decision.</p>
          </section>

          <section className={styles.customerMetricGrid} aria-label="Customer operating metrics">
            {customerMetrics.map((metric) => (
              <article className={styles.customerMetricCard} data-tone={metric.tone} key={metric.label}>
                <small>{metric.label}</small>
                <strong>{metric.value}</strong>
                <span>{metric.detail}</span>
              </article>
            ))}
          </section>

          <section className={styles.panel}>
            <nav className={styles.tabs} aria-label="Customer 360 sections">
              <Link aria-current="page" href="#overview">Overview</Link>
              <Link href="#timeline">Timeline</Link>
              <Link href="#deals">Deals</Link>
              <Link href="#cases">Cases</Link>
              <Link href="#appointments">Appointments</Link>
              <Link href="#documents-held">Documents</Link>
              <Link href="#vehicles">Vehicles</Link>
              <Link href="#supporting-parties">Parties</Link>
              <Link href="#communications-held">Communications</Link>
            </nav>
            <div className={styles.compactInfoGrid} id="overview">
              {customer.glance.map((item) => (
                <Link className={styles.glanceItem} href={item.href} key={item.label}>
                  <CalendarDays size={20} /><span><strong>{item.label}</strong><small>{item.value}</small></span><ChevronRight size={18} />
                </Link>
              ))}
            </div>
            <div className={styles.compactSectionGrid}>
              <article id="deals" className={styles.compactSectionCard}>
                <strong>Deals</strong>
                <span>{customer.openDeals} open · managed in current CRM</span>
                <Link href="/crm-next/deals">Open deal board</Link>
              </article>
              <article id="cases" className={styles.compactSectionCard}>
                <strong>Cases</strong>
                <span>{customer.openCases} open · support queue</span>
                <Link href="/crm-next/ownership-support#cases">Open support cases</Link>
              </article>
              <article id="appointments" className={styles.compactSectionCard}>
                <strong>Appointments</strong>
                <span>{customer.glance.find((item) => item.label === "Appointments")?.value ?? "0"} upcoming · open calendar flow</span>
                <Link href={appointmentHref}>Schedule appointment</Link>
              </article>
              <article id="documents-held" className={styles.compactSectionCard}>
                <strong>Documents</strong>
                <span>Use the approved document workspace for sending or uploads.</span>
                <Link href={crmNextActionHref("upload-document", customer.id)}>Review document action</Link>
              </article>
              <article id="communications-held" className={styles.compactSectionCard}>
                <strong>Communications</strong>
                <span>Use approved contact workflows for live calls, texts, and emails.</span>
                <Link href={crmNextActionHref("log-call", customer.id)}>Review contact actions</Link>
              </article>
            </div>
          </section>

          <section className={`${styles.timeline} ${styles.wide}`} id="timeline">
            <header className={styles.panelHeader}><h2>Communication (Last 5)</h2><Link className={styles.textLink} href="/crm-next/timeline">View all</Link></header>
            <div className={styles.commList}>
              {customer.communications.map((item) => (
                <article className={styles.communicationItem} key={item.id}>
                  <strong>{item.channel}</strong><span>{item.detail}</span><small>{item.occurredAt}</small>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className={styles.customerAside}>
          <article className={styles.sidePanel}>
            <header><h2>Quick Actions</h2></header>
            <div className={styles.quickActionTiles}>
              <Link href={crmNextActionHref("log-call", customer.id)}><Phone size={22} />Log Call</Link>
              <Link href={crmNextActionHref("send-email", customer.id)}><Mail size={22} />Send Email</Link>
              <Link href={crmNextActionHref("new-task", customer.id)}><ClipboardCheck size={22} />CRM Task</Link>
              <Link href="#timeline"><MessageSquare size={22} />Add Note</Link>
              <Link href={crmNextActionHref("new-case", customer.id)}><FileText size={22} />New Case</Link>
              <Link href={appointmentHref}><CalendarDays size={22} />Schedule Appt</Link>
              <Link href={crmNextActionHref("upload-document", customer.id)}><FileSearch size={22} />Upload Doc</Link>
            </div>
          </article>

          <article className={styles.sidePanel}>
            <header><h2>Next Best Action</h2></header>
            <div className={styles.nextBestAction}>
              <CheckCircle2 size={24} />
              <div>
                <strong>{customer.nextAction}</strong>
                <p>Open Attend Mode to complete the next safe customer step.</p>
              </div>
            </div>
            <Link className={styles.primaryButton} href={attendHref}>Work Customer</Link>
          </article>

          <div id="supporting-parties">
            <CrmNextSupportingParties compact model={model} />
          </div>

          <article className={styles.sidePanel}>
            <header><h2>Customer Risk</h2></header>
            <strong className={levelClass(customer.riskLevel)}>{customer.riskLevel}</strong>
            <ul className={styles.signalList}>
              <li>{customer.openCases} open cases</li>
              <li>{customer.vehiclesOwned} linked vehicles</li>
              <li>{customer.openDeals} open deals</li>
            </ul>
          </article>

          <article className={styles.sidePanel} id="vehicles">
            <header><h2>Linked Vehicles ({customer.vehicles.length})</h2></header>
            <div className={styles.vehicleList}>
              {customer.vehicles.length ? customer.vehicles.map((vehicle) => (
                <Link href="/crm-next/search" key={vehicle.id}>
                  <strong>{vehicle.label}</strong>
                  <small>{vehicle.status} · {vehicle.vin}</small>
                </Link>
              )) : <p className={styles.muted}>No linked vehicles exposed by the current source.</p>}
            </div>
          </article>
        </aside>
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextActionReadinessView({ action, customerId, model }: { action: CrmNextOperatingAction; customerId?: string; model: CrmNextCommandCenter }) {
  const relatedCustomer = customerId
    ? model.customers.find((customer) => customer.id === customerId) ?? model.customers[0]
    : model.customers[0];
  const backHref = relatedCustomer ? `/crm-next/customers/${relatedCustomer.id}` : "/crm-next";
  const activeAttentionItem = relatedCustomer ? model.attention.find((item) => item.customerId === relatedCustomer.id) : undefined;
  const workbenchHref = activeAttentionItem?.workHref ?? backHref;
  const stateCopy = action.state === "SAFE_ROUTE"
    ? "Ready to continue"
    : action.state === "PREVIEW_ONLY"
      ? "Open the customer context before using the approved live workspace"
      : "Use the approved workspace for this action";
  const primaryHref = action.id === "schedule-appointment"
    ? crmNextCustomerAppointmentHref({
        customerId: relatedCustomer?.id,
        customerName: relatedCustomer?.name ?? "Customer",
        reason: relatedCustomer?.nextAction ?? action.response,
        returnTo: backHref
      })
    : backHref;
  const isCrmTaskAction = action.id === "new-task";

  return (
    <CrmNextFrame active="work" userName={model.userName}>
      <Topbar />
      <section className={styles.customerWorkspace}>
        <section className={`${styles.customerHeroCard} ${styles.actionCustomerHero}`}>
          <div className={styles.actionCustomerIdentity}>
            <span className={styles.avatar}>{initials(relatedCustomer?.name ?? "CRM Next")}</span>
            <div>
              <span className={styles.eyebrow}>Customer action</span>
              <h1 className={styles.customerName}>{relatedCustomer?.name ?? "Customer"}</h1>
              <span className={styles.customerBadge}>{action.label}</span>
              <p>{stateCopy}</p>
            </div>
          </div>
          <dl className={styles.customerFacts}>
            <div><dt>Status</dt><dd>{action.state === "HELD" ? "Use approved workspace" : "Available"}</dd></div>
            <div><dt>Action type</dt><dd>{action.category}</dd></div>
            <div><dt>Customer</dt><dd>{relatedCustomer?.name ?? "Available from CRM Next"}</dd></div>
            <div><dt>Next step</dt><dd>{isCrmTaskAction ? "Create CRM task" : "Continue"}</dd></div>
          </dl>
          <div className={styles.customerHeroActions}>
            <Link className={styles.primaryButton} href={primaryHref}>Continue</Link>
            <Link className={styles.secondaryButton} href={backHref}>Back to Customer 360</Link>
            <Link className={styles.secondaryButton} href="/crm">Open fallback CRM</Link>
          </div>
        </section>
        <main className={styles.customerMain}>
          <section className={styles.panel}>
            <header className={styles.panelHeader}><h2>What happens next</h2><span className={styles.pill}>{action.category}</span></header>
            <div className={styles.compactSectionGrid}>
              <article className={styles.compactSectionCard}><strong>Customer step</strong><span>{action.response}</span></article>
              <article className={styles.compactSectionCard}><strong>Work area</strong><span>{action.sourceAuthority}</span></article>
              <article className={styles.compactSectionCard}><strong>Follow-up</strong><span>{isCrmTaskAction ? "Keep this task in the customer CRM record unless an operational handoff is required." : "Return to Customer 360 after completing the step."}</span></article>
              <article className={styles.compactSectionCard}><strong>Availability</strong><span>{action.state === "HELD" ? "This action continues in its approved workspace." : "This action can be opened from CRM Next."}</span></article>
            </div>
          </section>

          <section className={styles.timeline}>
            <header className={styles.panelHeader}><h2>Available customer actions</h2><Link className={styles.textLink} href={workbenchHref}>Back to workbench</Link></header>
            <div className={styles.compactInfoGrid}>
              {model.operatingActions.map((item) => (
                <Link className={styles.glanceItem} href={crmNextActionHref(item.id, relatedCustomer?.id)} key={item.id}>
                  <ClipboardCheck size={18} />
                  <span><strong>{item.label}</strong><small>{item.category}</small></span>
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
          </section>
        </main>

        <aside className={styles.customerAside}>
          <article className={styles.sidePanel}>
            <header><h2>Action status</h2></header>
            <strong className={action.state === "SAFE_ROUTE" ? styles.levelLow : action.state === "PREVIEW_ONLY" ? styles.levelMedium : styles.levelHigh}>
              {action.state === "HELD" ? "Use workspace" : "Available"}
            </strong>
            <ul className={styles.signalList}>
              <li>Customer context stays visible</li>
              <li>Next step stays clear</li>
              <li>Legacy customer archive and legacy CRM fallback remain available</li>
            </ul>
          </article>
          <article className={styles.sidePanel}>
            <header><h2>Need the old view?</h2></header>
            <p className={styles.muted}>Open the customer archive only when a workflow is not yet available here.</p>
            <Link className={styles.secondaryButton} href={LEGACY_CUSTOMER_ARCHIVE_HREF}>Open legacy customer archive</Link>
          </article>
        </aside>
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextWorkCustomerView({
  bridgePreview,
  item,
  model
}: {
  bridgePreview?: CrmNextActionBridgePreview;
  item: CrmNextAttentionItem;
  model: CrmNextCommandCenter;
}) {
  const issue = customerWorkIssue(item);
  const recentActivity = model.timeline.slice(0, 5);
  const pendingTasks = bridgePreview?.dispatchPreview ? "1 due" : "None";

  return (
    <CrmNextFrame active="work" userName={model.userName}>
      <section className={styles.workShell}>
        <header className={styles.workHero}>
          <div className={styles.workHeroMeta}>
            <div className={styles.workHeroBreadcrumbs}>
              <span className={styles.eyebrow}>Customer Workbench</span>
              <Link href="/crm-next/needs-attention">← Back to attention queue</Link>
            </div>
            <span className={levelClass(item.level)}>{item.level}</span>
          </div>
          <div className={styles.workHeroBody}>
            <div>
              <h1 className={styles.workTitle}>{item.customerName}</h1>
              <p className={styles.muted}>{issue.issue} · {item.area} · Owner: {item.owner}</p>
            </div>
            <div className={styles.workActions}>
              <Link className={styles.secondaryButton} href="#lead">Check - In</Link>
              <Link className={styles.secondaryButton} href="/crm-next/deals">Start Deal</Link>
              <Link className={styles.secondaryButton} href={item.customerHref}>Customer 360</Link>
            </div>
          </div>
        </header>
        <main>
          <section className={styles.crmWorkbenchBoard} aria-label="CRM customer workbench">
            <header className={styles.crmWorkbenchHeader}>
              <div>
                <span className={styles.eyebrow}>Customer file</span>
                <h2>{item.customerName}</h2>
                <p>{issue.issue}</p>
              </div>
              <Link className={styles.secondaryButton} href="#customer-sections">Update Status</Link>
            </header>

            <ol className={styles.dealerJourneyStrip} aria-label="Customer journey">
              {CUSTOMER_JOURNEY_STAGES.map((stage) => (
                <li data-state={stage === "Contacted" ? "active" : "idle"} key={stage}>{stage}</li>
              ))}
            </ol>

            <section className={styles.dealerCustomerSnapshot} aria-label="Customer status summary">
              <div><span>Next Appt.</span><strong>Not Scheduled</strong></div>
              <div><span>Last Appt.</span><strong>None</strong></div>
              <div><span>Pending Tasks</span><strong>{pendingTasks}</strong></div>
              <div><span>Deposit</span><strong>None</strong></div>
              <div><span>Deals</span><strong>None</strong></div>
              <div><span>Last Contacted</span><strong>Today</strong></div>
              <div><span>Days Old</span><strong>0</strong></div>
              <div><span>Days Since Activity</span><strong>0</strong></div>
            </section>

            <section className={styles.dealerCustomerDetails} aria-label="Customer source details">
              <div>
                <span>Lead Source</span>
                <strong>Walk-in / CRM next action</strong>
              </div>
              <div>
                <span>Inquiry Type</span>
                <strong>{item.area}</strong>
              </div>
              <div>
                <span>Sales Rep</span>
                <strong>{item.owner}</strong>
              </div>
              <div>
                <span>Current Need</span>
                <strong>{item.nextAction}</strong>
              </div>
            </section>

            <CrmNextWorkbenchSections currentNeed={item.nextAction} doneMeaning={issue.done} />

            <CrmNextInlineTaskComposer
              appointmentHref={crmNextCustomerAppointmentHref({
                customerId: item.customerId,
                customerName: item.customerName,
                reason: item.nextAction,
                returnTo: item.workHref
              })}
              customerName={item.customerName}
              nextAction={item.nextAction}
              owner={item.owner}
            />
          </section>

          <section className={styles.activityWorkbenchGrid} id="customer-activity">
            <article className={styles.card}>
              <header>
                <div>
                  <h2>Activity</h2>
                  <p className={styles.muted}>Everything staff needs to understand what happened and decide the next customer step.</p>
                </div>
                <Link className={styles.textLink} href="/crm-next/timeline">Open full timeline</Link>
              </header>
              <nav className={styles.activityFilters} aria-label="Activity filters">
                {CRM_ACTIVITY_FILTERS.map((filter, index) => (
                  <Link className={index === 0 ? styles.activeTab : undefined} href="#customer-activity" key={filter}>{filter}</Link>
                ))}
              </nav>
              <div className={styles.activityTimelineList}>
                {recentActivity.map((event) => (
                  <Link className={styles.activityTimelineItem} href={event.href} key={event.id}>
                    <strong>{event.label}</strong>
                    <span>{event.detail}</span>
                    <small>{event.source} · {event.occurredAt}</small>
                  </Link>
                ))}
              </div>
            </article>
          </section>
        </main>
      </section>
    </CrmNextFrame>
  );
}
