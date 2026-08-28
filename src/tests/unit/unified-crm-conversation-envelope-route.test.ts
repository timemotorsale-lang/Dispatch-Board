import { describe, expect, it, vi } from "vitest";

const actor = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const mocks = vi.hoisted(() => ({ getUnifiedCrmConversationEnvelope: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-conversation-envelope-service", () => mocks);

import { GET } from "@/app/api/crm/v1/communications/conversation-envelope/route";

describe("Unified CRM conversation envelope route", () => {
  it("returns the envelope model", async () => {
    mocks.getUnifiedCrmConversationEnvelope.mockResolvedValueOnce({ contractVersion: "ucrm.conversation-envelope/v1", state: "IMPLEMENTED_UNVERIFIED" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.conversation-envelope/v1", state: "IMPLEMENTED_UNVERIFIED" });
    expect(mocks.getUnifiedCrmConversationEnvelope).toHaveBeenCalledWith(actor);
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmConversationEnvelope.mockRejectedValueOnce(Object.assign(new Error("CRM conversation envelope readiness is available to the manager workspace."), { code: "CONVERSATION_ENVELOPE_NOT_AUTHORIZED" }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "CONVERSATION_ENVELOPE_NOT_AUTHORIZED", contractVersion: "ucrm.conversation-envelope-error/v1" });
  });
});
