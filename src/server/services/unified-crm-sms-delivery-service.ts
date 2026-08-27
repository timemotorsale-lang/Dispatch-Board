import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_SMS_DELIVERY_CONTRACT_VERSION,
  UnifiedCrmSmsDeliveryError,
  type UnifiedCrmSmsDeliveryCheck,
  type UnifiedCrmSmsDeliveryReadModel
} from "@/server/unified-crm/sms-delivery-contract";

type Dependencies = {
  now?: () => Date;
};

const CHECKS: UnifiedCrmSmsDeliveryCheck[] = [
  {
    category: "vendorSelection",
    evidence: "No SMS vendor, sender type, registration path, or production number has been approved.",
    holdOwner: "product-owner",
    status: "HOLD"
  },
  {
    category: "consentOptOut",
    evidence: "SMS requires channel-specific consent, suppression checks, STOP/START handling, and audit immediately before send.",
    holdOwner: "security-privacy",
    status: "HOLD"
  },
  {
    category: "templateGovernance",
    evidence: "Outbound SMS templates must be approved, versioned, purpose-labeled, and blocked from free-form production sending unless separately approved.",
    holdOwner: "product-owner",
    status: "HOLD"
  },
  {
    category: "quietHours",
    evidence: "Quiet hours, timezone source, emergency override, and manager override rules are not yet approved.",
    holdOwner: "operations",
    status: "HOLD"
  },
  {
    category: "inboundCorrelation",
    evidence: "Inbound replies must correlate by organization, provider, phone, customer, conversation envelope, and opt-out keyword before surfacing in CRM.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "deliveryStates",
    evidence: "SMS delivery state must distinguish queued, sent, delivered, failed, undeliverable, opted-out, suppressed, and provider-disabled.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "retryFailure",
    evidence: "Provider timeout/replay must not duplicate texts; retry policy and dead-letter handling remain required before activation.",
    holdOwner: "architecture",
    status: "HOLD"
  },
  {
    category: "audit",
    evidence: "SMS audit must record actor/system identity, purpose, template version, consent basis, provider reference, and delivery state.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "costRateControls",
    evidence: "Daily/monthly cost caps, per-customer frequency caps, and abuse/rate controls are not yet approved.",
    holdOwner: "product-owner",
    status: "HOLD"
  },
  {
    category: "killSwitch",
    evidence: "SMS remains disabled by default and must fail closed if the provider or policy gate is unavailable.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "browserProof",
    evidence: "Authenticated browser proof remains pending until SMS send and inbound surfaces are designed and approved.",
    holdOwner: "quality",
    status: "HOLD"
  }
];

export async function getUnifiedCrmSmsDelivery(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmSmsDeliveryReadModel> {
  if (!actor) {
    throw new UnifiedCrmSmsDeliveryError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM SMS delivery readiness.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmSmsDeliveryError(
      "SMS_DELIVERY_NOT_AUTHORIZED",
      "CRM SMS delivery readiness is available to the manager workspace."
    );
  }

  return {
    activation: {
      inboundSmsEnabled: false,
      outboundSmsEnabled: false,
      providerName: null,
      state: "HELD"
    },
    checks: CHECKS.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_SMS_DELIVERY_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    guardrails: {
      costCapCents: null,
      quietHoursPolicy: "HELD",
      requiredConsentBasis: "explicit-channel-purpose",
      stopKeywordRequired: true
    },
    rollback: {
      fallback: "manual-contact-outcome-and-phone-call",
      featureControl: "crm.integrations.sms.enabled",
      posture: "fail-closed"
    },
    state: "HELD",
    visibility: "management"
  };
}
