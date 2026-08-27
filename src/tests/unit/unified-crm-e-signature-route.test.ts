import { describe, expect, it, vi } from "vitest";

const actor = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const mocks = vi.hoisted(() => ({
  getUnifiedCrmESignature: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-e-signature-service", () => mocks);

import { GET } from "@/app/api/crm/v1/integrations/e-signature/route";

describe("Unified CRM e-signature route", () => {
  it("returns the e-signature readiness model", async () => {
    mocks.getUnifiedCrmESignature.mockResolvedValueOnce({
      contractVersion: "ucrm.e-signature/v1",
      state: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.e-signature/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmESignature).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmESignature.mockRejectedValueOnce(Object.assign(new Error("CRM e-signature readiness is available to the manager workspace."), {
      code: "E_SIGNATURE_NOT_AUTHORIZED",
      contractVersion: "ucrm.e-signature-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "E_SIGNATURE_NOT_AUTHORIZED",
      contractVersion: "ucrm.e-signature-error/v1",
      error: "CRM e-signature readiness is available to the manager workspace.",
      retryable: false
    });
  });

  it("masks unknown failures", async () => {
    mocks.getUnifiedCrmESignature.mockRejectedValueOnce(new Error("signature provider private key"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.e-signature-error/v1",
      error: "CRM e-signature readiness is temporarily unavailable.",
      retryable: false
    });
  });
});
