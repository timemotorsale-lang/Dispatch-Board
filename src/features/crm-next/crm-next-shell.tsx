import Link from "next/link";
import {
  Bell,
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
  Users
} from "lucide-react";

import type { CrmNextAccessReason } from "@/server/crm-next/access";
import type { CrmNextAttentionItem, CrmNextCommandCenter, CrmNextCustomer360, CrmNextMilestoneStatus, CrmNextSalesRecord } from "@/server/crm-next/read-model";

import styles from "./crm-next-shell.module.css";

function levelClass(level: "High" | "Medium" | "Low") {
  if (level === "High") return styles.levelHigh;
  if (level === "Medium") return styles.levelMedium;
  return styles.levelLow;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function CrmNextUnavailable({ fallbackHref, reason }: { fallbackHref: string; reason: CrmNextAccessReason }) {
  const message = reason === "CRM_NEXT_OFF"
    ? "CRM Next is safely turned off. Legacy Customers and current CRM remain available."
    : "CRM Next is not enabled for your current workspace.";

  return (
    <section className={styles.blocked} aria-label="CRM Next unavailable">
      <small>CRM NEXT</small>
      <h1>CRM Next is protected right now.</h1>
      <p>{message}</p>
      <div className={styles.buttonRow}>
        <Link className={styles.primaryButton} href={fallbackHref}>Return to my workspace</Link>
        <Link className={styles.secondaryButton} href="/customers">Open Legacy Customers</Link>
        <Link className={styles.secondaryButton} href="/crm">Open current CRM</Link>
      </div>
    </section>
  );
}

function CrmNextFrame({ active, children, userName }: { active: "command" | "attention" | "customer" | "work" | "progress" | "search" | "pipeline" | "timeline" | "support" | "execution" | "safety"; children: React.ReactNode; userName: string }) {
  const links = [
    { id: "command", href: "/crm-next", label: "Command Center", icon: LayoutDashboard },
    { id: "customer", href: "/crm-next/customers/michael-johnson", label: "Customers", icon: Users },
    { id: "attention", href: "/crm-next/needs-attention", label: "Needs Attention", icon: Bell },
    { id: "work", href: "/crm-next/work/attn-michael-overdue-follow-up", label: "Work Customer", icon: ClipboardCheck },
    { id: "search", href: "/crm-next/search", label: "Search", icon: Search },
    { id: "pipeline", href: "/crm-next/pipeline", label: "Pipeline", icon: Target },
    { id: "support", href: "/crm-next/ownership-support", label: "Ownership & Support", icon: FileText },
    { id: "execution", href: "/crm-next/shared-execution", label: "Shared Execution", icon: ClipboardCheck },
    { id: "timeline", href: "/crm-next/timeline", label: "Timeline", icon: FileSearch },
    { id: "progress", href: "/crm-next/progress", label: "Progress", icon: Target }
  ] as const;

  return (
    <section className={styles.shell}>
      <div className={styles.frame}>
        <aside className={styles.sidebar} aria-label="CRM Next navigation">
          <div className={styles.brand}>Time Motor Sales</div>
          <nav className={styles.nav}>
            {links.map(({ id, href, label, icon: Icon }) => (
              <Link aria-current={active === id ? "page" : undefined} href={href} key={id}>
                <Icon size={17} /> {label}
              </Link>
            ))}
            <Link href="/crm"><ChevronRight size={17} /> Current CRM</Link>
            <Link href="/customers"><ChevronRight size={17} /> Legacy Customers</Link>
          </nav>
          <div className={styles.operator}>
            <strong>{userName}</strong>
            <small>CRM Next review user</small>
          </div>
        </aside>
        <main className={styles.content}>{children}</main>
      </div>
    </section>
  );
}

function Topbar() {
  return (
    <div className={styles.topbar}>
      <div className={styles.search} role="search">
        <Search size={20} aria-hidden="true" />
        <Link href="/crm-next/search">Search customers, vehicles, deals, stock #, RO...</Link>
      </div>
      <div className={styles.governance}><ShieldCheck size={16} /> CRM Next Preview · no live communications</div>
    </div>
  );
}

function UniversalActionBar({ customerHref = "/crm-next/customers/michael-johnson" }: { customerHref?: string }) {
  return (
    <nav className={styles.actionBar} aria-label="CRM Next safe actions">
      <Link className={styles.primaryButton} href="/crm-next/work/attn-michael-overdue-follow-up#dispatch-preview"><Phone size={16} /> Call preview</Link>
      <Link className={styles.secondaryButton} href="#communications-held"><MessageSquare size={16} /> Text preview</Link>
      <Link className={styles.secondaryButton} href="#communications-held"><Mail size={16} /> Email preview</Link>
      <Link className={styles.secondaryButton} href="/crm-next/appointments"><CalendarDays size={16} /> Appointments</Link>
      <Link className={styles.secondaryButton} href="/crm-next/work/attn-michael-overdue-follow-up#dispatch-preview"><ClipboardCheck size={16} /> Task bridge</Link>
      <Link className={styles.secondaryButton} href={customerHref}><Users size={16} /> Customer 360</Link>
    </nav>
  );
}

export function CrmNextCommandCenterView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="command" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Command Center Dashboard</span>
          <h1>Who needs attention?</h1>
          <p>Start with the customer, understand the reason, then work the next action.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/needs-attention"><Bell size={16} /> View attention queue</Link>
          <Link className={styles.secondaryButton} href="/crm-next/search"><Search size={16} /> Search CRM Next</Link>
          <Link className={styles.secondaryButton} href="/crm-next/customers/michael-johnson"><Users size={16} /> Open Customer 360</Link>
          <Link className={styles.secondaryButton} href="/crm-next/progress"><Target size={16} /> View progress</Link>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="CRM Next summary">
        {model.summary.map((item) => (
          <article className={styles.summaryCard} data-tone={item.tone} key={item.label}>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
            <p>{item.trend}</p>
          </article>
        ))}
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
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Implementation Progress</span>
          <h1>CRM Next build cockpit</h1>
          <p>Review what is implemented, what is next, and what remains safely gated.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next">Open CRM Next</Link>
          <Link className={styles.secondaryButton} href="/crm">Current CRM</Link>
          <Link className={styles.secondaryButton} href="/customers">Legacy Customers</Link>
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
          <span className={styles.pill}>CRMN-016 → CRMN-054</span>
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
          <p>No customer writes, live communications, route replacement, or Dispatch Board task creation are enabled by this envelope until a later approval gate.</p>
        </article>
        <article className={styles.card}>
          <header><h2>Rollback posture</h2></header>
          <p>Turn off `CRM_NEXT` and CRM Next fails closed while Legacy Customers and current CRM remain available.</p>
        </article>
      </section>
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
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Safe Global Search</span>
          <h1>Find the customer, then take the next safe action</h1>
          <p>{model.search.queryPlaceholder}</p>
        </div>
        <Link className={styles.secondaryButton} href="/crm-next">Back to Command Center</Link>
      </section>
      <section className={styles.searchGroups} aria-label="CRM Next grouped search results">
        {model.search.groups.map((group) => (
          <Link className={styles.card} href={group.href} key={group.id}>
            <header><h2>{group.label}</h2><span className={styles.pill}>{group.count} review</span></header>
            <p>{group.description}</p>
            <p className={styles.safeNotice}>{group.safety}</p>
          </Link>
        ))}
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
          <h1>Customer activity without source drift</h1>
          <p>Events are shown together, but each one still belongs to its original customer, communication, appointment, opportunity, or Dispatch source.</p>
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
        <span className={styles.pill}>Read-only</span>
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
          <h1>Read-only pipeline board</h1>
          <p>Review lead and opportunity flow without changing stages or replacing existing sales sources.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.secondaryButton} href="/crm-next/deals">Deals</Link>
          <Link className={styles.secondaryButton} href="/crm-next/test-drives">Test drives</Link>
          <Link className={styles.secondaryButton} href="/crm-next/appointments">Appointments</Link>
        </div>
      </section>
      <SalesTable records={model.sales.opportunities} title="Opportunities in review" summary="Stage, amount, owner, and next action are visible for pilot review." />
    </CrmNextFrame>
  );
}

export function CrmNextAppointmentsView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="pipeline" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Appointments</span>
          <h1>Appointment context from the existing workspace</h1>
          <p>CRM Next can point users to appointments, while the appointment workspace remains the source of truth.</p>
        </div>
        <Link className={styles.primaryButton} href="/appointments">Open existing appointment workspace</Link>
      </section>
      <SalesTable records={model.sales.appointments} title="Appointment-linked opportunities" summary="Review appointments from CRM Next before live scheduling commands are approved." />
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
          <h1>Test-drive review surface</h1>
          <p>Show who wants to drive what vehicle and what staff should do next.</p>
        </div>
        <Link className={styles.secondaryButton} href="/crm-next/pipeline">Back to pipeline</Link>
      </section>
      <SalesTable records={model.sales.testDrives} title="Test drives needing attention" summary="Review-only until test-drive commands and permissions are approved." />
    </CrmNextFrame>
  );
}

export function CrmNextDealsView({ model }: { model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="pipeline" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Deals</span>
          <h1>Deal review without mutation</h1>
          <p>Deal value, stage, owner, and next action are visible; write commands stay gated.</p>
        </div>
        <Link className={styles.secondaryButton} href="/crm-next/pipeline">Back to pipeline</Link>
      </section>
      <SalesTable records={model.sales.deals} title="Deals in progress" summary="A clean review surface for sales staff before operational deal commands go live." />
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
          <p>Vehicle, finance, payment, case, title, service, rental, issue, and insurance context are grouped for quick review.</p>
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
              <p className={styles.muted}>Review-safe context. Authoritative systems keep ownership of the underlying work.</p>
            </div>
            <span className={styles.pill}>CRMN-040 → CRMN-048</span>
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
                  <p className={styles.safeNotice}>Source: {record.sourceOfTruth}</p>
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
          <h1>Shared execution without a second task board</h1>
          <p>CRM Next can prepare and review customer work while Dispatch Board remains the operating source for tasks, assignments, comments, blockers, and manager queues.</p>
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.primaryButton} href="/crm-next/work/attn-michael-overdue-follow-up#dispatch-preview">Preview task bridge</Link>
          <Link className={styles.secondaryButton} href="/crm-next/needs-attention">Needs Attention</Link>
          <Link className={styles.secondaryButton} href="/crm-next/progress">Progress</Link>
        </div>
      </section>

      <article className={styles.card}>
        <header>
          <div>
            <h2>CRMN-050 → CRMN-054 foundation</h2>
            <p className={styles.muted}>These slices are intentionally read-only or preview-only. They prove the bridge shape before live task creation or reassignment is approved.</p>
          </div>
          <span className={styles.pill}>IMPLEMENTED_UNVERIFIED</span>
        </header>
        <div className={styles.executionGrid}>
          {model.sharedExecution.map((record) => (
            <Link className={styles.executionCard} href={record.href} id={record.href.startsWith("#") ? record.href.slice(1) : record.id} key={record.id}>
              <span className={styles.eyebrow}>{record.milestone}</span>
              <h3>{record.title}</h3>
              <p>{record.description}</p>
              <div className={styles.surfacePair}>
                <span><small>CRM Next</small><strong>{record.crmNextSurface}</strong></span>
                <span><small>Dispatch</small><strong>{record.dispatchSurface}</strong></span>
              </div>
              <div className={styles.metaLine}>
                <span>{record.state}</span>
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
      body: "CRM Next only opens for approved roles and workspaces. Otherwise users are routed back to Legacy/current CRM."
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
        <article className={styles.card}><header><h2>Fallback</h2></header><p>Legacy Customers and current CRM remain available during pilot review.</p></article>
        <article className={styles.card}><header><h2>No live writes</h2></header><p>Calls, texts, emails, task creation, and deal updates remain preview-only in this envelope.</p></article>
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextCustomer360View({ customer, model }: { customer: CrmNextCustomer360; model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="customer" userName={model.userName}>
      <Topbar />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Customer 360 Overview</span>
          <h1 className={styles.customerName}>{customer.name}</h1>
          <p>{customer.phone} · {customer.email} · {customer.address}</p>
        </div>
        <div className={styles.topActions}>
          <Link className={styles.primaryButton} href="/crm-next/work/attn-michael-overdue-follow-up">Attend</Link>
          <Link className={styles.secondaryButton} href="#communications-held"><MessageSquare size={16} /> Message</Link>
          <Link className={styles.secondaryButton} href="/crm">Open Legacy CRM</Link>
        </div>
      </section>
      <section className={styles.customerGrid}>
        <aside className={styles.profileCard}>
          <div className={styles.profileTop}><span className={styles.profileAvatar}>{initials(customer.name)}</span><div><strong>{customer.name}</strong><p className={styles.muted}>{customer.status}</p></div></div>
          <div className={styles.details}>
            <p><span>Customer since</span>{customer.customerSince}</p>
            <p><span>Lifetime value</span>{customer.lifetimeValue}</p>
            <p><span>Vehicles owned</span>{customer.vehiclesOwned}</p>
            <p><span>Open deals</span>{customer.openDeals}</p>
            <p><span>Open cases</span>{customer.openCases}</p>
            <p><span>Risk level</span><b className={levelClass(customer.riskLevel)}>{customer.riskLevel}</b></p>
          </div>
        </aside>
        <section className={styles.panel}>
          <UniversalActionBar customerHref={`/crm-next/customers/${customer.id}`} />
          <nav className={styles.tabs} aria-label="Customer 360 sections">
            <Link aria-current="page" href="#overview">Overview</Link>
            <Link href="#timeline">Timeline</Link>
            <Link href="/crm-next/deals">Deals</Link>
            <Link href="#vehicles">Vehicles</Link>
            <Link href="#documents-held">Documents</Link>
          </nav>
          <div className={styles.glanceList}>
            {customer.glance.map((item) => (
              <Link className={styles.glanceItem} href={item.href} key={item.label}>
                <CalendarDays size={20} /><span><strong>{item.label}</strong><small>{item.value}</small></span><ChevronRight size={18} />
              </Link>
            ))}
          </div>
          <p className={styles.safeNotice} id="communications-held">Live calls, texts, and emails are intentionally preview-only until phone, texting, email, consent, recording, and audit policies are approved.</p>
          <p className={styles.safeNotice} id="documents-held">Document sending remains held until templates, authority, and retention rules are approved.</p>
        </section>
        <aside className={styles.contextCard}>
          <h2>What to do next</h2>
          <p>{customer.nextAction}</p>
          <Link className={styles.primaryButton} href="/crm-next/work/attn-michael-overdue-follow-up">Work Customer</Link>
        </aside>
        <section className={`${styles.timeline} ${styles.wide}`} id="timeline">
          <header className={styles.panelHeader}><h2>Communication (Last 5)</h2><Link className={styles.textLink} href="/crm-next#communications">View all</Link></header>
          <div className={styles.commList}>
            {customer.communications.map((item) => (
              <article className={styles.communicationItem} key={item.id}>
                <strong>{item.channel}</strong><span>{item.detail}</span><small>{item.occurredAt}</small>
              </article>
            ))}
          </div>
        </section>
      </section>
    </CrmNextFrame>
  );
}

export function CrmNextWorkCustomerView({ item, model }: { item: CrmNextAttentionItem; model: CrmNextCommandCenter }) {
  return (
    <CrmNextFrame active="work" userName={model.userName}>
      <section className={styles.workShell}>
        <header className={styles.workHero}>
          <Link href="/crm-next/needs-attention">← Back to attention queue</Link>
          <span className={styles.eyebrow}>Customer Workbench</span>
          <h1 className={styles.workTitle}>Attend: {item.customerName}</h1>
          <p className={styles.muted}>{item.reason} · {item.area} · Owner: {item.owner}</p>
          <div className={styles.workActions}>
            <Link className={styles.primaryButton} href="#suggested"><Phone size={16} /> Log Call</Link>
            <Link className={styles.secondaryButton} href="#suggested"><Mail size={16} /> Send Message</Link>
            <Link className={styles.secondaryButton} href="/crm-next/customers/michael-johnson">Customer 360</Link>
            <Link className={styles.secondaryButton} href="/crm-next#pipeline">Estimate / Deal</Link>
          </div>
        </header>
        <main>
          <article className={styles.card}>
            <header><h2>What do you need to do?</h2><span className={levelClass(item.level)}>{item.level}</span></header>
            <UniversalActionBar customerHref={item.customerHref} />
            <div className={styles.actionCards}>
              <Link className={styles.actionCard} href="#suggested"><Phone size={18} /><strong>Follow up</strong><p className={styles.muted}>{item.reason}</p></Link>
              <Link className={styles.actionCard} href="#finance-held"><DollarSign size={18} /><strong>Collect payment</strong><p className={styles.muted}>Finance actions are review-only.</p></Link>
              <Link className={styles.actionCard} href="/appointments"><CalendarDays size={18} /><strong>Schedule appointment</strong><p className={styles.muted}>Open existing appointment workspace.</p></Link>
              <Link className={styles.actionCard} href="#documents-held"><FileText size={18} /><strong>Send document</strong><p className={styles.muted}>Document sending is held.</p></Link>
              <Link className={styles.actionCard} href="#dispatch-preview"><ClipboardCheck size={18} /><strong>Create task</strong><p className={styles.muted}>Preview dispatch handoff.</p></Link>
              <Link className={styles.actionCard} href="#suggested"><MessageSquare size={18} /><strong>Other action</strong><p className={styles.muted}>Review available safe actions.</p></Link>
            </div>
            <section className={styles.suggested} id="suggested">
              <div>
                <strong>Next Suggested Action</strong>
                <p>{item.nextAction}. Last contacted 2 days ago.</p>
              </div>
              <Link className={styles.primaryButton} href="#dispatch-preview">Preview Bridge</Link>
            </section>
          </article>
          <article className={styles.card} id="dispatch-preview">
            <header><h2>Dispatch Board integration</h2><span className={styles.pill}>Preview only</span></header>
            <div className={styles.handoffGrid}>
              {["CRM Action Created", "Dispatched to Employee", "Employee Task in My Day", "Task Execution", "Customer 360 Updated"].map((step) => (
                <div className={styles.handoffCard} key={step}><strong>{step}</strong><small>No live task is created in this slice.</small></div>
              ))}
            </div>
            <p className={styles.safeNotice}>{model.bridge.message}</p>
            <p className={styles.safeNotice} id="finance-held">Finance/payment execution is intentionally held until approval of sensitive payment permissions.</p>
            <p className={styles.safeNotice} id="documents-held">Document sending is intentionally held until document authority, templates, and audit retention are approved.</p>
          </article>
        </main>
        <aside className={styles.contextCard}>
          <h2>Customer Context</h2>
          <p><strong>{item.customerName}</strong></p>
          <p className={styles.muted}>Next action: {item.nextAction}</p>
          <Link className={styles.secondaryButton} href={item.customerHref}>Open Customer 360</Link>
          <Link className={styles.secondaryButton} href="/tasks">Open Dispatch Tasks</Link>
        </aside>
      </section>
    </CrmNextFrame>
  );
}
