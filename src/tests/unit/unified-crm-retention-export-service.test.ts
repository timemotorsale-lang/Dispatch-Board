import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmRetentionExport } from "@/server/services/unified-crm-retention-export-service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };
describe("Unified CRM retention/export readiness", () => {
  it("keeps disposition and broad/restricted export held under DEC-014", async () => {
    const result = await getUnifiedCrmRetentionExport(manager, { now: () => new Date("2026-08-27T22:30:00.000Z") });
    expect(result.contractVersion).toBe("ucrm.retention-export/v1");
    expect(result.policyDependency).toBe("UCRM-DEC-014");
    expect(result.activation).toEqual({ automatedDispositionEnabled: false, broadExportEnabled: false, restrictedExportEnabled: false, state: "HELD" });
    expect(result.checks.find((check) => check.category === "fieldClassification")).toMatchObject({ status: "PASS" });
    expect(result.checks.find((check) => check.category === "approvedPolicy")).toMatchObject({ status: "HOLD" });
  });
  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmRetentionExport(seller)).rejects.toMatchObject({ code: "RETENTION_EXPORT_NOT_AUTHORIZED" });
  });
});
