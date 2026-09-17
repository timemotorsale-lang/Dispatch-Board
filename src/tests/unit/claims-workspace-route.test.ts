import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { POST as CREATE_CLAIM } from "@/app/api/claims-workspace/claims/route";
import { POST as ATTACH_EVIDENCE } from "@/app/api/claims-workspace/claims/[claimId]/evidence/route";

describe("claims workspace API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      duties: { all: [], direct: [], roleDefaults: [] },
      email: "advisor@example.com",
      id: "advisor-route",
      isActive: true,
      name: "Advisor Route",
      roles: ["Service Advisor"]
    });
  });

  it("creates a claim through the API boundary", async () => {
    const response = await CREATE_CLAIM(new Request("http://local/api/claims-workspace/claims", {
      body: JSON.stringify({
        carrierName: "State Farm",
        claimNumber: "API-10001",
        customerName: "API Customer",
        description: "Front damage.",
        vehicleMake: "Toyota",
        vehicleModel: "Camry",
        vehicleVin: "API-VIN-10001",
        vehicleYear: "2018"
      }),
      method: "POST"
    }));

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.readModel.claim).toMatchObject({
      claimNumber: "API-10001",
      customerName: "API Customer"
    });
    expect(payload.readModel.handoff.allowed).toBe(false);
  });

  it("rejects unauthenticated evidence attachment", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const response = await ATTACH_EVIDENCE(new Request("http://local/api/claims-workspace/claims/claim-demo-1/evidence", {
      body: JSON.stringify({ category: "DAMAGE_PHOTO", title: "Damage photos" }),
      method: "POST"
    }), {
      params: Promise.resolve({ claimId: "claim-demo-1" })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
      contractVersion: "claims-workspace-error/v1"
    });
  });
});
