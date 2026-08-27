import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_COMMUNICATION_GUARDRAILS_CONTRACT_VERSION,
  UnifiedCrmCommunicationGuardrailsError,
  type UnifiedCrmCommunicationGuardrailRule,
  type UnifiedCrmCommunicationGuardrailsReadModel
} from "@/server/unified-crm/communication-guardrails-contract";

type Dependencies = { now?: () => Date };

const rules: UnifiedCrmCommunicationGuardrailRule[] = [
  {
    id: "sms-quiet-hours-local",
    channel: "SMS",
    category: "QUIET_HOURS",
    state: "HELD",
    enforcementEnabled: false,
    title: "Local quiet-hours window",
    detail: "SMS automation must suppress customer texts outside the approved local sending window.",
    requiredDecision: "Approve dealership time zone, quiet-hours start/end, emergency exceptions, and holiday behavior."
  },
  {
    id: "all-daily-rate-limit",
    channel: "ALL",
    category: "RATE_LIMIT",
    state: "HELD",
    enforcementEnabled: false,
    title: "Per-customer daily contact cap",
    detail: "Automation must prevent repeated contact attempts from stacking across email, text, phone, and AI receptionist flows.",
    requiredDecision: "Approve daily/weekly customer contact caps and manager override rules."
  },
  {
    id: "sms-monthly-cost-cap",
    channel: "SMS",
    category: "COST_CONTROL",
    state: "HELD",
    enforcementEnabled: false,
    title: "Monthly SMS spend cap",
    detail: "SMS usage must stop or require approval before crossing the approved monthly budget.",
    requiredDecision: "Approve monthly SMS budget, alert thresholds, and who can temporarily raise limits."
  },
  {
    id: "phone-ai-minutes-cap",
    channel: "PHONE",
    category: "COST_CONTROL",
    state: "HELD",
    enforcementEnabled: false,
    title: "Phone and AI receptionist minute cap",
    detail: "Voice, recording, transcription, and AI receptionist minutes must be capped before activation.",
    requiredDecision: "Approve maximum monthly voice/AI spend and automatic shutoff behavior."
  },
  {
    id: "all-global-kill-switch",
    channel: "ALL",
    category: "KILL_SWITCH",
    state: "REVIEW_READY",
    enforcementEnabled: false,
    title: "Global communications kill switch",
    detail: "Every provider-backed communication path must be instantly disableable without deleting history.",
    requiredDecision: null
  },
  {
    id: "all-consent-before-send",
    channel: "ALL",
    category: "CONSENT",
    state: "HELD",
    enforcementEnabled: false,
    title: "Consent check before send/call automation",
    detail: "Consent, opt-out, suppression, and contact-purpose gates must pass before any automated communication.",
    requiredDecision: "Approve final consent UX, opt-out copy, suppression policy, and audit retention."
  }
];

export async function getUnifiedCrmCommunicationGuardrails(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmCommunicationGuardrailsReadModel> {
  if (!actor) throw new UnifiedCrmCommunicationGuardrailsError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM communication guardrails.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmCommunicationGuardrailsError("COMMUNICATION_GUARDRAILS_NOT_AUTHORIZED", "CRM communication guardrails are available to the manager workspace.");
  }

  const snapshot = rules.map((rule) => ({ ...rule }));
  return {
    contractVersion: UNIFIED_CRM_COMMUNICATION_GUARDRAILS_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    state: "HELD",
    visibility: "management",
    activation: {
      automatedSendingEnabled: false,
      providerTrafficEnabled: false,
      enforcementPreviewOnly: true
    },
    rules: snapshot,
    summary: {
      heldRuleCount: snapshot.filter((rule) => rule.state === "HELD").length,
      previewRuleCount: snapshot.length,
      enforceableRuleCount: 0
    },
    rollback: {
      fallback: "manual-consent-and-cost-review",
      featureControl: "crm.communications.guardrails.enabled",
      posture: "fail-closed"
    }
  };
}
