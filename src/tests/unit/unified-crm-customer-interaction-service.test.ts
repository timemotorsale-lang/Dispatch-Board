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

function repository(result = { customerId: "customer-1", duplicate: false, followUpCompleted: false, interactionId: "interaction-1", occurredAt: new Date("2026-08-14T15:00:00.000Z"), nextActionAt: new Date("2026-08-15T15:00:00.000Z"), version: 1 }) {
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
        organizationId: "org-a",
        reportWorthy: false
      }
    });
    expect(result).toMatchObject({
      contractVersion: "ucrm.customer-interaction/v1",
      customerId: "customer-1",
      duplicate: false,
      interactionId: "interaction-1"
    });
  });

  it("records internal notes and manual communication context without requiring outbound consent", async () => {
    const source = repository({
      customerId: "customer-1",
      duplicate: false,
      followUpCompleted: true,
      interactionId: "interaction-note",
      occurredAt: new Date("2026-08-14T16:00:00.000Z"),
      nextActionAt: null,
      version: 2
    });
    const result = await logUnifiedCrmCustomerInteraction(manager, "customer-1", {
      channel: "internal_note",
      completeCurrentFollowUp: true,
      consentState: "not_required",
      direction: "internal",
      idempotencyKey: "interaction-note",
      occurredAt: "2026-08-14T16:00:00.000Z",
      relatedRepairOrderId: "RO-1001",
      relatedStaffMemberId: "staff-1",
      reportWorthy: true,
      summary: "Customer called back and the promised follow-up is complete."
    }, {
      readMode: "REVIEW",
      repository: source.repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(source.received[0]).toMatchObject({
      command: {
        channel: "INTERNAL_NOTE",
        completeCurrentFollowUp: true,
        direction: "INTERNAL",
        relatedRepairOrderId: "RO-1001",
        relatedStaffMemberId: "staff-1",
        reportWorthy: true
      }
    });
    expect(result).toMatchObject({
      followUpCompleted: true,
      interactionId: "interaction-note",
      nextActionAt: null
    });
  });

  it("requires staff to either complete the current follow-up or schedule a new one", async () => {
    const source = repository();
    const listActiveOrganizationIds = vi.fn();
    await expect(logUnifiedCrmCustomerInteraction(manager, "customer-1", {
      channel: "phone",
      completeCurrentFollowUp: true,
      consentState: "confirmed",
      direction: "outbound",
      idempotencyKey: "interaction-conflicting-follow-up",
      nextActionAt: "2026-08-15T15:00:00.000Z",
      occurredAt: "2026-08-14T15:00:00.000Z",
      summary: "Reached customer."
    }, {
      readMode: "REVIEW",
      repository: source.repo,
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "INVALID_INTERACTION_COMMAND" });

    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
    expect(source.received).toEqual([]);
  });

  it("rejects outbound contact when consent is not confirmed", async () => {
    const source = repository();
    const listActiveOrganizationIds = vi.fn();
    await expect(logUnifiedCrmCustomerInteraction(manager, "customer-1", {
      channel: "email",
      consentState: "unknown",
      direction: "outbound",
      idempotencyKey: "interaction-1",
      occurredAt: "2026-08-14T15:00:00.000Z",
      summary: "Sent a follow-up."
    }, {
      readMode: "REVIEW",
      repository: source.repo,
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "OUTBOUND_CONSENT_REQUIRED" });
    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
    expect(source.received).toEqual([]);
  });

  it("fails closed when multiple organization scopes are active", async () => {
    const source = repository();
    await expect(logUnifiedCrmCustomerInteraction(manager, "customer-1", {
      channel: "phone",
      consentState: "confirmed",
      direction: "outbound",
      idempotencyKey: "interaction-1",
      occurredAt: "2026-08-14T15:00:00.000Z",
      summary: "Confirmed the delivery time."
    }, {
      readMode: "REVIEW",
      repository: source.repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a", "org-b"]; } }
    })).rejects.toMatchObject({ code: "CUSTOMER_SOURCE_UNAVAILABLE" });
    expect(source.received).toEqual([]);
  });

  it("rejects an invalid customer identifier before scope or persistence work begins", async () => {
    const source = repository();
    const listActiveOrganizationIds = vi.fn();

    await expect(logUnifiedCrmCustomerInteraction(manager, "   ", {
      channel: "meeting",
      consentState: "not_required",
      direction: "inbound",
      idempotencyKey: "interaction-invalid-customer",
      occurredAt: "2026-08-14T15:00:00.000Z",
      summary: "Reviewed the delivery plan."
    }, {
      readMode: "REVIEW",
      repository: source.repo,
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "INVALID_INTERACTION_COMMAND" });

    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
    expect(source.received).toEqual([]);
  });

  it("preserves an idempotent replay receipt without claiming a second write", async () => {
    const source = repository({
      customerId: "customer-1",
      duplicate: true,
      followUpCompleted: false,
      interactionId: "interaction-1",
      occurredAt: new Date("2026-08-14T15:00:00.000Z"),
      nextActionAt: null,
      version: 4
    });
    const result = await logUnifiedCrmCustomerInteraction(manager, "customer-1", {
      channel: "meeting",
      consentState: "not_required",
      direction: "inbound",
      idempotencyKey: "interaction-replay",
      occurredAt: "2026-08-14T15:00:00.000Z",
      summary: "Reviewed the delivery plan."
    }, {
      readMode: "REVIEW",
      repository: source.repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(result).toMatchObject({ duplicate: true, interactionId: "interaction-1", version: 4 });
    expect(source.received).toHaveLength(1);
  });

  it("maps unavailable customers and idempotency conflicts without backend detail", async () => {
    const unavailable = repository();
    unavailable.repo.createInteraction = async () => { throw new Error("Customer not available."); };
    const conflict = repository();
    conflict.repo.createInteraction = async () => {
      throw Object.assign(new Error("private ledger key detail"), { code: "IDEMPOTENCY_KEY_REUSED" });
    };
    const input = {
      channel: "meeting",
      consentState: "not_required",
      direction: "inbound",
      idempotencyKey: "interaction-safe-error",
      occurredAt: "2026-08-14T15:00:00.000Z",
      summary: "Reviewed the delivery plan."
    };
    const dependencies = (repo: UnifiedCrmCustomerInteractionRepository) => ({
      readMode: "REVIEW",
      repository: repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    await expect(logUnifiedCrmCustomerInteraction(manager, "customer-1", input, dependencies(unavailable.repo)))
      .rejects.toMatchObject({ code: "CUSTOMER_NOT_AVAILABLE", message: "Customer details are not available." });
    await expect(logUnifiedCrmCustomerInteraction(manager, "customer-1", input, dependencies(conflict.repo)))
      .rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", message: "Idempotency key was already used with a different customer interaction." });
  });

  it("does not call organization or persistence dependencies when access is off", async () => {
    const source = repository();
    const listActiveOrganizationIds = vi.fn();
    await expect(logUnifiedCrmCustomerInteraction(manager, "customer-1", {
      channel: "meeting",
      consentState: "not_required",
      direction: "inbound",
      idempotencyKey: "interaction-off",
      occurredAt: "2026-08-14T15:00:00.000Z",
      summary: "Reviewed the delivery plan."
    }, {
      readMode: "OFF",
      repository: source.repo,
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "CUSTOMER_360_OFF" });
    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
    expect(source.received).toEqual([]);
  });

  it("does not consult organization or persistence dependencies for an unauthenticated viewer", async () => {
    const source = repository();
    const listActiveOrganizationIds = vi.fn();

    await expect(logUnifiedCrmCustomerInteraction(null, "customer-1", {
      channel: "meeting",
      consentState: "not_required",
      direction: "inbound",
      idempotencyKey: "interaction-denied",
      occurredAt: "2026-08-14T15:00:00.000Z",
      summary: "Reviewed the delivery plan."
    }, {
      readMode: "REVIEW",
      repository: source.repo,
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });

    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
    expect(source.received).toEqual([]);
  });
});
