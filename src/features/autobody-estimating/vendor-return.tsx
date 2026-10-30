"use client";

import { useState } from "react";
import styles from "./workspace.module.css";

export function CollisionVendorReturn({ repairOrderId, estimateId, works, lines, disabled, onRefresh }: { repairOrderId: string; estimateId: string; works: { id: string; vendorName: string; status: string; version: number }[]; lines: { key: string; label: string }[]; disabled: boolean; onRefresh: () => Promise<void> }) {
  const [vendorId, setVendorId] = useState(""), [keys, setKeys] = useState<string[]>([]), [reference, setReference] = useState(""), [evidence, setEvidence] = useState(""), [fit, setFit] = useState(false), [safe, setSafe] = useState(false), [keysVerified, setKeysVerified] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const work = works.find(item => item.id === vendorId);
  async function accept() {
    if (!work || !keys.length || !reference.trim() || evidence.trim().length < 10 || !fit || !safe) { setMessage("Select the returned vendor work and covered quote lines, record the reference and inspection evidence, then confirm both checks."); return; }
    setBusy(true); setMessage("");
    try {
      const command = pending ?? { action: "VENDOR_RETURN", repairOrderId, estimateId, vendorWorkId: work.id, expectedVersion: work.version, lineKeys: keys, reference, evidence, fitFinishPassed: fit, safetyPassed: safe, idempotencyKey: crypto.randomUUID() }; setPending(command);
      const response = await fetch("/api/autobody-estimating", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) }), body = await response.json();
      if (!response.ok) { if (response.status < 500) setPending(null); throw new Error(body.error ?? "Vendor review could not be saved. Retry unchanged."); }
      setPending(null); await onRefresh(); setMessage("Vendor return accepted with staff inspection evidence. Continue release, billing/internal costs and handoff. No payment or inventory cost was posted.");
    } catch (failure) { setMessage((failure as Error).message); } finally { setBusy(false); }
  }
  async function release() {
    if (evidence.trim().length < 10) { setMessage("Record the verified release evidence before authorizing handoff."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/repair-orders/${repairOrderId}/release-authorization`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ authorizedAt: new Date().toISOString(), keysVerified: true, openExceptions: [], releaseEvidence: [evidence], reason: "Staff verified vendor return, vehicle keys and readiness for release.", idempotencyKey: crypto.randomUUID() }) }), body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Release could not be authorized.");
      setMessage("Release authorized. Complete billing or internal-cost review and final handoff in the repair workbench.");
    } catch (failure) { setMessage((failure as Error).message); } finally { setBusy(false); }
  }
  return <details className={styles.card}><summary>Outside work · review returned repair</summary><p>Record actual vendor progress in the repair workbench first. This inspection covers the selected authorized quote lines; it creates no internal repair clock or payment.</p><fieldset disabled={disabled || busy || Boolean(pending)} className={styles.fields}><label>Returned vendor work<select value={vendorId} onChange={event => setVendorId(event.target.value)}><option value="">Select returned work</option>{works.filter(item => ["RETURNED", "QC_REQUIRED", "COMPLETED"].includes(item.status)).map(item => <option key={item.id} value={item.id}>{item.vendorName} · {item.status.toLowerCase()}</option>)}</select></label><label>Vendor invoice / completion reference<input value={reference} onChange={event => setReference(event.target.value)} /></label>{lines.map(line => <label className={styles.check} key={line.key}><input type="checkbox" checked={keys.includes(line.key)} onChange={event => setKeys(current => event.target.checked ? [...current, line.key] : current.filter(key => key !== line.key))} />{line.label}</label>)}<label>Actual inspection evidence<textarea value={evidence} onChange={event => setEvidence(event.target.value)} /></label><label className={styles.check}><input type="checkbox" checked={fit} onChange={event => setFit(event.target.checked)} />I verified repair completion, fit and finish.</label><label className={styles.check}><input type="checkbox" checked={safe} onChange={event => setSafe(event.target.checked)} />I verified applicable safety and road-test requirements.</label></fieldset><button disabled={disabled || busy} onClick={() => void accept()}>{pending ? "Retry unchanged vendor review" : "Accept inspected vendor return"}</button><p className={styles.generic}>After inspection: verify the keys and resolve open exceptions before authorizing release.</p><label className={styles.check}><input type="checkbox" disabled={disabled || busy} checked={keysVerified} onChange={event => setKeysVerified(event.target.checked)} />Keys are verified and no open exceptions remain.</label><button disabled={disabled || busy || Boolean(pending) || !safe || !fit || !keysVerified} onClick={() => void release()}>Keys verified & authorize release</button>{message && <p role="status">{message}</p>}</details>;
}
