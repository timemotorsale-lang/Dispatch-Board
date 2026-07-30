import { hasRequiredAuditMetadata, type SalesConsoleAuditMetadata, type SalesEvidence } from "./sales-console-m50-record-command-contract";

export const salesEvidenceAllowedFileTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
] as const;

export const salesEvidenceMaxFileSizeBytes = 10 * 1024 * 1024;

export type SalesEvidenceUploadIntent = Omit<SalesEvidence, "id" | "audit" | "status"> & {
  uploadedByRole: "Salesperson" | "BDC / Lead Coordinator" | "Sales Manager" | "Admin / Owner";
  status?: SalesEvidence["status"];
  audit: Partial<SalesConsoleAuditMetadata>;
};

export type SalesEvidenceUploadValidation = {
  allowed: boolean;
  status: "ready" | "blocked";
  reasons: string[];
};

export const salesEvidenceUploadFoundation = {
  storageMode: "guarded-placeholder",
  allowedSubjectTypes: [
    "customer",
    "sales-opportunity",
    "revenue-opportunity",
    "revenue-lane-checklist",
    "manager-review-request",
    "delivery-readiness"
  ],
  blockedBehaviors: ["unguarded upload", "missing audit", "unsupported file type", "oversized file", "unlinked evidence"]
} as const;

export function validateSalesEvidenceUpload(intent: SalesEvidenceUploadIntent): SalesEvidenceUploadValidation {
  const reasons: string[] = [];

  if (!salesEvidenceAllowedFileTypes.includes(intent.fileType as (typeof salesEvidenceAllowedFileTypes)[number])) {
    reasons.push("unsupported file type");
  }

  if (intent.sizeBytes <= 0 || intent.sizeBytes > salesEvidenceMaxFileSizeBytes) {
    reasons.push("file size outside allowed range");
  }

  if (!intent.attachedSubjectId || !salesEvidenceUploadFoundation.allowedSubjectTypes.includes(intent.attachedSubjectType)) {
    reasons.push("evidence must be linked to an allowed Sales Console subject");
  }

  if (!hasRequiredAuditMetadata(intent.audit)) {
    reasons.push("audit and idempotency metadata required");
  }

  return {
    allowed: reasons.length === 0,
    status: reasons.length === 0 ? "ready" : "blocked",
    reasons
  };
}

export function createGuardedEvidenceRecord(intent: SalesEvidenceUploadIntent, evidenceId: string): SalesEvidence | undefined {
  const validation = validateSalesEvidenceUpload(intent);

  if (!validation.allowed || !hasRequiredAuditMetadata(intent.audit)) {
    return undefined;
  }

  const audit = intent.audit as SalesConsoleAuditMetadata;

  return {
    id: evidenceId,
    fileName: intent.fileName,
    fileType: intent.fileType,
    sizeBytes: intent.sizeBytes,
    status: intent.status ?? "pending",
    attachedSubjectType: intent.attachedSubjectType,
    attachedSubjectId: intent.attachedSubjectId,
    category: intent.category,
    audit
  };
}
