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
  UsersRound,
  X
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { UnifiedCrmCustomerListReadModel } from "@/server/unified-crm/customer-read-contract";
import type { UnifiedCrmOpportunityDiscoveryModel } from "@/server/unified-crm/opportunity-discovery-contract";
import type { UnifiedCrmOpportunityPreviewModel } from "@/server/unified-crm/opportunity-read-contract";

import { UnifiedCrmCustomerList } from "./unified-crm-customer-list";
import { UnifiedCrmOpportunityPipelinePreview, UnifiedCrmOpportunityPreview } from "./unified-crm-opportunity-preview";
import {
  reviewAppointments,
  reviewConversations,
  reviewQueueItems,
  reviewSourceActions,
  UNIFIED_CRM_REVIEW_NOTICE,
  type ReviewQueueItem,
  type UnifiedCrmView
} from "./unified-crm-shell-review-model";
import styles from "./unified-crm-shell.module.css";
import type { UnifiedCrmWorkQueueItem, UnifiedCrmWorkQueueReadModel } from "@/server/unified-crm/work-queue-contract";

type UnifiedCrmShellProps = {
  activeView: UnifiedCrmView;
  capabilities?: Readonly<Record<string, boolean>>;
  customerList?: UnifiedCrmCustomerListReadModel;
  customerListError?: string;
  customerListFailureKind?: "error" | "restricted" | "unavailable";
  initialSelectedId?: string;
  opportunityDiscovery?: UnifiedCrmOpportunityDiscoveryModel;
  opportunityPreview?: UnifiedCrmOpportunityPreviewModel;
  opportunityPreviewError?: string;
  opportunityPreviewFailureKind?: "error" | "restricted" | "unavailable";
  workQueue?: UnifiedCrmWorkQueueReadModel;
  workQueueError?: string;
  workQueueFailureKind?: "error" | "restricted" | "unavailable";
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
    title: "Find the right customer quickly",
    description: "Search permitted customer identity with masked contact hints, visible source freshness, and a safe path into the governed Customers record."
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

function formatDateTime(value: string | null, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatTime(value: string | null, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function ReviewNotice({ mode }: { mode: "review" | "live-customers" | "live-work" }) {
  const copy = mode === "live-customers"
    ? {
        title: "Live read-only customer list",
        detail: "Contact hints are masked. No customer record is changed."
      }
    : mode === "live-work"
      ? {
          title: "Live read-only CRM work queue",
          detail: "Owned work is ranked from live source records. No work record is changed."
        }
      : {
          title: "Experience review",
          detail: UNIFIED_CRM_REVIEW_NOTICE.replace("Experience review — ", "")
        };
  return (
    <div className={styles.reviewNotice} role="status">
      <ShieldCheck aria-hidden="true" size={16} />
      <span><strong>{copy.title}</strong> {copy.detail}</span>
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

function LiveQueueRow({
  active,
  item,
  onSelect
}: {
  active: boolean;
  item: UnifiedCrmWorkQueueItem;
  onSelect(item: UnifiedCrmWorkQueueItem): void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`${styles.queueRow} ${active ? styles.queueRowActive : ""}`}
      onClick={() => onSelect(item)}
      type="button"
    >
      <span className={`${styles.dueMark} ${styles[item.dueState]}`} aria-hidden="true" />
      <span className={styles.queueIdentity}><strong>{item.title}</strong><small>{item.customerLabel}</small></span>
      <span className={styles.queueReason}>{item.reason}</span>
      <span className={styles.queueMeta}><strong>{item.dueLabel}</strong><small>{item.stageLabel}</small></span>
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

function LiveContextPanel({ item }: { item: UnifiedCrmWorkQueueItem }) {
  return (
    <aside className={styles.contextPanel} aria-label={`CRM work context for ${item.title}`}>
      <header>
        <div><span>Selected work item</span><h2>{item.title}</h2><p>{item.customerLabel}</p></div>
        <span className={`${styles.duePill} ${styles[item.dueState]}`}>{item.dueLabel}</span>
      </header>
      <section>
        <span className={styles.sectionLabel}>Why now</span>
        <p className={styles.contextReason}>{item.reason}</p>
      </section>
      <dl className={styles.contextFacts}>
        <div><dt>Owner</dt><dd>{item.ownerName}</dd></div>
        <div><dt>Source</dt><dd>{item.sourceLabel}</dd></div>
        <div><dt>Due</dt><dd>{formatDateTime(item.dueAt, "Waiting on source")}</dd></div>
      </dl>
      <section>
        <span className={styles.sectionLabel}>Recent context</span>
        <ol className={styles.history}>{item.history.map((entry) => <li key={entry}>{entry}</li>)}</ol>
      </section>
      <small className={styles.freshness}>Last source update: {formatDateTime(item.updatedAt, "Unknown")}</small>
      <Link className={styles.primaryAction} href={item.sourceHref}>
        {item.primaryActionLabel}<ExternalLink aria-hidden="true" size={15} />
      </Link>
      <p className={styles.sourceBoundary}>This opens the existing governed source. The CRM queue itself is read only.</p>
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

function WorkQueueSearch({
  onChange,
  value
}: {
  onChange(value: string): void;
  value: string;
}) {
  return (
    <div className={styles.searchWrap}>
      <label className={styles.searchField}>
        <Search aria-hidden="true" size={18} />
        <span className={styles.srOnly}>Filter CRM work</span>
        <input
          onChange={(event) => onChange(event.target.value)}
          placeholder="Filter owned work, customers, or source…"
          type="search"
          value={value}
        />
        <kbd>Filter</kbd>
      </label>
    </div>
  );
}

function HomeView({
  opportunityDiscovery,
  selected,
  onSelect
}: {
  opportunityDiscovery?: UnifiedCrmOpportunityDiscoveryModel;
  selected: ReviewQueueItem;
  onSelect(item: ReviewQueueItem): void;
}) {
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
      {opportunityDiscovery ? <OpportunityDiscoveryPanel model={opportunityDiscovery} /> : null}
    </div>
  );
}

function WorkView({
  opportunityDiscovery,
  selected,
  onSelect
}: {
  opportunityDiscovery?: UnifiedCrmOpportunityDiscoveryModel;
  selected: ReviewQueueItem;
  onSelect(item: ReviewQueueItem): void;
}) {
  return <div className={styles.discoveryStack}><div className={styles.twoColumn}><section className={styles.queuePanel}><div className={styles.queueList}>{reviewQueueItems.map((item) => <QueueRow active={selected.id === item.id} item={item} key={item.id} onSelect={onSelect} />)}</div></section><ContextPanel item={selected} /></div>{opportunityDiscovery ? <OpportunityDiscoveryPanel model={opportunityDiscovery} /> : null}</div>;
}

function WorkState({
  detail,
  failureKind
}: {
  detail: string;
  failureKind?: "error" | "restricted" | "unavailable";
}) {
  const title = failureKind === "restricted"
    ? "CRM work is restricted"
    : failureKind === "unavailable"
      ? "CRM work is unavailable"
      : "CRM work could not be loaded";
  return (
    <section className={styles.stateCard} aria-live="polite">
      <strong>{title}</strong>
      <p>{detail}</p>
      <div className={styles.stateActions}>
        <Link href="/my-tasks">Open existing task queue</Link>
        <Link href="/appointments">Open appointments</Link>
      </div>
    </section>
  );
}

function LiveHomeView({
  model,
  opportunityDiscovery,
  selected,
  onSelect
}: {
  model: UnifiedCrmWorkQueueReadModel;
  opportunityDiscovery?: UnifiedCrmOpportunityDiscoveryModel;
  selected: UnifiedCrmWorkQueueItem | null;
  onSelect(item: UnifiedCrmWorkQueueItem): void;
}) {
  const overdue = model.items.filter((item) => item.dueState === "overdue");
  const today = model.items.filter((item) => item.dueState === "today");
  return (
    <div className={styles.homeGrid}>
      <section className={styles.queuePanel} aria-labelledby="crm-next-heading">
        <header className={styles.panelHeading}>
          <div><span>{model.visibility === "owned" ? "Owned live work" : "Live team work"}</span><h2 id="crm-next-heading">Do this next</h2></div>
          <small>{model.summary.totalCount} items</small>
        </header>
        {model.items.length ? <div className={styles.queueList}>{model.items.map((item) => <LiveQueueRow active={selected?.id === item.id} item={item} key={item.id} onSelect={onSelect} />)}</div> : <WorkState detail="No owned work needs attention right now." />}
      </section>
      {selected ? <LiveContextPanel item={selected} /> : <WorkState detail="No live work item is available to review right now." />}
      <aside className={styles.todayRail} aria-label="Today live work">
        <section className={styles.todayCard}>
          <header><span><CalendarDays aria-hidden="true" size={16} />Today</span><small>Live</small></header>
          {model.today.length ? model.today.map((appointment) => <article key={appointment.id}><time>{formatTime(appointment.startsAt, "TBD")}</time><span><strong>{appointment.customerLabel}</strong><small>{appointment.detail}</small></span></article>) : <p className={styles.railEmpty}>No permitted appointments are scheduled today.</p>}
          <Link href="/appointments">Open source appointment board<ExternalLink aria-hidden="true" size={13} /></Link>
        </section>
        <section className={styles.attentionCard}>
          <header><span><Clock3 aria-hidden="true" size={16} />Attention</span></header>
          <button onClick={() => overdue[0] && onSelect(overdue[0])} type="button"><strong>{model.summary.overdueCount} overdue</strong><span>Past-due work rises to the top first</span></button>
          <button onClick={() => today[0] && onSelect(today[0])} type="button"><strong>{model.summary.todayCount} due today</strong><span>Use this to stay ahead of the next promised action</span></button>
        </section>
      </aside>
      {opportunityDiscovery ? <OpportunityDiscoveryPanel model={opportunityDiscovery} /> : null}
    </div>
  );
}

function LiveWorkView({
  failureKind,
  model,
  opportunityDiscovery,
  onSelect,
  selected
}: {
  failureKind?: "error" | "restricted" | "unavailable";
  model?: UnifiedCrmWorkQueueReadModel;
  opportunityDiscovery?: UnifiedCrmOpportunityDiscoveryModel;
  onSelect(item: UnifiedCrmWorkQueueItem): void;
  selected: UnifiedCrmWorkQueueItem | null;
}) {
  if (!model) {
    return <div className={styles.discoveryStack}><WorkState detail="No live CRM work records were displayed." failureKind={failureKind} />{opportunityDiscovery ? <OpportunityDiscoveryPanel model={opportunityDiscovery} /> : null}</div>;
  }
  if (model.state === "EMPTY") {
    return <div className={styles.discoveryStack}><WorkState detail="No owned work needs attention right now." />{opportunityDiscovery ? <OpportunityDiscoveryPanel model={opportunityDiscovery} /> : null}</div>;
  }
  return <div className={styles.discoveryStack}><div className={styles.twoColumn}><section className={styles.queuePanel}><div className={styles.queueList}>{model.items.map((item) => <LiveQueueRow active={selected?.id === item.id} item={item} key={item.id} onSelect={onSelect} />)}</div></section>{selected ? <LiveContextPanel item={selected} /> : <WorkState detail="No live CRM work item is available to review right now." />}</div>{opportunityDiscovery ? <OpportunityDiscoveryPanel model={opportunityDiscovery} /> : null}</div>;
}

function PipelineState({
  detail,
  failureKind
}: {
  detail: string;
  failureKind?: "error" | "restricted" | "unavailable";
}) {
  const title = failureKind === "restricted"
    ? "Opportunity review is restricted"
    : failureKind === "unavailable"
      ? "Opportunity review is unavailable"
      : "Opportunity review could not be loaded";
  return (
    <section className={styles.stateCard} aria-live="polite">
      <strong>{title}</strong>
      <p>{detail}</p>
      <div className={styles.stateActions}>
        <Link href="/crm?view=work">Open CRM work</Link>
        <Link href="/customers">Open existing Customers</Link>
      </div>
    </section>
  );
}

function OpportunityDiscoveryPanel({ model }: { model: UnifiedCrmOpportunityDiscoveryModel }) {
  return (
    <section className={styles.listCard} aria-label="Opportunity workspace discovery">
      <header>
        <ShieldCheck aria-hidden="true" size={17} />
        <div>
          <strong>{model.headline.title}</strong>
          <span>{model.visibility === "owned" ? "Owned review" : "Organization review"} · held only</span>
        </div>
      </header>
      <p className={styles.sectionDetail}>{model.headline.detail}</p>
      <div className={styles.discoveryGrid}>
        {model.panels.map((panel) => (
          <Link className={styles.discoveryCard} href={panel.link.href} key={panel.id}>
            <span className={styles.discoveryEyebrow}>{panel.label}</span>
            <strong>{panel.link.label}</strong>
            <p>{panel.detail}</p>
            <small>{panel.link.description}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PipelineView({
  failureKind,
  model
}: {
  failureKind?: "error" | "restricted" | "unavailable";
  model?: UnifiedCrmOpportunityPreviewModel;
}) {
  if (!model) {
    return failureKind
      ? <PipelineState detail="No opportunity review data was displayed." failureKind={failureKind} />
      : <UnifiedCrmOpportunityPreview />;
  }
  return <UnifiedCrmOpportunityPipelinePreview model={model} />;
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

export function UnifiedCrmShell({
  activeView,
  capabilities = {},
  customerList,
  customerListError,
  customerListFailureKind,
  initialSelectedId,
  opportunityDiscovery,
  opportunityPreview,
  opportunityPreviewError,
  opportunityPreviewFailureKind,
  userName,
  workQueue,
  workQueueError,
  workQueueFailureKind
}: UnifiedCrmShellProps) {
  const [selected, setSelected] = useState(
    reviewQueueItems.find((item) => item.id === initialSelectedId) ?? reviewQueueItems[0]
  );
  const [selectedWorkId, setSelectedWorkId] = useState(initialSelectedId ?? workQueue?.items[0]?.id ?? "");
  const [workQuery, setWorkQuery] = useState("");
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newButtonRef = useRef<HTMLButtonElement | null>(null);
  const activeCopy = activeView === "home" ? null : viewCopy[activeView];
  const filteredWorkItems = useMemo(() => {
    if (!workQueue) return [];
    const query = workQuery.trim().toLowerCase();
    if (!query) return workQueue.items;
    return workQueue.items.filter((item) =>
      [item.title, item.customerLabel, item.reason, item.sourceLabel, item.stageLabel].join(" ").toLowerCase().includes(query)
    );
  }, [workQuery, workQueue]);
  const selectedWork = filteredWorkItems.find((item) => item.id === selectedWorkId) ?? filteredWorkItems[0] ?? null;

  function closeNewMenu() {
    setNewMenuOpen(false);
    requestAnimationFrame(() => newButtonRef.current?.focus());
  }

  function selectAndReturnHome(item: ReviewQueueItem) {
    setSelected(item);
    if (activeView !== "home" && activeView !== "work") window.location.assign(`/crm?selected=${encodeURIComponent(item.id)}`);
  }

  const noticeMode = activeView === "customers"
    ? "live-customers"
    : activeView === "home" || activeView === "work"
      ? workQueue || workQueueError
        ? "live-work"
        : "review"
      : "review";

  return (
    <main className={styles.shell} data-review-capabilities={Object.entries(capabilities).filter(([, enabled]) => enabled).map(([capability]) => capability).join(",")}>
      <ReviewNotice mode={noticeMode} />
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>{activeCopy?.eyebrow ?? "Unified CRM"}</span>
          <h1>{activeCopy?.title ?? `Here’s what needs attention, ${firstName(userName)}`}</h1>
          <p>{activeCopy?.description ?? "Review the next action, understand why it matters, and continue in the governed source workflow."}</p>
        </div>
        {activeView === "customers" ? null : <div className={styles.heroActions}>
          {(activeView === "home" || activeView === "work") && (workQueue || workQueueError)
            ? <WorkQueueSearch onChange={setWorkQuery} value={workQuery} />
            : <SearchReview key={activeView} onSelect={selectAndReturnHome} />}
          <div className={styles.newMenuWrap}>
            <button aria-controls="crm-review-new-menu" aria-expanded={newMenuOpen} className={styles.newButton} onClick={() => setNewMenuOpen((current) => !current)} ref={newButtonRef} type="button"><Plus aria-hidden="true" size={16} />New<ChevronDown aria-hidden="true" size={14} /></button>
            <SourceActionMenu onClose={closeNewMenu} open={newMenuOpen} />
          </div>
        </div>}
      </header>

      {activeView === "home"
        ? workQueue || workQueueError
          ? workQueue
            ? <LiveHomeView model={{ ...workQueue, items: filteredWorkItems }} opportunityDiscovery={opportunityDiscovery} onSelect={(item) => setSelectedWorkId(item.id)} selected={selectedWork} />
            : <div className={styles.discoveryStack}><WorkState detail={workQueueError ?? "No live CRM work records were displayed."} failureKind={workQueueFailureKind} />{opportunityDiscovery ? <OpportunityDiscoveryPanel model={opportunityDiscovery} /> : null}</div>
          : <HomeView opportunityDiscovery={opportunityDiscovery} onSelect={setSelected} selected={selected} />
        : null}
      {activeView === "work"
        ? workQueue || workQueueError
          ? <LiveWorkView failureKind={workQueueFailureKind} model={workQueue ? { ...workQueue, items: filteredWorkItems } : undefined} opportunityDiscovery={opportunityDiscovery} onSelect={(item) => setSelectedWorkId(item.id)} selected={selectedWork} />
          : <WorkView opportunityDiscovery={opportunityDiscovery} onSelect={setSelected} selected={selected} />
        : null}
      {activeView === "customers" ? <UnifiedCrmCustomerList errorMessage={customerListError} failureKind={customerListFailureKind} model={customerList} /> : null}
      {activeView === "pipeline"
        ? opportunityPreview || opportunityPreviewError
          ? <PipelineView failureKind={opportunityPreviewFailureKind} model={opportunityPreview} />
          : <PipelineView model={undefined} />
        : null}
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
