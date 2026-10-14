import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateUnifiedCrmOpportunityPolicy } from "@/server/policies/unified-crm-opportunity";
import {
  normalizeUnifiedCrmOpportunityAppointmentBridgeReceipt,
  normalizeUnifiedCrmOpportunityAppointmentBridgeRequest,
  normalizeUnifiedCrmOpportunityAppointmentReference,
  normalizeUnifiedCrmOpportunityDispatchBridgeReceipt,
  normalizeUnifiedCrmOpportunityDispatchBridgeRequest,
  normalizeUnifiedCrmOpportunityDispatchReference
} from "@/server/validation/unified-crm-opportunity-link";

function actor(roles: string[], id: string): AuthenticatedUser {
  return {
    id,
    name: "CRM User",
    email: `${id}@example.test`,
    isActive: true,
    roles,
    duties: { direct: [], roleDefaults: [], all: [] }
  };
}

const manager = actor(["General Manager"], "manager-1");
const seller = actor(["Salesperson"], "seller-1");

const source = {
  sourceType: "CUSTOMER_LEAD" as const,
  sourceRecordId: "lead-1",
  customerId: "customer-1",
  organizationId: "org-a",
  ownerUserId: seller.id
};

function bridgeRequest(overrides: Record<string, unknown>) {
  return {
    contractVersion: "ucrm.opportunity/v1",
    correlationId: "corr-1",
    expectedVersion: 4,
    idempotencyKey: "idem-1",
    opportunityId: "opp_123456",
    organizationId: "org-a",
    purpose: "Use an owning-domain bridge without copying operational truth.",
    source,
    ...overrides
  };
}

function bridgeReceipt(overrides: Record<string, unknown>) {
  return {
    contractVersion: "ucrm.opportunity/v1",
    correlationId: "corr-1",
    failure: null,
    idempotencyKey: "idem-1",
    opportunityId: "opp_123456",
    organizationId: "org-a",
    state: "PENDING",
    target: null,
    ...overrides
  };
}

describe("Unified CRM appointment and dispatch bridge foundation", () => {
  it.each([
    [manager, "link-appointment", "ORGANIZATION"],
    [manager, "link-dispatch", "ORGANIZATION"],
    [seller, "link-appointment", "OWNER"],
    [seller, "link-dispatch", "OWNER"]
  ] as const)(
    "allows governed %s %s actions while preserving the read scope",
    (viewer, action, scopeKind) => {
      const decision = evaluateUnifiedCrmOpportunityPolicy(viewer, {
        action,
        mode: "REVIEW"
      });

      expect(decision).toMatchObject({
        allowed: true,
        reason: "ALLOWED",
        recordScope: { kind: scopeKind },
        capabilities: {
          linkAppointment: true,
          linkDispatch: true
        }
      });
    }
  );

  it.each(["link-appointment", "link-dispatch"] as const)(
    "fails closed before bridge execution when %s is feature-off",
    (action) => {
      expect(
        evaluateUnifiedCrmOpportunityPolicy(manager, { action, mode: "OFF" })
      ).toMatchObject({
        allowed: false,
        mode: "OFF",
        reason: "OPPORTUNITY_OFF",
        capabilities: {
          linkAppointment: false,
          linkDispatch: false
        }
      });
    }
  );

  it("normalizes a stage-neutral appointment request with stable retry and target identity", () => {
    const request = normalizeUnifiedCrmOpportunityAppointmentBridgeRequest(
      bridgeRequest({
        correlationId: "corr-appointment-1",
        idempotencyKey: "idem-appointment-1",
        intent: "LINK_EXISTING_APPOINTMENT",
        purpose: "Link the authoritative appointment without copying it.",
        target: { appointmentId: "appointment-1", expectedTargetVersion: 7 },
        targetType: "APPOINTMENT"
      })
    );

    expect(request).toEqual({
      contractVersion: "ucrm.opportunity/v1",
      correlationId: "corr-appointment-1",
      expectedVersion: 4,
      idempotencyKey: "idem-appointment-1",
      intent: "LINK_EXISTING_APPOINTMENT",
      opportunityId: "opp_123456",
      organizationId: "org-a",
      purpose: "Link the authoritative appointment without copying it.",
      source,
      target: { appointmentId: "appointment-1", expectedTargetVersion: 7 },
      targetType: "APPOINTMENT"
    });
    expect(request).not.toHaveProperty("stage");
    expect(request).not.toHaveProperty("appointment");

    expect(
      normalizeUnifiedCrmOpportunityAppointmentBridgeRequest(
        bridgeRequest({
          intent: "CREATE_DRAFT_APPOINTMENT",
          target: null,
          targetType: "APPOINTMENT"
        })
      )
    ).toMatchObject({ intent: "CREATE_DRAFT_APPOINTMENT", target: null });
  });

  it("normalizes a dispatch handoff without pretending to create operational work", () => {
    const request = normalizeUnifiedCrmOpportunityDispatchBridgeRequest(
      bridgeRequest({
        correlationId: "corr-dispatch-1",
        expectedVersion: 5,
        idempotencyKey: "idem-dispatch-1",
        intent: "LINK_REPAIR_JOB",
        purpose: "Link existing authorized repair work.",
        target: {
          expectedTargetVersion: 9,
          repairJobId: "repair-job-1",
          targetKind: "REPAIR_JOB"
        },
        targetType: "DISPATCH"
      })
    );

    expect(request).toMatchObject({
      correlationId: "corr-dispatch-1",
      expectedVersion: 5,
      idempotencyKey: "idem-dispatch-1",
      intent: "LINK_REPAIR_JOB",
      organizationId: "org-a",
      target: {
        expectedTargetVersion: 9,
        repairJobId: "repair-job-1",
        targetKind: "REPAIR_JOB"
      },
      targetType: "DISPATCH"
    });
    expect(request).not.toHaveProperty("repairJob");
    expect(request).not.toHaveProperty("technicianUserId");
    expect(request).not.toHaveProperty("scheduledStartAt");

    expect(
      normalizeUnifiedCrmOpportunityDispatchBridgeRequest(
        bridgeRequest({
          intent: "OPEN_AUTHORITATIVE_DISPATCH",
          target: null,
          targetType: "DISPATCH"
        })
      )
    ).toMatchObject({ intent: "OPEN_AUTHORITATIVE_DISPATCH", target: null });
  });

  it("accepts only local owning-domain appointment and dispatch locations", () => {
    expect(
      normalizeUnifiedCrmOpportunityAppointmentReference({
        appointmentId: " appointment-1 ",
        appointmentNumber: " APT-1001 ",
        domain: "APPOINTMENTS",
        href: " /appointments?view=board&appointment=APT-1001 ",
        organizationId: " org-a ",
        version: 7
      })
    ).toEqual({
      appointmentId: "appointment-1",
      appointmentNumber: "APT-1001",
      domain: "APPOINTMENTS",
      href: "/appointments?view=board&appointment=APT-1001",
      organizationId: "org-a",
      version: 7
    });

    expect(
      normalizeUnifiedCrmOpportunityDispatchReference({
        domain: "DISPATCH",
        href: "/vehicles/shop-dispatch?repairJobId=job-1",
        repairJobId: "job-1",
        repairJobNumber: "JOB-1001",
        repairOrderId: null,
        repairOrderNumber: null,
        organizationId: "org-a",
        version: 9
      })
    ).toMatchObject({
      domain: "DISPATCH",
      repairJobId: "job-1",
      repairJobNumber: "JOB-1001"
    });

    expect(() =>
      normalizeUnifiedCrmOpportunityAppointmentReference({
        appointmentId: "appointment-1",
        appointmentNumber: "APT-1001",
        domain: "DISPATCH",
        href: "/appointments",
        organizationId: "org-a",
        version: 1
      })
    ).toThrow("Appointment domain is invalid.");
    expect(() =>
      normalizeUnifiedCrmOpportunityDispatchReference({
        domain: "DISPATCH",
        href: "//evil.example/vehicles/shop-dispatch",
        repairJobId: "job-1",
        organizationId: "org-a",
        version: 1
      })
    ).toThrow("Href is invalid.");
  });

  it("rejects a dispatch reference that does not identify existing operational work", () => {
    expect(() =>
      normalizeUnifiedCrmOpportunityDispatchReference({
        domain: "DISPATCH",
        href: "/vehicles/shop-dispatch",
        repairJobId: null,
        repairJobNumber: null,
        repairOrderId: null,
        repairOrderNumber: null,
        organizationId: "org-a",
        version: 0
      })
    ).toThrow("Dispatch reference must identify existing operational work.");
  });

  it("rejects overlong dispatch identifiers instead of truncating stable identity", () => {
    expect(() =>
      normalizeUnifiedCrmOpportunityDispatchReference({
        domain: "DISPATCH",
        href: "/vehicles/shop-dispatch",
        repairJobId: `job-${"x".repeat(121)}`,
        repairJobNumber: "JOB-1001",
        repairOrderId: null,
        repairOrderNumber: null,
        organizationId: "org-a",
        version: 1
      })
    ).toThrow("Reference must be 120 characters or fewer.");
  });

  it("requires request intent and target shape to agree", () => {
    expect(() =>
      normalizeUnifiedCrmOpportunityAppointmentBridgeRequest(
        bridgeRequest({
          intent: "CREATE_DRAFT_APPOINTMENT",
          target: { appointmentId: "appointment-1", expectedTargetVersion: 1 },
          targetType: "APPOINTMENT"
        })
      )
    ).toThrow("Draft appointment bridge cannot select an existing target.");

    expect(() =>
      normalizeUnifiedCrmOpportunityDispatchBridgeRequest(
        bridgeRequest({
          intent: "LINK_REPAIR_ORDER",
          target: {
            expectedTargetVersion: 1,
            repairJobId: "repair-job-1",
            targetKind: "REPAIR_JOB"
          },
          targetType: "DISPATCH"
        })
      )
    ).toThrow("Repair-order bridge target contains unsupported fields.");
  });

  it("accepts a receipt only with a same-organization authoritative target", () => {
    expect(
      normalizeUnifiedCrmOpportunityAppointmentBridgeReceipt(
        bridgeReceipt({
          state: "ACCEPTED",
          target: {
            appointmentId: "appointment-1",
            appointmentNumber: "APT-1001",
            domain: "APPOINTMENTS",
            href: "/appointments?appointment=appointment-1",
            organizationId: "org-a",
            version: 7
          }
        })
      )
    ).toMatchObject({
      failure: null,
      state: "ACCEPTED",
      target: { appointmentId: "appointment-1", organizationId: "org-a", version: 7 }
    });

    expect(() =>
      normalizeUnifiedCrmOpportunityDispatchBridgeReceipt(
        bridgeReceipt({
          state: "ACCEPTED",
          target: {
            domain: "DISPATCH",
            href: "/vehicles/shop-dispatch?repairJobId=repair-job-1",
            organizationId: "org-b",
            repairJobId: "repair-job-1",
            repairJobNumber: "JOB-1001",
            repairOrderId: null,
            repairOrderNumber: null,
            version: 9
          }
        })
      )
    ).toThrow("Bridge receipt target organization is invalid.");
  });

  it("keeps incomplete and unsuccessful receipts fail-closed", () => {
    expect(() =>
      normalizeUnifiedCrmOpportunityAppointmentBridgeReceipt(
        bridgeReceipt({
          state: "PENDING",
          target: {
            appointmentId: "appointment-1",
            appointmentNumber: "APT-1001",
            domain: "APPOINTMENTS",
            href: "/appointments",
            organizationId: "org-a",
            version: 7
          }
        })
      )
    ).toThrow("Incomplete bridge receipt cannot expose a target or failure.");

    expect(
      normalizeUnifiedCrmOpportunityDispatchBridgeReceipt(
        bridgeReceipt({
          failure: { code: "OWNER_COMMAND_UNAVAILABLE", retryable: true },
          state: "FAILED"
        })
      )
    ).toMatchObject({
      failure: { code: "OWNER_COMMAND_UNAVAILABLE", retryable: true },
      state: "FAILED",
      target: null
    });

    expect(() =>
      normalizeUnifiedCrmOpportunityDispatchBridgeReceipt(
        bridgeReceipt({
          failure: { code: "OWNER_COMMAND_REJECTED", retryable: true },
          state: "REJECTED"
        })
      )
    ).toThrow("Opportunity bridge retryability is invalid.");
  });
});
