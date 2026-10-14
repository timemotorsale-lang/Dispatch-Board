import type {
  UnifiedCrmOpportunityBridgeReceipt,
  UnifiedCrmOpportunityBridgeRequest
} from "@/server/unified-crm/opportunity-contract";

export type UnifiedCrmOpportunityTaskBridgeIntent =
  | "CREATE_GOVERNED_TASK"
  | "LINK_EXISTING_TASK";

export type UnifiedCrmOpportunityAppointmentBridgeIntent =
  | "CREATE_DRAFT_APPOINTMENT"
  | "LINK_EXISTING_APPOINTMENT";

export type UnifiedCrmOpportunityDispatchBridgeIntent =
  | "LINK_REPAIR_ORDER"
  | "LINK_REPAIR_JOB"
  | "OPEN_AUTHORITATIVE_DISPATCH";

export type UnifiedCrmOpportunityTaskReference = {
  domain: "TASKS";
  href: string;
  taskId: string;
  taskNumber: string | null;
};

export type UnifiedCrmOpportunityAppointmentReference = {
  appointmentId: string;
  appointmentNumber: string;
  domain: "APPOINTMENTS";
  href: string;
  organizationId: string;
  version: number;
};

export type UnifiedCrmOpportunityDispatchReference = {
  domain: "DISPATCH";
  href: string;
  repairJobId: string | null;
  repairJobNumber: string | null;
  repairOrderId: string | null;
  repairOrderNumber: string | null;
  organizationId: string;
  version: number;
};

export type UnifiedCrmOpportunityAppointmentBridgeTarget = {
  appointmentId: string;
  expectedTargetVersion: number;
};

export type UnifiedCrmOpportunityDispatchBridgeTarget =
  | { expectedTargetVersion: number; repairOrderId: string; targetKind: "REPAIR_ORDER" }
  | { expectedTargetVersion: number; repairJobId: string; targetKind: "REPAIR_JOB" };

export type UnifiedCrmOpportunityBridgeFailureCode =
  | "TARGET_UNAVAILABLE"
  | "TARGET_VERSION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "OWNER_COMMAND_UNAVAILABLE"
  | "OWNER_COMMAND_REJECTED";

export type UnifiedCrmOpportunityBridgeFailure = {
  code: UnifiedCrmOpportunityBridgeFailureCode;
  retryable: boolean;
};

export type UnifiedCrmOpportunityStageNeutralBridgeReceipt<TTargetReference> =
  | (Omit<UnifiedCrmOpportunityBridgeReceipt<TTargetReference>, "state" | "target"> & {
      failure: null;
      state: "ACCEPTED";
      target: TTargetReference;
    })
  | (Omit<UnifiedCrmOpportunityBridgeReceipt<TTargetReference>, "state" | "target"> & {
      failure: null;
      state: "REQUESTED" | "PENDING";
      target: null;
    })
  | (Omit<UnifiedCrmOpportunityBridgeReceipt<TTargetReference>, "state" | "target"> & {
      failure: UnifiedCrmOpportunityBridgeFailure;
      state: "REJECTED" | "FAILED";
      target: null;
    });

export type UnifiedCrmOpportunityStageNeutralBridgeOutcome<TTargetReference> =
  | { failure?: never; state: "ACCEPTED"; target: TTargetReference }
  | { failure?: never; state: "REQUESTED" | "PENDING"; target?: null }
  | { failure: UnifiedCrmOpportunityBridgeFailure; state: "REJECTED" | "FAILED"; target?: null };

export type UnifiedCrmOpportunityTaskBridgeRequest = UnifiedCrmOpportunityBridgeRequest & {
  intent: UnifiedCrmOpportunityTaskBridgeIntent;
  targetType: "TASK";
};

export type UnifiedCrmOpportunityAppointmentBridgeRequest =
  | (UnifiedCrmOpportunityBridgeRequest & {
      intent: "CREATE_DRAFT_APPOINTMENT";
      target: null;
      targetType: "APPOINTMENT";
    })
  | (UnifiedCrmOpportunityBridgeRequest & {
      intent: "LINK_EXISTING_APPOINTMENT";
      target: UnifiedCrmOpportunityAppointmentBridgeTarget;
      targetType: "APPOINTMENT";
    });

export type UnifiedCrmOpportunityDispatchBridgeRequest =
  | (UnifiedCrmOpportunityBridgeRequest & {
      intent: "OPEN_AUTHORITATIVE_DISPATCH";
      target: null;
      targetType: "DISPATCH";
    })
  | (UnifiedCrmOpportunityBridgeRequest & {
      intent: "LINK_REPAIR_ORDER";
      target: Extract<UnifiedCrmOpportunityDispatchBridgeTarget, { targetKind: "REPAIR_ORDER" }>;
      targetType: "DISPATCH";
    })
  | (UnifiedCrmOpportunityBridgeRequest & {
      intent: "LINK_REPAIR_JOB";
      target: Extract<UnifiedCrmOpportunityDispatchBridgeTarget, { targetKind: "REPAIR_JOB" }>;
      targetType: "DISPATCH";
    });

export type UnifiedCrmOpportunityTaskBridgeReceipt = UnifiedCrmOpportunityBridgeReceipt<UnifiedCrmOpportunityTaskReference>;
export type UnifiedCrmOpportunityAppointmentBridgeReceipt = UnifiedCrmOpportunityStageNeutralBridgeReceipt<UnifiedCrmOpportunityAppointmentReference>;
export type UnifiedCrmOpportunityDispatchBridgeReceipt = UnifiedCrmOpportunityStageNeutralBridgeReceipt<UnifiedCrmOpportunityDispatchReference>;
