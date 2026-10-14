export type DocumentStatus =
  | "MISSING"
  | "REQUESTED"
  | "RECEIVED"
  | "IN_REVIEW"
  | "ACCEPTED"
  | "REJECTED"
  | "NEEDS_CORRECTION"
  | "EXPIRED"
  | "ARCHIVED"
  | "ON_HOLD";

export type DocumentSensitivity = "LOW" | "CONFIDENTIAL" | "RESTRICTED";
export type ArchiveState = "ACTIVE" | "ARCHIVE_READY" | "ARCHIVED" | "LEGAL_HOLD" | "DISPOSITION_PENDING";
export type ProviderFamily = "INTERNAL" | "EXTERNAL_LINK" | "GOOGLE_DRIVE" | "SHAREPOINT" | "DROPBOX" | "DMS" | "ESIGNATURE";
export type Permission =
  | "DOCUMENT_VIEW"
  | "DOCUMENT_RESTRICTED_VIEW"
  | "DOCUMENT_CREATE"
  | "DOCUMENT_REVIEW"
  | "DOCUMENT_WAIVE_REQUIREMENT"
  | "DOCUMENT_ARCHIVE"
  | "DOCUMENT_RESTORE"
  | "DOCUMENT_EXPORT"
  | "DOCUMENT_PROVIDER_ACTION"
  | "DOCUMENT_SENSITIVITY_MANAGE"
  | "DOCUMENT_RETENTION_MANAGE";

export type DocumentType =
  | "CUSTOMER_ID"
  | "INSURANCE_AUTHORIZATION"
  | "DAMAGE_PHOTO"
  | "TOW_STORAGE_FORM"
  | "TITLE_DOCUMENT"
  | "BUYER_ORDER"
  | "PAYMENT_PROOF"
  | "SIGNED_FORM"
  | "VENDOR_CERTIFICATE";

export type LinkedRecordType =
  | "CUSTOMER"
  | "VEHICLE"
  | "REPAIR_ORDER"
  | "CLAIM"
  | "SALE_DEAL"
  | "PURCHASE_APPRAISAL"
  | "VENDOR"
  | "TASK";

export type DocumentRecord = {
  archiveState: ArchiveState;
  currentVersionId?: string;
  documentType: DocumentType;
  expiresAt?: string;
  id: string;
  linkedRecords: Array<{ id: string; label: string; type: LinkedRecordType }>;
  ownerRole: string;
  providerReference?: ProviderReference;
  sensitivity: DocumentSensitivity;
  status: DocumentStatus;
  title: string;
};

export type PacketRequirement = {
  documentType: DocumentType;
  id: string;
  name: string;
  optional?: boolean;
  ownerRole: string;
  waived?: { actorId: string; reason: string; waivedAt: string };
};

export type DocumentPacket = {
  documents: DocumentRecord[];
  id: string;
  ownerRole: string;
  packetType: "CLAIM" | "REPAIR_ORDER" | "TITLE" | "SALE_FINANCE" | "PURCHASE_APPRAISAL" | "WARRANTY";
  requirements: PacketRequirement[];
  subject: string;
};

export type ProviderReference = {
  accessPosture: "INTERNAL_ONLY" | "READ_ONLY_REFERENCE" | "CONTROLLED_ACTION_HELD" | "UNAVAILABLE";
  externalId?: string;
  family: ProviderFamily;
  health: "HEALTHY" | "DEGRADED" | "HELD" | "UNAVAILABLE";
  lastVerifiedAt?: string;
  safeUrl?: string;
};

export type AuditEvent = {
  action: string;
  actorId: string;
  correlationId: string;
  reason?: string;
  subjectId: string;
  timestamp: string;
};

export type UserContext = {
  id: string;
  permissions: Permission[];
  role: string;
  visibleRecordIds: string[];
};

export type ProviderActionCommand = {
  action: "EXPORT_PACKET" | "UPLOAD_TO_PROVIDER" | "REQUEST_ESIGNATURE" | "IMPORT_SIGNED_DOCUMENT" | "RECONCILE_PROVIDER_STATUS";
  actor: UserContext;
  idempotencyKey: string;
  packet: DocumentPacket;
  purpose: string;
  providerFamily: ProviderFamily;
  rollbackPlan: string;
  userConfirmed: boolean;
};

export type ProviderActionPlan = {
  action: ProviderActionCommand["action"];
  audit: AuditEvent;
  idempotencyKey: string;
  mode: "CONTROLLED_HUMAN_CONFIRMED";
  providerFamily: ProviderFamily;
  status: "READY_FOR_EXECUTION";
};

export type AdvisorySuggestion = {
  accepted: false;
  evidence: string;
  kind: "SUGGESTED_TYPE" | "DUPLICATE" | "OCR_METADATA" | "MISSING_DOCUMENT" | "EXPIRATION" | "READINESS_SCORE";
  label: string;
  reviewRequired: true;
};

export type PacketEvaluation = {
  blockers: Array<{ ownerRole: string; reason: string; requirementId: string; severity: "BLOCKING" | "REVIEW" }>;
  missingRequirements: string[];
  nextAction: string;
  status: "COMPLETE" | "INCOMPLETE" | "PENDING_REVIEW" | "BLOCKED";
};

export const documentTypeCatalog: Array<{ label: string; sensitivity: DocumentSensitivity; type: DocumentType }> = [
  { label: "Customer ID", sensitivity: "RESTRICTED", type: "CUSTOMER_ID" },
  { label: "Insurance Authorization", sensitivity: "RESTRICTED", type: "INSURANCE_AUTHORIZATION" },
  { label: "Damage Photo", sensitivity: "CONFIDENTIAL", type: "DAMAGE_PHOTO" },
  { label: "Tow / Storage Form", sensitivity: "CONFIDENTIAL", type: "TOW_STORAGE_FORM" },
  { label: "Title Document", sensitivity: "RESTRICTED", type: "TITLE_DOCUMENT" },
  { label: "Buyer Order", sensitivity: "RESTRICTED", type: "BUYER_ORDER" },
  { label: "Payment Proof", sensitivity: "RESTRICTED", type: "PAYMENT_PROOF" },
  { label: "Signed Form", sensitivity: "RESTRICTED", type: "SIGNED_FORM" },
  { label: "Vendor Certificate", sensitivity: "CONFIDENTIAL", type: "VENDOR_CERTIFICATE" }
];

export const controlledProviderActions: ProviderActionCommand["action"][] = [
  "EXPORT_PACKET",
  "UPLOAD_TO_PROVIDER",
  "REQUEST_ESIGNATURE",
  "IMPORT_SIGNED_DOCUMENT",
  "RECONCILE_PROVIDER_STATUS"
];

export function canViewDocument(user: UserContext, document: DocumentRecord) {
  if (!user.permissions.includes("DOCUMENT_VIEW")) return false;
  if (document.sensitivity === "RESTRICTED" && !user.permissions.includes("DOCUMENT_RESTRICTED_VIEW")) return false;
  return document.linkedRecords.some((record) => user.visibleRecordIds.includes(record.id));
}

export function canPerformSensitiveAction(user: UserContext, permission: Permission) {
  return user.permissions.includes(permission);
}

export function evaluatePacket(packet: DocumentPacket, now = new Date()): PacketEvaluation {
  const blockers: PacketEvaluation["blockers"] = [];
  const missingRequirements: string[] = [];

  for (const requirement of packet.requirements) {
    if (requirement.optional || requirement.waived) continue;
    const matching = packet.documents.find((document) => document.documentType === requirement.documentType && document.archiveState !== "ARCHIVED" && document.status !== "REJECTED");

    if (!matching) {
      missingRequirements.push(requirement.id);
      blockers.push({ ownerRole: requirement.ownerRole, reason: `${requirement.name} is missing.`, requirementId: requirement.id, severity: "BLOCKING" });
      continue;
    }

    if (matching.archiveState === "LEGAL_HOLD" || matching.status === "ON_HOLD") {
      blockers.push({ ownerRole: requirement.ownerRole, reason: `${matching.title} is on hold and needs authorized review.`, requirementId: requirement.id, severity: "BLOCKING" });
    } else if (matching.status === "EXPIRED" || (matching.expiresAt && new Date(matching.expiresAt).getTime() < now.getTime())) {
      blockers.push({ ownerRole: requirement.ownerRole, reason: `${matching.title} is expired and needs renewal.`, requirementId: requirement.id, severity: "BLOCKING" });
    } else if (matching.status !== "ACCEPTED") {
      blockers.push({ ownerRole: requirement.ownerRole, reason: `${matching.title} is received but not accepted.`, requirementId: requirement.id, severity: "REVIEW" });
    }
  }

  if (blockers.some((blocker) => blocker.severity === "BLOCKING")) return { blockers, missingRequirements, nextAction: "Resolve missing, expired, rejected, or held required documents.", status: "BLOCKED" };
  if (blockers.length) return { blockers, missingRequirements, nextAction: "Review received documents and record accept, correction, rejection, or waiver decision.", status: "PENDING_REVIEW" };
  return { blockers, missingRequirements, nextAction: "Packet requirements are satisfied by accepted or waived documents.", status: "COMPLETE" };
}

export function previewArchiveEligibility(document: DocumentRecord, activeWorkflowIds: string[]) {
  const reasons: string[] = [];
  if (document.archiveState === "LEGAL_HOLD") reasons.push("Legal hold blocks archive disposal and destructive storage cleanup.");
  if (activeWorkflowIds.some((id) => document.linkedRecords.some((record) => record.id === id))) reasons.push("An active workflow still references this document.");
  if (document.status === "ACCEPTED") reasons.push("Accepted evidence requires retention review before inactive archive.");
  return { eligible: reasons.length === 0, reasons };
}

export function createAuditEvent(input: { action: string; actorId: string; correlationId: string; reason?: string; subjectId: string; timestamp?: string }): AuditEvent {
  return { ...input, timestamp: input.timestamp ?? new Date().toISOString() };
}

export function createProviderActionPlan(command: ProviderActionCommand): ProviderActionPlan {
  if (!command.actor.permissions.includes("DOCUMENT_PROVIDER_ACTION")) throw new Error("Provider action requires DOCUMENT_PROVIDER_ACTION permission.");
  if (!command.idempotencyKey.trim()) throw new Error("Provider action requires an idempotency key.");
  if (!command.userConfirmed) throw new Error("Provider action requires explicit user confirmation.");
  if (!command.purpose.trim()) throw new Error("Provider action requires an explicit purpose.");
  if (!command.rollbackPlan.trim()) throw new Error("Provider action requires rollback posture.");
  if (command.packet.documents.some((document) => document.archiveState === "LEGAL_HOLD")) throw new Error("Provider action blocked by legal hold.");

  return {
    action: command.action,
    audit: createAuditEvent({
      action: `DOCUMENT_PROVIDER_${command.action}`,
      actorId: command.actor.id,
      correlationId: command.idempotencyKey,
      reason: command.purpose,
      subjectId: command.packet.id
    }),
    idempotencyKey: command.idempotencyKey,
    mode: "CONTROLLED_HUMAN_CONFIRMED",
    providerFamily: command.providerFamily,
    status: "READY_FOR_EXECUTION"
  };
}

export function buildAdvisorySuggestions(packet: DocumentPacket): AdvisorySuggestion[] {
  const evaluation = evaluatePacket(packet);
  return [
    ...evaluation.missingRequirements.map((requirementId) => ({
      accepted: false as const,
      evidence: `Requirement ${requirementId} is not satisfied by an accepted active document.`,
      kind: "MISSING_DOCUMENT" as const,
      label: "Missing document recommendation",
      reviewRequired: true as const
    })),
    {
      accepted: false,
      evidence: "Packet readiness is calculated from accepted, waived, expired, missing, and held requirements.",
      kind: "READINESS_SCORE",
      label: `Packet readiness: ${evaluation.status}`,
      reviewRequired: true
    }
  ];
}

export const documentLibraryDemoPacket: DocumentPacket = {
  documents: [
    {
      archiveState: "ACTIVE",
      currentVersionId: "ver-claim-intake-1",
      documentType: "INSURANCE_AUTHORIZATION",
      id: "doc-ins-auth-1",
      linkedRecords: [{ id: "claim-10421", label: "Claim #CLM-10421", type: "CLAIM" }],
      ownerRole: "Claims Coordinator",
      providerReference: { accessPosture: "INTERNAL_ONLY", family: "INTERNAL", health: "HEALTHY", lastVerifiedAt: "2026-09-19T15:30:00.000Z" },
      sensitivity: "RESTRICTED",
      status: "ACCEPTED",
      title: "Customer authorization"
    },
    {
      archiveState: "ACTIVE",
      currentVersionId: "ver-damage-photo-1",
      documentType: "DAMAGE_PHOTO",
      id: "doc-damage-photo-1",
      linkedRecords: [{ id: "claim-10421", label: "Claim #CLM-10421", type: "CLAIM" }],
      ownerRole: "Estimator",
      providerReference: { accessPosture: "READ_ONLY_REFERENCE", externalId: "photo-set-77834", family: "EXTERNAL_LINK", health: "HEALTHY", lastVerifiedAt: "2026-09-19T15:30:00.000Z" },
      sensitivity: "CONFIDENTIAL",
      status: "RECEIVED",
      title: "Damage photos"
    }
  ],
  id: "packet-claim-10421",
  ownerRole: "Claims Coordinator",
  packetType: "CLAIM",
  requirements: [
    { documentType: "INSURANCE_AUTHORIZATION", id: "req-authorization", name: "Customer authorization", ownerRole: "Claims Coordinator" },
    { documentType: "DAMAGE_PHOTO", id: "req-damage-photos", name: "Damage photos", ownerRole: "Estimator" },
    { documentType: "TOW_STORAGE_FORM", id: "req-tow-storage", name: "Tow / storage form", ownerRole: "Service Advisor" }
  ],
  subject: "Claim Packet: Gada Ahmed Jamal"
};

export const documentLibraryMilestoneEvidence = [
  "Milestone 1: manual records, classification, linked records, review state, audit, and search/filter model.",
  "Milestone 2: packet requirements, workflow blockers, role ownership, and waiver-aware completion.",
  "Milestone 3: review queues and urgency can be derived from packet/document status and ownership.",
  "Milestone 4: provider references are separated from document records and treated as replaceable pointers.",
  "Milestone 5: archive state, legal hold, restore/archive permissions, and archive eligibility preview are explicit.",
  "Milestone 6: provider references expose freshness and health without provider writes.",
  "Milestone 7: suggestions are advisory and review-required.",
  "Milestone 8: controlled provider actions require audit, idempotency, permission, confirmation, purpose, and rollback posture."
];
