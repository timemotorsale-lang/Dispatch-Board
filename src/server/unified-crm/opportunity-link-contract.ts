import type {
  UnifiedCrmOpportunityBridgeReceipt,
  UnifiedCrmOpportunityBridgeRequest
} from "@/server/unified-crm/opportunity-contract";

export type UnifiedCrmOpportunityTaskReference = {
  domain: "TASKS";
  href: string;
  taskId: string;
};

export type UnifiedCrmOpportunityAppointmentReference = {
  appointmentId: string;
  domain: "APPOINTMENTS";
  href: string;
};

export type UnifiedCrmOpportunityDispatchReference = {
  dispatchRecordId: string;
  domain: "DISPATCH";
  href: string;
};

export type UnifiedCrmOpportunityTaskBridgeRequest = UnifiedCrmOpportunityBridgeRequest & {
  targetType: "TASK";
};

export type UnifiedCrmOpportunityAppointmentBridgeRequest = UnifiedCrmOpportunityBridgeRequest & {
  targetType: "APPOINTMENT";
};

export type UnifiedCrmOpportunityDispatchBridgeRequest = UnifiedCrmOpportunityBridgeRequest & {
  targetType: "DISPATCH";
};

export type UnifiedCrmOpportunityTaskBridgeReceipt = UnifiedCrmOpportunityBridgeReceipt<UnifiedCrmOpportunityTaskReference>;
export type UnifiedCrmOpportunityAppointmentBridgeReceipt = UnifiedCrmOpportunityBridgeReceipt<UnifiedCrmOpportunityAppointmentReference>;
export type UnifiedCrmOpportunityDispatchBridgeReceipt = UnifiedCrmOpportunityBridgeReceipt<UnifiedCrmOpportunityDispatchReference>;
