"use client";

import { useState } from "react";
import { repairEvidenceNeedsPhoto } from "@/lib/repair-procedure-evidence";

export function RepairProcedureEvidenceFields({ requirements, values, onChange, jobId }: {
  requirements: string[];
  values: Record<string, string>;
  onChange: (requirement: string, value: string) => void;
  jobId: string;
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  if (!requirements.length) return null;

  async function attachPhoto(item: string, file?: File) {
    if (!file || uploading) return;
    setUploading(item);
    setNotice("");
    const body = new FormData();
    body.set("photo", file);
    body.set("requirement", item);
    body.set("idempotencyKey", crypto.randomUUID());
    try {
      const response = await fetch(`/api/repair-jobs/${encodeURIComponent(jobId)}/procedure-photo`, { method: "POST", body });
      const result = await response.json();
      if (!response.ok || result.evidence?.status !== "AVAILABLE") throw new Error(result.error ?? "The photo could not be attached.");
      onChange(item, result.evidence.id);
      setNotice(`Photo attached for ${item}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The photo could not be attached.");
    } finally {
      setUploading(null);
    }
  }

  return <fieldset>
    <legend>Required procedure evidence</legend>
    {requirements.map(item => repairEvidenceNeedsPhoto(item) ? <label key={item}>
      <span>{uploading === item ? "Uploading photo…" : item}</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploading)}
        onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          void attachPhoto(item, file);
        }} />
      {Object.hasOwn(values, item) && values[item] && <span>Photo attached</span>}
    </label> : <label key={item}>
      <span>{item}</span>
      <input required minLength={3} maxLength={500} value={Object.hasOwn(values, item) ? values[item] : ""}
        placeholder="Measurement, finding, or evidence reference" onChange={event => onChange(item, event.target.value)} />
    </label>)}
    {notice && <p role="status">{notice}</p>}
  </fieldset>;
}
