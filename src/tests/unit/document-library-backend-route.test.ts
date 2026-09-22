import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { POST } from "@/app/api/document-library/actions/route";
import { GET } from "@/app/api/document-library/route";
import { POST as UPLOAD_POST } from "@/app/api/document-library/uploads/route";

describe("document library backend routes", () => {
  it("returns the document library read model", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ duties: { all: [], direct: [], roleDefaults: [] }, email: "manager@example.test", id: "manager-1", isActive: true, name: "Manager", roles: ["General Manager"] });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      contractVersion: "document-library.backend/v1",
      summary: { packets: 2 }
    });
  });

  it("requires authentication for the read model", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
      contractVersion: "document-library.error/v1"
    });
  });

  it("denies the read model without document workflow access", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ duties: { all: [], direct: [], roleDefaults: [] }, email: "tech@example.test", id: "tech-1", isActive: true, name: "Tech", roles: ["Mechanic"] });

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "DOCUMENT_LIBRARY_NOT_AUTHORIZED",
      contractVersion: "document-library.error/v1"
    });
  });

  it("returns a held provider action preview for managers", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ duties: { all: [], direct: [], roleDefaults: [] }, email: "manager@example.test", id: "manager-1", isActive: true, name: "Manager", roles: ["General Manager"] });

    const response = await POST(new Request("http://dispatch.local/api/document-library/actions", {
      body: JSON.stringify({ action: "REQUEST_ESIGNATURE", idempotencyKey: "esign-1", subjectId: "doc-customer-authorization-1" }),
      method: "POST"
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      providerAction: {
        action: "REQUEST_ESIGNATURE",
        liveProviderWriteEnabled: false,
        state: "HELD_FOR_CONFIRMATION"
      }
    });
  });

  it("executes a review action command for managers", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ duties: { all: [], direct: [], roleDefaults: [] }, email: "manager@example.test", id: "manager-1", isActive: true, name: "Manager", roles: ["General Manager"] });

    const response = await POST(new Request("http://dispatch.local/api/document-library/actions", {
      body: JSON.stringify({
        action: "REVIEW_DOCUMENT",
        decision: "ACCEPT",
        documentId: "doc-claim-intake-1",
        idempotencyKey: "route-review-accept-1",
        reason: "Manager accepted the reviewed document."
      }),
      method: "POST"
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      auditEvent: {
        action: "DOCUMENT_REVIEW_ACCEPT",
        idempotencyKey: "route-review-accept-1"
      },
      command: {
        document: {
          status: "ACCEPTED"
        }
      }
    });
  });

  it("executes a manual create document command for document-library staff", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ duties: { all: [], direct: [], roleDefaults: [] }, email: "advisor@example.test", id: "staff-1", isActive: true, name: "Advisor", roles: ["Service Advisor"] });

    const response = await POST(new Request("http://dispatch.local/api/document-library/actions", {
      body: JSON.stringify({
        action: "CREATE_DOCUMENT",
        documentType: "DAMAGE_PHOTOS",
        fileName: "damage-photos.zip",
        idempotencyKey: "route-create-damage-photos-1",
        owner: { id: "claim-10421", label: "Claim #CLM-10421", type: "CLAIM" },
        packetId: "packet-claim-10421",
        reason: "Customer portal upload.",
        sensitivity: "CONFIDENTIAL",
        source: "CUSTOMER_PORTAL",
        storage: { provider: "EXTERNAL_LINK", reference: "https://storage.example.test/damage-photos", version: 1 }
      }),
      method: "POST"
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      command: {
        action: "CREATE_DOCUMENT",
        document: {
          documentType: "DAMAGE_PHOTOS",
          status: "RECEIVED"
        }
      },
      liveProviderWriteEnabled: false
    });
  });

  it("stages governed upload metadata for document-library staff", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ duties: { all: [], direct: [], roleDefaults: [] }, email: "advisor@example.test", id: "staff-1", isActive: true, name: "Advisor", roles: ["Service Advisor"] });

    const response = await UPLOAD_POST(new Request("http://dispatch.local/api/document-library/uploads", {
      body: JSON.stringify({
        checksumSha256: "upload-checksum-1",
        contentType: "application/pdf",
        fileName: "authorization.pdf",
        sizeBytes: 1024
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      storageDraft: {
        provider: "INTERNAL",
        reference: "internal://documents/staged/upload-checksum-1/authorization.pdf"
      },
      validation: {
        accepted: true
      }
    });
  });

  it("denies provider actions without manager authority", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ duties: { all: [], direct: [], roleDefaults: [] }, email: "advisor@example.test", id: "staff-1", isActive: true, name: "Advisor", roles: ["Service Advisor"] });

    const response = await POST(new Request("http://dispatch.local/api/document-library/actions", {
      body: JSON.stringify({ action: "EXPORT_PACKET", idempotencyKey: "export-1", subjectId: "packet-claim-10421" }),
      method: "POST"
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "DOCUMENT_LIBRARY_NOT_AUTHORIZED",
      contractVersion: "document-library.error/v1"
    });
  });
});
