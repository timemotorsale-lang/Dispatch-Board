"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { notifyRepairReviewSaved } from "@/lib/repair-workflow-review";
import styles from "./repair-workflow.module.css";
export function RepairHandoffTool({ repairOrderId, vehicleId, internal, closed }: { repairOrderId: string; vehicleId: string; internal: boolean; closed: boolean }) {
  const [recipient, setRecipient] = useState(""), [odometer, setOdometer] = useState(""), [evidence, setEvidence] = useState(""), [keys, setKeys] = useState(false), [checked, setChecked] = useState(false);
  const [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const pending = useRef<{ signature: string; body: Record<string, unknown> } | null>(null);
  async function command(action: string) {
    if (busy) return; setBusy(true); setNotice("");
    try {
      const references = evidence.split("\n").map(value => value.trim()).filter(Boolean);
      if (action !== "GENERATE_INVOICE_PACKAGE" && (!checked || !keys || !references.length)) throw new Error("Verify the handoff and keys, then enter actual evidence references.");
      const values = action === "READINESS" ? { checks: [{ code: "HANDOFF_VERIFIED", label: "Vehicle, keys, destination and handoff evidence verified", passed: checked && keys, evidence: references }], reason: "Verify current repair release and handoff readiness." } : action === "CLOSE_REPAIR_ORDER" ? { action, finalOdometer: odometer === "" ? null : Number(odometer), handoffEvidence: references, keysVerified: keys, recipientName: recipient, reason: "Record final repair closeout and accountable vehicle handoff." } : { action, reason: "Reconcile the current repair financial package before closeout." };
      if (action === "CLOSE_REPAIR_ORDER" && (!recipient.trim() || odometer === "")) throw new Error("Enter the receiving person and final odometer.");
      const signature = JSON.stringify(values);
      if (pending.current?.signature !== signature) pending.current = { signature, body: { ...values, idempotencyKey: crypto.randomUUID(), ...(action === "READINESS" ? { evaluatedAt: new Date().toISOString() } : action === "GENERATE_INVOICE_PACKAGE" ? { generatedAt: new Date().toISOString() } : { occurredAt: new Date().toISOString() }) } };
      const url = action === "READINESS" ? `/api/repair-orders/${encodeURIComponent(repairOrderId)}/delivery-readiness` : `/api/repair-workflow/${encodeURIComponent(repairOrderId)}/commands`;
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current.body) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Closeout could not be completed.");
      pending.current = null;
      const outcome = body.result ?? body;
      const blockers = outcome.blockerCodes ?? outcome.mismatchCodes ?? [];
      setNotice(action === "CLOSE_REPAIR_ORDER" ? "Repair closed and handoff recorded." : `${action === "READINESS" ? "Handoff readiness" : "Financial package"}: ${outcome.disposition ?? outcome.status ?? "saved"}.${blockers.length ? ` Resolve: ${blockers.join(", ")}.` : ""}`);
      if (action === "CLOSE_REPAIR_ORDER") notifyRepairReviewSaved(repairOrderId);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Request interrupted. Retry unchanged."); }
    finally { setBusy(false); }
  }
  if (closed) return <div className={styles.form}><p role="status">Repair closeout is recorded. This does not automatically approve frontline release or a sale.</p><Link href={internal ? `/vehicles/${encodeURIComponent(vehicleId)}/frontline` : `/service-documents?repairOrderId=${encodeURIComponent(repairOrderId)}`}>{internal ? "Continue to sale preparation" : "View handoff documents"}</Link></div>;
  return <form className={styles.form} onSubmit={(event: FormEvent) => { event.preventDefault(); void command("CLOSE_REPAIR_ORDER"); }}><p>1. Reconcile {internal ? "internal recon costs" : "the financial package, then create and settle the customer invoice"}. Do not regenerate an already invoiced package unless the repair has changed. 2. Verify handoff readiness after QC release. 3. Record the actual handoff.</p><button disabled={busy} type="button" onClick={() => void command("GENERATE_INVOICE_PACKAGE")}>Reconcile financial package</button>{!internal && <Link href={`/vehicles/service-billing?repairOrderId=${encodeURIComponent(repairOrderId)}`}>Customer invoice &amp; settlement</Link>}<label>Receiving person / department<input required value={recipient} onChange={event => setRecipient(event.target.value)} /></label><label>Final odometer<input required min="0" type="number" value={odometer} onChange={event => setOdometer(event.target.value)} /></label><label>Handoff evidence (one reference per line)<textarea required value={evidence} onChange={event => setEvidence(event.target.value)} /></label><label><input type="checkbox" checked={keys} onChange={event => setKeys(event.target.checked)} />Keys verified</label><label><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />I verified the vehicle, destination and handoff evidence.</label><button disabled={busy} type="button" onClick={() => void command("READINESS")}>Check current handoff readiness</button><button disabled={busy} type="submit">{busy ? "Saving…" : "Close repair & record handoff"}</button>{notice && <p role="status">{notice}</p>}</form>;
}
