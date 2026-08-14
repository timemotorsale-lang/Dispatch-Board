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
};

export type UnifiedCrmOpportunityDispatchReference = {
  domain: "DISPATCH";
  href: string;
  repairJobId: string | null;
  repairJobNumber: string | null;
  repairOrderId: string | null;
  repairOrderNumber: string | null;
};

export type UnifiedCrmOpportunityTaskBridgeRequest = UnifiedCrmOpportunityBridgeRequest & {
  intent: UnifiedCrmOpportunityTaskBridgeIntent;
  targetType: "TASK";
};

export type UnifiedCrmOpportunityAppointmentBridgeRequest = UnifiedCrmOpportunityBridgeRequest & {
  intent: UnifiedCrmOpportunityAppointmentBridgeIntent;
  targetType: "APPOINTMENT";
};

export type UnifiedCrmOpportunityDispatchBridgeRequest = UnifiedCrmOpportunityBridgeRequest & {
  intent: UnifiedCrmOpportunityDispatchBridgeIntent;
  targetType: "DISPATCH";
};

export type UnifiedCrmOpportunityTaskBridgeReceipt = UnifiedCrmOpportunityBridgeReceipt<UnifiedCrmOpportunityTaskReference>;
export type UnifiedCrmOpportunityAppointmentBridgeReceipt = UnifiedCrmOpportunityBridgeReceipt<UnifiedCrmOpportunityAppointmentReference>;
export type UnifiedCrmOpportunityDispatchBridgeReceipt = UnifiedCrmOpportunityBridgeReceipt<UnifiedCrmOpportunityDispatchReference>;
