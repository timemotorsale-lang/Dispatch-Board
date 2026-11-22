"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { notifyRepairReviewSaved } from "@/lib/repair-workflow-review";
import { invoiceHoldLabel } from "@/lib/service-billing-workflow";
import styles from "./repair-workflow.module.css";

export type HandoffBilling = { href: string; label: string; detail: string } | null;
export type SavedHandoff = { recipientName: string | null; finalOdometer: number | null; occurredAt: string };

export function RepairHandoffTool({ repairOrderId, vehicleId, internal, closed, billing, billingHref, billingUnverified, savedHandoff, timeZone }: {
  repairOrderId: string;
  vehicleId: string;
  internal: boolean;
  closed: boolean;
  billing: HandoffBilling;
  billingHref: string;
  billingUnverified?: boolean;
  timeZone: string;
  savedHandoff: SavedHandoff | null;
}) {
  const [recipient, setRecipient] = useState("");
  const [odometer, setOdometer] = useState("");
  const [evidence, setEvidence] = useState("");
  const [keys, setKeys] = useState(false);
  const [checked, setChecked] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [internalReconciled, setInternalReconciled] = useState(false);
  const pending = useRef<{ signature: string; body: Record<string, unknown> } | null>(null);
  const activeRequest = useRef(false);

  async function send(action: "READINESS" | "GENERATE_INVOICE_PACKAGE" | "CLOSE_REPAIR_ORDER", values: Record<string, unknown>) {
    const signature = JSON.stringify({ action, values });
    if (pending.current?.signature !== signature) {
      const timestamp = action === "READINESS" ? "evaluatedAt" : action === "GENERATE_INVOICE_PACKAGE" ? "generatedAt" : "occurredAt";
      pending.current = { signature, body: { ...values, idempotencyKey: crypto.randomUUID(), [timestamp]: new Date().toISOString() } };
    }
    const url = action === "READINESS"
      ? `/api/repair-orders/${encodeURIComponent(repairOrderId)}/delivery-readiness`
      : `/api/repair-workflow/${encodeURIComponent(repairOrderId)}/commands`;
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current.body) });
    const body = await response.json();
    if (!response.ok) {
      if (response.status < 500) pending.current = null;
      throw new Error(body.error ?? "Closeout could not be completed.");
    }
    pending.current = null;
    return body.result ?? body;
  }

  async function run(action: "READINESS" | "GENERATE_INVOICE_PACKAGE" | "CLOSE_REPAIR_ORDER") {
    if (activeRequest.current) return;
    activeRequest.current = true;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      if (action === "GENERATE_INVOICE_PACKAGE") {
        const result = await send(action, { action, reason: "Reconcile the current repair financial package before closeout." });
        const blockers = result.mismatchCodes ?? [];
        if (blockers.length) throw new Error(blockers.map(invoiceHoldLabel).join(" "));
        setInternalReconciled(true);
        setNotice("Internal costs reconciled.");
        return;
      }

      const references = evidence.split("\n").map(value => value.trim()).filter(Boolean);
      if (!checked || !keys || !references.length) throw new Error("Verify the handoff and keys, then enter the handoff evidence.");
      const close = {
        action: "CLOSE_REPAIR_ORDER", finalOdometer: Number(odometer), handoffEvidence: references, keysVerified: keys,
        recipientName: recipient.trim(), reason: "Record final repair closeout and accountable vehicle handoff."
      };
      if (action === "CLOSE_REPAIR_ORDER" && (!close.recipientName || odometer === "")) {
        throw new Error("Enter the receiving person and final odometer.");
      }
      const retryingClose = pending.current?.signature === JSON.stringify({ action: "CLOSE_REPAIR_ORDER", values: close });
      if (action === "READINESS" || !retryingClose) {
        const readiness = await send("READINESS", {
          checks: [{ code: "HANDOFF_VERIFIED", label: "Vehicle, keys, destination and handoff evidence verified", passed: true, evidence: references }],
          reason: "Verify current repair release and handoff readiness."
        });
        if (readiness.disposition !== "READY") {
          throw new Error(`Handoff needs attention. ${(readiness.blockerCodes ?? []).map(invoiceHoldLabel).join(" ")}`.trim());
        }
      }
      if (action === "READINESS") {
        setNotice("Handoff readiness: READY.");
        return;
      }

      await send("CLOSE_REPAIR_ORDER", close);
      setNotice("Repair closed and handoff recorded.");
      notifyRepairReviewSaved(repairOrderId, "handoff");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request interrupted. Retry unchanged.");
    } finally {
      activeRequest.current = false;
      setBusy(false);
    }
  }

  if (closed) return <section className={styles.form} aria-label="Saved handoff">
    <p role="status">{internal ? "Repair order closed. This does not automatically approve frontline release or a sale." : "Repair order closed."}</p>
    {savedHandoff && <dl>
      <div><dt>Received by</dt><dd>{savedHandoff.recipientName || "Not recorded"}</dd></div>
      <div><dt>Handoff recorded</dt><dd><time dateTime={savedHandoff.occurredAt}>{new Date(savedHandoff.occurredAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone })}</time></dd></div>
      {savedHandoff.finalOdometer != null && <div><dt>Final odometer</dt><dd>{savedHandoff.finalOdometer.toLocaleString("en-US")}</dd></div>}
    </dl>}
    <Link href={internal ? `/vehicles/${encodeURIComponent(vehicleId)}/frontline` : `/service-documents?repairOrderId=${encodeURIComponent(repairOrderId)}`}>{internal ? "Continue to sale preparation" : "View handoff documents"}</Link>
  </section>;

  if (billing) return <section className={styles.form} aria-label="Handoff next action">
    <p role="status">{billing.detail}</p>
    <Link className={styles.primaryAction} href={billing.href}>{billing.label}</Link>
  </section>;

  return <form className={styles.form} aria-label="Record vehicle handoff" onSubmit={(event: FormEvent) => { event.preventDefault(); void run("CLOSE_REPAIR_ORDER"); }}>
    {billingUnverified && <p role="status">Billing status is unavailable in this view. The closeout check verifies the invoice and payment before recording handoff.</p>}
    {internal && !internalReconciled && <button disabled={busy} type="button" onClick={() => void run("GENERATE_INVOICE_PACKAGE")}>Reconcile financial package</button>}
    {!internal && <Link href={billingHref}>View invoice &amp; receipts</Link>}
    <label>Receiving person / department<input required value={recipient} onChange={event => setRecipient(event.target.value)} /></label>
    <label>Final odometer<input required min="0" step="1" type="number" value={odometer} onChange={event => setOdometer(event.target.value)} /></label>
    <label>Handoff evidence (one reference per line)<textarea required value={evidence} onChange={event => setEvidence(event.target.value)} /></label>
    <label><input type="checkbox" checked={keys} onChange={event => setKeys(event.target.checked)} />Keys verified</label>
    <label><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />I verified the vehicle, destination and handoff evidence.</label>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div>
      <button className={styles.primaryAction} disabled={busy} type="submit">{busy ? "Saving…" : "Close repair & record handoff"}</button>
      <button disabled={busy} type="button" onClick={() => void run("READINESS")}>Check current handoff readiness</button>
    </div>
  </form>;
}
