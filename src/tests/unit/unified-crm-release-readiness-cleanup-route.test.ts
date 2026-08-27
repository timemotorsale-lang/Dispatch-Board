import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getUnifiedCrmReleaseReadinessCleanup: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/services/unified-crm-release-readiness-cleanup-service", () => ({
  getUnifiedCrmReleaseReadinessCleanup: mocks.getUnifiedCrmReleaseReadinessCleanup
}));

import { GET } from "@/app/api/crm/v1/release-readiness-cleanup/route";

describe("Unified CRM release-readiness cleanup route", () => {
  it("returns release-readiness cleanup from the service", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "manager-a" });
    mocks.getUnifiedCrmReleaseReadinessCleanup.mockResolvedValueOnce({ contractVersion: "ucrm.release-readiness-cleanup/v1", state: "HELD" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.release-readiness-cleanup/v1", state: "HELD" });
  });

  it("maps typed authorization denial safely", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "seller-a" });
    mocks.getUnifiedCrmReleaseReadinessCleanup.mockRejectedValueOnce(Object.assign(new Error("CRM release-readiness cleanup is available to the manager workspace."), { code: "RELEASE_READINESS_CLEANUP_NOT_AUTHORIZED" }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "RELEASE_READINESS_CLEANUP_NOT_AUTHORIZED", contractVersion: "ucrm.release-readiness-cleanup-error/v1", retryable: false });
  });
});
