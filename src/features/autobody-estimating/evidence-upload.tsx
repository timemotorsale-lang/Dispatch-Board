"use client";

import { useState } from "react";
import styles from "./workspace.module.css";

export function CollisionEvidenceUpload({ vehicleId, disabled, onLinked }: { vehicleId: string; disabled: boolean; onLinked: (id: string) => void }) {
  const [file, setFile] = useState<File | null>(null), [retention, setRetention] = useState(""), [pending, setPending] = useState<Record<string, unknown> | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function upload() {
    if (!pending && (!file || !retention)) { setMessage("Choose a photo and the retention date required by your records policy. Photos are optional for draft saving."); return; }
    setBusy(true); setMessage("");
    try {
      let command = pending;
      if (!command) {
        if (file!.size > 10 * 1024 * 1024) throw new Error("Choose a photo no larger than 10 MB.");
        const encoded = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = () => reject(new Error("The photo could not be read.")); reader.readAsDataURL(file!); });
        command = { vehicleId, subjectType: "VEHICLE", subjectId: vehicleId, category: "PHOTO", accessLevel: "INTERNAL", fileName: file!.name, contentType: file!.type, contentBase64: encoded, retentionUntil: new Date(`${retention}T23:59:59`).toISOString(), idempotencyKey: crypto.randomUUID(), reason: "Preserve original vehicle damage photo for staff-reviewed collision estimating." };
        setPending(command);
      }
      const response = await fetch("/api/vehicle-evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) }), body = await response.json();
      if (!response.ok) { if (response.status < 500) setPending(null); throw new Error(body.error ?? "The photo could not be saved. Retry unchanged."); }
      setPending(null);
      if (body.evidence?.status !== "AVAILABLE" || body.evidence?.malwareStatus !== "CLEAN") throw new Error("The evidence library quarantined this file. Choose a valid photo; it has not been linked to the estimate.");
      onLinked(body.evidence.id); setFile(null); setMessage("Original photo preserved in the private vehicle evidence library. Save the draft to retain its link.");
    } catch (failure) { setMessage((failure as Error).message); } finally { setBusy(false); }
  }
  return <details><summary>+ Add damage photo (optional)</summary><div className={styles.fields}><label>Original photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy || Boolean(pending)} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label><label>Keep until · according to records policy<input type="date" value={retention} disabled={disabled || busy || Boolean(pending)} onChange={event => setRetention(event.target.value)} /></label></div><button type="button" disabled={disabled || busy} onClick={() => void upload()}>{busy ? "Saving photo…" : pending ? "Retry unchanged photo upload" : "Save photo & link"}</button>{message && <p role="status">{message}</p>}</details>;
}
