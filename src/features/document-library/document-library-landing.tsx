"use client";

import {
  Archive,
  BadgeDollarSign,
  Camera,
  Car,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  FilePlus2,
  FileSearch,
  FileSignature,
  FileText,
  FolderPlus,
  LockKeyhole,
  Search,
  ShieldCheck,
  Truck,
  UserRound,
  Wrench
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import type { DocumentRecord, DocumentSensitivity, DocumentStatus } from "@/server/document-library/domain";

import styles from "./document-library-landing.module.css";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

type LibraryPacket = {
  blockers: string[];
  completion: { accepted: number; required: number };
  documents: string[];
  id: string;
  owner: DocumentRecord["owner"];
  packetType: string;
  requirements: Array<{
    blocker: string | null;
    documentId: string | null;
    documentType: string;
    id: string;
    label: string;
    required: boolean;
    state: string;
  }>;
  status: string;
  title: string;
  workflow: string;
};

type DocumentLibraryModel = {
  archivePreviews: Array<{ documentId: string; eligible: boolean; legalHold: boolean; reasons: string[]; retentionCategory: string }>;
  contractVersion: string;
  documents: DocumentRecord[];
  generatedAt: string;
  packets: LibraryPacket[];
  providerReferences: Array<{ documentId: string; documentType: string; family: string; health: string; provider: string; readOnly: boolean }>;
  reviewQueue: Array<{ blocker: string | null; documentId: string | null; packetId: string; packetTitle: string; requirementId: string; state: string }>;
  summary: {
    documents: number;
    legalHold: number;
    packets: number;
    providerReferences: number;
    readyPackets: number;
    reviewItems: number;
  };
};

type DocumentLibraryLandingProps = {
  error?: string | null;
  initialLibrary: DocumentLibraryModel | null;
};

const documentCategories = [
  { icon: UserRound, key: "CUSTOMER", label: "Customer", match: ["CUSTOMER", "CUSTOMER_AUTHORIZATION"] },
  { icon: Car, key: "VEHICLE", label: "Vehicle", match: ["VEHICLE", "TITLE_DOCUMENT", "ODOMETER"] },
  { icon: ClipboardCheck, key: "REPAIR_ORDER", label: "Repair Order", match: ["REPAIR", "ESTIMATE", "AUTHORIZATION"] },
  { icon: ShieldCheck, key: "CLAIM", label: "Claim", match: ["CLAIM", "INSURANCE", "DAMAGE", "TOW"] },
  { icon: Archive, key: "TITLE_DMV", label: "Title / DMV", match: ["TITLE", "DMV", "REGISTRATION", "ODOMETER"] },
  { icon: BadgeDollarSign, key: "SALE_FINANCE", label: "Sale / Finance", match: ["SALE", "FINANCE", "FUNDING", "BANK"] },
  { icon: FileSearch, key: "PURCHASE_APPRAISAL", label: "Purchase / Appraisal", match: ["PURCHASE", "APPRAISAL"] },
  { icon: Wrench, key: "WARRANTY", label: "Warranty", match: ["WARRANTY"] },
  { icon: Truck, key: "VENDOR", label: "Vendor", match: ["VENDOR"] },
  { icon: FolderPlus, key: "ACCOUNTING", label: "Accounting", match: ["ACCOUNTING", "INVOICE", "PAYMENT"] },
  { icon: Camera, key: "PHOTOS", label: "Photos", match: ["PHOTO", "DAMAGE"] },
  { icon: FileSignature, key: "SIGNED_FORMS", label: "Signed Forms", match: ["SIGNED", "SIGNATURE", "AUTHORIZATION"] }
];

const documentStatuses: DocumentStatus[] = ["RECEIVED", "PENDING_REVIEW", "ACCEPTED", "NEEDS_CORRECTION", "REJECTED", "ARCHIVED"];
const ownerTypes: DocumentRecord["owner"]["type"][] = ["CUSTOMER", "VEHICLE", "REPAIR_ORDER", "CLAIM", "TASK", "VENDOR", "SALE"];
const sensitivities: DocumentSensitivity[] = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", "SECURITY_AUDIT"];
const sources: DocumentRecord["source"][] = ["MANUAL_UPLOAD", "CUSTOMER_PORTAL", "GENERATED", "EXTERNAL_LINK", "PROVIDER_REFERENCE"];

function formatLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(status: string): StatusTone {
  if (status === "ACCEPTED" || status === "COMPLETE") return "success";
  if (status === "PENDING_REVIEW" || status === "RECEIVED") return "info";
  if (status === "NEEDS_CORRECTION" || status === "MISSING" || status === "BLOCKED") return "warning";
  if (status === "REJECTED") return "danger";
  return "neutral";
}

function documentCategory(document: DocumentRecord) {
  const text = `${document.documentType} ${document.owner.type} ${document.fileName}`.toUpperCase();
  return documentCategories.find((category) => category.match.some((term) => text.includes(term))) ?? documentCategories[0];
}

function StatusBadge({ label, tone = statusTone(label) }: { label: string; tone?: StatusTone }) {
  return <span className={`${styles.statusBadge} ${styles[tone]}`}><CheckCircle2 size={13} />{formatLabel(label)}</span>;
}

function ActionButton({ action, label, subjectId }: { action: string; label: string; subjectId: string }) {
  const [message, setMessage] = useState("");

  async function previewAction() {
    const response = await fetch("/api/document-library/actions", {
      body: JSON.stringify({
        action,
        idempotencyKey: `document-console-${action}-${subjectId}-${Date.now()}`,
        reason: `${label} requested from document console.`,
        subjectId
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const result = await response.json().catch(() => null) as { error?: string; command?: unknown; providerAction?: unknown } | null;
    setMessage(response.ok ? "Ready for governed review." : result?.error ?? "Action unavailable.");
  }

  return (
    <div className={styles.actionStack}>
      <button onClick={() => void previewAction()} type="button">{label}</button>
      {message ? <small>{message}</small> : null}
    </div>
  );
}

export function DocumentLibraryLanding({ error, initialLibrary }: DocumentLibraryLandingProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedDocumentId, setSelectedDocumentId] = useState(initialLibrary?.documents[0]?.id ?? "");
  const [selectedPacketId, setSelectedPacketId] = useState(initialLibrary?.packets[0]?.id ?? "");
  const [notice, setNotice] = useState(error ?? "Document console ready.");
  const [intake, setIntake] = useState({
    documentType: "CUSTOMER_AUTHORIZATION",
    fileName: "",
    ownerId: "",
    ownerLabel: "",
    ownerType: "CUSTOMER" as DocumentRecord["owner"]["type"],
    reason: "",
    reference: "",
    sensitivity: "INTERNAL" as DocumentSensitivity,
    source: "MANUAL_UPLOAD" as DocumentRecord["source"]
  });

  const library = initialLibrary;
  const selectedDocument = library?.documents.find((document) => document.id === selectedDocumentId) ?? library?.documents[0] ?? null;
  const selectedPacket = library?.packets.find((packet) => packet.id === selectedPacketId) ?? library?.packets[0] ?? null;
  const selectedArchivePreview = library?.archivePreviews.find((preview) => preview.documentId === selectedDocument?.id) ?? null;

  const filteredDocuments = useMemo(() => {
    if (!library) return [];
    const normalized = query.trim().toLowerCase();
    return library.documents.filter((document) => {
      const category = documentCategory(document);
      const searchable = [
        document.fileName,
        document.documentType,
        document.owner.label,
        document.owner.type,
        document.retentionCategory,
        document.sensitivity,
        document.source,
        document.status
      ].join(" ").toLowerCase();
      return (!normalized || searchable.includes(normalized)) &&
        (statusFilter === "ALL" || document.status === statusFilter) &&
        (categoryFilter === "ALL" || category.key === categoryFilter);
    });
  }, [categoryFilter, library, query, statusFilter]);

  async function submitIntake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!intake.fileName.trim() || !intake.documentType.trim() || !intake.ownerId.trim() || !intake.ownerLabel.trim() || !intake.reference.trim() || !intake.reason.trim()) {
      setNotice("Complete document type, file/reference, owner, storage reference, and reason before adding.");
      return;
    }

    const response = await fetch("/api/document-library/actions", {
      body: JSON.stringify({
        action: "CREATE_DOCUMENT",
        documentType: intake.documentType,
        fileName: intake.fileName,
        idempotencyKey: `document-console-create-${Date.now()}`,
        owner: { id: intake.ownerId, label: intake.ownerLabel, type: intake.ownerType },
        packetId: selectedPacket?.id,
        reason: intake.reason,
        sensitivity: intake.sensitivity,
        source: intake.source,
        storage: { provider: intake.source === "EXTERNAL_LINK" ? "EXTERNAL_LINK" : "INTERNAL", reference: intake.reference, version: 1 }
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const result = await response.json().catch(() => null) as { command?: { document?: DocumentRecord }; error?: string } | null;
    if (!response.ok) {
      setNotice(result?.error ?? "Document intake failed.");
      return;
    }
    setNotice(result?.command?.document ? `Document ${result.command.document.fileName} accepted into governed intake preview.` : "Document intake command accepted.");
  }

  if (!library) {
    return (
      <section className={styles.page} aria-labelledby="document-library-title">
        <header className={styles.hero}>
          <div>
            <h1 id="document-library-title">Document Library</h1>
            <p>{error ?? "Document Library is unavailable."}</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="document-library-title">
      <header className={styles.docConsoleHero}>
        <div>
          <h1 id="document-library-title">Document Library</h1>
          <p>Ingest, classify, link, review, preview, and govern documents from one operational workspace.</p>
        </div>
        <label className={styles.docSearch}>
          <Search size={18} />
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search file, customer, VIN, RO, claim, type, owner..." type="search" value={query} />
        </label>
        <div className={styles.docHeroActions}>
          <a href="#document-intake"><FilePlus2 size={17} />Add document</a>
          <a href="#document-preview"><FileSearch size={17} />Preview selected</a>
        </div>
      </header>

      <section className={styles.docMetrics} aria-label="Document library summary">
        <article><strong>{library.summary.documents}</strong><span>Documents</span></article>
        <article><strong>{library.summary.packets}</strong><span>Packets</span></article>
        <article><strong>{library.summary.reviewItems}</strong><span>Review items</span></article>
        <article><strong>{library.summary.legalHold}</strong><span>Legal holds</span></article>
        <article><strong>{library.summary.providerReferences}</strong><span>Provider refs</span></article>
      </section>

      <div className={styles.docConsoleLayout}>
        <aside className={styles.docFilterRail} aria-label="Document filters">
          <header><strong>Filters</strong><button onClick={() => { setQuery(""); setStatusFilter("ALL"); setCategoryFilter("ALL"); }} type="button">Reset</button></header>
          <label>Status<select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="ALL">All statuses</option>{documentStatuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}</select></label>
          <label>Category<select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}><option value="ALL">All categories</option>{documentCategories.map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}</select></label>
          <div className={styles.docCategoryList}>
            {documentCategories.map(({ icon: Icon, key, label }) => (
              <button className={categoryFilter === key ? styles.activeCategory : ""} key={key} onClick={() => setCategoryFilter(key)} type="button"><Icon size={16} />{label}</button>
            ))}
          </div>
        </aside>

        <main className={styles.docConsoleMain}>
          <form className={styles.docIntakePanel} id="document-intake" onSubmit={(event) => void submitIntake(event)}>
            <header>
              <div><span>Document intake</span><h2>Add or link document</h2></div>
              <StatusBadge label="RECEIVED" />
            </header>
            <div className={styles.docIntakeGrid}>
              <label>Document type<input onChange={(event) => setIntake((current) => ({ ...current, documentType: event.target.value }))} placeholder="TITLE_DOCUMENT" value={intake.documentType} /></label>
              <label>File / title<input onChange={(event) => setIntake((current) => ({ ...current, fileName: event.target.value }))} placeholder="title-scan.pdf" value={intake.fileName} /></label>
              <label>Source<select onChange={(event) => setIntake((current) => ({ ...current, source: event.target.value as DocumentRecord["source"] }))} value={intake.source}>{sources.map((source) => <option key={source} value={source}>{formatLabel(source)}</option>)}</select></label>
              <label>Sensitivity<select onChange={(event) => setIntake((current) => ({ ...current, sensitivity: event.target.value as DocumentSensitivity }))} value={intake.sensitivity}>{sensitivities.map((sensitivity) => <option key={sensitivity} value={sensitivity}>{formatLabel(sensitivity)}</option>)}</select></label>
              <label>Owner type<select onChange={(event) => setIntake((current) => ({ ...current, ownerType: event.target.value as DocumentRecord["owner"]["type"] }))} value={intake.ownerType}>{ownerTypes.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}</select></label>
              <label>Owner id<input onChange={(event) => setIntake((current) => ({ ...current, ownerId: event.target.value }))} placeholder="customer-123" value={intake.ownerId} /></label>
              <label>Owner label<input onChange={(event) => setIntake((current) => ({ ...current, ownerLabel: event.target.value }))} placeholder="Rid Moustapha" value={intake.ownerLabel} /></label>
              <label>Storage reference<input onChange={(event) => setIntake((current) => ({ ...current, reference: event.target.value }))} placeholder="internal://documents/new-file" value={intake.reference} /></label>
              <label className={styles.wideField}>Reason<textarea onChange={(event) => setIntake((current) => ({ ...current, reason: event.target.value }))} placeholder="Why is this document being added or linked?" value={intake.reason} /></label>
            </div>
            <footer>
              <button type="submit"><FilePlus2 size={16} />Add to library</button>
              <span>{notice}</span>
            </footer>
          </form>

          <div className={styles.docWorkGrid}>
            <section className={styles.docLibraryList} aria-label="Document library">
              <header><h2>Library</h2><span>{filteredDocuments.length} shown</span></header>
              <div>
                {filteredDocuments.map((document) => {
                  const category = documentCategory(document);
                  const Icon = category.icon;
                  return (
                    <button className={selectedDocument?.id === document.id ? styles.selectedDocumentRow : ""} key={document.id} onClick={() => setSelectedDocumentId(document.id)} type="button">
                      <Icon size={19} />
                      <span><strong>{document.fileName}</strong><small>{formatLabel(document.documentType)} · {document.owner.label}</small></span>
                      <StatusBadge label={document.status} />
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={styles.docPreviewPanel} id="document-preview" aria-label="Document preview">
              {selectedDocument ? (
                <>
                  <header>
                    <div><span>{formatLabel(selectedDocument.documentType)}</span><h2>{selectedDocument.fileName}</h2><p>{selectedDocument.owner.label} · {formatLabel(selectedDocument.owner.type)}</p></div>
                    <StatusBadge label={selectedDocument.status} />
                  </header>
                  <div className={styles.docPreviewCanvas}>
                    <FileText size={54} />
                    <strong>{selectedDocument.fileName}</strong>
                    <span>{selectedDocument.storage.provider} · v{selectedDocument.storage.version}</span>
                    <a href={selectedDocument.storage.reference.startsWith("http") ? selectedDocument.storage.reference : "#document-preview"}><ExternalLink size={14} />Open source</a>
                  </div>
                  <dl className={styles.docMetaGrid}>
                    <div><dt>Category</dt><dd>{documentCategory(selectedDocument).label}</dd></div>
                    <div><dt>Sensitivity</dt><dd>{formatLabel(selectedDocument.sensitivity)}</dd></div>
                    <div><dt>Retention</dt><dd>{selectedDocument.retentionCategory}</dd></div>
                    <div><dt>Source</dt><dd>{formatLabel(selectedDocument.source)}</dd></div>
                    <div><dt>Legal hold</dt><dd>{selectedDocument.legalHold ? "Active" : "None"}</dd></div>
                    <div><dt>Archive eligibility</dt><dd>{selectedArchivePreview?.eligible ? "Eligible" : selectedArchivePreview?.reasons.join(" ") || "Review required"}</dd></div>
                  </dl>
                </>
              ) : <p>No document selected.</p>}
            </section>

            <aside className={styles.docReadinessPanel} aria-label="Enterprise readiness">
              <header><h2>Readiness</h2><p>Enterprise controls before adoption or archive.</p></header>
              {selectedDocument ? (
                <>
                  <p className={selectedDocument.legalHold ? styles.readinessRisk : styles.readinessGood}><LockKeyhole size={15} />{selectedDocument.legalHold ? "Legal hold active" : "No legal hold"}</p>
                  <p className={selectedDocument.sensitivity === "RESTRICTED" || selectedDocument.sensitivity === "SECURITY_AUDIT" ? styles.readinessRisk : styles.readinessGood}><ShieldCheck size={15} />{formatLabel(selectedDocument.sensitivity)}</p>
                  <p className={selectedDocument.status === "ACCEPTED" ? styles.readinessGood : styles.readinessWatch}><FileCheck2 size={15} />{formatLabel(selectedDocument.status)}</p>
                  <ActionButton action="REVIEW_DOCUMENT" label="Preview review" subjectId={selectedDocument.id} />
                  <ActionButton action="PREVIEW_ARCHIVE" label="Preview archive" subjectId={selectedDocument.id} />
                  <ActionButton action={selectedDocument.legalHold ? "RELEASE_LEGAL_HOLD" : "SET_LEGAL_HOLD"} label={selectedDocument.legalHold ? "Release legal hold" : "Set legal hold"} subjectId={selectedDocument.id} />
                </>
              ) : null}
            </aside>
          </div>

          <section className={styles.docPacketWorkspace} aria-label="Packet workspace">
            <header><h2>Packets</h2><span>{library.packets.length} governed packets</span></header>
            <div className={styles.docPacketGrid}>
              <div className={styles.docPacketList}>
                {library.packets.map((packet) => (
                  <button className={selectedPacket?.id === packet.id ? styles.selectedPacketButton : ""} key={packet.id} onClick={() => setSelectedPacketId(packet.id)} type="button">
                    <span><strong>{packet.title}</strong><small>{packet.workflow} · {packet.owner.label}</small></span>
                    <StatusBadge label={packet.status} />
                  </button>
                ))}
              </div>
              <div className={styles.docPacketDetail}>
                {selectedPacket ? (
                  <>
                    <h3>{selectedPacket.title}</h3>
                    <p>{selectedPacket.completion.accepted} of {selectedPacket.completion.required} required accepted.</p>
                    <div className={styles.docRequirementList}>
                      {selectedPacket.requirements.map((requirement) => (
                        <article key={requirement.id}>
                          <FileCheck2 size={17} />
                          <span><strong>{requirement.label}</strong><small>{requirement.blocker ?? "Requirement satisfied or waived."}</small></span>
                          <StatusBadge label={requirement.state} />
                        </article>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </section>

          <section className={styles.docAuditTimeline} aria-label="Document audit trail">
            <header><h2>Audit & source</h2><span>Latest selected document trail</span></header>
            {selectedDocument?.auditTrail.map((event) => (
              <article key={`${event.action}-${event.at}`}>
                <span>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.at))}</span>
                <strong>{formatLabel(event.action)}</strong>
                <small>{event.actor} · {event.note}</small>
              </article>
            ))}
          </section>
        </main>
      </div>
    </section>
  );
}
