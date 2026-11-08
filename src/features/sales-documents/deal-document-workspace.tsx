"use client";
import { useRef, useState } from "react";
import { DocumentReadingPanel } from "@/features/document-library/document-reading-panel";
import { assessSalesDocument } from "@/lib/sales-document-audit";
import { LIMITED_POA_ID, SECURE_POA_ID } from "@/lib/sales-document-pathways";
import type { SalesDocumentJacketView } from "@/server/sales-documents/service";
import { SalesDocumentScan } from "./sales-document-scan";
import styles from "./deal-document-workspace.module.css";

type Document = SalesDocumentJacketView["documents"][number];
export function DealDocumentWorkspace({ jacket, canManage, disabled = false, onSaved, onBusyChange, initialRequirementId = "", initialScan = false, phoneOrigin = "" }: {
  jacket: SalesDocumentJacketView; canManage: boolean; disabled?: boolean; onSaved: (jacket: SalesDocumentJacketView) => void;
  onBusyChange: (busy: boolean) => void; initialRequirementId?: string; initialScan?: boolean; phoneOrigin?: string;
}) {
  const [target, setTarget] = useState(initialRequirementId || (initialScan ? "supplemental" : "")), [scanning, setScanning] = useState(initialScan);
  const [reviewing, setReviewing] = useState<Document | null>(null), [correcting, setCorrecting] = useState<{ document: Document; replace: boolean } | null>(null);
  const [reviewType, setReviewType] = useState("");
  function startReview(doc: Document) { setReviewing(doc); setReviewType(doc.type); }
  const [auditDocument, setAuditDocument] = useState<Document | null>(null), [auditFile, setAuditFile] = useState<File | null>(null);
  const [auditResult, setAuditResult] = useState<ReturnType<typeof assessSalesDocument> | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const sending = useRef(false), auditSection = useRef<HTMLDetailsElement>(null);
  const locked = ["CLOSED", "DELIVERED_FUNDING_PENDING", "UNWIND_PENDING"].includes(jacket.state);
  const blocked = disabled || busy;
  const href = (doc: Document) => `/api/sales-documents/${encodeURIComponent(jacket.id)}/documents/${encodeURIComponent(doc.id)}`;
  async function request(url: string, init?: RequestInit) {
    const response = await fetch(url, init), body = await response.json();
    if (!response.ok) throw new Error(body.error || "The document action could not be completed. Refresh and retry.");
    return body as SalesDocumentJacketView;
  }
  async function run(action: () => Promise<void>) {
    if (sending.current) return; sending.current = true; setBusy(true); onBusyChange(true); setError(""); setMessage("");
    try { await action(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Document action failed. Your existing records remain saved."); }
    finally { sending.current = false; setBusy(false); onBusyChange(false); }
  }
  async function update(body: Record<string, unknown>) {
    const next = await request(`/api/sales-documents/${encodeURIComponent(jacket.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, revision: jacket.revision }) });
    onSaved(next); return next;
  }
  async function upload(form: FormData) {
    await run(async () => {
      const files = form.getAll("file").filter((file): file is File => file instanceof File && file.size > 0);
      if (!files.length) throw new Error("Choose a document to upload.");
      let current = jacket, count = 0;
      for (const file of files) {
        const body = new FormData(); body.set("file", file); body.set("documentType", target || "supplemental"); body.set("revision", String(current.revision));
        if (form.get("signed") === "true") body.set("signed", "true");
        try { current = await request(`/api/sales-documents/${encodeURIComponent(jacket.id)}/documents`, { method: "POST", body }); onSaved(current); count++; }
        catch (caught) { throw new Error(`${count} of ${files.length} files saved. Previously saved files remain available. ${caught instanceof Error ? caught.message : "Upload the remaining files again."}`); }
      }
      setTarget(""); setMessage("File uploaded. Staff acceptance is still needed.");
    });
  }
  async function openAudit(doc: Document) {
    await run(async () => {
      const response = await fetch(href(doc)); if (!response.ok) throw new Error("The saved original could not be opened for audit.");
      setAuditFile(new File([await response.blob()], doc.fileName, { type: doc.contentType })); setAuditDocument(doc); setAuditResult(null); if (auditSection.current) auditSection.current.open = true;
    });
  }
  const accepted = jacket.checklist.filter(item => item.ready).length;
  return <section className={styles.workspace} aria-label="Deal documents workspace">
    <section aria-label="Required documents and proofs"><header><h3>Required documents &amp; proofs</h3><span>{accepted}/{jacket.checklist.length} complete</span></header>
      <p>Upload into the matching requirement, then verify and accept the saved evidence.</p>
      {locked && <p role="status">Finalized packet preserved. {canManage && jacket.state !== "UNWIND_PENDING" ? "Open a correction addendum to replace or exclude an attachment." : "A manager must open corrections before changing attachments."}</p>}
      {locked && canManage && jacket.state !== "UNWIND_PENDING" && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(async () => { await update({ action: "ADDENDUM", note: form.get("note") }); setMessage("Correction addendum opened. Earlier final versions remain preserved."); }); }}><label>Correction reason<input name="note" required minLength={10} maxLength={1000} /></label><button disabled={blocked}>Open correction addendum</button></form>}
      <ul className={styles.requirements}>{jacket.checklist.map(item => {
        const doc = jacket.documents.find(doc => doc.type === item.id && doc.source !== "GENERATED") || jacket.documents.find(doc => doc.type === item.id);
        return <li key={item.id}><div><strong>{item.label}</strong><small>{item.waiver ? "Approved exception" : item.ready ? "Accepted" : doc?.reviewed ? "Correction needed" : doc ? "Uploaded — review needed" : item.required ? "Missing" : "Optional / if applicable"}</small>{doc && <a href={href(doc)} target="_blank" rel="noreferrer">{doc.fileName}</a>}</div><div className={styles.actions}>{!locked && <button type="button" disabled={blocked} onClick={() => { setTarget(item.id); setScanning(false); }}>Upload / scan</button>}{doc && <details><summary>File actions</summary><div className={styles.actions}>{!locked && <><button type="button" disabled={blocked} onClick={() => startReview(doc)}>Review &amp; accept</button><button type="button" disabled={blocked} onClick={() => setCorrecting({ document: doc, replace: true })}>Replace</button><button type="button" disabled={blocked} onClick={() => setCorrecting({ document: doc, replace: false })}>Uploaded by mistake</button></>}<button type="button" disabled={blocked} onClick={() => void openAudit(doc)}>Perform document review</button></div></details>}</div></li>;
      })}</ul>
      {!locked && <button type="button" disabled={blocked} onClick={() => setTarget("supplemental")}>Add supporting proof</button>}
      {!locked && target && <section className={styles.editor} aria-label="Upload deal proof"><h4>{jacket.requirements.find(item => item.id === target)?.label || "Supporting proof"}</h4><form onSubmit={event => { event.preventDefault(); void upload(new FormData(event.currentTarget)); }}><label>Proof file<input name="file" type="file" multiple required accept="application/pdf,image/jpeg,image/png" disabled={blocked} /></label><label><input name="signed" type="checkbox" value="true" /> Signed copy — acceptance requires staff verification</label><div className={styles.actions}><button disabled={blocked}>Upload proof</button><button type="button" disabled={blocked} onClick={() => setScanning(value => !value)}>Scan paper proof</button><button type="button" disabled={blocked} onClick={() => { setTarget(""); setScanning(false); }}>Cancel upload</button></div></form>{scanning && <SalesDocumentScan key={`${jacket.id}:${target}`} jacket={jacket} initialScan initialRequirementId={target} phoneOrigin={phoneOrigin} onSaved={next => { onSaved(next); setTarget(""); setScanning(false); }} onBusyChange={onBusyChange} />}</section>}
      {correcting && <form className={styles.editor} aria-label="Correct mistaken attachment" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget), correction = correcting; void run(async () => { await update({ action: "EXCLUDE_DOCUMENT", documentId: correction.document.id, note: form.get("note") }); setCorrecting(null); if (auditDocument?.id === correction.document.id) { setAuditFile(null); setAuditDocument(null); setAuditResult(null); } if (correction.replace) setTarget(correction.document.type); setMessage("Mistaken attachment excluded. It no longer counts toward this deal; history is preserved."); }); }}><h4>{correcting.replace ? "Replace" : "Exclude"} {correcting.document.fileName}</h4><p>The old file will stop counting toward requirements and future packets. Earlier final versions remain preserved.</p><label>Reason<textarea name="note" required minLength={10} maxLength={1000} /></label><div className={styles.actions}><button disabled={blocked}>{correcting.replace ? "Exclude & choose replacement" : "Confirm uploaded by mistake"}</button><button type="button" disabled={blocked} onClick={() => setCorrecting(null)}>Cancel correction</button></div></form>}
      {reviewing && <form className={styles.editor} aria-label="Accept deal document" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(async () => { await update({ action: "REVIEW", documentId: reviewing.id, documentType: reviewType, signed: form.get("signed") === "on", poaVerified: form.get("poaVerified") === "on" }); setReviewing(null); setMessage("Document accepted after staff review."); }); }}><h4>Review {reviewing.fileName}</h4><label>Reviewed document type<select value={reviewType} onChange={event => setReviewType(event.target.value)}>{jacket.requirements.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}<option value="supplemental">Supporting proof</option></select></label><a href={href(reviewing)} target="_blank" rel="noreferrer">Open original before accepting</a><label><input type="checkbox" required /> I checked the correct customer/vehicle, document type, every page and readability.</label><label><input name="signed" type="checkbox" required={jacket.requirements.some(item => item.id === reviewType && item.signed)} defaultChecked={reviewing.reviewed && reviewing.signed} disabled={reviewing.source === "GENERATED"} /> Required signatures verified</label>{[LIMITED_POA_ID, SECURE_POA_ID].includes(reviewType) && <label><input name="poaVerified" type="checkbox" required /> I verified the applicable authorized form, customer/VIN, signatures, disclosures, dates, original requirements and receiving-agency acceptance.</label>}<div className={styles.actions}><button disabled={blocked}>Accept reviewed document</button><button type="button" disabled={blocked} onClick={() => setReviewing(null)}>Cancel review</button></div></form>}
      {Boolean(jacket.excludedDocumentCount) && <p>{jacket.excludedDocumentCount} mistaken attachment(s) excluded. Correction reasons remain in deal history. Their original content is restricted to managers.</p>}
      <details><summary>All current files ({jacket.documents.length})</summary><ul>{jacket.documents.map(doc => <li key={doc.id}><a href={href(doc)} target="_blank" rel="noreferrer">{doc.fileName}</a> · {doc.reviewed ? "Reviewed" : "Review needed"}<div className={styles.actions}>{!locked && <><button type="button" disabled={blocked} onClick={() => startReview(doc)}>Review &amp; accept</button><button type="button" disabled={blocked} onClick={() => setCorrecting({ document: doc, replace: true })}>Replace</button><button type="button" disabled={blocked} onClick={() => setCorrecting({ document: doc, replace: false })}>Uploaded by mistake</button></>}<button type="button" disabled={blocked} onClick={() => void openAudit(doc)}>Perform document review</button></div></li>)}</ul></details>
    </section>
    <details ref={auditSection} className={styles.audit} open={Boolean(auditFile)}><summary>Document audit · optional</summary><p>Choose an already uploaded file. Review printed identity against this deal without uploading a second attachment. OCR does not verify signatures, contract terms, payments or completion.</p><label>Saved document<select value={auditDocument?.id || ""} disabled={blocked} onChange={event => { const doc = jacket.documents.find(item => item.id === event.target.value); if (doc) void openAudit(doc); }}><option value="">Choose a document to review</option>{jacket.documents.map(doc => <option key={doc.id} value={doc.id}>{doc.fileName}</option>)}</select></label>{auditFile && auditDocument && <DocumentReadingPanel key={auditDocument.id} purpose="SALES" label={`Audit · ${auditDocument.fileName}`} initialFile={auditFile} disabled={blocked} auditOnly applyLabel="Save document audit" onApply={async (reading, fields) => { if (reading.checksum !== auditDocument.checksum || !reading.jobId) throw new Error("This read belongs to a different original. Select this deal's saved file again."); const next = await update({ action: "DOCUMENT_AUDIT", documentId: auditDocument.id, jobId: reading.jobId }); setAuditResult(assessSalesDocument(fields, next)); setMessage("Audit recorded on this exact file. Document acceptance remains separate."); }} />}{auditResult && <section aria-label="Document audit findings"><h4>{auditResult.status}</h4><ul>{auditResult.checks.map(check => <li key={check.label}>{check.label}: {check.status} · Printed: {check.printed || "Not read"} · Deal: {check.expected || "Not recorded"}</li>)}</ul></section>}</details>
    <details><summary>Recent document reviews &amp; corrections</summary>{jacket.history?.filter(event => ["DOCUMENT_AUDIT_RECORDED", "DOCUMENT_EXCLUDED", "DOCUMENT_REVIEWED"].includes(event.action)).map(event => <p key={event.id}>{event.note}<br /><small>{event.actorId} · {new Date(event.at).toLocaleString()}</small></p>)}</details>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
