import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_TELEPHONY_TRANSCRIPTION_CONTRACT_VERSION,
  UnifiedCrmTelephonyTranscriptionError,
  type UnifiedCrmTelephonyTranscriptionCheck,
  type UnifiedCrmTelephonyTranscriptionReadModel
} from "@/server/unified-crm/telephony-transcription-contract";

type Dependencies = {
  now?: () => Date;
};

const CHECKS: UnifiedCrmTelephonyTranscriptionCheck[] = [
  {
    category: "providerSelection",
    evidence: "No telephony provider, phone number strategy, or transcription provider has been approved.",
    holdOwner: "product-owner",
    status: "HOLD"
  },
  {
    category: "callingAuthority",
    evidence: "Click-to-call requires role, organization, assigned-purpose, consent/suppression, and rate-limit checks before dialing.",
    holdOwner: "security-privacy",
    status: "HOLD"
  },
  {
    category: "recordingConsent",
    evidence: "Call recording requires approved consent wording, jurisdiction handling, opt-out behavior, and visible recording state.",
    holdOwner: "legal-security",
    status: "HOLD"
  },
  {
    category: "retentionPolicy",
    evidence: "Recording and transcript retention depends on exact retention periods under UCRM-DEC-014.",
    holdOwner: "data-owner",
    status: "HOLD"
  },
  {
    category: "transcriptionProvenance",
    evidence: "Transcripts must record provider, model/version if applicable, source call id, confidence/quality flags, timestamps, and correction history.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "restrictedAccess",
    evidence: "Recording, transcript, finance, restricted-note, and AI-trace access must remain explicitly capability-gated and masked from lists/search.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "inboundRouting",
    evidence: "Inbound calls require number mapping, business-hours behavior, missed-call handling, customer correlation, and queue fallback before activation.",
    holdOwner: "operations",
    status: "HOLD"
  },
  {
    category: "aiReceptionistBoundary",
    evidence: "AI receptionist can summarize or suggest only after permission-aware retrieval, citations/provenance, human approval for consequential action, and kill switch are proven.",
    holdOwner: "product-owner",
    status: "HOLD"
  },
  {
    category: "providerFailure",
    evidence: "Provider outage must degrade visibly to manual calling and manual contact outcome recording.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "audit",
    evidence: "Every call, recording, transcript, consent prompt, AI handoff, and provider callback must produce non-secret audit evidence.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "legalApproval",
    evidence: "Calling, recording, transcription, and automated receptionist behavior require legal/business approval before activation.",
    holdOwner: "product-owner",
    status: "HOLD"
  },
  {
    category: "killSwitch",
    evidence: "Telephony remains disabled by default and must fail closed if provider health, consent, policy, or legal gates are unavailable.",
    holdOwner: null,
    status: "PASS"
  }
];

export async function getUnifiedCrmTelephonyTranscription(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmTelephonyTranscriptionReadModel> {
  if (!actor) {
    throw new UnifiedCrmTelephonyTranscriptionError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM telephony and transcription readiness.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmTelephonyTranscriptionError(
      "TELEPHONY_TRANSCRIPTION_NOT_AUTHORIZED",
      "CRM telephony and transcription readiness is available to the manager workspace."
    );
  }

  return {
    activation: {
      aiReceptionistEnabled: false,
      callRecordingEnabled: false,
      clickToCallEnabled: false,
      inboundCallRoutingEnabled: false,
      providerName: null,
      transcriptionEnabled: false,
      state: "HELD"
    },
    checks: CHECKS.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_TELEPHONY_TRANSCRIPTION_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: {
      fallback: "manual-call-and-manual-contact-outcome",
      featureControl: "crm.integrations.telephony.enabled",
      posture: "fail-closed"
    },
    state: "HELD",
    visibility: "management"
  };
}
