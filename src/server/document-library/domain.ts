export const DOCUMENT_LIBRARY_CONTRACT_VERSION = "document-library.backend/v1";
export const DOCUMENT_LIBRARY_ERROR_CONTRACT_VERSION = "document-library.error/v1";

export type DocumentLibraryFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "DOCUMENT_LIBRARY_NOT_AUTHORIZED"
  | "DOCUMENT_LIBRARY_INVALID_ACTION"
  | "DOCUMENT_LIBRARY_NOT_FOUND"
  | "DOCUMENT_LIBRARY_STORAGE_UNAVAILABLE"
  | "DOCUMENT_LIBRARY_IDEMPOTENCY_CONFLICT";

export class DocumentLibraryError extends Error {
  constructor(
    public readonly code: DocumentLibraryFailureCode,
    message: string,
    public readonly retryable = false
  ) {
    super(message);
    this.name = "DocumentLibraryError";
  }
}

export type DocumentStatus = "RECEIVED" | "PENDING_REVIEW" | "ACCEPTED" | "NEEDS_CORRECTION" | "REJECTED" | "ARCHIVED";
export type DocumentSensitivity = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED" | "SECURITY_AUDIT";
export type PacketStatus = "MISSING" | "PENDING_REVIEW" | "NEEDS_CORRECTION" | "BLOCKED" | "COMPLETE";
export type ProviderActionKind = "EXPORT_PACKET" | "UPLOAD_TO_PROVIDER" | "REQUEST_ESIGNATURE" | "IMPORT_SIGNED_DOCUMENT" | "RECONCILE_PROVIDER_STATUS";
export type ReviewDecision = "ACCEPT" | "REJECT" | "NEEDS_CORRECTION" | "WAIVE_REQUIREMENT";
export type DocumentLibraryActionKind =
  | ProviderActionKind
  | "ARCHIVE_DOCUMENT"
  | "CREATE_DOCUMENT"
  | "LINK_DOCUMENT_TO_PACKET"
  | "RESTORE_DOCUMENT"
  | "REVIEW_DOCUMENT"
  | "PREVIEW_ARCHIVE"
  | "SET_LEGAL_HOLD"
  | "RELEASE_LEGAL_HOLD"
  | "WAIVE_REQUIREMENT";

export type DocumentRecord = {
  auditTrail: Array<{ action: string; actor: string; at: string; note: string }>;
  createdAt: string;
  documentType: string;
  fileName: string;
  id: string;
  legalHold: boolean;
  owner: { id: string; label: string; type: "CUSTOMER" | "VEHICLE" | "REPAIR_ORDER" | "CLAIM" | "TASK" | "VENDOR" | "SALE" };
  providerReferences: ProviderReference[];
  retentionCategory: string;
  sensitivity: DocumentSensitivity;
  source: "MANUAL_UPLOAD" | "CUSTOMER_PORTAL" | "GENERATED" | "EXTERNAL_LINK" | "PROVIDER_REFERENCE";
  status: DocumentStatus;
  storage: { provider: "INTERNAL" | "EXTERNAL_LINK" | "PROVIDER"; reference: string; version: number };
};

export type DocumentAuditEvent = {
  action: string;
  actorId: string;
  at: string;
  idempotencyKey: string;
  note: string;
  subjectId: string;
};

export type PacketRequirement = {
  documentType: string;
  id: string;
  label: string;
  required: boolean;
  waived?: { by: string; reason: string; waivedAt: string };
};

export type PacketRecord = {
  documents: string[];
  id: string;
  owner: DocumentRecord["owner"];
  packetType: string;
  requirements: PacketRequirement[];
  title: string;
  workflow: string;
};

export type RequirementResolution = PacketRequirement & {
  blocker: string | null;
  documentId: string | null;
  state: "MISSING" | "RECEIVED" | "ACCEPTED" | "NEEDS_CORRECTION" | "REJECTED" | "ARCHIVED" | "LEGAL_HOLD" | "WAIVED";
};

export type ProviderReference = {
  externalId: string;
  family: "STORAGE" | "ESIGNATURE" | "INSURANCE" | "DMS" | "ACCOUNTING";
  health: "HELD" | "READY_REVIEW" | "DEGRADED" | "UNAVAILABLE";
  lastVerifiedAt: string | null;
  provider: string;
  readOnly: boolean;
  url: string | null;
};

export type DocumentLibraryCommand =
  | {
      action: "ARCHIVE_DOCUMENT" | "RESTORE_DOCUMENT" | "SET_LEGAL_HOLD" | "RELEASE_LEGAL_HOLD";
      documentId: string;
      idempotencyKey: string;
      reason: string;
    }
  | {
      action: "CREATE_DOCUMENT";
      documentId?: string;
      documentType: string;
      fileName: string;
      idempotencyKey: string;
      owner: DocumentRecord["owner"];
      packetId?: string;
      reason: string;
      sensitivity: DocumentSensitivity;
      source: DocumentRecord["source"];
      storage: DocumentRecord["storage"];
    }
  | {
      action: "LINK_DOCUMENT_TO_PACKET";
      documentId: string;
      idempotencyKey: string;
      packetId: string;
      reason: string;
    }
  | {
      action: "REVIEW_DOCUMENT";
      decision: ReviewDecision;
      documentId: string;
      idempotencyKey: string;
      reason?: string;
    }
  | {
      action: "WAIVE_REQUIREMENT";
      idempotencyKey: string;
      packetId: string;
      reason: string;
      requirementId: string;
    };

export type ProviderActionPreview = {
  action: ProviderActionKind;
  auditRequired: true;
  idempotencyKey: string;
  liveProviderWriteEnabled: false;
  permission: "MANAGER_REQUIRED";
  rollbackPosture: string;
  state: "HELD_FOR_CONFIRMATION";
  subjectId: string;
};

export type DocumentReviewPreview = {
  auditRequired: true;
  decision: ReviewDecision;
  documentId: string;
  nextStatus: DocumentStatus;
  packetRecalculationRequired: true;
  reasonRequired: boolean;
  state: "READY_FOR_REVIEW_AUDIT";
};

export type ArchiveActionPreview = {
  auditRequired: true;
  documentId: string;
  eligibility: ReturnType<typeof previewArchiveEligibility>;
  nextStatus: "ARCHIVED" | "UNCHANGED";
  state: "READY_TO_ARCHIVE" | "BLOCKED";
};

export type LegalHoldActionPreview = {
  auditRequired: true;
  documentId: string;
  legalHold: boolean;
  packetRecalculationRequired: true;
  state: "READY_FOR_HOLD_AUDIT";
};

export function resolveRequirement(requirement: PacketRequirement, documents: DocumentRecord[]): RequirementResolution {
  if (requirement.waived) return { ...requirement, blocker: null, documentId: null, state: "WAIVED" };

  const candidates = documents.filter((document) => document.documentType === requirement.documentType);
  const active = candidates.find((document) => document.status !== "ARCHIVED");
  const document = active ?? candidates[0] ?? null;

  if (!document) {
    return { ...requirement, blocker: requirement.required ? `${requirement.label} is missing.` : null, documentId: null, state: "MISSING" };
  }
  if (document.legalHold) {
    return { ...requirement, blocker: `${requirement.label} is under legal hold and cannot satisfy this packet.`, documentId: document.id, state: "LEGAL_HOLD" };
  }
  if (document.status === "ACCEPTED") return { ...requirement, blocker: null, documentId: document.id, state: "ACCEPTED" };
  if (document.status === "NEEDS_CORRECTION") {
    return { ...requirement, blocker: `${requirement.label} needs correction.`, documentId: document.id, state: "NEEDS_CORRECTION" };
  }
  if (document.status === "REJECTED") {
    return { ...requirement, blocker: `${requirement.label} was rejected.`, documentId: document.id, state: "REJECTED" };
  }
  if (document.status === "ARCHIVED") {
    return { ...requirement, blocker: `${requirement.label} is archived.`, documentId: document.id, state: "ARCHIVED" };
  }
  return { ...requirement, blocker: `${requirement.label} is waiting for review.`, documentId: document.id, state: "RECEIVED" };
}

export function resolvePacket(packet: PacketRecord, documents: DocumentRecord[]) {
  const packetDocuments = documents.filter((document) => packet.documents.includes(document.id));
  const requirements = packet.requirements.map((requirement) => resolveRequirement(requirement, packetDocuments));
  const required = requirements.filter((requirement) => requirement.required);
  const blockers = required.flatMap((requirement) => requirement.blocker ? [requirement.blocker] : []);
  const status: PacketStatus = required.some((requirement) => requirement.state === "LEGAL_HOLD" || requirement.state === "ARCHIVED")
    ? "BLOCKED"
    : required.some((requirement) => requirement.state === "MISSING")
      ? "MISSING"
      : required.some((requirement) => requirement.state === "NEEDS_CORRECTION" || requirement.state === "REJECTED")
        ? "NEEDS_CORRECTION"
        : required.some((requirement) => requirement.state === "RECEIVED")
          ? "PENDING_REVIEW"
          : "COMPLETE";

  return {
    ...packet,
    blockers,
    completion: {
      accepted: required.filter((requirement) => requirement.state === "ACCEPTED" || requirement.state === "WAIVED").length,
      required: required.length
    },
    requirements,
    status
  };
}

export function previewArchiveEligibility(document: DocumentRecord, packets: PacketRecord[]) {
  const activePackets = packets.filter((packet) => packet.documents.includes(document.id));
  const reasons = [
    ...(document.legalHold ? ["Document is under legal hold."] : []),
    ...(activePackets.length > 0 ? ["Document is still linked to active packet work."] : [])
  ];

  return {
    documentId: document.id,
    eligible: reasons.length === 0,
    legalHold: document.legalHold,
    reasons,
    retentionCategory: document.retentionCategory
  };
}

export function previewProviderAction(input: { action: ProviderActionKind; idempotencyKey: string; subjectId: string }): ProviderActionPreview {
  if (!input.idempotencyKey.trim()) {
    throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Provider actions require an idempotency key.");
  }
  return {
    action: input.action,
    auditRequired: true,
    idempotencyKey: input.idempotencyKey.trim(),
    liveProviderWriteEnabled: false,
    permission: "MANAGER_REQUIRED",
    rollbackPosture: "No provider write is sent; staff can continue with the manual document process.",
    state: "HELD_FOR_CONFIRMATION",
    subjectId: input.subjectId
  };
}

export function previewReviewDecision(input: { decision: ReviewDecision; documentId: string }): DocumentReviewPreview {
  const nextStatusByDecision: Record<ReviewDecision, DocumentStatus> = {
    ACCEPT: "ACCEPTED",
    NEEDS_CORRECTION: "NEEDS_CORRECTION",
    REJECT: "REJECTED",
    WAIVE_REQUIREMENT: "ACCEPTED"
  };

  return {
    auditRequired: true,
    decision: input.decision,
    documentId: input.documentId,
    nextStatus: nextStatusByDecision[input.decision],
    packetRecalculationRequired: true,
    reasonRequired: input.decision !== "ACCEPT",
    state: "READY_FOR_REVIEW_AUDIT"
  };
}

export function previewArchiveAction(document: DocumentRecord, packets: PacketRecord[]): ArchiveActionPreview {
  const eligibility = previewArchiveEligibility(document, packets);
  return {
    auditRequired: true,
    documentId: document.id,
    eligibility,
    nextStatus: eligibility.eligible ? "ARCHIVED" : "UNCHANGED",
    state: eligibility.eligible ? "READY_TO_ARCHIVE" : "BLOCKED"
  };
}

export function previewLegalHoldAction(input: { documentId: string; legalHold: boolean }): LegalHoldActionPreview {
  return {
    auditRequired: true,
    documentId: input.documentId,
    legalHold: input.legalHold,
    packetRecalculationRequired: true,
    state: "READY_FOR_HOLD_AUDIT"
  };
}
