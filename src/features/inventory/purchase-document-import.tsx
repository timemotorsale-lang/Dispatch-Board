"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, FileSearch, Upload } from "lucide-react";
import { PURCHASE_FIELDS, type PurchaseRead, type PurchaseReview, type PurchaseValues } from "@/lib/inventory-purchase-import";
import { INTAKE_SOURCES } from "@/server/inventory-unit/intake-domain";
import styles from "./inventory-transfer-workspace.module.css";

const fieldTargets: Record<string, string> = { seller: "seller", boughtFrom: "boughtFrom", buyer: "buyer", acquiredOn: "acquiredOn", reference: "reference", purchasePrice: "purchaseCents", buyerFee: "purchaseCents", transportFee: "purchaseCents", otherFees: "purchaseCents", invoiceTotal: "purchaseCents", odometer: "odometer", condition: "condition" };
async function send(body: FormData | object) {
  const response = await fetch("/api/vehicles/transfers/documents", { method: "POST", ...(body instanceof FormData ? { body } : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Purchase import failed.");
  return data;
}
const fieldLabel = (field: string) => field === "purchaseCents" ? "Purchase amount" : field === "source" ? "Acquisition source" : field === "priceStatus" ? "Purchase amount status" : PURCHASE_FIELDS.find(([key]) => key === field)?.[1] ?? field;
const displayValue = (field: string, value: string) => !value ? "Pending" : field === "purchaseCents" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) / 100) : value.replaceAll("_", " ");
export function PurchaseDocumentImport({ locationId, onBusyChange }: { locationId: string; onBusyChange?: (label: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState<PurchaseRead | null>(null);
  const [readings, setReadings] = useState<PurchaseRead[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [values, setValues] = useState<PurchaseValues>({});
  const [fields, setFields] = useState<string[]>([]);
  const [review, setReview] = useState<PurchaseReview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<{ vehicleId: string; duplicate: boolean } | null>(null);
  const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  function invalidate() { setReview(null); setConfirmed(false); setResult(null); setError(""); }
  function selectReading(data: PurchaseRead) {
    setReading(data); setValues(data.values); setFields([...new Set(["source", ...Object.keys(data.values).flatMap(key => fieldTargets[key] ? [fieldTargets[key]] : [])])]); invalidate();
  }
  async function run(label: string, task: () => Promise<void>) {
    setBusy(label); onBusyChange?.(label); setError("");
    try { await task(); } catch (error) { setError(error instanceof Error ? error.message : "Purchase import failed."); } finally { setBusy(""); onBusyChange?.(""); }
  }
  function form(action: string) { const body = new FormData(); body.set("action", action); body.set("locationId", locationId); if (file) body.set("file", file); if (review) body.set("previewId", review.previewId); return body; }
  function renderField([key, label]: typeof PURCHASE_FIELDS[number]) {
    return <label key={key}>{label}{key === "source" ? <select value={values.source ?? ""} onChange={event => { setValues({ ...values, source: event.target.value }); invalidate(); }}><option value="">Pending</option>{values.source && !(INTAKE_SOURCES as readonly string[]).includes(values.source) ? <option value={values.source}>{values.source} - choose a source</option> : null}{INTAKE_SOURCES.map(source => <option key={source} value={source}>{source.replaceAll("_", " ")}</option>)}</select> : <input value={values[key] ?? ""} maxLength={500} type={key === "acquiredOn" ? "date" : "text"} onChange={event => { setValues({ ...values, [key]: event.target.value }); invalidate(); }} />}{reading?.evidence[key] ? <small className={styles.meta}>{reading.evidence[key]}</small> : null}</label>;
  }
  const primaryFields = ["vin", "seller", "source", "acquiredOn", "reference", "purchasePrice", "invoiceTotal"];
  const identityFields = ["stockNumber", "year", "make", "model"];
  return <section aria-label="Purchase documents" aria-busy={!!busy}>
    {error ? <div role="alert" className={styles.error}>{error}</div> : null}
    <div className={styles.toolbar}>
      <label className={styles.upload}><Upload size={16} />Choose purchase file<input aria-label="Choose purchase file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv" disabled={!!busy} onChange={event => { const next = event.target.files?.[0] ?? null; setFile(next); setReading(null); setReadings([]); setCompleted([]); setValues({}); invalidate(); if (next && next.size > 10 * 1024 * 1024) { setFile(null); setError("Document must be 10 MB or smaller."); } event.target.value = ""; }} /></label>
      <span>{file?.name ?? "No document selected"}</span>
      <button disabled={!!busy || !file || !locationId} onClick={() => run("Reading document", async () => { const data: PurchaseRead | { rows: PurchaseRead[] } = await send(form("read")); const items = "rows" in data ? data.rows : [data]; setReadings(items); setCompleted([]); selectReading(items[0]); })}><FileSearch size={16} />Read purchase file</button>
    </div>
    {reading ? <>
      {readings.length > 1 ? <div className={styles.fields}><label>Vehicle / spreadsheet row<select aria-label="Vehicle / spreadsheet row" disabled={!!busy} value={reading.readId} onChange={event => selectReading(readings.find(item => item.readId === event.target.value)!)}>{readings.map((item, index) => <option key={item.readId} value={item.readId}>Row {index + 2}: {item.values.vin || "VIN missing"}{completed.includes(item.readId) ? " - saved" : ""}</option>)}</select></label><span>{completed.length} of {readings.length} rows saved</span></div> : null}
      <div className={styles.toolbar}><strong>{reading.category.replaceAll("_", " ")}</strong><span>{reading.method.replaceAll("_", " ")}</span></div>
      {reading.warnings.map((warning, index) => <p key={index} className={styles.meta}>{warning}</p>)}
      <fieldset disabled={!!busy} className={`${styles.mapping} ${styles.purchaseMapping}`}>{PURCHASE_FIELDS.filter(([key]) => primaryFields.includes(key)).map(renderField)}</fieldset>
      <details className={styles.band} open={identityFields.some(key => values[key as keyof PurchaseValues])}><summary>Vehicle details</summary><fieldset disabled={!!busy} className={`${styles.mapping} ${styles.purchaseMapping}`}>{PURCHASE_FIELDS.filter(([key]) => identityFields.includes(key)).map(renderField)}</fieldset></details>
      <details className={styles.band} open={PURCHASE_FIELDS.some(([key]) => !primaryFields.includes(key) && !identityFields.includes(key) && values[key])}><summary>Fees and additional purchase details</summary><fieldset disabled={!!busy} className={`${styles.mapping} ${styles.purchaseMapping}`}>{PURCHASE_FIELDS.filter(([key]) => !primaryFields.includes(key) && !identityFields.includes(key)).map(renderField)}</fieldset></details>
      <section className={styles.band}><h3>Allocate to acquisition draft</h3><fieldset disabled={!!busy} className={styles.columns}>{[...new Set(["source", ...Object.values(fieldTargets)])].map(field => <label key={field}><input type="checkbox" checked={fields.includes(field)} onChange={event => { setFields(event.target.checked ? [...fields, field] : fields.filter(key => key !== field)); invalidate(); }} />{field === "purchaseCents" ? "Purchase amount including fees" : field === "source" ? "Acquisition source" : PURCHASE_FIELDS.find(([key]) => key === field)?.[1] ?? field}</label>)}</fieldset></section>
      <details className={styles.band}><summary>Extracted document text</summary><pre className={styles.sourceText}>{reading.text}</pre></details>
      <div className={styles.toolbar}><button disabled={!!busy || !values.vin || !fields.length} onClick={() => run("Matching vehicle and reviewing values", async () => { setReview(await send({ readId: reading.readId, values, fields })); setConfirmed(false); setResult(null); })}><FileSearch size={16} />Review allocation</button></div>
    </> : null}
    {review && !result ? <>
      <h3>{review.existing ? "Existing vehicle" : "New vehicle"}: {review.vehicleLabel}</h3>
      <div className={styles.tableScroll}><table><caption className={styles.srOnly}>Purchase allocation review</caption><thead><tr><th>Acquisition field</th><th>Existing</th><th>Document value</th><th>Action</th></tr></thead><tbody>{review.allocations.map(item => <tr key={item.field}><td>{fieldLabel(item.field)}</td><td>{displayValue(item.field, item.current)}</td><td>{displayValue(item.field, item.proposed)}</td><td>{item.conflict ? "Conflict - retained existing" : fields.includes(item.field) || item.field === "priceStatus" && fields.includes("purchaseCents") ? "Allocate" : "Not selected"}</td></tr>)}</tbody></table></div>
      {review.warnings.map((warning, index) => <p key={index} className={styles.meta}>{warning}</p>)}
      <div className={styles.confirm}><label><input type="checkbox" disabled={!!busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I reviewed the original document, vehicle match and acquisition values.</label><button className={styles.primary} disabled={!!busy || !confirmed} onClick={() => run("Saving purchase draft", async () => { setResult(await send(form("apply"))); setCompleted(items => [...new Set([...items, reading!.readId])]); })}><Check size={16} />Save purchase draft</button></div>
    </> : null}
    {result ? <div role="status" className={styles.success}>{result.duplicate ? "This purchase was already imported. No duplicate values were saved." : "Purchase draft saved with the original document."} <Link href={`/vehicles/${encodeURIComponent(result.vehicleId)}/intake`}>Open acquisition intake</Link> <Link href={`/vehicles/${encodeURIComponent(result.vehicleId)}/details`}>Inventory details</Link></div> : null}
    {busy ? <p role="status" className={styles.progress}>{busy}...</p> : null}
  </section>;
}
