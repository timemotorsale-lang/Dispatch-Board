import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmEmailDraftSurface } from "@/server/services/unified-crm-email-draft-surface-service";
const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };
describe("Unified CRM email draft surface", () => {
  it("allows review-only drafts while send and sync remain disabled", async () => {
    const result = await getUnifiedCrmEmailDraftSurface(manager, { now: () => new Date("2026-08-28T03:00:00.000Z") });
    expect(result.contractVersion).toBe("ucrm.email-draft-surface/v1");
    expect(result.activation).toEqual({ draftReviewEnabled: true, mailboxSyncEnabled: false, providerSendEnabled: false, state: "IMPLEMENTED_UNVERIFIED" });
    expect(result.sampleDraft.warning).toBe("Draft only — not sent.");
    expect(result.checks.find((check) => check.category === "draftOnly")).toMatchObject({ status: "PASS" });
    expect(result.checks.find((check) => check.category === "providerSend")).toMatchObject({ status: "HOLD" });
  });
  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmEmailDraftSurface(seller)).rejects.toMatchObject({ code: "EMAIL_DRAFT_SURFACE_NOT_AUTHORIZED" });
  });
});
