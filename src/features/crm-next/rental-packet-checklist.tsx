"use client";

import { useEffect, useState, type ReactNode } from "react";
import { dealDocumentHref } from "@/lib/deal-dashboard-enterprise";
import type { SalesDocumentJacketView } from "@/server/sales-documents/service";
import styles from "./shared-deal-identities.module.css";

export type CheckoutPacketReview = { packet: SalesDocumentJacketView; reviews: { documentId: string; documentType: string; signed: boolean }[]; insuranceId: string };

async function packetRequest(path: string, options?: RequestInit): Promise<SalesDocumentJacketView> {
  const response = await fetch(path, { ...options, cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The checkout packet could not be updated.");
  return result;
}

export async function finalizeCheckoutReview({ packet, reviews }: CheckoutPacketReview) {
  const path = `/api/sales-documents/${encodeURIComponent(packet.id)}`;
  let current = packet;
  for (const review of reviews) {
    current = await packetRequest(path, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REVIEW", revision: current.revision, ...review })
    });
  }
  return packetRequest(path, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "FINALIZE", revision: current.revision })
  });
}

export function RentalPacketChecklist({ id, href, busy, canFinalize, onFinalize, onClose, refreshKey, activationFeedback, activationFeedbackId, coverageBlocked }: {
  id: string; href: string; busy: boolean; canFinalize: boolean; onFinalize: (review: CheckoutPacketReview) => void; onClose: () => void; refreshKey: number;
  activationFeedback: ReactNode; activationFeedbackId: string; coverageBlocked: boolean;
}) {
  const [state, setState] = useState<{ packet?: SalesDocumentJacketView; error?: string }>({});
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState<Record<string, string>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const [uploading, setUploading] = useState("");
  const [uploadStatus, setUploadStatus] = useState<{ message: string; error?: boolean }>();
  useEffect(() => {
    const id = new URL(href, window.location.origin).searchParams.get("jacketId");
    if (!id) return;
    let active: AbortController | undefined;
    const reload = () => {
      active?.abort();
      const controller = new AbortController();
      active = controller;
      void packetRequest(`/api/sales-documents/${encodeURIComponent(id)}`, { signal: controller.signal }).then(packet => {
        if (!controller.signal.aborted) setState(current => current.packet?.id === packet.id && current.packet.revision > packet.revision ? current : { packet });
      }).catch(error => { if (!controller.signal.aborted) setState(current => ({ ...current, error: error.message })); });
    };
    reload();
    window.addEventListener("focus", reload);
    return () => { active?.abort(); window.removeEventListener("focus", reload); };
  }, [href, refreshKey, reloadKey]);
  const packet = state.packet;
  async function uploadEvidence(file: File, documentType: string, label: string) {
    if (!packet || uploading) return;
    setUploading(documentType);
    setUploadStatus(undefined);
    try {
      const body = new FormData();
      body.set("documentType", documentType);
      body.set("file", file);
      const updated = await packetRequest(`/api/sales-documents/${encodeURIComponent(packet.id)}/documents`, { method: "POST", body });
      setState(current => current.packet?.id === updated.id && current.packet.revision > updated.revision ? current : { packet: updated });
      const uploaded = updated.documents.find(doc => doc.type === documentType && doc.fileName === file.name && doc.source !== "GENERATED");
      if (uploaded) setChoices(current => ({ ...current, [documentType]: uploaded.id }));
      setUploadStatus({ message: `${label} uploaded. Open it and check the item after verifying it.` });
    } catch (error) {
      setUploadStatus({ message: error instanceof Error ? error.message : `Could not upload ${label.toLowerCase()}. Try again.`, error: true });
    } finally {
      setUploading("");
    }
  }
  const rows = packet?.checklist.filter(item => item.required).map(item => {
    const files = packet.documents.filter(doc => doc.type === item.id && doc.source !== "GENERATED");
    const generated = packet.documents.find(doc => doc.type === item.id && doc.source === "GENERATED");
    const doc = files.find(file => file.id === choices[item.id]) ?? files.find(file => file.id === item.documentId) ?? files[0];
    const accepted = Boolean(item.waiver || doc?.reviewed && (!item.signed || doc.signed));
    return { item, files, doc, generated, accepted, checked: accepted || Boolean(doc && verified[item.id] === doc.id) };
  }) ?? [];
  const insurance = rows.find(row => row.item.id === "insurance-proof")?.doc;
  const agreement = rows.find(row => row.item.id === "signed-agreement")?.doc;
  const complete = Boolean(agreement && insurance && rows.every(row => row.checked));
  const missing = rows.filter(({ item, doc }) => !doc && (!item.waiver || item.id === "signed-agreement" || item.id === "insurance-proof"));
  return <fieldset id={id} tabIndex={-1} disabled={busy || Boolean(uploading)} className={styles.checkoutChecklist}>
    <legend>Checkout checklist</legend>
    <p>Open each file and confirm it matches its requirement. Replace any incorrect file before checking the item.</p>
    {state.error && <p role="alert">{state.error}</p>}
    {!packet && !state.error && <p role="status">Loading the checkout packet…</p>}
    {packet?.phase === "CHECKOUT" && !rows.length && <p>Open Sales Documents to review this packet’s requirements.</p>}
    {packet?.phase === "CHECKOUT" && missing.length > 0 && <p role="status"><strong>Missing checkout evidence:</strong> {missing.map(({ item }) => item.label).join(" · ")}</p>}
    {uploading && <p role="status">Uploading checkout evidence…</p>}
    {uploadStatus && <p role={uploadStatus.error ? "alert" : "status"}>{uploadStatus.message}</p>}
    {packet?.phase === "CHECKOUT" && <ul>{rows.map(({ item, files, doc, generated, accepted, checked }) => <li key={item.id}>
      <label><input type="checkbox" checked={checked} disabled={accepted || !doc} onChange={event => setVerified(current => ({ ...current, [item.id]: event.target.checked && doc ? doc.id : "" }))} />{item.label}{item.signed && !accepted ? " · signature verified" : ""}</label>
      {files.length > 1 && !item.waiver && <label>{item.label} file<select value={doc?.id ?? ""} onChange={event => setChoices(current => ({ ...current, [item.id]: event.target.value }))}>{files.map(file => <option key={file.id} value={file.id}>{file.fileName}</option>)}</select></label>}
      {doc && <a target="_blank" rel="noopener noreferrer" href={`/api/sales-documents/${encodeURIComponent(packet.id)}/documents/${encodeURIComponent(doc.id)}`}>{doc.fileName}</a>}
      {!doc && generated && <a target="_blank" rel="noopener noreferrer" href={`/api/sales-documents/${encodeURIComponent(packet.id)}/documents/${encodeURIComponent(generated.id)}`}>Open unsigned form for signing</a>}
      {(!item.waiver || item.id === "signed-agreement" || item.id === "insurance-proof") && <label>
        {doc ? "Upload replacement" : "Upload"} · {item.label}
        <input type="file" name={item.id} accept="application/pdf,image/png,image/jpeg" onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void uploadEvidence(file, item.id, item.label);
        }} />
      </label>}
      {!item.waiver && <a target="_blank" rel="noopener noreferrer" href={dealDocumentHref(packet.id, item.id)}>{doc ? "Replace" : "Find in Documents"} {item.label.toLowerCase()}</a>}
      {doc?.checksum && rows.some(other => other.item.id !== item.id && other.doc?.checksum === doc.checksum) &&
        <small>This file is also attached to another requirement. Check that it contains the right evidence for this item.</small>}
    </li>)}</ul>}
    {activationFeedback}
    {packet?.phase === "CHECKOUT" && <button className={coverageBlocked ? undefined : styles.rentalPrimary} type="button" aria-describedby={activationFeedbackId} disabled={!complete || !canFinalize} onClick={() => onFinalize({
      packet, insuranceId: insurance?.id ?? "", reviews: rows.flatMap(({ item, doc, accepted }) => !accepted && doc ? [{ documentId: doc.id, documentType: item.id, signed: item.signed }] : [])
    })}>{busy ? "Finalizing packet…" : coverageBlocked ? "Save reviewed paperwork" : "Finalize packet & continue to handoff"}</button>}
    {packet?.phase === "RETURN" && <p>Checkout packet finalized. Use Activate {packet.pathway === "vehicle-loaner" ? "Loaner" : "Rental"} to record handoff.</p>}
    <a href={href} target="_blank" rel="noopener noreferrer">Open Sales Documents</a>
    <button type="button" onClick={() => setReloadKey(current => current + 1)}>Refresh checklist</button>
    <button type="button" onClick={onClose}>Close checklist</button>
  </fieldset>;
}
