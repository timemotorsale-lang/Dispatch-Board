import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmAccountingDmsConnector } from "@/server/services/unified-crm-accounting-dms-connector-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM accounting/DMS connector readiness", () => {
  it("keeps accounting/DMS writes, backfill, and sync held", async () => {
    const result = await getUnifiedCrmAccountingDmsConnector(manager, {
      now: () => new Date("2026-08-27T19:30:00.000Z")
    });

    expect(result.contractVersion).toBe("ucrm.accounting-dms-connector/v1");
    expect(result.generatedAt).toBe("2026-08-27T19:30:00.000Z");
    expect(result.state).toBe("HELD");
    expect(result.activation).toEqual({
      backfillEnabled: false,
      incrementalSyncEnabled: false,
      outboundWriteEnabled: false,
      selectedSystemName: null,
      state: "HELD"
    });
    expect(result.checks.find((check) => check.category === "fieldOwnership")).toMatchObject({ status: "HOLD" });
    expect(result.checks.find((check) => check.category === "reconciliation")).toMatchObject({ status: "PASS" });
    expect(result.mappingPreview).toMatchObject({
      state: "READY_REVIEW",
      selectedSystemName: null,
      syncEnabled: false
    });
    expect(result.mappingPreview.rows.map((row) => row.direction)).toEqual(["READ_ONLY_PREVIEW", "READ_ONLY_PREVIEW", "READ_ONLY_PREVIEW", "HELD_WRITEBACK"]);
    expect(result.mappingPreview.rows.find((row) => row.id === "quote-approved-total")).toMatchObject({
      sourceAuthority: "QUOTES",
      conflictRisk: "HIGH"
    });
    expect(JSON.stringify(result)).not.toContain("externalCredential");
    expect(result.rollback.featureControl).toBe("crm.integrations.accountingDms.enabled");
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmAccountingDmsConnector(seller)).rejects.toMatchObject({
      code: "ACCOUNTING_DMS_CONNECTOR_NOT_AUTHORIZED"
    });
  });

  it("requires authentication before exposing accounting/DMS readiness", async () => {
    await expect(getUnifiedCrmAccountingDmsConnector(null)).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED"
    });
  });
});
