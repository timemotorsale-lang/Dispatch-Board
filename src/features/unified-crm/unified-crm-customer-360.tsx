"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, CarFront, ExternalLink, RefreshCw, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";

import type { UnifiedCrmCustomer360ReadModel } from "@/server/unified-crm/customer-360-contract";

import styles from "./unified-crm-customer-360.module.css";

type FailureKind = "error" | "not-available" | "restricted" | "unavailable";

type Customer360Props = {
  errorMessage?: string;
  failureKind?: FailureKind;
  model?: UnifiedCrmCustomer360ReadModel;
  returnHref: string;
};

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

function Status({ value }: { value: string }) {
  return <span className={`${styles.status} ${value.toLowerCase() === "active" ? styles.statusActive : ""}`}>{label(value)}</span>;
}

function StatePanel({ kind, message, returnHref }: { kind: FailureKind; message?: string; returnHref: string }) {
  const title = kind === "not-available" ? "Customer isn’t available" : kind === "restricted" ? "Customer details aren’t available to you" : kind === "unavailable" ? "Customer details are temporarily unavailable" : "Customer details couldn’t be loaded";
  const detail = message ?? (kind === "not-available" ? "This record may not exist, may have changed, or may be outside your permitted customer scope." : kind === "restricted" ? "Your current CRM access does not include this customer record." : "No customer details were displayed. Retry or return to the customer list.");
  const retryable = kind === "error" || kind === "unavailable";
  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />Back to CRM Customers</Link>
      <section className={styles.statePanel} role={retryable ? "alert" : "status"}>
        {retryable ? <AlertTriangle aria-hidden="true" size={28} /> : <ShieldCheck aria-hidden="true" size={28} />}
        <h1>{title}</h1><p>{detail}</p>
        <div className={styles.stateActions}>
          {retryable ? <button onClick={() => window.location.reload()} type="button"><RefreshCw aria-hidden="true" size={14} />Retry</button> : null}
          <Link href={returnHref}>Return to customer list</Link>
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
    { icon: UsersRound, label: "Source leads & cases", value: model.sourceLenses.leads.length + model.sourceLenses.cases.length }
  ];
  return <section aria-labelledby="relationship-summary-heading" className={styles.summaryCard}><header><h2 id="relationship-summary-heading">Relationship summary</h2><span>Read only</span></header><div>{summary.map(({ icon: Icon, label: itemLabel, value }) => <article key={itemLabel}><Icon aria-hidden="true" size={16} /><span><strong>{value}</strong><small>{itemLabel}</small></span></article>)}</div></section>;
}

function WorkContext({ model }: { model: UnifiedCrmCustomer360ReadModel }) {
  const upcoming = model.appointments.slice(0, 3);
  const vehicles = model.vehicles.slice(0, 3);
  return (
    <section aria-labelledby="relationship-work-heading" className={styles.sectionCard}>
      <header><div><span className={styles.eyebrow}>Connected work</span><h2 id="relationship-work-heading">Relationship context</h2></div><small>Source-owned summaries</small></header>
      <div className={styles.contextColumns}>
        <div><h3><CalendarDays aria-hidden="true" size={15} />Appointments</h3>{upcoming.length ? upcoming.map((item) => <Link href={item.sourceHref} key={item.id}><span><strong>{item.title}</strong><small>{label(item.bookingStatus)} · {label(item.confirmationStatus)}</small></span><time>{formatDate(item.startsAt, "Not scheduled")}</time><ArrowRight aria-hidden="true" size={14} /></Link>) : <p>No permitted appointments are linked.</p>}</div>
        <div><h3><CarFront aria-hidden="true" size={15} />Vehicles</h3>{vehicles.length ? vehicles.map((item) => <Link href={item.sourceHref} key={item.id}><span><strong>{item.label}</strong><small>{label(item.relationshipType)} · {label(item.status)}</small></span><time>{formatDate(item.effectiveFrom, "Date unavailable")}</time><ArrowRight aria-hidden="true" size={14} /></Link>) : <p>No permitted vehicles are linked.</p>}</div>
      </div>
    </section>
  );
}

function SourceLenses({ model }: { model: UnifiedCrmCustomer360ReadModel }) {
  return (
    <section aria-labelledby="source-lenses-heading" className={styles.sectionCard}>
      <header><div><span className={styles.eyebrow}>Existing source workflows</span><h2 id="source-lenses-heading">Lead and case context</h2></div><small>Read only · changes stay in their source</small></header>
      <div className={styles.lensGrid}>
        <section aria-labelledby="lead-lens-heading"><h3 id="lead-lens-heading">Leads</h3>{model.sourceLenses.leads.length ? model.sourceLenses.leads.map((item) => <article key={item.id}><div><strong>{item.leadNumber} · {item.vehicleInterest ?? "General interest"}</strong><span>{label(item.stage)} · {item.ownerName}</span><small>Next: {label(item.nextActionCode)} · {formatDate(item.nextActionAt, "Not scheduled")}</small></div><Link aria-label={`Open lead ${item.leadNumber} in Customers`} href={item.sourceHref}>Open source<ExternalLink aria-hidden="true" size={13} /></Link></article>) : <p>No permitted source leads are linked.</p>}</section>
        <section aria-labelledby="case-lens-heading"><h3 id="case-lens-heading">Cases</h3>{model.sourceLenses.cases.length ? model.sourceLenses.cases.map((item) => <article key={item.id}><div><strong>{item.caseNumber} · {item.title}</strong><span>{label(item.status)} · {item.ownerName}</span><small>{label(item.priority)} priority · SLA {label(item.slaStage)} · due {formatDate(item.resolutionDueAt ?? item.dueAt, "Not scheduled")}</small></div><Link aria-label={`Open case ${item.caseNumber} in Customers`} href={item.sourceHref}>Open source<ExternalLink aria-hidden="true" size={13} /></Link></article>) : <p>No permitted source cases are linked.</p>}</section>
      </div>
    </section>
  );
}

export function UnifiedCrmCustomer360({ errorMessage, failureKind = "error", model, returnHref }: Customer360Props) {
  if (!model) return <StatePanel kind={failureKind} message={errorMessage} returnHref={returnHref} />;
  const primaryContact = model.contacts.find((item) => item.isPrimary) ?? model.contacts[0];
  const otherContacts = model.contacts.filter((item) => item !== primaryContact).slice(0, 2);
  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={returnHref}><ArrowLeft aria-hidden="true" size={15} />Back to CRM Customers</Link>
      <section className={styles.identityCard} aria-labelledby="customer-name-heading">
        <div className={styles.identityMain}><span className={styles.avatar}><UserRound aria-hidden="true" size={22} /></span><div><span className={styles.eyebrow}>Customer relationship · read only</span><h1 id="customer-name-heading">{model.identity.displayName}</h1><p>{model.identity.customerNumber} · Customer since {formatDateOnly(model.identity.customerSince)}</p></div></div>
        <div className={styles.identityMeta}><Status value={model.identity.status} /><span><small>Owner</small><strong>{model.owner?.name ?? "Unassigned"}</strong></span></div>
      </section>
      <section className={styles.trustBar} aria-label="Customer source and freshness"><span><ShieldCheck aria-hidden="true" size={15} /><strong>{model.source.label}</strong> · canonical identity</span><span><ShieldCheck aria-hidden="true" size={14} />Current · observed {formatDate(model.freshness.observedAt, "time unavailable")}</span><Link href={model.source.href}>Open existing customer record<ExternalLink aria-hidden="true" size={13} /></Link></section>
      <section className={styles.priorityGrid}>
        <article className={styles.nextAction}><span className={styles.eyebrow}>Next relationship action</span><h2>{model.relationship.nextActionAt ? formatDate(model.relationship.nextActionAt, "Not scheduled") : "No next action scheduled"}</h2><p>Last interaction: {formatDate(model.relationship.lastInteractionAt, "No interaction recorded")}</p><small>This overview is read only. Continue in the appropriate source workflow to make a change.</small></article>
        <article className={styles.contactCard}><span className={styles.eyebrow}>Masked contact</span><h2>{primaryContact?.maskedValue ?? "No contact recorded"}</h2>{otherContacts.map((item) => <p key={`${item.type}-${item.maskedValue}`}>{label(item.type)} · {item.maskedValue}</p>)}<dl><div><dt>Preferred method</dt><dd>{model.preferences.preferredContactMethod ? label(model.preferences.preferredContactMethod) : "Not recorded"}</dd></div><div><dt>Preferred time</dt><dd>{model.preferences.preferredContactTime ?? "Not recorded"}</dd></div><div><dt>Language</dt><dd>{model.preferences.languageCode ?? "Not recorded"}</dd></div></dl></article>
      </section>
      <RelationshipSummary model={model} />
      <WorkContext model={model} />
      <SourceLenses model={model} />
      <footer className={styles.footer}>Source record observed {formatDate(model.freshness.observedAt, "time unavailable")} · source record updated {formatDate(model.freshness.sourceRecordUpdatedAt, "time unavailable")} · no CRM write controls are present.</footer>
    </main>
  );
}

export function UnifiedCrmCustomer360Loading() {
  return <main className={styles.page}><section aria-busy="true" aria-labelledby="customer-360-loading-heading" className={styles.loading}><span className={styles.eyebrow}>Unified CRM</span><h1 id="customer-360-loading-heading">Loading permitted customer context</h1><p>Checking access and reading the current source record. No action has been completed.</p><div aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div></section></main>;
}
