import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmWorkQueueRepository } from "@/server/repositories/unified-crm-work-queue-repository";
import { getUnifiedCrmWorkQueue } from "@/server/services/unified-crm-work-queue-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function repository(overrides: Partial<UnifiedCrmWorkQueueRepository> = {}): UnifiedCrmWorkQueueRepository {
  return {
    async listActiveOrganizationIds() {
      return ["org-a"];
    },
    async listTasks() {
      return [];
    },
    async listAppointments() {
      return [];
    },
    async listLeads() {
      return [];
    },
    async listCustomersWithNextAction() {
      return [];
    },
    async listConcernCases() {
      return [];
    },
    ...overrides
  };
}

const now = new Date("2026-08-14T13:00:00.000Z");

describe("Unified CRM work queue service", () => {
  it("fails closed when the work queue mode is OFF", async () => {
    await expect(getUnifiedCrmWorkQueue(manager, {
      readMode: "OFF",
      repository: repository()
    })).rejects.toMatchObject({ code: "CRM_WORK_OFF" });
  });

  it("returns owned visibility for Sales and ranks overdue work first", async () => {
    const seller = { ...manager, id: "seller-1", roles: ["Salesperson"] };
    const result = await getUnifiedCrmWorkQueue(seller, {
      now: () => now,
      readMode: "REVIEW",
      repository: repository({
        async listTasks(viewerUserId) {
          expect(viewerUserId).toBe("seller-1");
          return [{
            id: "task-1",
            title: "Call promised buyer",
            status: "IN_PROGRESS",
            priority: "HIGH",
            dueAt: new Date("2026-08-14T11:30:00.000Z"),
            workflowArea: "SALES",
            blockerReason: null,
            requiresManagerApproval: false,
            customerReference: "CUS-18",
            vehicleReference: null,
            updatedAt: new Date("2026-08-14T12:15:00.000Z"),
            customer: { displayName: "Alex Morgan", customerNumber: "CUS-18" },
            assignedUser: { id: "seller-1", name: "Sales Seller" }
          }];
        },
        async listAppointments(input) {
          expect(input.recordScope).toEqual({ kind: "OWNER", ownerUserId: "seller-1" });
          return [{
            id: "appt-1",
            appointmentNumber: "APT-1",
            title: "Delivery follow-up",
            startsAt: new Date("2026-08-14T16:00:00.000Z"),
            bookingStatus: "SCHEDULED",
            confirmationStatus: "PENDING",
            attendanceStatus: "EXPECTED",
            executionStatus: "NOT_STARTED",
            updatedAt: new Date("2026-08-14T10:00:00.000Z"),
            ownerUser: { id: "seller-1", name: "Sales Seller" },
            participants: [{
              displayNameSnapshot: "Alex Morgan",
              customer: { displayName: "Alex Morgan", customerNumber: "CUS-18" }
            }]
          }];
        },
        async listLeads() {
          return [];
        },
        async listConcernCases() {
          return [];
        }
      })
    });

    expect(result.visibility).toBe("owned");
    expect(result.state).toBe("READY");
    expect(result.items[0]).toMatchObject({
      kind: "task",
      dueState: "overdue",
      title: "Call promised buyer"
    });
    expect(result.items[1]).toMatchObject({
      kind: "appointment",
      dueState: "today"
    });
    expect(result.summary).toMatchObject({
      overdueCount: 1,
      todayCount: 1,
      appointmentCount: 1
    });
  });

  it("returns organization visibility for management and a current empty state", async () => {
    const result = await getUnifiedCrmWorkQueue(manager, {
      now: () => now,
      readMode: "REVIEW",
      repository: repository()
    });

    expect(result).toMatchObject({
      state: "EMPTY",
      visibility: "organization",
      freshness: {
        status: "CURRENT",
        observedAt: now.toISOString(),
        newestRecordUpdatedAt: null
      }
    });
  });

  it.each([
    [[], "ORGANIZATION_SCOPE_UNAVAILABLE"],
    [["org-a", "org-b"], "ORGANIZATION_SCOPE_AMBIGUOUS"]
  ])("fails closed for organization scope %j", async (organizations, code) => {
    await expect(getUnifiedCrmWorkQueue(manager, {
      readMode: "REVIEW",
      repository: repository({
        async listActiveOrganizationIds() {
          return organizations;
        }
      })
    })).rejects.toMatchObject({ code });
  });

  it("wraps unknown repository failures without exposing their text", async () => {
    await expect(getUnifiedCrmWorkQueue(manager, {
      readMode: "REVIEW",
      repository: repository({
        async listTasks() {
          throw new Error("postgres secret connection string");
        }
      })
    })).rejects.toMatchObject({
      code: "CRM_WORK_SOURCE_UNAVAILABLE",
      message: "CRM work is temporarily unavailable."
    });
  });
});
