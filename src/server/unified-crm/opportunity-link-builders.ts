import type {
  UnifiedCrmOpportunityAccessContext,
  UnifiedCrmOpportunityBridgeReceipt,
  UnifiedCrmOpportunityBridgeRequest,
  UnifiedCrmOpportunityBridgeState,
  UnifiedCrmOpportunityId,
  UnifiedCrmOpportunitySourceReference
} from "@/server/unified-crm/opportunity-contract";
import type {
  UnifiedCrmOpportunityAppointmentBridgeIntent,
  UnifiedCrmOpportunityAppointmentBridgeReceipt,
  UnifiedCrmOpportunityAppointmentBridgeRequest,
  UnifiedCrmOpportunityAppointmentReference,
  UnifiedCrmOpportunityDispatchBridgeIntent,
  UnifiedCrmOpportunityDispatchBridgeReceipt,
  UnifiedCrmOpportunityDispatchBridgeRequest,
  UnifiedCrmOpportunityDispatchReference,
  UnifiedCrmOpportunityTaskBridgeIntent,
  UnifiedCrmOpportunityTaskBridgeReceipt,
  UnifiedCrmOpportunityTaskBridgeRequest,
  UnifiedCrmOpportunityTaskReference
} from "@/server/unified-crm/opportunity-link-contract";

type BaseRequestInput = {
  correlationId: string;
  expectedVersion: number;
  idempotencyKey: string;
  opportunityId: UnifiedCrmOpportunityId;
  purpose: string;
  source: UnifiedCrmOpportunitySourceReference | null;
};

function baseRequest(
  access: UnifiedCrmOpportunityAccessContext,
  input: BaseRequestInput
): UnifiedCrmOpportunityBridgeRequest {
  return {
    contractVersion: "ucrm.opportunity/v1",
    correlationId: input.correlationId,
    expectedVersion: input.expectedVersion,
    idempotencyKey: input.idempotencyKey,
    opportunityId: input.opportunityId,
    organizationId: access.organizationId,
    purpose: input.purpose,
    source: input.source
  };
}

function baseReceipt<TTargetReference>(
  request: UnifiedCrmOpportunityBridgeRequest,
  state: UnifiedCrmOpportunityBridgeState,
  target: TTargetReference | null
): UnifiedCrmOpportunityBridgeReceipt<TTargetReference> {
  return {
    contractVersion: "ucrm.opportunity/v1",
    correlationId: request.correlationId,
    idempotencyKey: request.idempotencyKey,
    opportunityId: request.opportunityId,
    organizationId: request.organizationId,
    state,
    target
  };
}

export function buildUnifiedCrmOpportunityTaskBridgeRequest(
  access: UnifiedCrmOpportunityAccessContext,
  input: BaseRequestInput & { intent: UnifiedCrmOpportunityTaskBridgeIntent }
): UnifiedCrmOpportunityTaskBridgeRequest {
  return {
    ...baseRequest(access, input),
    intent: input.intent,
    targetType: "TASK"
  };
}

export function buildUnifiedCrmOpportunityAppointmentBridgeRequest(
  access: UnifiedCrmOpportunityAccessContext,
  input: BaseRequestInput & { intent: UnifiedCrmOpportunityAppointmentBridgeIntent }
): UnifiedCrmOpportunityAppointmentBridgeRequest {
  return {
    ...baseRequest(access, input),
    intent: input.intent,
    targetType: "APPOINTMENT"
  };
}

export function buildUnifiedCrmOpportunityDispatchBridgeRequest(
  access: UnifiedCrmOpportunityAccessContext,
  input: BaseRequestInput & { intent: UnifiedCrmOpportunityDispatchBridgeIntent }
): UnifiedCrmOpportunityDispatchBridgeRequest {
  return {
    ...baseRequest(access, input),
    intent: input.intent,
    targetType: "DISPATCH"
  };
}

export function buildUnifiedCrmOpportunityTaskBridgeReceipt(
  request: UnifiedCrmOpportunityTaskBridgeRequest,
  state: UnifiedCrmOpportunityBridgeState,
  target: UnifiedCrmOpportunityTaskReference | null
): UnifiedCrmOpportunityTaskBridgeReceipt {
  return baseReceipt(request, state, target);
}

export function buildUnifiedCrmOpportunityAppointmentBridgeReceipt(
  request: UnifiedCrmOpportunityAppointmentBridgeRequest,
  state: UnifiedCrmOpportunityBridgeState,
  target: UnifiedCrmOpportunityAppointmentReference | null
): UnifiedCrmOpportunityAppointmentBridgeReceipt {
  return baseReceipt(request, state, target);
}

export function buildUnifiedCrmOpportunityDispatchBridgeReceipt(
  request: UnifiedCrmOpportunityDispatchBridgeRequest,
  state: UnifiedCrmOpportunityBridgeState,
  target: UnifiedCrmOpportunityDispatchReference | null
): UnifiedCrmOpportunityDispatchBridgeReceipt {
  return baseReceipt(request, state, target);
}
