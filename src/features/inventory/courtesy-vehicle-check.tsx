"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { courtesyFindingLabel, courtesyOutcomes, isCourtesySafetyFlag, type CourtesyCheck, type CourtesyOutcome } from "@/lib/courtesy-vehicle-check";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { CourtesyInspectionFields, courtesyResultLabels, type InspectionRow } from "./courtesy-inspection-fields";
import styles from "./courtesy-vehicle-check.module.css";

type Model = { check: CourtesyCheck | null; canManage: boolean; canInspect: boolean };
type FollowUpDraft = { outcome: CourtesyOutcome | ""; note: string };

export function CourtesyVehicleCheck({ repairOrderId, mode }: { repairOrderId: string; mode: "inspection" | "advisor" }) {
  const endpoint = `/api/repair-orders/${encodeURIComponent(repairOrderId)}/courtesy-check`;
  const [model, setModel] = useState<Model>();
  const [rows, setRows] = useState<Record<string, InspectionRow>>({});
  const [followUps, setFollowUps] = useState<Record<string, FollowUpDraft>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef<{ signature: string; key: string } | null>(null);
  const submitting = useRef(false);

  const adopt = useCallback((next: Model) => {
    setModel(next);
    setRows(Object.fromEntries((next.check?.findings ?? []).map(({ code, result, note, evidence }) => [code, { code, result, note, evidence }])));
    setFollowUps({});
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(endpoint, { cache: "no-store", signal });
      const next = await response.json();
      if (!response.ok) throw new Error(next.error);
      if (!signal?.aborted) { pending.current = null; adopt(next); setError(""); }
    } catch (failure) {
      if (!signal?.aborted) setError(failure instanceof Error ? failure.message : "Could not load the courtesy check.");
    }
  }, [adopt, endpoint]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void load(controller.signal); });
    return () => controller.abort();
  }, [load]);

  async function save(values: Record<string, unknown>) {
    if (!model || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const request = { ...values, expectedVersion: model.check?.version ?? 0 };
      const signature = JSON.stringify(request);
      if (pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID() };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, idempotencyKey: pending.current.key }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      pending.current = null;
      if (values.action !== "RECORD_FOLLOW_UP") adopt({ ...model, check: result.result });
      else {
        setModel({ ...model, check: result.result });
        setFollowUps(current => Object.fromEntries(Object.entries(current).filter(([code]) => code !== values.code)));
      }
      setNotice(values.action === "WITHDRAW_INSPECTION" ? "Courtesy check withdrawn."
        : values.action === "SAVE_INSPECTION" ? "Courtesy check saved on this repair order." : "Customer follow-up saved.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The courtesy check could not be saved. Retry the same entry.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  function updateItem(code: string, change: Partial<InspectionRow>) {
    setRows(current => ({ ...current, [code]: { code, result: current[code]?.result ?? "PASS",
      note: current[code]?.note ?? "", evidence: current[code]?.evidence ?? "", ...change } }));
  }

  function submitInspection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save({ action: "SAVE_INSPECTION", findings: Object.values(rows) });
  }

  const check = model?.check?.findings.length ? model.check : null;
  const savedRows = check?.findings ?? [];
  const inspectorDirty = Object.keys(rows).length !== savedRows.length || savedRows.some(item => {
    const draft = rows[item.code];
    return !draft || draft.result !== item.result || draft.note !== item.note || draft.evidence !== item.evidence;
  });
  const advisorDirty = Object.entries(followUps).some(([code, draft]) => {
    const saved = savedRows.find(item => item.code === code)?.followUp;
    return draft.outcome !== (saved?.outcome ?? "") || draft.note !== (saved?.note ?? "");
  });
  const draftAttributes = { "data-repair-draft-owner": "", "data-repair-form-dirty": String(busy || (mode === "inspection" ? inspectorDirty : advisorDirty)) };
  const recommendations = check?.findings.filter(item => item.result !== "PASS") ?? [];
  const safetyFlags = recommendations.filter(isCourtesySafetyFlag);
  const checkedForQuote = selected.filter(code => recommendations.some(item => item.code === code));
  const printHref = `/repair-orders/${encodeURIComponent(repairOrderId)}/courtesy-check/print`;
  const estimateHref = `/prototype/courtesy-estimate?${new URLSearchParams({ repairOrderId, items: checkedForQuote.join(",") })}`;
  const feedback = <>{error && <div role="alert"><p>{error}</p><button className="pill" type="button" disabled={busy} onClick={() => void load()}>Reload saved check</button></div>}
    {notice && <p role="status">{notice}</p>}</>;

  if (mode === "inspection") return <details {...draftAttributes} className={styles.panel}>
    <summary>{check ? "Review courtesy vehicle check" : "Start courtesy vehicle check"}</summary>
    <p>Optional. Record only the items you inspected. Customer repair clearance is recorded separately.</p>
    {feedback}
    {!model && !error && <p role="status">Loading courtesy check…</p>}
    {safetyFlags.length > 0 && <p className={styles.urgent}>Tell the advisor about urgent findings before delivery and follow the shop’s safety policy.</p>}
    {model?.canInspect ? <form onSubmit={submitInspection} className={styles.sections}>
      <CourtesyInspectionFields rows={rows} busy={busy} onUpdate={updateItem} onClear={code => setRows(current => {
        const next = { ...current };
        delete next[code];
        return next;
      })} />
      <div className={styles.actions}>
        <button className="pill pill-primary" disabled={busy || !Object.keys(rows).length} type="submit">{busy ? "Saving…" : "Save courtesy check"}</button>
        {check && !Object.keys(rows).length && <button className="pill" disabled={busy} type="button" onClick={() => {
          if (window.confirm("Withdraw the saved courtesy check? Its previous results stay in the audit history.")) void save({ action: "WITHDRAW_INSPECTION" });
        }}>Withdraw saved courtesy check</button>}
        {check && <Link className="pill" href={printHref} target="_blank" rel="noreferrer">Print findings</Link>}
      </div>
    </form> : check ? <Link className="pill" href={printHref} target="_blank" rel="noreferrer">Print saved check</Link>
      : model && <p>This role or repair order cannot record the inspection here.</p>}
  </details>;

  return <section {...draftAttributes} className={styles.panel} aria-label="Courtesy vehicle check">
    <h3>Courtesy vehicle check</h3>
    {feedback}
    {!model && !error && <p role="status">Loading courtesy check…</p>}
    {model && !check && <p>No courtesy check recorded. {model.canInspect && <Link href={repairReviewHref(repairOrderId, "qc")}>Open the optional check in Final QC</Link>}</p>}
    {check && <>
      <p>{check.findings.length} items checked by {check.inspectorName} · {new Date(check.inspectedAt).toLocaleString()}</p>
      {safetyFlags.length > 0 && <p className={styles.urgent}>Urgent finding. Review with the customer before delivery and follow the shop’s safety policy.</p>}
      {!recommendations.length && <p>No recommendations recorded.</p>}
      {recommendations.map(item => {
        const draft = followUps[item.code] ?? { outcome: item.followUp?.outcome ?? "", note: item.followUp?.note ?? "" };
        const edit = (change: Partial<FollowUpDraft>) => setFollowUps(current => ({ ...current, [item.code]: { ...draft, ...change } }));
        return <article className={styles.finding} key={item.code}>
          <strong>{courtesyFindingLabel(item.code)} · {courtesyResultLabels[item.result]}</strong>
          <p>{item.note}</p>
          {item.evidence && <small>{item.evidence}</small>}
          {item.followUp && <p>{courtesyOutcomes[item.followUp.outcome]} · {item.followUp.actorName}{item.followUp.note && ` · ${item.followUp.note}`}</p>}
          {model?.canManage && <div className={styles.notes}>
            <label>Customer follow-up<select value={draft.outcome} disabled={busy} onChange={event => edit({ outcome: event.target.value as FollowUpDraft["outcome"] })}>
              <option value="">Choose follow-up</option>
              {Object.entries(courtesyOutcomes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label>Discussion note <small>(optional)</small><input disabled={busy} maxLength={500} value={draft.note} onChange={event => edit({ note: event.target.value })} /></label>
            <button className="pill" type="button" disabled={busy || !draft.outcome} onClick={() => void save({ action: "RECORD_FOLLOW_UP", code: item.code, ...draft })}>Save follow-up</button>
            <label className={styles.pick}><input type="checkbox" disabled={busy} checked={selected.includes(item.code)} onChange={event =>
              setSelected(current => event.target.checked ? [...current, item.code] : current.filter(code => code !== item.code))} /> Include in estimate review</label>
          </div>}
        </article>;
      })}
      <div className={styles.actions}>
        <Link className="pill" href={printHref} target="_blank" rel="noreferrer">Print findings</Link>
        {model?.canManage && checkedForQuote.length > 0 && <Link className="pill pill-primary" href={estimateHref}>Estimate selected recommendations</Link>}
      </div>
    </>}
  </section>;
}
