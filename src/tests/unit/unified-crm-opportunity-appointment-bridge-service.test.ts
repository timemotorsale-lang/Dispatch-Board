import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({
  prisma: {
    appointment: {
      findUnique: vi.fn().mockResolvedValue({
        appointmentNumber: "APT-1001",
        endsAt: null,
        id: "appointment-1",
        startsAt: null,
        title: "Appointment with Accord shopper",
        version: 1
      })
    }
  }
}));

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmOpportunityAppointmentBridgeRepository } from "@/server/repositories/unified-crm-opportunity-appointment-bridge-repository";
import { createUnifiedCrmOpportunityAppointmentBridge } from "@/server/services/unified-crm-opportunity-appointment-bridge-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function repository(result = {
  appointment: {
    appointmentNumber: "APT-1001",
    endsAt: null,
    id: "appointment-1",
    startsAt: null,
    title: "Appointment with Accord shopper",
    version: 1
  },
  duplicate: false,
  opportunityId: "opp_123456"
}) {
  const received: unknown[] = [];
  const repo: UnifiedCrmOpportunityAppointmentBridgeRepository = {
    async commitAppointmentBridge(input) {
      received.push(input);
      return result;
    }
  };
  return { received, repo };
}

const valid = {
  appointmentNumber: "APT-1001",
  expectedVersion: 3,
  idempotencyKey: "crm-opportunity-appointment-1",
  locationId: "location-1",
  schedulingTimezone: "America/Chicago",
  title: "Appointment with Accord shopper"
};

describe("Unified CRM opportunity appointment bridge service", () => {
  it("creates a governed draft appointment bridge with opportunity version and scope", async () => {
    const source = repository();
    const appointmentDraftExecutor = vi.fn().mockResolvedValue({
      accepted: true,
      command: { appointmentId: "appointment-1" },
      duplicate: false,
      execution: {
        appointment: {
          id: "appointment-1"
        }
      }
    });

    const result = await createUnifiedCrmOpportunityAppointmentBridge(manager, "opp_123456", valid, {
      appointmentDraftExecutor,
      mode: "REVIEW",
      now: () => new Date("2026-08-15T10:00:00.000Z"),
      repository: source.repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(appointmentDraftExecutor).toHaveBeenCalledWith(manager, expect.objectContaining({
      commandType: "CREATE_DRAFT",
      locationId: "location-1",
      organizationId: "org-a",
      payload: expect.objectContaining({
        appointmentNumber: "APT-1001",
        sourceReference: "opp_123456",
        title: "Appointment with Accord shopper"
      })
    }), expect.objectContaining({ now: new Date("2026-08-15T10:00:00.000Z") }));
    expect(source.received[0]).toMatchObject({
      recordScope: { kind: "ORGANIZATION" },
      command: {
        expectedVersion: 3,
        opportunityId: "opp_123456",
        organizationId: "org-a"
      }
    });
    expect(result).toMatchObject({
      appointment: {
        appointmentNumber: "APT-1001",
        href: "/appointments?appointment=APT-1001",
        id: "appointment-1",
        version: 1
      },
      contractVersion: "ucrm.opportunity-appointment-bridge/v1",
      duplicate: false,
      opportunityId: "opp_123456"
    });
  });

  it("fails closed for held mode, invalid windows, stale versions, and owner command rejection", async () => {
    await expect(createUnifiedCrmOpportunityAppointmentBridge(manager, "opp_123456", valid, {
      mode: "OFF",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "APPOINTMENT_BRIDGE_OFF" });

    await expect(createUnifiedCrmOpportunityAppointmentBridge(manager, "opp_123456", {
      ...valid,
      endsAt: "2026-08-15T11:00:00.000Z",
      startsAt: "2026-08-15T12:00:00.000Z"
    }, {
      mode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "INVALID_APPOINTMENT_BRIDGE_COMMAND" });

    await expect(createUnifiedCrmOpportunityAppointmentBridge(manager, "opp_123456", valid, {
      appointmentDraftExecutor: vi.fn().mockResolvedValue({
        accepted: true,
        command: { appointmentId: "appointment-1" },
        duplicate: false,
        execution: { appointment: { id: "appointment-1" } }
      }),
      mode: "REVIEW",
      repository: {
        async commitAppointmentBridge() {
          throw new Error("Opportunity version conflict.");
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_VERSION_CONFLICT" });

    await expect(createUnifiedCrmOpportunityAppointmentBridge(manager, "opp_123456", valid, {
      appointmentDraftExecutor: vi.fn().mockResolvedValue({
        accepted: false,
        command: { appointmentId: null },
        duplicate: false,
        execution: null
      }),
      mode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "APPOINTMENT_SOURCE_UNAVAILABLE" });
  });
});
