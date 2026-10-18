"use client";

import { useRef, useState, type FormEvent } from "react";
import type { getLaborRateSettings } from "@/server/services/labor-rate-settings";

type Settings = Awaited<ReturnType<typeof getLaborRateSettings>>;
export function LaborRatePanel({ initial, currentUserId }: { initial: Settings; currentUserId: string }) {
  const [settings, setSettings] = useState(initial);
  const [rate, setRate] = useState(String(initial.active.laborRate));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const attempts = useRef(new Map<string, string>());
  async function command(action: string, subjectId?: string) {
    const fingerprint = JSON.stringify({ action, subjectId, rate, reason });
    const key = attempts.current.get(fingerprint) ?? crypto.randomUUID();
    attempts.current.set(fingerprint, key);
    setBusy(true);
    try {
      const response = await fetch("/api/settings/labor-rate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, subjectId, laborRateCents: Math.round(Number(rate) * 100), reason, idempotencyKey: key }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Rate change failed.");
      const refreshed = await fetch("/api/settings/labor-rate", { cache: "no-store" });
      if (!refreshed.ok) throw new Error("The command succeeded but settings could not refresh. Reload before continuing.");
      setSettings(await refreshed.json());
      setStatus("Policy action recorded. Only an active, independently approved rate changes defaults for new Labor Guide estimates.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Rate change failed."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void command("CREATE_POLICY_DRAFT"); }
  return <section className="panel-card page-stack"><h2>Shop labor rate</h2><p>Current default: <strong>${settings.active.laborRate.toFixed(2)}/hour</strong>. New Labor Guide estimates inherit this rate. Existing drafts, presented estimates and approvals are not repriced.</p>
    <p>Uses the existing policy workflow: draft → validate → independent administrator approval → activate. The author cannot approve their own change; capability and rollout controls still apply.</p>
    <form onSubmit={submit}><label className="form-field">Proposed labor rate ($/hour)<input type="number" min="0" max="1000" step="0.01" required value={rate} onChange={event => setRate(event.target.value)} /></label><label className="form-field">Reason for this policy action<input maxLength={500} required value={reason} onChange={event => setReason(event.target.value)} /></label><button className="button button-primary" disabled={busy}>Create rate-change draft</button></form>
    {settings.policies.map(policy => <article key={policy.id}><h3>v{policy.version} · ${(policy.laborRateCents / 100).toFixed(2)}/hour · {policy.status}</h3><p>{policy.reason}</p>{policy.status === "DRAFT" && <button disabled={busy || !reason.trim()} onClick={() => void command("SIMULATE_POLICY", policy.id)}>Validate draft</button>}{policy.status === "IN_REVIEW" && <button disabled={busy || !reason.trim() || policy.createdByUserId === currentUserId} onClick={() => void command("APPROVE_POLICY", policy.id)}>Independently approve</button>}{policy.status === "APPROVED" && <button disabled={busy || !reason.trim()} onClick={() => void command("ACTIVATE_POLICY", policy.id)}>Activate rate</button>}</article>)}<p role="status">{status}</p>
  </section>;
}
