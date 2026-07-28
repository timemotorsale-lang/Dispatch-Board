import { salesConsoleAuditReadModel } from "./sales-console-m9-audit-trails";
import { salesConsoleEnterprisePermissionReadModel } from "./sales-console-m9-enterprise-permissions";

export type SalesConsoleMessageChannel = "email" | "sms";

export type SalesConsoleMessagingTemplate = {
  approved: boolean;
  channel: SalesConsoleMessageChannel;
  templateId: string;
  useCase: "appointment-confirmation" | "lead-follow-up" | "vehicle-availability";
};

export type SalesConsoleMessagingConsentRule = {
  consentRequired: true;
  optOutCheckRequired: true;
  previewRequired: true;
  rateLimitRequired: true;
};

export type SalesConsoleMessagingDraft = {
  automationEnabled: false;
  customerId: string;
  draftId: string;
  enabled: false;
  sendEnabled: false;
  templateId: string;
};

export type SalesConsoleCustomerMessagingReadModel = {
  consentRule: SalesConsoleMessagingConsentRule;
  drafts: SalesConsoleMessagingDraft[];
  guardrails: string[];
  readOnly: true;
  templates: SalesConsoleMessagingTemplate[];
};

export const salesConsoleCustomerMessagingReadModel = {
  consentRule: {
    consentRequired: true,
    optOutCheckRequired: true,
    previewRequired: true,
    rateLimitRequired: true
  },
  drafts: [
    {
      automationEnabled: false,
      customerId: "cust-101",
      draftId: "message-draft-placeholder-1001",
      enabled: false,
      sendEnabled: false,
      templateId: "template-lead-follow-up"
    }
  ],
  guardrails: [
    "Customer messaging remains disabled until consent, opt-out, template, preview, permission, and audit controls exist.",
    "No automated sending is allowed in this foundation branch.",
    "Messages must be human-previewed and logged before any future send workflow.",
    "Opted-out or missing-consent customers must block messaging."
  ],
  readOnly: true,
  templates: [
    { approved: true, channel: "sms", templateId: "template-lead-follow-up", useCase: "lead-follow-up" },
    { approved: true, channel: "email", templateId: "template-appointment-confirmation", useCase: "appointment-confirmation" },
    { approved: false, channel: "sms", templateId: "template-vehicle-availability", useCase: "vehicle-availability" }
  ]
} as const satisfies SalesConsoleCustomerMessagingReadModel;

export function messagingFoundationIsDisabled(readModel = salesConsoleCustomerMessagingReadModel) {
  return readModel.readOnly === true &&
    readModel.drafts.every((draft) => draft.enabled === false && draft.sendEnabled === false && draft.automationEnabled === false);
}

export function messagingRequiresConsentPreviewAndOptOut(readModel = salesConsoleCustomerMessagingReadModel) {
  return readModel.consentRule.consentRequired &&
    readModel.consentRule.optOutCheckRequired &&
    readModel.consentRule.previewRequired &&
    readModel.consentRule.rateLimitRequired;
}

export function messagingHasAuditAndPermissionCoverage() {
  const auditCovered = salesConsoleAuditReadModel.futureActionCoverage.some((coverage) => coverage.action === "Customer messaging automation" && coverage.enabled === false);
  const permissionCovered = salesConsoleEnterprisePermissionReadModel.gates.some((gate) => gate.capability === "customer-message-draft" && gate.enabled === false);

  return auditCovered && permissionCovered;
}
