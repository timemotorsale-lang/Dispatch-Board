"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";
import styles from "./vehicle-cost-workspace.module.css";

type Proposal = { id: string; inventoryVersion: number; priceCents: number; packEnabled: boolean; packCents: number; includeEstimates: boolean; marginMode: string; threshold: number | null; reason: string; createdAt: string };
export type PricingModel = { id: string; vehicleId: string; inventoryNumber: string; version: number; latest: Proposal | null; intakePriceCents?: number | null; history: Proposal[]; hasMoreHistory: boolean; costsKnown: boolean; costs: { incurredCents: number; estimatedCents: number; unclassified: number }; stale: boolean };
type IntakePrice = { cents: number; draft: boolean };
type PriceReceipt = { id: string; version: number; priceCents: number };
type PriceForm = { price: string; packEnabled: boolean; pack: string; includeEstimates: boolean; marginMode: string; threshold: string; reason: string };
type SavedPrice = PriceReceipt & { form: PriceForm };

export function recordedSellingPrice(proposal?: { priceCents: number } | null, intake?: IntakePrice, confirmedIntakeCents?: number | null) {
  if (proposal) return { label: "Latest proposed selling price", cents: proposal.priceCents };
  if (intake) return { label: intake.draft ? "Selling price · Intake draft" : "Selling price · Confirmed intake", cents: intake.cents };
  if (confirmedIntakeCents != null) return { label: "Selling price · Confirmed intake", cents: confirmedIntakeCents };
  return { label: "Selling price", cents: undefined };
}
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const decimal = (value: number) => (value / 100).toFixed(2);
function hundredths(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const number = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(number) ? number : null;
}
export function VehiclePricingWorkspace({ unit, vehicleId, embedded = false, intakePrice, onDirtyChange }: { unit: PricingModel | null; vehicleId: string; embedded?: boolean; intakePrice?: IntakePrice; onDirtyChange?: (dirty: boolean) => void }) {
  const router = useRouter(), pending = useRef<{ signature: string; body: Record<string, unknown> } | null>(null);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [saved, setSaved] = useState<SavedPrice | null>(null);
  const recentSave = saved && unit && saved.id === unit.id && saved.version > (unit.latest?.inventoryVersion ?? 0) ? saved : null;
  const proposal = recentSave ?? unit?.latest;
  const recorded = recordedSellingPrice(proposal, intakePrice, unit?.intakePriceCents);
  const intakeRecorded = recordedSellingPrice(null, intakePrice, unit?.intakePriceCents);
  const defaults = recentSave?.form ?? { price: recorded.cents == null ? "" : decimal(recorded.cents), packEnabled: unit?.latest?.packEnabled ?? false, pack: unit?.latest?.packEnabled ? decimal(unit.latest.packCents) : "", includeEstimates: unit?.latest?.includeEstimates ?? false, marginMode: unit?.latest?.marginMode ?? "OFF", threshold: unit?.latest?.threshold != null ? decimal(unit.latest.threshold) : "", reason: "" };
  const [edits, setEdits] = useState<Partial<PriceForm>>({});
  const form = { ...defaults, ...edits };
  const dirty = (Object.keys(edits) as Array<keyof PriceForm>).some(key => form[key] !== defaults[key]);
  useEffect(() => { onDirtyChange?.(dirty || busy); }, [dirty, busy, onDirtyChange]);
  const update = (key: keyof PriceForm, value: string | boolean) => {
    pending.current = null;
    setEdits(previous => {
      const next = { ...previous, [key]: value };
      if (value === defaults[key]) delete next[key];
      if (key === "marginMode") {
        if (value === defaults.marginMode || !defaults.threshold) delete next.threshold;
        else next.threshold = "";
      }
      return next;
    });
  };
  const price = hundredths(form.price), pack = form.packEnabled ? hundredths(form.pack) : 0, threshold = form.marginMode === "OFF" ? null : hundredths(form.threshold);
  const basis = unit && pack !== null ? unit.costs.incurredCents + (form.includeEstimates ? unit.costs.estimatedCents : 0) + pack : null;
  const margin = unit?.costsKnown && basis !== null && basis >= 0 && price !== null && price > 0 ? price - basis : null;
  const meets = form.marginMode === "OFF" ? null : margin !== null && threshold !== null && price !== null && (form.marginMode === "AMOUNT" ? margin >= threshold : margin * 10000 >= price * threshold);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!unit || busy) return;
    if (price === null || pack === null || (form.marginMode !== "OFF" && threshold === null)) { setNotice("Enter amounts with at most two decimal places."); return; }
    const values = { priceCents: price, packEnabled: form.packEnabled, packCents: pack, includeEstimates: form.includeEstimates, marginMode: form.marginMode, threshold, reason: form.reason };
    const signature = JSON.stringify(values);
    if (pending.current?.signature !== signature) pending.current = { signature, body: { ...values, expectedVersion: Math.max(unit.version, recentSave?.version ?? 0), idempotencyKey: crypto.randomUUID() } };
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/inventory-units/${unit.id}/pricing`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(pending.current.body) });
      const result = await response.json();
      if (!response.ok) { if (response.status === 409) { pending.current = null; router.refresh(); } throw new Error(result.error ?? "Price proposal could not be saved."); }
      const committed = result.result as PriceReceipt | undefined;
      if (committed?.id === unit.id && Number.isSafeInteger(committed.priceCents) && Number.isSafeInteger(committed.version)) {
        setSaved({ ...committed, form: { ...form, price: decimal(committed.priceCents), reason: "" } });
      }
      pending.current = null; setNotice("Price proposal saved with its cost comparison and revision history."); setEdits({}); router.refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Request failed. Retry the same proposal."); }
    finally { setBusy(false); }
  }
  return <section className={`${styles.workspace} ${embedded ? styles.embedded : ""}`}>
    {!embedded ? <header><h1>Pricing &amp; Margin</h1><p>{unit?.inventoryNumber ?? "No open inventory cycle"}</p><nav><Link href={`/vehicles/${encodeURIComponent(vehicleId)}/journey`}>Inventory Journey</Link><Link href={`/vehicles/${encodeURIComponent(vehicleId)}/costs`}>Costs &amp; Investment</Link><Link href={`/vehicles/360/${encodeURIComponent(vehicleId)}`}>Vehicle 360</Link></nav></header> : null}
    <dl className={styles.totals}>
      <div><dt>{recorded.label}</dt><dd>{recorded.cents == null ? "Not set" : money(recorded.cents)}</dd></div>
      {proposal && intakeRecorded.cents != null &&
        <div><dt>{intakeRecorded.label}</dt><dd>{money(intakeRecorded.cents)}</dd></div>}
      {unit && <><div><dt>Recorded incurred costs</dt><dd>{money(unit.costs.incurredCents)}</dd></div><div><dt>Separate estimates</dt><dd>{money(unit.costs.estimatedCents)}</dd></div></>}
    </dl>
    {!unit ? <p>An open inventory cycle is required before proposing a price.</p> : <>
      <p className={styles.note}>USD · Proposals do not publish a price or authorize final release. Recorded-cost comparisons are not accounting net profit. Pack is optional and separate from incurred expenses.</p>
      {unit.stale && (!recentSave || unit.version > recentSave.version) ? <p role="status">Inventory changed since the last proposal. The comparison below uses current costs; save a new revision before review.</p> : null}
      {!unit.costsKnown ? <p role="status">A recorded acquisition cost and a supported cost basis are required for margin enforcement.</p> : null}
      <form onSubmit={save}><h2>Price proposal</h2><fieldset disabled={busy} className={styles.fields}>
        <label>Proposed selling price (USD)<input required inputMode="decimal" value={form.price} onChange={event => update("price", event.target.value)}/></label>
        <label><span>Optional pack</span><input type="checkbox" checked={form.packEnabled} onChange={event => update("packEnabled", event.target.checked)}/></label>
        {form.packEnabled ? <label>Pack amount (USD)<input required inputMode="decimal" value={form.pack} onChange={event => update("pack", event.target.value)}/></label> : null}
        <label><span>Include estimates in this comparison</span><input type="checkbox" checked={form.includeEstimates} onChange={event => update("includeEstimates", event.target.checked)}/></label>
        <label>Margin enforcement<select aria-label="Margin enforcement" value={form.marginMode} onChange={event => update("marginMode", event.target.value)}><option value="OFF">Off</option><option value="AMOUNT">Minimum dollar amount</option><option value="PERCENT">Minimum percentage of selling price</option></select></label>
        {form.marginMode !== "OFF" ? <label>{form.marginMode === "AMOUNT" ? "Minimum margin (USD)" : "Minimum margin (% of selling price)"}<input required inputMode="decimal" value={form.threshold} onChange={event => update("threshold", event.target.value)}/></label> : null}
        <dl className={styles.wide}><dt>Comparison basis including selected pack/estimates</dt><dd>{unit.costsKnown && basis !== null ? money(basis) : "Unknown"}</dd><dt>Recorded-cost margin</dt><dd>{margin === null ? "Unknown" : `${money(margin)} · ${(margin * 100 / Number(price)).toFixed(2)}% of selling price`}</dd><dt>Selected enforcement</dt><dd>{meets === null ? "Off" : meets ? "Meets threshold" : "Below threshold or unknown"}</dd></dl>
        <div className={styles.wide}><label htmlFor="pricing-change-reason">Price / policy change reason</label><textarea id="pricing-change-reason" required maxLength={1000} value={form.reason} onChange={event => update("reason", event.target.value)}/></div>
        <div className={styles.actions}><button type="submit"><Save size={16}/>{busy ? "Saving..." : "Save price proposal"}</button></div>
      </fieldset></form>
      <section><h2>Price revisions</h2>{unit.hasMoreHistory ? <p>Showing the latest 50 revisions.</p> : null}<div className={styles.table}><table><thead><tr><th>Version / date</th><th>Proposed price</th><th>Optional pack</th><th>Enforcement</th><th>Reason</th></tr></thead><tbody>{unit.history.map(item => <tr key={item.id}><td>v{item.inventoryVersion}<small>{new Date(item.createdAt).toLocaleString()}</small></td><td>{money(item.priceCents)}</td><td>{item.packEnabled ? money(item.packCents) : "Off"}</td><td>{item.marginMode === "OFF" ? "Off" : item.marginMode === "AMOUNT" ? money(Number(item.threshold)) : `${decimal(Number(item.threshold))}% of selling price`}</td><td>{item.reason}</td></tr>)}{!unit.history.length ? <tr><td colSpan={5}>No price proposals yet.</td></tr> : null}</tbody></table></div></section>
    </>}{notice ? <p role="status">{notice}</p> : null}
  </section>;
}
