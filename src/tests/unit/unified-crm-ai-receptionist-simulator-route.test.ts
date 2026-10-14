import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getUnifiedCrmAiReceptionistSimulator: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-ai-receptionist-simulator-service", () => ({
  getUnifiedCrmAiReceptionistSimulator: mocks.getUnifiedCrmAiReceptionistSimulator
}));

import { GET } from "@/app/api/crm/v1/ai/receptionist-simulator/route";

describe("Unified CRM AI receptionist simulator route", () => {
  it("returns AI receptionist simulator scenarios from the service", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "manager-a" });
    mocks.getUnifiedCrmAiReceptionistSimulator.mockResolvedValueOnce({
      contractVersion: "ucrm.ai-receptionist-simulator/v1",
      state: "READY_REVIEW"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.ai-receptionist-simulator/v1",
      state: "READY_REVIEW"
    });
  });

  it("maps typed authorization denial safely", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "seller-a" });
    mocks.getUnifiedCrmAiReceptionistSimulator.mockRejectedValueOnce(
      Object.assign(new Error("CRM AI receptionist simulator is available to the manager workspace."), {
        code: "AI_RECEPTIONIST_SIMULATOR_NOT_AUTHORIZED"
      })
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "AI_RECEPTIONIST_SIMULATOR_NOT_AUTHORIZED",
      contractVersion: "ucrm.ai-receptionist-simulator-error/v1",
      retryable: false
    });
  });
});
