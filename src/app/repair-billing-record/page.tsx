import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { BillingRecordNotFoundError, getRepairBillingRecord, type BillingRecordParams } from "@/server/repair-order/billing-record";
import styles from "./record.module.css";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown) { return typeof value === "string" && value ? value : "Not recorded"; }
function StoredIdentity({ value }: { value: unknown }) {
  const identity = object(value);
  return <section><h2>Stored identity</h2><dl>{[["Customer", "customer"], ["Vehicle", "vehicle"], ["VIN", "vin"], ["Store", "store"], ["Store address", "address"], ["Concern", "concern"]].map(([label, key]) => <div className={styles.field} key={key}><dt>{label}</dt><dd>{text(identity[key])}</dd></div>)}</dl></section>;
}
function StoredLines({ value, currency }: { value: unknown; currency?: string }) {
  const lines = Array.isArray(value) ? value : [];
  return <section><h2>Stored line items</h2>{!lines.length && <p>No stored line items.</p>}{lines.map((value, index) => {
    const line = object(value);
    return <article key={index}><h3>{text(line.description)}</h3><dl>
      <dt>Type</dt><dd>{text(line.type)}</dd><dt>Quantity</dt><dd>{typeof line.quantity === "number" ? line.quantity : "Not recorded"}</dd>
      <dt>Unit price</dt><dd><Money cents={line.unitPriceCents} currency={currency} /></dd><dt>Line total</dt><dd><Money cents={line.totalCents} currency={currency} /></dd>
      {typeof line.partNumber === "string" && <><dt>Part number</dt><dd>{line.partNumber}</dd></>}
    </dl></article>;
  })}</section>;
}
function StoredTotals({ value, currency }: { value: unknown; currency?: string }) {
  const totals = object(value);
  return <dl>{[["Subtotal", "subtotalCents"], ["Discount", "discountCents"], ["Tax", "taxCents"], ["Total", "totalCents"]].map(([label, key]) => <div className={styles.field} key={key}><dt>{label}</dt><dd><Money cents={totals[key]} currency={currency} /></dd></div>)}</dl>;
}
function Money({ cents, currency }: { cents: unknown; currency?: string }) {
  if (typeof cents !== "number" || !Number.isSafeInteger(cents)) return <>Not recorded</>;
  return <>{(cents / 100).toFixed(2)} {currency ?? "(currency not recorded)"}</>;
}
export default async function RepairBillingRecordPage({ searchParams }: { searchParams: Promise<BillingRecordParams> }) {
  const user = await requireCurrentUser();
  const result = await getRepairBillingRecord(user, await searchParams).catch((error: unknown) => {
    if (error instanceof BillingRecordNotFoundError || (error instanceof Error && /^Vehicle capability required: (REPAIR_ORDER_VIEW|SERVICE_BILLING_VIEW) \([A-Z_]+\)\.$/.test(error.message))) notFound();
    throw error;
  });
  const href = (key: string, id: string) => `/repair-billing-record?repairOrderId=${encodeURIComponent(result.order.id)}&${key}=${encodeURIComponent(id)}`;
  return <main className={styles.record}>
    <header><h1>{result.kind === "package" ? "Invoice preparation record" : result.kind === "invoice" ? "Issued service invoice record" : "Billing entry record"}</h1>
      <p>{result.order.repairOrderNumber} · Read-only historical billing record</p>
      <p>This view displays stored records. It does not recreate an issued document or PDF.</p></header>
    {result.kind === "package" ? <>
      <p>Invoice preparation / external reference. An accepted handoff does not establish that a native invoice was issued.</p>
      <dl><dt>Package ID</dt><dd>{result.record.id}</dd><dt>Version</dt><dd>{result.record.version}</dd><dt>Handoff status</dt><dd>{result.record.status}</dd>
        <dt>Generated</dt><dd>{result.record.generatedAt.toISOString()}</dd><dt>Authorized total</dt><dd><Money cents={result.record.authorizedTotalCents} /></dd>
        <dt>External system</dt><dd>{result.record.externalSystemCode ?? "Not recorded"}</dd><dt>External reference</dt><dd>{result.record.externalReference ?? "Not recorded"}</dd></dl>
      <p>Reason: {result.record.reason}</p>
      <StoredIdentity value={object(result.record.sourceSnapshot).identity} />
      <StoredLines value={result.record.lineItems} />
      <StoredTotals value={object(result.record.sourceSnapshot).commercial} />
      <section aria-label="Reconciliation history"><h2>Reconciliation history</h2>
        {!result.reconciliations.length && <p>No reconciliation records.</p>}
        {result.reconciliations.map(item => <article key={item.id}><h3>{item.externalSystemCode} · {item.externalReference}</h3>
          <p>{item.status} · {item.reconciledAt.toISOString()}</p><dl>
            <dt>Returned subtotal</dt><dd><Money cents={item.returnedSubtotalCents} /></dd><dt>Returned tax</dt><dd><Money cents={item.returnedTaxCents} /></dd>
            <dt>Returned total</dt><dd><Money cents={item.returnedTotalCents} /></dd><dt>Expected total</dt><dd><Money cents={item.expectedTotalCents} /></dd>
            <dt>Discrepancy</dt><dd><Money cents={item.discrepancyCents} /></dd></dl>
          <p>Reason: {item.reason}</p></article>)}
      </section>
    </> : result.kind === "invoice" ? <>
      <dl><dt>Invoice</dt><dd>{result.record.invoiceNumber}</dd><dt>Record ID</dt><dd>{result.record.id}</dd><dt>Status</dt><dd>{result.record.status}</dd>
        <dt>Issued</dt><dd>{result.record.issuedAt.toISOString()}</dd><dt>Recorded total</dt><dd><Money cents={result.record.totalCents} currency={result.record.currency} /></dd></dl>
      <p>Reason: {result.record.reason}</p>
      <StoredIdentity value={object(result.record.ledger).identity} />
      <StoredLines value={object(result.record.ledger).lines} currency={result.record.currency} />
      <StoredTotals value={result.record} currency={result.record.currency} />
      <section aria-label="Billing entries"><h2>Billing entries</h2>{!result.entries.length && <p>No billing entries.</p>}
        <ul>{result.entries.map(entry => <li key={entry.id}><Link href={href("entryId", entry.id)}>{entry.kind} · {entry.reference}</Link> · <Money cents={entry.amountCents} currency={result.record.currency} /> · {entry.occurredAt.toISOString()}</li>)}</ul></section>
    </> : <>
      <p>Stored payment or adjustment evidence; this view is not an issued receipt.</p>
      <dl><dt>Entry ID</dt><dd>{result.record.id}</dd><dt>Kind</dt><dd>{result.record.kind}</dd><dt>Reference</dt><dd>{result.record.reference}</dd>
        <dt>Occurred</dt><dd>{result.record.occurredAt.toISOString()}</dd><dt>Amount</dt><dd><Money cents={result.record.amountCents} currency={result.invoice.currency} /></dd>
        <dt>Method</dt><dd>{result.record.method ?? "Not recorded"}</dd></dl>
      <Link href={href("invoiceId", result.invoice.id)}>Invoice {result.invoice.invoiceNumber}</Link>
      <p>Reason: {result.record.reason}</p>
      {result.record.relatedEntryId && <p><Link href={href("entryId", result.record.relatedEntryId)}>Original payment entry</Link></p>}
      {result.record.kind === "CREDIT" && <section><h2>Recorded credit allocation</h2><StoredTotals value={{ ...object(object(result.record.evidence).components), totalCents: result.record.amountCents }} currency={result.invoice.currency} /></section>}
      <section><h2>Evidence references</h2>{Array.isArray(object(result.record.evidence).references) ? <ul>{(object(result.record.evidence).references as unknown[]).filter((reference): reference is string => typeof reference === "string").map((reference, index) => <li key={index}>{reference}</li>)}</ul> : <p>Not recorded</p>}</section>
    </>}
    <footer><Link href="/vehicles/repair-workbench">Repair workbench</Link></footer>
  </main>;
}
