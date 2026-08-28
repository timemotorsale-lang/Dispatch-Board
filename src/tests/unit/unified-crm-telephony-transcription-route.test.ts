import { describe, expect, it, vi } from "vitest";

const actor = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const mocks = vi.hoisted(() => ({
  getUnifiedCrmTelephonyTranscription: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-telephony-transcription-service", () => mocks);

import { GET } from "@/app/api/crm/v1/integrations/telephony/route";

describe("Unified CRM telephony and transcription route", () => {
  it("returns the telephony readiness model", async () => {
    mocks.getUnifiedCrmTelephonyTranscription.mockResolvedValueOnce({
      contractVersion: "ucrm.telephony-transcription/v1",
      state: "HELD"
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.telephony-transcription/v1", state: "HELD" });
    expect(mocks.getUnifiedCrmTelephonyTranscription).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmTelephonyTranscription.mockRejectedValueOnce(Object.assign(new Error("CRM telephony and transcription readiness is available to the manager workspace."), {
      code: "TELEPHONY_TRANSCRIPTION_NOT_AUTHORIZED",
      contractVersion: "ucrm.telephony-transcription-error/v1",
      httpStatus: 403,
      retryable: false
    }));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "TELEPHONY_TRANSCRIPTION_NOT_AUTHORIZED",
      contractVersion: "ucrm.telephony-transcription-error/v1",
      error: "CRM telephony and transcription readiness is available to the manager workspace.",
      retryable: false
    });
  });

  it("masks unknown failures", async () => {
    mocks.getUnifiedCrmTelephonyTranscription.mockRejectedValueOnce(new Error("recording transcript token"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      contractVersion: "ucrm.telephony-transcription-error/v1",
      error: "CRM telephony and transcription readiness is temporarily unavailable.",
      retryable: false
    });
  });
});
