"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { formatCents } from "@/features/collections/domain/money-dates";
import { dealerCenterFields, dealerCenterSalesStatusHeaders, type DealerCenterKind, type DealerCenterMapping, type DealerCenterIssue, type DealerCenterReportRow, type InventoryReportRow } from "./import-format";
import styles from "./reporting.module.css";

type Location = { id: string; name: string };
type ReviewRow = DealerCenterReportRow & {
  action: "New" | "Update" | "Unchanged";
  previousDate?: string; previousAmountCents?: number;
  previousStatus?: string; previousCostCents?: number | null; previousPriceCents?: number | null;
};
type Draft = { id: string; rows: ReviewRow[]; omitted: InventoryReportRow[]; dataAsOf: string };
type Receipt = { importedCount: number; unchangedCount: number; dataAsOf: string };

async function call(form: FormData) {
  const result = await fetch("/api/dealercenter-reports", { method: "POST", body: form });
  const response = await result.json();
  if (!result.ok) throw new Error(response.error || "The report could not be processed.");
  return response;
}

export function DealerCenterImportForm({ kind, locations, initialLocationId, today }: {
  kind: DealerCenterKind; locations: Location[]; initialLocationId: string; today: string;
}) {
  const [locationId, setLocationId] = useState(initialLocationId);
  const [dataAsOf, setDataAsOf] = useState("");
  const [completedOnly, setCompletedOnly] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<DealerCenterMapping>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [issues, setIssues] = useState<DealerCenterIssue[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const reportHref = "/dealercenter-reports?" + new URLSearchParams({ kind, locationId, view: "report" });
  const inventory = kind === "INVENTORY";
  const fields = dealerCenterFields[kind];

  function clearReview() {
    setDraft(null); setReceipt(null); setIssues([]); setError("");
  }

  function chooseFile(next: File | null) {
    setFile(next); setHeaders([]); setMapping({}); setCompletedOnly(false); clearReview();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    const action = draft ? "confirm" : headers.length ? "preview" : "inspect";
    setBusy(true);
    setError("");
    setIssues([]);
    try {
      const body = new FormData();
      body.set("action", action);
      if (draft) {
        body.set("draftId", draft.id);
        setReceipt(await call(body));
        setDraft(null);
      } else {
        body.set("report", file);
        body.set("kind", kind);
        body.set("locationId", locationId);
        body.set("dataAsOf", dataAsOf);
        body.set("mapping", JSON.stringify(mapping));
        body.set("completedOnly", String(completedOnly));
        const result = await call(body);
        if (action === "inspect") {
          setHeaders(result.headers);
          setMapping(result.mapping);
        } else {
          setDraft(result.draft);
          setIssues(result.issues);
        }
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not process the report.");
    } finally {
      setBusy(false);
    }
  }

  return <section className={"panel-card " + styles.panel}>
    {receipt ? <div className={styles.stack} role="status">
      <strong>Report confirmed</strong>
      <p>{receipt.importedCount} added or updated · {receipt.unchangedCount} unchanged · As of {receipt.dataAsOf}</p>
      <div className="form-actions">
        <Link className="button button-primary" href={reportHref}>View imported {inventory ? "inventory" : "sales"}</Link>
        <button className="button button-secondary" type="button" onClick={() => chooseFile(null)}>Import another file</button>
      </div>
    </div> : <form onSubmit={submit} className={styles.stack} aria-busy={busy}>
      {draft ? <>
        <div className={styles.stack}>
          <h2>Review {draft.rows.length} rows</h2>
          <p>{locations.find(item => item.id === locationId)?.name} · Report as of {draft.dataAsOf}</p>
          {inventory && <p>This export replaces the location’s current reporting snapshot. {draft.omitted.length} previously reported vehicles are absent from this file.</p>}
          {draft.omitted.length > 0 && <details><summary>Vehicles missing from this export</summary><ul>
            {draft.omitted.map(row => <li key={row.vin}>{row.vin}{row.stock ? " · " + row.stock : ""} · {row.status}</li>)}
          </ul></details>}
          <p>{draft.rows.filter(row => row.action === "New").length} new · {draft.rows.filter(row => row.action === "Update").length} updated · {draft.rows.filter(row => row.action === "Unchanged").length} unchanged</p>
        </div>
        <div className={styles.table}>
          <table>
            <thead>{inventory
              ? <tr><th>VIN / stock</th><th>Reported status</th><th>Cost</th><th>Asking price</th><th>Change</th></tr>
              : <tr><th>Deal</th><th>Sold date</th><th>Sale price</th><th>VIN / stock</th><th>Change</th></tr>}</thead>
            <tbody>{draft.rows.map(row => "deal" in row
              ? <tr key={row.deal}><th scope="row">{row.deal}</th><td>{row.date}{row.previousDate && row.previousDate !== row.date && <small>Was {row.previousDate}</small>}</td><td>{formatCents(row.amountCents)}{row.previousAmountCents != null && row.previousAmountCents !== row.amountCents && <small>Was {formatCents(row.previousAmountCents)}</small>}</td><td>{[row.vin, row.stock].filter(Boolean).join(" · ") || "—"}</td><td>{row.action}</td></tr>
              : <tr key={row.vin}><th scope="row">{row.vin}{row.stock && <small>{row.stock}</small>}</th><td>{row.status}{row.previousStatus && row.previousStatus !== row.status && <small>Was {row.previousStatus}</small>}</td><td>{formatCents(row.costCents)}{row.previousCostCents !== undefined && row.previousCostCents !== row.costCents && <small>Was {formatCents(row.previousCostCents)}</small>}</td><td>{formatCents(row.priceCents)}{row.previousPriceCents !== undefined && row.previousPriceCents !== row.priceCents && <small>Was {formatCents(row.previousPriceCents)}</small>}</td><td>{row.action}</td></tr>,
            )}</tbody>
          </table>
        </div>
      </> : <>
        <div className={styles.fields}>
          <label className="form-field">Location
            <select aria-label="Location" value={locationId} required disabled={busy} onChange={event => { setLocationId(event.target.value); clearReview(); }}>
              {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </label>
          <label className="form-field">Report as of
            <input aria-label="Report as of" type="date" value={dataAsOf} max={today} required disabled={busy} onChange={event => { setDataAsOf(event.target.value); clearReview(); }} />
          </label>
          <label className="form-field">{inventory ? "Full inventory export" : "Completed sales export"}
            <input aria-label={inventory ? "Full inventory export" : "Completed sales export"} type="file" accept=".csv,.xlsx" disabled={busy} onChange={event => chooseFile(event.target.files?.[0] ?? null)} />
          </label>
        </div>
        <p>{file ? file.name + " · " : ""}CSV or Excel · Up to 500 rows</p>
        {headers.length > 0 && <fieldset className={styles.fields}>
          <legend>Confirm which columns to use</legend>
          {fields.map(field => <label className="form-field" key={field.key}>{field.label}{field.required ? " · Required" : ""}
            <select value={mapping[field.key] ?? ""} required={field.required} disabled={busy} onChange={event => {
              setMapping(previous => ({ ...previous, [field.key]: event.target.value }));
              clearReview();
            }}>
              <option value="">Choose column</option>
              {headers.map(header => <option key={header} value={header}>{header}</option>)}
            </select>
          </label>)}
        </fieldset>}
        {!inventory && headers.length > 0 && !dealerCenterSalesStatusHeaders(headers).length && <label>
          <input type="checkbox" checked={completedOnly} required disabled={busy} onChange={event => { setCompletedOnly(event.target.checked); clearReview(); }} />{" "}
          This export contains completed sales only.
        </label>}
      </>}
      {error && <p className="notice notice-danger" role="alert">{error}</p>}
      {issues.length > 0 && <div className="notice notice-danger" role="alert">
        <strong>Correct {issues.length} rows in the export, then upload it again.</strong>
        <ul>{issues.map(issue => <li key={issue.row}>Row {issue.row} · {issue.message}</li>)}</ul>
      </div>}
      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={busy || !file}>
          {busy ? "Working…" : draft ? "Confirm report" : headers.length ? "Preview import" : "Read file columns"}
        </button>
        {draft && <button type="button" className="button button-secondary" disabled={busy} onClick={clearReview}>Back to column mapping</button>}
      </div>
    </form>}
  </section>;
}
