"use client";

import { useRef, useState, type FormEvent } from "react";
import type { getLaborCatalogSettings } from "@/server/services/labor-catalog-settings";

type Settings = Awaited<ReturnType<typeof getLaborCatalogSettings>>;
export function LaborCatalogPanel({ initial, currentUserId }: { initial: Settings; currentUserId: string }) {
  const [settings, setSettings] = useState(initial);
  const [systemId, setSystemId] = useState(initial.systems[0].id);
  const [enabled, setEnabled] = useState(false);
  const [scopeReviewed, setScopeReviewed] = useState(false);
  const [reviewReference, setReviewReference] = useState("");
  const [capabilityReference, setCapabilityReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const attempts = useRef(new Map<string, string>());
  async function command(action: string, subjectId?: string) {
    const payload = { action, subjectId, systemId, enabled, scopeReviewed, reviewReference, capabilityReference, reason };
    const fingerprint = JSON.stringify(payload);
    const key = attempts.current.get(fingerprint) ?? crypto.randomUUID();
    attempts.current.set(fingerprint, key);
    setBusy(true);
    try {
      const response = await fetch("/api/settings/labor-catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, idempotencyKey: key }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Catalog policy action failed.");
      const refreshed = await fetch("/api/settings/labor-catalog", { cache: "no-store" });
      if (!refreshed.ok) throw new Error("Policy action was recorded. Reload before continuing because settings could not refresh.");
      setSettings(await refreshed.json());
      setStatus("Policy action recorded. Only current, independently approved active policies enable expanded execution. Reload the Labor Guide after activation.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Catalog policy action failed."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void command("CREATE_POLICY_DRAFT"); }
  return <section className="panel-card page-stack"><h2>Expanded catalog approvals</h2>
    <p>Review each system’s full scope and available personnel/equipment before proposing activation. The author cannot approve their own policy. Catalog scope changes invalidate earlier approvals; existing estimate amounts remain unchanged.</p>
    <p>Connected systems: {settings.allowedSystemIds.join(", ")}. {settings.unavailable ? "Some approvals could not be verified and remain held." : ""}</p>
    <form onSubmit={submit} className="page-stack">
      <label className="form-field">System<select value={systemId} onChange={event => { setSystemId(event.target.value); setScopeReviewed(false); }}>
        {settings.systems.map(system => <option key={system.id} value={system.id}>{system.label} · {system.operations} operations</option>)}
      </select></label>
      <a href={`/prototype/repair-explorer?system=${encodeURIComponent(systemId)}`}>Review this system’s operations</a>
      <label className="form-field">Shop scope review reference<textarea required minLength={10} maxLength={2000} value={reviewReference} onChange={event => setReviewReference(event.target.value)} /></label>
      <label className="form-field">Personnel, equipment and referral review reference<textarea required minLength={10} maxLength={2000} value={capabilityReference} onChange={event => setCapabilityReference(event.target.value)} /></label>
      <label><input type="checkbox" checked={scopeReviewed} onChange={event => setScopeReviewed(event.target.checked)} /> I reviewed every operation, subsystem checklist and provisional labor limitation in this system.</label>
      <label><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} /> Propose enabling this system. Leave unchecked to propose a hold.</label>
      <label className="form-field">Reason<input required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <button className="button button-primary" disabled={busy || !scopeReviewed}>Create catalog policy draft</button>
    </form>
    {settings.policies.map(policy => <article key={policy.id}><h3>{policy.configuration && typeof policy.configuration === "object" && !Array.isArray(policy.configuration) ? String(policy.configuration.systemId ?? "Unknown system") : "Unknown system"} · v{policy.version} · {policy.status}</h3><p>{policy.reason}</p>
      {policy.status === "DRAFT" && <button disabled={busy || !reason.trim()} onClick={() => void command("SIMULATE_POLICY", policy.id)}>Validate scope</button>}
      {policy.status === "IN_REVIEW" && <button disabled={busy || !reason.trim() || policy.createdByUserId === currentUserId} onClick={() => void command("APPROVE_POLICY", policy.id)}>Independently approve</button>}
      {policy.status === "APPROVED" && <button disabled={busy || !reason.trim()} onClick={() => void command("ACTIVATE_POLICY", policy.id)}>Activate reviewed policy</button>}
    </article>)}<p role="status">{status}</p>
  </section>;
}
