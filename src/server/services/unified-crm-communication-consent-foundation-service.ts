import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_COMMUNICATION_CONSENT_FOUNDATION_CONTRACT_VERSION,
  UnifiedCrmCommunicationConsentFoundationError,
  type UnifiedCrmCommunicationConsentChannelReadiness,
  type UnifiedCrmCommunicationConsentCheck,
  type UnifiedCrmCommunicationConsentFoundationReadModel
} from "@/server/unified-crm/communication-consent-foundation-contract";

type Dependencies = { now?: () => Date };

const checks: UnifiedCrmCommunicationConsentCheck[] = [
  {
    category: "channelConsent",
    evidence: "Each email, SMS, and phone action must check channel-specific consent immediately before the action.",
    holdOwner: "security-privacy",
    status: "HOLD"
  },
  {
    category: "purpose",
    evidence: "Communication purpose must be explicit and cannot be inferred from a visible button alone.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "suppression",
    evidence: "Suppression, bounced/invalid contact points, do-not-contact, and archived/merged customer state must block live actions.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "optOut",
    evidence: "Opt-out, STOP/START, revoke, and customer preference update behavior remain provider-specific and held.",
    holdOwner: "security-privacy",
    status: "HOLD"
  },
  {
    category: "quietHours",
    evidence: "Quiet-hours timezone, emergency exceptions, and manager override rules remain unapproved.",
    holdOwner: "operations",
    status: "HOLD"
  },
  {
    category: "contactPointAuthority",
    evidence: "Customers remains authoritative for customer identity, contact points, consent, merge, archive, and retention state.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "audit",
    evidence: "Every readiness decision must record channel, purpose, actor/system identity, consent basis, and denial reason before live activation.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "fallback",
    evidence: "Fallback remains manual contact outcome capture with no external delivery.",
    holdOwner: null,
    status: "PASS"
  }
];

const channels: UnifiedCrmCommunicationConsentChannelReadiness[] = [
  { channel: "EMAIL", liveActionEnabled: false, reason: "Provider and send-consent gate remain held.", state: "HELD" },
  { channel: "SMS", liveActionEnabled: false, reason: "SMS consent, STOP/START, quiet hours, and cost controls remain held.", state: "HELD" },
  { channel: "PHONE", liveActionEnabled: false, reason: "Calling authority, recording consent, and telephony provider gates remain held.", state: "HELD" }
];

export async function getUnifiedCrmCommunicationConsentFoundation(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmCommunicationConsentFoundationReadModel> {
  if (!actor) throw new UnifiedCrmCommunicationConsentFoundationError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM communication consent readiness.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmCommunicationConsentFoundationError(
      "COMMUNICATION_CONSENT_FOUNDATION_NOT_AUTHORIZED",
      "CRM communication consent readiness is available to the manager workspace."
    );
  }

  return {
    activation: { emailSendEnabled: false, phoneDialEnabled: false, smsSendEnabled: false, state: "HELD" },
    channels: channels.map((channel) => ({ ...channel })),
    checks: checks.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_COMMUNICATION_CONSENT_FOUNDATION_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: {
      fallback: "manual-contact-outcome-with-no-external-delivery",
      featureControl: "crm.communications.consentFoundation.enabled",
      posture: "fail-closed"
    },
    state: "HELD",
    visibility: "management"
  };
}
