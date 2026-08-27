import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmManualCallDisposition } from "@/server/services/unified-crm-manual-call-disposition-service";
const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };
describe("Unified CRM manual call disposition", () => {
  it("enables manual outcome capture while telephony stays disabled", async () => {
    const result = await getUnifiedCrmManualCallDisposition(manager, { now: () => new Date("2026-08-28T04:00:00.000Z") });
    expect(result.contractVersion).toBe("ucrm.manual-call-disposition/v1");
    expect(result.activation).toEqual({ callRecordingEnabled: false, clickToCallEnabled: false, manualOutcomeCaptureEnabled: true, transcriptionEnabled: false, state: "IMPLEMENTED_UNVERIFIED" });
    expect(result.outcomes.some((outcome) => outcome.outcome === "CALL_BACK_REQUESTED" && outcome.nextStepRequired)).toBe(true);
  });
  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmManualCallDisposition(seller)).rejects.toMatchObject({ code: "MANUAL_CALL_DISPOSITION_NOT_AUTHORIZED" });
  });
});
