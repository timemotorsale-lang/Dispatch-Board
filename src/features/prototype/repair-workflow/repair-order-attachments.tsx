"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { repairOrderAttachmentsEndpoint, repairOrderAttachmentMaxBytes, repairOrderAttachmentTypes } from "@/lib/repair-order-attachments";
import styles from "./repair-workflow.module.css";

type Attachment = { id: string; fileName: string; status: string; downloadUrl: string | null; version: number; legalHold: boolean; retentionUntil: string; canDelete: boolean };

export function RepairOrderAttachments({ repairOrderId, repairOrderNumber, backHref, canUpload, canGovern, items }: {
  repairOrderId: string;
  repairOrderNumber: string;
  backHref: string;
  canUpload: boolean;
  canGovern: boolean;
  items: Attachment[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const retryKey = useRef("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy || !canUpload) return;
    if (!repairOrderAttachmentTypes.some(type => type === file.type) || file.size > repairOrderAttachmentMaxBytes || !file.size) {
      setFeedback({ text: "Choose a PDF, JPEG, PNG, or WebP file up to 9 MB.", error: true });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const form = new FormData();
      form.set("file", file);
      if (!retryKey.current) retryKey.current = crypto.randomUUID();
      form.set("idempotencyKey", retryKey.current);
      const response = await fetch(repairOrderAttachmentsEndpoint(repairOrderId), { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not attach the file. Try again.");
      if (!["AVAILABLE", "QUARANTINED"].includes(result.status)) throw new Error("No upload confirmation was received. Retry the same file.");
      setFeedback(result.status === "QUARANTINED"
        ? { text: "The file was quarantined and cannot be opened.", error: true }
        : { text: result.duplicate ? "This file is already attached to this repair order." : "File attached to this repair order.", error: false });
      if (fileInput.current) fileInput.current.value = "";
      setFile(null);
      retryKey.current = "";
      router.refresh();
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Could not attach the file. Try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  async function changeRetention(event: FormEvent<HTMLFormElement>, item: Attachment) {
    event.preventDefault();
    if (!canGovern || busy) return;
    const remove = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "remove";
    if (remove && (!item.canDelete || !window.confirm(`Remove ${item.fileName} from this repair order?`))) return;
    const form = new FormData(event.currentTarget);
    const newDate = String(form.get("retainThrough") ?? "");
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/vehicle-evidence/${encodeURIComponent(item.id)}`, {
        method: remove ? "DELETE" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion: item.version, idempotencyKey: crypto.randomUUID(), reason: form.get("reason"),
          ...(remove ? {} : { legalHold: form.has("legalHold"), ...(newDate && { retentionUntil: new Date(`${newDate}T23:59:59.999Z`).toISOString() }) }),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update attachment retention.");
      setFeedback({ text: remove ? "Expired attachment removed." : "Retention settings saved.", error: false });
      router.refresh();
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Could not update attachment retention.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return <section aria-label="Repair order attachments" className={styles.attachmentPanel} data-repair-draft-owner data-repair-form-dirty={Boolean(file) || busy}>
    <header><div><h2>Repair order attachments</h2><p>Documents and photos for {repairOrderNumber}.</p></div><Link href={backHref}>Back to repair task</Link></header>
    {canUpload ? <form onSubmit={upload}>
      <label>Document or photo<input ref={fileInput} type="file" accept={repairOrderAttachmentTypes.join(",")} disabled={busy} onChange={event => { retryKey.current = ""; setFile(event.target.files?.[0] ?? null); setFeedback(null); }} required /></label>
      <button className={styles.primaryAction} disabled={!file || busy} type="submit">{busy ? "Attaching…" : "Attach document or photo"}</button>
      <small>PDF, JPEG, PNG, or WebP up to 9 MB. Staff access only.</small>
    </form> : <p>Uploads are not available for your role or this location.</p>}
    {feedback && <p role={feedback.error ? "alert" : "status"}>{feedback.text}</p>}
    {items.length ? <ul>{items.map(item => <li key={item.id}>{item.downloadUrl
      ? <a href={item.downloadUrl} target="_blank" rel="noreferrer">{item.fileName}</a>
      : <span>{item.fileName} · {item.status === "QUARANTINED" ? "Quarantined" : "Unavailable"}</span>}
      {canGovern && <details><summary>Manager retention settings{item.legalHold ? " · Legal hold" : ""}</summary>
        <p>Protected from removal until <time dateTime={item.retentionUntil.slice(0, 10)}>{item.retentionUntil.slice(0, 10)}</time>. This date does not delete the file automatically.</p>
        <form key={item.version} onSubmit={event => void changeRetention(event, item)}>
          <label>Protected from removal until<input name="retainThrough" type="date" disabled={busy} /><small>Leave blank to keep the current date.</small></label>
          <label><input name="legalHold" type="checkbox" defaultChecked={item.legalHold} disabled={busy} /> Legal hold</label>
          <label>Reason<input name="reason" required maxLength={500} disabled={busy} /></label>
          <button type="submit" disabled={busy}>Save retention</button>
          {item.canDelete && <button type="submit" value="remove" disabled={busy}>Remove attachment</button>}
        </form>
      </details>}
    </li>)}</ul> : <p>No attachments yet.</p>}
  </section>;
}
