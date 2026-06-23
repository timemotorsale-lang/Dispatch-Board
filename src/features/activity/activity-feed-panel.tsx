"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { ActivityFeedModel } from "@/server/services/activity-feed";

import { ActivityFeedItem } from "./activity-feed-item";
import { activityEventMatchesFilter, activityFeedFilters, type ActivityFeedFilter } from "./activity-types";

type ActivityFeedPanelProps = {
  boardDate: string;
  title?: string;
  compact?: boolean;
  showFullLink?: boolean;
  poll?: boolean;
};

type ActivityFeedState =
  | { status: "loading"; feed: ActivityFeedModel | null; message?: never }
  | { status: "ready"; feed: ActivityFeedModel; message?: never }
  | { status: "error"; feed: ActivityFeedModel | null; message: string };

async function loadActivityFeed(boardDate: string, signal?: AbortSignal) {
  const response = await fetch(`/api/activity?date=${encodeURIComponent(boardDate)}`, { signal });
  const payload = (await response.json().catch(() => null)) as (ActivityFeedModel & { error?: string }) | null;

  if (!response.ok || !payload || !Array.isArray(payload.events)) {
    throw new Error(payload?.error ?? "Unable to load activity right now.");
  }

  return payload;
}

export function filterActivityEvents(feed: ActivityFeedModel | null, filter: ActivityFeedFilter) {
  return feed?.events.filter((event) => activityEventMatchesFilter(event, filter)) ?? [];
}

export function ActivityFeedPanel({
  boardDate,
  title = "Live Activity Feed",
  compact = false,
  showFullLink = true,
  poll = false
}: ActivityFeedPanelProps) {
  const [filter, setFilter] = useState<ActivityFeedFilter>("all");
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<ActivityFeedState>({ status: "loading", feed: null });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const feed = await loadActivityFeed(boardDate, controller.signal);
        if (!controller.signal.aborted) {
          setState({ status: "ready", feed });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setState((current) => ({
            status: "error",
            feed: current.feed,
            message: error instanceof Error ? error.message : "Unable to load activity right now."
          }));
        }
      }
    }

    setState((current) => ({ status: "loading", feed: current.feed }));
    void load();

    return () => controller.abort();
  }, [boardDate, reloadCount]);

  useEffect(() => {
    if (!poll) return;
    const timer = window.setInterval(() => setReloadCount((count) => count + 1), 60000);
    return () => window.clearInterval(timer);
  }, [poll]);

  const visibleEvents = useMemo(() => filterActivityEvents(state.feed, filter), [filter, state.feed]);
  const eventsToRender = compact ? visibleEvents.slice(0, 6) : visibleEvents;

  return (
    <section className={compact ? "activity-feed-panel activity-feed-panel-compact" : "activity-feed-panel"}>
      <header className="activity-feed-panel-header">
        <div>
          <h2>{title}</h2>
          <span>{state.feed?.date ?? boardDate}</span>
        </div>
        <select aria-label="Filter activity events" value={filter} onChange={(event) => setFilter(event.target.value as ActivityFeedFilter)}>
          {activityFeedFilters.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </header>

      {state.status === "loading" && !state.feed ? (
        <div className="activity-feed-state"><span className="activity-feed-spinner" />Loading activity...</div>
      ) : null}

      {state.status === "error" ? (
        <div className="activity-feed-state activity-feed-error">
          <p>{state.message}</p>
          <button type="button" onClick={() => setReloadCount((count) => count + 1)}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : null}

      {state.status !== "loading" && !visibleEvents.length && state.status !== "error" ? (
        <div className="activity-feed-state">
          <p>{filter === "all" ? "No activity has been recorded for this board yet." : "No activity matches this filter."}</p>
        </div>
      ) : null}

      {eventsToRender.length ? (
        <div className="activity-feed-list">
          {eventsToRender.map((event) => <ActivityFeedItem event={event} key={event.id} />)}
        </div>
      ) : null}

      <footer className="activity-feed-footer">
        <button type="button" onClick={() => setReloadCount((count) => count + 1)}>
          <RefreshCw size={13} /> Refresh
        </button>
        {showFullLink ? <Link href={`/activity?date=${encodeURIComponent(boardDate)}`}>View full activity</Link> : null}
      </footer>
    </section>
  );
}
