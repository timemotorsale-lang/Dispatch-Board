import type { AuthenticatedUser } from "@/server/auth/store";
import { listEnterpriseAdminControls } from "@/server/enterprise-admin/controls";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_ADMIN_READINESS_HUB_CONTRACT_VERSION,
  UnifiedCrmAdminReadinessHubError,
  type UnifiedCrmAdminReadinessHubReadModel,
  type UnifiedCrmAdminReadinessHubTile
} from "@/server/unified-crm/admin-readiness-hub-contract";

type Dependencies = { now?: () => Date };

const integrationTiles: UnifiedCrmAdminReadinessHubTile[] = [
  {
    featureControl: "crm.integrations.enabled",
    milestoneId: "UCRM-080",
    nextDecision: null,
    status: "AVAILABLE",
    summary: "Provider-neutral connector safety contract exists; live provider activation remains separate.",
    title: "Integration platform"
  },
  {
    featureControl: "crm.integrations.emailCalendar.providerA.enabled",
    milestoneId: "UCRM-081",
    nextDecision: "Choose provider A, OAuth scopes, sync direction, backfill, and rollback proof.",
    status: "HELD",
    summary: "Email/calendar provider A is safely gated with no OAuth or sync enabled.",
    title: "Email/calendar provider A"
  },
  {
    featureControl: "crm.integrations.sms.enabled",
    milestoneId: "UCRM-083",
    nextDecision: "Choose SMS vendor, consent/opt-out copy, templates, quiet hours, and cost caps.",
    status: "HELD",
    summary: "SMS is safely gated with outbound and inbound texting disabled.",
    title: "SMS delivery"
  },
  {
    featureControl: "crm.integrations.telephony.enabled",
    milestoneId: "UCRM-084",
    nextDecision: "Choose calling provider, recording consent, retention, routing, and AI receptionist boundary.",
    status: "HELD",
    summary: "Phone, recording, transcription, and AI receptionist behavior are disabled.",
    title: "Phone and transcription"
  }
];

const enterpriseTiles: UnifiedCrmAdminReadinessHubTile[] = [
  {
    featureControl: "crm.enterprise.customFields.enabled",
    milestoneId: "UCRM-101",
    nextDecision: "Approve field types, limits, indexing, reporting impact, and admin preview.",
    status: "HELD",
    summary: "Custom fields and layouts have a governance boundary but no live publishing.",
    title: "Custom fields and layouts"
  },
  {
    featureControl: "crm.enterprise.workflowDesigner.enabled",
    milestoneId: "UCRM-102",
    nextDecision: "Approve authority, limits, loop protection, sandbox proof, and rollback.",
    status: "HELD",
    summary: "Workflow simulation is safe; publishing and live execution remain disabled.",
    title: "Workflow designer"
  },
  {
    featureControl: "crm.enterprise.aiAssistance.enabled",
    milestoneId: "UCRM-106",
    nextDecision: "Approve evaluation set, citations, prompt-injection defense, opt-out, cost, and logging.",
    status: "HELD",
    summary: "AI assistance and AI receptionist behavior are held behind safety gates.",
    title: "Governed AI"
  }
];

const plannedTiles: UnifiedCrmAdminReadinessHubTile[] = [
  {
    featureControl: "crm.communications.providerDecisionIntake.enabled",
    milestoneId: "UCRM-109",
    nextDecision: "Define a simple provider decision intake workflow.",
    status: "PLANNED",
    summary: "Capture email, SMS, and phone provider choices in one governed intake.",
    title: "Provider decision intake"
  },
  {
    featureControl: "crm.communications.consentFoundation.enabled",
    milestoneId: "UCRM-110",
    nextDecision: "Approve practical consent and opt-out UX for customer communications.",
    status: "PLANNED",
    summary: "Make customer communication consent visible and actionable before sending.",
    title: "Consent foundation"
  },
  {
    featureControl: "crm.communications.conversationEnvelope.enabled",
    milestoneId: "UCRM-111",
    nextDecision: "Approve conversation envelope storage and retention boundary.",
    status: "PLANNED",
    summary: "Prepare the durable record that future email, text, phone, and AI activity will attach to.",
    title: "Conversation envelope"
  },
  {
    featureControl: "crm.ai.receptionistSimulator.enabled",
    milestoneId: "UCRM-121",
    nextDecision: "Approve AI receptionist simulation scenarios before live provider integration.",
    status: "PLANNED",
    summary: "Practice the receptionist experience without answering real calls or texting customers.",
    title: "AI receptionist simulator"
  }
];

export async function getUnifiedCrmAdminReadinessHub(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmAdminReadinessHubReadModel> {
  if (!actor) throw new UnifiedCrmAdminReadinessHubError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM readiness hub.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmAdminReadinessHubError("ADMIN_READINESS_HUB_NOT_AUTHORIZED", "CRM readiness hub is available to the manager workspace.");
  }

  return {
    adminControls: listEnterpriseAdminControls().map((control) => ({
      area: control.area,
      auditEventType: control.auditEventType,
      href: control.href,
      staffVisibility: control.staffVisibility,
      summary: control.summary,
      title: control.title
    })),
    contractVersion: UNIFIED_CRM_ADMIN_READINESS_HUB_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    groups: [
      { title: "Communications and integrations", tiles: integrationTiles.map((tile) => ({ ...tile })) },
      { title: "Enterprise controls", tiles: enterpriseTiles.map((tile) => ({ ...tile })) },
      { title: "Next planned build", tiles: plannedTiles.map((tile) => ({ ...tile })) }
    ],
    rollback: {
      fallback: "crm-more-menu-and-direct-readiness-routes",
      featureControl: "crm.admin.readinessHub.enabled",
      posture: "read-only"
    },
    state: "AVAILABLE",
    visibility: "management"
  };
}
