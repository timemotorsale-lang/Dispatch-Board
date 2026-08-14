import type {
  UnifiedCrmOpportunityAccessContext,
  UnifiedCrmOpportunityBridgeReceipt,
  UnifiedCrmOpportunityBridgeRequest,
  UnifiedCrmOpportunityBridgeState,
  UnifiedCrmOpportunityId,
  UnifiedCrmOpportunitySourceReference
} from "@/server/unified-crm/opportunity-contract";
import type {
  UnifiedCrmOpportunityAppointmentBridgeReceipt,
  UnifiedCrmOpportunityAppointmentBridgeRequest,
  UnifiedCrmOpportunityAppointmentBridgeTarget,
  UnifiedCrmOpportunityAppointmentReference,
  UnifiedCrmOpportunityDispatchBridgeReceipt,
  UnifiedCrmOpportunityDispatchBridgeRequest,
  UnifiedCrmOpportunityDispatchBridgeTarget,
  UnifiedCrmOpportunityDispatchReference,
  UnifiedCrmOpportunityStageNeutralBridgeOutcome,
  UnifiedCrmOpportunityTaskBridgeIntent,
  UnifiedCrmOpportunityTaskBridgeReceipt,
  UnifiedCrmOpportunityTaskBridgeRequest,
  UnifiedCrmOpportunityTaskReference
} from "@/server/unified-crm/opportunity-link-contract";
import {
  normalizeUnifiedCrmOpportunityAppointmentBridgeReceipt,
  normalizeUnifiedCrmOpportunityAppointmentBridgeRequest,
  normalizeUnifiedCrmOpportunityDispatchBridgeReceipt,
  normalizeUnifiedCrmOpportunityDispatchBridgeRequest
} from "@/server/validation/unified-crm-opportunity-link";

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
  input: BaseRequestInput & (
    | { intent: "CREATE_DRAFT_APPOINTMENT"; target?: null }
    | { intent: "LINK_EXISTING_APPOINTMENT"; target: UnifiedCrmOpportunityAppointmentBridgeTarget }
  )
): UnifiedCrmOpportunityAppointmentBridgeRequest {
  return normalizeUnifiedCrmOpportunityAppointmentBridgeRequest({
    ...baseRequest(access, input),
    intent: input.intent,
    target: input.target ?? null,
    targetType: "APPOINTMENT"
  });
}

export function buildUnifiedCrmOpportunityDispatchBridgeRequest(
  access: UnifiedCrmOpportunityAccessContext,
  input: BaseRequestInput & (
    | { intent: "OPEN_AUTHORITATIVE_DISPATCH"; target?: null }
    | { intent: "LINK_REPAIR_ORDER"; target: Extract<UnifiedCrmOpportunityDispatchBridgeTarget, { targetKind: "REPAIR_ORDER" }> }
    | { intent: "LINK_REPAIR_JOB"; target: Extract<UnifiedCrmOpportunityDispatchBridgeTarget, { targetKind: "REPAIR_JOB" }> }
  )
): UnifiedCrmOpportunityDispatchBridgeRequest {
  return normalizeUnifiedCrmOpportunityDispatchBridgeRequest({
    ...baseRequest(access, input),
    intent: input.intent,
    target: input.target ?? null,
    targetType: "DISPATCH"
  });
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
  outcome: UnifiedCrmOpportunityStageNeutralBridgeOutcome<UnifiedCrmOpportunityAppointmentReference>
): UnifiedCrmOpportunityAppointmentBridgeReceipt {
  return normalizeUnifiedCrmOpportunityAppointmentBridgeReceipt({
    contractVersion: "ucrm.opportunity/v1",
    correlationId: request.correlationId,
    idempotencyKey: request.idempotencyKey,
    opportunityId: request.opportunityId,
    organizationId: request.organizationId,
    failure: outcome.failure ?? null,
    state: outcome.state,
    target: outcome.target ?? null
  });
}

export function buildUnifiedCrmOpportunityDispatchBridgeReceipt(
  request: UnifiedCrmOpportunityDispatchBridgeRequest,
  outcome: UnifiedCrmOpportunityStageNeutralBridgeOutcome<UnifiedCrmOpportunityDispatchReference>
): UnifiedCrmOpportunityDispatchBridgeReceipt {
  return normalizeUnifiedCrmOpportunityDispatchBridgeReceipt({
    contractVersion: "ucrm.opportunity/v1",
    correlationId: request.correlationId,
    idempotencyKey: request.idempotencyKey,
    opportunityId: request.opportunityId,
    organizationId: request.organizationId,
    failure: outcome.failure ?? null,
    state: outcome.state,
    target: outcome.target ?? null
  });
}
