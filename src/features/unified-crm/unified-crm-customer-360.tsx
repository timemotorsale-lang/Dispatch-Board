"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, CarFront, ExternalLink, History, RefreshCw, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buildUnifiedCrmTaskIntakeHref } from "@/lib/unified-crm-task-intake-handoff";
import type { UnifiedCrmCustomer360ReadModel } from "@/server/unified-crm/customer-360-contract";
import type { UnifiedCrmCustomerOpportunityDiscoveryModel } from "@/server/unified-crm/customer-opportunity-discovery-contract";
import { withUnifiedCrmOpportunityReturn } from "@/server/unified-crm/opportunity-review-return";

import { UnifiedCrmCustomerInteractionForm } from "./unified-crm-customer-interaction-form";
import { UnifiedCrmCustomerNextActionForm } from "./unified-crm-customer-next-action-form";
import { UnifiedCrmCustomerNoteForm } from "./unified-crm-customer-note-form";
import { UnifiedCrmCustomerTaskBridgeForm } from "./unified-crm-customer-task-bridge-form";
import styles from "./unified-crm-customer-360.module.css";

type FailureKind = "error" | "not-available" | "restricted" | "unavailable";

type Customer360Props = {
  errorMessage?: string;
  failureKind?: FailureKind;
  model?: UnifiedCrmCustomer360ReadModel;
  opportunityDiscovery?: UnifiedCrmCustomerOpportunityDiscoveryModel;
  returnHref: string;
};

function customerReturnContext(returnHref: string) {
  if (returnHref === "/crm?view=work") {
    return {
      backLabel: "Back to CRM Work",
      returnLabel: "Return to CRM Work",
      continuityLabel: "CRM Work return preserved"
    };
  }

  return {
    backLabel: "Back to CRM Customers",
    returnLabel: "Return to customer list",
    continuityLabel: "Customer list return preserved"
  };
}

function formatDate(value: string | null, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }).format(new Date(value));
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/Chicago" }).format(new Date(value));
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function nextActionEyebrow(state: UnifiedCrmCustomer360ReadModel["relationship"]["nextActionState"]) {
  if (state === "OVERDUE") return "Next relationship action · overdue";
  if (state === "DUE_TODAY") return "Next relationship action · due today";
  if (state === "SCHEDULED") return "Next relationship action · scheduled";
  return "Next relationship action";
}

function nextActionGuidance(model: UnifiedCrmCustomer360ReadModel) {
  if (model.relationship.nextActionState === "OVERDUE") {
    return "This follow-up is overdue. Renew it with a new due time or complete it if the work is already done.";
  }
  if (model.relationship.nextActionState === "DUE_TODAY") {
    return "This follow-up is due today. Keep the due time current if the customer plan changes.";
  }
  if (model.relationship.nextActionState === "SCHEDULED") {
    return "This dated follow-up is on track. Reschedule it only when the customer plan truly changes.";
  }
  return "No next action is scheduled. Set a dated follow-up to renew customer continuity without leaving Customer 360.";
}

function timelineKindLabel(value: UnifiedCrmCustomer360ReadModel["timeline"]["items"][number]["kind"]) {
  switch (value) {
    case "interaction":
      return "Relationship touchpoint";
    case "task-event":
      return "Task event";
    case "appointment-event":
      return "Appointment event";
    case "lead-event":
      return "Lead event";
    case "case-event":
      return "Case event";
    case "promise-event":
      return "Promise event";
    case "commitment-event":
      return "Commitment event";
    default:
      return "Timeline event";
  }
}

function Status({ value }: { value: string }) {
  return <span className={`${styles.status} ${value.toLowerCase() === "active" ? styles.statusActive : ""}`}>{label(value)}</span>;
}

function StatePanel({ kind, message, returnHref }: { kind: FailureKind; message?: string; returnHref: string }) {
  const returnContext = customerReturnContext(returnHref);
  const title = kind === "not-available" ? "Customer isn’t available" : kind === "restricted" ? "Customer details aren’t available to you" : kind === "unavailable" ? "Customer details are temporarily unavailable" : "Customer details couldn’t be loaded";
  const detail = message ?? (kind === "not-available" ? "This record may not exist, may have changed, or may be outside your permitted customer scope." : kind === "restricted" ? "Your current CRM access does not include this customer record." : "No customer details were displayed. Retry or return to the customer list.");
  const retryable = kind === "error" || kind === "unavailable";
  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />{returnContext.backLabel}</Link>
      <section className={styles.statePanel} role={retryable ? "alert" : "status"}>
        {retryable ? <AlertTriangle aria-hidden="true" size={28} /> : <ShieldCheck aria-hidden="true" size={28} />}
        <h1>{title}</h1><p>{detail}</p>
        <div className={styles.stateActions}>
          {retryable ? <button onClick={() => window.location.reload()} type="button"><RefreshCw aria-hidden="true" size={14} />Retry</button> : null}
          <Link href={returnHref}>{returnContext.returnLabel}</Link>
          <Link href="/customers">Open existing Customers<ExternalLink aria-hidden="true" size={13} /></Link>
        </div>
      </section>
    </main>
  );
}

function RelationshipSummary({ model }: { model: UnifiedCrmCustomer360ReadModel }) {
  const summary = [
    { icon: CarFront, label: "Vehicles", value: model.vehicles.length },
    { icon: CalendarDays, label: "Appointments", value: model.appointments.length },
    { icon: UsersRound, label: "Source leads & cases", value: model.sourceLenses.leads.length + model.sourceLenses.cases.length },
    { icon: ArrowRight, label: "Read-only opportunities", value: model.opportunityLenses.length }
  ];
  return <section aria-labelledby="relationship-summary-heading" className={styles.summaryCard}><header><h2 id="relationship-summary-heading">Relationship summary</h2><span>Read only</span></header><div>{summary.map(({ icon: Icon, label: itemLabel, value }) => <article key={itemLabel}><Icon aria-hidden="true" size={16} /><span><strong>{value}</strong><small>{itemLabel}</small></span></article>)}</div></section>;
}

function OpportunityDiscoverySection({ model }: { model: UnifiedCrmCustomerOpportunityDiscoveryModel }) {
  function withCustomerReturn(href: string) {
    try {
      const url = new URL(href, "http://crm.local");
      url.searchParams.set("crmReturnTo", model.customer.href);
      return `${url.pathname}${url.search}`;
    } catch {
      return href;
    }
  }

  return (
    <section aria-labelledby="customer-opportunity-discovery-heading" className={styles.sectionCard}>
      <header>
        <div><span className={styles.eyebrow}>Opportunity workspace</span><h2 id="customer-opportunity-discovery-heading">Review opportunity flow from this customer</h2></div>
        <small>{model.opportunityDiscovery.visibility === "owned" ? "Owned review" : "Organization review"} · workspace review</small>
      </header>
      <p className={styles.discoveryDetail}>
        {model.opportunityDiscovery.headline.detail} This keeps the customer record read only while you review how opportunity work should feel for {model.customer.displayName}.
      </p>
      <div className={styles.discoveryGrid}>
        {model.opportunityDiscovery.panels.map((panel, index) => (
          <Link className={`${styles.discoveryCard} ${index === 0 ? styles.discoveryCardPrimary : ""}`} href={withCustomerReturn(panel.link.href)} key={panel.id}>
            <span className={styles.discoveryEyebrow}>{panel.label}</span>
            <strong>{panel.link.label}</strong>
            <p>{panel.detail}</p>
            <small>{panel.link.description}</small>
          </Link>
        ))}
      </div>
      <div className={styles.discoveryContinuity}>
        <strong>Start with the pipeline review if you want the quickest path.</strong>
        <small>Every opportunity review link keeps this customer as the safe return point, so you can review and come back here without losing context.</small>
      </div>
    </section>
  );
}

function OpportunityLensSection({
  model,
  returnHref
}: {
  model: UnifiedCrmCustomer360ReadModel;
  returnHref: string;
}) {
  if (!model.opportunityLenses.length) {
    return (
      <section aria-labelledby="customer-opportunity-lenses-heading" className={styles.sectionCard}>
        <header>
          <div><span className={styles.eyebrow}>Linked opportunities</span><h2 id="customer-opportunity-lenses-heading">Read-only opportunity summaries</h2></div>
          <small>No persisted opportunity is linked yet</small>
        </header>
        <p className={styles.timelineEmpty}>No permitted persisted opportunities are linked to this customer yet.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="customer-opportunity-lenses-heading" className={styles.sectionCard}>
      <header>
        <div><span className={styles.eyebrow}>Linked opportunities</span><h2 id="customer-opportunity-lenses-heading">Read-only opportunity summaries</h2></div>
        <small>{model.opportunityLenses.length} visible record{model.opportunityLenses.length === 1 ? "" : "s"}</small>
      </header>
      <div className={styles.discoveryGrid}>
        {model.opportunityLenses.map((item) => (
          <Link className={styles.discoveryCard} href={withUnifiedCrmOpportunityReturn(item.href, returnHref)} key={item.id}>
            <span className={styles.discoveryEyebrow}>{item.opportunityNumber}</span>
            <strong>{item.title}</strong>
            <p>{item.summary}</p>
            <small>{item.ownerName} · {item.customerLabel} · updated {formatDate(item.updatedAt, "Time unavailable")}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function OpportunityDiscoveryPrompt({
  detail,
  href,
  label,
  title
}: {
  detail: string;
  href: string;
  label: string;
  title: string;
}) {
  return (
    <Link aria-label={title} className={styles.discoveryPrompt} href={href}>
      <span className={styles.discoveryPromptEyebrow}>{label}</span>
      <strong>{title}</strong>
      <small>{detail}</small>
    </Link>
  );
}

function QuickActions({
  customerSourceHref,
  nextActionAvailable,
  opportunityDiscovery,
  taskBridgeAvailable,
  taskBridgeHref
}: {
  customerSourceHref: string;
  nextActionAvailable: boolean;
  opportunityDiscovery?: UnifiedCrmCustomerOpportunityDiscoveryModel;
  taskBridgeAvailable: boolean;
  taskBridgeHref: string;
}) {
  const primaryOpportunityAction = opportunityDiscovery?.opportunityDiscovery.panels[0];

  return (
    <section aria-labelledby="customer-quick-actions-heading" className={styles.quickActionsCard}>
      <header>
        <div>
          <span className={styles.eyebrow}>Ready actions</span>
          <h2 id="customer-quick-actions-heading">Do the next safe thing in one click</h2>
        </div>
        <small>Live links only · held actions stay labeled</small>
      </header>
      <div className={styles.quickActionsGrid}>
        <Link className={`${styles.quickActionLink} ${styles.quickActionPrimary}`} href={customerSourceHref}>
          <strong>Open existing customer record</strong>
          <small>Go straight to the governed source-of-truth record.</small>
        </Link>
        <Link className={styles.quickActionLink} href="#interaction-form-heading">
          <strong>Log manual outcome</strong>
          <small>Jump to the live touchpoint form on this page.</small>
        </Link>
        <Link className={styles.quickActionLink} href={nextActionAvailable ? "#next-action-form-heading" : taskBridgeHref}>
          <strong>{nextActionAvailable ? "Update next action" : "Create governed task"}</strong>
          <small>{nextActionAvailable ? "Jump to the live follow-up form without leaving Customer 360." : "Next-action changes are unavailable here, so continue in the governed task workflow."}</small>
        </Link>
        <Link className={styles.quickActionLink} href="#note-form-heading">
          <strong>Add internal note</strong>
          <small>Jump to the live team-note form on this page.</small>
        </Link>
        <Link className={styles.quickActionLink} href={taskBridgeAvailable ? "#task-bridge-heading" : taskBridgeHref}>
          <strong>Create governed task</strong>
          <small>{taskBridgeAvailable ? "Open the protected CRM task handoff form on this page." : "CRM handoff is unavailable here, so continue into the existing task intake workflow."}</small>
        </Link>
        {primaryOpportunityAction ? (
          <Link className={styles.quickActionLink} href={withUnifiedCrmOpportunityReturn(primaryOpportunityAction.link.href, opportunityDiscovery.customer.href)}>
            <strong>{primaryOpportunityAction.link.label}</strong>
            <small>{primaryOpportunityAction.link.description} Held review only.</small>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function OpportunityDiscoveryNudges({ model }: { model: UnifiedCrmCustomerOpportunityDiscoveryModel }) {
  function withCustomerReturn(href: string) {
    try {
      const url = new URL(href, "http://crm.local");
      url.searchParams.set("crmReturnTo", model.customer.href);
      return `${url.pathname}${url.search}`;
    } catch {
      return href;
    }
  }

  const pipeline = model.opportunityDiscovery.panels.find((panel) => panel.link.id === "pipeline");
  const hub = model.opportunityDiscovery.panels.find((panel) => panel.link.id === "hub");
  const guided = model.opportunityDiscovery.panels.find((panel) => panel.link.id === "guided");

  return {
    connectedWork: pipeline
      ? (
        <OpportunityDiscoveryPrompt
          detail="Use the held pipeline review when connected appointments or vehicles make you want to check the next commercial follow-up."
          href={withCustomerReturn(pipeline.link.href)}
          label="Commercial next step"
          title={pipeline.link.label}
        />
      )
      : null,
    sourceLenses: hub
      ? (
        <OpportunityDiscoveryPrompt
          detail="Use the review hub when lead or case context makes you want to compare the held, read-only opportunity review surfaces from one place."
          href={withCustomerReturn(hub.link.href)}
          label="From source context"
          title={hub.link.label}
        />
      )
      : null,
    timeline: guided
      ? (
        <OpportunityDiscoveryPrompt
          detail="Use the guided journey when recent history makes you want to walk the full held opportunity review path in order."
          href={withCustomerReturn(guided.link.href)}
          label="Follow-up journey"
          title={guided.link.label}
        />
      )
      : null
  };
}

function WorkContext({
  model,
  opportunityPrompt
}: {
  model: UnifiedCrmCustomer360ReadModel;
  opportunityPrompt?: ReactNode;
}) {
  const upcoming = model.appointments.slice(0, 3);
  const vehicles = model.vehicles.slice(0, 3);
  return (
    <section aria-labelledby="relationship-work-heading" className={styles.sectionCard}>
      <header><div><span className={styles.eyebrow}>Connected work</span><h2 id="relationship-work-heading">Relationship context</h2></div><small>Source-owned summaries</small></header>
      <div className={styles.contextColumns}>
        <div><h3><CalendarDays aria-hidden="true" size={15} />Appointments</h3>{upcoming.length ? upcoming.map((item) => <Link href={item.sourceHref} key={item.id}><span><strong>{item.title}</strong><small>{label(item.bookingStatus)} · {label(item.confirmationStatus)}</small></span><time>{formatDate(item.startsAt, "Not scheduled")}</time><ArrowRight aria-hidden="true" size={14} /></Link>) : <p>No permitted appointments are linked.</p>}</div>
        <div><h3><CarFront aria-hidden="true" size={15} />Vehicles</h3>{vehicles.length ? vehicles.map((item) => <Link href={item.sourceHref} key={item.id}><span><strong>{item.label}</strong><small>{label(item.relationshipType)} · {label(item.status)}</small></span><time>{formatDate(item.effectiveFrom, "Date unavailable")}</time><ArrowRight aria-hidden="true" size={14} /></Link>) : <p>No permitted vehicles are linked.</p>}</div>
      </div>
      {opportunityPrompt ? <div className={styles.discoveryPromptRow}>{opportunityPrompt}</div> : null}
    </section>
  );
}

function SourceLenses({
  model,
  opportunityPrompt
}: {
  model: UnifiedCrmCustomer360ReadModel;
  opportunityPrompt?: ReactNode;
}) {
  return (
    <section aria-labelledby="source-lenses-heading" className={styles.sectionCard}>
      <header><div><span className={styles.eyebrow}>Existing source workflows</span><h2 id="source-lenses-heading">Lead and case context</h2></div><small>Read only · changes stay in their source</small></header>
      <div className={styles.lensGrid}>
        <section aria-labelledby="lead-lens-heading"><h3 id="lead-lens-heading">Leads</h3>{model.sourceLenses.leads.length ? model.sourceLenses.leads.map((item) => <article key={item.id}><div><strong>{item.leadNumber} · {item.vehicleInterest ?? "General interest"}</strong><span>{label(item.stage)} · {item.ownerName}</span><small>Next: {label(item.nextActionCode)} · {formatDate(item.nextActionAt, "Not scheduled")}</small></div><Link aria-label={`Open lead ${item.leadNumber} in Customers`} href={item.sourceHref}>Open source<ExternalLink aria-hidden="true" size={13} /></Link></article>) : <p>No permitted source leads are linked.</p>}</section>
        <section aria-labelledby="case-lens-heading"><h3 id="case-lens-heading">Cases</h3>{model.sourceLenses.cases.length ? model.sourceLenses.cases.map((item) => <article key={item.id}><div><strong>{item.caseNumber} · {item.title}</strong><span>{label(item.status)} · {item.ownerName}</span><small>{label(item.priority)} priority · SLA {label(item.slaStage)} · due {formatDate(item.resolutionDueAt ?? item.dueAt, "Not scheduled")}</small></div><Link aria-label={`Open case ${item.caseNumber} in Customers`} href={item.sourceHref}>Open source<ExternalLink aria-hidden="true" size={13} /></Link></article>) : <p>No permitted source cases are linked.</p>}</section>
      </div>
      {opportunityPrompt ? <div className={styles.discoveryPromptRow}>{opportunityPrompt}</div> : null}
    </section>
  );
}

function TimelineSection({
  model,
  opportunityPrompt
}: {
  model: UnifiedCrmCustomer360ReadModel;
  opportunityPrompt?: ReactNode;
}) {
  const hasTimelineItems = model.timeline.items.length > 0;

  return (
    <section aria-labelledby="timeline-heading" className={styles.sectionCard}>
      <header>
        <div><span className={styles.eyebrow}>Unified activity</span><h2 id="timeline-heading">Relationship timeline</h2></div>
        <small>{model.timeline.itemCount} latest permitted events</small>
      </header>
      <p className={styles.timelineDetail}>
        This read-only timeline combines the latest permitted customer activity across connected source workflows. Source systems remain authoritative, and this view was observed {formatDate(model.freshness.observedAt, "time unavailable")}.
      </p>
      {hasTimelineItems ? (
        <ol className={styles.timelineList} aria-label="Permitted customer relationship activity">
          {model.timeline.items.map((item) => (
            <li key={item.id} className={styles.timelineItem}>
              <span className={styles.timelineDot} aria-hidden="true" />
              <div className={styles.timelineBody}>
                <div className={styles.timelineHeader}>
                  <strong>{item.title}</strong>
                  <span className={styles.timelineKind}>{timelineKindLabel(item.kind)}</span>
                </div>
                <p>{item.detail}</p>
                <small>{item.actorName ? `${item.actorName} · ` : ""}{item.sourceLabel}</small>
              </div>
              <time dateTime={item.occurredAt}>{formatDate(item.occurredAt, "Time unavailable")}</time>
              <Link aria-label={`Open ${item.sourceLabel} source for ${item.title}`} href={item.sourceHref}>Open source<ExternalLink aria-hidden="true" size={13} /></Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.timelineEmpty}>
          <History aria-hidden="true" size={16} />
          No permitted relationship history has been recorded yet. New source-owned events will appear here when they enter your allowed customer scope.
        </p>
      )}
      {opportunityPrompt ? <div className={styles.discoveryPromptRow}>{opportunityPrompt}</div> : null}
    </section>
  );
}

function NotesSection({ model }: { model: UnifiedCrmCustomer360ReadModel }) {
  return (
    <section aria-labelledby="customer-notes-heading" className={styles.sectionCard}>
      <header>
        <div><span className={styles.eyebrow}>Relationship notes</span><h2 id="customer-notes-heading">Team context</h2></div>
        <small>{model.notes.length ? `${model.notes.length} visible notes` : "Read only list"}</small>
      </header>
      <div className={styles.notesList}>
        {model.notes.length ? model.notes.map((note) => (
          <article className={styles.noteItem} key={note.id}>
            <div className={styles.noteMeta}>
              <strong>{note.authorName}</strong>
              <span>{note.visibility === "RESTRICTED" ? "Restricted" : "Internal"}</span>
              <time>{formatDate(note.createdAt, "Time unavailable")}</time>
            </div>
            <p>{note.body}</p>
          </article>
        )) : <p className={styles.timelineEmpty}><History aria-hidden="true" size={16} />No permitted customer notes have been recorded yet.</p>}
      </div>
    </section>
  );
}

export function UnifiedCrmCustomer360({ errorMessage, failureKind = "error", model, opportunityDiscovery, returnHref }: Customer360Props) {
  if (!model) return <StatePanel kind={failureKind} message={errorMessage} returnHref={returnHref} />;
  const returnContext = customerReturnContext(returnHref);
  const taskBridgeHref = buildUnifiedCrmTaskIntakeHref({
    customerDisplayName: model.identity.displayName,
    customerId: model.identity.id,
    customerNumber: model.identity.customerNumber,
    dueAt: model.relationship.nextActionAt
  });
  const primaryContact = model.contacts.find((item) => item.isPrimary) ?? model.contacts[0];
  const otherContacts = model.contacts.filter((item) => item !== primaryContact).slice(0, 2);
  const opportunityNudges = opportunityDiscovery ? OpportunityDiscoveryNudges({ model: opportunityDiscovery }) : null;
  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />{returnContext.backLabel}</Link>
      <section className={styles.identityCard} aria-labelledby="customer-name-heading">
        <div className={styles.identityMain}><span className={styles.avatar}><UserRound aria-hidden="true" size={22} /></span><div><span className={styles.eyebrow}>Customer relationship · read only</span><h1 id="customer-name-heading">{model.identity.displayName}</h1><p>{model.identity.customerNumber} · Customer since {formatDateOnly(model.identity.customerSince)}</p></div></div>
        <div className={styles.identityMeta}><Status value={model.identity.status} /><span><small>Owner</small><strong>{model.owner?.name ?? "Unassigned"}</strong></span></div>
      </section>
      <section className={styles.trustBar} aria-label="Customer source and freshness"><span><ShieldCheck aria-hidden="true" size={15} /><strong>{model.source.label}</strong> · canonical identity</span><span><ShieldCheck aria-hidden="true" size={14} />Current · observed {formatDate(model.freshness.observedAt, "time unavailable")}</span><span><ShieldCheck aria-hidden="true" size={14} />{returnContext.continuityLabel}</span><Link href={model.source.href}>Open existing customer record<ExternalLink aria-hidden="true" size={13} /></Link></section>
      <QuickActions
        customerSourceHref={model.source.href}
        nextActionAvailable={model.permissions.canManageNextAction}
        opportunityDiscovery={opportunityDiscovery}
        taskBridgeAvailable={model.permissions.canCreateGovernedTask}
        taskBridgeHref={taskBridgeHref}
      />
      <section className={styles.priorityGrid}>
        <article className={styles.nextAction}><span className={styles.eyebrow}>{nextActionEyebrow(model.relationship.nextActionState)}</span><h2>{model.relationship.nextActionAt ? formatDate(model.relationship.nextActionAt, "Not scheduled") : "No next action scheduled"}</h2><p>Last interaction: {formatDate(model.relationship.lastInteractionAt, "No interaction recorded")}</p><p>{nextActionGuidance(model)}</p><small>This overview is read only. Continue in the appropriate source workflow to make a change.</small><Link className={styles.secondaryActionLink} href={model.permissions.canCreateGovernedTask ? "#task-bridge-heading" : taskBridgeHref}>Create governed task<ExternalLink aria-hidden="true" size={13} /></Link></article>
        <article className={styles.contactCard}><span className={styles.eyebrow}>Masked contact</span><h2>{primaryContact?.maskedValue ?? "No contact recorded"}</h2>{otherContacts.map((item) => <p key={`${item.type}-${item.maskedValue}`}>{label(item.type)} · {item.maskedValue}</p>)}<dl><div><dt>Preferred method</dt><dd>{model.preferences.preferredContactMethod ? label(model.preferences.preferredContactMethod) : "Not recorded"}</dd></div><div><dt>Preferred time</dt><dd>{model.preferences.preferredContactTime ?? "Not recorded"}</dd></div><div><dt>Language</dt><dd>{model.preferences.languageCode ?? "Not recorded"}</dd></div></dl></article>
      </section>
      {model.permissions.canManageNextAction ? (
        <UnifiedCrmCustomerNextActionForm currentNextActionAt={model.relationship.nextActionAt} currentNextActionState={model.relationship.nextActionState} customerId={model.identity.id} />
      ) : (
        <section className={styles.interactionCard} aria-labelledby="next-action-form-heading">
          <header className={styles.interactionHeader}>
            <div>
              <span className={styles.eyebrow}>Next action</span>
              <h2 id="next-action-form-heading">Keep the customer follow-up current</h2>
              <p>CRM next-action updates are unavailable in this environment or for this customer record right now.</p>
            </div>
          </header>
        </section>
      )}
      <UnifiedCrmCustomerTaskBridgeForm
        available={model.permissions.canCreateGovernedTask}
        customerDisplayName={model.identity.displayName}
        customerId={model.identity.id}
        defaultDueAt={model.relationship.nextActionAt}
        fallbackHref={taskBridgeHref}
      />
      <UnifiedCrmCustomerInteractionForm customerId={model.identity.id} />
      <UnifiedCrmCustomerNoteForm allowRestricted={model.permissions.canCreateRestrictedNote} customerId={model.identity.id} />
      <RelationshipSummary model={model} />
      {opportunityDiscovery ? <OpportunityDiscoverySection model={opportunityDiscovery} /> : null}
      <OpportunityLensSection model={model} returnHref={`/crm/customers/${encodeURIComponent(model.identity.id)}?crmReturnTo=${encodeURIComponent(returnHref)}`} />
      <NotesSection model={model} />
      <TimelineSection model={model} opportunityPrompt={opportunityNudges?.timeline} />
      <WorkContext model={model} opportunityPrompt={opportunityNudges?.connectedWork} />
      <SourceLenses model={model} opportunityPrompt={opportunityNudges?.sourceLenses} />
      <footer className={styles.footer}>Source record observed {formatDate(model.freshness.observedAt, "time unavailable")} · source record updated {formatDate(model.freshness.sourceRecordUpdatedAt, "time unavailable")} · manual contact outcomes are recorded here; source-owned workflows remain authoritative.</footer>
    </main>
  );
}

export function UnifiedCrmCustomer360Loading() {
  return <main className={styles.page}><section aria-busy="true" aria-labelledby="customer-360-loading-heading" className={styles.loading}><span className={styles.eyebrow}>Unified CRM</span><h1 id="customer-360-loading-heading">Loading permitted customer context</h1><p>Checking access and reading the current source record. No action has been completed.</p><div aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div></section></main>;
}
