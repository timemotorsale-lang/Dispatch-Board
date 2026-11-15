"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { WorkflowDocument } from "./service-document-workflow";

export function EstimateDetailsCorrection({ repairOrderId, document, onSaved, onLockChange }: {
  repairOrderId: string;
  document: WorkflowDocument;
  onSaved: (id: string) => void;
  onLockChange: (locked: boolean) => void;
}) {
  const endpoint = `/api/repair-orders/${encodeURIComponent(repairOrderId)}/document-review`;
  const [access, setAccess] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const previousRequest = useRef<{ fields: string; key: string } | null>(null);
  const { content } = document;
  const details = content.estimateDetails;
  const mileage = details ? details.mileage : content.identity.odometer;
  const expiration = content.notes.map(note => /^Valid until (.+)\.$/.exec(note)?.[1]).find(Boolean);
  const originalExpiration = expiration && Number.isFinite(Date.parse(expiration))
    ? new Intl.DateTimeFormat("sv-SE", { timeZone: content.identity.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(expiration))
    : "";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${endpoint}?${new URLSearchParams({ documentId: document.id })}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Estimate correction access could not be checked.");
        setAccess((await response.json()).canCorrectEstimate === true);
      })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [endpoint, document.id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !access) return;
    const fields = new FormData(event.currentTarget);
    const payload = {
      action: "ESTIMATE_DETAILS", documentId: document.id, documentHash: document.sha256,
      estimateDate: fields.get("estimateDate"), serviceDate: fields.get("serviceDate"),
      validThrough: fields.get("validThrough"), unit: fields.get("unit"), reason: fields.get("reason"), memo: fields.get("memo"),
      mileage: fields.get("mileage") === "" ? null : Number(fields.get("mileage"))
    };
    const serialized = JSON.stringify(payload);
    if (previousRequest.current?.fields !== serialized) previousRequest.current = { fields: serialized, key: crypto.randomUUID() };
    setSaving(true);
    onLockChange(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, idempotencyKey: previousRequest.current.key })
      });
      const result = await response.json();
      if (!response.ok || !result.documentId) throw new Error(result.error ?? "Estimate correction could not be saved.");
      onSaved(result.documentId);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Estimate correction could not be saved.");
    } finally {
      setSaving(false);
      onLockChange(false);
    }
  }

  return <>
    {error && <p role="alert">{error}</p>}
    {access === null && !error && <p role="status">Checking correction access…</p>}
    {access === false && <p>Open the latest copy of this estimate with an account that can manage repair orders.</p>}
    {access && <form onSubmit={save}>
      <p>Saving adds a corrected copy to document history. The recorded approval and charges stay as saved.</p>
      <fieldset disabled={saving}>
        <p><label>Original estimate date <input type="date" name="estimateDate" defaultValue={details?.estimateDate ?? ""} /></label></p>
        <p><label>Service date <input type="date" name="serviceDate" defaultValue={details?.serviceDate ?? ""} /></label></p>
        <p><label>Valid through <input type="date" name="validThrough" defaultValue={details ? details.validThrough ?? "" : originalExpiration} /></label></p>
        <p><label>Mileage at intake <input type="number" name="mileage" min={0} max={2147483647} step={1} defaultValue={mileage?.reading ?? ""} /></label>{" "}
          <label>Unit <select name="unit" defaultValue={mileage?.unit ?? "MILES"}><option value="MILES">Miles</option><option value="KILOMETERS">Kilometers</option></select></label></p>
        <p>Leave unknown dates or mileage blank.</p>
        <p><label>Memo (optional, shown on estimate) <input type="text" name="memo" maxLength={120} size={28} defaultValue={details?.memo ?? ""} placeholder="Claim Authorization #" /></label></p>
        <p><label>Correction reason <textarea name="reason" required minLength={10} maxLength={500} /></label></p>
        <button type="submit">{saving ? "Saving…" : "Save corrected estimate"}</button>
      </fieldset>
    </form>}
  </>;
}
