"use client";

import { useEffect, useState } from "react";

type Estimate = { id: string; version: number; expiresAt: string; lineItems: { key: string; description: string }[]; authorizations: { id: string; disposition: string }[] };
type Planning = { estimateVersions: Estimate[] };

export function DocumentApproval({ repairOrderId, estimateId, onApproved, onLockChange }: { repairOrderId: string; estimateId: string; onApproved: () => void; onLockChange?: (locked: boolean) => void }) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [channel, setChannel] = useState("IN_PERSON");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const [decidedAt, setDecidedAt] = useState("");
  useEffect(() => { onLockChange?.(busy || Boolean(pending)); }, [busy, pending, onLockChange]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/planning`, { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Approval details could not load.");
      const latest = (data as Planning).estimateVersions[0];
      if (!latest || latest.id !== estimateId) throw new Error("A newer estimate exists. Open the latest estimate before recording approval.");
      if (!controller.signal.aborted) setEstimate(latest);
    }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Approval details could not load."); });
    return () => controller.abort();
  }, [repairOrderId, estimateId]);
  async function submit() {
    if (!estimate || !confirmed) return;
    setBusy(true); setError("");
    try {
      const command = pending ?? { action: "DECIDE_AUTHORIZATION", estimateVersionId: estimate.id, disposition: "ACCEPTED", authorizedLineKeys: estimate.lineItems.map(line => line.key), decisionActorName: name, decisionActorType: "CUSTOMER", decisionActorReference: reference, channel, decidedAt: new Date(decidedAt).toISOString(), reason: `Record verified customer approval of estimate version ${estimate.version}. Evidence: ${reference}`, previousAuthorizationId: estimate.authorizations[0]?.id, idempotencyKey: crypto.randomUUID() };
      setPending(command);
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/planning`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const data = await response.json();
      if (!response.ok) { if (response.status < 500) setPending(null); throw new Error(data.error ?? "Approval could not be recorded."); }
      setPending(null);
      onApproved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Approval outcome is uncertain. Retry the unchanged request."); }
    finally { setBusy(false); }
  }
  const accepted = estimate?.authorizations[0]?.disposition === "ACCEPTED";
  return <section aria-label="Customer approval"><h2>Record customer approval</h2><p>The customer must approve this exact estimate before conversion. Printing alone is not approval.</p>{error && <p role="alert">{error}</p>}{!estimate && !error && <p role="status">Loading this estimate’s approval details…</p>}{accepted ? <><p role="status">This estimate is already approved.</p><button type="button" onClick={onApproved}>Continue to invoice</button></> : <form onSubmit={event => { event.preventDefault(); void submit(); }}><fieldset disabled={busy || Boolean(pending) || !estimate}><legend>Approval of estimate {estimate ? `v${estimate.version}` : ""}</legend><label>Customer / authorized representative<input required maxLength={200} value={name} onChange={event => setName(event.target.value)} /></label><label>Approval method<select value={channel} onChange={event => setChannel(event.target.value)}><option value="IN_PERSON">In person</option><option value="PHONE">Phone</option><option value="EMAIL">Email</option><option value="SMS">Text message</option></select></label><label>Customer decision time<input required type="datetime-local" value={decidedAt} onChange={event => setDecidedAt(event.target.value)} /></label><label>Approval evidence / reference<input required minLength={3} maxLength={300} value={reference} onChange={event => setReference(event.target.value)} placeholder="Signed estimate, email or documented call reference" /></label><label><input required type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> I verified the customer approved all listed work and the exact quoted amount.</label><button disabled={!confirmed || !estimate}>Record approval & continue</button></fieldset>{pending && <><p>Confirmation is pending. Retry the same decision to avoid duplication.</p><button type="button" disabled={busy} onClick={() => void submit()}>Retry unchanged approval</button></>}</form>}</section>;
}
