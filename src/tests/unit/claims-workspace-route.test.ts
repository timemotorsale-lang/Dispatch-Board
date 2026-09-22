import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { POST as CREATE_CLAIM } from "@/app/api/claims-workspace/claims/route";
import { PATCH as UPDATE_CLAIM } from "@/app/api/claims-workspace/claims/[claimId]/route";
import { POST as ATTACH_EVIDENCE } from "@/app/api/claims-workspace/claims/[claimId]/evidence/route";
import { POST as REQUEST_HANDOFF } from "@/app/api/claims-workspace/claims/[claimId]/handoff/route";
import { setClaimsWorkspaceRepositoryForTesting } from "@/server/claims-workspace/repository-factory";
import { createInMemoryClaimsWorkspaceRepository } from "@/server/claims-workspace/service";
import { getDocumentLibrary, resetDocumentLibraryDemoState } from "@/server/document-library/service";

describe("claims workspace API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDocumentLibraryDemoState();
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

  it("stores multipart insurance estimate evidence through the document library boundary", async () => {
    const createResponse = await CREATE_CLAIM(new Request("http://local/api/claims-workspace/claims", {
      body: JSON.stringify({
        carrierName: "Progressive",
        claimNumber: "API-EST-1",
        customerName: "Estimate Customer",
        description: "Carrier estimate received.",
        vehicleVin: "API-VIN-EST-1"
      }),
      method: "POST"
    }));
    const created = await createResponse.json();
    const claimId = created.readModel.claim.id;
    const form = new FormData();
    form.set("category", "ESTIMATE");
    form.set("title", "Carrier estimate");
    form.set("reason", "Carrier estimate received for claim review.");
    form.set("file", new File([new Blob(["estimate bytes"], { type: "application/pdf" })], "carrier-estimate.pdf", { type: "application/pdf" }));

    const response = await ATTACH_EVIDENCE(new Request(`http://local/api/claims-workspace/claims/${claimId}/evidence`, {
      body: form,
      method: "POST"
    }), {
      params: Promise.resolve({ claimId })
    });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.evidence[0]).toMatchObject({
      category: "ESTIMATE",
      documentLibraryId: expect.stringMatching(/^doc-manual-/),
      fileName: "carrier-estimate.pdf",
      title: "Carrier estimate"
    });
    const library = await getDocumentLibrary({
      duties: { all: [], direct: [], roleDefaults: [] },
      email: "advisor@example.com",
      id: "advisor-route",
      isActive: true,
      name: "Advisor Route",
      roles: ["Service Advisor"]
    });
    expect(library.documents.some((document) => document.documentType === "INSURANCE_ESTIMATE" && document.owner.id === claimId)).toBe(true);
  });

  it("requires manager approval for blocked handoff exceptions at the API boundary", async () => {
    const createResponse = await CREATE_CLAIM(new Request("http://local/api/claims-workspace/claims", {
      body: JSON.stringify({
        carrierName: "State Farm",
        claimNumber: "API-30003",
        customerName: "Exception API Customer",
        description: "Needs emergency repair handoff.",
        vehicleVin: "API-VIN-30003"
      }),
      method: "POST"
    }));
    const created = await createResponse.json();
    const claimId = created.readModel.claim.id;

    const response = await REQUEST_HANDOFF(new Request(`http://local/api/claims-workspace/claims/${claimId}/handoff`, {
      body: JSON.stringify({ exceptionReason: "Advisor wants to bypass missing authorization." }),
      method: "POST"
    }), {
      params: Promise.resolve({ claimId })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "CLAIM_MANAGER_APPROVAL_REQUIRED"
    });
  });
});
