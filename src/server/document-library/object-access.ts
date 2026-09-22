import type { AuthenticatedUser } from "@/server/auth/store";

import type { DocumentRecord } from "./domain";
import { resolveDocumentLibraryPermission } from "./permission-policy";

export type DocumentObjectAccessPurpose = "PREVIEW" | "DOWNLOAD";

export type DocumentObjectAccessDecision = {
  allowed: boolean;
  auditRequired: boolean;
  blockers: string[];
  documentId: string;
  purpose: DocumentObjectAccessPurpose;
  reference: string | null;
  storageProvider: DocumentRecord["storage"]["provider"] | null;
};

function permissionSensitivity(sensitivity: DocumentRecord["sensitivity"]) {
  return sensitivity === "INTERNAL" || sensitivity === "CONFIDENTIAL" || sensitivity === "RESTRICTED"
    ? sensitivity
    : undefined;
}

export function authorizeDocumentObjectAccess(input: {
  actor: AuthenticatedUser | null;
  document: DocumentRecord | null;
  linkedRecordAccess?: boolean;
  purpose: DocumentObjectAccessPurpose;
}): DocumentObjectAccessDecision {
  if (!input.document) {
    return {
      allowed: false,
      auditRequired: false,
      blockers: ["Document was not found."],
      documentId: "",
      purpose: input.purpose,
      reference: null,
      storageProvider: null
    };
  }

  const permission = resolveDocumentLibraryPermission({
    action: input.purpose === "DOWNLOAD" ? "download" : "viewRestricted",
    actor: input.actor,
    linkedRecordAccess: input.linkedRecordAccess ?? true,
    retentionState: input.document.status === "ARCHIVED" ? "ARCHIVED" : input.document.legalHold ? "LEGAL_HOLD" : "ACTIVE",
    sensitivity: permissionSensitivity(input.document.sensitivity)
  });
  const blockers = [
    ...(permission.allowed ? [] : [permission.reason]),
    ...(!input.document.storage.reference ? ["Document storage reference is missing."] : [])
  ];

  return {
    allowed: blockers.length === 0,
    auditRequired: permission.auditRequired || input.purpose === "DOWNLOAD",
    blockers,
    documentId: input.document.id,
    purpose: input.purpose,
    reference: input.document.storage.reference || null,
    storageProvider: input.document.storage.provider
  };
}
