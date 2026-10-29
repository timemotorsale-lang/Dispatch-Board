"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CloseCommand = { action: "CLOSE_RO"; expectedVersion: number; idempotencyKey: string; reason: string; occurredAt: string };
type CloseResult = { version?: number; endedJobs?: { jobNumber: string }[] };
export function RepairOrderCloseForm({ repairOrderId, expectedVersion, onClosed, onCancel, onLockChange }: { repairOrderId: string; expectedVersion: number; onClosed: (result: CloseResult) => void; onCancel: () => void; onLockChange: (locked: boolean) => void }) {
  const [reason, setReason] = useState(""), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const [action, setAction] = useState<{ label: string; href: string } | null>(null);
  const [pending, setPending] = useState<CloseCommand | null>(null);
  const storageKey = `repair-order-close:${repairOrderId}`;
  useEffect(() => {
    onLockChange(saving || Boolean(pending));
  }, [saving, pending, onLockChange]);
  useEffect(() => {
    // A lost response must recover the same close operation, including after a reload.
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as CloseCommand | null;
      if (saved?.action === "CLOSE_RO" && typeof saved.reason === "string" && typeof saved.idempotencyKey === "string" && Number.isInteger(saved.expectedVersion) && typeof saved.occurredAt === "string") {
        queueMicrotask(() => { setPending(saved); setReason(saved.reason); setError("A previous close request needs confirmation. Retry it to recover the result."); });
      }
    } catch { /* Closing remains available without browser storage. */ }
  }, [storageKey]);
  useEffect(() => {
    if (!saving && !pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saving, pending]);
  async function close() {
    if (saving || (!pending && reason.trim().length < 10)) return;
    const command = pending ?? { action: "CLOSE_RO" as const, expectedVersion, idempotencyKey: crypto.randomUUID(), reason: reason.trim(), occurredAt: new Date().toISOString() };
    setSaving(true); setError(""); setAction(null); setPending(command);
    try { sessionStorage.setItem(storageKey, JSON.stringify(command)); } catch { /* The in-memory command still supports retry. */ }
    try {
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const body = await response.json();
      if (!response.ok) {
        if (response.status < 500) { setPending(null); try { sessionStorage.removeItem(storageKey); } catch { /* Request did not succeed. */ } }
        if (typeof body.action?.href === "string" && body.action.href.startsWith("/") && !body.action.href.startsWith("//") && typeof body.action.label === "string") setAction(body.action);
        throw new Error(body.error ?? "The RO could not be closed.");
      }
      if (!body.result || typeof body.result.version !== "number") throw new Error("Close confirmation was incomplete. Retry the same request.");
      try { sessionStorage.removeItem(storageKey); } catch { /* Server closure is confirmed. */ }
      setPending(null); onLockChange(false); onClosed(body.result);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Close outcome is uncertain. Retry the same request."); }
    finally { setSaving(false); }
  }
  return <form className="rowb-close-panel" id="repair-order-close-panel" aria-label="Close repair order" onSubmit={event => { event.preventDefault(); void close(); }}>
    <label><span>Closure reason</span><textarea autoFocus required minLength={10} maxLength={500} disabled={saving || Boolean(pending)} onChange={event => setReason(event.target.value)} placeholder="Example: The vehicle is already fixed and delivered." value={reason} /></label>
    <div><button disabled={saving || Boolean(pending)} onClick={onCancel} type="button">Keep open</button><button disabled={saving || (!pending && reason.trim().length < 10)} type="submit">{saving ? "Closing RO…" : pending ? "Retry close RO" : "Close RO"}</button></div>
    <p>Outstanding assignments will end. Work, costs and inspection records stay in the RO history.</p>
    {saving && <p role="status">Closing repair order…</p>}
    {error && <p role="alert">{error}</p>}
    {action && !pending && <Link className="button button-primary" href={action.href}>{action.label}</Link>}
  </form>;
}
