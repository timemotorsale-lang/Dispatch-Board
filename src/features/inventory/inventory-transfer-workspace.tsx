"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Check, ChevronLeft, ChevronRight, FileDown, Search, Upload, X } from "lucide-react";
import { EXPORT_FIELDS, IMPORT_FIELDS, inventoryCsv, MAX_CSV_BYTES, parseInventoryCsv, suggestMapping, type ImportPreview, type Mapping, type TransferRow } from "@/lib/inventory-transfer";
import styles from "./inventory-transfer-workspace.module.css";

type ExportPreview = { headers: string[]; rows: (string | number | null)[][]; total: number };
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function request(action: string, values: object) {
  const response = await fetch("/api/vehicles/transfers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...values }) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Data transfer failed. Please retry.");
  }
  return response;
}

export function InventoryTransferWorkspace({ locations, initialMode = "export" }: { locations: { id: string; name: string; code: string }[]; initialMode?: "export" | "import" }) {
  const [mode, setMode] = useState<"export" | "import">(initialMode);
  const [locationId, setLocationId] = useState(locations.length === 1 ? locations[0].id : "");
  const [query, setQuery] = useState("");
  const [columns, setColumns] = useState<string[]>(["vin", "stockNumber", "year", "make", "model", "lifecycleStage", "operatingState", "location"]);
  const [exportPreview, setExportPreview] = useState<ExportPreview | null>(null);
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [results, setResults] = useState<TransferRow[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const rows = results ?? preview?.rows ?? [];
  const ready = preview?.rows.filter(row => row.status === "READY").length ?? 0;
  const created = results?.filter(row => row.status === "CREATED").length ?? 0;
  const pageCount = Math.max(1, Math.ceil(rows.length / 50));
  function changeMode(nextMode: "export" | "import") {
    setMode(nextMode); setError(""); setNotice("");
    const url = new URL(window.location.href);
    url.searchParams.set("mode", nextMode);
    window.history.replaceState(null, "", url);
  }
  function invalidateImport() { setPreview(null); setResults(null); setConfirmed(false); setPage(1); setError(""); setNotice(""); }
  async function run(label: string, task: () => Promise<void>) {
    setBusy(label); setError(""); setNotice("");
    try { await task(); } catch (error) { setError(error instanceof Error ? error.message : "Transfer failed."); } finally { setBusy(""); }
  }
  async function loadFile(file?: File) {
    invalidateImport(); setCsv(""); setFilename(""); setHeaders([]); setMapping({});
    if (!file) return;
    await run("Reading file", async () => {
      if (file.size > MAX_CSV_BYTES) throw new Error("CSV must be 2 MB or smaller.");
      if (!/\.csv$/i.test(file.name)) throw new Error("Choose a CSV file.");
      const text = await file.text();
      const parsed = parseInventoryCsv(text);
      setCsv(text); setFilename(file.name); setHeaders(parsed.headers); setMapping(suggestMapping(parsed.headers));
    });
  }
  return <main className={styles.workspace}>
    <header className={styles.heading}><div><h1>Inventory Import / Export</h1><span>Inventory data</span></div><Link href="/vehicles/registry">Vehicle registry</Link></header>
    <div className={styles.layout}>
      <nav className={styles.rail} aria-label="Data transfer tasks">
        <button disabled={!!busy} aria-current={mode === "export" ? "page" : undefined} onClick={() => changeMode("export")}><ArrowDownToLine size={17} />Export</button>
        <button disabled={!!busy} aria-current={mode === "import" ? "page" : undefined} onClick={() => changeMode("import")}><ArrowUpFromLine size={17} />Import</button>
      </nav>
      <section className={styles.content} aria-label={mode === "export" ? "Export inventory" : "Import vehicles"} aria-busy={!!busy}>
        <header className={styles.sectionHeading}><h2>{mode === "export" ? "Export inventory" : "Import vehicles"}</h2><span className={styles.badge}>CSV</span></header>
        {error ? <div role="alert" className={styles.error}>{error}</div> : null}
        {notice ? <div role="status" className={styles.success}>{notice}</div> : null}
        <fieldset disabled={!!busy} className={styles.fields}>
          <label>Location<select value={locationId} onChange={event => { setLocationId(event.target.value); invalidateImport(); setExportPreview(null); }}><option value="">Select location</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name} ({location.code})</option>)}</select></label>
          {mode === "export" ? <label>VIN, stock, make or model<input value={query} maxLength={100} onChange={event => { setQuery(event.target.value); setExportPreview(null); }} /></label> : null}
        </fieldset>
        {mode === "export" ? <>
          <section className={styles.band}><h3>Columns</h3><fieldset disabled={!!busy} className={styles.columns}>{EXPORT_FIELDS.map(([key, label]) => <label key={key}><input type="checkbox" checked={columns.includes(key)} onChange={event => { setColumns(event.target.checked ? [...columns, key] : columns.filter(value => value !== key)); setExportPreview(null); }} />{label}</label>)}</fieldset></section>
          <div className={styles.toolbar}>
            <button disabled={!!busy || !locationId || !columns.length} onClick={() => run("Loading preview", async () => { setExportPreview(await (await request("preview-export", { locationId, columns, query })).json()); })}><Search size={16} />Preview</button>
            <button className={styles.primary} disabled={!!busy || !exportPreview?.total} onClick={() => run("Exporting", async () => { const response = await request("export", { locationId, columns, query }); download(await response.blob(), `inventory-${new Date().toISOString().slice(0, 10)}.csv`); setNotice("Inventory CSV downloaded."); })}><FileDown size={16} />Download CSV</button>
            {exportPreview ? <span>{exportPreview.total} active inventory vehicles{exportPreview.total > 25 ? " · first 25 shown" : ""}</span> : null}
          </div>
          {exportPreview ? <div className={styles.tableScroll}><table><caption className={styles.srOnly}>Export preview</caption><thead><tr>{exportPreview.headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{exportPreview.rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell ?? "—"}</td>)}</tr>)}</tbody></table>{!exportPreview.total ? <p className={styles.empty}>No matching inventory vehicles.</p> : null}</div> : null}
        </> : <>
          <div className={styles.toolbar}>
            <label className={styles.upload}><Upload size={16} />Choose CSV<input aria-label="Choose CSV" disabled={!!busy} type="file" accept=".csv,text/csv" onChange={event => { void loadFile(event.target.files?.[0]); event.target.value = ""; }} /></label>
            <button disabled={!!busy} onClick={() => download(new Blob([inventoryCsv(IMPORT_FIELDS.map(([key]) => key), [])], { type: "text/csv;charset=utf-8" }), "inventory-import-template.csv")}><FileDown size={16} />Template</button>
            <span>{filename || "No file selected"}</span><span className={styles.meta}>500 rows · 2 MB maximum</span>
          </div>
          {headers.length ? <section className={styles.band}><h3>Column mapping</h3><fieldset disabled={!!busy} className={styles.mapping}>{IMPORT_FIELDS.map(([key, label]) => <label key={key}>{label}<select value={mapping[key] ?? ""} onChange={event => { setMapping({ ...mapping, [key]: event.target.value || undefined }); invalidateImport(); }}><option value="">Not imported</option>{headers.map(header => <option key={header} value={header}>{header}</option>)}</select></label>)}</fieldset></section> : null}
          <div className={styles.toolbar}><button disabled={!!busy || !csv || !locationId} onClick={() => run("Validating rows", async () => { const result = await (await request("preview-import", { locationId, csv, mapping })).json(); setPreview(result); setResults(null); setConfirmed(false); setPage(1); })}><Search size={16} />Review import</button>{preview ? <span>{ready} ready · {preview.rows.length - ready} excluded</span> : null}</div>
          {preview && !results ? <div className={styles.confirm}><p>Creates new vehicle records only. Existing records, acquisition approvals and release status will not be changed.</p><label><input type="checkbox" disabled={!!busy || !ready} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Create {ready} new vehicle records at {locations.find(location => location.id === locationId)?.name}</label><button className={styles.primary} disabled={!!busy || !ready || !confirmed} onClick={() => run("Importing vehicles", async () => { const result = await (await request("apply-import", { batchId: preview.batchId })).json(); setResults(result.rows); setConfirmed(false); setNotice("Import completed. Review the row results below."); })}><Check size={16} />Import ready rows</button></div> : null}
          {results ? <div className={styles.toolbar}><strong>{created} created · {results.filter(row => row.status === "FAILED").length} failed · {results.filter(row => ["DUPLICATE", "INVALID", "REVIEW"].includes(row.status)).length} excluded / review</strong>{results.some(row => row.status === "FAILED") ? <button disabled={!!busy} onClick={() => run("Retrying failed rows", async () => { setResults((await (await request("apply-import", { batchId: preview!.batchId })).json()).rows); })}>Retry failed rows</button> : null}<button disabled={!!busy} title="Clear import results" onClick={invalidateImport}><X size={16} />Clear results</button></div> : null}
          {rows.length ? <><div className={styles.tableScroll}><table><caption className={styles.srOnly}>Import row results</caption><thead><tr><th>CSV row</th><th>Vehicle / VIN</th><th>Status</th><th>Result</th><th>Open</th></tr></thead><tbody>{rows.slice((page - 1) * 50, page * 50).map(row => <tr key={row.row}><td>{row.row}</td><td>{row.vehicle}</td><td><span className={styles.status} data-status={row.status}>{row.status}</span></td><td>{row.message}</td><td>{row.vehicleId ? <Link href={`/vehicles/360/${encodeURIComponent(row.vehicleId)}`}>Vehicle record</Link> : "—"}</td></tr>)}</tbody></table></div><div className={styles.pagination}><span>{rows.length} rows · page {page} of {pageCount}</span><button title="Previous page" aria-label="Previous page" disabled={!!busy || page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button><button title="Next page" aria-label="Next page" disabled={!!busy || page === pageCount} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button></div></> : null}
        </>}
        {busy ? <p role="status" className={styles.progress}>{busy}...</p> : null}
      </section>
    </div>
  </main>;
}
