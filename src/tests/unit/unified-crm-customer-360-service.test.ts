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
    unifiedCrmOpportunities: [{
      dispatchLinks: [{
        archivedAt: null,
        repairJobId: "job-1",
        repairJobNumberSnapshot: "JOB-01",
        repairOrderId: "ro-1",
        repairOrderNumberSnapshot: "RO-1001",
        targetKind: "REPAIR_JOB",
        targetVersionSnapshot: 2,
        titleSnapshot: "Diagnose Maria Santos repair request"
      }],
      opportunityNumber: "opp_123456",
      stage: "QUALIFIED",
      title: "Maria Santos renewal review",
      summary: "Read-only opportunity summary.",
      organizationId: "org-a",
      updatedAt: new Date("2026-08-14T11:00:00.000Z"),
      ownerUser: { id: manager.id, name: manager.name }
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
        }],
        page: {
          limit: 20,
          hasMore: false
        }
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
    },
    async getCustomerVersion(input) {
      received.push({ customerVersionFor: input });
      return 7;
    },
    async listOpportunityDispatchLinks(input) {
      received.push({ dispatchLinksFor: input });
      return value
        ? [{
            archivedAt: null,
            opportunityNumber: "opp_123456",
            repairJobId: "job-1",
            repairJobNumberSnapshot: "JOB-01",
            repairOrderId: "ro-1",
            repairOrderNumberSnapshot: "RO-1001",
            targetKind: "REPAIR_JOB",
            targetVersionSnapshot: 2,
            titleSnapshot: "Diagnose Maria Santos repair request"
          }]
        : [];
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
      lifecycle: {
        version: 7
      },
      contacts: [
        { type: "PHONE", maskedValue: "••••1234", source: "CONTACT_POINT" },
        { type: "EMAIL", maskedValue: "m•••@e•••.com", source: "CONTACT_POINT" }
      ],
      notes: [{ id: "note-internal", body: "Customer prefers evening calls.", visibility: "INTERNAL", authorName: "CRM Manager", createdAt: "2026-08-14T10:00:00.000Z" }],
      permissions: {
        canLogInteraction: true,
        canCreateNote: true,
        canCreateGovernedTask: true,
        canEditCustomerDetails: true,
        canManageNextAction: true,
        canCreateRestrictedNote: false
      },
      relationship: {
        lastInteractionAt: "2026-08-13T12:00:00.000Z",
        nextActionAt: "2026-08-15T12:00:00.000Z",
        nextActionState: "SCHEDULED"
      },
      vehicles: [{ id: "vehicle-a", sourceHref: "/vehicles/360/vehicle-a" }],
      appointments: [{ id: "appointment-a", sourceHref: "/appointments" }],
      timeline: {
        state: "READY",
        itemCount: 8,
        emptyMessage: "No permitted customer activity has been recorded in this timeline yet.",
        freshness: {
          observedAt: now.toISOString(),
          newestOccurredAt: "2026-08-14T14:00:00.000Z"
        },
        page: {
          limit: 20,
          hasMore: false
        }
      },
      communicationTimelineLens: {
        state: "READY",
        posture: "READ_ONLY",
        visibleOutcomeCount: 1,
        latestOutcomeAt: "2026-08-14T13:00:00.000Z",
        channels: [{ label: "Phone", count: 1, latestOutcomeAt: "2026-08-14T13:00:00.000Z" }],
        fallback: {
          label: "Manual timeline review",
          href: "#timeline-heading"
        }
      },
      communicationActionReadiness: {
        state: "READY",
        posture: "MANUAL_ONLY",
        channels: [
          { id: "phone", label: "Call", state: "READY_MANUAL", primaryActionLabel: "Log call outcome", href: "#interaction-form-heading" },
          { id: "email", label: "Email", state: "PROVIDER_HELD", primaryActionLabel: "Draft only", href: "/api/crm/v1/communications/email-drafts" },
          { id: "sms", label: "Text", state: "PROVIDER_HELD", primaryActionLabel: "Review text templates", href: "/api/crm/v1/communications/sms-templates" }
        ],
        fallback: {
          label: "Log manual outcome",
          href: "#interaction-form-heading"
        }
      },
      sourceLenses: { leads: [{ id: "lead-a" }], cases: [{ id: "case-a" }] },
      opportunityLensObservation: {
        detail: "Only same-scope persisted opportunities linked to this customer are shown for organization review. 1 linked Dispatch record(s) are reconciled from opportunity bridge records. Lifecycle movement remains off.",
        dispatchLinkCount: 1,
        freshnessLabel: "Newest visible persisted opportunity update observed at 2026-08-14T11:00:00.000Z.",
        newestVisibleRecordUpdatedAt: "2026-08-14T11:00:00.000Z",
        state: "READY",
        visibleRecordCount: 1
      },
      opportunityLenses: [{
        dispatchLinkCount: 1,
        dispatchLinks: [{
          href: "/vehicles/shop-dispatch?repairJobId=job-1",
          repairJobId: "job-1",
          repairJobNumber: "JOB-01",
          repairOrderId: "ro-1",
          repairOrderNumber: "RO-1001",
          state: "ACTIVE",
          targetKind: "REPAIR_JOB",
          title: "Diagnose Maria Santos repair request",
          version: 2
        }],
        id: "opp_123456",
        opportunityNumber: "opp_123456",
        stage: "QUALIFIED",
        state: "LIVE_READ_ONLY"
      }]
    });
    const serialized = JSON.stringify(model);
    for (const restricted of ["+16125551234", "maria@example.com", "legacy@example.test", "consentStatus", "address", "retentionUntil", "duplicateKey"]) {
      expect(serialized).not.toContain(restricted);
    }
    expect(serialized).not.toContain("PRIVATE_HANDLE");
    expect(serialized).not.toContain("do-not-reveal");
    expect(serialized).not.toContain("Restricted note should not appear.");
    expect(model).not.toHaveProperty("tasks");
    expect(model.communicationTimelineLens.detail).toContain("Raw phone numbers, raw email values, message bodies, and provider payloads are not exposed.");
    expect(model.communicationActionReadiness.channels.map((channel) => channel.state)).toEqual(["READY_MANUAL", "PROVIDER_HELD", "PROVIDER_HELD"]);
    expect(JSON.stringify(model.communicationActionReadiness)).not.toContain("+16125551234");
    expect(model.timeline.items[0]).toMatchObject({
      correlationKey: "crm-event:crm-event-a",
      kind: "commitment-event",
      sourceRecordId: "crm-event-a",
      title: "Next action set"
    });
    expect(model.timeline.items[1]).toMatchObject({
      correlationKey: "interaction:interaction-a",
      kind: "interaction",
      sourceRecordId: "interaction-a",
      title: "Phone Outbound"
    });
    expect(model.timeline.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "note:note-internal",
        kind: "note-event",
        sourceLabel: "Customer notes",
        sourceRecordId: "note-internal",
        title: "Internal note recorded"
      })
    ]));
  });

  it("lists manual communication channels and follow-up completion in the Customer 360 timeline", async () => {
    const setup = dependencies(record({ notes: [] }));
    const model = await getUnifiedCrmCustomer360(manager, "customer-a", {
      ...setup.deps,
      timelineRepository: {
        async listTimeline() {
          return {
            interactions: [
              {
                id: "interaction-email",
                channel: "EMAIL",
                direction: "OUTBOUND",
                summary: "Sent manual email recap after the customer call.",
                outcome: "Manual email logged",
                nextStep: "Customer will reply with proof of insurance.",
                occurredAt: new Date("2026-08-14T13:30:00.000Z"),
                actorUser: { id: manager.id, name: manager.name }
              },
              {
                id: "interaction-note",
                channel: "INTERNAL_NOTE",
                direction: "INTERNAL",
                summary: "Manager note: title concern is resolved.",
                outcome: "Follow-up complete",
                nextStep: null,
                occurredAt: new Date("2026-08-14T13:00:00.000Z"),
                actorUser: { id: manager.id, name: manager.name }
              }
            ],
            activityEvents: [],
            appointmentHistoryEvents: [],
            leadEvents: [],
            caseEvents: [],
            promiseEvents: [],
            crmDomainEvents: [{
              id: "crm-completed",
              eventType: "CRM_CUSTOMER_NEXT_ACTION_COMPLETED",
              occurredAt: new Date("2026-08-14T14:00:00.000Z"),
              payload: { note: "Customer confirmed the issue is resolved.", operation: "COMPLETE", previousNextActionAt: "2026-08-14T13:00:00.000Z" },
              command: { actorUserId: manager.id }
            }],
            page: { limit: 20, hasMore: false }
          };
        }
      }
    });

    expect(model.timeline.items.map((item) => item.title)).toContain("Email Outbound");
    expect(model.timeline.items.map((item) => item.title)).toContain("Internal Note Internal");
    expect(model.timeline.items.map((item) => item.title)).toContain("Next action completed");
    expect(model.communicationTimelineLens).toMatchObject({
      state: "READY",
      visibleOutcomeCount: 2,
      channels: expect.arrayContaining([
        { label: "Email", count: 1, latestOutcomeAt: "2026-08-14T13:30:00.000Z" },
        { label: "Other", count: 1, latestOutcomeAt: "2026-08-14T13:00:00.000Z" }
      ])
    });
  });

  it("shows a verified appointment record even before appointment history events exist", async () => {
    const setup = dependencies(record({ notes: [] }));
    setup.deps.timelineRepository = {
      async listTimeline() {
        return {
          interactions: [],
          activityEvents: [],
          appointmentHistoryEvents: [],
          leadEvents: [],
          caseEvents: [],
          promiseEvents: [],
          crmDomainEvents: [],
          page: { limit: 20, hasMore: false }
        };
      }
    };

    const model = await getUnifiedCrmCustomer360(manager, "customer-a", setup.deps);

    expect(model.timeline.items).toHaveLength(1);
    expect(model.timeline.items[0]).toMatchObject({
      correlationKey: "appointment:appointment-a",
      id: "appointment-record:appointment-a",
      kind: "appointment-event",
      sourceLabel: "Appointments",
      sourceRecordId: "appointment-a",
      title: "Appointment scheduled · Follow-up visit"
    });
  });

  it("uses masked legacy contact fallback without exposing raw values", async () => {
    const model = await getUnifiedCrmCustomer360(manager, "customer-a", dependencies(record({ contactPoints: [] })).deps);
    expect(model.contacts).toEqual([
      { type: "PHONE", maskedValue: "••••0000", isPrimary: true, source: "CUSTOMER_LEGACY" },
      { type: "EMAIL", maskedValue: "l•••@e•••.test", isPrimary: true, source: "CUSTOMER_LEGACY" }
    ]);
    expect(model.communicationActionReadiness.state).toBe("READY");
    expect(model.communicationActionReadiness.channels.find((channel) => channel.id === "phone")).toMatchObject({
      state: "READY_MANUAL",
      primaryActionLabel: "Log call outcome"
    });
  });

  it("shows no-contact communication readiness without exposing missing contact values", async () => {
    const model = await getUnifiedCrmCustomer360(manager, "customer-a", dependencies(record({
      contactPoints: [],
      phoneNumber: null,
      email: null
    })).deps);

    expect(model.contacts).toEqual([]);
    expect(model.communicationActionReadiness).toMatchObject({
      state: "UNAVAILABLE",
      posture: "NO_CONTACT",
      channels: [
        { id: "phone", state: "NO_CONTACT", primaryActionLabel: "Review customer source" },
        { id: "email", state: "NO_CONTACT", primaryActionLabel: "Review customer source" },
        { id: "sms", state: "NO_CONTACT", primaryActionLabel: "Review customer source" }
      ]
    });
  });

  it("classifies next action timing as overdue or due today from the observed customer context", async () => {
    const overdue = await getUnifiedCrmCustomer360(manager, "customer-a", dependencies(record({
      nextActionAt: new Date("2026-08-14T10:00:00.000Z")
    })).deps);
    expect(overdue.relationship).toMatchObject({
      nextActionAt: "2026-08-14T10:00:00.000Z",
      nextActionState: "OVERDUE"
    });

    const dueToday = await getUnifiedCrmCustomer360(manager, "customer-a", dependencies(record({
      nextActionAt: new Date("2026-08-14T18:00:00.000Z")
    })).deps);
    expect(dueToday.relationship).toMatchObject({
      nextActionAt: "2026-08-14T18:00:00.000Z",
      nextActionState: "DUE_TODAY"
    });

    const none = await getUnifiedCrmCustomer360(manager, "customer-a", dependencies(record({
      nextActionAt: null
    })).deps);
    expect(none.relationship).toMatchObject({
      nextActionAt: null,
      nextActionState: "NONE"
    });
  });

  it("turns next-action updates off in the read model when the command mode is off or no owner exists", async () => {
    const commandOff = await getUnifiedCrmCustomer360(manager, "customer-a", {
      ...dependencies(record()).deps,
      commandMode: "OFF"
    });
    expect(commandOff.permissions.canManageNextAction).toBe(false);
    expect(commandOff.permissions.canLogInteraction).toBe(true);
    expect(commandOff.permissions.canCreateNote).toBe(true);
    expect(commandOff.permissions.canCreateGovernedTask).toBe(true);

    const noOwner = await getUnifiedCrmCustomer360(manager, "customer-a", dependencies(record({
      ownerUserId: null,
      ownerUser: null
    })).deps);
    expect(noOwner.permissions.canManageNextAction).toBe(false);
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
    expect(model.opportunityLensObservation).toMatchObject({
      state: "READY",
      visibleRecordCount: 1
    });
    expect(model.timeline.itemCount).toBeGreaterThan(0);
  });

  it("returns an explicit empty opportunity-lens observation when no persisted opportunity is visible", async () => {
    const setup = dependencies(record({
      unifiedCrmOpportunities: [{
        dispatchLinks: [],
        opportunityNumber: "//invalid",
        stage: "NEW_INQUIRY",
        title: "Invalid target",
        summary: "Should not appear.",
        organizationId: "org-a",
        updatedAt: now,
        ownerUser: { id: "manager-1", name: "CRM Manager" }
      }]
    }));

    const model = await getUnifiedCrmCustomer360(manager, "customer-a", setup.deps);
    expect(model.opportunityLenses).toEqual([]);
    expect(model.opportunityLensObservation).toMatchObject({
      detail: "No same-scope persisted read-only opportunity linked to this customer is visible right now for organization review. Continue with held opportunity review surfaces until one is available.",
      dispatchLinkCount: 0,
      freshnessLabel: "No visible persisted opportunity update is available yet.",
      newestVisibleRecordUpdatedAt: null,
      state: "EMPTY",
      visibleRecordCount: 0
    });
  });

  it("returns an explicit empty timeline state and has-more metadata when no permitted activity exists", async () => {
    const setup = dependencies(record({ appointmentParticipants: [], notes: [] }));
    setup.deps.timelineRepository = {
      async listTimeline() {
        return {
          interactions: [],
          activityEvents: [],
          appointmentHistoryEvents: [],
          leadEvents: [],
          caseEvents: [],
          promiseEvents: [],
          crmDomainEvents: [],
          page: {
            limit: 20,
            hasMore: true
          }
        };
      }
    };

    const model = await getUnifiedCrmCustomer360(manager, "customer-a", setup.deps);
    expect(model.timeline).toMatchObject({
      state: "EMPTY",
      itemCount: 0,
      emptyMessage: "No permitted customer activity has been recorded in this timeline yet.",
      freshness: {
        observedAt: now.toISOString(),
        newestOccurredAt: null
      },
      page: {
        limit: 20,
        hasMore: true
      }
    });
    expect(model.timeline.items).toEqual([]);
    expect(model.communicationTimelineLens).toMatchObject({
      state: "EMPTY",
      posture: "READ_ONLY",
      visibleOutcomeCount: 0,
      latestOutcomeAt: null,
      channels: []
    });
  });

  it("preserves merged timeline hasMore when multiple bounded sources exceed the visible global limit", async () => {
    const setup = dependencies(record({ appointmentParticipants: [], notes: [] }));
    setup.deps.timelineRepository = {
      async listTimeline() {
        return {
          interactions: [
            {
              id: "interaction-a",
              channel: "PHONE",
              direction: "OUTBOUND",
              summary: "Called customer",
              outcome: null,
              nextStep: null,
              occurredAt: new Date("2026-08-14T15:00:00.000Z"),
              actorUser: null
            },
            {
              id: "interaction-b",
              channel: "EMAIL",
              direction: "OUTBOUND",
              summary: "Sent follow-up",
              outcome: null,
              nextStep: null,
              occurredAt: new Date("2026-08-14T14:00:00.000Z"),
              actorUser: null
            }
          ],
          activityEvents: [
            {
              id: "activity-a",
              eventType: "task.updated",
              message: "Task advanced.",
              createdAt: new Date("2026-08-14T13:00:00.000Z"),
              actorUser: null,
              task: { id: "task-a", title: "Call customer", status: "IN_PROGRESS", assignedUserId: manager.id },
              concernCase: null
            },
            {
              id: "activity-b",
              eventType: "task.updated",
              message: "Task reviewed.",
              createdAt: new Date("2026-08-14T12:00:00.000Z"),
              actorUser: null,
              task: { id: "task-b", title: "Send email", status: "READY_FOR_REVIEW", assignedUserId: manager.id },
              concernCase: null
            }
          ],
          appointmentHistoryEvents: [],
          leadEvents: [],
          caseEvents: [],
          promiseEvents: [],
          crmDomainEvents: [],
          page: {
            limit: 3,
            hasMore: true
          }
        };
      }
    };

    const model = await getUnifiedCrmCustomer360(manager, "customer-a", setup.deps);
    expect(model.timeline.page).toMatchObject({
      limit: 3,
      hasMore: true
    });
    expect(model.timeline.items).toHaveLength(3);
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

  it("does not query timeline sources until the canonical customer is confirmed in scope", async () => {
    const setup = dependencies(null);
    const listTimeline = vi.fn();
    setup.deps.timelineRepository = { listTimeline };

    await expect(getUnifiedCrmCustomer360(manager, "other-org-customer", setup.deps)).rejects.toMatchObject({
      code: "CUSTOMER_NOT_AVAILABLE",
      message: "Customer details are not available."
    });

    expect(listTimeline).not.toHaveBeenCalled();
  });

  it("orders correlated activity deterministically and omits uncontracted source fields", async () => {
    const setup = dependencies(record({ appointmentParticipants: [], notes: [] }));
    const source = await timelineRepository().listTimeline({} as never);
    setup.deps.timelineRepository = {
      async listTimeline() {
        return {
          ...source,
          interactions: [
            {
              id: "a",
              channel: "PHONE",
              direction: "OUTBOUND",
              summary: "First same-time event",
              outcome: null,
              nextStep: null,
              occurredAt: new Date("2026-08-14T15:00:00.000Z"),
              actorUser: null,
              rawPhone: "+16125550000"
            },
            {
              id: "b",
              channel: "EMAIL",
              direction: "OUTBOUND",
              summary: "Second same-time event",
              outcome: null,
              nextStep: null,
              occurredAt: new Date("2026-08-14T15:00:00.000Z"),
              actorUser: null,
              secretToken: "timeline-secret"
            }
          ] as never,
          activityEvents: [{
            id: "task-event",
            eventType: "task.updated",
            message: "Task updated.",
            createdAt: new Date("2026-08-14T14:00:00.000Z"),
            actorUser: null,
            task: { id: "task-a", title: "Call customer", status: "IN_PROGRESS", assignedUserId: manager.id },
            concernCase: null
          }],
          appointmentHistoryEvents: [],
          leadEvents: [],
          caseEvents: [],
          promiseEvents: [],
          crmDomainEvents: [],
          page: { limit: 20, hasMore: false }
        };
      }
    };

    const model = await getUnifiedCrmCustomer360(manager, "customer-a", setup.deps);
    expect(model.timeline.items.map((item) => item.id)).toEqual(["interaction:b", "interaction:a", "activity:task-event"]);
    expect(model.timeline.items[2]).toMatchObject({ correlationKey: "task:task-a", sourceRecordId: "task-a" });
    expect(JSON.stringify(model.timeline)).not.toContain("+16125550000");
    expect(JSON.stringify(model.timeline)).not.toContain("timeline-secret");
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

  it("maps timeline source failures without leaking backend text", async () => {
    const setup = dependencies(record());
    setup.deps.timelineRepository = {
      async listTimeline() {
        throw new Error("private activity database detail");
      }
    };
    await expect(getUnifiedCrmCustomer360(manager, "customer-a", setup.deps)).rejects.toMatchObject({
      code: "CUSTOMER_SOURCE_UNAVAILABLE",
      message: "Customer details are temporarily unavailable."
    });
  });
});
