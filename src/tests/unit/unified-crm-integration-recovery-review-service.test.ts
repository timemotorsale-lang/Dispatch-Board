import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmIntegrationRecoveryReview } from "@/server/services/unified-crm-integration-recovery-review-service";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const seller: AuthenticatedUser = { ...manager, id: "seller-a", roles: ["Salesperson"] };
const now = new Date("2026-08-27T21:00:00.000Z");

describe("Unified CRM integration recovery review", () => {
  it("returns a manager-only read-only recovery queue with replay disabled", async () => {
    const model = await getUnifiedCrmIntegrationRecoveryReview(manager, { now: () => now });

    expect(model).toMatchObject({
      contractVersion: "ucrm.integration-recovery-review/v1",
      generatedAt: now.toISOString(),
      state: "READY_REVIEW",
      visibility: "management",
      summary: {
        reviewItemCount: 3,
        retryReplayEnabled: false,
        reconciliationOnly: true,
        manualReviewRequired: true
      },
      rollback: {
        fallback: "manual-integration-recovery-review",
        featureControl: "crm.admin.integrationRecovery.enabled",
        posture: "read-only-no-replay"
      }
    });
    expect(model.items.map((item) => item.externalReplayEnabled)).toEqual([false, false, false]);
    expect(model.items.map((item) => item.queue)).toEqual(["RECONCILIATION", "RETRY", "DEAD_LETTER"]);
    expect(JSON.stringify(model)).not.toContain("sendNow");
    expect(JSON.stringify(model)).not.toContain("replayToken");
  });

  it("fails closed for non-management users", async () => {
    await expect(getUnifiedCrmIntegrationRecoveryReview(seller, { now: () => now })).rejects.toMatchObject({
      code: "INTEGRATION_RECOVERY_REVIEW_NOT_AUTHORIZED",
      httpStatus: 403
    });
  });
});
