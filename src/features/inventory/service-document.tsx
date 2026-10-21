"use client";

import Link from "next/link";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import type { ServiceDocumentContent } from "@/server/repair-order/service-documents";
import styles from "./service-document.module.css";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export function ServiceDocument({ content, sha256, templateVersion, repairOrderId, reviewWorkflow = false }: { reviewWorkflow?: boolean; repairOrderId?: string; content: ServiceDocumentContent; sha256: string; templateVersion: string }) {
  return <article className={styles.document}>
    <button className={styles.print} onClick={() => window.print()}>Print / save PDF</button>
    {repairOrderId && <nav className={styles.actions} aria-label="Continue repair order"><Link href={reviewWorkflow ? repairReviewHref(repairOrderId) : `/vehicles/shop-planning?repairOrderId=${encodeURIComponent(repairOrderId)}`}>Continue recon / shop workflow · review / authorize</Link><Link href={`/service-documents?repairOrderId=${encodeURIComponent(repairOrderId)}`}>View Documents & Approvals</Link><Link href={`/vehicles/service-billing?repairOrderId=${encodeURIComponent(repairOrderId)}`}>Create / Print Final Invoice</Link><p>Printing an estimate does not authorize work. Final invoicing requires the approved revision, completed work and quality checks.</p></nav>}
    <header><h1>{content.title}</h1><strong>{content.number}</strong><p>{content.identity.store}<br />{content.identity.address}</p><p>{new Date(content.issuedAt).toLocaleString("en-US", { timeZone: content.identity.timezone })} ({content.identity.timezone})</p></header>
    <section><h2>Customer and vehicle</h2><p>{content.identity.customer}<br />{content.identity.vehicle} · {content.identity.vehicleNumber}<br />VIN: {content.identity.vin}<br />RO: {content.identity.repairOrderNumber}</p><p>Concern: {content.identity.concern}</p></section>
    <table><thead><tr><th>Work / item</th><th>Quantity</th><th>Planning hours</th><th>Implied planning rate / h</th><th>Unit charge</th><th>Amount</th></tr></thead><tbody>{content.lines.map(line => <tr key={line.key}><td>{line.description}</td><td>{line.quantity}</td><td>{line.hours == null ? "—" : line.hours.toFixed(2)}</td><td>{line.planningHourlyRateCents == null ? "—" : money(line.planningHourlyRateCents)}</td><td>{money(line.unitPriceCents)}</td><td>{money(line.totalCents)}</td></tr>)}</tbody></table>
    {content.totals && <dl><dt>Subtotal</dt><dd>{money(content.totals.subtotalCents)}</dd><dt>Discount</dt><dd>{money(content.totals.discountCents)}</dd><dt>Tax</dt><dd>{money(content.totals.taxCents)}</dd><dt>Total</dt><dd>{money(content.totals.totalCents)}</dd></dl>}
    {content.decision && <section><h2>{content.decision.disposition}</h2><p>Recorded decision by {content.decision.actor} via {content.decision.channel}. Reference: {content.decision.reference ?? "Not supplied"}.</p><p>Approved: {content.decision.approvedLineKeys.join(", ") || "None"}</p><p>Declined: {content.decision.declinedLineKeys.join(", ") || "None"}</p><p>Undecided: {content.decision.undecidedLineKeys.join(", ") || "None"}</p></section>}
    {content.notes.map((note, index) => <p key={`${index}-${note}`}>{note}</p>)}
    <footer>Frozen record · {templateVersion}<br />SHA-256: {sha256}</footer>
  </article>;
}
