import { describe, expect, it } from "vitest";

import {
  buildUnifiedCrmOpportunityAppointmentBridgeReceipt,
  buildUnifiedCrmOpportunityAppointmentBridgeRequest,
  buildUnifiedCrmOpportunityDispatchBridgeReceipt,
  buildUnifiedCrmOpportunityDispatchBridgeRequest,
  buildUnifiedCrmOpportunityTaskBridgeReceipt,
  buildUnifiedCrmOpportunityTaskBridgeRequest
} from "@/server/unified-crm/opportunity-link-builders";

const access = {
  actorUserId: "manager-1",
  capabilities: { read: true, create: false, transition: false, linkTask: false, linkAppointment: false, linkDispatch: false },
  fallbackHref: "/manager-workspace",
  mode: "REVIEW" as const,
  organizationId: "org-a",
  recordScope: { kind: "ORGANIZATION" as const },
  workspace: "MANAGEMENT" as const
};

const source = {
  sourceType: "CUSTOMER_LEAD" as const,
  sourceRecordId: "lead-1",
  customerId: "customer-1",
  organizationId: "org-a",
  ownerUserId: "seller-1"
};

describe("Unified CRM opportunity link builders", () => {
  it("builds task, appointment, and dispatch bridge requests from access context", () => {
    expect(buildUnifiedCrmOpportunityTaskBridgeRequest(access, {
      correlationId: "corr-1",
      expectedVersion: 0,
      idempotencyKey: "idem-1",
      intent: "CREATE_GOVERNED_TASK",
      opportunityId: "opp_123456" as never,
      purpose: "Create a governed follow-up task.",
      source
    })).toMatchObject({
      targetType: "TASK",
      intent: "CREATE_GOVERNED_TASK",
      organizationId: "org-a"
    });

    expect(buildUnifiedCrmOpportunityAppointmentBridgeRequest(access, {
      correlationId: "corr-2",
      expectedVersion: 1,
      idempotencyKey: "idem-2",
      intent: "CREATE_DRAFT_APPOINTMENT",
      opportunityId: "opp_123456" as never,
      purpose: "Create an appointment draft.",
      source
    })).toMatchObject({
      targetType: "APPOINTMENT",
      intent: "CREATE_DRAFT_APPOINTMENT"
    });

    expect(buildUnifiedCrmOpportunityDispatchBridgeRequest(access, {
      correlationId: "corr-3",
      expectedVersion: 2,
      idempotencyKey: "idem-3",
      intent: "LINK_REPAIR_ORDER",
      opportunityId: "opp_123456" as never,
      purpose: "Link existing repair work.",
      source,
      target: {
        expectedTargetVersion: 3,
        repairOrderId: "repair-order-1",
        targetKind: "REPAIR_ORDER"
      }
    })).toMatchObject({
      targetType: "DISPATCH",
      intent: "LINK_REPAIR_ORDER"
    });
  });

  it("builds typed receipts without changing correlation identity", () => {
    const taskRequest = buildUnifiedCrmOpportunityTaskBridgeRequest(access, {
      correlationId: "corr-1",
      expectedVersion: 0,
      idempotencyKey: "idem-1",
      intent: "LINK_EXISTING_TASK",
      opportunityId: "opp_123456" as never,
      purpose: "Link an existing task.",
      source
    });
    expect(buildUnifiedCrmOpportunityTaskBridgeReceipt(taskRequest, "ACCEPTED", {
      domain: "TASKS",
      href: "/tasks/task-1",
      taskId: "task-1",
      taskNumber: null
    })).toMatchObject({ correlationId: "corr-1", state: "ACCEPTED", target: { taskId: "task-1" } });

    const appointmentRequest = buildUnifiedCrmOpportunityAppointmentBridgeRequest(access, {
      correlationId: "corr-2",
      expectedVersion: 1,
      idempotencyKey: "idem-2",
      intent: "LINK_EXISTING_APPOINTMENT",
      opportunityId: "opp_123456" as never,
      purpose: "Link an existing appointment.",
      source,
      target: {
        appointmentId: "appointment-1",
        expectedTargetVersion: 2
      }
    });
    expect(buildUnifiedCrmOpportunityAppointmentBridgeReceipt(appointmentRequest, {
      state: "PENDING",
      target: null
    })).toMatchObject({ correlationId: "corr-2", failure: null, state: "PENDING", target: null });

    const dispatchRequest = buildUnifiedCrmOpportunityDispatchBridgeRequest(access, {
      correlationId: "corr-3",
      expectedVersion: 2,
      idempotencyKey: "idem-3",
      intent: "OPEN_AUTHORITATIVE_DISPATCH",
      opportunityId: "opp_123456" as never,
      purpose: "Open existing dispatch flow.",
      source
    });
    expect(buildUnifiedCrmOpportunityDispatchBridgeReceipt(dispatchRequest, {
      failure: { code: "OWNER_COMMAND_UNAVAILABLE", retryable: true },
      state: "FAILED",
      target: null
    })).toMatchObject({
      correlationId: "corr-3",
      failure: { code: "OWNER_COMMAND_UNAVAILABLE", retryable: true },
      state: "FAILED",
      target: null
    });
  });
});
