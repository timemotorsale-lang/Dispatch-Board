"use client";

import Link from "next/link";
import { useRef, useState, type RefObject } from "react";
import { openServiceDocumentPrint, serviceDocumentPdfHref } from "@/lib/service-document-print";
import { customerDocumentNotes, estimateCorrectionNotes, isEstimateExpirationNote, legacyReceiptDetails, serviceDocumentMileage } from "@/lib/service-document-notes";
import { formatEstimateDate } from "@/lib/estimate-details";
import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import type { ServiceDocumentContent } from "@/server/repair-order/service-documents";
import styles from "./service-document.module.css";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export function ServiceDocument({ content, repairOrderId, reviewWorkflow = false, documentRef, documentId, showControls = true }: { documentRef?: RefObject<HTMLElement | null>; documentId?: string; showControls?: boolean; reviewWorkflow?: boolean; repairOrderId?: string; content: ServiceDocumentContent; sha256: string; templateVersion: string }) {
  const localRef = useRef<HTMLElement>(null), printRef = documentRef ?? localRef;
  const [printError, setPrintError] = useState("");
  async function print() { setPrintError(""); try { await openServiceDocumentPrint(printRef.current); } catch (error) { setPrintError(error instanceof Error ? error.message : "Print could not open. Try again."); } }
  const issuedDate = new Date(content.issuedAt).toLocaleDateString("en-US", { timeZone: content.identity.timezone, month: "short", day: "numeric", year: "numeric" });
  const issuedTime = new Date(content.issuedAt).toLocaleTimeString("en-US", { timeZone: content.identity.timezone, hour: "numeric", minute: "2-digit" });
  const mileage = serviceDocumentMileage(content);
  const vehicleDetails = [
    ["VIN", content.identity.vin],
    ["Mileage", mileage ? `${new Intl.NumberFormat("en-US").format(mileage.reading)} ${mileage.unit === "KILOMETERS" ? "km" : "mi"}` : "Not recorded"],
    ...(content.identity.licensePlate ? [["Plate", [content.identity.licensePlate, content.identity.licensePlateState].filter(Boolean).join(" · ")]] : []),
    ...(content.identity.color ? [["Color", content.identity.color]] : []),
    ...(content.identity.stockNumber ? [["Stock #", content.identity.stockNumber]] : []),
    ...(!content.identity.stockNumber ? [["Vehicle ID", content.identity.vehicleNumber]] : []),
  ];
  const workLines = content.lines.filter(line => line.type !== "FEE");
  const feeLines = content.lines.filter(line => line.type === "FEE");
  const customerContact = content.identity.customerContact;
  const title = /^(Official repair estimate|Repair Estimate)/i.test(content.title) ? "Repair Estimate" : content.title;
  const receipt = content.receipt ?? legacyReceiptDetails(content);
  const notes = customerDocumentNotes(estimateCorrectionNotes(content).filter(note => !receipt || !note.startsWith("Original invoice ")), content.identity.timezone);
  const expiration = title === "Repair Estimate" ? notes.find(isEstimateExpirationNote) : undefined;
  return <article ref={printRef} className={styles.document}>
    {showControls && <div data-print-controls className={styles.printControls}><button className={styles.print} onClick={() => void print()}>Print</button>{repairOrderId && documentId && <a href={serviceDocumentPdfHref(repairOrderId, documentId)} download>Save PDF</a>}{printError && <p role="alert">{printError}</p>}</div>}
    {repairOrderId && <nav className={styles.actions} aria-label="Continue repair order"><Link href={reviewWorkflow ? repairReviewHref(repairOrderId) : `/vehicles/shop-planning?repairOrderId=${encodeURIComponent(repairOrderId)}`}>Continue recon / shop workflow · review / authorize</Link><Link href={`/service-documents?repairOrderId=${encodeURIComponent(repairOrderId)}`}>View Documents & Approvals</Link><Link href={`/vehicles/service-billing?repairOrderId=${encodeURIComponent(repairOrderId)}`}>Create / Print Final Invoice</Link><p>Printing an estimate does not authorize work. Final invoicing requires the approved revision, completed work and quality checks.</p></nav>}
    <header data-document-heading className={styles.header}>
      <div data-document-title><h1>{title}</h1>{expiration && <small>{expiration}</small>}</div>
      <div className={styles.metadata}>
        <strong>{content.number}</strong>
        <span>Issued {issuedDate} · {issuedTime}</span>
        {content.estimateDetails?.estimateDate && <span>Original estimate date: {formatEstimateDate(content.estimateDetails.estimateDate)}</span>}
        {content.estimateDetails?.serviceDate && <span>Service date: {formatEstimateDate(content.estimateDetails.serviceDate)}</span>}
        <span>Repair order: {content.identity.repairOrderNumber}</span>
      </div>
    </header>
    <section data-document-parties className={styles.parties} aria-label="Dealership and customer">
      <div data-document-brand className={styles.brand}>
        <TimeMotorSalesLogo className={styles.logo} priority variant="horizontal" />
        <p className={styles.department}>SERVICE DEPARTMENT</p>
        <p className={styles.location}>{content.identity.store}<br />{content.identity.address}</p>
        <div className={styles.contact}><a href="mailto:timemotorsale@gmail.com">timemotorsale@gmail.com</a><a href="https://timemotors.net">timemotors.net</a></div>
      </div>
      <div data-document-customer className={styles.customer}>
        <h2>CUSTOMER</h2>
        <p className={styles.customerName}>{content.identity.customer}</p>
        {customerContact && <div className={styles.customerContact}>{[customerContact.phone, customerContact.email, customerContact.address].filter(Boolean).map((value, index) => <p key={index}>{value}</p>)}</div>}
      </div>
    </section>
    <section data-print-vehicle className={styles.vehicleDetails} aria-label="Vehicle details">
      <div><h2>VEHICLE</h2><strong>{content.identity.vehicle}</strong></div>
      {vehicleDetails.map(([label, value]) => <div key={label}><span>{label}</span><p>{value}</p></div>)}
    </section>
    <section data-document-concern className={styles.concern} aria-label="Concerns / Service Requested"><h2>CONCERNS / SERVICE REQUESTED</h2><p>{content.identity.concern}</p></section>
    {receipt ? <section className={styles.receipt} aria-label="Payment details"><h2>{receipt.kind === "PAYMENT" ? "Payment received" : receipt.kind === "REFUND" ? "Refund recorded" : "Invoice adjustment"}</h2><dl><dt>Invoice</dt><dd>{receipt.invoiceNumber}</dd><dt>{receipt.kind === "PAYMENT" ? "Amount paid" : "Amount"}</dt><dd><strong>{money(receipt.amountCents)}</strong></dd><dt>Payment method</dt><dd>{receipt.method ? receipt.method.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, char => char.toUpperCase()) : "Adjustment"}</dd><dt>Reference</dt><dd>{receipt.reference}</dd><dt>Remaining balance</dt><dd><strong>{money(receipt.balanceCents)}</strong></dd></dl></section> : <div className={styles.tableWrap}><table><caption className={styles.tableCaption}>Itemized work and parts</caption><thead><tr><th scope="col">Work / item</th><th scope="col">Qty</th><th scope="col">Rate / price</th><th scope="col">Amount</th></tr></thead><tbody>{workLines.map(line => <tr key={line.key}><td>{line.description.replace(/\s*\(\s*\)$/, "")}{line.hours != null && <small className={styles.laborDetail}>{line.hours.toFixed(2)} labor hours{line.planningHourlyRateCents == null ? "" : ` × ${money(line.planningHourlyRateCents)}/hr`}</small>}</td><td>{line.quantity}</td><td>{money(line.unitPriceCents)}</td><td>{money(line.totalCents)}</td></tr>)}</tbody></table></div>}
    {!receipt && feeLines.length > 0 && <section className={styles.charges} aria-label="Other charges"><h2>Other charges</h2>{feeLines.map(line => <div key={line.key}><span>{line.description}</span><strong>{money(line.totalCents)}</strong></div>)}</section>}
    {content.totals && <div data-estimate-summary={title === "Repair Estimate" && !content.decision ? "" : undefined} className={title === "Repair Estimate" && !content.decision ? styles.estimateSummary : undefined}>
      <dl className={styles.totals}><dt>Subtotal</dt><dd>{money(content.totals.subtotalCents)}</dd><dt>Discount</dt><dd>{money(content.totals.discountCents)}</dd><dt>Tax</dt><dd>{money(content.totals.taxCents)}</dd><dt>Total</dt><dd>{money(content.totals.totalCents)}</dd></dl>
      {title === "Repair Estimate" && !content.decision && <section data-document-signature className={styles.signature} aria-label="Customer signature"><span>Customer / authorized representative signature</span><span>Date</span></section>}
    </div>}
    {content.decision && <section><h2>{content.decision.disposition}</h2><p>Recorded decision by {content.decision.actor} via {content.decision.channel}. Reference: {content.decision.reference ?? "Not supplied"}.</p><p>Approved: {content.decision.approvedLineKeys.join(", ") || "None"}</p><p>Declined: {content.decision.declinedLineKeys.join(", ") || "None"}</p><p>Undecided: {content.decision.undecidedLineKeys.join(", ") || "None"}</p></section>}
    {notes.filter(note => note !== expiration).map((note, index) => <p key={`${index}-${note}`}>{note}</p>)}
    <footer><strong>Document reference: {content.number}</strong><span>Thank you for choosing Time Motor Sales.</span></footer>
  </article>;
}
