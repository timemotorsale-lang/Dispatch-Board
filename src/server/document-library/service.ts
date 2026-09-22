import type { AuthenticatedUser } from "@/server/auth/store";
import { isManager } from "@/server/policies/access";
import { canOpenDocumentLibrary } from "@/server/document-library/permission-policy";
import { buildDocumentLibraryIntelligence } from "@/server/document-library/intelligence";

import {
  DOCUMENT_LIBRARY_CONTRACT_VERSION,
  DocumentLibraryError,
  type DocumentRecord,
  type DocumentLibraryActionKind,
  type DocumentLibraryCommand,
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
import { executeDocumentLibraryCommand, type DocumentLibraryState } from "./repository";
import {
  buildDocumentStorageRolloutEvidence,
  buildDocumentLibraryPersistencePlan,
  defaultDocumentPacketTemplates,
  DOCUMENT_LIBRARY_STORAGE_PLATFORM_VERSION
} from "./storage-platform";
import { evaluateDocumentStorageReleaseGate } from "./storage-rollout";

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

function demoState(): DocumentLibraryState {
  return {
    auditEvents: documents.flatMap((document) => document.auditTrail.map((event) => ({
      action: event.action,
      actorId: event.actor,
      at: event.at,
      idempotencyKey: `seed-${document.id}-${event.at}`,
      note: event.note,
      subjectId: document.id
    }))),
    documents,
    idempotencyKeys: [],
    packets
  };
}

let currentLibraryState: DocumentLibraryState | null = null;

function getCurrentLibraryState() {
  currentLibraryState ??= demoState();
  return currentLibraryState;
}

export function resetDocumentLibraryDemoState() {
  currentLibraryState = null;
}

function stringField(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

function commandIdempotencyKey(input: Record<string, unknown>) {
  return stringField(input, "idempotencyKey") || `document-library-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseOwner(input: unknown): DocumentRecord["owner"] {
  if (!input || typeof input !== "object") throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Document owner is required.");
  const owner = input as Record<string, unknown>;
  const type = stringField(owner, "type");
  const allowedTypes = new Set<DocumentRecord["owner"]["type"]>(["CUSTOMER", "VEHICLE", "REPAIR_ORDER", "CLAIM", "TASK", "VENDOR", "SALE"]);
  if (!stringField(owner, "id") || !stringField(owner, "label") || !allowedTypes.has(type as DocumentRecord["owner"]["type"])) {
    throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Document owner must include id, label, and a supported type.");
  }
  return { id: stringField(owner, "id"), label: stringField(owner, "label"), type: type as DocumentRecord["owner"]["type"] };
}

function parseStorage(input: unknown): DocumentRecord["storage"] {
  if (!input || typeof input !== "object") throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Document storage reference is required.");
  const storage = input as Record<string, unknown>;
  const provider = stringField(storage, "provider");
  const allowedProviders = new Set<DocumentRecord["storage"]["provider"]>(["INTERNAL", "EXTERNAL_LINK", "PROVIDER"]);
  const version = typeof storage.version === "number" && Number.isInteger(storage.version) && storage.version > 0 ? storage.version : 1;
  if (!allowedProviders.has(provider as DocumentRecord["storage"]["provider"]) || !stringField(storage, "reference")) {
    throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Document storage must include a supported provider and reference.");
  }
  return { provider: provider as DocumentRecord["storage"]["provider"], reference: stringField(storage, "reference"), version };
}

function parseDocumentLibraryCommand(input: Record<string, unknown>): DocumentLibraryCommand | null {
  const action = input.action;
  if (action === "CREATE_DOCUMENT") {
    const sensitivity = stringField(input, "sensitivity") || "INTERNAL";
    const source = stringField(input, "source") || "MANUAL_UPLOAD";
    const allowedSensitivity = new Set<DocumentRecord["sensitivity"]>(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", "SECURITY_AUDIT"]);
    const allowedSource = new Set<DocumentRecord["source"]>(["MANUAL_UPLOAD", "CUSTOMER_PORTAL", "GENERATED", "EXTERNAL_LINK", "PROVIDER_REFERENCE"]);
    if (!allowedSensitivity.has(sensitivity as DocumentRecord["sensitivity"]) || !allowedSource.has(source as DocumentRecord["source"])) {
      throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Document sensitivity and source must be supported values.");
    }
    return {
      action,
      documentType: stringField(input, "documentType"),
      fileName: stringField(input, "fileName"),
      idempotencyKey: commandIdempotencyKey(input),
      owner: parseOwner(input.owner),
      packetId: stringField(input, "packetId") || undefined,
      reason: stringField(input, "reason"),
      sensitivity: sensitivity as DocumentRecord["sensitivity"],
      source: source as DocumentRecord["source"],
      storage: parseStorage(input.storage)
    };
  }
  if (action === "LINK_DOCUMENT_TO_PACKET") {
    return {
      action,
      documentId: stringField(input, "documentId"),
      idempotencyKey: commandIdempotencyKey(input),
      packetId: stringField(input, "packetId"),
      reason: stringField(input, "reason")
    };
  }
  if (action === "REVIEW_DOCUMENT") {
    return {
      action,
      decision: stringField(input, "decision") as ReviewDecision,
      documentId: stringField(input, "documentId") || stringField(input, "subjectId"),
      idempotencyKey: commandIdempotencyKey(input),
      reason: stringField(input, "reason") || undefined
    };
  }
  if (action === "WAIVE_REQUIREMENT") {
    return {
      action,
      idempotencyKey: commandIdempotencyKey(input),
      packetId: stringField(input, "packetId"),
      reason: stringField(input, "reason"),
      requirementId: stringField(input, "requirementId")
    };
  }
  if (action === "ARCHIVE_DOCUMENT" || action === "RESTORE_DOCUMENT" || action === "SET_LEGAL_HOLD" || action === "RELEASE_LEGAL_HOLD") {
    return {
      action,
      documentId: stringField(input, "documentId") || stringField(input, "subjectId"),
      idempotencyKey: commandIdempotencyKey(input),
      reason: stringField(input, "reason")
    };
  }
  return null;
}

export async function getDocumentLibrary(actor: AuthenticatedUser | null, dependencies: Dependencies = {}) {
  const user = requireDocumentLibraryAccess(actor);
  const state = getCurrentLibraryState();
  const generatedAt = (dependencies.now?.() ?? new Date(GENERATED_AT)).toISOString();
  const resolvedPackets = state.packets.map((packet) => resolvePacket(packet, state.documents));
  const archivePreviews = state.documents.map((document) => previewArchiveEligibility(document, state.packets));
  const providerReferences = state.documents.flatMap((document) => document.providerReferences.map((reference) => ({
    ...reference,
    documentId: document.id,
    documentType: document.documentType
  })));
  const persistencePlan = buildDocumentLibraryPersistencePlan(state);

  return {
    archivePreviews,
    contractVersion: DOCUMENT_LIBRARY_CONTRACT_VERSION,
    documents: state.documents,
    generatedAt,
    intelligence: buildDocumentLibraryIntelligence(state),
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
    storageRollout: {
      gate: evaluateDocumentStorageReleaseGate(buildDocumentStorageRolloutEvidence({
        actor: user,
        durableRepositoryEnabled: false,
        state
      })),
      packetTemplates: defaultDocumentPacketTemplates,
      persistencePlan: {
        auditEvents: persistencePlan.auditEvents.length,
        documents: persistencePlan.documents.length,
        packetDocuments: persistencePlan.packetDocuments.length,
        packetRequirements: persistencePlan.packetRequirements.length,
        packets: persistencePlan.packets.length,
        providerReferences: persistencePlan.providerReferences.length
      },
      platformVersion: DOCUMENT_LIBRARY_STORAGE_PLATFORM_VERSION
    },
    summary: {
      documents: state.documents.length,
      legalHold: state.documents.filter((document) => document.legalHold).length,
      packets: state.packets.length,
      providerReferences: providerReferences.length,
      readyPackets: resolvedPackets.filter((packet) => packet.status === "COMPLETE").length,
      reviewItems: resolvedPackets.flatMap((packet) => packet.requirements).filter((requirement) => requirement.state !== "ACCEPTED" && requirement.state !== "WAIVED").length
    }
  };
}

export async function executeDocumentLibraryAction(actor: AuthenticatedUser | null, value: unknown, dependencies: Dependencies = {}) {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const action = input.action;
  const subjectId = typeof input.subjectId === "string" ? input.subjectId.trim() : "";
  const idempotencyKey = commandIdempotencyKey(input);
  const providerActions = new Set<ProviderActionKind>(["EXPORT_PACKET", "UPLOAD_TO_PROVIDER", "REQUEST_ESIGNATURE", "IMPORT_SIGNED_DOCUMENT", "RECONCILE_PROVIDER_STATUS"]);
  const reviewDecisions = new Set<ReviewDecision>(["ACCEPT", "REJECT", "NEEDS_CORRECTION", "WAIVE_REQUIREMENT"]);
  const documentActionKinds = new Set<DocumentLibraryActionKind>(["REVIEW_DOCUMENT", "PREVIEW_ARCHIVE", "SET_LEGAL_HOLD", "RELEASE_LEGAL_HOLD", "ARCHIVE_DOCUMENT", "RESTORE_DOCUMENT", "CREATE_DOCUMENT", "LINK_DOCUMENT_TO_PACKET", "WAIVE_REQUIREMENT"]);
  const knownActions = new Set<DocumentLibraryActionKind>([...providerActions, ...documentActionKinds]);

  if (!knownActions.has(action as DocumentLibraryActionKind)) {
    throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Choose a supported provider action and subject.");
  }

  const command = parseDocumentLibraryCommand(input);
  if (command) {
    const elevatedActions = new Set<DocumentLibraryCommand["action"]>(["ARCHIVE_DOCUMENT", "RESTORE_DOCUMENT", "SET_LEGAL_HOLD", "RELEASE_LEGAL_HOLD", "WAIVE_REQUIREMENT"]);
    const user = elevatedActions.has(command.action) ? requireManager(actor) : requireDocumentLibraryAccess(actor);
    const result = executeDocumentLibraryCommand({
      actorId: user.id,
      command,
      now: dependencies.now?.(),
      state: getCurrentLibraryState()
    });
    currentLibraryState = result.state;
    return {
      auditEvent: result.auditEvent,
      command: result.document || result.packet ? {
        action: command.action,
        document: result.document,
        packet: result.packet
      } : { action: command.action },
      contractVersion: DOCUMENT_LIBRARY_CONTRACT_VERSION,
      executedBy: user.id,
      liveProviderWriteEnabled: false
    };
  }

  const user = requireManager(actor);
  if (!subjectId) {
    throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Choose a supported provider action and subject.");
  }
  const state = getCurrentLibraryState();
  const document = state.documents.find((item) => item.id === subjectId) ?? null;
  const packet = state.packets.find((item) => item.id === subjectId) ?? null;
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
      archiveAction: previewArchiveAction(document, state.packets),
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

export const previewDocumentLibraryProviderAction = executeDocumentLibraryAction;
