"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileText,
  MessageSquareText,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  reviewAppointments,
  reviewConversations,
  reviewPipeline,
  reviewQueueItems,
  reviewSourceActions,
  UNIFIED_CRM_REVIEW_NOTICE,
  type ReviewQueueItem,
  type UnifiedCrmView
} from "./unified-crm-shell-review-model";
import styles from "./unified-crm-shell.module.css";

type UnifiedCrmShellProps = {
  activeView: UnifiedCrmView;
  capabilities?: Readonly<Record<string, boolean>>;
  initialSelectedId?: string;
  userName: string;
};

const viewCopy: Record<Exclude<UnifiedCrmView, "home">, { eyebrow: string; title: string; description: string }> = {
  work: {
    eyebrow: "My work",
    title: "One queue for the next action",
    description: "Review how owned, due, waiting, and source-controlled work should feel before live CRM commands are added."
  },
  customers: {
    eyebrow: "Customers",
    title: "Relationship context without losing the next step",
    description: "Customer identity remains source-owned. This review shows how CRM will surface permitted context and freshness."
  },
  pipeline: {
    eyebrow: "Pipeline",
    title: "Progress that is easy to understand",
    description: "Stages, amounts, and movement shown here are synthetic interaction scenarios, not operational forecasts."
  },
  conversations: {
    eyebrow: "Conversations",
    title: "Manual history, outcomes, and commitments",
    description: "The MVP records manual communication context only. It does not send email, SMS, or other messages."
  },
  insights: {
    eyebrow: "Insights",
    title: "Every number opens the work behind it",
    description: "These synthetic measures review hierarchy and drill-through language; they are not business results."
  },
  more: {
    eyebrow: "More",
    title: "Less-frequent work stays nearby",
    description: "Quotes, handoffs, source consoles, and later administration belong here instead of crowding daily work."
  }
};

function firstName(name: string) {
  return name.trim().split(/\s+/, 1)[0] || "there";
}

function ReviewNotice() {
  return (
    <div className={styles.reviewNotice} role="status">
      <ShieldCheck aria-hidden="true" size={16} />
      <span><strong>Experience review</strong>{UNIFIED_CRM_REVIEW_NOTICE.replace("Experience review — ", "")}</span>
    </div>
  );
}

function SourceActionMenu({ open, onClose }: { open: boolean; onClose(): void }) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const firstLink = menuRef.current?.querySelector<HTMLAnchorElement>("a");
    firstLink?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className={styles.newMenu} id="crm-review-new-menu" ref={menuRef} role="menu">
      <header>
        <div><strong>Start in a source workflow</strong><span>No CRM record will be created.</span></div>
        <button aria-label="Close New menu" onClick={onClose} type="button"><X size={16} /></button>
      </header>
      {reviewSourceActions.map((action) => (
        <Link href={action.href} key={action.label} onClick={onClose} role="menuitem">
          <span><strong>{action.label}</strong><small>{action.description}</small></span>
          <ExternalLink aria-hidden="true" size={15} />
        </Link>
      ))}
    </div>
  );
}

function QueueRow({ active, item, onSelect }: { active: boolean; item: ReviewQueueItem; onSelect(item: ReviewQueueItem): void }) {
  return (
    <button
      aria-pressed={active}
      className={`${styles.queueRow} ${active ? styles.queueRowActive : ""}`}
      onClick={() => onSelect(item)}
      type="button"
    >
      <span className={`${styles.dueMark} ${styles[item.dueTone]}`} aria-hidden="true" />
      <span className={styles.queueIdentity}><strong>{item.customer}</strong><small>{item.account}</small></span>
      <span className={styles.queueReason}>{item.reason}</span>
      <span className={styles.queueMeta}><strong>{item.due}</strong><small>{item.stage}</small></span>
      <ArrowRight aria-hidden="true" size={16} />
    </button>
  );
}

function ContextPanel({ item }: { item: ReviewQueueItem }) {
  return (
    <aside className={styles.contextPanel} aria-label={`Review context for ${item.customer}`}>
      <header>
        <div><span>Selected review scenario</span><h2>{item.customer}</h2><p>{item.account}</p></div>
        <span className={`${styles.duePill} ${styles[item.dueTone]}`}>{item.due}</span>
      </header>
      <section>
        <span className={styles.sectionLabel}>Why now</span>
        <p className={styles.contextReason}>{item.reason}</p>
      </section>
      <dl className={styles.contextFacts}>
        <div><dt>Owner</dt><dd>{item.owner}</dd></div>
        <div><dt>Stage</dt><dd>{item.stage}</dd></div>
        <div><dt>Source</dt><dd>{item.sourceLabel}</dd></div>
      </dl>
      <section>
        <span className={styles.sectionLabel}>Recent context</span>
        <ol className={styles.history}>{item.history.map((entry) => <li key={entry}>{entry}</li>)}</ol>
      </section>
      <small className={styles.freshness}>{item.sourceFreshness}</small>
      <Link className={styles.primaryAction} href={item.sourceHref}>
        {item.nextAction}<ExternalLink aria-hidden="true" size={15} />
      </Link>
      <p className={styles.sourceBoundary}>This opens the existing governed source. The CRM review does not write or send anything.</p>
    </aside>
  );
}

function SearchReview({ onSelect }: { onSelect(item: ReviewQueueItem): void }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => normalized ? reviewQueueItems.filter((item) =>
    [item.customer, item.account, item.reason, item.stage, item.sourceLabel].join(" ").toLowerCase().includes(normalized)
  ) : [], [normalized]);

  return (
    <div className={styles.searchWrap}>
      <label className={styles.searchField}>
        <Search aria-hidden="true" size={18} />
        <span className={styles.srOnly}>Search synthetic CRM review scenarios</span>
        <input onChange={(event) => setQuery(event.target.value)} placeholder="Search review scenarios…" type="search" value={query} />
        <kbd>Review</kbd>
      </label>
      {normalized ? (
        <div className={styles.searchResults} aria-label="Synthetic review search results">
          <header><strong>{results.length ? `${results.length} review result${results.length === 1 ? "" : "s"}` : "No review scenarios found"}</strong><span>Synthetic only</span></header>
          {results.map((item) => (
            <button key={item.id} onClick={() => { onSelect(item); setQuery(""); }} type="button">
              <span><strong>{item.customer}</strong><small>{item.reason}</small></span><ArrowRight aria-hidden="true" size={15} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function HomeView({ selected, onSelect }: { selected: ReviewQueueItem; onSelect(item: ReviewQueueItem): void }) {
  return (
    <div className={styles.homeGrid}>
      <section className={styles.queuePanel} aria-labelledby="crm-next-heading">
        <header className={styles.panelHeading}>
          <div><span>Prioritized review queue</span><h2 id="crm-next-heading">Do this next</h2></div>
          <small>4 synthetic scenarios</small>
        </header>
        <div className={styles.queueList}>{reviewQueueItems.map((item) => <QueueRow active={selected.id === item.id} item={item} key={item.id} onSelect={onSelect} />)}</div>
      </section>
      <ContextPanel item={selected} />
      <aside className={styles.todayRail} aria-label="Today review">
        <section className={styles.todayCard}>
          <header><span><CalendarDays aria-hidden="true" size={16} />Today</span><small>Review</small></header>
          {reviewAppointments.map((appointment) => <article key={`${appointment.time}-${appointment.customer}`}><time>{appointment.time}</time><span><strong>{appointment.customer}</strong><small>{appointment.detail}</small></span></article>)}
          <Link href="/appointments?returnTo=%2Fcrm">Open source appointment board<ExternalLink aria-hidden="true" size={13} /></Link>
        </section>
        <section className={styles.attentionCard}>
          <header><span><Clock3 aria-hidden="true" size={16} />Attention</span></header>
          <button onClick={() => onSelect(reviewQueueItems[0])} type="button"><strong>1 due now</strong><span>Review the promised follow-up</span></button>
          <button onClick={() => onSelect(reviewQueueItems[3])} type="button"><strong>1 source-owned case</strong><span>Context only in CRM</span></button>
        </section>
      </aside>
    </div>
  );
}

function WorkView({ selected, onSelect }: { selected: ReviewQueueItem; onSelect(item: ReviewQueueItem): void }) {
  return <div className={styles.twoColumn}><section className={styles.queuePanel}><div className={styles.queueList}>{reviewQueueItems.map((item) => <QueueRow active={selected.id === item.id} item={item} key={item.id} onSelect={onSelect} />)}</div></section><ContextPanel item={selected} /></div>;
}

function CustomersView({ onSelect }: { onSelect(item: ReviewQueueItem): void }) {
  return <section className={styles.cardGrid} aria-label="Synthetic customer review cards">{reviewQueueItems.slice(0, 3).map((item) => <button className={styles.customerCard} key={item.id} onClick={() => onSelect(item)} type="button"><span className={styles.avatar}><UserRound aria-hidden="true" size={18} /></span><span><strong>{item.customer}</strong><small>{item.account}</small><em>{item.reason}</em></span><ArrowRight aria-hidden="true" size={16} /></button>)}</section>;
}

function PipelineView() {
  return <section className={styles.pipeline} aria-label="Synthetic pipeline review">{reviewPipeline.map((stage) => <article key={stage.label}><header><strong>{stage.label}</strong><span>{stage.count}</span></header><div><b>{stage.value}</b><small>Review amount</small></div><p>No stage changes are available in this experience review.</p></article>)}</section>;
}

function ConversationsView() {
  return <section className={styles.listCard} aria-label="Synthetic manual communication history"><header><MessageSquareText aria-hidden="true" size={17} /><div><strong>Manual history review</strong><span>No external messages are sent or synchronized.</span></div></header>{reviewConversations.map((item) => <article key={`${item.customer}-${item.when}`}><span><strong>{item.customer}</strong><small>{item.channel} · {item.outcome}</small></span><time>{item.when}</time></article>)}</section>;
}

function InsightsView() {
  return <section className={styles.insights} aria-label="Synthetic insight review">{[
    ["Due now", "1", "Open the work behind this count"],
    ["Next actions covered", "100%", "Synthetic scenarios include an owner and due state"],
    ["Source exceptions", "1", "Read-only case context remains source-owned"]
  ].map(([label, value, detail]) => <article key={label}><span>{label}</span><strong>{value}</strong><p>{detail}</p><button type="button">Review records<ArrowRight size={14} /></button></article>)}</section>;
}

function MoreView() {
  return <section className={styles.moreGrid}>{[
    { icon: FileText, title: "Quotes & approvals", detail: "Planned governed commercial workspace. No quote is created in review." },
    { icon: CheckCircle2, title: "Handoffs", detail: "Review how accepted work will connect to Dispatch without duplicating authority." },
    { icon: UsersRound, title: "Source consoles", detail: "Open existing Customers, Tasks, and Appointments while CRM is under review." }
  ].map(({ icon: Icon, title, detail }) => <article key={title}><Icon aria-hidden="true" size={19} /><div><strong>{title}</strong><p>{detail}</p></div></article>)}</section>;
}

export function UnifiedCrmShell({ activeView, capabilities = {}, initialSelectedId, userName }: UnifiedCrmShellProps) {
  const [selected, setSelected] = useState(
    reviewQueueItems.find((item) => item.id === initialSelectedId) ?? reviewQueueItems[0]
  );
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newButtonRef = useRef<HTMLButtonElement | null>(null);
  const activeCopy = activeView === "home" ? null : viewCopy[activeView];

  function closeNewMenu() {
    setNewMenuOpen(false);
    requestAnimationFrame(() => newButtonRef.current?.focus());
  }

  function selectAndReturnHome(item: ReviewQueueItem) {
    setSelected(item);
    if (activeView !== "home" && activeView !== "work") window.location.assign(`/crm?selected=${encodeURIComponent(item.id)}`);
  }

  return (
    <main className={styles.shell} data-review-capabilities={Object.entries(capabilities).filter(([, enabled]) => enabled).map(([capability]) => capability).join(",")}>
      <ReviewNotice />
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>{activeCopy?.eyebrow ?? "Unified CRM"}</span>
          <h1>{activeCopy?.title ?? `Here’s what needs attention, ${firstName(userName)}`}</h1>
          <p>{activeCopy?.description ?? "Review the next action, understand why it matters, and continue in the governed source workflow."}</p>
        </div>
        <div className={styles.heroActions}>
          <SearchReview key={activeView} onSelect={selectAndReturnHome} />
          <div className={styles.newMenuWrap}>
            <button aria-controls="crm-review-new-menu" aria-expanded={newMenuOpen} className={styles.newButton} onClick={() => setNewMenuOpen((current) => !current)} ref={newButtonRef} type="button"><Plus aria-hidden="true" size={16} />New<ChevronDown aria-hidden="true" size={14} /></button>
            <SourceActionMenu onClose={closeNewMenu} open={newMenuOpen} />
          </div>
        </div>
      </header>

      {activeView === "home" ? <HomeView onSelect={setSelected} selected={selected} /> : null}
      {activeView === "work" ? <WorkView onSelect={setSelected} selected={selected} /> : null}
      {activeView === "customers" ? <CustomersView onSelect={selectAndReturnHome} /> : null}
      {activeView === "pipeline" ? <PipelineView /> : null}
      {activeView === "conversations" ? <ConversationsView /> : null}
      {activeView === "insights" ? <InsightsView /> : null}
      {activeView === "more" ? <MoreView /> : null}
    </main>
  );
}

export function UnifiedCrmUnavailable({ fallbackHref, reason }: { fallbackHref: string; reason: string }) {
  return (
    <main className={`${styles.shell} ${styles.unavailable}`}>
      <ShieldCheck aria-hidden="true" size={28} />
      <span className={styles.eyebrow}>Unified CRM</span>
      <h1>Experience review is not available</h1>
      <p>{reason}</p>
      <Link className={styles.primaryAction} href={fallbackHref}>Return to your workspace<ArrowRight aria-hidden="true" size={15} /></Link>
    </main>
  );
}
