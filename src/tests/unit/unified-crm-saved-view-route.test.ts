import { describe, expect, it, vi } from "vitest";

const actor = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const mocks = vi.hoisted(() => ({
  createUnifiedCrmSavedView: vi.fn(),
  deleteUnifiedCrmSavedView: vi.fn(),
  listUnifiedCrmSavedViews: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-saved-view-service", () => mocks);

import { GET, POST } from "@/app/api/crm/v1/saved-views/route";
import { DELETE } from "@/app/api/crm/v1/saved-views/[id]/route";

describe("Unified CRM saved view routes", () => {
  it("lists CRM saved views", async () => {
    mocks.listUnifiedCrmSavedViews.mockResolvedValueOnce({ contractVersion: "ucrm.saved-view/v1", savedViews: [] });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.saved-view/v1", savedViews: [] });
    expect(mocks.listUnifiedCrmSavedViews).toHaveBeenCalledWith(actor);
  });

  it("creates CRM saved views", async () => {
    const payload = { config: { tab: "pipeline" }, name: "Pipeline", visibility: "TEAM" };
    mocks.createUnifiedCrmSavedView.mockResolvedValueOnce({ id: "view-1", name: "Pipeline" });

    const response = await POST(new Request("http://crm.local/api/crm/v1/saved-views", { method: "POST", body: JSON.stringify(payload) }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ savedView: { id: "view-1", name: "Pipeline" } });
    expect(mocks.createUnifiedCrmSavedView).toHaveBeenCalledWith(actor, payload);
  });

  it("deletes CRM saved views", async () => {
    mocks.deleteUnifiedCrmSavedView.mockResolvedValueOnce(undefined);

    const response = await DELETE(new Request("http://crm.local/api/crm/v1/saved-views/view-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "view-1" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.deleteUnifiedCrmSavedView).toHaveBeenCalledWith(actor, "view-1");
  });

  it("maps typed errors without leaking internals", async () => {
    mocks.createUnifiedCrmSavedView.mockRejectedValueOnce(Object.assign(new Error("Manager access is required to share a CRM saved view."), {
      code: "SAVED_VIEW_FORBIDDEN",
      contractVersion: "ucrm.saved-view-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await POST(new Request("http://crm.local/api/crm/v1/saved-views", { method: "POST", body: JSON.stringify({}) }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      code: "SAVED_VIEW_FORBIDDEN",
      contractVersion: "ucrm.saved-view-error/v1",
      error: "Manager access is required to share a CRM saved view.",
      retryable: false
    });
  });
});
