import { requireCurrentUser } from "@/server/auth/current-user";
import { getTaxWorksheet, type TaxWorksheet } from "@/server/compliance/service";
import { MoneyError, moneyLabel } from "@/lib/money-resources";
import { ExpensePrintButton } from "@/features/money-resources/print-button";
import styles from "@/features/money-resources/workbench.module.css";

export const dynamic = "force-dynamic";
export default async function TaxPrint({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requireCurrentUser(), query = await searchParams;
  let model: TaxWorksheet | null = null, failure = "";
  try { model = await getTaxWorksheet(actor, query.month); }
  catch (error) { failure = error instanceof MoneyError ? error.message : "Return to Compliance and try again."; }
  if (!model) return <main className={styles.printPage}><h1>Worksheet unavailable</h1><p>{failure}</p><a href="/compliance">Return to Compliance</a></main>;
    return <main className={styles.printPage}><div className={styles.noPrint}><a href="/compliance">Return to Compliance</a><ExpensePrintButton /></div><h1>Upfront lease-tax worksheet · {model.month}</h1><p>{model.period?.status || "DRAFT"} · Prepared for {actor.name} · Lease-only preparation, not a complete or submitted return.</p><p>{model.summary.leaseCount} leases · {model.summary.saleCount} vehicle sales excluded · {model.summary.needsReview} leases need review</p>{model.summary.lines.map(line => <p key={`${line.code}:${line.rate}`}>{line.code} · {line.rate}% · taxable base {moneyLabel(line.baseCents)} · tax {moneyLabel(line.taxCents)}</p>)}<h2>Total lease tax {moneyLabel(model.summary.totalCents)}</h2>
      <section aria-label="Monthly totals"><h2>Month-end totals · active records only</h2><p>Vehicles sold: {model.summary.saleCount} · Vehicles leased: {model.summary.leaseCount} · Total contracts: {model.summary.contractCount}</p><p>Combined recorded taxable amounts: {moneyLabel(model.summary.recordedTaxableCents)} · reference only; separate filing totals below</p><p>Total taxable lease amount: {moneyLabel(model.summary.taxableLeaseCents)}</p><p>Upfront lease tax (state + local): {moneyLabel(model.summary.totalCents)}</p><p>Recorded vehicle-sale taxable amount: {moneyLabel(model.summary.recordedSaleBaseCents)} · separate DVS register</p><p>Taxable lease amounts are counted once per contract, not once per tax line. Voided records are excluded from totals. Only contracts recorded in this tool are included.</p></section>
      {model.records.map((row, index) => <article key={row.id}><h2>#{index + 1} · {row.reference} · {row.kind === "LEASE" ? "Lease" : "Vehicle sale"} · {row.status === "ACTIVE" ? "Recorded" : "Voided"}</h2><p>{row.snapshot.input.date} · {row.snapshot.input.customer} · {row.snapshot.input.vehicle}</p><p>Taxable amount {moneyLabel(row.snapshot.baseCents)} · Tax {moneyLabel(row.snapshot.taxCents)} · Contract tax {row.snapshot.input.contractTax || "Pending"}</p>{row.snapshot.lines.map(line => <p key={line.code}>{line.code} · {line.rate}% · {moneyLabel(line.taxCents)}</p>)}{row.snapshot.flags.map(flag => <p key={flag}>{flag}</p>)}</article>)}
      <p>Filing: {model.period?.filedAt || "Not confirmed"} · {model.period?.filingReference || ""}</p><p>Payment: {model.period?.paidAt || "Not confirmed"} · {model.period?.paymentReference || ""}</p><p>Assumption: eligible Minnesota upfront-tax leases only. Later customer payments do not repeat the original tax. Other return lines and amendments require separate reconciliation.</p></main>;
}
