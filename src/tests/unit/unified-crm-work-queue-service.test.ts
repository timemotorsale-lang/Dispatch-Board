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
            customer: { id: "customer-1", displayName: "Alex Morgan", customerNumber: "CUS-18" },
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
              customer: { id: "customer-1", displayName: "Alex Morgan", customerNumber: "CUS-18" }
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
      customerHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork",
      dueState: "overdue",
      title: "Call promised buyer"
    });
    expect(result.items[1]).toMatchObject({
      customerHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork",
      kind: "appointment",
      dueState: "today"
    });
    expect(result.today[0]).toMatchObject({
      id: "appt-1",
      customerHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork"
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

  it("preserves safe Work -> Customer 360 continuity for customer queue items", async () => {
    const result = await getUnifiedCrmWorkQueue(manager, {
      now: () => now,
      readMode: "REVIEW",
      repository: repository({
        async listCustomersWithNextAction() {
          return [{
            id: "customer-1",
            customerNumber: "CUS-18",
            displayName: "Alex Morgan",
            status: "ACTIVE",
            nextActionAt: new Date("2026-08-14T16:00:00.000Z"),
            updatedAt: new Date("2026-08-14T12:15:00.000Z"),
            ownerUser: { id: "manager-1", name: "CRM Manager" }
          }];
        }
      })
    });

    expect(result.items[0]).toMatchObject({
      kind: "customer",
      customerHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork",
      sourceHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork"
    });
  });

  it("does not expose customerHref when linked customer identity is absent", async () => {
    const result = await getUnifiedCrmWorkQueue(manager, {
      now: () => now,
      readMode: "REVIEW",
      repository: repository({
        async listTasks() {
          return [{
            id: "task-invalid-customer",
            title: "Do not guess a customer route",
            status: "IN_PROGRESS",
            priority: "NORMAL",
            dueAt: new Date("2026-08-14T15:00:00.000Z"),
            workflowArea: "SALES",
            blockerReason: null,
            requiresManagerApproval: false,
            customerReference: "Snapshot only",
            vehicleReference: null,
            updatedAt: new Date("2026-08-14T12:00:00.000Z"),
            customer: { id: "x".repeat(129), displayName: "Unsafe identity", customerNumber: "CUS-X" },
            assignedUser: { id: "manager-1", name: "CRM Manager" }
          }];
        },
        async listAppointments() {
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
            ownerUser: { id: "manager-1", name: "CRM Manager" },
            participants: [{ displayNameSnapshot: "Unknown customer", customer: null }]
          }];
        }
      })
    });

    expect(result.items.find((item) => item.id === "appt-1")).toMatchObject({
      kind: "appointment",
      customerHref: undefined
    });
    expect(result.today[0]).toMatchObject({
      id: "appt-1",
      customerHref: undefined
    });
    expect(result.items.find((item) => item.id === "task-invalid-customer")?.customerHref).toBeUndefined();
  });

  it("fails closed when a linked customer id is invalid or overlength", async () => {
    const result = await getUnifiedCrmWorkQueue(manager, {
      now: () => now,
      readMode: "REVIEW",
      repository: repository({
        async listAppointments() {
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
            ownerUser: { id: "manager-1", name: "CRM Manager" },
            participants: [{
              displayNameSnapshot: "Alex Morgan",
              customer: {
                id: "x".repeat(129),
                displayName: "Alex Morgan",
                customerNumber: "CUS-18"
              }
            }]
          }];
        }
      })
    });

    expect(result.items[0]).toMatchObject({
      kind: "appointment",
      customerHref: undefined
    });
    expect(result.today[0]).toMatchObject({
      id: "appt-1",
      customerHref: undefined
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
