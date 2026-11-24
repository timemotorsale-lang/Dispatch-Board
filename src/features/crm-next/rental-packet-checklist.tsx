"use client";

import { useEffect, useState, type ReactNode } from "react";
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

export function RentalPacketChecklist({ id, href, busy, canFinalize, onFinalize, onClose, refreshKey, activationFeedback, activationFeedbackId }: {
  id: string; href: string; busy: boolean; canFinalize: boolean; onFinalize: (review: CheckoutPacketReview) => void; onClose: () => void; refreshKey: number;
  activationFeedback: ReactNode; activationFeedbackId: string;
}) {
  const [state, setState] = useState<{ packet?: SalesDocumentJacketView; error?: string }>({});
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState<Record<string, string>>({});
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    const id = new URL(href, window.location.origin).searchParams.get("jacketId");
    if (!id) return;
    let active: AbortController | undefined;
    const reload = () => {
      active?.abort();
      const controller = new AbortController();
      active = controller;
      void packetRequest(`/api/sales-documents/${encodeURIComponent(id)}`, { signal: controller.signal }).then(packet => {
        if (!controller.signal.aborted) setState({ packet });
      }).catch(error => { if (!controller.signal.aborted) setState({ error: error.message }); });
    };
    reload();
    window.addEventListener("focus", reload);
    return () => { active?.abort(); window.removeEventListener("focus", reload); };
  }, [href, refreshKey, reloadKey]);
  const packet = state.packet;
  const rows = packet?.checklist.filter(item => item.required).map(item => {
    const files = packet.documents.filter(doc => doc.type === item.id && doc.source !== "GENERATED");
    const doc = files.find(file => file.id === choices[item.id]) ?? files.find(file => file.id === item.documentId) ?? files[0];
    const accepted = Boolean(item.waiver || doc?.reviewed && (!item.signed || doc.signed));
    return { item, files, doc, accepted, checked: accepted || Boolean(doc && verified[item.id] === doc.id) };
  }) ?? [];
  const insurance = rows.find(row => row.item.id === "insurance-proof")?.doc;
  const agreement = rows.find(row => row.item.id === "signed-agreement")?.doc;
  const complete = Boolean(agreement && insurance && rows.every(row => row.checked));
  return <fieldset id={id} tabIndex={-1} disabled={busy} className={styles.checkoutChecklist}>
    <legend>Checkout checklist</legend>
    <p>Open and verify each required file, then finalize the packet to continue to handoff.</p>
    {state.error && <p role="alert">{state.error}</p>}
    {!packet && !state.error && <p role="status">Loading the checkout packet…</p>}
    {packet?.phase === "CHECKOUT" && !rows.length && <p>Open Sales Documents to review this packet’s requirements.</p>}
    {packet?.phase === "CHECKOUT" && <ul>{rows.map(({ item, files, doc, accepted, checked }) => <li key={item.id}>
      <label><input type="checkbox" checked={checked} disabled={accepted || !doc} onChange={event => setVerified(current => ({ ...current, [item.id]: event.target.checked && doc ? doc.id : "" }))} />{item.label}{item.signed && !accepted ? " · signature verified" : ""}</label>
      {files.length > 1 && !item.waiver && <label>{item.label} file<select value={doc?.id ?? ""} onChange={event => setChoices(current => ({ ...current, [item.id]: event.target.value }))}>{files.map(file => <option key={file.id} value={file.id}>{file.fileName}</option>)}</select></label>}
      {doc ? <a target="_blank" rel="noopener noreferrer" href={`/api/sales-documents/${encodeURIComponent(packet.id)}/documents/${encodeURIComponent(doc.id)}`}>{doc.fileName}</a> : !item.ready && <span> · Upload in Sales Documents</span>}
    </li>)}</ul>}
    {activationFeedback}
    {packet?.phase === "CHECKOUT" && <button className={styles.rentalPrimary} type="button" aria-describedby={activationFeedbackId} disabled={!complete || !canFinalize} onClick={() => onFinalize({
      packet, insuranceId: insurance?.id ?? "", reviews: rows.flatMap(({ item, doc, accepted }) => !accepted && doc ? [{ documentId: doc.id, documentType: item.id, signed: item.signed }] : [])
    })}>{busy ? "Finalizing packet…" : "Finalize packet & continue to handoff"}</button>}
    {packet?.phase === "RETURN" && <p>Checkout packet finalized. Use Activate Rental to record handoff.</p>}
    <a href={href} target="_blank" rel="noopener noreferrer">Open Sales Documents</a>
    <button type="button" onClick={() => setReloadKey(current => current + 1)}>Refresh checklist</button>
    <button type="button" onClick={onClose}>Close checklist</button>
  </fieldset>;
}
