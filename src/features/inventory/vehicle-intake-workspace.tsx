"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Save, Plus, X, Car, Banknote, MapPin, Info } from "lucide-react";
import { INTAKE_SOURCES, intakePending, type IntakeDetails } from "@/server/inventory-unit/intake-domain";
import type { VehicleIntakeModel } from "@/server/inventory-unit/intake-service";
import { VehicleCostWorkspace, type VehicleCostModel } from "./vehicle-cost-workspace";
import styles from "./vehicle-intake-workspace.module.css";

const dollars = (value: number | null) => value === null ? "" : (value / 100).toFixed(2);
export function VehicleIntakeWorkspace({ model, costs = null, embedded = false }: { model: VehicleIntakeModel; costs?: VehicleCostModel | null; embedded?: boolean }) {
  const router = useRouter(), [details, setDetails] = useState(model.details);
  const [purchase, setPurchase] = useState(dollars(model.details.purchaseCents)), [price, setPrice] = useState(dollars(model.details.proposedPriceCents));
  const [reason, setReason] = useState(model.status === "NOT_STARTED" ? "Record initial acquisition intake" : ""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const reasonInput = useRef<HTMLInputElement>(null);
  const pending = useRef<{ signature: string; body: Record<string, unknown> } | null>(null);
  const costDialog = useRef<HTMLDialogElement>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const id = encodeURIComponent(model.vehicle.id), here = `/vehicles/${id}/intake`;
  const recon = `/vehicles/${id}/inventory-planning?${new URLSearchParams({ returnTo: here })}`;
  const cycle = `/vehicles/inventory/units?${new URLSearchParams({ vehicleId: model.vehicle.id, returnTo: here })}`;
  const nextLabel = !model.canManageInventory ? "Save draft" : model.unit ? "Confirm intake & choose path" : "Save & open inventory cycle";
  const nextAction = () => !model.canManageInventory ? save("DRAFT") : save(model.unit ? "CONFIRMED" : "DRAFT", model.unit ? "STAY" : "CYCLE");
  const update = <K extends keyof IntakeDetails>(key: K, value: IntakeDetails[K]) => { pending.current = null; setDirty(true); setDetails(previous => ({ ...previous, [key]: value })); };
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
  const purchaseValue = /^\d+(\.\d{1,2})?$/.test(purchase) ? Math.round(Number(purchase) * 100) : null;
  const priceValue = /^\d+(\.\d{1,2})?$/.test(price) ? Math.round(Number(price) * 100) : null;
  const unsavedPurchase = model.purchaseRecords.length === 0 ? purchaseValue : null;
  const incurred = (costs?.summary.incurredCents ?? 0) + (details.priceStatus === "INCURRED" ? unsavedPurchase ?? 0 : 0);
  const estimates = (costs?.summary.estimatedCents ?? 0) + (details.priceStatus === "ESTIMATED" ? unsavedPurchase ?? 0 : 0);
  const known = (model.purchaseRecords.some(row => row.currency === "USD" && row.status === "INCURRED") || (details.priceStatus === "INCURRED" && purchaseValue !== null)) && !costs?.summary.unclassified;
  const field = (key: keyof IntakeDetails, label: string, type = "text") => <div><label htmlFor={`intake-${key}`}>{label}</label><input id={`intake-${key}`} type={type} value={details[key] ?? ""} maxLength={key === "whereabouts" ? 500 : 200} onChange={event => update(key, type === "number" ? event.target.value === "" ? null : Number(event.target.value) : event.target.value)} {...(type === "number" ? { min: 0, step: 1 } : {})}/></div>;
  const area = (key: "condition" | "documents" | "pendingNotes", label: string, wide = true) => <div className={wide ? styles.wide : undefined}><label htmlFor={`intake-${key}`}>{label}</label><textarea id={`intake-${key}`} maxLength={1000} value={details[key]} onChange={event => update(key, event.target.value)}/></div>;
  async function save(status: "DRAFT" | "CONFIRMED", destination: "STAY" | "JOURNEY" | "CYCLE" = "STAY") {
    if (busy) return;
    if (reason.trim().length < 10) { setNotice("Enter a record / revision reason with at least 10 characters."); reasonInput.current?.focus(); return; }
    const cents = (value: string) => { if (!value) return null; if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error("Enter dollar amounts with at most two decimal places."); const [whole, fraction = ""] = value.split("."); return Number(whole) * 100 + Number(fraction.padEnd(2, "0")); };
    try {
      const values = { details: { ...details, purchaseCents: cents(purchase), proposedPriceCents: cents(price) }, status, reason };
      const signature = JSON.stringify(values);
      if (pending.current?.signature !== signature) pending.current = { signature, body: { ...values, expectedVersion: model.version, expectedUnitVersion: model.unit?.version ?? null, idempotencyKey: crypto.randomUUID() } };
      setBusy(true); setNotice("");
      const response = await fetch(`/api/vehicles/${id}/intake`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(pending.current.body) });
      const result = await response.json();
      if (!response.ok) { if (response.status === 409) { pending.current = null; router.refresh(); } throw new Error(result.error ?? "Intake could not be saved."); }
      pending.current = null; setReason(""); setDirty(false);
      if (status === "CONFIRMED" && model.unit) router.push(`/vehicles/${id}/workflow`);
      else if (destination === "CYCLE") router.push(cycle);
      else if (destination === "JOURNEY") router.push(model.canManageInventory ? `/vehicles/${id}/journey` : `/vehicles/360/${id}`);
      else { setNotice("Intake draft saved."); router.refresh(); }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Request interrupted. Retry the same submission."); }
    finally { setBusy(false); }
  }
  return <section className={`${styles.workspace} ${embedded ? styles.embedded : ""}`}>
    <div className={styles.toolbar}>
      <div>{embedded ? <h2>Purchase &amp; Acquisition Intake</h2> : <h1>Acquisition &amp; Intake</h1>}<span>{[model.vehicle.year, model.vehicle.make, model.vehicle.model].filter(Boolean).join(" ")}{dirty ? " · Unsaved changes" : ""}</span></div>
      <div className={styles.actions}>
        <button type="button" disabled={busy} onClick={() => save("DRAFT")}><Save size={16}/>Save draft</button>
        <button type="button" disabled={busy} onClick={() => save("DRAFT", "JOURNEY")}>Save &amp; close</button>
        <button className={styles.primary} type="button" disabled={busy} onClick={nextAction}><ArrowRight size={16}/>{nextLabel}</button>
      </div>
    </div>
    <header className={styles.context}>
      <nav onClick={event => { if (dirty && !window.confirm("Leave without saving your intake changes?")) event.preventDefault(); }}><span aria-current="step">1. Acquisition &amp; Intake</span><Link href={recon}>2. Recon lifecycle</Link><Link href={`/vehicles/${id}/journey`}>Inventory Journey</Link></nav>
      <p role="status">{model.status === "CONFIRMED" ? "Intake confirmed" : model.status === "DRAFT" ? "Intake draft" : "Intake not started"} · {model.unit?.inventoryNumber ?? "No inventory cycle"}</p>
    </header>
    {model.unit?.operatingState === "BLOCKED" ? <p className={styles.hold} role="alert">Hold retained: {model.unit.stateReason ?? "Review required"}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    <form onSubmit={event => event.preventDefault()}><fieldset disabled={busy} className={styles.columns}>
      <section className={styles.vehicle} aria-labelledby="vehicle-heading"><h2 id="vehicle-heading"><Car size={18}/>Vehicle</h2>
        <dl className={styles.identity}>{[["VIN", model.vehicle.vin ?? "VIN pending"], ["Stock number", model.vehicle.stockNumber ?? model.vehicle.vehicleNumber], ["Year", model.vehicle.year ?? "Pending"], ["Make", model.vehicle.make ?? "Pending"], ["Model", model.vehicle.model ?? "Pending"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className={styles.fields}>{field("odometer", "Odometer", "number")}
        <div><label htmlFor="intake-odometer-unit">Odometer unit</label><select id="intake-odometer-unit" value={details.odometerUnit} onChange={event => update("odometerUnit", event.target.value)}><option value="MILES">Miles</option><option value="KILOMETERS">Kilometers</option></select></div></div>
        <Link href={`/vehicles/360/${id}`} onClick={event => { if (dirty && !window.confirm("Leave without saving your intake changes?")) event.preventDefault(); }}>Vehicle details &amp; photos</Link>
      </section>
      <section aria-labelledby="acquisition-heading"><h2 id="acquisition-heading"><MapPin size={18}/>Acquisition &amp; arrival</h2><h3>Purchase info</h3><div className={styles.fields}>
      <div><label htmlFor="intake-source">Acquisition source</label><select id="intake-source" value={details.source} onChange={event => update("source", event.target.value)}><option value="">Pending</option>{INTAKE_SOURCES.map(source => <option value={source} key={source}>{source.replaceAll("_", " ")}</option>)}</select></div>
      {field("seller", "Seller / acquired from")}{field("boughtFrom", "Where bought")}{field("buyer", "Who acquired it")}{field("acquiredOn", "Acquisition date", "date")}{field("reference", "Purchase invoice / reference")}
      </div><h3>Arrival &amp; title</h3><div className={styles.fields}>
      {field("whereabouts", "Where is the vehicle now?")}
      {field("keys", "Number of keys", "number")}
      <div><label htmlFor="intake-title">Title status</label><select id="intake-title" value={details.titleStatus} onChange={event => update("titleStatus", event.target.value)}><option value="PENDING">Pending</option><option value="RECEIVED">Received (staff reported)</option><option value="ISSUE">Issue / hold</option></select></div>
      {area("condition", "Arrival condition / damage")}
      </div><h3>Documents &amp; recon follow-up</h3><div className={styles.fields}>
      <p className={`${styles.wide} ${styles.pending}`}>Pending: {intakePending({ ...details, purchaseCents: purchase ? 1 : null }).join(" · ") || "None"}</p>
      {area("documents", "Documents received / references", false)}
      {area("pendingNotes", "Pending information / follow-up plan", false)}
      </div></section>
      <section aria-labelledby="cost-heading"><h2 id="cost-heading"><Banknote size={18}/>Cost &amp; pricing</h2><h3>Cost info</h3><div className={styles.fields}>
      <div><label htmlFor="intake-price-status">Purchase cost status</label><select id="intake-price-status" value={details.priceStatus} onChange={event => { update("priceStatus", event.target.value); if (event.target.value === "PENDING") setPurchase(""); }}><option value="PENDING">Pending</option><option value="INCURRED">Incurred</option><option value="ESTIMATED">Estimate</option></select></div>
      <div><label htmlFor="intake-purchase">Purchase price (USD)</label><input id="intake-purchase" inputMode="decimal" disabled={details.priceStatus === "PENDING"} value={purchase} onChange={event => { pending.current = null; setDirty(true); setPurchase(event.target.value); }}/></div>
      <button type="button" className={styles.wide} disabled={!costs} onClick={() => costDialog.current?.showModal()}><Plus size={16}/>Added costs &amp; corrections</button>
      <dl className={`${styles.totals} ${styles.wide}`}><div><dt>Incurred + intake preview</dt><dd>{money(incurred)}</dd></div><div><dt>Separate estimates</dt><dd>{money(estimates)}</dd></div></dl>
      </div><h3>Price info</h3><div className={styles.fields}>
      {model.canPrice ? <div className={styles.wide}><label htmlFor="intake-proposed-price">Provisional selling price (USD)</label><input id="intake-proposed-price" inputMode="decimal" value={price} onChange={event => { pending.current = null; setDirty(true); setPrice(event.target.value); }}/></div> : null}
      <dl className={`${styles.totals} ${styles.wide}`}><div><dt>Recorded-cost margin preview <Info size={12} aria-label="Staff-reported USD preview, excluding estimates and pack; not accounting profit" role="img" tabIndex={0}><title>Staff-reported USD preview, excluding estimates and pack; not accounting profit</title></Info></dt><dd>{known && priceValue !== null ? money(priceValue - incurred) : "Pending cost / price"}</dd></div></dl>
      <Link className={styles.wide} href={`/vehicles/${id}/pricing`} onClick={event => { if (dirty && !window.confirm("Leave without saving your intake changes?")) event.preventDefault(); }}>Pack &amp; margin settings</Link>
      </div></section>
      <div className={styles.revision}><label htmlFor="intake-reason">Record / revision reason (required)</label><input ref={reasonInput} id="intake-reason" required minLength={10} maxLength={1000} value={reason} onChange={event => { pending.current = null; setDirty(true); setReason(event.target.value); }}/></div>
    </fieldset></form>
    <footer className={styles.nextActions}>
      <button type="button" disabled={busy} onClick={() => save("DRAFT")}><Save size={16}/>Save draft</button>
      <button className={styles.primary} type="button" disabled={busy} onClick={nextAction}>{nextLabel}<ArrowRight size={16}/></button>
    </footer>
    <dialog ref={costDialog} className={styles.dialog} aria-labelledby="added-cost-heading"><header><h2 id="added-cost-heading">Added costs &amp; corrections</h2><button type="button" aria-label="Close added costs" title="Close" onClick={() => costDialog.current?.close()}><X size={18}/></button></header><VehicleCostWorkspace vehicleId={model.vehicle.id} unit={costs} embedded/></dialog>
  </section>;
}
