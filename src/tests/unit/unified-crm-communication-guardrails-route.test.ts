import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getUnifiedCrmCommunicationGuardrails: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-communication-guardrails-service", () => ({
  getUnifiedCrmCommunicationGuardrails: mocks.getUnifiedCrmCommunicationGuardrails
}));

import { GET } from "@/app/api/crm/v1/communications/guardrails/route";

describe("Unified CRM communication guardrails route", () => {
  it("returns guardrails from the service", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "manager-a" });
    mocks.getUnifiedCrmCommunicationGuardrails.mockResolvedValueOnce({
      contractVersion: "ucrm.communication-guardrails/v1",
      state: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.communication-guardrails/v1",
      state: "HELD"
    });
  });

  it("maps typed authorization denial safely", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "seller-a" });
    mocks.getUnifiedCrmCommunicationGuardrails.mockRejectedValueOnce(
      Object.assign(new Error("CRM communication guardrails are available to the manager workspace."), {
        code: "COMMUNICATION_GUARDRAILS_NOT_AUTHORIZED"
      })
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "COMMUNICATION_GUARDRAILS_NOT_AUTHORIZED",
      contractVersion: "ucrm.communication-guardrails-error/v1",
      retryable: false
    });
  });
});
