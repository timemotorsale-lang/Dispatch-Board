import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.user }));
vi.mock("@/features/crm-next/crm-next-shell", () => ({ CrmNextFrame: () => null, CrmNextUnavailable: () => null }));
vi.mock("@/features/crm-next/forms-library-workspace", () => ({ FormsLibraryWorkspace: () => null }));
import Page from "@/app/(app)/crm-next/forms-library/page";
const actor = { id: "coordinator", name: "Demo Coordinator", email: "staff@example.test", isActive: true, roles: ["Operations Coordinator", "Office Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("CRM_NEXT", "DOGFOOD"); mocks.user.mockResolvedValue(actor); });
afterEach(() => vi.unstubAllEnvs());
describe("Forms Library page access", () => {
  it("uses the existing staff access boundary and highlights Forms Library", async () => {
    const page = await Page();
    expect(page.props.active).toBe("forms");
    expect(page.props.userName).toBe("Demo Coordinator");
    expect(page.props.children).toBeDefined();
  });
  it("shows the existing unavailable page when CRM Next is disabled", async () => {
    vi.stubEnv("CRM_NEXT", "OFF");
    const page = await Page();
    expect(page.props.active).toBeUndefined();
    expect(page.props.fallbackHref).toBeDefined();
    expect(page.props.children).toBeUndefined();
  });
  it("requires authentication before rendering any forms", async () => {
    mocks.user.mockRejectedValue(new Error("Authentication required"));
    await expect(Page()).rejects.toThrow("Authentication required");
  });
});
