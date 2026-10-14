import { describe, expect, it, vi } from "vitest";
const actor = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const mocks = vi.hoisted(() => ({ getUnifiedCrmGovernedAiAssistance: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-governed-ai-assistance-service", () => mocks);
import { GET } from "@/app/api/crm/v1/enterprise/ai-assistance/route";
describe("Unified CRM governed AI assistance route", () => {
  it("returns readiness", async () => {
    mocks.getUnifiedCrmGovernedAiAssistance.mockResolvedValueOnce({ contractVersion: "ucrm.governed-ai-assistance/v1", state: "HELD" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.governed-ai-assistance/v1", state: "HELD" });
  });
  it("maps typed authorization errors", async () => {
    mocks.getUnifiedCrmGovernedAiAssistance.mockRejectedValueOnce(Object.assign(new Error("CRM AI assistance readiness is available to the manager workspace."), { code: "GOVERNED_AI_ASSISTANCE_NOT_AUTHORIZED" }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "GOVERNED_AI_ASSISTANCE_NOT_AUTHORIZED", contractVersion: "ucrm.governed-ai-assistance-error/v1" });
  });
});
