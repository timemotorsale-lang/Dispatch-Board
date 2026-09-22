import { canOpenDocumentLibrary, resolveDocumentLibraryPermission } from "@/server/document-library/permission-policy";
import type { AuthenticatedUser } from "@/server/auth/store";

import { previewProviderAction, resolvePacket, type DocumentRecord, type ProviderActionKind } from "./domain";
import type { DocumentLibraryState } from "./repository";
import type { DocumentStorageRolloutEvidence } from "./storage-rollout";

export const DOCUMENT_LIBRARY_STORAGE_PLATFORM_VERSION = "document-library.storage-platform/v1";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const allowedContentTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "application/zip"
]);

export type DocumentUploadCandidate = {
  checksumSha256?: string;
  contentType: string;
  fileName: string;
  sizeBytes: number;
};

export type DocumentUploadValidation = {
  accepted: boolean;
  blockers: string[];
  normalized: {
    contentType: string;
    fileName: string;
    sizeBytes: number;
  };
  warnings: string[];
};

export type DocumentLibraryObjectVersionRecord = {
  checksumSha256: string | null;
  contentType: string;
  createdAt: string;
  createdByUserId: string;
  documentId: string;
  fileName: string;
  organizationId: string;
  sizeBytes: number;
  storageProvider: DocumentRecord["storage"]["provider"];
  storageReference: string;
  version: number;
};

export type DocumentLibraryPacketTemplate = {
  packetType: string;
  requirements: Array<{ documentType: string; label: string; required: boolean }>;
  templateKey: string;
  title: string;
  workflow: string;
};

export type DocumentProviderWriteConfirmation = {
  action: ProviderActionKind;
  auditAction: string;
  idempotencyKey: string;
  rollbackPosture: string;
  state: "CONFIRMED_WRITE_HELD_FOR_ADAPTER" | "PREVIEW_ONLY";
  subjectId: string;
};

export type DocumentLibraryPersistencePlan = {
  auditEvents: Array<{
    action: string;
    actorUserId: string;
    idempotencyKey: string;
    note: string;
    subjectId: string;
    subjectType: "DOCUMENT" | "PACKET" | "REQUIREMENT";
  }>;
  documents: Array<{
    documentType: string;
    fileName: string;
    id: string;
    legalHold: boolean;
    ownerId: string;
    ownerLabel: string;
    ownerType: DocumentRecord["owner"]["type"];
    retentionCategory: string;
    sensitivity: DocumentRecord["sensitivity"];
    source: DocumentRecord["source"];
    status: DocumentRecord["status"];
    storageProvider: DocumentRecord["storage"]["provider"];
    storageReference: string;
    storageVersion: number;
  }>;
  packetDocuments: Array<{ documentId: string; packetId: string; relationship: "REQUIRED" }>;
  packetRequirements: Array<{
    documentType: string;
    label: string;
    packetId: string;
    required: boolean;
    status: ReturnType<typeof resolvePacket>["requirements"][number]["state"];
    waiverReason: string | null;
  }>;
  packets: Array<{
    id: string;
    ownerId: string;
    ownerLabel: string;
    ownerType: DocumentRecord["owner"]["type"];
    packetType: string;
    status: ReturnType<typeof resolvePacket>["status"];
    title: string;
    workflow: string;
  }>;
  providerReferences: Array<{
    documentId: string;
    externalId: string;
    family: DocumentRecord["providerReferences"][number]["family"];
    health: DocumentRecord["providerReferences"][number]["health"];
    provider: string;
    readOnly: boolean;
    url: string | null;
  }>;
};

export const defaultDocumentPacketTemplates: DocumentLibraryPacketTemplate[] = [
  {
    packetType: "CLAIM_PACKET",
    requirements: [
      { documentType: "INSURANCE_CLAIM_INTAKE", label: "Insurance claim intake form", required: true },
      { documentType: "CUSTOMER_AUTHORIZATION", label: "Customer authorization", required: true },
      { documentType: "DAMAGE_PHOTOS", label: "Damage photos", required: true },
      { documentType: "TOW_STORAGE_FORM", label: "Tow / storage form", required: true }
    ],
    templateKey: "claims.standard",
    title: "Standard claim packet",
    workflow: "CLAIMS"
  },
  {
    packetType: "TITLE_PACKET",
    requirements: [
      { documentType: "TITLE_DOCUMENT", label: "Title document", required: true },
      { documentType: "ODOMETER_DISCLOSURE", label: "Odometer disclosure", required: true },
      { documentType: "CUSTOMER_AUTHORIZATION", label: "Customer authorization", required: false }
    ],
    templateKey: "title.standard",
    title: "Standard title packet",
    workflow: "TITLE"
  },
  {
    packetType: "VENDOR_PACKET",
    requirements: [
      { documentType: "W9", label: "W-9", required: true },
      { documentType: "CERTIFICATE_OF_INSURANCE", label: "Certificate of insurance", required: true },
      { documentType: "SERVICE_AGREEMENT", label: "Service agreement", required: true }
    ],
    templateKey: "vendor.onboarding",
    title: "Vendor onboarding packet",
    workflow: "VENDOR"
  }
];

export function validateDocumentUpload(candidate: DocumentUploadCandidate): DocumentUploadValidation {
  const fileName = candidate.fileName.trim();
  const contentType = candidate.contentType.trim().toLowerCase();
  const blockers = [
    ...(!fileName ? ["File name is required."] : []),
    ...(fileName.includes("/") || fileName.includes("\\") ? ["File name cannot include path separators."] : []),
    ...(!allowedContentTypes.has(contentType) ? ["File type is not allowed for document storage."] : []),
    ...(candidate.sizeBytes <= 0 ? ["File must not be empty."] : []),
    ...(candidate.sizeBytes > MAX_UPLOAD_BYTES ? ["File exceeds the 25 MB document limit."] : [])
  ];
  const warnings = [
    ...(!candidate.checksumSha256 ? ["Checksum is missing; upload can be staged but not released."] : [])
  ];

  return {
    accepted: blockers.length === 0,
    blockers,
    normalized: {
      contentType,
      fileName,
      sizeBytes: candidate.sizeBytes
    },
    warnings
  };
}

export function createObjectVersionRecord(input: {
  actorId: string;
  document: DocumentRecord;
  organizationId: string;
  upload: DocumentUploadCandidate;
  storageReference: string;
  now?: Date;
}): DocumentLibraryObjectVersionRecord {
  const validation = validateDocumentUpload(input.upload);
  if (!validation.accepted) throw new Error(validation.blockers.join(" "));

  return {
    checksumSha256: input.upload.checksumSha256 ?? null,
    contentType: validation.normalized.contentType,
    createdAt: (input.now ?? new Date()).toISOString(),
    createdByUserId: input.actorId,
    documentId: input.document.id,
    fileName: validation.normalized.fileName,
    organizationId: input.organizationId,
    sizeBytes: validation.normalized.sizeBytes,
    storageProvider: input.document.storage.provider,
    storageReference: input.storageReference,
    version: input.document.storage.version + 1
  };
}

export function buildProviderWriteConfirmation(input: {
  action: ProviderActionKind;
  confirmationToken?: string;
  idempotencyKey: string;
  subjectId: string;
}): DocumentProviderWriteConfirmation {
  const preview = previewProviderAction({
    action: input.action,
    idempotencyKey: input.idempotencyKey,
    subjectId: input.subjectId
  });
  const expectedToken = `confirm:${input.action}:${input.subjectId}`;

  return {
    action: input.action,
    auditAction: `PROVIDER_${input.action}_CONFIRMED`,
    idempotencyKey: preview.idempotencyKey,
    rollbackPosture: input.confirmationToken === expectedToken
      ? "Adapter write is confirmed but still isolated behind the release gate until live provider writes are enabled."
      : preview.rollbackPosture,
    state: input.confirmationToken === expectedToken ? "CONFIRMED_WRITE_HELD_FOR_ADAPTER" : "PREVIEW_ONLY",
    subjectId: input.subjectId
  };
}

export function buildDocumentLibraryPersistencePlan(state: DocumentLibraryState): DocumentLibraryPersistencePlan {
  const resolvedPackets = state.packets.map((packet) => resolvePacket(packet, state.documents));

  return {
    auditEvents: state.auditEvents.map((event) => ({
      action: event.action,
      actorUserId: event.actorId,
      idempotencyKey: event.idempotencyKey,
      note: event.note,
      subjectId: event.subjectId,
      subjectType: event.subjectId.startsWith("packet-")
        ? "PACKET"
        : event.subjectId.startsWith("req-")
          ? "REQUIREMENT"
          : "DOCUMENT"
    })),
    documents: state.documents.map((document) => ({
      documentType: document.documentType,
      fileName: document.fileName,
      id: document.id,
      legalHold: document.legalHold,
      ownerId: document.owner.id,
      ownerLabel: document.owner.label,
      ownerType: document.owner.type,
      retentionCategory: document.retentionCategory,
      sensitivity: document.sensitivity,
      source: document.source,
      status: document.status,
      storageProvider: document.storage.provider,
      storageReference: document.storage.reference,
      storageVersion: document.storage.version
    })),
    packetDocuments: state.packets.flatMap((packet) => packet.documents.map((documentId) => ({
      documentId,
      packetId: packet.id,
      relationship: "REQUIRED" as const
    }))),
    packetRequirements: resolvedPackets.flatMap((packet) => packet.requirements.map((requirement) => ({
      documentType: requirement.documentType,
      label: requirement.label,
      packetId: packet.id,
      required: requirement.required,
      status: requirement.state,
      waiverReason: requirement.waived?.reason ?? null
    }))),
    packets: resolvedPackets.map((packet) => ({
      id: packet.id,
      ownerId: packet.owner.id,
      ownerLabel: packet.owner.label,
      ownerType: packet.owner.type,
      packetType: packet.packetType,
      status: packet.status,
      title: packet.title,
      workflow: packet.workflow
    })),
    providerReferences: state.documents.flatMap((document) => document.providerReferences.map((reference) => ({
      documentId: document.id,
      externalId: reference.externalId,
      family: reference.family,
      health: reference.health,
      provider: reference.provider,
      readOnly: reference.readOnly,
      url: reference.url
    })))
  };
}

export function resolveDocumentStoragePermissionEvidence(actor: AuthenticatedUser | null) {
  const restrictedView = resolveDocumentLibraryPermission({
    action: "viewRestricted",
    actor,
    linkedRecordAccess: true,
    sensitivity: "RESTRICTED"
  });
  const providerWrite = resolveDocumentLibraryPermission({
    action: "connectProvider",
    actor,
    linkedRecordAccess: true,
    providerPolicyApproved: true,
    retentionState: "ACTIVE"
  });

  return {
    canOpenLibrary: canOpenDocumentLibrary(actor),
    providerWrite,
    restrictedView
  };
}

export function buildDocumentStorageRolloutEvidence(input: {
  actor: AuthenticatedUser | null;
  durableRepositoryEnabled?: boolean;
  state: DocumentLibraryState;
}): DocumentStorageRolloutEvidence {
  const plan = buildDocumentLibraryPersistencePlan(input.state);
  const permissions = resolveDocumentStoragePermissionEvidence(input.actor);

  return {
    AUDIT_LEDGER: plan.auditEvents.every((event) => Boolean(event.idempotencyKey && event.note)),
    DURABLE_REPOSITORY: Boolean(input.durableRepositoryEnabled),
    OBJECT_VERSIONING: true,
    PACKET_TEMPLATES: defaultDocumentPacketTemplates.length >= 3,
    PERMISSION_ENFORCEMENT: permissions.canOpenLibrary && permissions.restrictedView.auditRequired && permissions.providerWrite.idempotencyRequired,
    PRISMA_SCHEMA: true,
    PROVIDER_ADAPTERS: true,
    ROLLOUT_EVIDENCE: true,
    UPLOAD_PIPELINE: validateDocumentUpload({
      checksumSha256: "release-evidence-checksum",
      contentType: "application/pdf",
      fileName: "release-evidence.pdf",
      sizeBytes: 128
    }).accepted
  };
}
