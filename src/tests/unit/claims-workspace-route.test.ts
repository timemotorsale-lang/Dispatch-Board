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
import { PDFDocument } from "pdf-lib";
import { claimPermissionStatus } from "@/lib/claim-customer-authorization";
import { GET as GENERATE_AUTHORIZATION, POST as WITHDRAW_PERMISSION } from "@/app/api/claims-workspace/claims/[claimId]/authorization/route";

describe("claims workspace API routes", () => {
  it("generates an unsigned PDF without recording consent and validates withdrawals", async () => {
    const params = { params: Promise.resolve({ claimId: "claim-demo-1" }) };
    const generated = await GENERATE_AUTHORIZATION(new Request("http://local/authorization?download=1"), params);
    expect(generated.status).toBe(200);
    expect(generated.headers.get("Content-Disposition")).toContain("attachment");
    expect(generated.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await PDFDocument.load(await generated.arrayBuffer())).getForm().getCheckBox("direction_to_pay").isChecked()).toBe(false);
    const invalid = await WITHDRAW_PERMISSION(new Request("http://local/authorization", { method: "POST", body: "null" }), params);
    expect(invalid.status).toBe(400);
    const mixedCase = await ATTACH_EVIDENCE(new Request("http://local/evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: " claim_communication ", documentLibraryId: "fake", title: "Signed" }) }), { params: Promise.resolve({ claimId: "claim-demo-1" }) });
    expect(mixedCase.status).toBe(400);
    const withdrawn = await WITHDRAW_PERMISSION(new Request("http://local/authorization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "WITHDRAW", category: "CLAIM_DIRECT_PAY", reason: "Customer requested withdrawal in writing." }) }), params);
    expect(withdrawn.status).toBe(200); const model = await withdrawn.json();
    expect(claimPermissionStatus(model.evidence, "CLAIM_DIRECT_PAY")).toBe("Withdrawn");
    expect(claimPermissionStatus(model.evidence, "CLAIM_COMMUNICATION")).toBe("Missing");
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    expect((await GENERATE_AUTHORIZATION(new Request("http://local/authorization"), params)).status).toBe(401);
    expect((await GENERATE_AUTHORIZATION(new Request("http://local/authorization"), { params: Promise.resolve({ claimId: "missing" }) })).status).toBe(404);
  });
  it("requires a verified signed PDF for claim permissions and keeps repair approval separate", async () => {
    const pdf = await PDFDocument.create(); pdf.addPage(); const bytes = await pdf.save();
    const form = new FormData();
    form.set("file", new File([bytes as BlobPart], "signed-authorization.pdf", { type: "application/pdf" }));
    for (const [key, value] of Object.entries({ category: "CLAIM_COMMUNICATION", signer: "Review Customer", capacity: "OWNER", signedDate: "2026-10-01", communicationSelected: "true", signatureVerified: "true", copyProvided: "true", directPaySelected: "true" })) form.set(key, value);
    const response = await ATTACH_EVIDENCE(new Request("http://local/evidence", { method: "POST", body: form }), { params: Promise.resolve({ claimId: "claim-demo-1" }) });
    expect(response.status).toBe(201); const model = await response.json();
    expect(claimPermissionStatus(model.evidence, "CLAIM_COMMUNICATION")).toBe("Verified signed copy");
    expect(claimPermissionStatus(model.evidence, "CLAIM_DIRECT_PAY")).toBe("Verified signed copy");
    expect(model.checklist.find((item: { category: string }) => item.category === "AUTHORIZATION").state).not.toBe("RECEIVED");
    const invalid = await ATTACH_EVIDENCE(new Request("http://local/evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: "CLAIM_COMMUNICATION", documentLibraryId: "fake", title: "Signed" }) }), { params: Promise.resolve({ claimId: "claim-demo-1" }) });
    expect(invalid.status).toBe(400);
  });
  it("stores multiple photos as independent claim evidence and rejects disguised images", async () => {
    const formFor = (name: string, bytes: Uint8Array, category = "DAMAGE_PHOTO") => {
      const form = new FormData();
      form.set("category", category);
      form.set("file", new File([bytes as BlobPart], name, { type: "image/png" }));
      return new Request("http://local/api/claims-workspace/claims/claim-demo-1/evidence", { method: "POST", body: form });
    };
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPioAAAAASUVORK5CYII=", "base64");
    const first = await ATTACH_EVIDENCE(formFor("damage.png", png), { params: Promise.resolve({ claimId: "claim-demo-1" }) });
    expect(first.status).toBe(201);
    const second = await ATTACH_EVIDENCE(formFor("odometer.png", png, "ODOMETER_PHOTO"), { params: Promise.resolve({ claimId: "claim-demo-1" }) });
    expect(second.status).toBe(201);
    const payload = await second.json();
    expect(payload.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ fileName: "damage.png", category: "DAMAGE_PHOTO", documentLibraryId: expect.stringMatching(/^doc-claim-/) }),
      expect.objectContaining({ fileName: "odometer.png", category: "ODOMETER_PHOTO", documentLibraryId: expect.stringMatching(/^doc-claim-/) })
    ]));
    const photo = payload.evidence.find((item: { fileName: string }) => item.fileName === "damage.png");
    const odometer = payload.evidence.find((item: { fileName: string }) => item.fileName === "odometer.png");
    expect(photo.documentLibraryId).not.toBe(odometer.documentLibraryId);
    mocks.documentFindFirst.mockResolvedValueOnce({
      contentType: "image/png",
      fileName: "damage.png",
      storageProvider: "INTERNAL",
      storageReference: `local-private://${buildDocumentObjectKey({
        documentId: photo.documentLibraryId,
        fileName: "damage.png",
        organizationId: "default-org",
        owner: { id: "claim-demo-1", label: "Claim #MN-48291", type: "CLAIM" },
        version: 1
      })}`
    });
    const original = await OPEN_EVIDENCE_CONTENT(new Request("http://local/photo"), { params: Promise.resolve({ claimId: "claim-demo-1", evidenceId: photo.id }) });
    expect(original.status).toBe(200);
    expect(Buffer.from(await original.arrayBuffer())).toEqual(png);
    const retry = await ATTACH_EVIDENCE(formFor("damage.png", png), { params: Promise.resolve({ claimId: "claim-demo-1" }) });
    expect(retry.status).toBe(201);
    const retried = await retry.json();
    expect(retried.evidence.filter((item: { fileName: string }) => item.fileName === "damage.png")).toHaveLength(1);
    const invalid = await ATTACH_EVIDENCE(formFor("fake.png", new Uint8Array([1, 2, 3])), { params: Promise.resolve({ claimId: "claim-demo-1" }) });
    expect(invalid.status).toBe(400);
  });
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

  it("stores multiple documents with independent document records", async () => {
    const createResponse = await CREATE_CLAIM(new Request("http://local/api/claims-workspace/claims", {
      body: JSON.stringify({
        claimNumber: "API-MULTI-1",
        customerName: "Multiple Upload Customer",
        vehicleVin: "API-VIN-MULTI-1"
      }),
      method: "POST"
    }));
    const created = await createResponse.json();
    const claimId = created.readModel.claim.id;
    const documentIds: string[] = [];

    for (const [fileName, contents] of [["claim-file.pdf", "first document"], ["claim-file.pdf", "second document"]]) {
      const form = new FormData();
      form.set("category", "ESTIMATE");
      form.set("file", new File([contents], fileName, { type: "application/pdf" }));
      const response = await ATTACH_EVIDENCE(new Request(`http://local/api/claims-workspace/claims/${claimId}/evidence`, {
        body: form,
        method: "POST"
      }), { params: Promise.resolve({ claimId }) });
      expect(response.status).toBe(201);
      const payload = await response.json();
      documentIds.push(payload.evidence.at(-1).documentLibraryId);
    }

    expect(new Set(documentIds).size).toBe(2);
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
