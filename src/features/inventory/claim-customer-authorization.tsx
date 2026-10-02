"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Download, FileText, Printer, Upload, X } from "lucide-react";
import { CLAIM_AUTHORIZATION_CLAUSES, CLAIM_AUTHORIZATION_HEADER, claimPermissionStatus, type ClaimPermissionCategory } from "@/lib/claim-customer-authorization";
import type { ClaimReadModel } from "@/server/claims-workspace/service";
import styles from "./claim-repair-workflow.module.css";

export function ClaimCustomerAuthorization({ model, open, onOpen, onClose }: { model: ClaimReadModel; open: boolean; onOpen: () => void; onClose: () => void }) {
  const [pdf, setPdf] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [capacity, setCapacity] = useState("OWNER"); const close = useRef<HTMLButtonElement>(null);
  const endpoint = `/api/claims-workspace/claims/${encodeURIComponent(model.claim.id)}/authorization`;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null; close.current?.focus();
    return () => previous?.focus();
  }, [open]);
  async function preview() {
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error((await response.json()).error);
      setPdf(endpoint);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Packet could not be generated. Try again."); }
    finally { setBusy(false); }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget);
    for (const key of ["communicationSelected", "signatureVerified", "copyProvided", "directPaySelected"]) form.set(key, form.get(key) === "on" ? "true" : "false");
    form.set("category", "CLAIM_COMMUNICATION"); form.set("title", "Signed claim communication authorization and payment election");
    form.set("relationshipTargets", "CLAIM,CUSTOMER,VEHICLE");
    try {
      const response = await fetch(`/api/claims-workspace/claims/${encodeURIComponent(model.claim.id)}/evidence`, { method: "POST", body: form });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? result.message ?? "Signed upload could not be confirmed. Refresh before retrying.");
      window.location.reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Signed copy could not be recorded."); setBusy(false); }
  }
  async function withdraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "WITHDRAW", category: data.get("category"), reason: data.get("reason") }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error); window.location.reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Withdrawal could not be confirmed. Refresh before retrying."); setBusy(false); }
  }
  const status = (category: ClaimPermissionCategory) => claimPermissionStatus(model.evidence, category);
  const closed = model.claim.status === "CLOSED";
  return <section className={styles.root} aria-label="Customer claim permissions">
    <header className={styles.launcher}><h2>Customer permissions</h2><button onClick={onOpen} type="button"><FileText size={18} />Authorization packet</button></header>
    <dl className={styles.facts}><div><dt>Claim communication</dt><dd>{status("CLAIM_COMMUNICATION")}</dd></div><div><dt>Direction to pay</dt><dd>{status("CLAIM_DIRECT_PAY")}</dd></div><div><dt>Repair authorization</dt><dd>{model.evidence.some((item) => item.category === "AUTHORIZATION" && item.status === "RECEIVED" && item.documentLibraryId) ? "Separate document received" : "Separate approval required"}</dd></div></dl>
    {open ? <div className={styles.backdrop}><section className={`${styles.dialog} ${styles.packetDialog}`} role="dialog" aria-modal="true" aria-label="Claim customer authorization" onKeyDown={(event) => {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key === "Tab") {
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),iframe')].filter((control) => control.getClientRects().length > 0);
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
      }
    }}><header><h3>Claim customer authorization</h3><button ref={close} aria-label="Close authorization packet" disabled={busy} onClick={onClose} type="button"><X size={18} /></button></header>
      <p>Template review required before operational adoption.</p>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      <div className={styles.actions}><button disabled={busy} onClick={() => void preview()} type="button"><FileText size={16} />{busy ? "Working..." : "Generate / preview"}</button>{pdf ? <><a className={styles.link} href={pdf} target="_blank" rel="noopener noreferrer"><Printer size={16} />Open printable PDF</a><a className={styles.link} href={`${pdf}?download=1`} download="claim-customer-authorization.pdf"><Download size={16} />Download</a></> : null}</div>
      {pdf ? <article className={styles.packetPreview} aria-label="Unsigned claim authorization preview">
        <header><div><strong>{CLAIM_AUTHORIZATION_HEADER.name}</strong><p>{CLAIM_AUTHORIZATION_HEADER.address}<br />{CLAIM_AUTHORIZATION_HEADER.phone} | {CLAIM_AUTHORIZATION_HEADER.website}<br />{CLAIM_AUTHORIZATION_HEADER.email}</p></div></header>
        <h3>Claim Communication Authorization and Direction to Pay</h3>
        <div className={styles.packetFacts}>
          <p>Customer: {model.claim.customerName} | Phone: {model.claim.customerPhone || "Not provided"}</p>
          <p>Email: {model.claim.customerEmail || "Not provided"}</p>
          <p>Address: {[model.claim.customerAddressLine1, model.claim.customerAddressLine2, model.claim.customerCity, model.claim.customerState, model.claim.customerPostalCode].filter(Boolean).join(", ") || "Not provided"}</p>
          <p>Vehicle: {[model.claim.vehicleYear, model.claim.vehicleMake, model.claim.vehicleModel].filter(Boolean).join(" ")} | VIN: {model.claim.vehicleVin || "Not provided"}</p>
          <p>Insurer: {model.claim.carrierName || "Not provided"} | Claim: {model.claim.claimNumber || "Pending"} | Loss date: {model.claim.lossDate || "Not provided"}</p>
          <p>Policy: {model.claim.policyNumber || "Not provided"} | Lienholder (if applicable): ____________________</p>
        </div>
        {CLAIM_AUTHORIZATION_CLAUSES.map(([title, content]) => <section key={title}><h4>{title}</h4><p>{content}</p></section>)}
        <p><strong>[ ] I also request direct payment as described in section 3 (optional).</strong></p>
        <p>Printed signer name: ____________________<br />Capacity: Owner / Authorized representative<br />Representative&apos;s authority: ____________________</p>
        <p>Customer / authorized signer signature: ____________________ Date: __________<br />Dealership representative: ____________________ Copy provided on: __________</p>
      </article> : null}
      <h3>Verify signed copy</h3><form onSubmit={upload}><fieldset disabled={busy || closed}>
        <label>Signed PDF<input name="file" type="file" accept="application/pdf,.pdf" required /></label>
        <label>Printed signer name<input name="signer" required maxLength={200} defaultValue={model.claim.customerName} /></label>
        <label>Signer capacity<select name="capacity" value={capacity} onChange={(event) => setCapacity(event.target.value)}><option value="OWNER">Vehicle owner</option><option value="AUTHORIZED_REPRESENTATIVE">Authorized representative</option></select></label>
        {capacity === "AUTHORIZED_REPRESENTATIVE" ? <label>Authority to sign<input name="authorityDetails" required maxLength={500} /></label> : null}
        <label>Signature date<input name="signedDate" type="date" required max={new Date().toISOString().slice(0, 10)} /></label>
        <label className={styles.checkbox}><input name="communicationSelected" type="checkbox" required />Signed communication permission verified</label>
        <label className={styles.checkbox}><input name="directPaySelected" type="checkbox" />Customer selected the optional direction to pay</label>
        <label className={styles.checkbox}><input name="signatureVerified" type="checkbox" required />Customer signature and signer authority verified</label>
        <label className={styles.checkbox}><input name="copyProvided" type="checkbox" required />Copy provided to the customer</label>
      </fieldset><button disabled={busy || closed} type="submit"><Upload size={16} />Record verified signed copy</button></form>
      <details><summary>Record customer withdrawal</summary><form onSubmit={withdraw}><fieldset disabled={busy || closed}><label>Permission<select name="category"><option value="CLAIM_COMMUNICATION">Claim communication</option><option value="CLAIM_DIRECT_PAY">Direction to pay</option></select></label><label>Customer request / reason<textarea name="reason" required minLength={10} maxLength={1000} rows={3} /></label></fieldset><button disabled={busy || closed} type="submit">Record withdrawal</button></form></details>
    </section></div> : null}
  </section>;
}
