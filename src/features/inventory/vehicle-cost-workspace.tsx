"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { Plus, Undo2 } from "lucide-react";
import { COST_CATEGORIES } from "@/server/inventory-unit/cost-domain";
import styles from "./vehicle-cost-workspace.module.css";

type Cost = { id: string; category: string; status: string; amountCents: number; currency: string; source: string; reference: string | null; notes: string | null; observedAt: string };
export type VehicleCostModel = { id: string; vehicleId: string; inventoryNumber: string; version: number; closedAt: string | null; costEntries: Cost[]; summary: { incurredCents: number; estimatedCents: number; unclassified: number }; vehicle: { vehicleNumber: string; year: number | null; make: string | null; model: string | null } };
const money = (cents: number, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
const label = (value: string) => value.toLowerCase().replaceAll("_", " ");
export function VehicleCostWorkspace({ unit, vehicleId, embedded = false }: { unit: VehicleCostModel | null; vehicleId: string; embedded?: boolean }) {
  const router = useRouter();
  const [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [voidId, setVoidId] = useState("");
  const [form, setForm] = useState({ category: "ACQUISITION", status: "ESTIMATED", amount: "", reference: "", notes: "", reason: "", date: new Date().toISOString().slice(0, 10) });
  const pending = useRef<{ signature: string; body: Record<string, unknown> } | null>(null);
  const update = (key: keyof typeof form, value: string) => { pending.current = null; setForm(previous => ({ ...previous, [key]: value })); };
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!unit || busy) return;
    const parts = form.amount.split(".");
    if (!voidId && !/^\d+(\.\d{1,2})?$/.test(form.amount)) { setNotice("Enter a positive dollar amount with at most two decimal places."); return; }
    const values = voidId ? { action: "VOID_COST", costId: voidId, reason: form.reason } : { action: "RECORD_COST", amountCents: Number(parts[0]) * 100 + Number((parts[1] ?? "").padEnd(2, "0")), category: form.category, status: form.status, currency: "USD", reference: form.reference, notes: form.notes, reason: form.reason, observedAt: new Date(form.date + "T00:00:00Z").toISOString() };
    const signature = JSON.stringify(values);
    if (pending.current?.signature !== signature) pending.current = { signature, body: { ...values, expectedVersion: unit.version, idempotencyKey: crypto.randomUUID() } };
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/inventory-units/${unit.id}/costs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(pending.current.body) });
      const result = await response.json();
      if (!response.ok) { if (response.status === 409) { pending.current = null; router.refresh(); } throw new Error(result.error ?? "Cost could not be saved."); }
      pending.current = null;
      setNotice(voidId ? "Cost voided; its history is retained." : "Cost record saved.");
      setVoidId(""); setForm(previous => ({ ...previous, amount: "", reference: "", notes: "", reason: "" }));
      router.refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Request failed. Retry to check the same submission."); }
    finally { setBusy(false); }
  }
  return <section className={styles.workspace}>
    {!embedded ? <header><h1>Costs &amp; Investment</h1><p>{unit ? [unit.inventoryNumber, unit.vehicle.year, unit.vehicle.make, unit.vehicle.model].filter(Boolean).join(" · ") : "No open inventory cycle"}</p>
      <nav><Link href={`/vehicles/${encodeURIComponent(vehicleId)}/journey`}>Inventory Journey</Link><Link href={`/vehicles/${encodeURIComponent(vehicleId)}/pricing`}>Pricing &amp; Margin</Link><Link href={`/vehicles/360/${encodeURIComponent(vehicleId)}`}>Vehicle 360</Link><Link href={`/vehicles/${encodeURIComponent(vehicleId)}/inventory-planning`}>Receiving &amp; recon</Link><Link href={`/vehicles/acquisition-appraisal?vehicleId=${encodeURIComponent(vehicleId)}`}>Acquisition review</Link></nav>
    </header> : null}
    {!unit ? <section><h2>Inventory acquisition required</h2><p>This vehicle has no open inventory cycle. Recording costs here does not establish dealership ownership.</p><Link href="/vehicles/acquisition-appraisal">Open acquisition</Link></section> : <>
      <dl className={styles.totals}><div><dt>Recorded incurred costs</dt><dd>{money(unit.summary.incurredCents)}</dd></div><div><dt>Separate estimates</dt><dd>{money(unit.summary.estimatedCents)}</dd></div><div><dt>Official cost basis / margin</dt><dd>Pending policy</dd></div></dl>
      <p className={styles.note}>Staff-reported costs · USD · No accounting posting or purchase authorization. Estimates are not added to incurred costs. Recorded-cost pricing proposals do not publish a price or authorize final release.</p>
      {unit.summary.unclassified > 0 ? <p role="status">{unit.summary.unclassified} records have other currencies/statuses and are excluded from these totals.</p> : null}
      <section><h2>Cost records</h2><div className={styles.table}><table><thead><tr><th>Date</th><th>Category / reference</th><th>Amount</th><th>Status</th><th>Notes / source</th><th>Correction</th></tr></thead><tbody>
        {unit.costEntries.map(entry => <tr key={entry.id}><td>{new Date(entry.observedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</td><td>{label(entry.category)}<small>{entry.reference ?? "No reference"}</small></td><td>{money(entry.amountCents, entry.currency)}</td><td>{label(entry.status)}</td><td>{entry.notes}<small>{label(entry.source)}</small></td><td>{entry.source === "MANUAL_STAFF_REPORT" && ["ESTIMATED", "INCURRED"].includes(entry.status) ? <button aria-label={`Void ${entry.reference}`} title="Void cost record" disabled={busy} type="button" onClick={() => { pending.current = null; setVoidId(entry.id); update("reason", ""); }}><Undo2 size={16}/></button> : null}</td></tr>)}
        {!unit.costEntries.length ? <tr><td colSpan={6}>No cost records yet.</td></tr> : null}
      </tbody></table></div></section>
      <form onSubmit={save}><h2>{voidId ? "Void cost record" : "Add cost"}</h2><fieldset disabled={busy} className={styles.fields}>
        {!voidId ? <>
          <label>Category<select aria-label="Cost category" value={form.category} onChange={event => update("category", event.target.value)}>{COST_CATEGORIES.map(category => <option key={category} value={category}>{category === "ACQUISITION" ? "Purchase / acquisition" : label(category)}</option>)}</select></label>
          <label>Status<select aria-label="Cost status" value={form.status} onChange={event => update("status", event.target.value)}><option value="ESTIMATED">Estimate</option><option value="INCURRED">Incurred (staff reported)</option></select></label>
          <label>Amount (USD)<input required inputMode="decimal" value={form.amount} onChange={event => update("amount", event.target.value)} /></label>
          <label>Record date<input required type="date" max={new Date().toISOString().slice(0, 10)} value={form.date} onChange={event => update("date", event.target.value)} /></label>
          <label>Invoice / unique reference<input required maxLength={160} value={form.reference} onChange={event => update("reference", event.target.value)} /></label>
          <label>Description / source detail<input required maxLength={1000} value={form.notes} onChange={event => update("notes", event.target.value)} /></label>
        </> : <p>Voiding excludes this record from totals. The original record and correction audit remain available.</p>}
        <label className={styles.wide}>Record / correction reason<textarea required minLength={10} maxLength={1000} value={form.reason} onChange={event => update("reason", event.target.value)} /></label>
        <div className={styles.actions}><button type="submit"><Plus size={16}/>{busy ? "Saving..." : voidId ? "Confirm void" : "Save cost"}</button>{voidId ? <button type="button" onClick={() => { pending.current = null; setVoidId(""); }}>Cancel</button> : null}</div>
      </fieldset></form>
    </>}
    {notice ? <p role="status">{notice}</p> : null}
  </section>;
}
