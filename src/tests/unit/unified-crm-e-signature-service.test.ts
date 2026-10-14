import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmESignature } from "@/server/services/unified-crm-e-signature-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM e-signature readiness", () => {
  it("keeps envelope creation and status import held", async () => {
    const result = await getUnifiedCrmESignature(manager, {
      now: () => new Date("2026-08-27T19:00:00.000Z")
    });

    expect(result.contractVersion).toBe("ucrm.e-signature/v1");
    expect(result.generatedAt).toBe("2026-08-27T19:00:00.000Z");
    expect(result.state).toBe("HELD");
    expect(result.activation).toEqual({
      envelopeCreateEnabled: false,
      providerName: null,
      signatureStatusImportEnabled: false,
      state: "HELD"
    });
    expect(result.checks.find((check) => check.category === "documentAuthority")).toMatchObject({ status: "HOLD" });
    expect(result.checks.find((check) => check.category === "envelopeEvidence")).toMatchObject({ status: "PASS" });
    expect(result.documentReadinessSurface).toMatchObject({
      state: "READY_REVIEW",
      safeActionLabel: "Review document readiness",
      sendActionEnabled: false
    });
    expect(result.documentReadinessSurface.items.map((item) => item.envelopeSendEnabled)).toEqual([false, false, false]);
    expect(result.documentReadinessSurface.items.map((item) => item.sourceAuthority)).toEqual(["QUOTE", "CUSTOMER", "DISPATCH"]);
    expect(JSON.stringify(result)).not.toContain("providerSecret");
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmESignature(seller)).rejects.toMatchObject({
      code: "E_SIGNATURE_NOT_AUTHORIZED"
    });
  });

  it("requires authentication before exposing e-signature readiness", async () => {
    await expect(getUnifiedCrmESignature(null)).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED"
    });
  });
});
