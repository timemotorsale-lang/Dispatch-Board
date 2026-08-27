import type { UnifiedCrmCustomer360ReadModel } from "@/server/unified-crm/customer-360-contract";

export function customer360Fixture(): UnifiedCrmCustomer360ReadModel {
  return {
    contractVersion: "ucrm.customer-360/v1", state: "READY", visibility: "organization", generatedAt: "2026-08-14T15:00:00.000Z",
    source: { authority: "CUSTOMERS", label: "Customers", href: "/customers/customer-1", readMode: "LIVE_CANONICAL", observedAt: "2026-08-14T15:00:00.000Z" },
    freshness: { status: "CURRENT", observedAt: "2026-08-14T15:00:00.000Z", sourceRecordUpdatedAt: "2026-08-14T14:45:00.000Z" },
    identity: { id: "customer-1", customerNumber: "CUS-1001", displayName: "Alex Morgan", status: "active", customerSince: "2024-02-01T12:00:00.000Z" },
    owner: { id: "owner-1", name: "Taylor B." },
    contacts: [{ type: "PHONE", maskedValue: "••••1234", isPrimary: true, source: "CONTACT_POINT" }, { type: "EMAIL", maskedValue: "a•••@e•••.com", isPrimary: false, source: "CONTACT_POINT" }],
    preferences: { preferredContactMethod: "PHONE", preferredContactTime: "Afternoons", languageCode: "en" },
    permissions: {
      canLogInteraction: true,
      canCreateNote: true,
      canCreateGovernedTask: true,
      canManageNextAction: true,
      canCreateRestrictedNote: false
    },
    relationship: { lastInteractionAt: "2026-08-13T14:00:00.000Z", nextActionAt: "2026-08-15T16:00:00.000Z", nextActionState: "DUE_TODAY" },
    vehicles: [{ id: "vehicle-1", label: "2022 Toyota RAV4", status: "ACTIVE", relationshipType: "OWNER", effectiveFrom: "2025-01-10T12:00:00.000Z", effectiveTo: null, sourceHref: "/vehicles/360/vehicle-1" }],
    appointments: [{ id: "appointment-1", title: "Sales follow-up", startsAt: "2026-08-16T16:00:00.000Z", bookingStatus: "CONFIRMED", confirmationStatus: "CONFIRMED", attendanceStatus: "EXPECTED", sourceHref: "/appointments" }],
    notes: [{ id: "note-1", authorName: "Taylor B.", body: "Customer prefers texts after lunch.", createdAt: "2026-08-14T13:45:00.000Z", visibility: "INTERNAL" }],
    timeline: {
      state: "READY",
      itemCount: 3,
      emptyMessage: "No permitted customer activity has been recorded in this timeline yet.",
      freshness: {
        observedAt: "2026-08-14T15:00:00.000Z",
        newestOccurredAt: "2026-08-14T14:30:00.000Z"
      },
      page: {
        limit: 20,
        hasMore: false
      },
      items: [
        { id: "interaction-1", correlationKey: "interaction:interaction-1", sourceRecordId: "interaction-1", kind: "interaction", title: "Phone Outbound", detail: "Confirmed Saturday visit · Outcome: Reached customer", occurredAt: "2026-08-14T14:30:00.000Z", actorName: "Taylor B.", sourceLabel: "Customer interactions", sourceHref: "/customers" },
        { id: "appointment-evt-1", correlationKey: "appointment:appointment-1", sourceRecordId: "appointment-1", kind: "appointment-event", title: "Confirmed · Sales follow-up", detail: "Appointment confirmation was recorded.", occurredAt: "2026-08-14T13:15:00.000Z", actorName: "Taylor B.", sourceLabel: "Appointments", sourceHref: "/appointments?view=board&appointment=APT-200" },
        { id: "case-evt-1", correlationKey: "case:case-1", sourceRecordId: "case-1", kind: "case-event", title: "CASE-202 opened", detail: "Document follow-up · Open · Medium", occurredAt: "2026-08-13T18:00:00.000Z", actorName: "Customer Care", sourceLabel: "Customer resolutions", sourceHref: "/customers/resolutions?caseId=CASE-202" }
      ]
    },
    communicationTimelineLens: {
      state: "READY",
      posture: "READ_ONLY",
      detail: "Permitted manual communication outcomes are visible here for context only. Raw phone numbers, raw email values, message bodies, and provider payloads are not exposed.",
      visibleOutcomeCount: 1,
      latestOutcomeAt: "2026-08-14T14:30:00.000Z",
      channels: [{ label: "Phone", count: 1, latestOutcomeAt: "2026-08-14T14:30:00.000Z" }],
      fallback: {
        label: "Manual timeline review",
        href: "#timeline-heading",
        reason: "Review the relationship timeline when communication outcomes need context; no external communication is sent from this lens."
      }
    },
    sourceLenses: {
      leads: [{ id: "lead-1", leadNumber: "LEAD-101", stage: "QUALIFIED", sourceCode: "WEBSITE", ownerName: "Taylor B.", vehicleInterest: "Toyota RAV4", nextActionCode: "FOLLOW_UP", nextActionAt: "2026-08-15T16:00:00.000Z", sourceHref: "/sales" }],
      cases: [{ id: "case-1", caseNumber: "CASE-202", title: "Document follow-up", category: "DOCUMENT", priority: "MEDIUM", status: "OPEN", ownerName: "Customer Care", dueAt: "2026-08-16T16:00:00.000Z", resolutionDueAt: null, slaStage: "HEALTHY", sourceHref: "/customers/resolutions?caseId=CASE-202" }]
    },
    opportunityLensObservation: {
      detail: "Only same-scope persisted opportunities linked to this customer are shown for organization review. 1 linked Dispatch record(s) are reconciled from opportunity bridge records. Lifecycle movement remains off.",
      dispatchLinkCount: 1,
      freshnessLabel: "Newest visible persisted opportunity update observed at 2026-08-15T13:00:00.000Z.",
      newestVisibleRecordUpdatedAt: "2026-08-15T13:00:00.000Z",
      state: "READY",
      visibleRecordCount: 1
    },
    opportunityLenses: [{
      dispatchLinkCount: 1,
      dispatchLinks: [{
        href: "/vehicles/repair-workbench?repairOrderId=ro-1001",
        repairJobId: null,
        repairJobNumber: null,
        repairOrderId: "ro-1001",
        repairOrderNumber: "RO-1001",
        state: "ACTIVE",
        targetKind: "REPAIR_ORDER",
        title: "Repair order RO-1001",
        version: 2
      }],
      id: "opp_1001",
      opportunityNumber: "opp_1001",
      stage: "QUALIFIED",
      title: "Alex Morgan renewal review",
      ownerName: "Taylor B.",
      customerLabel: "Alex Morgan · CUS-1001",
      summary: "Review the persisted opportunity in read-only mode.",
      updatedAt: "2026-08-15T13:00:00.000Z",
      href: "/crm/opportunities/opp_1001?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
      state: "LIVE_READ_ONLY"
    }]
  };
}
