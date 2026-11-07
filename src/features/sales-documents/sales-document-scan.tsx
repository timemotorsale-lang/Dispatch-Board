"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Smartphone } from "lucide-react";
import { DocumentScanner } from "@/features/mobile-capture/document-scanner";
import { PurchasePdfPreview } from "@/features/inventory/purchase-pdf-preview";
import { MAX_SCAN_BYTES } from "@/features/mobile-capture/document-pdf";
import { phoneDocumentHandoff } from "@/lib/phone-document-handoff";
import { SECURE_POA_ID, SECURE_POA_GUIDANCE } from "@/lib/sales-document-pathways";
import type { SalesDocumentJacketView } from "@/server/sales-documents/service";
import styles from "./sales-documents-workspace.module.css";

export function SalesDocumentScan({ jacket, initialScan = false, initialRequirementId = "", phoneOrigin = "", onSaved, onBusyChange }: {
  jacket: SalesDocumentJacketView; initialScan?: boolean; initialRequirementId?: string; phoneOrigin?: string;
  onSaved: (jacket: SalesDocumentJacketView) => void; onBusyChange: (busy: boolean) => void;
}) {
  const locked = ["CLOSED", "DELIVERED_FUNDING_PENDING", "UNWIND_PENDING"].includes(jacket.state);
  const [scanner, setScanner] = useState(initialScan && !locked);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [name, setName] = useState("scanned-sales-document.pdf");
  const [documentType, setDocumentType] = useState(jacket.requirements.some(item => item.id === initialRequirementId) ? initialRequirementId : "supplemental");
  const [signed, setSigned] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [handoff, setHandoff] = useState("");
  const [qr, setQr] = useState("");
  const sending = useRef(false);
  const reviewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    reviewRef.current?.focus();
    const leaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", leaving);
    return () => { URL.revokeObjectURL(url); window.removeEventListener("beforeunload", leaving); };
  }, [file]);
  useEffect(() => {
    let cancelled = false;
    const url = phoneDocumentHandoff(window.location.origin, jacket.id, initialRequirementId) ??
      phoneDocumentHandoff(phoneOrigin, jacket.id, initialRequirementId);
    setHandoff(url ?? "");
    if (url) void import("@zxing/browser").then(({ BrowserQRCodeSvgWriter }) => {
      if (cancelled) return;
      const svg = new BrowserQRCodeSvgWriter().write(url, 180, 180);
      setQr("data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg)));
    }).catch(() => { if (!cancelled) setError("The phone QR code could not be prepared. Use the phone link instead."); });
    return () => { cancelled = true; };
  }, [jacket.id, phoneOrigin, initialRequirementId]);
  async function save() {
    if (sending.current || !file || !reviewed || locked) return;
    sending.current = true; setBusy(true); onBusyChange(true); setError(""); setReceipt("");
    const form = new FormData();
    form.set("file", file, name.trim().replace(/\.pdf$/i, "") + ".pdf");
    form.set("documentType", documentType);
    form.set("revision", String(jacket.revision));
    form.set("captureMethod", "DOCUMENT_SCAN");
    if (signed) form.set("signed", "true");
    try {
      const response = await fetch(`/api/sales-documents/${encodeURIComponent(jacket.id)}/documents`, { method: "POST", body: form });
      const body = await response.json();
      if (response.status === 409) {
        const refreshed = await fetch(`/api/sales-documents/${encodeURIComponent(jacket.id)}`, { cache: "no-store" });
        if (refreshed.ok) onSaved(await refreshed.json());
      }
      if (!response.ok) throw new Error(body.error || "The scan could not be saved.");
      onSaved(body);
      setFile(null); setReviewed(false); setSigned(false);
      setReceipt("Scan saved to this deal jacket. Pending staff review.");
    } catch (failure) {
      setError(`${failure instanceof Error ? failure.message : "Upload interrupted."} Your scan remains here. Retry the same file to recover safely.`);
    } finally { sending.current = false; setBusy(false); onBusyChange(false); }
  }
  return <section className={styles.form} aria-label="Optional sales document scanning">
    <h3>Scan sales documents · optional</h3>
    <p>Capture paper pages, straighten and reorder them, then review a single PDF before attaching it to this deal.</p>
    <div className={styles.actions}><button type="button" disabled={busy || locked || Boolean(file)} onClick={() => { setReceipt(""); setScanner(true); }}><Camera size={18} />Scan paper documents</button></div>
    <details><summary><Smartphone size={16} /> Continue scanning on a phone</summary>
      {handoff ? <><p>Open this deal on your phone and sign in with your staff account. The link grants no additional access.</p>{qr && <Image unoptimized src={qr} width={180} height={180} alt="QR code to open this deal scanner on your phone" />}<a href={handoff}>Open phone scanning link</a></> : <p>Phone scanning needs this app’s reachable HTTPS address. Localhost points to the phone itself. Open the secure app address on your phone, or configure AUTH_PUBLIC_BASE_URL for the local review environment.</p>}
    </details>
    {locked && <p role="status">This jacket is finalized or under unwind review. A manager must open the appropriate correction workflow before adding a scan.</p>}
    {file && <div ref={reviewRef} tabIndex={-1} aria-label="Review scanned sales document">
      <p><strong>{jacket.customerName}</strong> · {jacket.dealNumber} · {jacket.vin || jacket.vehicleReference}</p>
      <p>{(file.size / 1024 / 1024).toFixed(2)} MB · PDF · held in this session until saved</p>
      <PurchasePdfPreview file={file} label="Scanned sales document preview" />
      {preview && <a href={preview} target="_blank" rel="noreferrer">Open PDF in your device’s viewer</a>}
      <fieldset disabled={busy || locked} className={styles.form}>
        <label>Document name<input maxLength={180} value={name} onChange={event => setName(event.target.value)} /></label>
        <label>Document type<select aria-label="Document type" value={documentType} onChange={event => { setDocumentType(event.target.value); setReviewed(false); }}>{jacket.requirements.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}<option value="supplemental">Additional document / photo</option></select></label>
        {documentType === SECURE_POA_ID && <p>{SECURE_POA_GUIDANCE}</p>}
        <label className={styles.check}><input type="checkbox" checked={signed} onChange={event => setSigned(event.target.checked)} />Contains signatures · staff verification is still required</label>
        <label className={styles.check}><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I checked every page for readability, completeness, order and the correct customer / vehicle.</label>
        <div className={styles.actions}><button type="button" disabled={!reviewed || !name.trim()} onClick={() => void save()}>{busy ? "Saving scan…" : "Save scan to this deal"}</button><button type="button" onClick={() => { if (window.confirm("Discard this unsaved scan?")) { setFile(null); setReviewed(false); } }}>Discard scan</button></div>
      </fieldset>
    </div>}
    {receipt && <p role="status" className={styles.status}>{receipt}</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {scanner && <DocumentScanner initialPaperSize="LETTER" onClose={() => setScanner(false)} onComplete={scanned => {
      if (scanned.type !== "application/pdf" || !scanned.size || scanned.size > MAX_SCAN_BYTES) { setError("Choose a readable PDF up to 25 MB."); return; }
      setFile(scanned); setScanner(false); setReviewed(false); setError("");
    }} />}
  </section>;
}
