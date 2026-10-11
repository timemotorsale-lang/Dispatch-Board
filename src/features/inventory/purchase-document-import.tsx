"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, FileSearch, Upload, History, ListChecks, Save } from "lucide-react";
import { PURCHASE_FIELDS, type PurchaseRead, type PurchaseReview, type PurchaseValues, type PurchaseImportJob } from "@/lib/inventory-purchase-import";
import { PurchaseImportHistoryPanel } from "./purchase-import-history";
import { PurchaseSourcePreview } from "./purchase-source-preview";
import { INTAKE_SOURCES } from "@/server/inventory-unit/intake-domain";
import type { PurchaseColumnMapping } from "@/lib/purchase-column-mapping";
import styles from "./inventory-transfer-workspace.module.css";

const fieldTargets: Record<string, string> = { seller: "seller", boughtFrom: "boughtFrom", buyer: "buyer", acquiredOn: "acquiredOn", reference: "reference", purchasePrice: "purchaseCents", buyerFee: "purchaseCents", transportFee: "purchaseCents", otherFees: "purchaseCents", taxes: "purchaseCents", credits: "purchaseCents", invoiceTotal: "purchaseCents", odometer: "odometer", condition: "condition" };
async function send(body: FormData | object) {
  const response = await fetch("/api/vehicles/transfers/documents", { method: "POST", ...(body instanceof FormData ? { body } : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Purchase import failed.");
  return data;
}
const fieldLabel = (field: string) => field === "purchaseCents" ? "Purchase amount" : field === "source" ? "Acquisition source" : field === "priceStatus" ? "Purchase amount status" : PURCHASE_FIELDS.find(([key]) => key === field)?.[1] ?? field;
const displayValue = (field: string, value: string) => !value ? "Pending" : field === "purchaseCents" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) / 100) : value.replaceAll("_", " ");
export function PurchaseDocumentImport({ locationId, onBusyChange }: { locationId: string; onBusyChange?: (label: string) => void }) {
  const [view, setView] = useState<"import" | "history" | "corrections">("import");
  const [resumeJob, setResumeJob] = useState<PurchaseImportJob | null>(null);
  const [savedCorrections, setSavedCorrections] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [batch, setBatch] = useState<File[]>([]);
  const [sources, setSources] = useState<Record<string, File>>({});
  const [batchFailures, setBatchFailures] = useState<string[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<PurchaseColumnMapping>({});
  const [templates, setTemplates] = useState<{ id: string; name: string; mapping: PurchaseColumnMapping }[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateRefresh, setTemplateRefresh] = useState(0);
  const [reading, setReading] = useState<PurchaseRead | null>(null);
  const [readings, setReadings] = useState<PurchaseRead[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [values, setValues] = useState<PurchaseValues>({});
  const [fields, setFields] = useState<string[]>([]);
  const [review, setReview] = useState<PurchaseReview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<{ vehicleId: string; duplicate: boolean } | null>(null);
  const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  useEffect(() => {
    if (!headers.length) return;
    const controller = new AbortController();
    fetch(`/api/vehicles/transfers/documents?${new URLSearchParams({ templates: "1", locationId })}`, { signal: controller.signal, cache: "no-store" }).then(async response => { if (!response.ok) throw new Error("Saved templates unavailable."); return response.json(); }).then(data => { if (!controller.signal.aborted && Array.isArray(data)) setTemplates(data); }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [headers.length, locationId, templateRefresh]);
  function invalidate() { setReview(null); setConfirmed(false); setResult(null); setError(""); setSavedCorrections(false); }
  function selectReading(data: PurchaseRead) {
    if (sources[data.readId]) setFile(sources[data.readId]);
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
  function renderColumnMapping([key, label]: typeof PURCHASE_FIELDS[number]) {
    return <label key={key}>{label} column<select value={mapping[key] ?? ""} onChange={event => { setMapping({ ...mapping, [key]: event.target.value }); setReading(null); invalidate(); }}><option value="">Not imported</option>{headers.map(header => <option key={header}>{header}</option>)}</select></label>;
  }
  const primaryFields = ["vin", "seller", "source", "acquiredOn", "reference", "purchasePrice", "invoiceTotal"];
  const identityFields = ["stockNumber", "year", "make", "model"];
  return <section aria-label="Purchase documents" aria-busy={!!busy}>
    <div className={styles.toolbar} role="tablist" aria-label="Purchase import views">{(["import", "history", "corrections"] as const).map(mode => <button key={mode} role="tab" aria-selected={view === mode} disabled={!!busy} onClick={() => setView(mode)}>{mode === "history" ? <History size={16} /> : mode === "corrections" ? <ListChecks size={16} /> : <Upload size={16} />}{mode === "import" ? "Import" : mode === "history" ? "Import history" : "Correction queue"}</button>)}</div>
    {view !== "import" ? <PurchaseImportHistoryPanel key={locationId} locationId={locationId} correctionsOnly={view === "corrections"} onResume={job => { setResumeJob(job); setFile(null); setBatch([]); setReading(null); setReadings([]); setCompleted([]); setValues({}); invalidate(); setView("import"); if (job.version) void run("Restoring stored document", async () => {
      const response = await fetch(`/api/vehicles/transfers/documents?${new URLSearchParams({ source: job.readId })}`, { cache: "no-store" });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Stored document unavailable."); }
      const original = new File([await response.blob()], job.fileName, { type: response.headers.get("content-type") ?? "" });
      const data = await send({ action: "resume", readId: job.readId });
      const rows: PurchaseRead[] = data.rows ?? [data.reading];
      setFile(original); setSources(Object.fromEntries(rows.map(row => [row.readId, original]))); setReadings(rows); selectReading(data.reading);
      if (data.correction) { setValues(data.correction.values); setFields(data.correction.fields); }
      setResumeJob(null);
    }); }} /> : <>
    {error ? <div role="alert" className={styles.error}>{error}</div> : null}
    {resumeJob ? <div className={styles.toolbar}><strong>Continue: {resumeJob.fileName}</strong><span>Reattach the exact original file.</span><button disabled={!!busy} onClick={() => { setResumeJob(null); setFile(null); setReading(null); setReadings([]); setValues({}); invalidate(); }}>Cancel retry</button></div> : null}
    <div className={styles.toolbar}>
      <label className={styles.upload}><Upload size={16} />Choose purchase file<input aria-label="Choose purchase file" type="file" multiple={!resumeJob} accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.xlsx" disabled={!!busy} onChange={event => { const selected = Array.from(event.target.files ?? []); const next = selected[0] ?? null; setFile(next); setBatch(selected); setSources({}); setHeaders([]); setMapping({}); setBatchFailures([]); setReading(null); setReadings([]); setCompleted([]); setValues({}); invalidate(); if (selected.length > 20 || selected.some(item => item.size > 10 * 1024 * 1024)) { setFile(null); setBatch([]); setError("Choose up to 20 files, each 10 MB or smaller."); } event.target.value = ""; }} /></label>
      <span>{batch.length > 1 ? `${batch.length} files selected` : file?.name ?? "No document selected"}</span>
      {file && /\.(csv|xlsx)$/i.test(file.name) && !resumeJob ? <button disabled={!!busy || !locationId} onClick={() => run("Reading spreadsheet columns", async () => { const data = await send(form("inspect-columns")); setHeaders(data.headers); setMapping({}); setReading(null); setReadings([]); invalidate(); })}><ListChecks size={16} />Map columns</button> : null}
      <button disabled={!!busy || !file || !locationId} onClick={() => run(resumeJob ? "Restoring import" : "Reading document", async () => {
        if (resumeJob) {
          const body = form("resume"); body.set("readId", resumeJob.readId);
          const data = await send(body); setReadings([data.reading]); selectReading(data.reading);
          if (data.correction) { setValues(data.correction.values); setFields(data.correction.fields); }
          setResumeJob(null);
        } else {
          const items: PurchaseRead[] = [], originalFiles: Record<string, File> = {}, failures: string[] = [];
          for (const original of batch.length ? batch : [file!]) {
            const body = new FormData(); body.set("action", "read"); body.set("locationId", locationId); body.set("file", original);
            if (/\.(csv|xlsx)$/i.test(original.name) && headers.length) body.set("mapping", JSON.stringify(mapping));
            try {
              const data: PurchaseRead | { rows: PurchaseRead[] } = await send(body), rows = "rows" in data ? data.rows : [data];
              for (const item of rows) { items.push(item); originalFiles[item.readId] = original; }
            } catch (error) { failures.push(`${original.name}: ${error instanceof Error ? error.message : "Read failed"}`); }
          }
          setBatchFailures(failures); setSources(originalFiles); setReadings(items); setCompleted([]);
          if (items.length) { setFile(originalFiles[items[0].readId]); selectReading(items[0]); }
        }
      })}><FileSearch size={16} />{resumeJob ? "Resume import" : "Read purchase file"}</button>
    </div>
    {headers.length ? <details className={styles.band} open={!reading}>
      <summary>Purchase column mapping</summary>
      <div className={styles.toolbar}><label>Saved mapping<select aria-label="Saved mapping" disabled={!!busy} defaultValue="" onChange={event => { const template = templates.find(item => item.id === event.target.value); if (template) { setMapping(template.mapping); setTemplateName(template.name); setReading(null); invalidate(); } }}><option value="">Select template</option>{templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><label>Template name<input maxLength={80} value={templateName} onChange={event => setTemplateName(event.target.value)} /></label><button disabled={!!busy || !templateName.trim() || !mapping.vin} onClick={() => run("Saving column mapping", async () => { await send({ action: "save-template", locationId, name: templateName, mapping, headers }); setTemplateRefresh(value => value + 1); })}><Save size={16} />Save mapping</button></div>
      <fieldset disabled={!!busy} className={styles.mapping}>{PURCHASE_FIELDS.filter(([key]) => primaryFields.includes(key)).map(renderColumnMapping)}</fieldset>
      <details className={styles.band}><summary>Additional columns</summary><fieldset disabled={!!busy} className={styles.mapping}>{PURCHASE_FIELDS.filter(([key]) => !primaryFields.includes(key)).map(renderColumnMapping)}</fieldset></details>
    </details> : null}
    {batchFailures.length ? <div role="alert" className={styles.error}>{batchFailures.map((failure, index) => <p key={index}>{failure}</p>)}</div> : null}
    {reading ? <>
      {readings.length > 1 ? <div className={styles.fields}><label>Vehicle / spreadsheet row<select aria-label="Vehicle / spreadsheet row" disabled={!!busy} value={reading.readId} onChange={event => selectReading(readings.find(item => item.readId === event.target.value)!)}>{readings.map((item, index) => <option key={item.readId} value={item.readId}>{index + 1}: {item.fileName} - {item.values.vin || "VIN missing"}{completed.includes(item.readId) ? " - saved" : ""}</option>)}</select></label><span>{completed.length} of {readings.length} records saved</span></div> : null}
      <div className={styles.toolbar}><strong>{reading.category.replaceAll("_", " ")}</strong><span>{reading.method.replaceAll("_", " ")}</span></div>
      {reading.warnings.map((warning, index) => <p key={index} className={styles.meta}>{warning}</p>)}
      <div className={styles.documentReview}>
      {file ? <PurchaseSourcePreview file={file} /> : null}
      <div className={styles.reviewFields}>
      <fieldset disabled={!!busy} className={`${styles.mapping} ${styles.purchaseMapping}`}>{PURCHASE_FIELDS.filter(([key]) => primaryFields.includes(key)).map(renderField)}</fieldset>
      <details className={styles.band} open={identityFields.some(key => values[key as keyof PurchaseValues])}><summary>Vehicle details</summary><fieldset disabled={!!busy} className={`${styles.mapping} ${styles.purchaseMapping}`}>{PURCHASE_FIELDS.filter(([key]) => identityFields.includes(key)).map(renderField)}</fieldset></details>
      <details className={styles.band} open={PURCHASE_FIELDS.some(([key]) => !primaryFields.includes(key) && !identityFields.includes(key) && values[key])}><summary>Fees and additional purchase details</summary><fieldset disabled={!!busy} className={`${styles.mapping} ${styles.purchaseMapping}`}>{PURCHASE_FIELDS.filter(([key]) => !primaryFields.includes(key) && !identityFields.includes(key)).map(renderField)}</fieldset></details>
      <section className={styles.band}><h3>Allocate to acquisition draft</h3><fieldset disabled={!!busy} className={styles.columns}>{[...new Set(["source", ...Object.values(fieldTargets)])].map(field => <label key={field}><input type="checkbox" checked={fields.includes(field)} onChange={event => { setFields(event.target.checked ? [...fields, field] : fields.filter(key => key !== field)); invalidate(); }} />{field === "purchaseCents" ? "Purchase amount including fees" : field === "source" ? "Acquisition source" : PURCHASE_FIELDS.find(([key]) => key === field)?.[1] ?? field}</label>)}</fieldset></section>
      <details className={styles.band}><summary>Extracted document text</summary><pre className={styles.sourceText}>{reading.text}</pre></details>
      <div className={styles.toolbar}><button disabled={!!busy || !!result} onClick={() => run("Saving corrections", async () => { await send({ action: "save-corrections", readId: reading.readId, values, fields }); setSavedCorrections(true); setReview(null); setConfirmed(false); })}><Save size={16} />Save corrections</button><button disabled={!!busy || !values.vin || !fields.length} onClick={() => run("Matching vehicle and reviewing values", async () => { setReview(await send({ readId: reading.readId, values, fields })); setConfirmed(false); setResult(null); })}><FileSearch size={16} />Review allocation</button></div>
      {savedCorrections ? <p role="status" className={styles.meta}>Corrections saved. No vehicle or purchase values have been changed.</p> : null}
      </div></div>
    </> : null}
    {review && !result ? <>
      <h3>{review.existing ? "Existing vehicle" : "New vehicle"}: {review.vehicleLabel}</h3>
      <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Purchase allocation review"><table><caption className={styles.srOnly}>Purchase allocation review</caption><thead><tr><th>Acquisition field</th><th>Existing</th><th>Document value</th><th>Action</th></tr></thead><tbody>{review.allocations.map(item => <tr key={item.field}><td>{fieldLabel(item.field)}</td><td>{displayValue(item.field, item.current)}</td><td>{displayValue(item.field, item.proposed)}</td><td>{item.conflict ? "Conflict - retained existing" : fields.includes(item.field) || item.field === "priceStatus" && fields.includes("purchaseCents") ? "Allocate" : "Not selected"}</td></tr>)}</tbody></table></div>
      {review.warnings.map((warning, index) => <p key={index} className={styles.meta}>{warning}</p>)}
      <div className={styles.confirm}><label><input type="checkbox" disabled={!!busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I reviewed the original document, vehicle match and acquisition values.</label><button className={styles.primary} disabled={!!busy || !confirmed} onClick={() => run("Saving purchase draft", async () => { setResult(await send(form("apply"))); setCompleted(items => [...new Set([...items, reading!.readId])]); })}><Check size={16} />Save purchase draft</button></div>
    </> : null}
    {result ? <div role="status" className={styles.success}>{result.duplicate ? "This purchase was already imported. No duplicate values were saved." : "Purchase draft saved with the original document."} <Link href={`/vehicles/${encodeURIComponent(result.vehicleId)}/intake`}>Open acquisition intake</Link> <Link href={`/vehicles/${encodeURIComponent(result.vehicleId)}/details`}>Inventory details</Link></div> : null}
    {busy ? <p role="status" className={styles.progress}>{busy}...</p> : null}
    </>}
  </section>;
}
