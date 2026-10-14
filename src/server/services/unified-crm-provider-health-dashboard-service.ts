import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_PROVIDER_HEALTH_DASHBOARD_CONTRACT_VERSION,
  UnifiedCrmProviderHealthDashboardError,
  type UnifiedCrmProviderHealthChannel,
  type UnifiedCrmProviderHealthDashboardReadModel
} from "@/server/unified-crm/provider-health-dashboard-contract";

type Dependencies = { now?: () => Date };

function providerChannels(checkedAt: string): UnifiedCrmProviderHealthChannel[] {
  return [
    {
      id: "email-calendar",
      label: "Email and calendar",
      state: "HELD",
      featureControl: "crm.integrations.emailCalendar.enabled",
      liveTrafficEnabled: false,
      lastCheckedAt: checkedAt,
      detail: "OAuth, mailbox sync, calendar sync, backfill, and send behavior remain held pending provider approval.",
      disabledReason: "Provider, OAuth scopes, sync direction, and rollback proof are not approved.",
      rollback: { fallback: "manual-email-calendar-review", killSwitch: "crm.integrations.emailCalendar.enabled=false" }
    },
    {
      id: "sms",
      label: "SMS",
      state: "HELD",
      featureControl: "crm.integrations.sms.enabled",
      liveTrafficEnabled: false,
      lastCheckedAt: checkedAt,
      detail: "SMS templates can be reviewed, but delivery, inbound parsing, STOP/START automation, and retries are off.",
      disabledReason: "Vendor, consent, quiet-hours, opt-out handling, templates, and cost caps are not approved.",
      rollback: { fallback: "manual-phone-follow-up-and-manual-outcome", killSwitch: "crm.integrations.sms.enabled=false" }
    },
    {
      id: "telephony",
      label: "Phone, recording, and transcription",
      state: "HELD",
      featureControl: "crm.integrations.telephony.enabled",
      liveTrafficEnabled: false,
      lastCheckedAt: checkedAt,
      detail: "Manual call outcomes are available, but click-to-call, recording, transcription, and AI receptionist behavior are off.",
      disabledReason: "Provider, number strategy, recording consent, retention, routing, and AI receptionist scope are not approved.",
      rollback: { fallback: "manual-call-and-manual-disposition", killSwitch: "crm.integrations.telephony.enabled=false" }
    },
    {
      id: "esignature",
      label: "E-signature",
      state: "DISABLED",
      featureControl: "crm.integrations.esignature.enabled",
      liveTrafficEnabled: false,
      lastCheckedAt: checkedAt,
      detail: "Signature envelope sending and external document callbacks are disabled.",
      disabledReason: "Provider, document authority, recipient proof, retention, and void/retry behavior are not approved.",
      rollback: { fallback: "manual-document-signature-process", killSwitch: "crm.integrations.esignature.enabled=false" }
    },
    {
      id: "accounting-dms",
      label: "Accounting and DMS",
      state: "DISABLED",
      featureControl: "crm.integrations.accountingDms.enabled",
      liveTrafficEnabled: false,
      lastCheckedAt: checkedAt,
      detail: "Accounting/DMS sync, customer writeback, deal posting, and invoice export are disabled.",
      disabledReason: "System of record, field mapping, conflict rules, reconciliation, and rollback are not approved.",
      rollback: { fallback: "manual-accounting-dms-review", killSwitch: "crm.integrations.accountingDms.enabled=false" }
    }
  ];
}

export async function getUnifiedCrmProviderHealthDashboard(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmProviderHealthDashboardReadModel> {
  if (!actor) throw new UnifiedCrmProviderHealthDashboardError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM provider health.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmProviderHealthDashboardError("PROVIDER_HEALTH_DASHBOARD_NOT_AUTHORIZED", "CRM provider health is available to the manager workspace.");
  }

  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const channels = providerChannels(generatedAt);
  return {
    contractVersion: UNIFIED_CRM_PROVIDER_HEALTH_DASHBOARD_CONTRACT_VERSION,
    generatedAt,
    state: "READY_REVIEW",
    visibility: "management",
    summary: {
      totalChannels: channels.length,
      liveTrafficEnabled: false,
      heldOrDisabledCount: channels.filter((channel) => channel.state === "HELD" || channel.state === "DISABLED").length,
      degradedCount: channels.filter((channel) => channel.state === "DEGRADED").length
    },
    channels,
    rollback: {
      fallback: "manual-provider-status-review",
      featureControl: "crm.admin.providerHealth.enabled",
      posture: "read-only"
    }
  };
}
