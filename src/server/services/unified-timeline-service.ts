import {
  UNIFIED_TIMELINE_EVENT_TYPES,
  UNIFIED_TIMELINE_SOURCES,
  type UnifiedTimelineEvent,
  type UnifiedTimelineEventType,
  type UnifiedTimelineInputEvent,
  type UnifiedTimelineSource,
  type UnifiedTimelineViewModel
} from "@/server/unified-timeline/unified-timeline-contract";

type TimelineLike = {
  id: string;
  occurredAt: string | Date;
};

type TimelineFilters = {
  limit?: number;
  source?: UnifiedTimelineSource;
  type?: UnifiedTimelineEventType;
};

function time(value: string | Date) {
  const milliseconds = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(milliseconds) ? milliseconds : 0;
}

export function compareUnifiedTimelineItems<T extends TimelineLike>(left: T, right: T) {
  const byDate = time(right.occurredAt) - time(left.occurredAt);
  return byDate !== 0 ? byDate : right.id.localeCompare(left.id);
}

export function orderUnifiedTimelineItems<T extends TimelineLike>(items: readonly T[], limit = items.length) {
  return [...items].sort(compareUnifiedTimelineItems).slice(0, Math.max(0, limit));
}

function normalizeEvent(event: UnifiedTimelineInputEvent): UnifiedTimelineEvent {
  return {
    ...event,
    detail: event.detail?.trim() || null,
    occurredAt: event.occurredAt instanceof Date ? event.occurredAt.toISOString() : new Date(event.occurredAt).toISOString(),
    title: event.title.trim()
  };
}

function filterOptions<T extends string>(values: readonly T[], selected: T | undefined, events: UnifiedTimelineEvent[], property: "source" | "type") {
  return values
    .map((value) => ({
      value,
      count: events.filter((event) => event[property] === value).length,
      selected: selected === value
    }))
    .filter((option) => option.count > 0 || option.selected);
}

export function buildUnifiedTimeline(events: readonly UnifiedTimelineInputEvent[], filters: TimelineFilters = {}): UnifiedTimelineViewModel {
  const normalized = events.map(normalizeEvent);
  const filtered = normalized.filter((event) =>
    (!filters.source || event.source === filters.source) &&
    (!filters.type || event.type === filters.type)
  );
  const limit = Math.max(0, filters.limit ?? 20);
  const items = orderUnifiedTimelineItems(filtered, limit);

  return {
    items,
    itemCount: items.length,
    filters: {
      sources: filterOptions(UNIFIED_TIMELINE_SOURCES, filters.source, normalized, "source"),
      types: filterOptions(UNIFIED_TIMELINE_EVENT_TYPES, filters.type, normalized, "type")
    },
    page: {
      limit,
      hasMore: filtered.length > items.length
    }
  };
}
