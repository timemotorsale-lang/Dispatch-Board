import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmAdminReadinessHub } from "@/server/services/unified-crm-admin-readiness-hub-service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM admin readiness hub", () => {
  it("summarizes available, held, and planned CRM gates for management", async () => {
    const result = await getUnifiedCrmAdminReadinessHub(manager, { now: () => new Date("2026-08-28T01:00:00.000Z") });
    const allTiles = result.groups.flatMap((group) => group.tiles);

    expect(result.contractVersion).toBe("ucrm.admin-readiness-hub/v1");
    expect(result.state).toBe("AVAILABLE");
    expect(result.generatedAt).toBe("2026-08-28T01:00:00.000Z");
    expect(allTiles.find((tile) => tile.milestoneId === "UCRM-080")).toMatchObject({ status: "AVAILABLE" });
    expect(allTiles.find((tile) => tile.milestoneId === "UCRM-106")).toMatchObject({ status: "HELD" });
    expect(allTiles.find((tile) => tile.milestoneId === "UCRM-121")).toMatchObject({ status: "PLANNED" });
    expect(result.rollback.posture).toBe("read-only");
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmAdminReadinessHub(seller)).rejects.toMatchObject({ code: "ADMIN_READINESS_HUB_NOT_AUTHORIZED" });
  });
});
