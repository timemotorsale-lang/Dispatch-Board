"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { getDiagnosticCaseWorkspace } from "@/server/diagnostics/service";
import { emptyClinicalForm, type ClinicalDrafts, type ClinicalForm } from "@/lib/diagnostic-clinical-draft";
import styles from "./diagnostic-evidence-panel.module.css";

type Model = Awaited<ReturnType<typeof getDiagnosticCaseWorkspace>>;
type Response = { state: string; cases: Array<{ id: string; concern: string; status: string }>; workspace: Model | null };
const readable = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^./, letter => letter.toUpperCase());
function VerificationChecks({ value }: { value: unknown }) {
  if (!Array.isArray(value) || !value.length) return <p>No performed checks recorded.</p>;
  return <ul>{value.map((entry, index) => {
    const row = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    const evidence = Array.isArray(row.evidenceKeys) ? row.evidenceKeys.filter(v => typeof v === "string").join(", ") : "";
    return <li key={index}><strong>{readable(String(row.checkKey ?? `Check ${index + 1}`))}</strong> · {readable(String(row.result ?? "Not recorded"))}{typeof row.notes === "string" ? <p>{row.notes}</p> : null}<small>Evidence references: {evidence || "None recorded"}</small></li>;
  })}</ul>;
}
const units: Record<string, string[]> = { DISTANCE: ["mm", "in"], VOLTAGE: ["V", "mV"], PRESSURE: ["kPa", "psi", "bar"], TEMPERATURE: ["°C", "°F"], RESISTANCE: ["ohm", "kohm"], CURRENT: ["A", "mA"], ROTATIONAL_SPEED: ["rpm"], TIME: ["s", "ms"], PERCENT: ["%"] };
export function DiagnosticEvidencePanel({ repairOrderId, section, drafts, onChange, onPersist }: { repairOrderId: string; section: string; drafts: ClinicalDrafts; onChange: (drafts: ClinicalDrafts) => void; onPersist: (drafts: ClinicalDrafts) => Promise<boolean> }) {
  const [response, setResponse] = useState<Response | null>(null);
  const [caseId, setCaseId] = useState("");
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/diagnostic-workspace${caseId ? `?caseId=${encodeURIComponent(caseId)}` : ""}`, { cache: "no-store", signal: abort.signal })
      .then(async res => { const body = await res.json(); if (!res.ok) throw new Error(body.error || "Evidence could not load."); return body as Response; })
      .then(data => { setResponse(data); setError(""); })
      .catch(err => { if (!abort.signal.aborted) { setResponse(null); setError(err.message); } });
    return () => abort.abort();
  }, [repairOrderId, caseId, revision]);
  const model = response?.workspace;
  const item = model?.diagnosticCase;
  const form = item ? drafts[item.id] ?? emptyClinicalForm : emptyClinicalForm;
  const editable = model?.evidenceRollout.executable && (form.mode === "evidence" ? model.permissions.canLinkEvidence : model.permissions.canRecordEvidence);
  function update(value: Partial<ClinicalForm>) { if (item) onChange({ ...drafts, [item.id]: { ...form, ...value } }); }
  async function submit() {
    if (!item || !model || !editable || busy) return;
    setBusy(true); setNotice("");
    try {
      if (form.mode === "measurements" && (form.referenceMin || form.referenceMax) && !form.referenceSource.trim()) throw new Error("Identify the vehicle-specific source for the reference limits.");
      const identity = { expectedVersion: item.version, idempotencyKey: crypto.randomUUID(), reason: "Record technician evidence from the diagnostic workspace." };
      const fact = { ...identity, independenceGroup: form.group, operatingConditions: { description: form.conditions }, source: "TECHNICIAN", reliability: "UNASSESSED", rawSource: { kind: "MANUAL_ENTRY" } };
      const pending = form.pending ?? { endpoint: form.mode, body: form.mode === "observations" ? { ...fact, factClass: "OBSERVED", statement: form.statement, observedAt: new Date().toISOString() } : form.mode === "measurements" ? { ...fact, quantity: form.quantity, value: form.value, unit: form.unit, measuredAt: new Date().toISOString(), instrument: { name: form.instrument, calibrationStatus: form.calibration }, referenceMinimum: form.referenceMin || null, referenceMaximum: form.referenceMax || null, setup: { referenceSource: form.referenceSource } } : { ...identity, evidenceObjectId: form.evidenceObjectId, purpose: form.purpose, subjectType: "CASE", subjectId: item.id, relationship: "SUPPORTS" } };
      if (!await onPersist({ ...drafts, [item.id]: { ...form, pending } })) throw new Error("Save the draft successfully before recording evidence.");
      const res = await fetch(`/api/diagnostics/cases/${encodeURIComponent(item.id)}/${pending.endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.body) });
      const result = await res.json();
      if (!res.ok) {
        // Only definite client rejections release the retry identity; uncertain failures keep it.
        if ([400, 401, 403, 404, 409, 422].includes(res.status)) await onPersist({ ...drafts, [item.id]: { ...form, pending: undefined } });
        throw new Error(result.error || "Evidence was not recorded.");
      }
      if (!await onPersist({ ...drafts, [item.id]: { ...emptyClinicalForm, mode: form.mode } })) throw new Error("Evidence recorded, but the draft acknowledgement could not save. Retry to retrieve the same result.");
      setNotice("Evidence recorded with your signed-in identity. Refreshing the authoritative case."); setResponse(null); setRevision(value => value + 1);
    } catch (err) { setNotice(err instanceof Error ? err.message : "Evidence could not save."); }
    finally { setBusy(false); }
  }
  const verification = item?.verificationVersions[0];
  return <section className={styles.panel} hidden={!["Findings & tests", "Verification"].includes(section)} aria-label="Governed diagnostic evidence">
    <header><h2>{section === "Verification" ? "Verification against the original concern" : "Evidence record"}</h2><button disabled={busy} type="button" onClick={() => { setResponse(null); setRevision(value => value + 1); }}>Refresh evidence</button></header>
    {error ? <p role="alert">{error}</p> : !response ? <p role="status">Loading permitted diagnostic records…</p> : null}
    {response?.state === "RESTRICTED" ? <p>Diagnostic records are restricted for your account.</p> : null}
    {response && !item && response.state !== "RESTRICTED" ? <p>No diagnostic case is linked yet. <Link href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(repairOrderId)}&fullDetails=1#enterprise-diagnostics`}>Start the governed diagnostic case</Link> before recording evidence.</p> : null}
    {item && model ? <>
      <label>Diagnostic concern<select disabled={busy} value={item.id} onChange={e => { setResponse(null); setCaseId(e.target.value); }}>{response?.cases.map(c => <option key={c.id} value={c.id}>{c.concern}</option>)}</select></label>
      <p><strong>{item.concern}</strong> · Case version {item.version}</p>
      {section === "Verification" ? <>
        {model.qualitySafetyGates.state === "RESTRICTED" || !model.permissions.canEvaluateReasoning ? <p>Verification details are not available with your current evidence/reasoning permissions.</p> : verification ? <><p>Latest recorded outcome: <strong>{readable(verification.status)}</strong> · {verification.originalConcern}</p><p>{verification.repairSummary}</p><p>{verification.outcomeSummary || "No outcome summary recorded."}</p><small>Recorded by {verification.authorUser.name} · {new Date(verification.occurredAt).toLocaleString()} · {verification.reviewerUser ? `Reviewed by ${verification.reviewerUser.name}` : "No reviewer recorded"}</small><details><summary>Checks, evidence and limitations</summary><VerificationChecks value={verification.performedChecks} /><p>Road-test safety: {readable(verification.roadTestSafety)}</p><p>Limitations: {Array.isArray(verification.limitations) ? verification.limitations.filter(v => typeof v === "string").join("; ") || "None recorded" : "Not recorded"}</p></details></> : <p>No verification outcome is recorded for this diagnostic concern.</p>}
        <p>Passing verification requires the recorded conclusion, repair handoff, required checks, and applicable independent review. An unfinished or unsafe check must not be marked passed.</p>
        <Link href={`/diagnostics/cases/${encodeURIComponent(item.id)}`}>Open governed verification and review</Link>
      </> : <>
        <div className={styles.notice}><strong>{model.qualitySafetyGates.state === "RESTRICTED" ? "Evidence review is restricted" : model.qualitySafetyGates.readyForReasoning ? "Evidence ready for governed review" : "Further evidence or review required"}</strong><details><summary>Review reasons</summary>{model.qualitySafetyGates.reasonCodes.map(code => <p key={code}>{readable(code)}</p>)}</details></div>
        <details><summary>Recorded observations, measurements and test results</summary>
          {item.observations.map(f => <article key={f.id}><strong>{f.statement}</strong><small>{f.factClass} · {f.qualityStatus}{f.correctedById ? " · Superseded" : ""} · {f.authorUser.name} · {new Date(f.observedAt).toLocaleString()}</small></article>)}
          {item.measurements.map(f => <article key={f.id}><strong>{f.quantity}: {f.value} {f.unit}</strong><small>{f.qualityStatus}{f.supersededById ? " · Superseded" : ""} · {f.authorUser.name} · {new Date(f.measuredAt).toLocaleString()}</small></article>)}
          {item.testExecutions.map(t => <article key={t.id}><strong>{t.planNode.title}</strong><small>{t.state} · {t.actorUser.name} · {new Date(t.occurredAt).toLocaleString()}</small></article>)}
          {!item.observations.length && !item.measurements.length && !item.testExecutions.length ? <p>No facts are available in your permitted view.</p> : null}
        </details>
        <details open={form.pending ? true : undefined}><summary>Add observation, measurement or attachment</summary><form onSubmit={e => { e.preventDefault(); void submit(); }}>
          <fieldset disabled={busy || Boolean(form.pending)}><legend>Add evidence—not a diagnosis</legend>
            <label>Record type<select value={form.mode} onChange={e => update({ mode: e.target.value as ClinicalForm["mode"] })}><option value="observations">Observation</option><option value="measurements">Measurement already performed</option><option value="evidence">Attach existing evidence</option></select></label>
            {form.mode !== "evidence" ? <><label>Test / source group<input required maxLength={120} value={form.group} onChange={e => update({ group: e.target.value })} placeholder="Use the same group for repeated readings from one test" /></label><label>Operating conditions<textarea required maxLength={1000} value={form.conditions} onChange={e => update({ conditions: e.target.value })} /></label></> : null}
            {form.mode === "observations" ? <label>What did you observe?<textarea required minLength={3} maxLength={2000} value={form.statement} onChange={e => update({ statement: e.target.value })} /></label> : null}
            {form.mode === "measurements" ? <div className={styles.grid}>
              <label>Quantity<select value={form.quantity} onChange={e => update({ quantity: e.target.value, unit: units[e.target.value][0] })}>{Object.keys(units).map(q => <option key={q}>{q}</option>)}</select></label>
              <label>Measured value<input required type="number" step="any" value={form.value} onChange={e => update({ value: e.target.value })} /></label><label>Unit<select value={form.unit} onChange={e => update({ unit: e.target.value })}>{units[form.quantity]?.map(u => <option key={u}>{u}</option>)}</select></label>
              <label>Instrument<input required maxLength={200} value={form.instrument} onChange={e => update({ instrument: e.target.value })} /></label><label>Calibration<select value={form.calibration} onChange={e => update({ calibration: e.target.value })}>{["UNKNOWN", "CURRENT", "EXPIRED", "NOT_APPLICABLE"].map(c => <option key={c}>{c}</option>)}</select></label>
              <label>Reference minimum (optional)<input type="number" step="any" value={form.referenceMin} onChange={e => update({ referenceMin: e.target.value })} /></label><label>Reference maximum (optional)<input type="number" step="any" value={form.referenceMax} onChange={e => update({ referenceMax: e.target.value })} /></label><label>Vehicle-specific reference source<input maxLength={500} required={Boolean(form.referenceMin || form.referenceMax)} value={form.referenceSource} onChange={e => update({ referenceSource: e.target.value })} /></label>
            </div> : null}
            {form.mode === "evidence" ? <><label>Permitted vehicle evidence<select required value={form.evidenceObjectId} onChange={e => update({ evidenceObjectId: e.target.value })}><option value="">Select an available, malware-clean file</option>{model.evidenceCandidates.map(c => <option disabled={!c.linkable} key={c.id} value={c.id}>{c.fileName} · {c.accessLevel}</option>)}</select></label><label>What does this file support?<input required minLength={3} maxLength={300} value={form.purpose} onChange={e => update({ purpose: e.target.value })} /></label><Link href={`/vehicles/360/${encodeURIComponent(item.vehicle.id)}`}>Upload a new file in Vehicle Evidence</Link></> : null}
          </fieldset>
          {!editable ? <p>Recording is unavailable: assignment, permissions or evidence rollout control requires review.</p> : null}
          {form.pending ? <p>A request is awaiting confirmation. Retry uses the same saved request.</p> : null}
          <button type="submit" disabled={busy || !editable}>{busy ? "Recording…" : form.pending ? "Retry saved evidence request" : "Record evidence"}</button><small>Recorded as {model.viewer.name}; time and audit identity are retained. This does not confirm a diagnosis.</small>
        </form></details>
        <Link href={`/diagnostics/cases/${encodeURIComponent(item.id)}`}>Open test planning, conclusions and required review</Link>
      </>}
    </> : null}
    {notice ? <p role="status">{notice}</p> : null}
  </section>;
}
