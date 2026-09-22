import type { DocumentRecord } from "./domain";
import type { DocumentUploadCandidate } from "./storage-platform";
import { validateDocumentUpload } from "./storage-platform";

export const DOCUMENT_STORAGE_POLICY_VERSION = "document-storage.policy/v1";

export type DispatchDocumentConsole =
  | "APPOINTMENT_CONSOLE"
  | "CRM_CONSOLE"
  | "CUSTOMER_WORKBENCH"
  | "DEAL_JACKET"
  | "CLAIMS_WORKSPACE"
  | "REPAIR_ORDER_CONSOLE"
  | "ADVISOR_CONSOLE"
  | "VENDOR_CONSOLE"
  | "INVENTORY_CONSOLE"
  | "TASK_CONSOLE"
  | "DOCUMENT_LIBRARY";

export type DispatchDocumentIntent =
  | "CUSTOMER_FILE"
  | "CLAIM_EVIDENCE"
  | "TITLE_DMV"
  | "SALE_FINANCE"
  | "REPAIR_EVIDENCE"
  | "VENDOR_COMPLIANCE"
  | "APPOINTMENT_PROOF"
  | "TASK_ATTACHMENT"
  | "GENERAL_SUPPORT";

export type DispatchDocumentStorageContext = {
  console: DispatchDocumentConsole;
  documentType?: string;
  intent?: DispatchDocumentIntent;
  ownerId?: string;
  ownerLabel?: string;
  ownerType?: DocumentRecord["owner"]["type"];
  packetId?: string;
  purpose?: string;
  reason?: string;
};

export type DocumentStoragePolicyDecision = {
  accepted: boolean;
  auditRequired: boolean;
  blockers: string[];
  classification: {
    documentType: string;
    packetType: string | null;
    retentionCategory: string;
    sensitivity: DocumentRecord["sensitivity"];
    source: DocumentRecord["source"];
    workflow: string;
  };
  console: DispatchDocumentConsole;
  idempotencyRequired: boolean;
  owner: DocumentRecord["owner"];
  policyVersion: typeof DOCUMENT_STORAGE_POLICY_VERSION;
  reasonRequired: boolean;
  storage: {
    provider: DocumentRecord["storage"]["provider"];
    releaseMode: "STAGED_INTERNAL_REFERENCE" | "EXTERNAL_REFERENCE_ONLY" | "PROVIDER_REFERENCE_ONLY";
    version: 1;
  };
  warnings: string[];
};

const consoleDefaults: Record<DispatchDocumentConsole, {
  intent: DispatchDocumentIntent;
  ownerType: DocumentRecord["owner"]["type"];
  workflow: string;
}> = {
  ADVISOR_CONSOLE: { intent: "REPAIR_EVIDENCE", ownerType: "REPAIR_ORDER", workflow: "REPAIR_ORDER" },
  APPOINTMENT_CONSOLE: { intent: "APPOINTMENT_PROOF", ownerType: "TASK", workflow: "APPOINTMENT" },
  CLAIMS_WORKSPACE: { intent: "CLAIM_EVIDENCE", ownerType: "CLAIM", workflow: "CLAIMS" },
  CRM_CONSOLE: { intent: "CUSTOMER_FILE", ownerType: "CUSTOMER", workflow: "CUSTOMER" },
  CUSTOMER_WORKBENCH: { intent: "CUSTOMER_FILE", ownerType: "CUSTOMER", workflow: "CUSTOMER" },
  DEAL_JACKET: { intent: "SALE_FINANCE", ownerType: "SALE", workflow: "SALE_FINANCE" },
  DOCUMENT_LIBRARY: { intent: "GENERAL_SUPPORT", ownerType: "CUSTOMER", workflow: "DOCUMENT_LIBRARY" },
  INVENTORY_CONSOLE: { intent: "TITLE_DMV", ownerType: "VEHICLE", workflow: "TITLE" },
  REPAIR_ORDER_CONSOLE: { intent: "REPAIR_EVIDENCE", ownerType: "REPAIR_ORDER", workflow: "REPAIR_ORDER" },
  TASK_CONSOLE: { intent: "TASK_ATTACHMENT", ownerType: "TASK", workflow: "TASK" },
  VENDOR_CONSOLE: { intent: "VENDOR_COMPLIANCE", ownerType: "VENDOR", workflow: "VENDOR" }
};

const intentDefaults: Record<DispatchDocumentIntent, {
  documentType: string;
  packetType: string | null;
  retentionCategory: string;
  sensitivity: DocumentRecord["sensitivity"];
}> = {
  APPOINTMENT_PROOF: { documentType: "APPOINTMENT_PROOF", packetType: null, retentionCategory: "APPOINTMENT_RECORD", sensitivity: "INTERNAL" },
  CLAIM_EVIDENCE: { documentType: "DAMAGE_PHOTOS", packetType: "CLAIM_PACKET", retentionCategory: "CLAIM_FILE", sensitivity: "CONFIDENTIAL" },
  CUSTOMER_FILE: { documentType: "CUSTOMER_DOCUMENT", packetType: null, retentionCategory: "CUSTOMER_FILE", sensitivity: "CONFIDENTIAL" },
  GENERAL_SUPPORT: { documentType: "SUPPORTING_DOCUMENT", packetType: null, retentionCategory: "GENERAL_DOCUMENT", sensitivity: "INTERNAL" },
  REPAIR_EVIDENCE: { documentType: "REPAIR_EVIDENCE", packetType: "REPAIR_ORDER_PACKET", retentionCategory: "REPAIR_ORDER_FILE", sensitivity: "CONFIDENTIAL" },
  SALE_FINANCE: { documentType: "BUYER_ORDER", packetType: "SALE_PACKET", retentionCategory: "SALE_AND_FINANCE", sensitivity: "RESTRICTED" },
  TASK_ATTACHMENT: { documentType: "TASK_ATTACHMENT", packetType: null, retentionCategory: "TASK_FILE", sensitivity: "INTERNAL" },
  TITLE_DMV: { documentType: "TITLE_DOCUMENT", packetType: "TITLE_PACKET", retentionCategory: "TITLE_AND_LEGAL", sensitivity: "RESTRICTED" },
  VENDOR_COMPLIANCE: { documentType: "VENDOR_CERTIFICATE", packetType: "VENDOR_PACKET", retentionCategory: "VENDOR_COMPLIANCE", sensitivity: "CONFIDENTIAL" }
};

function text(value: string | undefined) {
  return value?.trim() ?? "";
}

function inferIntent(context: DispatchDocumentStorageContext, upload: DocumentUploadCandidate): DispatchDocumentIntent {
  if (context.intent) return context.intent;
  const haystack = `${context.documentType ?? ""} ${context.purpose ?? ""} ${upload.fileName}`.toLowerCase();
  if (/claim|insurance|damage|tow|storage/.test(haystack)) return "CLAIM_EVIDENCE";
  if (/title|dmv|registration|odometer|lien/.test(haystack)) return "TITLE_DMV";
  if (/buyer|sale|finance|funding|payment|proof|lender/.test(haystack)) return "SALE_FINANCE";
  if (/repair|estimate|diagnosis|photo|qc|condition/.test(haystack)) return "REPAIR_EVIDENCE";
  if (/vendor|w-?9|certificate|agreement|insurance certificate/.test(haystack)) return "VENDOR_COMPLIANCE";
  if (/appointment|no[- ]?show|schedule|visit/.test(haystack)) return "APPOINTMENT_PROOF";
  return consoleDefaults[context.console]?.intent ?? "GENERAL_SUPPORT";
}

function classifyDocumentType(context: DispatchDocumentStorageContext, upload: DocumentUploadCandidate, intent: DispatchDocumentIntent) {
  const explicit = text(context.documentType);
  if (explicit) return explicit.toUpperCase().replaceAll(" ", "_");
  const haystack = `${context.purpose ?? ""} ${upload.fileName}`.toLowerCase();
  if (intent === "CLAIM_EVIDENCE" && /estimate|supplement|appraisal/.test(haystack)) return "INSURANCE_ESTIMATE";
  if (/authorization|signed|signature/.test(haystack)) return "CUSTOMER_AUTHORIZATION";
  if (/id|license|driver/.test(haystack)) return "CUSTOMER_ID";
  if (/damage|photo|image|condition/.test(haystack)) return "DAMAGE_PHOTOS";
  if (/tow|storage/.test(haystack)) return "TOW_STORAGE_FORM";
  if (/odometer/.test(haystack)) return "ODOMETER_DISCLOSURE";
  if (/payment|wire|funding|receipt/.test(haystack)) return "PAYMENT_PROOF";
  if (/w-?9/.test(haystack)) return "W9";
  return intentDefaults[intent].documentType;
}

function sensitivityFor(documentType: string, intent: DispatchDocumentIntent): DocumentRecord["sensitivity"] {
  if (/CUSTOMER_ID|TITLE|ODOMETER|PAYMENT|BUYER|LENDER|AUTHORIZATION|W9/.test(documentType)) return "RESTRICTED";
  if (intent === "SALE_FINANCE" || intent === "TITLE_DMV") return "RESTRICTED";
  if (intent === "CLAIM_EVIDENCE" || intent === "REPAIR_EVIDENCE" || intent === "VENDOR_COMPLIANCE") return "CONFIDENTIAL";
  return intentDefaults[intent].sensitivity;
}

export function resolveDocumentStoragePolicy(input: {
  context: DispatchDocumentStorageContext;
  upload: DocumentUploadCandidate;
}): DocumentStoragePolicyDecision {
  const validation = validateDocumentUpload(input.upload);
  const defaults = consoleDefaults[input.context.console] ?? consoleDefaults.DOCUMENT_LIBRARY;
  const intent = inferIntent(input.context, input.upload);
  const intentDefault = intentDefaults[intent];
  const documentType = classifyDocumentType(input.context, input.upload, intent);
  const ownerId = text(input.context.ownerId);
  const ownerLabel = text(input.context.ownerLabel);
  const reason = text(input.context.reason);
  const storageProvider: DocumentRecord["storage"]["provider"] = input.context.console === "DOCUMENT_LIBRARY" ? "INTERNAL" : "INTERNAL";
  const blockers = [
    ...validation.blockers,
    ...(!ownerId ? ["Document owner id is required before storage."] : []),
    ...(!ownerLabel ? ["Document owner label is required before storage."] : []),
    ...(!reason ? ["Document storage requires a business reason."] : [])
  ];

  return {
    accepted: blockers.length === 0,
    auditRequired: true,
    blockers,
    classification: {
      documentType,
      packetType: intentDefault.packetType,
      retentionCategory: intentDefault.retentionCategory,
      sensitivity: sensitivityFor(documentType, intent),
      source: "MANUAL_UPLOAD",
      workflow: defaults.workflow
    },
    console: input.context.console,
    idempotencyRequired: true,
    owner: {
      id: ownerId,
      label: ownerLabel,
      type: input.context.ownerType ?? defaults.ownerType
    },
    policyVersion: DOCUMENT_STORAGE_POLICY_VERSION,
    reasonRequired: true,
    storage: {
      provider: storageProvider,
      releaseMode: "STAGED_INTERNAL_REFERENCE",
      version: 1
    },
    warnings: [
      ...validation.warnings,
      ...(intentDefault.packetType && !input.context.packetId ? [`${intentDefault.packetType} can be created or linked after staging.`] : [])
    ]
  };
}
