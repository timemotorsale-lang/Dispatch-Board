import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmSmsTemplateCatalog } from "@/server/services/unified-crm-sms-template-catalog-service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM SMS template catalog", () => {
  it("exposes review templates while publish and outbound SMS remain disabled", async () => {
    const result = await getUnifiedCrmSmsTemplateCatalog(manager, { now: () => new Date("2026-08-28T03:30:00.000Z") });
    expect(result.contractVersion).toBe("ucrm.sms-template-catalog/v1");
    expect(result.activation).toEqual({ catalogReviewEnabled: true, outboundSmsEnabled: false, templatePublishEnabled: false, state: "IMPLEMENTED_UNVERIFIED" });
    expect(result.templates).toHaveLength(3);
    expect(result.templates.every((template) => template.requiredConsent === "SMS_OPT_IN")).toBe(true);
    expect(result.checks.find((check) => check.category === "sendDisabled")).toMatchObject({ status: "PASS" });
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmSmsTemplateCatalog(seller)).rejects.toMatchObject({ code: "SMS_TEMPLATE_CATALOG_NOT_AUTHORIZED" });
  });
});
