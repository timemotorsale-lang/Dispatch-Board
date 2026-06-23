import { AlertCircle, CheckCircle2, CircleDot, Clock3, MessageSquareText, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";

import type { ActivityFeedEvent } from "@/server/services/activity-feed";

import { formatActivityEventLabel, getActivityEventTone, type ActivityFeedTone } from "./activity-types";

function formatRelativeTime(value: string) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatEnum(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function renderActivityIcon(tone: ActivityFeedTone, eventType: string) {
  if (eventType === "COMMENT_ADDED") return <MessageSquareText size={14} />;
  if (tone === "danger") return <AlertCircle size={14} />;
  if (tone === "warning") return <Clock3 size={14} />;
  if (tone === "review") return <ShieldCheck size={14} />;
  if (tone === "success") return <CheckCircle2 size={14} />;
  if (tone === "system") return <Wrench size={14} />;
  return <CircleDot size={14} />;
}

export function ActivityFeedItem({ event }: { event: ActivityFeedEvent }) {
  const tone = getActivityEventTone(event);
  const actor = event.actor?.name ?? "System";
  const taskContext = event.task
    ? [event.task.title, formatEnum(event.task.workflowArea)].filter(Boolean).join(" - ")
    : null;

  return (
    <article className={`activity-feed-item activity-feed-item-${tone}`}>
      <time dateTime={event.createdAt}>{formatRelativeTime(event.createdAt)}</time>
      <div className="activity-feed-marker">
        {renderActivityIcon(tone, event.eventType)}
      </div>
      <div className="activity-feed-copy">
        <div className="activity-feed-heading">
          <strong>{formatActivityEventLabel(event.eventType)}</strong>
          <span>{actor}</span>
        </div>
        <p>{event.message}</p>
        {event.task ? (
          <Link className="activity-feed-context" href={`/tasks/${event.task.id}`}>
            {taskContext}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
