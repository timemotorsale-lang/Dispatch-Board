"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ServiceDocumentContent } from "@/server/repair-order/service-documents";
import { ServiceDocument } from "./service-document";
import { ServiceBillingWorkspace } from "./service-billing-workspace";
import { DocumentApproval } from "./document-approval";
import { ServiceDocumentReview } from "./service-document-review";
import styles from "./service-document-workflow.module.css";
import { repairReviewHref } from "@/lib/repair-workflow-review";

export type WorkflowDocument = { id: string; sourceId: string; kind: string; content: ServiceDocumentContent; sha256: string; templateVersion: string; createdAt?: string; createdByName?: string };

export function ServiceDocumentWorkflow({ repairOrderId, documents, selectedId }: { repairOrderId: string; documents: WorkflowDocument[]; selectedId: string }) {
  const router = useRouter();
  const selected = documents.find(document => document.id === selectedId)!;
  const [panel, setPanel] = useState<"document" | "approval" | "billing" | "review">("document");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<ServiceDocumentContent | null>(null);
  const [actionLocked, setActionLocked] = useState(false);
  const [approvalRecorded, setApprovalRecorded] = useState(false);
  const actionPanel = useRef<HTMLElement>(null);
  const [actionRequest, setActionRequest] = useState(0);
  useEffect(() => {
    if (panel === "document") return;
    actionPanel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    actionPanel.current?.focus({ preventScroll: true });
  }, [panel, actionRequest]);
  const estimateSourceId = selected.kind === "AUTHORIZATION" ? selected.content.notes.map(note => /^Source estimate ([^,]+),/.exec(note)?.[1]).find(Boolean) : selected.sourceId;
  const latestDecision = documents.find(document => document.kind === "AUTHORIZATION" && document.content.notes.some(note => note.startsWith(`Source estimate ${estimateSourceId},`)));
  const approved = approvalRecorded || latestDecision?.content.decision?.disposition === "ACCEPTED";
  const stage = ["ESTIMATE", "AUTHORIZATION"].includes(selected.kind) ? (approved ? 1 : 0) : selected.kind === "INVOICE" ? 2 : 3;
  function openDocument(sourceId: string) {
    setActionLocked(false);
    router.push(`/service-documents?${new URLSearchParams({ repairOrderId, sourceId, workspace: "1" })}`);
  }
  function openSavedDocument(documentId: string) {
    setActionLocked(false);
    router.push(`/service-documents?${new URLSearchParams({ repairOrderId, documentId, workspace: "1" })}`);
    router.refresh();
  }
  return <main className={styles.workspace}>
    <header className={styles.toolbar}><div><Link aria-disabled={actionLocked || undefined} onClick={event => { if (actionLocked) event.preventDefault(); }} href={`/prototype/repair-explorer?repairOrderId=${encodeURIComponent(repairOrderId)}`}>← Labor Guide</Link><p>{selected.content.identity.repairOrderNumber} · {selected.content.identity.customer}</p><h1>Estimate to receipt</h1></div><div className={styles.buttons}>{["ESTIMATE", "INVOICE"].includes(selected.kind) && <button type="button" disabled={actionLocked} onClick={() => { setPanel("review"); setActionRequest(value => value + 1); }}>Customer details & charges</button>}<button type="button" disabled={actionLocked} onClick={() => window.print()}>Print / Save PDF</button>{stage < 3 && <button type="button" disabled={actionLocked} className={styles.primary} onClick={() => { setPanel(stage === 0 ? "approval" : "billing"); setActionRequest(value => value + 1); }}>{stage === 0 ? "Record customer approval" : stage === 1 ? (panel === "billing" ? "Review invoice requirements" : "Convert to invoice") : "Record payment"}</button>}</div></header>
    <Link aria-disabled={actionLocked || undefined} onClick={event => { if (actionLocked) event.preventDefault(); }} className={styles.qcLink} href={repairReviewHref(repairOrderId, "qc")}>Open QC</Link>
    <nav className={styles.steps} aria-label="Document progress">{["Estimate", "Approval", "Invoice", "Receipt"].map((label, index) => <span key={label} aria-current={stage === index ? "step" : undefined}><b>{index + 1}</b>{label}</span>)}</nav>
    <div className={styles.controls}><p>{stage === 0 ? "Your estimate is ready. Print it or record the customer’s approval to continue." : stage === 1 ? "Approval recorded. Review the approved charges and create the invoice when work is complete." : stage === 2 ? "Invoice issued. Record a verified payment to create its receipt." : "Payment or adjustment recorded. This saved receipt is ready to print."}</p><details><summary>Document history · {documents.length}</summary><ul>{documents.map(document => <li key={document.id}><button type="button" disabled={actionLocked} onClick={() => openSavedDocument(document.id)} aria-current={document.id === selected.id ? "true" : undefined}>{document.content.revisionLabel ?? (document.content.customerDetailsEdited ? "Customer details updated" : document.kind === "ESTIMATE" ? (documents.some(other => other.kind === "ESTIMATE" && other.sourceId !== document.sourceId) ? "Estimate revision" : "Estimate created") : document.kind === "AUTHORIZATION" ? `Approval · ${document.content.decision?.disposition.toLowerCase() ?? "recorded"}` : document.kind === "INVOICE" ? "Invoice issued" : document.kind === "PAYMENT" ? "Payment received" : document.content.title)} · {document.content.number}<small>{new Date(document.createdAt ?? document.content.issuedAt).toLocaleString("en-US", { timeZone: document.content.identity.timezone, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}{document.createdByName ? ` · ${document.createdByName}` : ""}</small></button></li>)}</ul></details></div>
    {notice && <p className={styles.controls} role="status">{notice}</p>}
    <div className={`${styles.content} ${panel !== "document" ? styles.withPanel : ""}`}><div className={styles.paper}><>{preview && <p className={styles.draftNotice} role="status">Unsaved preview — save changes before approval or printing.</p>}<ServiceDocument content={preview ?? selected.content} sha256={selected.sha256} templateVersion={selected.templateVersion} /></></div>
    {panel !== "document" && <aside ref={actionPanel} tabIndex={-1} className={styles.panel} aria-label={panel === "review" ? "Document review" : panel === "approval" ? "Approval actions" : "Invoice and payment actions"}><button type="button" disabled={actionLocked} onClick={() => setPanel("document")}>Close actions · view document</button>{panel === "review" ? <ServiceDocumentReview content={selected.content} onPreview={setPreview} repairOrderId={repairOrderId} documentId={selected.id} onSaved={openSavedDocument} onEstimate={openDocument} onLockChange={setActionLocked} /> : panel === "approval" ? <DocumentApproval customerName={selected.content.identity.customer} repairOrderId={repairOrderId} estimateId={estimateSourceId ?? ""} onLockChange={setActionLocked} onApproved={() => { setActionLocked(false); setApprovalRecorded(true); setNotice("Customer approval recorded."); setPanel("billing"); router.refresh(); }} /> : <ServiceBillingWorkspace repairOrderId={repairOrderId} onDocumentReady={openDocument} onLockChange={setActionLocked} />}</aside>}</div>
  </main>;
}
