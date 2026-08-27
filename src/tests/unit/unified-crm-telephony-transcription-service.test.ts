import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmTelephonyTranscription } from "@/server/services/unified-crm-telephony-transcription-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM telephony and transcription readiness", () => {
  it("keeps voice, recording, transcription, and AI receptionist held", async () => {
    const result = await getUnifiedCrmTelephonyTranscription(manager, {
      now: () => new Date("2026-08-27T18:30:00.000Z")
    });

    expect(result.contractVersion).toBe("ucrm.telephony-transcription/v1");
    expect(result.generatedAt).toBe("2026-08-27T18:30:00.000Z");
    expect(result.state).toBe("HELD");
    expect(result.activation).toEqual({
      aiReceptionistEnabled: false,
      callRecordingEnabled: false,
      clickToCallEnabled: false,
      inboundCallRoutingEnabled: false,
      providerName: null,
      transcriptionEnabled: false,
      state: "HELD"
    });
    expect(result.checks.find((check) => check.category === "recordingConsent")).toMatchObject({ status: "HOLD" });
    expect(result.checks.find((check) => check.category === "transcriptionProvenance")).toMatchObject({ status: "PASS" });
    expect(result.rollback.featureControl).toBe("crm.integrations.telephony.enabled");
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmTelephonyTranscription(seller)).rejects.toMatchObject({
      code: "TELEPHONY_TRANSCRIPTION_NOT_AUTHORIZED"
    });
  });

  it("requires authentication before exposing telephony readiness", async () => {
    await expect(getUnifiedCrmTelephonyTranscription(null)).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED"
    });
  });
});
