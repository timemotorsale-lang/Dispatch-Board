import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmConversationEnvelope } from "@/server/services/unified-crm-conversation-envelope-service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM conversation envelope", () => {
  it("uses CustomerInteraction for manual envelopes while holding provider events", async () => {
    const result = await getUnifiedCrmConversationEnvelope(manager, { now: () => new Date("2026-08-28T02:30:00.000Z") });
    expect(result.contractVersion).toBe("ucrm.conversation-envelope/v1");
    expect(result.state).toBe("IMPLEMENTED_UNVERIFIED");
    expect(result.activation).toEqual({ externalProviderEventImportEnabled: false, manualOutcomeEnvelopeEnabled: true, providerSendEnabled: false, state: "IMPLEMENTED_UNVERIFIED" });
    expect(result.sourceAuthority).toEqual({ manualOutcomes: "CustomerInteraction", providerEvents: "HELD" });
    expect(result.checks.find((check) => check.category === "manualOutcomeBridge")).toMatchObject({ status: "PASS" });
    expect(result.checks.find((check) => check.category === "providerEventBoundary")).toMatchObject({ status: "HOLD" });
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmConversationEnvelope(seller)).rejects.toMatchObject({ code: "CONVERSATION_ENVELOPE_NOT_AUTHORIZED" });
  });
});
