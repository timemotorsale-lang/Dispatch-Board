import { describe, expect, it, vi } from "vitest";
const actor = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const mocks = vi.hoisted(() => ({ getUnifiedCrmEmailDraftSurface: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-email-draft-surface-service", () => mocks);
import { GET } from "@/app/api/crm/v1/communications/email-drafts/route";
describe("Unified CRM email draft surface route", () => {
  it("returns readiness", async () => {
    mocks.getUnifiedCrmEmailDraftSurface.mockResolvedValueOnce({ contractVersion: "ucrm.email-draft-surface/v1", state: "IMPLEMENTED_UNVERIFIED" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.email-draft-surface/v1", state: "IMPLEMENTED_UNVERIFIED" });
  });
  it("maps typed authorization errors", async () => {
    mocks.getUnifiedCrmEmailDraftSurface.mockRejectedValueOnce(Object.assign(new Error("CRM email draft readiness is available to the manager workspace."), { code: "EMAIL_DRAFT_SURFACE_NOT_AUTHORIZED" }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "EMAIL_DRAFT_SURFACE_NOT_AUTHORIZED", contractVersion: "ucrm.email-draft-surface-error/v1" });
  });
});
