"use client";

import { useRef, useState, type FormEvent } from "react";
import { diagnosisFormId, diagnosisRequestStatus, type DiagnosisRequest } from "@/lib/repair-diagnosis-request";
import { notifyRepairReviewSaved } from "@/lib/repair-workflow-review";
import styles from "./repair-diagnosis-work.module.css";

type Party = { id: string; name: string };

export function RepairDiagnosisWork({ repairOrderId, vehicleId, version, concern, request, technicians, vendors, evidence, canRequest, canRecord, canUpload, blocker, initiallyVendor }: {
  repairOrderId: string; vehicleId: string; version: number; concern: string; request: DiagnosisRequest | null;
  technicians: Party[]; vendors: Party[]; evidence: { id: string; fileName: string }[];
  canRequest: boolean; canRecord: boolean; canUpload: boolean; blocker: string | null; initiallyVendor?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [route, setRoute] = useState<DiagnosisRequest["route"]>(request?.route ?? (initiallyVendor ? "OUTSIDE_VENDOR" : "IN_HOUSE"));
  const [attachment, setAttachment] = useState<{ id: string; fileName: string }>();
  const [evidenceId, setEvidenceId] = useState("");
  const [file, setFile] = useState<File>();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const operation = useRef<{ key: string; input: string }>(null);
  const fileOperation = useRef<{ key: string; file: File }>(null);
  const mode = request && !editing ? "findings" : "request";
  const editable = mode === "request" ? canRequest : canRecord;
  const parties = route === "IN_HOUSE" ? technicians : vendors;
  const readyToSave = editable && (mode === "findings" || parties.length > 0);

  function switchEdit(value: boolean) {
    setEditing(value);
    setRoute(request?.route ?? "IN_HOUSE");
    setEvidenceId(value ? request?.evidenceId ?? "" : "");
    setFile(undefined);
    setNotice("");
  }

  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.readAsDataURL(file);
      });
      if (fileOperation.current?.file !== file) fileOperation.current = { file, key: crypto.randomUUID() };
      const retention = new Date();
      retention.setUTCFullYear(retention.getUTCFullYear() + 3);
      retention.setUTCHours(23, 59, 59, 999);
      const response = await fetch("/api/vehicle-evidence", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vehicleId, subjectType: "REPAIR_ORDER", subjectId: repairOrderId, relationship: "SUPPORTS",
          fileName: file.name, contentType: file.type, contentBase64, category: file.type.startsWith("image/") ? "PHOTO" : "REPAIR",
          accessLevel: "INTERNAL", retentionUntil: retention.toISOString(), idempotencyKey: fileOperation.current.key,
          reason: "Attach supporting diagnosis material to the repair order.",
        }),
      });
      const result = await response.json();
      if (!response.ok || result.evidence?.status !== "AVAILABLE") throw new Error(result.error ?? "This attachment could not be used.");
      setAttachment({ id: result.evidence.id, fileName: result.evidence.fileName });
      setEvidenceId(result.evidence.id);
      setFile(undefined);
      setNotice("Attachment linked to the repair order.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not upload the attachment.");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!readyToSave || busy) return;
    const form = new FormData(event.currentTarget);
    const detail = { ...Object.fromEntries(form), action: mode, expectedVersion: version, route, evidenceId };
    const input = JSON.stringify(detail);
    if (operation.current?.input !== input) operation.current = { input, key: crypto.randomUUID() };
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/diagnosis-work`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...detail, idempotencyKey: operation.current.key }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save diagnosis work.");
      notifyRepairReviewSaved(repairOrderId, mode === "request" ? "diagnosis" : "estimate");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save diagnosis work.");
    } finally {
      setBusy(false);
    }
  }

  const options = attachment && !evidence.some(item => item.id === attachment.id) ? [attachment, ...evidence] : evidence;
  return <section className={styles.tool} aria-label="Diagnosis work">
    {request && !editing && <div className={styles.request}>
      <div><strong>{diagnosisRequestStatus(request)} · {request.assigneeName}</strong><p>{request.instructions}</p>
        {request.evidenceId && options.some(item => item.id === request.evidenceId) &&
          <a href={`/api/vehicle-evidence/${encodeURIComponent(request.evidenceId)}/content`}>Open request attachment</a>}
      </div>
      {canRequest && <button className="button button-secondary" type="button" onClick={() => switchEdit(true)}>Edit request</button>}
    </div>}
    {blocker && <p role="status">{blocker}</p>}
    {!editable && !blocker && <p role="status">{request ? "The assigned technician or an authorized advisor can record findings." : "An authorized advisor or manager can save the diagnosis request."}</p>}
    {editable && <form key={mode} id={diagnosisFormId} onSubmit={save}>
      <h3>{mode === "request" ? "Request diagnosis" : "Record findings"}</h3>
      {mode === "request" ? <>
        <p className={styles.concern}><strong>Reported concern</strong> {concern}</p>
        <label>What should be checked?<textarea name="instructions" defaultValue={editing ? request?.instructions : undefined} maxLength={1000} rows={2} required /></label>
        <div className={styles.row}>
          <label>Who will diagnose it?<select value={route} onChange={event => setRoute(event.target.value === "OUTSIDE_VENDOR" ? "OUTSIDE_VENDOR" : "IN_HOUSE")}>
            <option value="IN_HOUSE">In-house</option><option value="OUTSIDE_VENDOR">Outside vendor</option>
          </select></label>
          <label>{route === "IN_HOUSE" ? "Technician" : "Vendor"}<select key={route} name="assigneeId" required defaultValue={editing && request?.route === route ? request.assigneeId : ""}>
            <option value="">{route === "IN_HOUSE" ? "Choose technician" : "Choose vendor"}</option>
            {parties.map(party => <option key={party.id} value={party.id}>{party.name}</option>)}
          </select></label>
        </div>
        {!parties.length && <p role="status">{route === "OUTSIDE_VENDOR" ? "Add an active vendor in Outside Vendors to route this request." : "An active technician is required."}</p>}
      </> : <>
        <label>What was found?<textarea name="findings" rows={2} maxLength={1000} required /></label>
        <label>What work is recommended?<textarea name="recommendation" rows={2} maxLength={500} required /></label>
        <details><summary>Add technical details</summary>
          <label>Confirmed cause<input name="cause" maxLength={500} /></label>
          <div className={styles.row}>
            <label>Test performed<input name="testName" maxLength={200} /></label>
            <label>Test result<input name="testResult" maxLength={500} /></label>
          </div>
        </details>
      </>}
      {(options.length > 0 || canUpload) && <details><summary>{evidenceId ? "Attachment selected" : "Add photo or report"}</summary>
        {options.length > 0 && <label>Saved attachments<select value={evidenceId} onChange={event => setEvidenceId(event.target.value)}>
          <option value="">No attachment</option>{options.map(item => <option key={item.id} value={item.id}>{item.fileName}</option>)}
        </select></label>}
        {canUpload && <div className={styles.row}>
          <label>Choose a file<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event => setFile(event.target.files?.[0])} /></label>
          <button className="button button-secondary" disabled={!file || busy} type="button" onClick={() => void upload()}>Attach file</button>
        </div>}
      </details>}
      {notice && <p role="status">{notice}</p>}
      <div className={styles.actions}>
        {editing && <button className="button button-secondary" type="button" onClick={() => switchEdit(false)} disabled={busy}>Cancel edit</button>}
        <button className="button button-primary" type="submit" disabled={busy || !readyToSave}>
          {busy ? "Working…" : mode === "findings" ? "Save findings" : route === "OUTSIDE_VENDOR" ? "Save vendor handoff" : "Save diagnosis request"}
        </button>
      </div>
    </form>}
  </section>;
}
