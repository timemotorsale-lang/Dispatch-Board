import { describe, expect, it, vi } from "vitest";

const actor = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const mocks = vi.hoisted(() => ({ getUnifiedCrmCommunicationConsentFoundation: vi.fn() }));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-communication-consent-foundation-service", () => mocks);

import { GET } from "@/app/api/crm/v1/communications/consent-foundation/route";

describe("Unified CRM communication consent foundation route", () => {
  it("returns the consent foundation model", async () => {
    mocks.getUnifiedCrmCommunicationConsentFoundation.mockResolvedValueOnce({ contractVersion: "ucrm.communication-consent-foundation/v1", state: "HELD" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.communication-consent-foundation/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmCommunicationConsentFoundation).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmCommunicationConsentFoundation.mockRejectedValueOnce(Object.assign(new Error("CRM communication consent readiness is available to the manager workspace."), { code: "COMMUNICATION_CONSENT_FOUNDATION_NOT_AUTHORIZED" }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "COMMUNICATION_CONSENT_FOUNDATION_NOT_AUTHORIZED", contractVersion: "ucrm.communication-consent-foundation-error/v1" });
  });
});
