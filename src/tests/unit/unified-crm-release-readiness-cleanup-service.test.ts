import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmReleaseReadinessCleanup } from "@/server/services/unified-crm-release-readiness-cleanup-service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM release-readiness cleanup", () => {
  it("keeps release and merge review held while surfacing exact blockers", async () => {
    const result = await getUnifiedCrmReleaseReadinessCleanup(manager, { now: () => new Date("2026-08-28T01:00:00.000Z") });

    expect(result.contractVersion).toBe("ucrm.release-readiness-cleanup/v1");
    expect(result.generatedAt).toBe("2026-08-28T01:00:00.000Z");
    expect(result.state).toBe("HELD");
    expect(result.releaseAllowed).toBe(false);
    expect(result.mergeReviewReady).toBe(false);
    expect(result.summary).toEqual({ passCount: 2, heldCount: 5, releaseBlockingCount: 5 });
    expect(result.items.map((item) => item.area)).toEqual(expect.arrayContaining(["REGRESSION", "ACCESSIBILITY", "FALLBACK", "ROLLBACK", "BUSINESS_DECISION", "PILOT_GATE"]));
    expect(JSON.stringify(result)).not.toContain("productionEnabled");
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmReleaseReadinessCleanup(seller)).rejects.toMatchObject({ code: "RELEASE_READINESS_CLEANUP_NOT_AUTHORIZED" });
  });
});
