import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmGovernedCustomFields } from "@/server/services/unified-crm-governed-custom-fields-service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM governed custom fields readiness", () => {
  it("keeps custom fields and layouts held with rollback", async () => {
    const result = await getUnifiedCrmGovernedCustomFields(manager, { now: () => new Date("2026-08-27T21:00:00.000Z") });

    expect(result.contractVersion).toBe("ucrm.governed-custom-fields/v1");
    expect(result.generatedAt).toBe("2026-08-27T21:00:00.000Z");
    expect(result.state).toBe("HELD");
    expect(result.activation).toEqual({ customFieldPublishEnabled: false, layoutPublishEnabled: false, runtimeMutationEnabled: false, state: "HELD" });
    expect(result.checks.find((check) => check.category === "namespace")).toMatchObject({ status: "PASS" });
    expect(result.checks.find((check) => check.category === "limits")).toMatchObject({ status: "HOLD" });
    expect(result.layoutPreview).toMatchObject({ state: "READY_REVIEW", publishEnabled: false });
    expect(result.layoutPreview.sections.map((section) => section.targetSurface)).toEqual(["CUSTOMER_360", "OPPORTUNITY_DETAIL", "QUOTE_REVIEW"]);
    expect(result.layoutPreview.sections.flatMap((section) => section.fields).every((field) => field.publishEnabled === false)).toBe(true);
    expect(result.layoutPreview.sections.flatMap((section) => section.fields).map((field) => field.classification)).toEqual(expect.arrayContaining(["STANDARD", "INTERNAL", "RESTRICTED"]));
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmGovernedCustomFields(seller)).rejects.toMatchObject({ code: "GOVERNED_CUSTOM_FIELDS_NOT_AUTHORIZED" });
  });
});
