import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import type {
  UnifiedCrmCustomer360Record,
  UnifiedCrmCustomer360Repository
} from "@/server/repositories/unified-crm-customer-360-repository";
import type { UnifiedCrmCustomerTimelineRepository } from "@/server/repositories/unified-crm-customer-timeline-repository";
import { getUnifiedCrmCustomer360 } from "@/server/services/unified-crm-customer-360-service";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const now = new Date("2026-08-14T15:00:00.000Z");

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: "customer-a",
    customerNumber: "CUS-A",
    displayName: "Maria Santos",
    phoneNumber: "+16125550000",
    email: "legacy@example.test",
    status: "ACTIVE",
    ownerUserId: manager.id,
    preferredContactMethod: "PHONE",
    preferredContactTime: "EVENING",
    languageCode: "en",
    lastInteractionAt: new Date("2026-08-13T12:00:00.000Z"),
    nextActionAt: new Date("2026-08-15T12:00:00.000Z"),
    sourceCode: "CUSTOMERS",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-14T12:00:00.000Z"),
    ownerUser: { id: manager.id, name: manager.name },
    contactPoints: [
      { id: "phone", type: "PHONE", value: "+16125551234", isPrimary: true, updatedAt: now },
      { id: "email", type: "EMAIL", value: "maria@example.com", isPrimary: true, updatedAt: now },
      { id: "private", type: "PRIVATE_HANDLE", value: "do-not-reveal", isPrimary: false, updatedAt: now }
    ],
    notes: [
      {
        id: "note-internal",
        body: "Customer prefers evening calls.",
        createdAt: new Date("2026-08-14T10:00:00.000Z"),
        visibility: "INTERNAL",
        authorUser: { name: "CRM Manager" }
      },
      {
        id: "note-restricted",
        body: "Restricted note should not appear.",
        createdAt: new Date("2026-08-14T09:00:00.000Z"),
        visibility: "RESTRICTED",
        authorUser: { name: "CRM Manager" }
      }
    ],
    vehicleRelationships: [{
      relationshipType: "CUSTOMER_OWNER",
      effectiveFrom: new Date("2024-01-01T00:00:00.000Z"),
      effectiveTo: null,
      vehicle: { id: "vehicle-a", vehicleNumber: "VEH-A", year: 2022, make: "Toyota", model: "Camry", status: "ACTIVE" }
    }],
    appointmentParticipants: [{
      appointment: {
        id: "appointment-a",
        title: "Follow-up visit",
        startsAt: new Date("2026-08-16T16:00:00.000Z"),
        bookingStatus: "CONFIRMED",
        confirmationStatus: "CONFIRMED",
        attendanceStatus: "EXPECTED"
      }
    }],
    leads: [{
      id: "lead-a",
      leadNumber: "LEAD-A",
      stage: "ENGAGED",
      sourceCode: "WEBSITE",
      vehicleInterest: "Toyota Camry",
      nextActionCode: "FOLLOW_UP",
      nextActionAt: new Date("2026-08-15T12:00:00.000Z"),
      ownerUser: { id: "seller-a", name: "Sales Owner" }
    }],
    concernCases: [{
      id: "case-a",
      concernNumber: "CASE-A",
      title: "Title follow-up",
      category: "CUSTOMER_CARE",
      priority: "HIGH",
      status: "OPEN",
      dueAt: new Date("2026-08-15T18:00:00.000Z"),
      resolutionDueAt: null,
      slaStage: "WATCH",
      assignedOwner: null
    }],
    ...overrides
  } as unknown as UnifiedCrmCustomer360Record;
}

function timelineRepository(): UnifiedCrmCustomerTimelineRepository {
  return {
    async listTimeline() {
      return {
        interactions: [{
          id: "interaction-a",
          channel: "PHONE",
          direction: "OUTBOUND",
          summary: "Confirmed the appointment",
          outcome: "Reached customer",
          nextStep: "Send reminder",
          occurredAt: new Date("2026-08-14T13:00:00.000Z"),
          actorUser: { id: manager.id, name: manager.name }
        }],
        activityEvents: [{
          id: "activity-a",
          eventType: "task.updated",
          message: "Task moved into progress.",
          createdAt: new Date("2026-08-14T12:30:00.000Z"),
          actorUser: { id: manager.id, name: manager.name },
          task: { id: "task-a", title: "Call customer", status: "IN_PROGRESS", assignedUserId: manager.id },
          concernCase: null
        }],
        appointmentHistoryEvents: [{
          id: "appointment-event-a",
          eventType: "CONFIRMED",
          message: "Appointment confirmed by customer.",
          occurredAt: new Date("2026-08-14T11:30:00.000Z"),
          actorUser: { id: manager.id, name: manager.name },
          appointment: { id: "appointment-a", appointmentNumber: "APT-A", title: "Follow-up visit", ownerUserId: manager.id }
        }],
        leadEvents: [{
          id: "lead-a",
          leadNumber: "LEAD-A",
          stage: "ENGAGED",
          vehicleInterest: "Toyota Camry",
          createdAt: new Date("2026-08-13T09:00:00.000Z"),
          ownerUserId: "seller-a",
          ownerUser: { id: "seller-a", name: "Sales Owner" }
        }],
        caseEvents: [{
          id: "case-a",
          concernNumber: "CASE-A",
          title: "Title follow-up",
          priority: "HIGH",
          status: "OPEN",
          createdAt: new Date("2026-08-12T12:00:00.000Z"),
          assignedOwnerId: null,
          assignedOwner: null
        }],
        promiseEvents: [{
          id: "promise-a",
          promiseType: "CALL_BACK",
          promisedAt: new Date("2026-08-14T10:00:00.000Z"),
          dueAt: new Date("2026-08-15T10:00:00.000Z"),
          status: "OPEN",
          fulfilledAt: null,
          ownerUserId: manager.id,
          ownerUser: { id: manager.id, name: manager.name },
          fulfilledByUser: null,
          concernCase: { id: "case-a", concernNumber: "CASE-A", customerId: "customer-a", organizationId: "org-a", assignedOwnerId: null }
        }],
        crmDomainEvents: [{
          id: "crm-event-a",
          eventType: "CRM_CUSTOMER_NEXT_ACTION_SET",
          occurredAt: new Date("2026-08-14T14:00:00.000Z"),
          payload: { dueAt: "2026-08-15T15:00:00.000Z", note: "Customer requested a Friday check-in.", operation: "SET" },
          command: { actorUserId: manager.id }
        }]
      };
    }
  };
}

function dependencies(value: UnifiedCrmCustomer360Record | null, organizations = ["org-a"]) {
  const received: unknown[] = [];
  const repository: UnifiedCrmCustomer360Repository = {
    async findCustomer(input) {
      received.push(input);
      return value;
    }
  };
  return {
    deps: {
      now: () => now,
      readMode: "REVIEW",
      repository,
      timelineRepository: timelineRepository(),
      scopeRepository: { async listActiveOrganizationIds() { return organizations; } }
    },
    received
  };
}

describe("Unified CRM Customer 360 service", () => {
  it("returns a current, masked, read-only canonical overview", async () => {
    const setup = dependencies(record());
    const model = await getUnifiedCrmCustomer360(manager, "customer-a", setup.deps);

    expect(setup.received[0]).toEqual({
      customerId: "customer-a",
      organizationId: "org-a",
      recordScope: { kind: "ORGANIZATION" }
    });
    expect(model).toMatchObject({
      contractVersion: "ucrm.customer-360/v1",
      state: "READY",
      visibility: "organization",
      generatedAt: now.toISOString(),
      source: { authority: "CUSTOMERS", observedAt: now.toISOString() },
      freshness: {
        status: "CURRENT",
        observedAt: now.toISOString(),
        sourceRecordUpdatedAt: "2026-08-14T12:00:00.000Z"
      },
      contacts: [
        { type: "PHONE", maskedValue: "••••1234", source: "CONTACT_POINT" },
        { type: "EMAIL", maskedValue: "m•••@e•••.com", source: "CONTACT_POINT" }
      ],
      notes: [{ id: "note-internal", body: "Customer prefers evening calls.", visibility: "INTERNAL", authorName: "CRM Manager", createdAt: "2026-08-14T10:00:00.000Z" }],
      permissions: { canCreateRestrictedNote: false },
      vehicles: [{ id: "vehicle-a", sourceHref: "/vehicles/360/vehicle-a" }],
      appointments: [{ id: "appointment-a", sourceHref: "/appointments" }],
      timeline: { itemCount: 7 },
      sourceLenses: { leads: [{ id: "lead-a" }], cases: [{ id: "case-a" }] }
    });
    const serialized = JSON.stringify(model);
    for (const restricted of ["+16125551234", "maria@example.com", "legacy@example.test", "consentStatus", "address", "retentionUntil", "duplicateKey"]) {
      expect(serialized).not.toContain(restricted);
    }
    expect(serialized).not.toContain("PRIVATE_HANDLE");
    expect(serialized).not.toContain("do-not-reveal");
    expect(serialized).not.toContain("Restricted note should not appear.");
    expect(model).not.toHaveProperty("tasks");
    expect(model.timeline.items[0]).toMatchObject({
      kind: "commitment-event",
      title: "Next action set"
    });
    expect(model.timeline.items[1]).toMatchObject({
      kind: "interaction",
      title: "Phone Outbound"
    });
  });

  it("uses masked legacy contact fallback without exposing raw values", async () => {
    const model = await getUnifiedCrmCustomer360(manager, "customer-a", dependencies(record({ contactPoints: [] })).deps);
    expect(model.contacts).toEqual([
      { type: "PHONE", maskedValue: "••••0000", isPrimary: true, source: "CUSTOMER_LEGACY" },
      { type: "EMAIL", maskedValue: "l•••@e•••.test", isPrimary: true, source: "CUSTOMER_LEGACY" }
    ]);
  });

  it("passes owner scope for Sales", async () => {
    const seller = { ...manager, id: "seller-a", roles: ["Salesperson"] };
    const sourceRecord = record({
      leads: [
        {
          id: "lead-owned", leadNumber: "LEAD-OWNED", stage: "ENGAGED", sourceCode: "WEB",
          vehicleInterest: null, nextActionCode: "FOLLOW_UP", nextActionAt: now,
          ownerUser: { id: "seller-a", name: "Seller A" }
        },
        {
          id: "lead-other", leadNumber: "LEAD-OTHER", stage: "ENGAGED", sourceCode: "WEB",
          vehicleInterest: null, nextActionCode: "FOLLOW_UP", nextActionAt: now,
          ownerUser: { id: "seller-b", name: "Seller B" }
        }
      ],
      concernCases: [
        {
          id: "case-owned", concernNumber: "CASE-OWNED", title: "Owned", category: "CARE",
          priority: "HIGH", status: "OPEN", dueAt: now, resolutionDueAt: null, slaStage: "WATCH",
          assignedOwner: { id: "seller-a", name: "Seller A" }
        },
        {
          id: "case-other", concernNumber: "CASE-OTHER", title: "Other", category: "CARE",
          priority: "HIGH", status: "OPEN", dueAt: now, resolutionDueAt: null, slaStage: "WATCH",
          assignedOwner: { id: "seller-b", name: "Seller B" }
        },
        {
          id: "case-unassigned", concernNumber: "CASE-NONE", title: "Unassigned", category: "CARE",
          priority: "HIGH", status: "OPEN", dueAt: now, resolutionDueAt: null, slaStage: "WATCH",
          assignedOwner: null
        }
      ]
    });
    const setup = dependencies(sourceRecord);
    const model = await getUnifiedCrmCustomer360(seller, "customer-a", setup.deps);
    expect(model.visibility).toBe("owned");
    expect(setup.received[0]).toMatchObject({ recordScope: { kind: "OWNER", ownerUserId: "seller-a" } });
    expect(model.sourceLenses.leads.map((lead) => lead.id)).toEqual(["lead-owned"]);
    expect(model.sourceLenses.cases.map((customerCase) => customerCase.id)).toEqual(["case-owned"]);
    expect(model.timeline.itemCount).toBeGreaterThan(0);
  });

  it.each([
    ["missing", null],
    ["other organization", null],
    ["outside record scope", null],
    ["merged", null],
    ["archived", null]
  ])("makes %s records indistinguishable", async (_label, value) => {
    await expect(getUnifiedCrmCustomer360(manager, "customer-x", dependencies(value).deps)).rejects.toMatchObject({
      code: "CUSTOMER_NOT_AVAILABLE",
      httpStatus: 404,
      message: "Customer details are not available."
    });
  });

  it.each([
    [[], "ORGANIZATION_SCOPE_UNAVAILABLE"],
    [["org-a", "org-b"], "ORGANIZATION_SCOPE_AMBIGUOUS"]
  ])("fails closed for organization result %j", async (organizations, code) => {
    await expect(getUnifiedCrmCustomer360(manager, "customer-a", dependencies(record(), organizations).deps))
      .rejects.toMatchObject({ code });
  });

  it("rejects invalid identifiers and OFF mode before the customer query", async () => {
    const setup = dependencies(record());
    await expect(getUnifiedCrmCustomer360(manager, " ", setup.deps)).rejects.toMatchObject({ code: "INVALID_CUSTOMER_ID" });
    await expect(getUnifiedCrmCustomer360(manager, "customer-a", { ...setup.deps, readMode: "OFF" }))
      .rejects.toMatchObject({ code: "CUSTOMER_360_OFF" });
    expect(setup.received).toEqual([]);
  });

  it("maps repository failures to a safe typed source error", async () => {
    const setup = dependencies(record());
    setup.deps.repository.findCustomer = async () => { throw new Error("database secret"); };
    await expect(getUnifiedCrmCustomer360(manager, "customer-a", setup.deps)).rejects.toMatchObject({
      code: "CUSTOMER_SOURCE_UNAVAILABLE",
      message: "Customer details are temporarily unavailable."
    });
  });
});
