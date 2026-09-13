import { afterEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  getCrmNextOperationalCommandCenter,
  getCrmNextOperationalCustomer360
} from "@/server/crm-next/read-model";

const originalFlag = process.env.CRM_NEXT;

function user(): AuthenticatedUser {
  return {
    id: "crm-next-operational-user",
    name: "CRM Next Operational User",
    email: "crm-next-operational@example.test",
    isActive: true,
    roles: ["General Manager"],
    duties: { all: [], direct: [], roleDefaults: [] }
  };
}

const fixedNow = new Date("2026-08-30T15:00:00.000Z");

function customerList() {
  return {
    contractVersion: "ucrm.customer-list/v1",
    freshness: {
      newestRecordUpdatedAt: "2026-08-30T14:00:00.000Z",
      observedAt: "2026-08-30T15:00:00.000Z",
      status: "CURRENT"
    },
    generatedAt: "2026-08-30T15:00:00.000Z",
    items: [
      {
        customerNumber: "C-1001",
        displayName: "Amina Yusuf",
        id: "customer-amina",
        lastInteractionAt: "2026-08-29T16:00:00.000Z",
        maskedEmail: "a•••@e•••.test",
        maskedPhone: "••••1234",
        nextActionAt: "2026-08-30T14:00:00.000Z",
        ownerName: "John Smith",
        sourceHref: "/customers/customer-amina",
        status: "active",
        updatedAt: "2026-08-30T14:00:00.000Z"
      },
      {
        customerNumber: "C-1002",
        displayName: "Brian Cole",
        id: "customer-brian",
        lastInteractionAt: null,
        maskedEmail: "b•••@e•••.test",
        maskedPhone: "••••9876",
        nextActionAt: null,
        ownerName: "Unassigned",
        sourceHref: "/customers/customer-brian",
        status: "active",
        updatedAt: "2026-08-30T13:00:00.000Z"
      }
    ],
    page: { hasMore: false, limit: 8, nextCursor: null },
    query: { owner: "all", q: "", status: "active" },
    source: {
      authority: "CUSTOMERS",
      href: "/customers",
      label: "Customers",
      observedAt: "2026-08-30T15:00:00.000Z",
      readMode: "LIVE_CANONICAL"
    },
    state: "READY",
    visibility: "organization"
  } as const;
}

function globalSearch() {
  return {
    contractVersion: "ucrm.global-search/v1",
    freshness: {
      newestRecordUpdatedAt: "2026-08-30T14:00:00.000Z",
      observedAt: "2026-08-30T15:00:00.000Z",
      status: "CURRENT"
    },
    generatedAt: "2026-08-30T15:00:00.000Z",
    groups: [
      {
        count: 1,
        entity: "customer",
        label: "Customers",
        results: [
          {
            entity: "customer",
            href: "/customers/customer-amina",
            id: "customer-amina",
            label: "Amina Yusuf",
            matchedOn: "name",
            rank: 1,
            secondary: "C-1001",
            updatedAt: "2026-08-30T14:00:00.000Z"
          }
        ]
      },
      {
        count: 2,
        entity: "opportunity",
        label: "Opportunities",
        results: [
          {
            entity: "opportunity",
            href: "/crm/opportunities/opportunity-1",
            id: "opportunity-1",
            label: "Amina Yusuf · Accord",
            matchedOn: "customer",
            rank: 2,
            secondary: "Negotiation",
            updatedAt: "2026-08-30T14:00:00.000Z"
          },
          {
            entity: "opportunity",
            href: "/crm/opportunities/opportunity-2",
            id: "opportunity-2",
            label: "Brian Cole · RAV4",
            matchedOn: "customer",
            rank: 3,
            secondary: "Qualified",
            updatedAt: "2026-08-30T13:00:00.000Z"
          }
        ]
      }
    ],
    query: { limit: 12, q: "customer" },
    resultCount: 1,
    source: {
      authority: "UNIFIED_CRM",
      label: "Unified CRM global search",
      observedAt: "2026-08-30T15:00:00.000Z",
      readMode: "LIVE_CANONICAL"
    },
    state: "READY",
    visibility: "organization"
  } as const;
}

function customer360() {
  return {
    appointments: [
      {
        attendanceStatus: "PENDING",
        bookingStatus: "BOOKED",
        confirmationStatus: "CONFIRMED",
        id: "appt-1",
        sourceHref: "/appointments",
        startsAt: "2026-08-31T16:00:00.000Z",
        title: "Sales appointment"
      }
    ],
    communicationActionReadiness: {
      channels: [],
      fallback: { href: "/customers/customer-amina", label: "Log manual outcome", reason: "Review only" },
      posture: "MANUAL_ONLY",
      state: "READY"
    },
    communicationTimelineLens: {
      channels: [],
      detail: "Read-only",
      fallback: { href: "/customers/customer-amina", label: "Manual timeline review", reason: "Review only" },
      latestOutcomeAt: "2026-08-30T14:00:00.000Z",
      posture: "READ_ONLY",
      state: "READY",
      visibleOutcomeCount: 1
    },
    contacts: [
      { isPrimary: true, maskedValue: "••••1234", source: "CONTACT_POINT", type: "PHONE" },
      { isPrimary: true, maskedValue: "a•••@e•••.test", source: "CONTACT_POINT", type: "EMAIL" }
    ],
    contractVersion: "ucrm.customer-360/v1",
    freshness: {
      observedAt: "2026-08-30T15:00:00.000Z",
      sourceRecordUpdatedAt: "2026-08-30T14:00:00.000Z",
      status: "CURRENT"
    },
    generatedAt: "2026-08-30T15:00:00.000Z",
    identity: {
      customerNumber: "C-1001",
      customerSince: "2025-01-15",
      displayName: "Amina Yusuf",
      id: "customer-amina",
      status: "active"
    },
    notes: [],
    opportunityLensObservation: {
      detail: "1 opportunity",
      dispatchLinkCount: 0,
      freshnessLabel: "Current",
      newestVisibleRecordUpdatedAt: "2026-08-30T14:00:00.000Z",
      quoteLinkCount: 0,
      state: "READY",
      visibleRecordCount: 1
    },
    opportunityLenses: [],
    owner: { id: "owner-1", name: "John Smith" },
    permissions: {
      canCreateGovernedTask: false,
      canCreateNote: false,
      canCreateRestrictedNote: false,
      canLogInteraction: false,
      canManageNextAction: false
    },
    preferences: { languageCode: null, preferredContactMethod: null, preferredContactTime: null },
    relationship: {
      lastInteractionAt: "2026-08-29T16:00:00.000Z",
      nextActionAt: "2026-08-30T14:00:00.000Z",
      nextActionState: "OVERDUE"
    },
    source: {
      authority: "CUSTOMERS",
      href: "/customers/customer-amina",
      label: "Customers",
      observedAt: "2026-08-30T15:00:00.000Z",
      readMode: "LIVE_CANONICAL"
    },
    sourceLenses: { cases: [], leads: [] },
    state: "READY",
    timeline: {
      emptyMessage: "No timeline",
      freshness: { newestOccurredAt: "2026-08-30T14:00:00.000Z", observedAt: "2026-08-30T15:00:00.000Z" },
      itemCount: 1,
      items: [
        {
          actorName: "John Smith",
          correlationKey: "timeline-1",
          detail: "Spoke with customer",
          id: "timeline-1",
          kind: "interaction",
          occurredAt: "2026-08-30T14:00:00.000Z",
          sourceHref: "/customers/customer-amina",
          sourceLabel: "Customer",
          sourceRecordId: "customer-amina",
          title: "Phone follow-up"
        }
      ],
      page: { hasMore: false, limit: 20 },
      state: "READY"
    },
    vehicles: [
      {
        effectiveFrom: "2025-01-15",
        effectiveTo: null,
        id: "vehicle-1",
        label: "2021 Toyota RAV4",
        relationshipType: "Owned",
        sourceHref: "/vehicles/vehicle-1",
        status: "Owned"
      }
    ],
    visibility: "organization"
  } as const;
}

describe("CRM Next operational read model", () => {
  afterEach(() => {
    if (originalFlag === undefined) delete process.env.CRM_NEXT;
    else process.env.CRM_NEXT = originalFlag;
  });

  it("overlays existing customer and search read sources without creating a new customer master", async () => {
    process.env.CRM_NEXT = "REVIEW";
    const model = await getCrmNextOperationalCommandCenter(user(), {
      appointmentReader: vi.fn().mockResolvedValue({ appointmentCount: 3 }),
      customerListReader: vi.fn().mockResolvedValue(customerList()),
      leadReader: vi.fn().mockResolvedValue([
        {
          customer: { displayName: "Amina Yusuf", id: "customer-amina" },
          nextActionAt: "2026-09-12T19:00:00.000Z",
          nextActionCode: "FOLLOW_UP",
          sourceCode: "WEBSITE",
          stage: "NEW"
        },
        {
          customer: { displayName: "Nadia Omar", id: "customer-nadia" },
          nextActionAt: "2026-09-12T20:00:00.000Z",
          nextActionCode: "QUALIFY",
          sourceCode: "REFERRAL",
          stage: "QUALIFIED"
        },
        {
          customer: { displayName: "Sold Customer", id: "customer-sold" },
          nextActionAt: "2026-09-12T21:00:00.000Z",
          nextActionCode: "CLOSE",
          sourceCode: "WEBSITE",
          stage: "WON"
        }
      ]),
      now: () => fixedNow,
      salesReader: vi.fn().mockResolvedValue({
        dataSources: [{ source: "Deal visibility", status: "mapped", usedRecords: 2 }]
      }),
      searchReader: vi.fn().mockResolvedValue(globalSearch())
    });

    expect(model.operationalRead.state).toBe("LIVE_READ");
    expect(model.operationalRead.safety).toContain("Customer communications");
    expect(model.operationalRead.sources.map((source) => source.sourceOfTruth)).toEqual(
      expect.arrayContaining([
        "Existing customer records",
        "Existing customer search"
      ])
    );
    expect(model.customers[0]).toMatchObject({
      email: "a•••@e•••.test",
      id: "customer-amina",
      name: "Amina Yusuf",
      phone: "••••1234"
    });
    expect(model.attention[0]).toMatchObject({
      customerId: "customer-amina",
      level: "High",
      reason: "Overdue customer follow-up"
    });
    expect(model.search.groups[0]).toMatchObject({
      count: 1,
      href: "/customers/customer-amina",
      label: "Customers"
    });
    expect(model.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/crm-next/needs-attention", label: "Needs Attention", source: "Customer next actions", value: "2" }),
        expect.objectContaining({ href: "/crm-next/pipeline", label: "Hot Leads", source: "Lead engine", value: "2" }),
        expect.objectContaining({ href: "/crm-next/appointments", label: "Appointments Today", source: "Appointment schedule", value: "3" }),
        expect.objectContaining({ href: "/crm-next/deals", label: "Deals in Progress", source: "Deal visibility", value: "2" }),
        expect.objectContaining({ href: "/crm-next/needs-attention", label: "Overdue Follow-ups", value: "1" })
      ])
    );
    expect(model.enterpriseLayer.automationRecommendations.length).toBeGreaterThan(0);
    expect(model.enterpriseLayer.supportingParties.map((party) => party.party.typeLabel)).toEqual(
      expect.arrayContaining(["Government agency", "Towing company", "Warranty company"])
    );
    expect(model.enterpriseLayer.reportingBrief.sourceCount).toBeGreaterThan(0);
    expect(model.enterpriseLayer.adminGuardrails.map((control) => control.title)).toEqual(
      expect.arrayContaining(["Roles", "Permissions"])
    );
  });

  it("falls back honestly when existing read sources are unavailable", async () => {
    process.env.CRM_NEXT = "REVIEW";
    const model = await getCrmNextOperationalCommandCenter(user(), {
      appointmentReader: vi.fn().mockRejectedValue(new Error("appointment gated")),
      customerListReader: vi.fn().mockRejectedValue(new Error("source gated")),
      leadReader: vi.fn().mockRejectedValue(new Error("lead gated")),
      now: () => fixedNow,
      salesReader: vi.fn().mockRejectedValue(new Error("sales gated")),
      searchReader: vi.fn().mockRejectedValue(new Error("search gated"))
    });

    expect(model.operationalRead.state).toBe("FALLBACK_READ");
    expect(model.operationalRead.sources.every((source) => source.state === "FALLBACK_READ")).toBe(true);
    expect(model.customers).toEqual([]);
    expect(model.summary.every((metric) => metric.value === "No source data available")).toBe(true);
    expect(model.timeline).toEqual([]);
    expect(model.bridge.liveTaskCreationEnabled).toBe(false);
  });

  it("maps Customer 360 detail, vehicles, and timeline from the existing read-only service", async () => {
    process.env.CRM_NEXT = "REVIEW";
    const result = await getCrmNextOperationalCustomer360(user(), "customer-amina", {
      customer360Reader: vi.fn().mockResolvedValue(customer360()),
      customerListReader: vi.fn().mockResolvedValue(customerList()),
      now: () => fixedNow,
      searchReader: vi.fn().mockResolvedValue(globalSearch())
    });

    expect(result.customer.name).toBe("Amina Yusuf");
    expect(result.customer.vehicles).toEqual([
      { id: "vehicle-1", label: "2021 Toyota RAV4", status: "Owned", vin: "Owned" }
    ]);
    expect(result.model.timeline[0]).toMatchObject({
      href: "/customers/customer-amina",
      label: "Phone follow-up",
      source: "Communication"
    });
    expect(result.model.operationalRead.sources.map((source) => source.id)).toEqual(
      expect.arrayContaining(["customer-360", "timeline"])
    );
  });
});
