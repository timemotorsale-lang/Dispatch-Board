import type { AuthenticatedUser } from "@/server/auth/store";

export type DocumentLibraryAction =
  | "archive"
  | "changeRetention"
  | "changeSensitivity"
  | "connectProvider"
  | "delete"
  | "download"
  | "export"
  | "reject"
  | "replaceAccepted"
  | "restore"
  | "view"
  | "viewRestricted"
  | "waiveRequirement";

export type DocumentLibrarySensitivity = "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
export type DocumentLibraryRetentionState = "ACTIVE" | "ARCHIVE_READY" | "ARCHIVED" | "LEGAL_HOLD" | "DISPOSITION_PENDING";

export type DocumentLibraryPermissionContext = {
  action: DocumentLibraryAction;
  actor: AuthenticatedUser | null;
  exportPolicyApproved?: boolean;
  linkedRecordAccess: boolean;
  providerPolicyApproved?: boolean;
  retentionState?: DocumentLibraryRetentionState;
  sensitivity?: DocumentLibrarySensitivity;
};

export type DocumentLibraryPermissionDecision = {
  allowed: boolean;
  auditRequired: boolean;
  idempotencyRequired: boolean;
  reason:
    | "ALLOWED"
    | "AUTHENTICATION_REQUIRED"
    | "DESTRUCTIVE_DELETE_DISABLED"
    | "ELEVATED_PERMISSION_REQUIRED"
    | "EXPORT_POLICY_HELD"
    | "LEGAL_HOLD_BLOCKED"
    | "LINKED_RECORD_ACCESS_REQUIRED"
    | "PROVIDER_POLICY_HELD";
};

const documentLibraryRoleTerms = ["admin", "manager", "office", "sales", "finance", "claims", "service advisor"];
const elevatedRoleTerms = ["admin", "manager", "office manager", "finance", "claims"];
const documentLibraryDutyTerms = ["document", "documentation", "paperwork", "title", "finance", "claim"];

const sensitiveActions = new Set<DocumentLibraryAction>([
  "archive",
  "changeRetention",
  "changeSensitivity",
  "connectProvider",
  "download",
  "export",
  "reject",
  "replaceAccepted",
  "restore",
  "viewRestricted",
  "waiveRequirement"
]);

const idempotentActions = new Set<DocumentLibraryAction>([
  "archive",
  "changeRetention",
  "changeSensitivity",
  "connectProvider",
  "export",
  "reject",
  "replaceAccepted",
  "restore",
  "waiveRequirement"
]);

function hasTerm(values: string[], terms: string[]) {
  return values.some((value) => {
    const normalized = value.toLowerCase();
    return terms.some((term) => normalized.includes(term));
  });
}

function actorRoles(actor: AuthenticatedUser) {
  return actor.roles ?? [];
}

function actorDuties(actor: AuthenticatedUser) {
  return actor.duties?.all ?? [];
}

export function canOpenDocumentLibrary(actor: AuthenticatedUser | null) {
  if (!actor?.isActive) return false;
  return hasTerm(actorRoles(actor), documentLibraryRoleTerms) || hasTerm(actorDuties(actor), documentLibraryDutyTerms);
}

function hasElevatedDocumentPermission(actor: AuthenticatedUser) {
  return hasTerm(actorRoles(actor), elevatedRoleTerms) || hasTerm(actorDuties(actor), documentLibraryDutyTerms);
}

export function resolveDocumentLibraryPermission(context: DocumentLibraryPermissionContext): DocumentLibraryPermissionDecision {
  const auditRequired = sensitiveActions.has(context.action) || context.sensitivity === "RESTRICTED";
  const idempotencyRequired = idempotentActions.has(context.action);

  if (!context.actor?.isActive) {
    return { allowed: false, auditRequired, idempotencyRequired, reason: "AUTHENTICATION_REQUIRED" };
  }

  if (context.action === "delete") {
    return { allowed: false, auditRequired: true, idempotencyRequired: true, reason: "DESTRUCTIVE_DELETE_DISABLED" };
  }

  if (!canOpenDocumentLibrary(context.actor)) {
    return { allowed: false, auditRequired, idempotencyRequired, reason: "ELEVATED_PERMISSION_REQUIRED" };
  }

  if (!context.linkedRecordAccess) {
    return { allowed: false, auditRequired, idempotencyRequired, reason: "LINKED_RECORD_ACCESS_REQUIRED" };
  }

  if (context.retentionState === "LEGAL_HOLD" && ["archive", "changeRetention", "connectProvider", "export", "replaceAccepted"].includes(context.action)) {
    return { allowed: false, auditRequired: true, idempotencyRequired: true, reason: "LEGAL_HOLD_BLOCKED" };
  }

  if (context.action === "export" && !context.exportPolicyApproved) {
    return { allowed: false, auditRequired: true, idempotencyRequired: true, reason: "EXPORT_POLICY_HELD" };
  }

  if (context.action === "connectProvider" && !context.providerPolicyApproved) {
    return { allowed: false, auditRequired: true, idempotencyRequired: true, reason: "PROVIDER_POLICY_HELD" };
  }

  if ((context.action === "viewRestricted" || context.sensitivity === "RESTRICTED" || sensitiveActions.has(context.action)) && !hasElevatedDocumentPermission(context.actor)) {
    return { allowed: false, auditRequired: true, idempotencyRequired, reason: "ELEVATED_PERMISSION_REQUIRED" };
  }

  return { allowed: true, auditRequired, idempotencyRequired, reason: "ALLOWED" };
}
