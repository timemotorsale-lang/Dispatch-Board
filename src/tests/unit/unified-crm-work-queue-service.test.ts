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
    async listScheduleViewableOrganizationIds() {
      return ["org-a"];
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

  it("fails closed when the dedicated work mode is OFF even if review modes are otherwise enabled", async () => {
    await expect(getUnifiedCrmWorkQueue(manager, {
      readMode: "REVIEW",
      shellMode: "REVIEW",
      workMode: "OFF",
      repository: repository()
    })).rejects.toMatchObject({ code: "CRM_WORK_OFF" });
  });

  it("returns owned visibility for Sales and ranks overdue work first", async () => {
    const seller = { ...manager, id: "seller-1", roles: ["Salesperson"] };
    const listScheduleViewableOrganizationIds = vi.fn(async () => ["org-a"]);
    const result = await getUnifiedCrmWorkQueue(seller, {
      now: () => now,
      readMode: "REVIEW",
      repository: repository({
        listScheduleViewableOrganizationIds,
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
              customer: {
                archivedAt: null,
                customerNumber: "CUS-18",
                displayName: "Alex Morgan",
                id: "customer-1",
                mergedIntoCustomerId: null,
                organizationId: "org-a",
                ownerUserId: "seller-1"
              }
            }]
          }];
        }
      })
    });

    expect(result.visibility).toBe("owned");
    expect(result.state).toBe("READY");
    expect(result.explanation).toMatchObject({
      ordering: expect.stringContaining("overdue first"),
      freshness: expect.stringContaining(now.toISOString()),
      drillThrough: expect.stringContaining("Open the governed source record first")
    });
    expect(listScheduleViewableOrganizationIds).toHaveBeenCalledWith("seller-1", now);
    expect(result.items[0]).toMatchObject({
      customerHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork",
      kind: "appointment",
      sourceHref: "/appointments?view=board&appointment=APT-1&returnTo=%2Fcrm%3Fview%3Dwork",
      dueState: "today"
    });
    expect(result.today[0]).toMatchObject({
      id: "appt-1",
      customerHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm%3Fview%3Dwork",
      sourceHref: "/appointments?view=board&appointment=APT-1&returnTo=%2Fcrm%3Fview%3Dwork"
    });
    expect(result.summary).toMatchObject({
      todayCount: 1,
      appointmentCount: 1
    });
    expect(result.coverage).toEqual({
      isPartial: false,
      cappedSources: [],
      unavailableSources: [],
      sourceLimit: 8,
      sourceStates: [
        { source: "appointments", status: "available", visibleCount: 1, capped: false, newestRecordUpdatedAt: "2026-08-14T10:00:00.000Z" },
        { source: "leads", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
        { source: "cases", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
        { source: "customers", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null }
      ]
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
      explanation: {
        ordering: expect.stringContaining("overdue first"),
        freshness: expect.stringContaining(now.toISOString()),
        drillThrough: expect.stringContaining("Customer 360")
      },
      freshness: {
        status: "CURRENT",
        observedAt: now.toISOString(),
        newestRecordUpdatedAt: null
      },
      coverage: {
        isPartial: false,
        cappedSources: [],
        unavailableSources: [],
        sourceLimit: 8,
        sourceStates: [
          { source: "appointments", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
          { source: "leads", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
          { source: "cases", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
          { source: "customers", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null }
        ]
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
      sourceHref: "/customers/customer-1?returnTo=%2Fcrm%3Fview%3Dwork",
      sourceLabel: "Customers",
      primaryActionLabel: "Open customer in Customers",
      history: ["Status: Active", "Owner: CRM Manager", "Source: Customers"]
    });
  });

  it("reconciles tie ordering deterministically across due time, source class, recency, and record id", async () => {
    const result = await getUnifiedCrmWorkQueue(manager, {
      now: () => now,
      readMode: "REVIEW",
      repository: repository({
        async listLeads() {
          return [{
            id: "lead-1",
            leadNumber: "LD-1",
            stage: "OPEN",
            nextActionCode: "CALL",
            nextActionAt: new Date("2026-08-15T11:00:00.000Z"),
            updatedAt: new Date("2026-08-15T12:00:00.000Z"),
            ownerUser: { id: "manager-1", name: "CRM Manager" },
            customer: {
              archivedAt: null,
              customerNumber: "CUS-2",
              displayName: "Bravo",
              id: "customer-2",
              mergedIntoCustomerId: null,
              organizationId: "org-a",
              ownerUserId: "manager-1"
            }
          }];
        },
        async listConcernCases() {
          return [{
            id: "case-1",
            concernNumber: "CASE-1",
            title: "Hidden case title",
            priority: "HIGH",
            status: "OPEN",
            managerVisible: true,
            dueAt: new Date("2026-08-15T11:00:00.000Z"),
            resolutionDueAt: null,
            slaStage: "HEALTHY",
            updatedAt: new Date("2026-08-15T12:00:00.000Z"),
            assignedOwner: { id: "manager-1", name: "CRM Manager" },
            customer: {
              archivedAt: null,
              customerNumber: "CUS-1",
              displayName: "Alpha",
              id: "customer-1",
              mergedIntoCustomerId: null,
              organizationId: "org-a",
              ownerUserId: "manager-1"
            }
          }];
        },
        async listAppointments() {
          return [{
            id: "appt-1",
            appointmentNumber: "APT-1",
            title: "Appointment after leads and cases",
            startsAt: new Date("2026-08-15T11:00:00.000Z"),
            bookingStatus: "SCHEDULED",
            confirmationStatus: "PENDING",
            attendanceStatus: "EXPECTED",
            executionStatus: "NOT_STARTED",
            updatedAt: new Date("2026-08-15T12:30:00.000Z"),
            ownerUser: { id: "manager-1", name: "CRM Manager" },
            participants: [{
              displayNameSnapshot: "Charlie",
              customer: {
                archivedAt: null,
                customerNumber: "CUS-3",
                displayName: "Charlie",
                id: "customer-3",
                mergedIntoCustomerId: null,
                organizationId: "org-a",
                ownerUserId: "manager-1"
              }
            }]
          }];
        }
      })
    });

    expect(result.items.map((item) => item.id)).toEqual(["case-1", "lead-1", "appt-1"]);
  });

  it("does not expose customerHref when linked customer identity is absent", async () => {
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
                archivedAt: null,
                customerNumber: "CUS-18",
                displayName: "Alex Morgan",
                id: "x".repeat(129),
                mergedIntoCustomerId: null,
                organizationId: "org-a",
                ownerUserId: "manager-1"
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

  it("fails closed for nested customer routes when the linked appointment customer falls outside the visible organization", async () => {
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
                archivedAt: null,
                customerNumber: "CUS-18",
                displayName: "Alex Morgan",
                id: "customer-1",
                mergedIntoCustomerId: null,
                organizationId: "org-b",
                ownerUserId: "manager-1"
              }
            }]
          }];
        }
      })
    });

    expect(result.items[0]).toMatchObject({
      kind: "appointment",
      customerLabel: "Alex Morgan",
      customerHref: undefined
    });
    expect(result.today[0]).toMatchObject({
      id: "appt-1",
      customerLabel: "Alex Morgan",
      customerHref: undefined
    });
  });

  it("omits appointments when the viewer lacks active schedule access for the organization", async () => {
    const listAppointments = vi.fn(async () => [{
      id: "appt-1",
      appointmentNumber: "APT-1",
      title: "Should not render",
      startsAt: new Date("2026-08-14T16:00:00.000Z"),
      bookingStatus: "SCHEDULED",
      confirmationStatus: "PENDING",
      attendanceStatus: "EXPECTED",
      executionStatus: "NOT_STARTED",
      updatedAt: new Date("2026-08-14T10:00:00.000Z"),
      ownerUser: { id: "manager-1", name: "CRM Manager" },
      participants: []
    }]);

    const result = await getUnifiedCrmWorkQueue(manager, {
      now: () => now,
      readMode: "REVIEW",
      repository: repository({
        async listScheduleViewableOrganizationIds() {
          return [];
        },
        listAppointments,
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

    expect(listAppointments).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      kind: "customer",
      customerLabel: "Alex Morgan · CUS-18"
    });
    expect(result.summary).toMatchObject({
      appointmentCount: 0,
      todayCount: 1
    });
    expect(result.today).toEqual([]);
  });

  it("uses America/Chicago day boundaries for today classification and Today rail membership", async () => {
    const result = await getUnifiedCrmWorkQueue(manager, {
      now: () => new Date("2026-08-15T04:30:00.000Z"),
      readMode: "REVIEW",
      repository: repository({
        async listAppointments() {
          return [
            {
              id: "appt-today",
              appointmentNumber: "APT-TODAY",
              title: "Late night local Friday appointment",
              startsAt: new Date("2026-08-15T03:45:00.000Z"),
              bookingStatus: "SCHEDULED",
              confirmationStatus: "CONFIRMED",
              attendanceStatus: "EXPECTED",
              executionStatus: "NOT_STARTED",
              updatedAt: new Date("2026-08-15T01:00:00.000Z"),
              ownerUser: { id: "manager-1", name: "CRM Manager" },
              participants: []
            },
            {
              id: "appt-upcoming",
              appointmentNumber: "APT-UPCOMING",
              title: "Early morning local Saturday appointment",
              startsAt: new Date("2026-08-15T05:30:00.000Z"),
              bookingStatus: "SCHEDULED",
              confirmationStatus: "CONFIRMED",
              attendanceStatus: "EXPECTED",
              executionStatus: "NOT_STARTED",
              updatedAt: new Date("2026-08-15T01:30:00.000Z"),
              ownerUser: { id: "manager-1", name: "CRM Manager" },
              participants: []
            }
          ];
        }
      })
    });

    expect(result.items.find((item) => item.id === "appt-today")).toMatchObject({
      dueState: "overdue"
    });
    expect(result.items.find((item) => item.id === "appt-upcoming")).toMatchObject({
      dueState: "upcoming"
    });
    expect(result.today.map((item) => item.id)).toEqual(["appt-today"]);
    expect(result.explanation.drillThrough).toContain("America/Chicago");
  });

  it("marks the queue as partial when a live source reaches the per-source cap", async () => {
    const result = await getUnifiedCrmWorkQueue(manager, {
      now: () => now,
      readMode: "REVIEW",
      repository: repository({
        async listAppointments() {
          return Array.from({ length: 8 }, (_, index) => ({
            id: `appt-${index + 1}`,
            appointmentNumber: `APT-${index + 1}`,
            title: `Appointment ${index + 1}`,
            startsAt: new Date(`2026-08-14T${String(index + 10).padStart(2, "0")}:00:00.000Z`),
            bookingStatus: "SCHEDULED",
            confirmationStatus: "CONFIRMED",
            attendanceStatus: "EXPECTED",
            executionStatus: "NOT_STARTED",
            updatedAt: new Date(`2026-08-14T${String(index + 10).padStart(2, "0")}:30:00.000Z`),
            ownerUser: { id: "manager-1", name: "CRM Manager" },
            participants: []
          }));
        }
      })
    });

    expect(result.summary.totalCount).toBe(8);
    expect(result.coverage).toEqual({
      isPartial: true,
      cappedSources: ["appointments"],
      unavailableSources: [],
      sourceLimit: 8,
      sourceStates: [
        { source: "appointments", status: "available", visibleCount: 8, capped: true, newestRecordUpdatedAt: "2026-08-14T17:30:00.000Z" },
        { source: "leads", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
        { source: "cases", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
        { source: "customers", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null }
      ]
    });
  });

  it("omits lead rows when the sales source workspace is not permitted even if customer scope is allowed", async () => {
    const listLeads = vi.fn(async () => [{
      id: "lead-1",
      leadNumber: "LD-1",
      stage: "OPEN",
      nextActionCode: "CALL",
      nextActionAt: new Date("2026-08-15T11:00:00.000Z"),
      updatedAt: new Date("2026-08-15T12:00:00.000Z"),
      ownerUser: { id: "manager-1", name: "CRM Manager" },
      customer: {
        archivedAt: null,
        customerNumber: "CUS-2",
        displayName: "Bravo",
        id: "customer-2",
        mergedIntoCustomerId: null,
        organizationId: "org-a",
        ownerUserId: "manager-1"
      }
    }]);
    const result = await getUnifiedCrmWorkQueue(manager, {
      now: () => now,
      readMode: "REVIEW",
      canOpenSourceRoute(_actor, route) {
        return route !== "/sales";
      },
      repository: repository({
        listLeads,
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

    expect(result.items.map((item) => item.kind)).toEqual(["customer"]);
    expect(result.items[0]).toMatchObject({
      customerLabel: "Alex Morgan · CUS-18",
      kind: "customer"
    });
    expect(listLeads).not.toHaveBeenCalled();
    expect(result.explanation.drillThrough).toContain("Appointment, lead, and case rows appear only when that source workspace authority is currently provable.");
    expect(result.coverage.isPartial).toBe(true);
    expect(result.coverage.unavailableSources).toEqual(["leads"]);
    expect(result.coverage.sourceStates).toEqual([
      { source: "appointments", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
      { source: "leads", status: "unavailable", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
      { source: "cases", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
      { source: "customers", status: "available", visibleCount: 1, capped: false, newestRecordUpdatedAt: "2026-08-14T12:15:00.000Z" }
    ]);
  });

  it("omits case rows when the customer resolutions workspace is not permitted even if customer scope is allowed", async () => {
    const listConcernCases = vi.fn(async () => [{
      id: "case-1",
      concernNumber: "CASE-1",
      title: "Missing title packet",
      managerVisible: true,
      priority: "HIGH",
      status: "OPEN",
      dueAt: new Date("2026-08-15T11:00:00.000Z"),
      resolutionDueAt: null,
      slaStage: "AT_RISK",
      updatedAt: new Date("2026-08-15T12:00:00.000Z"),
      assignedOwner: { id: "manager-1", name: "CRM Manager" },
      customer: {
        archivedAt: null,
        customerNumber: "CUS-1",
        displayName: "Alpha",
        id: "customer-1",
        mergedIntoCustomerId: null,
        organizationId: "org-a",
        ownerUserId: "manager-1"
      }
    }]);
    const result = await getUnifiedCrmWorkQueue(manager, {
      now: () => now,
      readMode: "REVIEW",
      canOpenSourceRoute(_actor, route) {
        return route !== "/customers/resolutions";
      },
      repository: repository({
        listConcernCases,
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

    expect(result.items.map((item) => item.kind)).toEqual(["customer"]);
    expect(result.items[0]).toMatchObject({
      customerLabel: "Alex Morgan · CUS-18",
      kind: "customer"
    });
    expect(listConcernCases).not.toHaveBeenCalled();
    expect(result.items.some((item) => item.kind === "case")).toBe(false);
    expect(result.coverage.isPartial).toBe(true);
    expect(result.coverage.unavailableSources).toEqual(["cases"]);
    expect(result.coverage.sourceStates).toEqual([
      { source: "appointments", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
      { source: "leads", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
      { source: "cases", status: "unavailable", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
      { source: "customers", status: "available", visibleCount: 1, capped: false, newestRecordUpdatedAt: "2026-08-14T12:15:00.000Z" }
    ]);
  });

  it("omits appointments when the appointments workspace is not permitted even if schedule scope exists", async () => {
    const listAppointments = vi.fn(async () => [{
      id: "appt-1",
      appointmentNumber: "APT-1",
      title: "Should not render",
      startsAt: new Date("2026-08-14T16:00:00.000Z"),
      bookingStatus: "SCHEDULED",
      confirmationStatus: "PENDING",
      attendanceStatus: "EXPECTED",
      executionStatus: "NOT_STARTED",
      updatedAt: new Date("2026-08-14T10:00:00.000Z"),
      ownerUser: { id: "manager-1", name: "CRM Manager" },
      participants: []
    }]);

    const result = await getUnifiedCrmWorkQueue(manager, {
      now: () => now,
      readMode: "REVIEW",
      canOpenSourceRoute(_actor, route) {
        return route !== "/appointments";
      },
      repository: repository({
        listAppointments,
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

    expect(listAppointments).not.toHaveBeenCalled();
    expect(result.items.map((item) => item.kind)).toEqual(["customer"]);
    expect(result.today).toEqual([]);
    expect(result.coverage.unavailableSources).toEqual(["appointments"]);
    expect(result.coverage.sourceStates).toEqual([
      { source: "appointments", status: "unavailable", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
      { source: "leads", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
      { source: "cases", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
      { source: "customers", status: "available", visibleCount: 1, capped: false, newestRecordUpdatedAt: "2026-08-14T12:15:00.000Z" }
    ]);
  });

  it("omits non-manager-visible cases from organization-wide CRM work review", async () => {
    const result = await getUnifiedCrmWorkQueue(manager, {
      now: () => now,
      readMode: "REVIEW",
      repository: repository({
        async listConcernCases() {
          return [
            {
              id: "case-hidden",
              concernNumber: "CASE-HIDDEN",
              title: "Hidden case",
              managerVisible: false,
              priority: "HIGH",
              status: "OPEN",
              dueAt: new Date("2026-08-15T11:00:00.000Z"),
              resolutionDueAt: null,
              slaStage: "HEALTHY",
              updatedAt: new Date("2026-08-15T12:00:00.000Z"),
              assignedOwner: { id: "manager-1", name: "CRM Manager" },
              customer: {
                archivedAt: null,
                customerNumber: "CUS-1",
                displayName: "Alpha",
                id: "customer-1",
                mergedIntoCustomerId: null,
                organizationId: "org-a",
                ownerUserId: "manager-1"
              }
            },
            {
              id: "case-visible",
              concernNumber: "CASE-VISIBLE",
              title: "Visible case",
              managerVisible: true,
              priority: "MEDIUM",
              status: "OPEN",
              dueAt: new Date("2026-08-15T10:00:00.000Z"),
              resolutionDueAt: null,
              slaStage: "HEALTHY",
              updatedAt: new Date("2026-08-15T12:30:00.000Z"),
              assignedOwner: { id: "manager-1", name: "CRM Manager" },
              customer: {
                archivedAt: null,
                customerNumber: "CUS-2",
                displayName: "Bravo",
                id: "customer-2",
                mergedIntoCustomerId: null,
                organizationId: "org-a",
                ownerUserId: "manager-1"
              }
            }
          ];
        }
      })
    });

    expect(result.items.map((item) => item.id)).toEqual(["case-visible"]);
    expect(result.items[0]).toMatchObject({
      kind: "case",
      title: "Case CASE-VISIBLE"
    });
    expect(result.summary.totalCount).toBe(1);
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

  it("marks appointments unavailable instead of failing the full queue when the appointment source read fails", async () => {
    const result = await getUnifiedCrmWorkQueue(manager, {
      readMode: "REVIEW",
      workMode: "REVIEW",
      repository: repository({
        async listAppointments() {
          throw new Error("postgres secret connection string");
        },
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

    expect(result.items.map((item) => item.kind)).toEqual(["customer"]);
    expect(result.coverage.isPartial).toBe(true);
    expect(result.coverage.unavailableSources).toEqual(["appointments"]);
    expect(result.coverage.sourceStates).toEqual([
      { source: "appointments", status: "unavailable", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
      { source: "leads", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
      { source: "cases", status: "available", visibleCount: 0, capped: false, newestRecordUpdatedAt: null },
      { source: "customers", status: "available", visibleCount: 1, capped: false, newestRecordUpdatedAt: "2026-08-14T12:15:00.000Z" }
    ]);
    expect(result.explanation.freshness).toContain("Appointments is unavailable in this workspace.");
  });

  it("wraps unknown required-source failures without exposing their text", async () => {
    await expect(getUnifiedCrmWorkQueue(manager, {
      readMode: "REVIEW",
      workMode: "REVIEW",
      repository: repository({
        async listCustomersWithNextAction() {
          throw new Error("postgres secret connection string");
        }
      })
    })).rejects.toMatchObject({
      code: "CRM_WORK_SOURCE_UNAVAILABLE",
      message: "CRM work is temporarily unavailable."
    });
  });
});
