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
    relationship: { lastInteractionAt: "2026-08-13T14:00:00.000Z", nextActionAt: "2026-08-15T16:00:00.000Z" },
    vehicles: [{ id: "vehicle-1", label: "2022 Toyota RAV4", status: "ACTIVE", relationshipType: "OWNER", effectiveFrom: "2025-01-10T12:00:00.000Z", effectiveTo: null, sourceHref: "/vehicles/360/vehicle-1" }],
    appointments: [{ id: "appointment-1", title: "Sales follow-up", startsAt: "2026-08-16T16:00:00.000Z", bookingStatus: "CONFIRMED", confirmationStatus: "CONFIRMED", attendanceStatus: "EXPECTED", sourceHref: "/appointments" }],
    sourceLenses: {
      leads: [{ id: "lead-1", leadNumber: "LEAD-101", stage: "QUALIFIED", sourceCode: "WEBSITE", ownerName: "Taylor B.", vehicleInterest: "Toyota RAV4", nextActionCode: "FOLLOW_UP", nextActionAt: "2026-08-15T16:00:00.000Z", sourceHref: "/sales" }],
      cases: [{ id: "case-1", caseNumber: "CASE-202", title: "Document follow-up", category: "DOCUMENT", priority: "MEDIUM", status: "OPEN", ownerName: "Customer Care", dueAt: "2026-08-16T16:00:00.000Z", resolutionDueAt: null, slaStage: "HEALTHY", sourceHref: "/customers/resolutions?caseId=CASE-202" }]
    }
  };
}
