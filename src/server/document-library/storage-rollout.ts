export const DOCUMENT_STORAGE_ROLLOUT_CONTRACT_VERSION = "document-library.storage-rollout/v1";

export type DocumentStorageMilestoneKey =
  | "PRISMA_SCHEMA"
  | "OBJECT_VERSIONING"
  | "AUDIT_LEDGER"
  | "PACKET_TEMPLATES"
  | "DURABLE_REPOSITORY"
  | "UPLOAD_PIPELINE"
  | "PROVIDER_ADAPTERS"
  | "PERMISSION_ENFORCEMENT"
  | "ROLLOUT_EVIDENCE";

export type DocumentStorageMilestoneStatus = "COMPLETE" | "BLOCKED";

export type DocumentStorageMilestone = {
  blocksRelease: boolean;
  key: DocumentStorageMilestoneKey;
  label: string;
  reason: string;
};

export type DocumentStorageRolloutEvidence = Partial<Record<DocumentStorageMilestoneKey, boolean>>;

export type DocumentStorageReleaseGate = {
  blockers: DocumentStorageMilestone[];
  contractVersion: typeof DOCUMENT_STORAGE_ROLLOUT_CONTRACT_VERSION;
  milestones: Array<DocumentStorageMilestone & { status: DocumentStorageMilestoneStatus }>;
  readyForRelease: boolean;
};

export const DOCUMENT_STORAGE_REQUIRED_MODELS = [
  "DocumentLibraryDocument",
  "DocumentLibraryObjectVersion",
  "DocumentLibraryPacket",
  "DocumentLibraryPacketRequirement",
  "DocumentLibraryPacketDocument",
  "DocumentLibraryProviderReference",
  "DocumentLibraryPacketTemplate",
  "DocumentLibraryAuditEvent",
  "DocumentLibraryReleaseGate"
] as const;

export const DOCUMENT_STORAGE_REQUIRED_INDEXES = [
  "@@index([organizationId, ownerType, ownerId])",
  "@@index([organizationId, documentType, status])",
  "@@index([organizationId, legalHold, status])",
  "@@unique([documentId, version])",
  "@@unique([packetId, documentId])",
  "@@unique([organizationId, provider, externalId])",
  "@@unique([organizationId, templateKey])",
  "@@unique([organizationId, action, idempotencyKey])",
  "@@unique([organizationId, gateKey])"
] as const;

export const documentStorageMilestones: DocumentStorageMilestone[] = [
  {
    blocksRelease: true,
    key: "PRISMA_SCHEMA",
    label: "Durable schema and migration",
    reason: "Document records, packets, packet requirements, audit events, provider references, release gates, and object versions must be modeled before production writes."
  },
  {
    blocksRelease: true,
    key: "OBJECT_VERSIONING",
    label: "Immutable object versioning",
    reason: "Every replacement upload needs a retained version, checksum, storage reference, and actor trail."
  },
  {
    blocksRelease: true,
    key: "AUDIT_LEDGER",
    label: "Audit and idempotency ledger",
    reason: "Review, hold, waive, link, archive, restore, upload, and provider commands must be replay-safe and searchable."
  },
  {
    blocksRelease: true,
    key: "PACKET_TEMPLATES",
    label: "Packet templates",
    reason: "Claim, title, vendor, sale, repair-order, and customer packets need reusable requirement sets before staff depend on them."
  },
  {
    blocksRelease: true,
    key: "DURABLE_REPOSITORY",
    label: "Database-backed repository",
    reason: "The current in-memory command repository must be replaced with Prisma persistence while keeping the existing command boundary."
  },
  {
    blocksRelease: true,
    key: "UPLOAD_PIPELINE",
    label: "Upload and retrieval pipeline",
    reason: "Files need validation, content type limits, checksum capture, object storage references, and safe retrieval URLs."
  },
  {
    blocksRelease: true,
    key: "PROVIDER_ADAPTERS",
    label: "Provider adapter writes",
    reason: "DMS, storage, e-signature, insurance, and accounting integrations must graduate from previews to confirmed, audited writes."
  },
  {
    blocksRelease: true,
    key: "PERMISSION_ENFORCEMENT",
    label: "Permission and sensitivity enforcement",
    reason: "Restricted files, legal holds, archives, provider writes, and release-gate changes need role-aware server enforcement."
  },
  {
    blocksRelease: true,
    key: "ROLLOUT_EVIDENCE",
    label: "Release evidence",
    reason: "Schema validation, focused tests, seed/backfill rehearsal, and rollback notes must be captured before rollout."
  }
];

export function evaluateDocumentStorageReleaseGate(evidence: DocumentStorageRolloutEvidence = {}): DocumentStorageReleaseGate {
  const milestones = documentStorageMilestones.map((milestone) => ({
    ...milestone,
    status: evidence[milestone.key] ? "COMPLETE" : "BLOCKED" as DocumentStorageMilestoneStatus
  }));
  const blockers = milestones.filter((milestone) => milestone.blocksRelease && milestone.status !== "COMPLETE");

  return {
    blockers,
    contractVersion: DOCUMENT_STORAGE_ROLLOUT_CONTRACT_VERSION,
    milestones,
    readyForRelease: blockers.length === 0
  };
}

export function buildDocumentStorageContract() {
  return {
    contractVersion: DOCUMENT_STORAGE_ROLLOUT_CONTRACT_VERSION,
    invariants: [
      "Documents are never physically deleted by workflow actions; archive state is explicit and auditable.",
      "Each document points to a current storage reference and may retain immutable object versions.",
      "Packet completion is recalculated from linked documents, requirements, waivers, legal holds, and archive state.",
      "Provider references are read-only until provider adapters complete audited write confirmation.",
      "Release gates are organization-scoped so pilot rollout can be approved without changing global behavior."
    ],
    models: DOCUMENT_STORAGE_REQUIRED_MODELS,
    indexes: DOCUMENT_STORAGE_REQUIRED_INDEXES
  };
}
