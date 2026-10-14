"use client";

import { useMemo, useState } from "react";

import type { CrmNextCommandCenter } from "@/server/crm-next/read-model";

import styles from "./crm-next-shell.module.css";

const CRM_ACTIVITY_FILTERS = ["All", "Notes", "Appt", "Phone", "SMS", "Email", "Tasks", "Chat", "Other"] as const;

type CrmNextActivityFilter = (typeof CRM_ACTIVITY_FILTERS)[number];
type CrmNextTimelineEvent = CrmNextCommandCenter["timeline"][number];

function eventText(event: CrmNextTimelineEvent) {
  return `${event.source} ${event.label} ${event.detail}`.toLowerCase();
}

function eventMatchesNamedCategory(event: CrmNextTimelineEvent, filter: Exclude<CrmNextActivityFilter, "All" | "Other">): boolean {
  const text = eventText(event);
  if (filter === "Notes") return text.includes("note") || text.includes("internal");
  if (filter === "Appt") return event.source === "Appointment" || text.includes("appointment") || text.includes("appt");
  if (filter === "Phone") return text.includes("phone") || text.includes("call");
  if (filter === "SMS") return text.includes("sms") || text.includes("text");
  if (filter === "Email") return text.includes("email");
  if (filter === "Tasks") return event.source === "Dispatch" || text.includes("task");
  return text.includes("chat");
}

function eventMatchesFilter(event: CrmNextTimelineEvent, filter: CrmNextActivityFilter): boolean {
  if (filter === "All") return true;

  if (filter === "Other") {
    return !(["Notes", "Appt", "Phone", "SMS", "Email", "Tasks", "Chat"] as const).some((candidate) =>
      eventMatchesNamedCategory(event, candidate)
    );
  }

  return eventMatchesNamedCategory(event, filter);
}

function emptyMessage(customerName: string, filter: CrmNextActivityFilter) {
  if (filter === "All") return `There are no verified notes, calls, appointments, tasks, or updates recorded for ${customerName} yet.`;
  if (filter === "Appt") return `There are no verified appointments recorded for ${customerName} yet.`;
  if (filter === "SMS") return `There are no verified SMS/text updates recorded for ${customerName} yet.`;
  return `There are no verified ${filter.toLowerCase()} updates recorded for ${customerName} yet.`;
}

export function CrmNextActivityFilterTabs({
  customerName,
  events
}: {
  customerName: string;
  events: CrmNextTimelineEvent[];
}) {
  const [activeFilter, setActiveFilter] = useState<CrmNextActivityFilter>("All");
  const filteredEvents = useMemo(
    () => events.filter((event) => eventMatchesFilter(event, activeFilter)),
    [activeFilter, events]
  );

  return (
    <>
      <nav className={styles.activityFilters} aria-label="Activity filters">
        {CRM_ACTIVITY_FILTERS.map((filter) => (
          <button
            aria-pressed={activeFilter === filter}
            className={activeFilter === filter ? styles.activeTab : undefined}
            key={filter}
            onClick={() => setActiveFilter(filter)}
            type="button"
          >
            {filter}
          </button>
        ))}
      </nav>
      <div className={styles.activityTimelineList}>
        {filteredEvents.length ? filteredEvents.map((event) => (
          <a className={styles.activityTimelineItem} href={event.href} key={event.id}>
            <strong>{event.label}</strong>
            <span>{event.detail}</span>
            <small>{event.source} · {event.occurredAt}</small>
          </a>
        )) : (
          <div className={styles.activityTimelineEmpty}>
            <strong>No recorded activity yet</strong>
            <span>{emptyMessage(customerName, activeFilter)}</span>
          </div>
        )}
      </div>
    </>
  );
}
