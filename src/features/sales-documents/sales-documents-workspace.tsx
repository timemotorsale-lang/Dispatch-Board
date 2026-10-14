"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Search, Plus, X, Download, Eye, Check, RefreshCw, FileText, FolderOpen } from "lucide-react";
import { SALES_DOCUMENT_PATHWAYS, type SalesDocumentPathway } from "@/lib/sales-document-pathways";
import type { SalesDocumentJacketView } from "@/server/sales-documents/service";
import styles from "./sales-documents-workspace.module.css";

const stateLabel = (state: string) => ({ WORKING: "Working", CHECKED_OUT: "Checked out", CLOSED: "Closed", DELIVERED_FUNDING_PENDING: "Funding pending" }[state] ?? state);

export function SalesDocumentsWorkspace({ initialJackets, initialSelected, initialError, canWaive, initialQuery = "", customerId = "" }: { initialJackets: SalesDocumentJacketView[]; initialSelected: SalesDocumentJacketView | null; initialError: string; canWaive: boolean; initialQuery?: string; customerId?: string }) {
  const [jackets, setJackets] = useState(initialJackets), [selected, setSelected] = useState(initialSelected);
  const [query, setQuery] = useState(initialQuery), [pathway, setPathway] = useState("");
  const [error, setError] = useState(initialError), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false), [tab, setTab] = useState<"working" | "final">("working");
  const newJacketReference = useRef("");
  const [reviewing, setReviewing] = useState<SalesDocumentJacketView["documents"][number] | null>(null);
  const [waiving, setWaiving] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false), [adding, setAdding] = useState(false);

  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "This action could not be completed.");
    return payload;
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(""); setMessage("");
    try { await action(); } catch (caught) { setError(caught instanceof Error ? caught.message : "This action could not be completed."); }
    finally { setBusy(false); }
  }
  function accept(jacket: SalesDocumentJacketView) {
    setSelected(jacket); setJackets((current) => [jacket, ...current.filter((item) => item.id !== jacket.id)]);
    const url = new URL(window.location.href);
    url.searchParams.set("jacketId", jacket.id);
    window.history.replaceState(null, "", url);
  }
  async function refreshList() {
    await run(async () => { setJackets(await request(`/api/sales-documents?q=${encodeURIComponent(query)}&pathway=${encodeURIComponent(pathway)}&customerId=${encodeURIComponent(customerId)}`)); });
  }
  async function open(id: string) {
    await run(async () => { accept(await request(`/api/sales-documents/${encodeURIComponent(id)}`)); setTab("working"); setReviewing(null); setWaiving(null); });
  }
  async function update(body: Record<string, unknown>) {
    if (!selected) return;
    await run(async () => {
      accept(await request(`/api/sales-documents/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, revision: selected.revision }) }));
      setReviewing(null); setWaiving(null); setFinalizing(false); setAdding(false); setMessage("Saved.");
    });
  }
  async function create(form: FormData) {
    await run(async () => {
      accept(await request("/api/sales-documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(form), dealReference: newJacketReference.current }) }));
      setCreating(false); setTab("working"); setMessage("Deal jacket created.");
    });
  }
  async function upload(form: FormData) {
    if (!selected) return;
    const files = form.getAll("file").filter((file): file is File => file instanceof File && file.size > 0);
    if (!files.length) { setError("Choose a photo or document."); return; }
    await run(async () => {
      let current = selected, count = 0;
      for (const file of files) {
        const upload = new FormData(); upload.set("file", file); upload.set("revision", String(current.revision));
        upload.set("documentType", String(form.get("documentType") || "supplemental"));
        if (form.get("signed") === "true") upload.set("signed", "true");
        try { current = await request(`/api/sales-documents/${current.id}/documents`, { method: "POST", body: upload }); accept(current); count += 1; }
        catch (caught) { throw new Error(`${count} of ${files.length} files saved. ${file.name}: ${caught instanceof Error ? caught.message : "Upload failed."} Previously saved files remain available.`); }
      }
      setMessage(`${count} ${count === 1 ? "file" : "files"} saved. Pending staff review.`);
    });
  }
  const locked = selected && ["CLOSED", "DELIVERED_FUNDING_PENDING"].includes(selected.state);
  const blockers = selected?.checklist.filter((item) => item.blocker) ?? [];

  return <main className={styles.workspace}>
    <header className={styles.header}>
      <div><h1>Sales Documents</h1><span>{jackets.length} deal jackets</span></div>
      <div className={styles.actions}><Link href="/crm-next/deals">Back to Deals</Link>{!selected ? <button disabled={busy} onClick={() => { newJacketReference.current = crypto.randomUUID(); setCreating(true); }}><Plus size={16} /> New jacket</button> : null}</div>
    </header>
    {!selected ? <form className={styles.filters} onSubmit={(event) => { event.preventDefault(); void refreshList(); }}>
      <label className={styles.search}><Search size={16} /><input aria-label="Search customer, VIN, stock or deal number" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Customer, VIN, stock or deal number" /></label>
      <select aria-label="Pathway" value={pathway} onChange={(event) => setPathway(event.target.value)}><option value="">All pathways</option>{Object.entries(SALES_DOCUMENT_PATHWAYS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
      <button disabled={busy} type="submit">Search</button>
      <button title="Refresh jackets" aria-label="Refresh jackets" disabled={busy} onClick={() => void refreshList()} type="button"><RefreshCw size={16} /></button>
    </form> : null}
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <p aria-live="polite" className={styles.status}>{busy ? "Saving / loading..." : message}</p>
    <div className={`${styles.layout} ${selected ? styles.focused : ""}`}>
      {!selected ? <section className={styles.list} aria-label="Deal jackets">
        <table><thead><tr><th>Customer / Deal</th><th>Pathway / Vehicle</th><th>Status</th></tr></thead><tbody>
          {jackets.map((jacket) => <tr key={jacket.id}><td><button className={styles.open} disabled={busy} onClick={() => void open(jacket.id)}><FolderOpen size={16} /><strong>{jacket.customerName}</strong></button><small>{jacket.dealNumber}</small></td><td>{jacket.pathwayLabel}<small>{jacket.vehicleReference}</small></td><td><span className={styles.badge}>{stateLabel(jacket.state)}</span></td></tr>)}
        </tbody></table>
        {!jackets.length ? <p className={styles.empty}>No deal jackets found.</p> : null}
      </section> : null}
      <section className={styles.detail} aria-label="Selected deal jacket">
        {!selected ? <div className={styles.empty}><FileText size={28} /><h2>Deal jacket</h2><p>No jacket selected</p></div> : <>
          <header className={styles.detailHeader}><div><h2>{selected.customerName}</h2><p>{selected.dealNumber} · {selected.pathwayLabel}</p><small>{selected.vehicleReference}{selected.vin ? ` · ${selected.vin}` : ""}</small></div><span className={styles.badge}>{stateLabel(selected.state)}</span></header>
          <nav className={styles.tabs} aria-label="Packet views"><button aria-pressed={tab === "working"} onClick={() => setTab("working")}>Working Documents</button><button aria-pressed={tab === "final"} onClick={() => setTab("final")}>Final Packets ({selected.versions.length})</button></nav>
          {tab === "final" ? <section className={styles.versions}>
            {!selected.versions.length ? <p>No finalized packet yet.</p> : selected.versions.map((version) => <article key={version.id}><div><strong>Version {version.version} · {version.phase.toLowerCase()}</strong><p>{stateLabel(version.disposition)} · {new Date(version.finalizedAt).toLocaleString()}</p><small>Finalized by {version.finalizedBy}</small></div><div className={styles.actions}><a title="Download combined PDF" href={`/api/sales-documents/${selected.id}/export?version=${version.version}&format=pdf`}><FileText size={16} /> PDF</a><a title="Download original documents" href={`/api/sales-documents/${selected.id}/export?version=${version.version}&format=zip`}><Download size={16} /> Originals</a></div></article>)}
          </section> : <>
            <details className={styles.checklistDetails}><summary>{selected.phase === "RETURN" ? "Return checklist" : selected.phase === "CHECKOUT" ? "Checkout checklist" : "Closing checklist"} · {selected.checklist.filter((item) => item.ready).length}/{selected.checklist.length} reviewed</summary>
            <ul className={styles.checklist}>{selected.checklist.map((item) => <li key={item.id}><span className={item.ready ? styles.good : styles.pending}>{item.ready ? <Check size={16} /> : <FileText size={16} />}</span><div><strong>{item.label}</strong><small>{item.waiver ? `Exception: ${item.waiver.reason}` : item.ready ? "Reviewed" : item.required ? item.blocker : "If applicable"}</small></div>{!locked && !item.required ? <button disabled={busy} onClick={() => void update({ action: "APPLICABILITY", requirementId: item.id, required: true })}>Applicable</button> : null}{!locked && !item.ready && item.required && canWaive ? <button disabled={busy} onClick={() => setWaiving(item.id)}>Exception</button> : null}</li>)}</ul>
            {waiving ? <form className={styles.form} action={(form) => update({ action: "WAIVE", requirementId: waiving, note: form.get("note") })}><h3>Document exception</h3><label>Reason<textarea name="note" required maxLength={1000} /></label><div className={styles.actions}><button disabled={busy}>Approve exception</button><button disabled={busy} onClick={() => setWaiving(null)} type="button">Cancel</button></div></form> : null}</details>
            {!locked ? <form className={styles.form} action={upload}><h3>Add photos or documents</h3><div className={styles.formGrid}><label>Document type<select name="documentType" defaultValue="supplemental">{selected.requirements.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}<option value="supplemental">Additional document / photo</option></select></label><label>Files<input name="file" type="file" accept="application/pdf,image/png,image/jpeg" multiple required /></label></div><label className={styles.check}><input name="signed" value="true" type="checkbox" /> Signed copy</label><button disabled={busy}>Save files</button></form> : null}
            <div className={styles.sectionHeading}><h3>Saved documents</h3><span>{selected.documents.length}</span></div>
            <ul className={styles.documents}>{selected.documents.map((doc) => <li key={doc.id}><div><strong>{doc.fileName}</strong><small>{doc.source === "GENERATED" ? "Working form" : doc.signed ? "Signed copy" : "Uploaded"} · {doc.reviewed ? "Reviewed" : "Pending review"}</small></div><div className={styles.actions}><a aria-label={`Open ${doc.fileName}`} title="Open document" href={`/api/sales-documents/${selected.id}/documents/${doc.id}`} target="_blank" rel="noreferrer"><Eye size={16} /></a><a aria-label={`Download ${doc.fileName}`} title="Download document" href={`/api/sales-documents/${selected.id}/documents/${doc.id}?download=1`}><Download size={16} /></a>{!locked && !doc.reviewed ? <button title="Review document" aria-label={`Review ${doc.fileName}`} disabled={busy} onClick={() => setReviewing(doc)}><Check size={16} /></button> : null}</div></li>)}</ul>
            {reviewing ? <form className={styles.form} action={(form) => update({ action: "REVIEW", documentId: reviewing.id, documentType: form.get("documentType"), signed: form.get("signed") === "true" })}><h3>Review {reviewing.fileName}</h3><label>Document type<select name="documentType" defaultValue={reviewing.type}>{selected.requirements.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}<option value="supplemental">Additional document / photo</option></select></label><label className={styles.check}><input name="signed" type="checkbox" value="true" defaultChecked={reviewing.signed} disabled={reviewing.source === "GENERATED"} /> Required signatures verified</label><div className={styles.actions}><button disabled={busy}>Mark reviewed</button><button disabled={busy} onClick={() => setReviewing(null)} type="button">Cancel</button></div></form> : null}
            <div className={styles.finalize}>{locked ? <button disabled={busy} onClick={() => setAdding(true)}>Open addendum</button> : <button disabled={busy} onClick={() => setFinalizing(true)}><Check size={16} />{selected.phase === "RETURN" ? "Finalize return packet" : selected.phase === "CHECKOUT" ? "Finalize checkout packet" : "Finalize packet"}</button>}<span>{!locked ? `${blockers.length} required items pending` : `Final packet version ${selected.versions[0]?.version ?? ""}`}</span></div>
            {adding ? <form className={styles.form} action={(form) => update({ action: "ADDENDUM", note: form.get("note") })}><label>Addendum reason<textarea required name="note" maxLength={1000} /></label><div className={styles.actions}><button disabled={busy}>Open addendum</button><button onClick={() => setAdding(false)} type="button">Cancel</button></div></form> : null}
            {finalizing ? <form className={styles.form} action={(form) => update({ action: "FINALIZE", disposition: form.get("disposition"), note: form.get("note") })}><h3>Finalize {selected.phase.toLowerCase()} packet</h3>{["outside-finance-one-pay", "finance"].includes(selected.pathway) ? <label>Disposition<select name="disposition"><option value="CLOSED">Closed - funding complete</option>{canWaive ? <option value="DELIVERED_FUNDING_PENDING">Delivered - funding pending</option> : null}</select></label> : null}<label>Closing note<textarea name="note" maxLength={1000} /></label><div className={styles.actions}><button disabled={busy}>Finalize packet</button><button onClick={() => setFinalizing(false)} type="button">Cancel</button></div></form> : null}
          </>}
          <form className={styles.form} action={(form) => update({ action: "NOTE", note: form.get("note") })}><label>Add update<textarea name="note" required maxLength={1000} /></label><button disabled={busy}>Save update</button></form>
          <details className={styles.history}><summary>Staff history</summary>{selected.history.map((event) => <p key={event.id}><strong>{event.note}</strong><small>{event.actorId} · {new Date(event.at).toLocaleString()}</small></p>)}</details>
        </>}
      </section>
    </div>
    {creating ? <div className={styles.backdrop}><section role="dialog" aria-modal="true" aria-label="New deal jacket" className={styles.dialog}><header><h2>New deal jacket</h2><button title="Close" aria-label="Close new jacket" disabled={busy} onClick={() => setCreating(false)}><X size={18} /></button></header><form className={styles.form} action={create}><label>Pathway<select name="pathway" defaultValue={"retail-sale" satisfies SalesDocumentPathway}>{Object.entries(SALES_DOCUMENT_PATHWAYS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Customer<input autoFocus name="customerName" required maxLength={240} /></label><label>Vehicle<input name="vehicleReference" required maxLength={240} /></label><div className={styles.formGrid}><label>Deal number<input name="dealNumber" /></label><label>VIN<input name="vin" maxLength={17} /></label><label>Stock number<input name="stockNumber" /></label></div><button disabled={busy}>Create jacket</button>{error ? <p role="alert" className={styles.error}>{error}</p> : null}</form></section></div> : null}
  </main>;
}
