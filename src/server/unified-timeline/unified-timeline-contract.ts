export const UNIFIED_TIMELINE_EVENT_TYPES = [
  "created",
  "updated",
  "contacted",
  "assigned",
  "completed",
  "delayed",
  "escalated",
  "resolved",
  "uploaded",
  "approved",
  "reopened",
  "carried_over"
] as const;

export type UnifiedTimelineEventType = (typeof UNIFIED_TIMELINE_EVENT_TYPES)[number];

export const UNIFIED_TIMELINE_SOURCES = [
  "customer_360",
  "vehicle_360",
  "repair_order_workbench",
  "staff_workbook",
  "manager_command_center",
  "crm",
  "tasks",
  "appointments",
  "sales",
  "customer_resolutions",
  "vehicle_evidence",
  "workbook"
] as const;

export type UnifiedTimelineSource = (typeof UNIFIED_TIMELINE_SOURCES)[number];

export type UnifiedTimelineInputEvent = {
  id: string;
  type: UnifiedTimelineEventType;
  source: UnifiedTimelineSource;
  title: string;
  detail?: string | null;
  occurredAt: string | Date;
  actorName?: string | null;
  sourceHref?: string | null;
  sourceLabel?: string | null;
  sourceRecordId?: string | null;
};

export type UnifiedTimelineEvent = Omit<UnifiedTimelineInputEvent, "occurredAt"> & {
  occurredAt: string;
};

export type UnifiedTimelineFilterOption<T extends string> = {
  value: T;
  count: number;
  selected: boolean;
};

export type UnifiedTimelineViewModel = {
  items: UnifiedTimelineEvent[];
  itemCount: number;
  filters: {
    sources: UnifiedTimelineFilterOption<UnifiedTimelineSource>[];
    types: UnifiedTimelineFilterOption<UnifiedTimelineEventType>[];
  };
  page: {
    limit: number;
    hasMore: boolean;
  };
};
