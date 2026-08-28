import { describe, expect, it, vi } from "vitest";
const actor = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const mocks = vi.hoisted(() => ({ getUnifiedCrmRetentionExport: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-retention-export-service", () => mocks);
import { GET } from "@/app/api/crm/v1/enterprise/retention-export/route";
describe("Unified CRM retention/export route", () => {
  it("returns readiness", async () => {
    mocks.getUnifiedCrmRetentionExport.mockResolvedValueOnce({ contractVersion: "ucrm.retention-export/v1", state: "HELD" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.retention-export/v1", state: "HELD" });
  });
  it("maps typed authorization errors", async () => {
    mocks.getUnifiedCrmRetentionExport.mockRejectedValueOnce(Object.assign(new Error("CRM retention and export readiness is available to the manager workspace."), { code: "RETENTION_EXPORT_NOT_AUTHORIZED" }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "RETENTION_EXPORT_NOT_AUTHORIZED", contractVersion: "ucrm.retention-export-error/v1" });
  });
});
