import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_E_SIGNATURE_CONTRACT_VERSION,
  UnifiedCrmESignatureError,
  type UnifiedCrmESignatureCheck,
  type UnifiedCrmESignatureDocumentReadinessItem,
  type UnifiedCrmESignatureReadModel
} from "@/server/unified-crm/e-signature-contract";

type Dependencies = {
  now?: () => Date;
};

const CHECKS: UnifiedCrmESignatureCheck[] = [
  {
    category: "providerSelection",
    evidence: "No e-signature provider, account, template library, or production envelope path has been approved.",
    holdOwner: "product-owner",
    status: "HOLD"
  },
  {
    category: "documentAuthority",
    evidence: "Document ownership, signing authority, and source-of-truth effect of a signed envelope must be approved before activation.",
    holdOwner: "product-owner",
    status: "HOLD"
  },
  {
    category: "signerIdentity",
    evidence: "Signer identity verification, customer-contact matching, and delegated signer rules are not yet approved.",
    holdOwner: "security-privacy",
    status: "HOLD"
  },
  {
    category: "envelopeEvidence",
    evidence: "Envelope evidence must be immutable and include document version, signer, timestamps, provider reference, and completion/cancel reason.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "webhookReconciliation",
    evidence: "Provider webhooks require signature verification, replay protection, dead-letter visibility, and reconciliation before status import.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "expiryCancel",
    evidence: "Expiry, void/cancel, resend, correction, and declined-signature behavior must be provider-specific and audited.",
    holdOwner: "operations",
    status: "HOLD"
  },
  {
    category: "permissions",
    evidence: "Envelope create/view/download must intersect CRM permissions, customer scope, quote/version authority, and restricted document policy.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "templateVersioning",
    evidence: "Template/version governance must prevent a later template edit from changing the meaning of an already-issued envelope.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "audit",
    evidence: "Audit must record actor/system identity, document version, customer purpose, provider event, and correlation id without exposing provider secrets.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "rollback",
    evidence: "Rollback remains manual document review and existing approval workflows until provider disablement is rehearsed.",
    holdOwner: "operations",
    status: "HOLD"
  }
];

const DOCUMENT_READINESS_ITEMS: UnifiedCrmESignatureDocumentReadinessItem[] = [
  {
    id: "quote-approval-document",
    label: "Quote approval document",
    sourceAuthority: "QUOTE",
    readiness: "REVIEW_READY",
    envelopeSendEnabled: false,
    requiredBeforeSend: ["Approved signer identity", "Commercial authority", "Provider selection", "Immutable quote version"],
    fallback: "Print or manually send the approved quote from the existing quote workflow."
  },
  {
    id: "customer-authorization",
    label: "Customer authorization form",
    sourceAuthority: "CUSTOMER",
    readiness: "HELD",
    envelopeSendEnabled: false,
    requiredBeforeSend: ["Customer consent wording", "Delegated signer rules", "Retention policy"],
    fallback: "Use existing manual customer authorization handling."
  },
  {
    id: "repair-handoff-document",
    label: "Repair / dispatch handoff document",
    sourceAuthority: "DISPATCH",
    readiness: "HELD",
    envelopeSendEnabled: false,
    requiredBeforeSend: ["Dispatch source authority", "Repair order version binding", "Webhook reconciliation"],
    fallback: "Continue using the Dispatch Board repair-order workflow."
  }
];

export async function getUnifiedCrmESignature(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmESignatureReadModel> {
  if (!actor) {
    throw new UnifiedCrmESignatureError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM e-signature readiness.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmESignatureError(
      "E_SIGNATURE_NOT_AUTHORIZED",
      "CRM e-signature readiness is available to the manager workspace."
    );
  }

  return {
    activation: {
      envelopeCreateEnabled: false,
      providerName: null,
      signatureStatusImportEnabled: false,
      state: "HELD"
    },
    checks: CHECKS.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_E_SIGNATURE_CONTRACT_VERSION,
    documentReadinessSurface: {
      state: "READY_REVIEW",
      items: DOCUMENT_READINESS_ITEMS.map((item) => ({
        ...item,
        requiredBeforeSend: [...item.requiredBeforeSend]
      })),
      safeActionLabel: "Review document readiness",
      sendActionEnabled: false
    },
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: {
      fallback: "manual-document-review-and-existing-approval-workflow",
      featureControl: "crm.integrations.eSignature.enabled",
      posture: "fail-closed"
    },
    state: "HELD",
    visibility: "management"
  };
}
