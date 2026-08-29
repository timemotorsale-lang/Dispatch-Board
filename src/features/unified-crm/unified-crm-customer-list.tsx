"use client";

import { AlertTriangle, ArrowRight, ExternalLink, RefreshCw, Search, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { UnifiedCrmCustomerListReadModel } from "@/server/unified-crm/customer-read-contract";
import type {
  UnifiedCrmCustomerListOpportunityDiscoveryCollectionModel,
  UnifiedCrmCustomerListOpportunityDiscoveryModel
} from "@/server/unified-crm/customer-list-opportunity-discovery-contract";

import styles from "./unified-crm-customer-list.module.css";

type CustomerListProps = {
  errorMessage?: string;
  failureKind?: "error" | "restricted" | "unavailable";
  model?: UnifiedCrmCustomerListReadModel;
  opportunityDiscovery?: UnifiedCrmCustomerListOpportunityDiscoveryCollectionModel;
};

function customerListHref(model: UnifiedCrmCustomerListReadModel, cursor?: string | null) {
  const parameters = new URLSearchParams({ view: "customers" });
  if (model.query.q) parameters.set("q", model.query.q);
  if (model.query.status !== "active") parameters.set("status", model.query.status);
  if (model.query.owner !== "all") parameters.set("owner", model.query.owner);
  if (cursor) parameters.set("cursor", cursor);
  return `/crm?${parameters.toString()}`;
}

function crmCustomerHref(model: UnifiedCrmCustomerListReadModel, customerId: string) {
  return `/crm/customers/${encodeURIComponent(customerId)}?crmReturnTo=${encodeURIComponent(customerListHref(model))}`;
}

function customerSourceHref(model: UnifiedCrmCustomerListReadModel) {
  try {
    const url = new URL(model.source.href, "https://crm.local");
    url.searchParams.set("returnTo", customerListHref(model));
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return model.source.href;
  }
}

function opportunityBranchHref(opportunityDiscovery: UnifiedCrmCustomerListOpportunityDiscoveryModel | undefined) {
  return opportunityDiscovery?.actions.find((action) => action.id === "hub")?.href
    ?? opportunityDiscovery?.actions[0]?.href
    ?? null;
}

function firstOpportunityDiscovery(
  opportunityDiscovery: UnifiedCrmCustomerListOpportunityDiscoveryCollectionModel | undefined
) {
  if (!opportunityDiscovery) return undefined;
  return Object.values(opportunityDiscovery.byCustomerId)[0];
}

function formatDate(value: string | null, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }).format(new Date(value));
}

function resultLabel(model: UnifiedCrmCustomerListReadModel) {
  const count = model.items.length;
  return `${count}${model.page.hasMore ? "+" : ""} customer${count === 1 ? "" : "s"}`;
}

function SourceBar({ model }: { model: UnifiedCrmCustomerListReadModel }) {
  return (
    <>
      <section className={styles.sourceBar} aria-label="Customer source and freshness">
        <div className={styles.sourceIdentity}>
          <ShieldCheck aria-hidden="true" size={16} />
          <span><strong>{model.source.label}</strong><small>Canonical customer identity · read only</small></span>
        </div>
        <span className={`${styles.freshness} ${styles.freshnessCurrent}`}>
          <ShieldCheck aria-hidden="true" size={14} />
          {model.freshness.status === "CURRENT" ? "Current" : model.freshness.status} · observed {formatDate(model.freshness.observedAt, "time unavailable")}
        </span>
        <Link className={styles.sourceLink} href={customerSourceHref(model)}>Open existing Customers<ExternalLink aria-hidden="true" size={13} /></Link>
      </section>
      {model.freshness.newestRecordUpdatedAt ? <div className={styles.summary}><span>Newest record update in this page: {formatDate(model.freshness.newestRecordUpdatedAt, "time unavailable")}</span></div> : null}
    </>
  );
}

function CustomerFilters({ model }: { model: UnifiedCrmCustomerListReadModel }) {
  const [submitting, setSubmitting] = useState(false);
  const ownerOnly = model.visibility === "owned";
  return (
    <form action="/crm" className={`${styles.filters} ${ownerOnly ? styles.filtersOwned : ""}`} method="get" onSubmit={() => setSubmitting(true)} role="search">
      <input name="view" type="hidden" value="customers" />
      <label className={styles.searchLabel}>
        <span>Search customers</span>
        <span className={styles.searchControl}><Search aria-hidden="true" size={16} /><input defaultValue={model.query.q} name="q" placeholder="Name or customer number" type="search" /></span>
      </label>
      <label className={styles.selectLabel}><span>Status</span><select defaultValue={model.query.status} name="status"><option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All permitted</option></select></label>
      {ownerOnly ? <input name="owner" type="hidden" value="mine" /> : <label className={styles.selectLabel}><span>Customer owner</span><select defaultValue={model.query.owner} name="owner"><option value="all">All owners</option><option value="mine">Mine</option><option value="unassigned">Unassigned</option></select></label>}
      <button aria-busy={submitting} className={styles.submitButton} type="submit">{submitting ? "Loading…" : "Search"}</button>
    </form>
  );
}

function CustomerStatus({ status }: { status: string }) {
  const inactive = status !== "active";
  return <span className={`${styles.status} ${inactive ? styles.statusInactive : ""}`}>{status.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())}</span>;
}

function CustomerRows({
  model,
  opportunityDiscovery
}: {
  model: UnifiedCrmCustomerListReadModel;
  opportunityDiscovery?: UnifiedCrmCustomerListOpportunityDiscoveryCollectionModel;
}) {
  return (
    <>
      <section className={styles.tablePanel} aria-label="Customer results">
        <table className={styles.table}>
          <caption>{resultLabel(model)}. Contact details are masked in this list.</caption>
          <thead><tr><th scope="col">Customer</th><th scope="col">Contact</th><th scope="col">Owner</th><th scope="col">Status</th><th scope="col">Last interaction</th><th scope="col">Next action</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{model.items.map((customer) => {
            const customerOpportunityDiscovery = opportunityDiscovery?.byCustomerId[customer.id];
            const opportunityHref = opportunityBranchHref(customerOpportunityDiscovery);
            const customerOpportunityHref = `${customerOpportunityDiscovery?.customer.href ?? crmCustomerHref(model, customer.id)}#customer-opportunity-discovery-heading`;
            return (
            <tr key={customer.id}>
              <td><span className={styles.identity}><strong>{customer.displayName}</strong><small>{customer.customerNumber}</small></span></td>
              <td><span className={styles.contact}><span>{customer.maskedPhone}</span><small>{customer.maskedEmail}</small></span></td>
              <td>{customer.ownerName}</td>
              <td><CustomerStatus status={customer.status} /></td>
              <td><span className={styles.timing}><span>{formatDate(customer.lastInteractionAt, "No interaction recorded")}</span><small>Updated {formatDate(customer.updatedAt, "time unavailable")}</small></span></td>
              <td>{formatDate(customer.nextActionAt, "No next action scheduled")}</td>
              <td><div className={styles.rowActions}><Link aria-label={`Open ${customer.displayName} in CRM`} className={styles.openLink} href={customerOpportunityDiscovery?.customer.href ?? crmCustomerHref(model, customer.id)}>Open<ArrowRight aria-hidden="true" size={14} /></Link>{opportunityHref ? <Link aria-label={`Review opportunity workspace from ${customer.displayName}`} className={styles.branchLink} href={customerOpportunityHref}>Opportunity review</Link> : null}</div></td>
            </tr>
          )})}</tbody>
        </table>
      </section>
      <section className={styles.mobileList} aria-label="Customer results">
        {model.items.map((customer) => {
          const customerOpportunityDiscovery = opportunityDiscovery?.byCustomerId[customer.id];
          const opportunityHref = opportunityBranchHref(customerOpportunityDiscovery);
          const customerOpportunityHref = `${customerOpportunityDiscovery?.customer.href ?? crmCustomerHref(model, customer.id)}#customer-opportunity-discovery-heading`;
          return (
          <article className={styles.customerCard} key={customer.id}>
            <div className={styles.cardTop}><span className={styles.identity}><strong>{customer.displayName}</strong><small>{customer.customerNumber}</small></span><CustomerStatus status={customer.status} /></div>
            <dl className={styles.cardFacts}>
              <div><dt>Contact</dt><dd>{customer.maskedPhone}<br />{customer.maskedEmail}</dd></div>
              <div><dt>Owner</dt><dd>{customer.ownerName}</dd></div>
              <div><dt>Last interaction</dt><dd>{formatDate(customer.lastInteractionAt, "Not recorded")}</dd></div>
              <div><dt>Next action</dt><dd>{formatDate(customer.nextActionAt, "Not scheduled")}</dd></div>
            </dl>
            <div className={styles.cardActions}><Link aria-label={`Open ${customer.displayName} in CRM`} className={styles.openLink} href={customerOpportunityDiscovery?.customer.href ?? crmCustomerHref(model, customer.id)}>Open customer<ArrowRight aria-hidden="true" size={14} /></Link>{opportunityHref ? <Link aria-label={`Review opportunity workspace from ${customer.displayName}`} className={styles.branchLink} href={customerOpportunityHref}>Opportunity review</Link> : null}</div>
          </article>
        )})}
      </section>
    </>
  );
}

function StatePanel({
  filtered,
  kind,
  message,
  sourceHref = "/customers"
}: {
  filtered?: boolean;
  kind: "empty" | "error" | "restricted" | "unavailable";
  message?: string;
  sourceHref?: string;
}) {
  const title = kind === "restricted" ? "Customer records aren’t available to you" : kind === "unavailable" ? "Customers are temporarily unavailable" : kind === "error" ? "Customers couldn’t be loaded" : filtered ? "No customers match these filters" : "No active customers yet";
  const detail = message ?? (kind === "restricted" ? "Your current access does not include the CRM customer list." : kind === "unavailable" ? "The customer source is not available right now. Retry or continue in the existing Customers console." : kind === "error" ? "The source could not provide a safe customer list. Try again or continue in the existing Customers console." : filtered ? "Clear the search and filters to return to active customers." : "The Customers source has no active records available in this view.");
  return (
    <section className={styles.statePanel} role={kind === "error" || kind === "unavailable" ? "alert" : "status"}>
      {kind === "error" || kind === "unavailable" ? <AlertTriangle aria-hidden="true" size={25} /> : kind === "restricted" ? <ShieldCheck aria-hidden="true" size={25} /> : <UsersRound aria-hidden="true" size={25} />}
      <h2>{title}</h2><p>{detail}</p>
      <div className={styles.stateActions}>
        {kind === "error" || kind === "unavailable" ? <button className={styles.retryButton} onClick={() => window.location.reload()} type="button"><RefreshCw aria-hidden="true" size={14} />Retry</button> : null}
        {kind === "empty" && filtered ? <Link className={styles.clearLink} href="/crm?view=customers">Clear filters</Link> : null}
        <Link className={styles.clearLink} href={sourceHref}>Open existing Customers<ExternalLink aria-hidden="true" size={13} /></Link>
      </div>
    </section>
  );
}

export function UnifiedCrmCustomerList({ errorMessage, failureKind = "error", model, opportunityDiscovery }: CustomerListProps) {
  if (!model) {
    if (errorMessage) return <div className={styles.workspace}><StatePanel kind={failureKind} message={errorMessage} /></div>;
    return <div aria-busy="true" aria-label="Loading customers" className={`${styles.tablePanel} ${styles.skeleton}`}>{Array.from({ length: 5 }, (_, index) => <div className={styles.skeletonRow} key={index} />)}</div>;
  }

  const filtered = Boolean(model.query.q || model.query.status !== "active" || (model.visibility === "organization" && model.query.owner !== "all"));
  const listDiscovery = firstOpportunityDiscovery(opportunityDiscovery);
  const sourceHref = customerSourceHref(model);
  return (
    <div className={styles.workspace}>
      <SourceBar model={model} />
      <CustomerFilters model={model} />
      {model.items.length === 0 ? <StatePanel filtered={filtered} kind="empty" sourceHref={sourceHref} /> : (
        <>
          <div aria-live="polite" className={styles.summary}><span><strong>{resultLabel(model)}</strong>{filtered ? " for the current search and filters" : ""}</span><span>Contact hints are masked · recent activity first</span></div>
          {listDiscovery && opportunityBranchHref(listDiscovery) ? <section aria-label="Opportunity review discovery" className={styles.discoveryPanel}>
            <div><strong>Need to review the commercial follow-up before opening a full customer?</strong><small>Use the guided opportunity workspace from the customer list. It stays read only and returns you safely to this list.</small></div>
            <Link className={styles.branchLink} href={opportunityBranchHref(listDiscovery) ?? listDiscovery.customer.href}>Open opportunity review</Link>
          </section> : null}
          <CustomerRows model={model} opportunityDiscovery={opportunityDiscovery} />
          {model.page.nextCursor ? <nav aria-label="Customer result pages" className={styles.pagination}><Link href={customerListHref(model, model.page.nextCursor)}>Next page<ArrowRight aria-hidden="true" size={14} /></Link></nav> : null}
        </>
      )}
    </div>
  );
}

export function UnifiedCrmRouteLoading() {
  return (
    <main className={styles.routeLoading}>
      <section aria-busy="true" aria-labelledby="crm-loading-heading" className={styles.loadingFrame}>
        <span className={styles.loadingEyebrow}>Unified CRM</span>
        <h1 id="crm-loading-heading">Loading your CRM workspace</h1>
        <p>Checking access and loading the permitted workspace. No action has been completed yet.</p>
        <div aria-hidden="true" className={`${styles.tablePanel} ${styles.skeleton}`}>{Array.from({ length: 5 }, (_, index) => <div className={styles.skeletonRow} key={index} />)}</div>
      </section>
    </main>
  );
}
