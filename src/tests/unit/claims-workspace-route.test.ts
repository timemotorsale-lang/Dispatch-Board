import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { POST as CREATE_CLAIM } from "@/app/api/claims-workspace/claims/route";
import { PATCH as UPDATE_CLAIM } from "@/app/api/claims-workspace/claims/[claimId]/route";
import { POST as ATTACH_EVIDENCE } from "@/app/api/claims-workspace/claims/[claimId]/evidence/route";
import { setClaimsWorkspaceRepositoryForTesting } from "@/server/claims-workspace/repository-factory";
import { createInMemoryClaimsWorkspaceRepository } from "@/server/claims-workspace/service";

describe("claims workspace API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setClaimsWorkspaceRepositoryForTesting(createInMemoryClaimsWorkspaceRepository());
    mocks.getCurrentUser.mockResolvedValue({
      duties: { all: [], direct: [], roleDefaults: [] },
      email: "advisor@example.com",
      id: "advisor-route",
      isActive: true,
      name: "Advisor Route",
      roles: ["Service Advisor"]
    });
  });

  afterEach(() => {
    setClaimsWorkspaceRepositoryForTesting(null);
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

  it("records carrier execution details through the API boundary", async () => {
    const createResponse = await CREATE_CLAIM(new Request("http://local/api/claims-workspace/claims", {
      body: JSON.stringify({
        carrierName: "Progressive",
        claimNumber: "API-20002",
        customerName: "Patch Customer",
        description: "Rear damage.",
        vehicleVin: "API-VIN-20002"
      }),
      method: "POST"
    }));
    const created = await createResponse.json();
    const claimId = created.readModel.claim.id;

    const response = await UPDATE_CLAIM(new Request(`http://local/api/claims-workspace/claims/${claimId}`, {
      body: JSON.stringify({
        adjusterName: "Pat Adjuster",
        note: "Adjuster promised estimate callback."
      }),
      method: "PATCH"
    }), {
      params: Promise.resolve({ claimId })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      claim: { adjusterName: "Pat Adjuster" },
      carrierTracker: { nextContact: "Request estimate or approval" }
    });
  });
});
