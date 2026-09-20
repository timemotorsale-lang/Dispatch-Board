import type { AuthenticatedUser } from "@/server/auth/store";
import { isManager } from "@/server/policies/access";
import { canOpenDocumentLibrary } from "@/server/document-library/permission-policy";

import {
  DOCUMENT_LIBRARY_CONTRACT_VERSION,
  DocumentLibraryError,
  type DocumentRecord,
  type DocumentLibraryActionKind,
  type ProviderActionKind,
  type ReviewDecision,
  type PacketRecord,
  previewArchiveAction,
  previewArchiveEligibility,
  previewLegalHoldAction,
  previewProviderAction,
  previewReviewDecision,
  resolvePacket
} from "./domain";

type Dependencies = {
  now?: () => Date;
};

const GENERATED_AT = "2026-09-20T00:00:00.000Z";

const documents: DocumentRecord[] = [
  {
    auditTrail: [{ action: "DOCUMENT_CREATED", actor: "Maria Lopez", at: "2024-10-14T14:32:00.000Z", note: "Customer portal upload." }],
    createdAt: "2024-10-14T14:32:00.000Z",
    documentType: "INSURANCE_CLAIM_INTAKE",
    fileName: "claim-intake-gada-ahmed-jamal.pdf",
    id: "doc-claim-intake-1",
    legalHold: false,
    owner: { id: "claim-10421", label: "Claim #CLM-10421", type: "CLAIM" },
    providerReferences: [{
      externalId: "box:file:claim-intake-1",
      family: "STORAGE",
      health: "HELD",
      lastVerifiedAt: null,
      provider: "External storage placeholder",
      readOnly: true,
      url: null
    }],
    retentionCategory: "CLAIM_FILE",
    sensitivity: "CONFIDENTIAL",
    source: "CUSTOMER_PORTAL",
    status: "ACCEPTED",
    storage: { provider: "PROVIDER", reference: "box:file:claim-intake-1", version: 1 }
  },
  {
    auditTrail: [{ action: "DOCUMENT_CREATED", actor: "Maria Lopez", at: "2024-10-14T14:35:00.000Z", note: "Signed authorization received." }],
    createdAt: "2024-10-14T14:35:00.000Z",
    documentType: "CUSTOMER_AUTHORIZATION",
    fileName: "customer-authorization-gada-ahmed-jamal.pdf",
    id: "doc-customer-authorization-1",
    legalHold: false,
    owner: { id: "claim-10421", label: "Claim #CLM-10421", type: "CLAIM" },
    providerReferences: [],
    retentionCategory: "CUSTOMER_AUTHORIZATION",
    sensitivity: "RESTRICTED",
    source: "MANUAL_UPLOAD",
    status: "ACCEPTED",
    storage: { provider: "INTERNAL", reference: "internal://documents/doc-customer-authorization-1", version: 1 }
  },
  {
    auditTrail: [{ action: "DOCUMENT_CREATED", actor: "Title Desk", at: "2024-10-12T17:05:00.000Z", note: "Title scan is held pending legal review." }],
    createdAt: "2024-10-12T17:05:00.000Z",
    documentType: "TITLE_DOCUMENT",
    fileName: "title-sarah-kim.pdf",
    id: "doc-title-hold-1",
    legalHold: true,
    owner: { id: "ttl-55091", label: "Title packet #TTL-55091", type: "VEHICLE" },
    providerReferences: [{
      externalId: "dms:title:55091",
      family: "DMS",
      health: "HELD",
      lastVerifiedAt: null,
      provider: "DMS title reference",
      readOnly: true,
      url: null
    }],
    retentionCategory: "TITLE_AND_LEGAL",
    sensitivity: "RESTRICTED",
    source: "PROVIDER_REFERENCE",
    status: "PENDING_REVIEW",
    storage: { provider: "PROVIDER", reference: "dms:title:55091", version: 1 }
  }
];

const packets: PacketRecord[] = [
  {
    documents: ["doc-claim-intake-1", "doc-customer-authorization-1"],
    id: "packet-claim-10421",
    owner: { id: "claim-10421", label: "Claim #CLM-10421", type: "CLAIM" },
    packetType: "CLAIM_PACKET",
    requirements: [
      { documentType: "INSURANCE_CLAIM_INTAKE", id: "req-claim-intake", label: "Insurance claim intake form", required: true },
      { documentType: "CUSTOMER_AUTHORIZATION", id: "req-customer-authorization", label: "Customer authorization", required: true },
      { documentType: "DAMAGE_PHOTOS", id: "req-damage-photos", label: "Damage photos", required: true },
      { documentType: "TOW_STORAGE_FORM", id: "req-tow-storage", label: "Tow / storage form", required: true }
    ],
    title: "Claim Packet: Gada Ahmed Jamal",
    workflow: "CLAIMS"
  },
  {
    documents: ["doc-title-hold-1"],
    id: "packet-title-55091",
    owner: { id: "ttl-55091", label: "Title packet #TTL-55091", type: "VEHICLE" },
    packetType: "TITLE_PACKET",
    requirements: [
      { documentType: "TITLE_DOCUMENT", id: "req-title", label: "Title document", required: true },
      { documentType: "ODOMETER_DISCLOSURE", id: "req-odometer", label: "Odometer disclosure", required: true }
    ],
    title: "Vehicle Title Packet: Sarah Kim",
    workflow: "TITLE"
  }
];

function requireUser(actor: AuthenticatedUser | null) {
  if (!actor) throw new DocumentLibraryError("AUTHENTICATION_REQUIRED", "Sign in before opening the document library.");
  return actor;
}

function requireDocumentLibraryAccess(actor: AuthenticatedUser | null) {
  const user = requireUser(actor);
  if (!canOpenDocumentLibrary(user)) {
    throw new DocumentLibraryError("DOCUMENT_LIBRARY_NOT_AUTHORIZED", "Document Library access requires an approved document workflow role or duty.");
  }
  return user;
}

function requireManager(actor: AuthenticatedUser | null) {
  const user = requireDocumentLibraryAccess(actor);
  if (!isManager(user)) {
    throw new DocumentLibraryError("DOCUMENT_LIBRARY_NOT_AUTHORIZED", "Document Library provider and archive actions require manager authority.");
  }
  return user;
}

export async function getDocumentLibrary(actor: AuthenticatedUser | null, dependencies: Dependencies = {}) {
  requireDocumentLibraryAccess(actor);
  const generatedAt = (dependencies.now?.() ?? new Date(GENERATED_AT)).toISOString();
  const resolvedPackets = packets.map((packet) => resolvePacket(packet, documents));
  const archivePreviews = documents.map((document) => previewArchiveEligibility(document, packets));
  const providerReferences = documents.flatMap((document) => document.providerReferences.map((reference) => ({
    ...reference,
    documentId: document.id,
    documentType: document.documentType
  })));

  return {
    archivePreviews,
    contractVersion: DOCUMENT_LIBRARY_CONTRACT_VERSION,
    documents,
    generatedAt,
    packets: resolvedPackets,
    providerActions: [
      previewProviderAction({ action: "EXPORT_PACKET", idempotencyKey: "read-model-preview", subjectId: "packet-claim-10421" }),
      previewProviderAction({ action: "REQUEST_ESIGNATURE", idempotencyKey: "read-model-preview", subjectId: "doc-customer-authorization-1" })
    ],
    providerReferences,
    reviewQueue: resolvedPackets.flatMap((packet) => packet.requirements
      .filter((requirement) => requirement.state !== "ACCEPTED" && requirement.state !== "WAIVED")
      .map((requirement) => ({
        blocker: requirement.blocker,
        documentId: requirement.documentId,
        packetId: packet.id,
        packetTitle: packet.title,
        requirementId: requirement.id,
        state: requirement.state
      }))),
    summary: {
      documents: documents.length,
      legalHold: documents.filter((document) => document.legalHold).length,
      packets: packets.length,
      providerReferences: providerReferences.length,
      readyPackets: resolvedPackets.filter((packet) => packet.status === "COMPLETE").length,
      reviewItems: resolvedPackets.flatMap((packet) => packet.requirements).filter((requirement) => requirement.state !== "ACCEPTED" && requirement.state !== "WAIVED").length
    }
  };
}

export async function previewDocumentLibraryProviderAction(actor: AuthenticatedUser | null, value: unknown) {
  const user = requireManager(actor);
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const action = input.action;
  const subjectId = typeof input.subjectId === "string" ? input.subjectId.trim() : "";
  const idempotencyKey = typeof input.idempotencyKey === "string" ? input.idempotencyKey.trim() : "";
  const providerActions = new Set<ProviderActionKind>(["EXPORT_PACKET", "UPLOAD_TO_PROVIDER", "REQUEST_ESIGNATURE", "IMPORT_SIGNED_DOCUMENT", "RECONCILE_PROVIDER_STATUS"]);
  const reviewDecisions = new Set<ReviewDecision>(["ACCEPT", "REJECT", "NEEDS_CORRECTION", "WAIVE_REQUIREMENT"]);
  const documentActionKinds = new Set<DocumentLibraryActionKind>(["REVIEW_DOCUMENT", "PREVIEW_ARCHIVE", "SET_LEGAL_HOLD", "RELEASE_LEGAL_HOLD"]);
  const knownActions = new Set<DocumentLibraryActionKind>([...providerActions, ...documentActionKinds]);

  if (!knownActions.has(action as DocumentLibraryActionKind) || !subjectId) {
    throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Choose a supported provider action and subject.");
  }
  const document = documents.find((item) => item.id === subjectId) ?? null;
  const packet = packets.find((item) => item.id === subjectId) ?? null;
  if (!document && !packet) {
    throw new DocumentLibraryError("DOCUMENT_LIBRARY_NOT_FOUND", "Document Library subject was not found.");
  }
  if (providerActions.has(action as ProviderActionKind)) {
    return {
      contractVersion: DOCUMENT_LIBRARY_CONTRACT_VERSION,
      previewedBy: user.id,
      providerAction: previewProviderAction({ action: action as ProviderActionKind, idempotencyKey, subjectId })
    };
  }
  if (action === "REVIEW_DOCUMENT") {
    const decision = input.decision;
    if (!document || !reviewDecisions.has(decision as ReviewDecision)) {
      throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Review actions require a supported decision and document subject.");
    }
    return {
      contractVersion: DOCUMENT_LIBRARY_CONTRACT_VERSION,
      previewedBy: user.id,
      reviewAction: previewReviewDecision({ decision: decision as ReviewDecision, documentId: document.id })
    };
  }
  if (action === "PREVIEW_ARCHIVE") {
    if (!document) throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Archive preview requires a document subject.");
    return {
      archiveAction: previewArchiveAction(document, packets),
      contractVersion: DOCUMENT_LIBRARY_CONTRACT_VERSION,
      previewedBy: user.id
    };
  }

  if (!document) throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Legal hold actions require a document subject.");
  return {
    contractVersion: DOCUMENT_LIBRARY_CONTRACT_VERSION,
    previewedBy: user.id,
    legalHoldAction: previewLegalHoldAction({ documentId: document.id, legalHold: action === "SET_LEGAL_HOLD" })
  };
}
