import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmCustomerInteractionRepository } from "@/server/repositories/unified-crm-customer-interaction-repository";
import { logUnifiedCrmCustomerInteraction } from "@/server/services/unified-crm-customer-interaction-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function repository(result = { customerId: "customer-1", duplicate: false, interactionId: "interaction-1", occurredAt: new Date("2026-08-14T15:00:00.000Z"), nextActionAt: new Date("2026-08-15T15:00:00.000Z"), version: 1 }) {
  const received: unknown[] = [];
  const repo: UnifiedCrmCustomerInteractionRepository = {
    async createInteraction(input) {
      received.push(input);
      return result;
    }
  };
  return { received, repo };
}

describe("Unified CRM customer interaction command", () => {
  it("records a manual outcome with organization scope and returns the normalized result", async () => {
    const source = repository();
    const result = await logUnifiedCrmCustomerInteraction(manager, "customer-1", {
      channel: "phone",
      consentState: "confirmed",
      direction: "outbound",
      idempotencyKey: "interaction-1",
      nextActionAt: "2026-08-15T15:00:00.000Z",
      nextStep: "Call back tomorrow",
      occurredAt: "2026-08-14T15:00:00.000Z",
      outcome: "Reached customer",
      summary: "Confirmed the delivery time."
    }, {
      readMode: "REVIEW",
      repository: source.repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(source.received[0]).toMatchObject({
      recordScope: { kind: "ORGANIZATION" },
      command: {
        channel: "PHONE",
        consentState: "CONFIRMED",
        customerId: "customer-1",
        direction: "OUTBOUND",
        organizationId: "org-a"
      }
    });
    expect(result).toMatchObject({
      contractVersion: "ucrm.customer-interaction/v1",
      customerId: "customer-1",
      duplicate: false,
      interactionId: "interaction-1"
    });
  });

  it("rejects outbound contact when consent is not confirmed", async () => {
    await expect(logUnifiedCrmCustomerInteraction(manager, "customer-1", {
      channel: "email",
      consentState: "unknown",
      direction: "outbound",
      idempotencyKey: "interaction-1",
      occurredAt: "2026-08-14T15:00:00.000Z",
      summary: "Sent a follow-up."
    }, {
      readMode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "OUTBOUND_CONSENT_REQUIRED" });
  });

  it("fails closed when multiple organization scopes are active", async () => {
    await expect(logUnifiedCrmCustomerInteraction(manager, "customer-1", {
      channel: "phone",
      consentState: "confirmed",
      direction: "outbound",
      idempotencyKey: "interaction-1",
      occurredAt: "2026-08-14T15:00:00.000Z",
      summary: "Confirmed the delivery time."
    }, {
      readMode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a", "org-b"]; } }
    })).rejects.toMatchObject({ code: "CUSTOMER_SOURCE_UNAVAILABLE" });
  });
});
