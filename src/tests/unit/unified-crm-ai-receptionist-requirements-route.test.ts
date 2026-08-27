import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getUnifiedCrmAiReceptionistRequirements: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-ai-receptionist-requirements-service", () => ({
  getUnifiedCrmAiReceptionistRequirements: mocks.getUnifiedCrmAiReceptionistRequirements
}));

import { GET } from "@/app/api/crm/v1/ai/receptionist-requirements/route";

describe("Unified CRM AI receptionist requirements route", () => {
  it("returns AI receptionist requirements from the service", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "manager-a" });
    mocks.getUnifiedCrmAiReceptionistRequirements.mockResolvedValueOnce({
      contractVersion: "ucrm.ai-receptionist-requirements/v1",
      state: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.ai-receptionist-requirements/v1",
      state: "HELD"
    });
  });

  it("maps typed authorization denial safely", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "seller-a" });
    mocks.getUnifiedCrmAiReceptionistRequirements.mockRejectedValueOnce(
      Object.assign(new Error("CRM AI receptionist requirements are available to the manager workspace."), {
        code: "AI_RECEPTIONIST_REQUIREMENTS_NOT_AUTHORIZED"
      })
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "AI_RECEPTIONIST_REQUIREMENTS_NOT_AUTHORIZED",
      contractVersion: "ucrm.ai-receptionist-requirements-error/v1",
      retryable: false
    });
  });
});
