import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmCustomer360Repository,
  type UnifiedCrmCustomer360Record,
  type UnifiedCrmCustomer360Repository
} from "@/server/repositories/unified-crm-customer-360-repository";
import { getUnifiedCrmCustomer360 } from "@/server/services/unified-crm-customer-360-service";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager-a@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const rawPhone = "+16125559876";
const rawEmail = "private.customer@example.test";
const rawAddress = "900 Private Customer Avenue";
const rawNote = "Restricted legal note must never enter UCRM-014";
const rawConsent = "OPTED_IN_WITH_EVIDENCE";

function record(overrides: Record<string, unknown> = {}): UnifiedCrmCustomer360Record {
  return {
    id: "customer-a",
    customerNumber: "CUS-001",
    displayName: "Permitted Customer",
    phoneNumber: rawPhone,
    email: rawEmail,
    status: "ACTIVE",
    ownerUserId: "seller-a",
    preferredContactMethod: "PHONE",
    preferredContactTime: "EVENING",
    languageCode: "en",
    lastInteractionAt: new Date("2026-08-13T12:00:00.000Z"),
    nextActionAt: new Date("2026-08-15T12:00:00.000Z"),
    sourceCode: "CUSTOMERS",
    createdAt: new Date("2025-01-01T12:00:00.000Z"),
    updatedAt: new Date("2026-08-14T12:00:00.000Z"),
    ownerUser: { id: "seller-a", name: "Seller A" },
    contactPoints: [
      { id: "phone-a", type: "PHONE", value: rawPhone, isPrimary: true, updatedAt: new Date("2026-08-14T11:00:00.000Z"), normalizedValue: rawPhone, consentStatus: rawConsent },
      { id: "email-a", type: "EMAIL", value: rawEmail, isPrimary: false, updatedAt: new Date("2026-08-14T10:00:00.000Z"), normalizedValue: rawEmail, consentStatus: rawConsent }
    ],
    vehicleRelationships: [{
      relationshipType: "OWNER",
      effectiveFrom: new Date("2025-02-01T12:00:00.000Z"),
      effectiveTo: null,
      vehicle: { id: "vehicle-a", vehicleNumber: "VEH-1", year: 2022, make: "Toyota", model: "Camry", status: "ACTIVE" }
    }],
    appointmentParticipants: [{ appointment: { id: "appointment-a", title: "Customer visit", startsAt: new Date("2026-08-16T15:00:00.000Z"), bookingStatus: "BOOKED", confirmationStatus: "CONFIRMED", attendanceStatus: "EXPECTED" } }],
    leads: [{ id: "lead-a", leadNumber: "LEAD-1", stage: "ENGAGED", sourceCode: "WEBSITE", vehicleInterest: "Toyota Camry", nextActionCode: "FOLLOW_UP", nextActionAt: new Date("2026-08-15T12:00:00.000Z"), ownerUser: { id: "seller-a", name: "Seller A" } }],
    concernCases: [{ id: "case-a", concernNumber: "CASE-1", title: "Title follow-up", category: "CUSTOMER_CARE", priority: "MEDIUM", status: "OPEN", dueAt: new Date("2026-08-16T12:00:00.000Z"), resolutionDueAt: null, slaStage: "HEALTHY", assignedOwner: { id: "manager-a", name: "CRM Manager" } }],
    organizationId: "org-a-secret",
    address: rawAddress,
    notes: [{ body: rawNote, visibility: "RESTRICTED" }],
    retentionUntil: "2099-01-01",
    duplicateKey: "private-duplicate-key",
    ...overrides
  } as unknown as UnifiedCrmCustomer360Record;
}

function scopeRepository(organizationIds = ["org-a"]) {
  return { listActiveOrganizationIds: vi.fn().mockResolvedValue(organizationIds) };
}

function repository(result: UnifiedCrmCustomer360Record | null = record()) {
  return { findCustomer: vi.fn().mockResolvedValue(result) } satisfies UnifiedCrmCustomer360Repository;
}

function safeErrorBytes(error: unknown) {
  const candidate = error as {
    code?: unknown;
    contractVersion?: unknown;
    httpStatus?: unknown;
    message?: unknown;
    retryable?: unknown;
  };
  return JSON.stringify({
    code: candidate.code,
    contractVersion: candidate.contractVersion,
    httpStatus: candidate.httpStatus,
    message: candidate.message,
    retryable: candidate.retryable
  });
}

describe("Unified CRM Customer 360 adversarial boundary", () => {
  it("makes missing, other-organization, out-of-owner-scope, merged, and archived results byte-equivalent", async () => {
    const scenarios = ["missing-id", "other-org-id", "other-owner-id", "merged-id", "archived-id"];
    const results: string[] = [];

    for (const customerId of scenarios) {
      try {
        await getUnifiedCrmCustomer360(manager, customerId, {
          readMode: "REVIEW",
          repository: repository(null),
          scopeRepository: scopeRepository()
        });
        throw new Error("Expected the customer lookup to fail closed.");
      } catch (error) {
        results.push(safeErrorBytes(error));
      }
    }

    expect(new Set(results).size).toBe(1);
    expect(JSON.parse(results[0])).toEqual({
      code: "CUSTOMER_NOT_AVAILABLE",
      contractVersion: "ucrm.customer-360-error/v1",
      httpStatus: 404,
      message: "Customer details are not available.",
      retryable: false
    });
    for (const customerId of scenarios) expect(results[0]).not.toContain(customerId);
  });

  it("intersects a Sales viewer with owned-record scope before lookup", async () => {
    const seller = { ...manager, id: "seller-a", roles: ["Salesperson"] };
    const source = repository();

    const result = await getUnifiedCrmCustomer360(seller, "customer-a", {
      readMode: "REVIEW",
      repository: source,
      scopeRepository: scopeRepository()
    });

    expect(source.findCustomer).toHaveBeenCalledWith({
      customerId: "customer-a",
      organizationId: "org-a",
      recordScope: { kind: "OWNER", ownerUserId: "seller-a" }
    });
    expect(result.visibility).toBe("owned");
  });

  it("omits raw contact, address, notes, consent, retention, duplicate, and organization fields from the serialized DTO", async () => {
    const result = await getUnifiedCrmCustomer360(manager, "customer-a", {
      now: () => new Date("2026-08-14T13:00:00.000Z"),
      readMode: "REVIEW",
      repository: repository(),
      scopeRepository: scopeRepository()
    });
    const serialized = JSON.stringify(result);

    expect(result.contacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "PHONE", maskedValue: "••••9876" }),
      expect.objectContaining({ type: "EMAIL", maskedValue: "p•••@e•••.test" })
    ]));
    for (const forbidden of [
      rawPhone,
      rawEmail,
      rawAddress,
      rawNote,
      rawConsent,
      "org-a-secret",
      "private-duplicate-key",
      "2099-01-01",
      "normalizedValue",
      "consentStatus",
      "notes",
      "address",
      "retentionUntil",
      "duplicateKey",
      "organizationId"
    ]) expect(serialized).not.toContain(forbidden);
  });

  it("does not call organization or customer repositories when the detail read control is OFF", async () => {
    const scope = scopeRepository();
    const source = repository();

    await expect(getUnifiedCrmCustomer360(manager, "customer-a", {
      readMode: "OFF",
      repository: source,
      scopeRepository: scope
    })).rejects.toMatchObject({ code: "CUSTOMER_360_OFF" });
    expect(scope.listActiveOrganizationIds).not.toHaveBeenCalled();
    expect(source.findCustomer).not.toHaveBeenCalled();
  });

  it("constrains the parent, owner scope, and every organization-bearing nested source in the Prisma query", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const source = createUnifiedCrmCustomer360Repository({ customer: { findFirst } } as never);

    await source.findCustomer({
      customerId: "customer-a",
      organizationId: "org-a",
      recordScope: { kind: "OWNER", ownerUserId: "seller-a" }
    });

    const query = findFirst.mock.calls[0][0];
    expect(query.where).toEqual({
      id: "customer-a",
      organizationId: "org-a",
      archivedAt: null,
      mergedIntoCustomerId: null,
      status: { in: ["ACTIVE", "INACTIVE", "RETIRED"] },
      ownerUserId: "seller-a"
    });
    expect(query.select.vehicleRelationships.where).toEqual({ vehicle: { organizationId: "org-a" } });
    expect(query.select.appointmentParticipants.where).toEqual({ appointment: { organizationId: "org-a" } });
    expect(query.select.leads.where).toEqual({ organizationId: "org-a", ownerUserId: "seller-a" });
    expect(query.select.concernCases.where).toEqual({ organizationId: "org-a", assignedOwnerId: "seller-a" });
    for (const forbiddenField of ["address", "notes", "retentionUntil", "duplicateKey", "mergedIntoCustomerId", "organizationId"]) {
      expect(query.select).not.toHaveProperty(forbiddenField);
    }
    expect(query.select.contactPoints.select).not.toHaveProperty("normalizedValue");
    expect(query.select.contactPoints.select).not.toHaveProperty("consentStatus");
  });

  it("keeps Management nested lead and case lenses organization-scoped", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const source = createUnifiedCrmCustomer360Repository({ customer: { findFirst } } as never);

    await source.findCustomer({
      customerId: "customer-a",
      organizationId: "org-a",
      recordScope: { kind: "ORGANIZATION" }
    });

    const query = findFirst.mock.calls[0][0];
    expect(query.select.leads.where).toEqual({ organizationId: "org-a" });
    expect(query.select.concernCases.where).toEqual({ organizationId: "org-a" });
  });
});
