import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  documentFindFirst: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/db/client", () => ({
  prisma: {
    documentLibraryDocument: { findFirst: mocks.documentFindFirst }
  }
}));

import { POST as CREATE_CLAIM } from "@/app/api/claims-workspace/claims/route";
import { PATCH as UPDATE_CLAIM } from "@/app/api/claims-workspace/claims/[claimId]/route";
import { POST as ATTACH_EVIDENCE } from "@/app/api/claims-workspace/claims/[claimId]/evidence/route";
import { GET as OPEN_EVIDENCE_CONTENT } from "@/app/api/claims-workspace/claims/[claimId]/evidence/[evidenceId]/content/route";
import { POST as REQUEST_HANDOFF } from "@/app/api/claims-workspace/claims/[claimId]/handoff/route";
import { setClaimsWorkspaceRepositoryForTesting } from "@/server/claims-workspace/repository-factory";
import { createInMemoryClaimsWorkspaceRepository } from "@/server/claims-workspace/service";
import { getDocumentLibrary, resetDocumentLibraryDemoState } from "@/server/document-library/service";
import { buildDocumentObjectKey } from "@/server/document-library/storage-adapter";

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
    vi.unstubAllEnvs();
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
      documentLibraryId: expect.stringMatching(/^doc-claim-/),
      fileName: "carrier-estimate.pdf",
      title: "Carrier estimate"
    });
    mocks.documentFindFirst.mockResolvedValueOnce({
      contentType: null,
      fileName: "carrier-estimate.pdf",
      storageProvider: "INTERNAL",
      storageReference: `local-private://${buildDocumentObjectKey({
        documentId: payload.evidence[0].documentLibraryId,
        fileName: "carrier-estimate.pdf",
        organizationId: "default-org",
        owner: {
          id: claimId,
          label: "Claim #API-EST-1",
          type: "CLAIM"
        },
        version: 1
      })}`
    });
    const contentResponse = await OPEN_EVIDENCE_CONTENT(new Request(`http://local/api/claims-workspace/claims/${claimId}/evidence/${payload.evidence[0].id}/content`, {
      headers: { accept: "application/pdf" }
    }), {
      params: Promise.resolve({ claimId, evidenceId: payload.evidence[0].id })
    });
    expect(contentResponse.status).toBe(200);
    expect(contentResponse.headers.get("content-type")).toBe("application/pdf");
    expect(contentResponse.headers.get("content-disposition")).toContain("inline");
    await expect(contentResponse.text()).resolves.toBe("estimate bytes");
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

  it("does not attach claim evidence when original document storage is unavailable", async () => {
    vi.stubEnv("DOCUMENT_LIBRARY_DISABLE_LOCAL_FALLBACK", "true");
    vi.stubEnv("DOCUMENT_LIBRARY_LOCAL_STORAGE_ROOT", "");
    vi.stubEnv("DOCUMENT_LIBRARY_CLOUD_PROVIDER", "");
    const repository = createInMemoryClaimsWorkspaceRepository();
    setClaimsWorkspaceRepositoryForTesting(repository);

    const form = new FormData();
    form.set("category", "ESTIMATE");
    form.set("title", "Carrier estimate");
    form.set("file", new File(["estimate bytes"], "carrier-estimate.pdf", { type: "application/pdf" }));

    const response = await ATTACH_EVIDENCE(new Request("http://local/api/claims-workspace/claims/claim-demo-1/evidence", {
      body: form,
      method: "POST"
    }), {
      params: Promise.resolve({ claimId: "claim-demo-1" })
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "DOCUMENT_LIBRARY_STORAGE_UNAVAILABLE",
      retryable: true
    });
    const aggregate = await repository.findClaimById("claim-demo-1");
    expect(aggregate?.evidence).toHaveLength(4);
    expect(aggregate?.evidence.some((item) => item.fileName === "carrier-estimate.pdf")).toBe(false);
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
