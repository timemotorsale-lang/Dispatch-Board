"use client";

import Link from "next/link";
import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import type { ServiceDocumentContent } from "@/server/repair-order/service-documents";
import styles from "./service-document.module.css";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export function ServiceDocument({ content, repairOrderId, reviewWorkflow = false }: { reviewWorkflow?: boolean; repairOrderId?: string; content: ServiceDocumentContent; sha256: string; templateVersion: string }) {
  const issuedDate = new Date(content.issuedAt).toLocaleDateString("en-US", { timeZone: content.identity.timezone, month: "short", day: "numeric", year: "numeric" });
  const issuedTime = new Date(content.issuedAt).toLocaleTimeString("en-US", { timeZone: content.identity.timezone, hour: "numeric", minute: "2-digit" });
  return <article className={styles.document}>
    <button className={styles.print} onClick={() => window.print()}>Print / save PDF</button>
    {repairOrderId && <nav className={styles.actions} aria-label="Continue repair order"><Link href={reviewWorkflow ? repairReviewHref(repairOrderId) : `/vehicles/shop-planning?repairOrderId=${encodeURIComponent(repairOrderId)}`}>Continue recon / shop workflow · review / authorize</Link><Link href={`/service-documents?repairOrderId=${encodeURIComponent(repairOrderId)}`}>View Documents & Approvals</Link><Link href={`/vehicles/service-billing?repairOrderId=${encodeURIComponent(repairOrderId)}`}>Create / Print Final Invoice</Link><p>Printing an estimate does not authorize work. Final invoicing requires the approved revision, completed work and quality checks.</p></nav>}
    <header className={styles.header}><div className={styles.brand}><TimeMotorSalesLogo className={styles.logo} priority variant="horizontal" /><p className={styles.department}>SERVICE DEPARTMENT</p><p className={styles.location}>{content.identity.store}<br />{content.identity.address}</p><div className={styles.contact}><a href="mailto:timemotorsale@gmail.com">timemotorsale@gmail.com</a><a href="https://timemotors.net">timemotors.net</a></div></div><div className={styles.documentIdentity}><p className={styles.eyebrow}>CUSTOMER SERVICE DOCUMENT</p><h1>{content.title}</h1><div className={styles.metadata}><div><span>Document reference</span><strong>{content.number}</strong></div><div><span>Issued</span><strong>{issuedDate}</strong><small>{issuedTime}</small></div><div><span>Repair order</span><strong>{content.identity.repairOrderNumber}</strong></div></div></div></header>
    <section><h2>Customer and vehicle</h2><p>{content.identity.customer}<br />{content.identity.vehicle} · {content.identity.vehicleNumber}<br />VIN: {content.identity.vin}<br />RO: {content.identity.repairOrderNumber}</p><p>Concern: {content.identity.concern}</p></section>
    <table><thead><tr><th>Work / item</th><th>Quantity</th><th>Planning hours</th><th>Implied planning rate / h</th><th>Unit charge</th><th>Amount</th></tr></thead><tbody>{content.lines.map(line => <tr key={line.key}><td>{line.description}</td><td>{line.quantity}</td><td>{line.hours == null ? "—" : line.hours.toFixed(2)}</td><td>{line.planningHourlyRateCents == null ? "—" : money(line.planningHourlyRateCents)}</td><td>{money(line.unitPriceCents)}</td><td>{money(line.totalCents)}</td></tr>)}</tbody></table>
    {content.totals && <dl><dt>Subtotal</dt><dd>{money(content.totals.subtotalCents)}</dd><dt>Discount</dt><dd>{money(content.totals.discountCents)}</dd><dt>Tax</dt><dd>{money(content.totals.taxCents)}</dd><dt>Total</dt><dd>{money(content.totals.totalCents)}</dd></dl>}
    {content.decision && <section><h2>{content.decision.disposition}</h2><p>Recorded decision by {content.decision.actor} via {content.decision.channel}. Reference: {content.decision.reference ?? "Not supplied"}.</p><p>Approved: {content.decision.approvedLineKeys.join(", ") || "None"}</p><p>Declined: {content.decision.declinedLineKeys.join(", ") || "None"}</p><p>Undecided: {content.decision.undecidedLineKeys.join(", ") || "None"}</p></section>}
    {content.notes.map((note, index) => <p key={`${index}-${note}`}>{note}</p>)}
    <footer><strong>Document reference: {content.number}</strong><span>Thank you for choosing Time Motor Sales.</span></footer>
  </article>;
}
