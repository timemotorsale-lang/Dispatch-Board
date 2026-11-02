"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { PipelineRow } from "@/lib/crm-pipeline";
import type { UnifiedCrmForecastReadModel } from "@/server/unified-crm/forecast-contract";
import s from "./pipeline-dashboard.module.css";

export function PipelineForecast({ record, canManage, canWrite, onSaved }: { record: PipelineRow; canManage: boolean; canWrite: boolean; onSaved: () => void }) {
  const [model, setModel] = useState<UnifiedCrmForecastReadModel | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const keys = useRef(new Map<string, string>()), endpoint = `/api/crm/v1/opportunities/${encodeURIComponent(record.id)}/forecast`;
  const load = useCallback(async () => { try { const response = await fetch(endpoint, { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setModel(result); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Forecast could not be loaded."); } }, [endpoint]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
    const payload = { source: values.source, category: values.category, amountCents: Math.round(Number(values.amount) * 100), probabilityBasisPts: Math.round(Number(values.probability) * 100), expectedVersion: record.version, reason: values.reason };
    const fingerprint = JSON.stringify(payload), key = keys.current.get(fingerprint) ?? crypto.randomUUID(); keys.current.set(fingerprint, key);
    setBusy(true);
    try { const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, idempotencyKey: key }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); keys.current.delete(fingerprint); await load(); onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : "Forecast was not saved; entries remain available."); }
    finally { setBusy(false); }
  }
  const money = (value: number) => (value / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return <section aria-label="Opportunity forecast"><h3>Forecast judgment</h3>{error && <p role="alert" className={s.error}>{error}</p>}
    {model && <><p>Stage baseline: {record.estimatedValueCents === null ? "Unknown amount" : money(model.baseline.amountCents)} · {model.baseline.category} · {model.baseline.probabilityBasisPts / 100}%. This is a deterministic stage rule.</p>
      {[model.latestSellerJudgment, model.latestManagerJudgment].map(j => j && <p key={j.id}><strong>{j.source === "SELLER_JUDGMENT" ? "Seller judgment" : "Manager judgment"}</strong> · {money(j.amountCents)} · {j.category}<br />{j.reason} · {j.createdByName}</p>)}
      <form className={s.form} onSubmit={save}><label className={s.field}>Judgment source<select name="source"><option value="SELLER_JUDGMENT">Seller judgment</option>{canManage && <option value="MANAGER_JUDGMENT">Manager judgment</option>}</select></label>
        <label className={s.field}>Forecast category<select name="category">{["WATCH", "PIPELINE", "BEST_CASE", "COMMIT", "CLOSED"].map(v => <option key={v}>{v}</option>)}</select></label>
        <label className={s.field}>Forecast amount · USD<input name="amount" type="number" min="0" step="0.01" required /></label>
        <label className={s.field}>Probability · percent<input name="probability" type="number" min="0" max="100" step="0.01" required /></label>
        <label className={s.field}>Judgment reason<textarea name="reason" minLength={8} maxLength={500} required /></label>
        <button className={s.primary} disabled={busy || !canWrite}>{busy ? "Saving…" : "Save forecast judgment"}</button>
      </form><p>Forecasts do not record receipts, funding or a sale. Changing a forecast does not change the opportunity stage.</p></>}
  </section>;
}
