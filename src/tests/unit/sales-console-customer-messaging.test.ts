import { describe, expect, it } from "vitest";

import {
  messagingFoundationIsDisabled,
  messagingHasAuditAndPermissionCoverage,
  messagingRequiresConsentPreviewAndOptOut,
  salesConsoleCustomerMessagingReadModel
} from "@/features/sales/sales-console-m9-customer-messaging";

describe("Sales Console customer messaging foundation", () => {
  it("keeps sending and automation disabled", () => {
    expect(messagingFoundationIsDisabled()).toBe(true);
    expect(salesConsoleCustomerMessagingReadModel.drafts.every((draft) => draft.sendEnabled === false)).toBe(true);
    expect(salesConsoleCustomerMessagingReadModel.drafts.every((draft) => draft.automationEnabled === false)).toBe(true);
  });

  it("requires consent, preview, opt-out, and rate-limit controls", () => {
    expect(messagingRequiresConsentPreviewAndOptOut()).toBe(true);
  });

  it("tracks template approval before future send activation", () => {
    expect(salesConsoleCustomerMessagingReadModel.templates.some((template) => template.approved)).toBe(true);
    expect(salesConsoleCustomerMessagingReadModel.templates.some((template) => !template.approved)).toBe(true);
  });

  it("has audit and permission coverage while disabled", () => {
    expect(messagingHasAuditAndPermissionCoverage()).toBe(true);
  });
});
