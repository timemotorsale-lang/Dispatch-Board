"use client";

import {
  Archive,
  AlertTriangle,
  BadgeDollarSign,
  Brain,
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
  Sparkles,
  Truck,
  UserRound,
  Wrench
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import type { DocumentRecord, DocumentSensitivity, DocumentStatus, ReviewDecision } from "@/server/document-library/domain";

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
    waived?: { by: string; reason: string; waivedAt: string };
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
  intelligence?: {
    confidence: number;
    generatedBy: string;
    recommendations: Array<{
      actionLabel: string;
      confidence: number;
      evidence: string[];
      id: string;
      kind: string;
      priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
      rationale: string;
      targetDocumentId: string | null;
      targetPacketId: string | null;
      title: string;
    }>;
    riskFlags: Array<{ count: number; label: string; priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" }>;
    score: number;
    summary: string;
  };
  packets: LibraryPacket[];
  providerReferences: Array<{
    documentId: string;
    documentType: string;
    externalId?: string;
    family: string;
    health: string;
    lastVerifiedAt: string | null;
    provider: string;
    readOnly: boolean;
    url: string | null;
  }>;
  reviewQueue: Array<{ blocker: string | null; documentId: string | null; packetId: string; packetTitle: string; requirementId: string; state: string }>;
  storageRollout?: {
    durableRepository?: {
      enabled: boolean;
      mode: string;
      sync: null | {
        gateReady: boolean;
        snapshot: {
          auditEvents: number;
          documents: number;
          packetDocuments: number;
          packetRequirements: number;
          packets: number;
          providerReferences: number;
        };
        templates: number;
      };
      version: string;
    };
    gate: {
      blockers: Array<{ key: string; label: string; reason: string }>;
      milestones: Array<{ key: string; label: string; reason: string; status: "COMPLETE" | "BLOCKED" }>;
      readyForRelease: boolean;
    };
    packetTemplates: Array<{ templateKey: string; title: string; workflow: string }>;
    persistencePlan: {
      auditEvents: number;
      documents: number;
      packetDocuments: number;
      packetRequirements: number;
      packets: number;
      providerReferences: number;
    };
    platformVersion: string;
  };
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

type DocumentLibraryActionResponse = {
  command?: {
    action: string;
    document?: DocumentRecord;
    packet?: LibraryPacket;
  };
  error?: string;
  providerAction?: {
    action: string;
    auditRequired: true;
    liveProviderWriteEnabled: false;
    permission: string;
    rollbackPosture: string;
    state: string;
    subjectId: string;
  };
  providerExecution?: {
    action: string;
    auditAction: string;
    idempotencyKey: string;
    rollbackPosture: string;
    state: string;
    subjectId: string;
  };
};

type WorklistKey = "ALL" | "NEEDS_REVIEW" | "LEGAL_HOLD" | "PROVIDER_REFS" | "ARCHIVE_CANDIDATES";

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
const worklists: Array<{ description: string; key: WorklistKey; label: string }> = [
  { description: "Every active document in the library.", key: "ALL", label: "All documents" },
  { description: "Received, pending, rejected, or correction work.", key: "NEEDS_REVIEW", label: "Needs review" },
  { description: "Documents blocked by legal hold.", key: "LEGAL_HOLD", label: "Legal holds" },
  { description: "Documents connected to external references.", key: "PROVIDER_REFS", label: "Provider refs" },
  { description: "Unlinked, unheld documents ready for archive.", key: "ARCHIVE_CANDIDATES", label: "Archive candidates" }
];

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

function priorityTone(priority: string): StatusTone {
  if (priority === "CRITICAL") return "danger";
  if (priority === "HIGH" || priority === "MEDIUM") return "warning";
  return "info";
}

function assistantVerb(kind: string) {
  if (kind === "MISSING_REQUIREMENT") return "Collect document";
  if (kind === "LEGAL_HOLD_BLOCKER") return "Resolve hold";
  if (kind === "CORRECTION_REQUIRED") return "Fix correction";
  if (kind === "PACKET_HANDOFF_READY") return "Preview handoff";
  if (kind === "PROVIDER_REFERENCE_STALE") return "Check provider";
  if (kind === "ARCHIVE_READY") return "Review archive";
  if (kind === "DUPLICATE_CANDIDATE") return "Compare files";
  return "Open task";
}

function assistantPlainState(kind: string) {
  if (kind === "MISSING_REQUIREMENT") return "Missing";
  if (kind === "LEGAL_HOLD_BLOCKER") return "Blocked";
  if (kind === "CORRECTION_REQUIRED") return "Needs correction";
  if (kind === "PACKET_HANDOFF_READY") return "Ready";
  if (kind === "PROVIDER_REFERENCE_STALE") return "Needs check";
  if (kind === "ARCHIVE_READY") return "Cleanup";
  if (kind === "DUPLICATE_CANDIDATE") return "Possible duplicate";
  return "Task";
}

function documentCategory(document: DocumentRecord) {
  const text = `${document.documentType} ${document.owner.type} ${document.fileName}`.toUpperCase();
  return documentCategories.find((category) => category.match.some((term) => text.includes(term))) ?? documentCategories[0];
}

function StatusBadge({ label, tone = statusTone(label) }: { label: string; tone?: StatusTone }) {
  return <span className={`${styles.statusBadge} ${styles[tone]}`}><CheckCircle2 size={13} />{formatLabel(label)}</span>;
}

export function DocumentLibraryLanding({ error, initialLibrary }: DocumentLibraryLandingProps) {
  const [libraryState, setLibraryState] = useState(initialLibrary);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [worklistFilter, setWorklistFilter] = useState<WorklistKey>("ALL");
  const [queueFilter, setQueueFilter] = useState("ALL");
  const [selectedDocumentId, setSelectedDocumentId] = useState(initialLibrary?.documents[0]?.id ?? "");
  const [selectedPacketId, setSelectedPacketId] = useState(initialLibrary?.packets[0]?.id ?? "");
  const [notice, setNotice] = useState(error ?? "Document console ready.");
  const [actionReason, setActionReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [providerPreview, setProviderPreview] = useState<DocumentLibraryActionResponse["providerAction"] | null>(null);
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

  const library = libraryState;
  const selectedDocument = library?.documents.find((document) => document.id === selectedDocumentId) ?? library?.documents[0] ?? null;
  const selectedPacket = library?.packets.find((packet) => packet.id === selectedPacketId) ?? library?.packets[0] ?? null;
  const selectedArchivePreview = useMemo(() => {
    if (!selectedDocument || !library) return null;
    const activePackets = library.packets.filter((packet) => packet.documents.includes(selectedDocument.id));
    const reasons = [
      ...(selectedDocument.legalHold ? ["Document is under legal hold."] : []),
      ...(activePackets.length > 0 ? ["Document is still linked to active packet work."] : [])
    ];
    return {
      documentId: selectedDocument.id,
      eligible: reasons.length === 0,
      legalHold: selectedDocument.legalHold,
      reasons,
      retentionCategory: selectedDocument.retentionCategory
    };
  }, [library, selectedDocument]);

  const summary = useMemo(() => {
    const packets = library?.packets ?? [];
    const documents = library?.documents ?? [];
    return {
      documents: documents.length,
      legalHold: documents.filter((document) => document.legalHold).length,
      packets: packets.length,
      providerReferences: documents.reduce((count, document) => count + document.providerReferences.length, 0),
      readyPackets: packets.filter((packet) => packet.status === "COMPLETE").length,
      reviewItems: packets.flatMap((packet) => packet.requirements).filter((requirement) => requirement.state !== "ACCEPTED" && requirement.state !== "WAIVED").length
    };
  }, [library]);

  const selectedProviderReferences = useMemo(() => {
    if (!library || !selectedDocument) return [];
    return library.providerReferences.filter((reference) => reference.documentId === selectedDocument.id);
  }, [library, selectedDocument]);

  const reviewQueue = useMemo(() => {
    if (!library) return [];
    return library.packets.flatMap((packet) => packet.requirements
      .filter((requirement) => requirement.state !== "ACCEPTED" && requirement.state !== "WAIVED")
      .map((requirement) => ({
        blocker: requirement.blocker,
        documentId: requirement.documentId,
        packetId: packet.id,
        packetTitle: packet.title,
        requirementId: requirement.id,
        requirementLabel: requirement.label,
        state: requirement.state
      })));
  }, [library]);

  const filteredReviewQueue = useMemo(() => reviewQueue.filter((item) => queueFilter === "ALL" || item.state === queueFilter), [queueFilter, reviewQueue]);
  const queueStates = useMemo(() => Array.from(new Set(reviewQueue.map((item) => item.state))), [reviewQueue]);
  const selectedPacketBlocker = selectedPacket?.requirements.find((requirement) => requirement.state !== "ACCEPTED" && requirement.state !== "WAIVED") ?? null;
  const selectedPacketReadiness = useMemo(() => {
    if (!selectedPacket) return null;
    const blockers = selectedPacket.requirements.filter((requirement) => requirement.state !== "ACCEPTED" && requirement.state !== "WAIVED");
    const percent = selectedPacket.completion.required > 0
      ? Math.round((selectedPacket.completion.accepted / selectedPacket.completion.required) * 100)
      : 100;
    return {
      blockers,
      nextRequirement: blockers[0] ?? null,
      percent
    };
  }, [selectedPacket]);

  const documentInsights = useMemo(() => {
    if (!library) return new Map<string, { archiveEligible: boolean; linkedPacketCount: number; worklistReason: string }>();
    return new Map(library.documents.map((document) => {
      const linkedPacketCount = library.packets.filter((packet) => packet.documents.includes(document.id)).length;
      const archiveEligible = !document.legalHold && linkedPacketCount === 0 && document.status !== "ARCHIVED";
      const worklistReason = document.legalHold
        ? "Legal hold active"
        : document.providerReferences.length > 0
          ? `${document.providerReferences.length} provider reference${document.providerReferences.length === 1 ? "" : "s"}`
          : archiveEligible
            ? "Archive candidate"
            : linkedPacketCount > 0
              ? `${linkedPacketCount} linked packet${linkedPacketCount === 1 ? "" : "s"}`
              : formatLabel(document.status);
      return [document.id, { archiveEligible, linkedPacketCount, worklistReason }];
    }));
  }, [library]);

  const filteredDocuments = useMemo(() => {
    if (!library) return [];
    const normalized = query.trim().toLowerCase();
    return library.documents.filter((document) => {
      const category = documentCategory(document);
      const insights = documentInsights.get(document.id);
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
      const matchesWorklist = worklistFilter === "ALL" ||
        (worklistFilter === "NEEDS_REVIEW" && document.status !== "ACCEPTED" && document.status !== "ARCHIVED") ||
        (worklistFilter === "LEGAL_HOLD" && document.legalHold) ||
        (worklistFilter === "PROVIDER_REFS" && document.providerReferences.length > 0) ||
        (worklistFilter === "ARCHIVE_CANDIDATES" && Boolean(insights?.archiveEligible));
      return (!normalized || searchable.includes(normalized)) &&
        (statusFilter === "ALL" || document.status === statusFilter) &&
        (categoryFilter === "ALL" || category.key === categoryFilter) &&
        matchesWorklist;
    });
  }, [categoryFilter, documentInsights, library, query, statusFilter, worklistFilter]);
  const assistantWorkQueue = useMemo(() => library?.intelligence?.recommendations.slice(0, 5) ?? [], [library]);

  function runAssistantTask(recommendation: NonNullable<DocumentLibraryModel["intelligence"]>["recommendations"][number]) {
    openIntelligenceRecommendation(recommendation);
    if (recommendation.kind === "MISSING_REQUIREMENT") {
      setWorklistFilter("NEEDS_REVIEW");
      setNotice(`${recommendation.title}: use intake to add or link the missing document.`);
      return;
    }
    if (recommendation.kind === "LEGAL_HOLD_BLOCKER") {
      setWorklistFilter("LEGAL_HOLD");
      setNotice(`${recommendation.title}: add a reason, then release or keep the hold.`);
      return;
    }
    if (recommendation.kind === "PACKET_HANDOFF_READY" && recommendation.targetPacketId) {
      void previewProviderAction("EXPORT_PACKET", recommendation.targetPacketId, "Packet export");
      return;
    }
    if (recommendation.kind === "PROVIDER_REFERENCE_STALE" && recommendation.targetDocumentId) {
      void previewProviderAction("RECONCILE_PROVIDER_STATUS", recommendation.targetDocumentId, "Provider status check");
      return;
    }
    if (recommendation.kind === "ARCHIVE_READY") {
      setWorklistFilter("ARCHIVE_CANDIDATES");
      setNotice(`${recommendation.title}: add a reason before archiving.`);
      return;
    }
    setNotice(`${recommendation.title}: ${recommendation.rationale}`);
  }

  function openIntelligenceRecommendation(recommendation: NonNullable<DocumentLibraryModel["intelligence"]>["recommendations"][number]) {
    if (recommendation.targetDocumentId) setSelectedDocumentId(recommendation.targetDocumentId);
    if (recommendation.targetPacketId) setSelectedPacketId(recommendation.targetPacketId);
    setNotice(`${recommendation.title}: ${recommendation.rationale}`);
  }

  function reconcileAction(result: DocumentLibraryActionResponse) {
    setLibraryState((current) => {
      if (!current) return current;
      const document = result.command?.document;
      const packet = result.command?.packet;
      return {
        ...current,
        documents: document
          ? current.documents.some((item) => item.id === document.id)
            ? current.documents.map((item) => item.id === document.id ? document : item)
            : [document, ...current.documents]
          : current.documents,
        packets: packet
          ? current.packets.some((item) => item.id === packet.id)
            ? current.packets.map((item) => item.id === packet.id ? packet : item)
            : [packet, ...current.packets]
          : current.packets
      };
    });
    if (result.command?.document) setSelectedDocumentId(result.command.document.id);
    if (result.command?.packet) setSelectedPacketId(result.command.packet.id);
  }

  async function runDocumentAction(payload: Record<string, unknown>, successMessage: string) {
    setActionBusy(true);
    try {
      const response = await fetch("/api/document-library/actions", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const result = await response.json().catch(() => null) as DocumentLibraryActionResponse | null;
      if (!response.ok) {
        setNotice(result?.error ?? "Document action could not be completed.");
        return false;
      }
      if (result) reconcileAction(result);
      setNotice(successMessage);
      return true;
    } catch {
      setNotice("Document action could not reach the console service.");
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  async function previewProviderAction(action: string, subjectId: string, label: string) {
    setActionBusy(true);
    try {
      const response = await fetch("/api/document-library/actions", {
        body: JSON.stringify({ action, subjectId }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const result = await response.json().catch(() => null) as DocumentLibraryActionResponse | null;
      if (!response.ok) {
        setNotice(result?.error ?? "Provider action preview could not be prepared.");
        return;
      }
      setProviderPreview(result?.providerAction ?? null);
      setNotice(`${label} is held for governed confirmation; no provider write was sent.`);
    } catch {
      setNotice("Provider action preview could not reach the console service.");
    } finally {
      setActionBusy(false);
    }
  }

  async function reviewSelectedDocument(decision: ReviewDecision) {
    if (!selectedDocument) return;
    const reason = actionReason.trim() || (decision === "ACCEPT" ? "Accepted from document console." : "");
    if (!reason) {
      setNotice("Add a reason before requesting correction or rejecting a document.");
      return;
    }
    const complete = await runDocumentAction({
      action: "REVIEW_DOCUMENT",
      decision,
      documentId: selectedDocument.id,
      reason
    }, `${selectedDocument.fileName} marked ${formatLabel(decision)}.`);
    if (complete) setActionReason("");
  }

  async function toggleLegalHold() {
    if (!selectedDocument) return;
    const reason = actionReason.trim();
    if (!reason) {
      setNotice("Add a reason before changing legal hold.");
      return;
    }
    const action = selectedDocument.legalHold ? "RELEASE_LEGAL_HOLD" : "SET_LEGAL_HOLD";
    const complete = await runDocumentAction({
      action,
      documentId: selectedDocument.id,
      reason
    }, selectedDocument.legalHold ? "Legal hold released." : "Legal hold applied.");
    if (complete) setActionReason("");
  }

  async function toggleArchive() {
    if (!selectedDocument) return;
    const reason = actionReason.trim();
    if (!reason) {
      setNotice("Add a reason before archiving or restoring.");
      return;
    }
    const action = selectedDocument.status === "ARCHIVED" ? "RESTORE_DOCUMENT" : "ARCHIVE_DOCUMENT";
    const complete = await runDocumentAction({
      action,
      documentId: selectedDocument.id,
      reason
    }, selectedDocument.status === "ARCHIVED" ? "Document restored to review." : "Document archived.");
    if (complete) setActionReason("");
  }

  async function linkSelectedDocumentToPacket() {
    if (!selectedDocument || !selectedPacket) return;
    const reason = actionReason.trim() || `Linked ${selectedDocument.fileName} to ${selectedPacket.title}.`;
    const complete = await runDocumentAction({
      action: "LINK_DOCUMENT_TO_PACKET",
      documentId: selectedDocument.id,
      packetId: selectedPacket.id,
      reason
    }, `${selectedDocument.fileName} linked to ${selectedPacket.title}.`);
    if (complete) setActionReason("");
  }

  async function waiveRequirement(requirementId: string, requirementLabel: string) {
    if (!selectedPacket) return;
    const reason = actionReason.trim();
    if (!reason) {
      setNotice(`Add a reason before waiving ${requirementLabel}.`);
      return;
    }
    const complete = await runDocumentAction({
      action: "WAIVE_REQUIREMENT",
      packetId: selectedPacket.id,
      reason,
      requirementId
    }, `${requirementLabel} waived for ${selectedPacket.title}.`);
    if (complete) setActionReason("");
  }

  async function submitIntake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!intake.fileName.trim() || !intake.documentType.trim() || !intake.ownerId.trim() || !intake.ownerLabel.trim() || !intake.reference.trim() || !intake.reason.trim()) {
      setNotice("Complete document type, file/reference, owner, storage reference, and reason before adding.");
      return;
    }

    const complete = await runDocumentAction({
      action: "CREATE_DOCUMENT",
      documentType: intake.documentType,
      fileName: intake.fileName,
      owner: { id: intake.ownerId, label: intake.ownerLabel, type: intake.ownerType },
      packetId: selectedPacket?.id,
      reason: intake.reason,
      sensitivity: intake.sensitivity,
      source: intake.source,
      storage: { provider: intake.source === "EXTERNAL_LINK" ? "EXTERNAL_LINK" : "INTERNAL", reference: intake.reference, version: 1 }
    }, `Document ${intake.fileName} accepted into governed intake.`);
    if (complete) {
      setIntake((current) => ({ ...current, fileName: "", reason: "", reference: "" }));
    }
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
        <article><strong>{summary.documents}</strong><span>Documents</span></article>
        <article><strong>{summary.packets}</strong><span>Packets</span></article>
        <article><strong>{summary.reviewItems}</strong><span>Review items</span></article>
        <article><strong>{summary.legalHold}</strong><span>Legal holds</span></article>
        <article><strong>{summary.providerReferences}</strong><span>Provider refs</span></article>
      </section>

      <section className={styles.docAssistantQueue} aria-label="Document assistant work queue">
        <header>
          <div>
            <span><Sparkles size={16} />Assistant work queue</span>
            <h2>Do this next</h2>
            <p>Plain-language document tasks ranked by urgency, packet impact, and release risk.</p>
          </div>
          <StatusBadge label={assistantWorkQueue.length > 0 ? `${assistantWorkQueue.length} TASKS` : "CLEAR"} tone={assistantWorkQueue.length > 0 ? "info" : "success"} />
        </header>
        <div className={styles.docAssistantCards}>
          {assistantWorkQueue.length > 0 ? assistantWorkQueue.map((recommendation, index) => (
            <article key={recommendation.id}>
              <div className={styles.docAssistantRank}>{index + 1}</div>
              <div>
                <span>{assistantPlainState(recommendation.kind)}</span>
                <h3>{recommendation.title}</h3>
                <p>{recommendation.rationale}</p>
                <small>{recommendation.evidence[0]}</small>
              </div>
              <footer>
                <StatusBadge label={recommendation.priority} tone={priorityTone(recommendation.priority)} />
                <button disabled={actionBusy} onClick={() => runAssistantTask(recommendation)} type="button">{assistantVerb(recommendation.kind)}</button>
              </footer>
            </article>
          )) : (
            <article className={styles.docAssistantEmpty}>
              <div className={styles.docAssistantRank}><CheckCircle2 size={18} /></div>
              <div>
                <span>Clear</span>
                <h3>No document tasks need attention</h3>
                <p>New uploads, packet gaps, holds, or provider checks will appear here automatically.</p>
                <small>Keep working from packet handoff or archive cleanup as needed.</small>
              </div>
            </article>
          )}
        </div>
      </section>

      {library.intelligence ? (
        <section className={styles.docIntelligenceCenter} aria-label="Document intelligence">
          <header>
            <div>
              <span><Brain size={16} />Intelligence</span>
              <h2>Document command intelligence</h2>
              <p>{library.intelligence.summary}</p>
            </div>
            <div className={styles.docIntelligenceScore}>
              <strong>{library.intelligence.score}</strong>
              <span>{library.intelligence.confidence}% confidence</span>
            </div>
          </header>
          <div className={styles.docRiskFlags}>
            {library.intelligence.riskFlags.map((flag) => (
              <article key={flag.label}>
                <AlertTriangle size={15} />
                <span><strong>{flag.count}</strong><small>{flag.label}</small></span>
                <StatusBadge label={flag.priority} tone={priorityTone(flag.priority)} />
              </article>
            ))}
          </div>
          <div className={styles.docRecommendationGrid}>
            {library.intelligence.recommendations.map((recommendation) => (
              <article key={recommendation.id}>
                <div>
                  <span><Sparkles size={15} />{formatLabel(recommendation.kind)}</span>
                  <h3>{recommendation.title}</h3>
                  <p>{recommendation.rationale}</p>
                  <ul>
                    {recommendation.evidence.slice(0, 2).map((evidence) => <li key={evidence}>{evidence}</li>)}
                  </ul>
                </div>
                <footer>
                  <StatusBadge label={recommendation.priority} tone={priorityTone(recommendation.priority)} />
                  <small>{recommendation.confidence}% confidence</small>
                  <button onClick={() => openIntelligenceRecommendation(recommendation)} type="button">{recommendation.actionLabel}</button>
                </footer>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {library.storageRollout ? (
        <section className={styles.docRolloutPanel} aria-label="Document release rollout readiness">
          <header>
            <div>
              <span><ShieldCheck size={16} />Release rollout</span>
              <h2>{library.storageRollout.gate.readyForRelease ? "Ready for rollout" : "Release gate in review"}</h2>
              <p>{library.storageRollout.gate.blockers.length > 0
                ? `${library.storageRollout.gate.blockers.length} blocker remains before adoption.`
                : "All release milestones have evidence."}</p>
            </div>
            <StatusBadge label={library.storageRollout.durableRepository?.mode ?? "IN_MEMORY_REVIEW"} tone={library.storageRollout.durableRepository?.enabled ? "success" : "warning"} />
          </header>
          <div className={styles.docRolloutGrid}>
            <div className={styles.docRolloutMilestones}>
              {library.storageRollout.gate.milestones.map((milestone) => (
                <article key={milestone.key}>
                  <span><strong>{milestone.label}</strong><small>{milestone.reason}</small></span>
                  <StatusBadge label={milestone.status} tone={milestone.status === "COMPLETE" ? "success" : "warning"} />
                </article>
              ))}
            </div>
            <aside className={styles.docRolloutEvidence}>
              <h3>Persistence evidence</h3>
              <dl>
                <div><dt>Documents</dt><dd>{library.storageRollout.persistencePlan.documents}</dd></div>
                <div><dt>Packets</dt><dd>{library.storageRollout.persistencePlan.packets}</dd></div>
                <div><dt>Requirements</dt><dd>{library.storageRollout.persistencePlan.packetRequirements}</dd></div>
                <div><dt>Packet links</dt><dd>{library.storageRollout.persistencePlan.packetDocuments}</dd></div>
                <div><dt>Provider refs</dt><dd>{library.storageRollout.persistencePlan.providerReferences}</dd></div>
                <div><dt>Audit events</dt><dd>{library.storageRollout.persistencePlan.auditEvents}</dd></div>
              </dl>
              <h3>Packet templates</h3>
              <ul>
                {library.storageRollout.packetTemplates.map((template) => <li key={template.templateKey}>{template.title} · {template.workflow}</li>)}
              </ul>
            </aside>
          </div>
        </section>
      ) : null}

      <section className={styles.docReviewCommandCenter} aria-label="Review queue command center">
        <header>
          <div>
            <h2>Review queue</h2>
            <p>Prioritize missing, blocked, legal-hold, and correction items across every governed packet.</p>
          </div>
          <label>Queue filter<select onChange={(event) => setQueueFilter(event.target.value)} value={queueFilter}><option value="ALL">All blockers</option>{queueStates.map((state) => <option key={state} value={state}>{formatLabel(state)}</option>)}</select></label>
        </header>
        <div className={styles.docReviewQueueGrid}>
          {filteredReviewQueue.length > 0 ? filteredReviewQueue.map((item) => (
            <article key={`${item.packetId}-${item.requirementId}`}>
              <div>
                <strong>{item.requirementLabel}</strong>
                <span>{item.packetTitle}</span>
                <small>{item.blocker ?? "Needs staff review before completion."}</small>
              </div>
              <StatusBadge label={item.state} />
              <button onClick={() => {
                setSelectedPacketId(item.packetId);
                if (item.documentId) setSelectedDocumentId(item.documentId);
              }} type="button">Open</button>
            </article>
          )) : (
            <article className={styles.docReviewQueueEmpty}>
              <div>
                <strong>No active blockers</strong>
                <span>Every required packet item is accepted or waived.</span>
                <small>New intake or corrections will appear here automatically.</small>
              </div>
              <StatusBadge label="COMPLETE" />
            </article>
          )}
        </div>
      </section>

      <div className={styles.docConsoleLayout}>
        <aside className={styles.docFilterRail} aria-label="Document filters">
          <header><strong>Filters</strong><button onClick={() => { setQuery(""); setStatusFilter("ALL"); setCategoryFilter("ALL"); setWorklistFilter("ALL"); }} type="button">Reset</button></header>
          <div className={styles.docWorklistFilters}>
            <strong>Worklists</strong>
            {worklists.map((worklist) => (
              <button className={worklistFilter === worklist.key ? styles.activeWorklist : ""} key={worklist.key} onClick={() => setWorklistFilter(worklist.key)} type="button">
                <span>{worklist.label}</span>
                <small>{worklist.description}</small>
              </button>
            ))}
          </div>
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
                  const insight = documentInsights.get(document.id);
                  return (
                    <button className={selectedDocument?.id === document.id ? styles.selectedDocumentRow : ""} key={document.id} onClick={() => setSelectedDocumentId(document.id)} type="button">
                      <Icon size={19} />
                      <span><strong>{document.fileName}</strong><small>{formatLabel(document.documentType)} · {document.owner.label}</small><em>{insight?.worklistReason ?? formatLabel(document.status)}</em></span>
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
                  <div className={styles.docGuidedActions}>
                    <header><strong>Recommended next actions</strong><small>Based on the selected document and packet.</small></header>
                    {selectedDocument.status !== "ACCEPTED" && selectedDocument.status !== "ARCHIVED" ? (
                      <article>
                        <span><strong>Review selected document</strong><small>Accept it if complete, or request correction before it can satisfy packet requirements.</small></span>
                        <button disabled={actionBusy} onClick={() => void reviewSelectedDocument("ACCEPT")} type="button">Accept</button>
                      </article>
                    ) : null}
                    {selectedDocument.legalHold ? (
                      <article>
                        <span><strong>Resolve legal hold</strong><small>This document cannot satisfy a packet while the hold is active.</small></span>
                        <button disabled={actionBusy} onClick={() => void toggleLegalHold()} type="button">Release hold</button>
                      </article>
                    ) : null}
                    {selectedPacket && !selectedPacket.documents.includes(selectedDocument.id) ? (
                      <article>
                        <span><strong>Link to selected packet</strong><small>Add this document to {selectedPacket.title} for requirement matching.</small></span>
                        <button disabled={actionBusy} onClick={() => void linkSelectedDocumentToPacket()} type="button">Link</button>
                      </article>
                    ) : null}
                    {selectedPacketBlocker ? (
                      <article>
                        <span><strong>Clear next packet blocker</strong><small>{selectedPacketBlocker.blocker ?? `${selectedPacketBlocker.label} needs review.`}</small></span>
                        <button disabled={actionBusy} onClick={() => void waiveRequirement(selectedPacketBlocker.id, selectedPacketBlocker.label)} type="button">Waive</button>
                      </article>
                    ) : (
                      <article>
                        <span><strong>Packet ready for handoff</strong><small>Preview export or e-signature when the packet has no open blockers.</small></span>
                        <button disabled={actionBusy || !selectedPacket} onClick={() => selectedPacket ? void previewProviderAction("EXPORT_PACKET", selectedPacket.id, "Packet export") : undefined} type="button">Preview export</button>
                      </article>
                    )}
                  </div>
                  <label className={styles.docReasonBox}>Action reason<textarea onChange={(event) => setActionReason(event.target.value)} placeholder="Reason for review, hold, archive, link, or waiver" value={actionReason} /></label>
                  <div className={styles.docActionPanel}>
                    <strong>Review decision</strong>
                    <div className={styles.docActionGrid}>
                      <button disabled={actionBusy} onClick={() => void reviewSelectedDocument("ACCEPT")} type="button">Accept</button>
                      <button disabled={actionBusy} onClick={() => void reviewSelectedDocument("NEEDS_CORRECTION")} type="button">Needs correction</button>
                      <button disabled={actionBusy} onClick={() => void reviewSelectedDocument("REJECT")} type="button">Reject</button>
                    </div>
                  </div>
                  <div className={styles.docActionPanel}>
                    <strong>Governance</strong>
                    <div className={styles.docActionGrid}>
                      <button disabled={actionBusy} onClick={() => void toggleLegalHold()} type="button">{selectedDocument.legalHold ? "Release hold" : "Set hold"}</button>
                      <button disabled={actionBusy || (!selectedArchivePreview?.eligible && selectedDocument.status !== "ARCHIVED")} onClick={() => void toggleArchive()} type="button">{selectedDocument.status === "ARCHIVED" ? "Restore" : "Archive"}</button>
                    </div>
                    <small>{selectedArchivePreview?.eligible ? "Archive eligible." : selectedArchivePreview?.reasons.join(" ") || "Archive requires review."}</small>
                  </div>
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
                    {selectedPacketReadiness ? (
                      <div className={styles.docPacketReadiness}>
                        <div>
                          <strong>{selectedPacketReadiness.percent}% packet ready</strong>
                          <span>{selectedPacketReadiness.blockers.length} open blocker{selectedPacketReadiness.blockers.length === 1 ? "" : "s"}</span>
                        </div>
                        <div className={styles.docPacketProgress} aria-label={`${selectedPacketReadiness.percent}% packet ready`}>
                          <span style={{ width: `${selectedPacketReadiness.percent}%` }} />
                        </div>
                        {selectedPacketReadiness.nextRequirement ? (
                          <article>
                            <span><strong>Next requirement</strong><small>{selectedPacketReadiness.nextRequirement.blocker ?? `${selectedPacketReadiness.nextRequirement.label} needs review.`}</small></span>
                            <button disabled={actionBusy} onClick={() => void waiveRequirement(selectedPacketReadiness.nextRequirement!.id, selectedPacketReadiness.nextRequirement!.label)} type="button">Waive</button>
                          </article>
                        ) : (
                          <article>
                            <span><strong>Ready for handoff</strong><small>All required packet documents are accepted or waived.</small></span>
                            <button disabled={actionBusy} onClick={() => void previewProviderAction("EXPORT_PACKET", selectedPacket.id, "Packet export")} type="button">Preview export</button>
                          </article>
                        )}
                      </div>
                    ) : null}
                    {selectedDocument ? (
                      <div className={styles.docPacketActionBar}>
                        <span>{selectedPacket.documents.includes(selectedDocument.id) ? "Selected document is already linked." : `Link ${selectedDocument.fileName} to this packet.`}</span>
                        <button disabled={actionBusy || selectedPacket.documents.includes(selectedDocument.id)} onClick={() => void linkSelectedDocumentToPacket()} type="button">Link selected</button>
                      </div>
                    ) : null}
                    <div className={styles.docRequirementList}>
                      {selectedPacket.requirements.map((requirement) => (
                        <article key={requirement.id}>
                          <FileCheck2 size={17} />
                          <span><strong>{requirement.label}</strong><small>{requirement.blocker ?? "Requirement satisfied or waived."}</small></span>
                          <StatusBadge label={requirement.state} />
                          {requirement.state !== "ACCEPTED" && requirement.state !== "WAIVED" ? (
                            <button disabled={actionBusy} onClick={() => void waiveRequirement(requirement.id, requirement.label)} type="button">Waive</button>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </section>

          <section className={styles.docProviderExchange} aria-label="Provider exchange">
            <header>
              <div><h2>Provider exchange</h2><p>Preview external handoffs with audit, permission, and rollback posture before any live provider write.</p></div>
              <StatusBadge label={providerPreview?.state ?? "HELD_FOR_CONFIRMATION"} tone="info" />
            </header>
            <div className={styles.docProviderGrid}>
              <div className={styles.docProviderReferences}>
                <h3>Selected source references</h3>
                {selectedProviderReferences.length > 0 ? selectedProviderReferences.map((reference) => (
                  <article key={`${reference.provider}-${reference.documentId}-${reference.externalId ?? reference.family}`}>
                    <span><strong>{reference.provider}</strong><small>{formatLabel(reference.family)} · {reference.externalId ?? "internal reference"}</small></span>
                    <StatusBadge label={reference.health} tone={reference.health === "HELD" ? "warning" : "success"} />
                    <small>{reference.readOnly ? "Read-only pointer" : "Write capable"} · {reference.lastVerifiedAt ? `Verified ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(reference.lastVerifiedAt))}` : "Not verified"}</small>
                  </article>
                )) : (
                  <article>
                    <span><strong>No external references yet</strong><small>Internal documents can still be exported, uploaded, or sent for signature after review.</small></span>
                    <StatusBadge label="INTERNAL" />
                  </article>
                )}
              </div>
              <div className={styles.docProviderActions}>
                <h3>Governed handoffs</h3>
                <div>
                  <button disabled={actionBusy || !selectedPacket} onClick={() => selectedPacket ? void previewProviderAction("EXPORT_PACKET", selectedPacket.id, "Packet export") : undefined} type="button"><ExternalLink size={15} />Export packet</button>
                  <button disabled={actionBusy || !selectedDocument} onClick={() => selectedDocument ? void previewProviderAction("REQUEST_ESIGNATURE", selectedDocument.id, "E-signature request") : undefined} type="button"><FileSignature size={15} />Request e-sign</button>
                  <button disabled={actionBusy || !selectedDocument} onClick={() => selectedDocument ? void previewProviderAction("UPLOAD_TO_PROVIDER", selectedDocument.id, "Provider upload") : undefined} type="button"><FilePlus2 size={15} />Upload copy</button>
                  <button disabled={actionBusy || !selectedDocument} onClick={() => selectedDocument ? void previewProviderAction("RECONCILE_PROVIDER_STATUS", selectedDocument.id, "Provider status check") : undefined} type="button"><FileSearch size={15} />Reconcile status</button>
                </div>
                <aside>
                  <strong>{providerPreview ? formatLabel(providerPreview.action) : "No provider preview selected"}</strong>
                  <span>{providerPreview ? `${formatLabel(providerPreview.permission)} · ${formatLabel(providerPreview.state)}` : "Choose a handoff to preview the controlled action."}</span>
                  <small>{providerPreview?.rollbackPosture ?? "Live provider writes remain disabled in this review workspace."}</small>
                </aside>
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
