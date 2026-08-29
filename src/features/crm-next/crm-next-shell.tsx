import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  DollarSign,
  FileText,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  Users
} from "lucide-react";

import type { CrmNextAccessReason } from "@/server/crm-next/access";
import type { CrmNextAttentionItem, CrmNextCommandCenter, CrmNextCustomer360 } from "@/server/crm-next/read-model";

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

function CrmNextFrame({ active, children, userName }: { active: "command" | "attention" | "customer" | "work"; children: React.ReactNode; userName: string }) {
  const links = [
    { id: "command", href: "/crm-next", label: "Command Center", icon: LayoutDashboard },
    { id: "customer", href: "/crm-next/customers/michael-johnson", label: "Customers", icon: Users },
    { id: "attention", href: "/crm-next/needs-attention", label: "Needs Attention", icon: Bell },
    { id: "work", href: "/crm-next/work/attn-michael-overdue-follow-up", label: "Work Customer", icon: ClipboardCheck }
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
        <span>Search customers, vehicles, deals, stock #, RO...</span>
      </div>
      <div className={styles.governance}><ShieldCheck size={16} /> CRM Next Preview · no live communications</div>
    </div>
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
          <Link className={styles.secondaryButton} href="/crm-next/customers/michael-johnson"><Users size={16} /> Open Customer 360</Link>
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
          <header><h2>Pipeline Overview</h2><span className={styles.pill}>This Month</span></header>
          <div className={styles.pipelineRows}>
            {model.pipeline.map((row) => (
              <div className={styles.pipelineRow} key={row.label}>
                <span>{row.label}</span><span className={styles.bar}><i style={{ width: `${Math.max(12, row.value)}%` }} /></span><strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className={styles.card}>
          <header><h2>Revenue (MTD)</h2><DollarSign size={18} /></header>
          <div className={styles.revenueValue}>{model.revenue.monthToDate}</div>
          <p className={styles.muted}>{model.revenue.trend}</p>
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
          <Link className={styles.secondaryButton} href="/crm-next#communications"><MessageSquare size={16} /> Message</Link>
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
          <nav className={styles.tabs} aria-label="Customer 360 sections">
            <Link aria-current="page" href="#overview">Overview</Link>
            <Link href="#timeline">Timeline</Link>
            <Link href="#deals">Deals</Link>
            <Link href="#vehicles">Vehicles</Link>
            <Link href="#documents">Documents</Link>
          </nav>
          <div className={styles.glanceList}>
            {customer.glance.map((item) => (
              <Link className={styles.glanceItem} href={item.href} key={item.label}>
                <CalendarDays size={20} /><span><strong>{item.label}</strong><small>{item.value}</small></span><ChevronRight size={18} />
              </Link>
            ))}
          </div>
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
