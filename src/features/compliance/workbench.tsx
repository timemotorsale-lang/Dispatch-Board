"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { calculateTax, LEASE_TAX_SOURCE, type LocalTax, type TaxCalculation, type TaxInput } from "@/lib/compliance-tax";
import { csvCell, moneyLabel, moneyToday } from "@/lib/money-resources";
import type { TaxWorksheet } from "@/server/compliance/service";
import styles from "@/features/money-resources/workbench.module.css";

function blank(): TaxInput {
  return { kind: "LEASE", reference: "", date: moneyToday(), customer: "", vehicle: "", customerId: "", vehicleId: "", vehicleValue: "", rebates: "0", residual: "0", trade: "0", taxableAdditions: "0", rentCharge: "0", contractTax: "", garageAddress: "", localTaxes: [], localConfirmed: false, qualified: false, notes: "" };
}
type RecordRow = TaxWorksheet["records"][number];
type Links = { customers: Array<{ id: string; displayName: string; customerNumber: string }>; vehicles: Array<{ id: string; year: number | null; make: string | null; model: string | null; stockNumber: string | null; vin: string | null }> };
export function ComplianceWorkbench() {
  const [month, setMonth] = useState(moneyToday().slice(0, 7)), [model, setModel] = useState<TaxWorksheet | null>(null);
  const [form, setForm] = useState<TaxInput>(blank), [editing, setEditing] = useState<RecordRow | null>(null);
  const [view, setView] = useState("Record contract"), [notice, setNotice] = useState(""), [error, setError] = useState("");
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [search, setSearch] = useState("");
  const [links, setLinks] = useState<Links>({ customers: [], vehicles: [] });
  const [detail, setDetail] = useState<RecordRow | null>(null), [voiding, setVoiding] = useState<RecordRow | null>(null);
  const formRef = useRef<HTMLElement>(null);
  const locked = Boolean(model?.period && model.period.status !== "DRAFT");
  let preview: TaxCalculation | null = null;
  try { preview = calculateTax(form); } catch {}
  async function load(targetMonth: string) {
    const response = await fetch(`/api/compliance/tax?month=${targetMonth}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The worksheet could not be loaded.");
    return result as TaxWorksheet;
  }
  useEffect(() => {
    let cancelled = false;
    void load(month).then(result => { if (!cancelled) { setModel(result); setLoading(false); } }).catch(failure => { if (!cancelled) { setError(failure.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [month]);
  useEffect(() => {
    if (search.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => { void fetch(`/api/compliance/tax?search=${encodeURIComponent(search)}`, { signal: controller.signal }).then(async response => {
      const result = await response.json(); if (!response.ok) throw new Error(result.error); setLinks(result);
    }).catch(failure => { if (!controller.signal.aborted) setError(failure.message); }); }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search]);
  const field = (key: keyof TaxInput, value: string | boolean) => setForm(current => ({ ...current, [key]: value, ...(key === "garageAddress" ? { localConfirmed: false } : {}) }));
  const localTaxes = (transform: (lines: LocalTax[]) => LocalTax[]) => setForm(current => ({ ...current, localConfirmed: false, localTaxes: transform(current.localTaxes) }));
  async function execute(command: Record<string, unknown>, success: string) {
    if (busy || loading) return false;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/compliance/tax", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...command, month }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The action was not saved.");
      setNotice(success);
      try { setModel(await load(month)); }
      catch { setError("The action was saved, but the worksheet could not refresh. Reload before making another change."); setLoading(true); }
      return true;
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Connection interrupted. Your entries are still here. Reload to check whether the action saved before retrying."); return false; }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (await execute({ action: "SAVE", input: form, ...(editing ? { id: editing.id, version: editing.version } : {}) }, "Contract recorded. It is counted once, in this reporting period.")) { setForm({ ...blank(), date: form.date }); setEditing(null); setView("Monthly worksheet"); }
  }
  function edit(row: RecordRow) {
    setEditing(row); setForm(row.snapshot.input); setView("Record contract"); setNotice("");
    requestAnimationFrame(() => { formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }); formRef.current?.focus(); });
  }
  function exportCsv() {
    if (!model) return;
    const rows: unknown[][] = [["LEASE-ONLY PREPARATION WORKSHEET — NOT A FILED RETURN", month, model.period?.status || "DRAFT"], ["Reference", "Tax event date", "Kind", "Customer", "Vehicle", "Tax line", "Rate %", "Taxable base", "Tax", "Review flags", "Status"]];
    for (const row of model.records) {
      const snapshot = row.snapshot;
      for (const line of snapshot.lines.length ? snapshot.lines : [{ code: "DVS/deputy registrar — excluded", rate: "", baseCents: 0, taxCents: 0 }]) rows.push([snapshot.input.reference, snapshot.input.date, snapshot.input.kind, snapshot.input.customer, snapshot.input.vehicle, line.code, line.rate, (line.baseCents / 100).toFixed(2), (line.taxCents / 100).toFixed(2), snapshot.flags.join("; "), row.status]);
    }
    rows.push(["Active lease total", "", "", "", "", "", "", "", (model.summary.totalCents / 100).toFixed(2)]);
    const url = URL.createObjectURL(new Blob([rows.map(row => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `lease-tax-${month}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function confirmation(event: FormEvent<HTMLFormElement>, action: string) {
    event.preventDefault(); const element = event.currentTarget, values = Object.fromEntries(new FormData(element));
    if (await execute({ ...values, action, reviewed: values.reviewed === "on", revision: model?.revision, version: model?.period?.version ?? 0 }, action === "FILE" ? "External filing confirmation recorded. The worksheet is now locked." : "External payment confirmation recorded. No money was moved by this application.")) element.reset();
  }
  return <main className={styles.workbench}>
    <header className={styles.header}><div><h1>Compliance · Lease tax</h1><p>Record once. Review the month. File in Minnesota e-Services.</p></div><Link href="/command-center">Command Center</Link></header>
    <p className={styles.notice}><strong>Working assumption: eligible Minnesota leases are taxed up front.</strong> Later customer payments do not create this tax again. Confirm each contract’s eligibility before filing. This tool prepares lease-tax lines, not your complete Sales & Use Tax return.</p>
    <div className={styles.actions}><label>Reporting month<input type="month" value={month} disabled={busy} min="2000-01" onChange={event => { if (!event.target.value) return; if ((editing || form.reference) && !window.confirm("Change reporting month and discard the unsaved form?")) return; setMonth(event.target.value); setModel(null); setLoading(true); setError(""); setNotice(""); setEditing(null); setDetail(null); setVoiding(null); setForm({ ...blank(), date: `${event.target.value}-01` }); }} /></label><span>{model?.period?.status || "DRAFT"}</span></div>
    <nav className={styles.tabs} aria-label="Tax tools">{["Record contract", "Monthly worksheet", "History"].map(tab => <button key={tab} aria-pressed={view === tab} onClick={() => setView(tab)}>{tab}</button>)}</nav>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}{error && <p role="alert" className={styles.error}>{error} <button onClick={() => window.location.reload()}>Reload</button></p>}
    {loading && <p>Loading tax records…</p>}
    {view === "Record contract" && <section className={styles.panel} ref={formRef} tabIndex={-1}><h2>{editing ? "Edit contract" : "Record lease or sale"}</h2>
      {locked ? <p>This period is locked. Review its worksheet or select an open month. Amendments require a separate tax review.</p> : <form className={styles.form} onSubmit={save}>
        <label>Record type<select value={form.kind} onChange={event => field("kind", event.target.value)}><option value="LEASE">Lease · upfront tax</option><option value="SALE">Vehicle sale · separate DVS register</option></select></label>
        <label>Contract / deal reference<input required maxLength={100} value={form.reference} onChange={event => field("reference", event.target.value)} /></label>
        <label>{form.kind === "LEASE" ? "Lease execution / tax-event date" : "Sale date"}<input required type="date" max={moneyToday()} value={form.date} onChange={event => field("date", event.target.value)} /></label>
        <label>Find existing customer / vehicle<input value={search} maxLength={100} placeholder="Name, stock number or VIN" onChange={event => { setSearch(event.target.value); setLinks({ customers: [], vehicles: [] }); }} /></label>
        {links.customers.length > 0 && <label>Existing customer<select value={form.customerId} onChange={event => { const customer = links.customers.find(row => row.id === event.target.value); if (customer) setForm(current => ({ ...current, customerId: customer.id, customer: customer.displayName })); }}><option value="">Choose customer</option>{links.customers.map(row => <option key={row.id} value={row.id}>{row.displayName} · {row.customerNumber}</option>)}</select></label>}
        {links.vehicles.length > 0 && <label>Existing vehicle<select value={form.vehicleId} onChange={event => { const vehicle = links.vehicles.find(row => row.id === event.target.value); if (vehicle) setForm(current => ({ ...current, vehicleId: vehicle.id, vehicle: [vehicle.year, vehicle.make, vehicle.model, vehicle.stockNumber || vehicle.vin].filter(Boolean).join(" ") })); }}><option value="">Choose vehicle</option>{links.vehicles.map(row => <option key={row.id} value={row.id}>{row.year} {row.make} {row.model} · {row.stockNumber || row.vin}</option>)}</select></label>}
        <label>Customer name<input required maxLength={160} value={form.customer} readOnly={Boolean(form.customerId)} onChange={event => field("customer", event.target.value)} />{form.customerId && <button type="button" onClick={() => field("customerId", "")}>Change customer link</button>}</label>
        <label>Vehicle / VIN / stock number<input required maxLength={160} value={form.vehicle} readOnly={Boolean(form.vehicleId)} onChange={event => field("vehicle", event.target.value)} />{form.vehicleId && <button type="button" onClick={() => field("vehicleId", "")}>Change vehicle link</button>}</label>
        <small className={styles.wide}>Search reuses canonical records. Manual labels are allowed for historical tax records; they do not create another customer or vehicle.</small>
        {form.kind === "LEASE" ? <>
          {([["vehicleValue", "Agreed vehicle value"], ["rebates", "Manufacturer rebates"], ["residual", "Residual value"], ["trade", "Eligible owned trade-in allowance"], ["taxableAdditions", "Taxable additions"], ["rentCharge", "Taxable rent / finance charge"]] as const).map(([key, title]) => <label key={key}>{title} ($)<input type="number" min="0" max="10000000" step="0.01" required value={form[key]} onChange={event => field(key, event.target.value)} /></label>)}
          <p className={styles.wide}>Do not subtract cash down payments. Exclude finance charges attributable to financed tax. Verify trade-in eligibility and taxable additions with your reviewer.</p>
          <label>Signed contract tax ($)<input type="number" min="0" step="0.01" value={form.contractTax} onChange={event => field("contractTax", event.target.value)} /><small>May be left pending; a mismatch must be resolved before filing confirmation.</small></label>
          <label>Principal garaging address<input maxLength={240} value={form.garageAddress} onChange={event => field("garageAddress", event.target.value)} /></label>
          <fieldset className={styles.wide}><legend>Local taxes · enter each Minnesota reporting code separately</legend>{form.localTaxes.map((line, index) => <div className={styles.form} key={index}>
            <label>Jurisdiction / reporting code<input required maxLength={80} value={line.code} onChange={event => localTaxes(lines => lines.map((item, position) => position === index ? { ...item, code: event.target.value } : item))} /></label>
            <label>Rate (%)<input required type="number" min="0" max="10" step="0.00001" value={line.rate} onChange={event => localTaxes(lines => lines.map((item, position) => position === index ? { ...item, rate: event.target.value } : item))} /></label>
            <button type="button" onClick={() => localTaxes(lines => lines.filter((_, position) => position !== index))}>Remove local line {index + 1}</button>
          </div>)}<button type="button" disabled={form.localTaxes.length >= 8} onClick={() => localTaxes(lines => [...lines, { code: "", rate: "" }])}>Add local tax line</button><p><a href="https://www.revenue.state.mn.us/sales-tax-rate-calculator" target="_blank" rel="noreferrer">Check Minnesota rates for the garaging address</a></p></fieldset>
          <label className={`${styles.wide} ${styles.check}`}><input type="checkbox" checked={form.localConfirmed} onChange={event => field("localConfirmed", event.target.checked)} />I verified local codes/rates for this address and date, including if no local tax applies.</label>
          <label className={`${styles.wide} ${styles.check}`}><input type="checkbox" checked={form.qualified} onChange={event => field("qualified", event.target.checked)} />Reviewed as an eligible upfront-tax lease, not a short-term rental, unresolved renewal or other exception.</label>
          {preview && <div className={`${styles.wide} ${styles.notice}`}><strong>Taxable lease price {moneyLabel(preview.baseCents)} · Total upfront tax {moneyLabel(preview.taxCents)}</strong>{preview.lines.map(line => <p key={line.code}>{line.code} · {line.rate}% · {moneyLabel(line.taxCents)}</p>)}{preview.flags.map(flag => <p key={flag}>{flag}</p>)}</div>}
        </> : <p className={styles.wide}>Vehicle sales are tracked separately. No vehicle-sale tax is added to this lease Sales & Use Tax worksheet. Verify MVST and title processing through DVS/deputy registrar.</p>}
        <label className={styles.wide}>Source document reference / notes (optional)<textarea maxLength={2000} value={form.notes} onChange={event => field("notes", event.target.value)} /></label>
        <div className={`${styles.wide} ${styles.actions}`}><button type="submit" disabled={busy || loading}>{busy ? "Saving…" : editing ? "Save correction" : "Save contract"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(blank()); }}>Cancel edit</button>}</div>
      </form>}
    </section>}
    {view === "Monthly worksheet" && model && <section className={styles.panel}><h2>{month} · Lease-only preparation worksheet</h2><p>{model.summary.leaseCount} leases · {model.summary.saleCount} vehicle sales (excluded) · {model.summary.needsReview} leases need review</p>
      {model.summary.lines.map(line => <p key={`${line.code}:${line.rate}`}><strong>{line.code}</strong> · taxable {moneyLabel(line.baseCents)} × {line.rate}% · {moneyLabel(line.taxCents)}</p>)}<h3>Total upfront lease tax: {moneyLabel(model.summary.totalCents)}</h3>
      <div className={styles.actions}><button onClick={exportCsv}>Download CSV</button><a href={`/compliance/tax/print?month=${month}`} target="_blank" rel="noreferrer">Print worksheet</a><a href="https://www.mndor.state.mn.us/tp/eservices/" target="_blank" rel="noreferrer">Open Minnesota e-Services</a></div>
      {!model.records.length && <p>No contracts recorded for this period. A zero lease total is not a confirmation that the complete return is zero.</p>}
      {model.records.map(row => <article className={styles.row} key={row.id}><div><strong>{row.reference} · {row.kind} · {row.status}</strong><p>{row.snapshot.input.customer} · {row.snapshot.input.vehicle}</p><p>{row.snapshot.input.date} · {row.kind === "LEASE" ? moneyLabel(row.snapshot.taxCents) : "DVS register only"}</p>{row.snapshot.flags.map(flag => <p className={styles.flag} key={flag}>{flag}</p>)}</div><div className={styles.actions}><button onClick={() => setDetail(row)}>Review saved contract</button>{!locked && row.status === "ACTIVE" && <><button disabled={busy} onClick={() => edit(row)}>Edit</button><button disabled={busy} onClick={() => setVoiding(row)}>Void</button></>}</div></article>)}
      {voiding && <form className={styles.form} onSubmit={async event => { event.preventDefault(); const reason = new FormData(event.currentTarget).get("reason"); if (await execute({ action: "VOID", id: voiding.id, version: voiding.version, reason }, "Record voided; history retained.")) setVoiding(null); }}><label>Reason for voiding {voiding.reference}<input name="reason" required maxLength={500} /></label><div className={styles.actions}><button type="submit" disabled={busy}>Confirm void</button><button type="button" onClick={() => setVoiding(null)}>Cancel</button></div></form>}
      {detail && <section className={styles.panel}><h3>Saved details · {detail.reference}</h3><dl>{Object.entries(detail.snapshot.input).filter(([, value]) => typeof value !== "object").map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{typeof value === "boolean" ? value ? "Confirmed" : "Pending" : String(value || "Not recorded")}</dd></div>)}</dl><p>Rule version: {detail.snapshot.policy}</p><button onClick={() => setDetail(null)}>Close details</button></section>}
      {locked ? <p>Filed {model.period?.filedAt} · confirmation {model.period?.filingReference}{model.period?.status === "PAID" ? ` · paid ${model.period.paidAt} · ${model.period.paymentReference}` : " · payment confirmation pending"}. Original records and totals are locked.</p> : <form className={styles.form} onSubmit={event => confirmation(event, "FILE")}><h3 className={styles.wide}>After you file externally</h3><p className={styles.wide}>This action only records evidence. It does not submit a return. Reconcile other sales/use tax return lines separately.</p><label>Actual filing date<input required name="date" type="date" min={`${month}-01`} max={moneyToday()} defaultValue={moneyToday()} /></label><label>e-Services confirmation reference<input required name="reference" maxLength={160} /></label><label className={`${styles.wide} ${styles.check}`}><input required name="reviewed" type="checkbox" />I reviewed the contracts, local lines and period, and have filed externally.</label><button type="submit" disabled={busy || loading || model.summary.needsReview > 0}>Record filing confirmation & lock worksheet</button></form>}
      {model.period?.status === "FILED" && <form className={styles.form} onSubmit={event => confirmation(event, "PAY")}><h3 className={styles.wide}>After payment is confirmed externally</h3><label>Payment date<input required name="date" type="date" min={`${month}-01`} max={moneyToday()} defaultValue={moneyToday()} /></label><label>Payment confirmation reference<input required name="reference" maxLength={160} /></label><label>Lease worksheet amount paid ($)<input required name="amount" type="number" min="0" step="0.01" defaultValue={(model.summary.totalCents / 100).toFixed(2)} /></label><button type="submit" disabled={busy || loading}>Record payment confirmation</button></form>}
    </section>}
    {view === "History" && model && <section className={styles.panel}><h2>Period history · latest 100 events</h2>{!model.history.length && <p>No recorded actions.</p>}{model.history.map(event => <details key={event.id}><summary>{new Date(event.createdAt).toLocaleString("en-US", { timeZone: "America/Chicago" })} · {event.action} · staff {event.actorId}</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(event.details, null, 2)}</pre></details>)}</section>}
    <footer className={styles.boundary}><a href={LEASE_TAX_SOURCE} target="_blank" rel="noreferrer">Minnesota lease-tax guidance</a> · State rate 6.875%; local rates require date/address verification. No automatic filing, tax payments, bank transfers or accounting postings. Licenses, permits, use-tax purchases, amendments and rental/renewal calculations are not included in this first tool.</footer>
  </main>;
}
