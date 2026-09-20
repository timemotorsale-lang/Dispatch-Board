import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { POST } from "@/app/api/document-library/actions/route";
import { GET } from "@/app/api/document-library/route";

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

  it("returns a review action preview for managers", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ duties: { all: [], direct: [], roleDefaults: [] }, email: "manager@example.test", id: "manager-1", isActive: true, name: "Manager", roles: ["General Manager"] });

    const response = await POST(new Request("http://dispatch.local/api/document-library/actions", {
      body: JSON.stringify({ action: "REVIEW_DOCUMENT", decision: "ACCEPT", subjectId: "doc-claim-intake-1" }),
      method: "POST"
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reviewAction: {
        nextStatus: "ACCEPTED",
        state: "READY_FOR_REVIEW_AUDIT"
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
