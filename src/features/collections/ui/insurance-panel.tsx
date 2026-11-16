"use client";

import { useState } from "react";

import { formValues, Panel, useAccountAction, type AccountDetail } from "./account-workspace";
import { formatWhen, label, uploadAccountDocument } from "./client-api";
import styles from "./collections.module.css";

type Prefill = { carrier?: string | null; policyNumber?: string | null; effectiveDate?: string | null; expirationDate?: string | null; lienholderListed?: boolean | null; notes?: string[]; unavailable?: string };

const BADGE: Record<string, string> = { VERIFIED: "badgeGood", EXPIRED: "badgeBad", MISSING: "badgeBad", EXPIRING_SOON: "badgeWarn" };

/** Account page: current insurance, add proof (with optional card reading), verify, mark missing. */
export function InsurancePanel({ d }: { d: AccountDetail }) {
  const { busy, run, feedback, setError } = useAccountAction(d.account.id);
  const ins = d.insurance;
  const status: string = ins?.effectiveStatus ?? "UNKNOWN";
  const [proofId, setProofId] = useState("");
  const [proofName, setProofName] = useState("");
  const [reading, setReading] = useState(false);
  const [form, setForm] = useState({ carrier: "", policyNumber: "", effectiveDate: "", expirationDate: "", lienholderListed: "" });
  const [hints, setHints] = useState<string[]>([]);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: e.target.value }));

  async function upload(file: File | undefined, readCard: boolean) {
    if (!file) return;
    setReading(true); setError(""); setHints([]);
    try {
      const result = await uploadAccountDocument(d.account.id, file, "INSURANCE_PROOF", { ocr: readCard });
      setProofId(result.documentId); setProofName(file.name);
      const p = (result.prefill ?? null) as Prefill | null;
      if (p?.unavailable) setHints([p.unavailable]);
      else if (p) {
        setForm(f => ({
          carrier: f.carrier || p.carrier || "", policyNumber: f.policyNumber || p.policyNumber || "",
          effectiveDate: f.effectiveDate || p.effectiveDate || "", expirationDate: f.expirationDate || p.expirationDate || "",
          lienholderListed: f.lienholderListed || (p.lienholderListed === true ? "YES" : "")
        }));
        setHints(["Filled in from the card. Check every field before saving.", ...(p.notes ?? [])]);
      }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setReading(false); }
  }

  function reset() { setProofId(""); setProofName(""); setHints([]); setForm({ carrier: "", policyNumber: "", effectiveDate: "", expirationDate: "", lienholderListed: "" }); }

  return (
    <Panel id="insurance" title="Insurance">
      {feedback}
      <div className={styles.card}>
        <p><span className={`${styles.badge} ${BADGE[status] ? styles[BADGE[status]] : ""}`}>{status === "UNKNOWN" ? (ins && ins.status !== "MISSING" ? "Not verified yet" : "Nothing on file") : label(status)}</span></p>
        {ins && ins.status !== "MISSING" ? (
          <dl className={styles.dl}>
            <dt>Carrier</dt><dd>{ins.carrier ?? "—"}</dd>
            <dt>Policy</dt><dd>{ins.policyNumber ?? "—"}</dd>
            <dt>Dates</dt><dd>{ins.effectiveDate ?? "?"} to {ins.expirationDate ?? "?"}</dd>
            <dt>Lienholder listed</dt><dd>{ins.lienholderListed === true ? "Yes" : ins.lienholderListed === false ? "No" : "Not checked"}</dd>
            <dt>Proof</dt><dd>{ins.proofFileName ? <a href={`/api/collections/accounts/${encodeURIComponent(d.account.id)}/documents/${encodeURIComponent(ins.proofDocumentId)}`} target="_blank" rel="noreferrer">{ins.proofFileName}</a> : "No proof uploaded"}</dd>
            <dt>Verified</dt><dd>{ins.verifiedAt ? formatWhen(ins.verifiedAt) : "No"}</dd>
          </dl>
        ) : ins ? <p>Marked missing: {ins.notes}</p> : null}
        {d.snapshot?.dmsInsuranceStatus ? <p className={styles.muted}>DealerCenter says: {d.snapshot.dmsInsuranceStatus} (for reference only)</p> : null}
      </div>

      {d.permissions?.isAdmin && ins && ins.status !== "VERIFIED" && ins.status !== "MISSING" && ins.proofDocumentId ? (
        <form className={styles.form} onSubmit={event => void run("VERIFY_INSURANCE", { recordId: ins.id, ...formValues(event) })}>
          <label className={styles.wide}><input type="checkbox" name="lienholderConfirmed" value="true" required /> I checked the proof: the dealership is listed as lienholder / loss payee, and the dates are right.</label>
          <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy}>Mark verified</button></div>
        </form>
      ) : null}

      <h3>Add new proof of insurance</h3>
      {d.textedPhotos?.length ? (
        <div className={styles.actions}>
          <span className={styles.muted}>Photos the customer texted:</span>
          {d.textedPhotos.map((p: { inboundMessageId: string; mediaIndex: number; receivedAt: string; savedDocumentId: string | null }) => (
            <button key={`${p.inboundMessageId}-${p.mediaIndex}`} type="button" disabled={busy}
              onClick={async () => { if (p.savedDocumentId) { setProofId(p.savedDocumentId); setProofName(`texted photo ${formatWhen(p.receivedAt)}`); return; } const r = await run("SAVE_TEXTED_PHOTO", { inboundMessageId: p.inboundMessageId, mediaIndex: p.mediaIndex }) as { documentId?: string } | null; if (r?.documentId) { setProofId(r.documentId); setProofName(`texted photo ${formatWhen(p.receivedAt)}`); } }}>
              Use photo from {formatWhen(p.receivedAt)}
            </button>
          ))}
        </div>
      ) : null}
      <form className={styles.form} onSubmit={event => { event.preventDefault(); void run("ADD_INSURANCE", { ...form, proofDocumentId: proofId, source: proofId ? "CARD_PHOTO" : "PHONE", notes: new FormData(event.currentTarget).get("notes") }, reset); }}>
        <label className={styles.wide}>Card photo or insurer document (PDF, JPEG or PNG)
          <input type="file" accept="application/pdf,image/jpeg,image/png" disabled={reading} onChange={e => void upload(e.target.files?.[0], (e.currentTarget.form?.elements.namedItem("readCard") as HTMLInputElement | null)?.checked ?? false)} />
        </label>
        <label className={styles.wide}><input type="checkbox" name="readCard" defaultChecked /> Read the card and fill in the fields for me (I&apos;ll check them)</label>
        {reading ? <p className={`${styles.muted} ${styles.wide}`} role="status">Uploading and reading the card…</p> : null}
        {proofId ? <p className={`${styles.notice} ${styles.wide}`}>Proof attached: {proofName}</p> : null}
        {hints.map(h => <p key={h} className={`${styles.warning} ${styles.wide}`}>{h}</p>)}
        <label>Carrier<input value={form.carrier} onChange={set("carrier")} /></label>
        <label>Policy number<input value={form.policyNumber} onChange={set("policyNumber")} /></label>
        <label>Start date<input type="date" value={form.effectiveDate} onChange={set("effectiveDate")} /></label>
        <label>Expiration date<input type="date" value={form.expirationDate} onChange={set("expirationDate")} required /></label>
        <label>Dealership listed as lienholder?<select value={form.lienholderListed} onChange={set("lienholderListed")}><option value="">Not checked</option><option value="YES">Yes</option><option value="NO">No</option></select></label>
        <label>Notes<input name="notes" /></label>
        <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} disabled={busy || reading}>Save insurance</button></div>
      </form>

      <h3>Customer has no insurance</h3>
      <form className={styles.form} onSubmit={event => { const f = event.currentTarget; void run("MARK_INSURANCE_MISSING", formValues(event), () => f.reset()); }}>
        <label className={styles.wide}>What happened<input name="notes" required minLength={5} placeholder="Customer says the policy lapsed on 11/1" /></label>
        <div className={`${styles.actions} ${styles.wide}`}><button disabled={busy}>Mark insurance missing</button></div>
      </form>
    </Panel>
  );
}
