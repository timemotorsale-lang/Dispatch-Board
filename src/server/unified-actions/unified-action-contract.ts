export const UNIFIED_ACTION_CONTRACT_VERSION = "unified-action/v1" as const;

export type UnifiedActionStatus = "not_started" | "in_progress" | "blocked" | "waiting" | "done" | "cancelled";
export type UnifiedActionPriority = "critical" | "high" | "medium" | "low";
export type UnifiedActionDueState = "completed" | "overdue" | "due_today" | "upcoming" | "unscheduled";
export type UnifiedActionSourceModule =
  | "CRM"
  | "WORKBOOK"
  | "VEHICLE_OPERATIONS"
  | "REPAIR_ORDER"
  | "TASKS"
  | "APPOINTMENTS"
  | "SALES"
  | "INVENTORY"
  | "COMMAND_CENTER";

export type UnifiedActionType =
  | "call_customer"
  | "send_message"
  | "add_note"
  | "follow_up"
  | "schedule_appointment"
  | "update_repair_order"
  | "review_promise"
  | "complete_checklist"
  | "request_support"
  | "resolve_blocker"
  | "upload_document"
  | "carry_over"
  | "manager_review";

export type UnifiedActionOwner = {
  id: string | null;
  name: string;
};

export type UnifiedActionSource = {
  module: UnifiedActionSourceModule;
  recordId: string;
  label: string;
  href: string;
};

export type UnifiedActionRelationships = {
  appointmentId?: string | null;
  customerId?: string | null;
  dealId?: string | null;
  repairOrderId?: string | null;
  taskId?: string | null;
  vehicleId?: string | null;
};

export type UnifiedActionAudit = {
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  generatedBy: "source_record" | "manual_entry" | "automation_rule" | "workbook_recovery";
};

export type UnifiedActionModel = {
  contractVersion: typeof UNIFIED_ACTION_CONTRACT_VERSION;
  id: string;
  title: string;
  description: string;
  actionType: UnifiedActionType;
  owner: UnifiedActionOwner;
  status: UnifiedActionStatus;
  priority: UnifiedActionPriority;
  dueAt: string | null;
  dueState: UnifiedActionDueState;
  source: UnifiedActionSource;
  relationships: UnifiedActionRelationships;
  reportWorthy: boolean;
  businessImpact: string;
  nextRecommendedAction: string;
  audit: UnifiedActionAudit;
};

