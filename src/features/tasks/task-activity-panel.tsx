"use client";

import { AlertCircle, CheckCircle2, CircleDot, Clock3, MessageSquareText, ShieldCheck, Wrench } from "lucide-react";

import { EmptyStateCard } from "@/components/ui/state-card";
import type { TaskActivityReadModel } from "@/server/services/task-read";

function formatActivityEventLabel(eventType: string) {
  const labels: Record<string, string> = {
    DAILY_BOARD_GENERATED: "Daily board generated",
    TASK_CREATED: "Task created",
    TASK_ASSIGNED: "Task assigned",
    ASSIGNMENT_RECOMMENDED: "Assignment recommended",
    ASSIGNMENT_CHANGED: "Assignment changed",
    DUE_TIME_CHANGED: "Due time changed",
    STATUS_CHANGED: "Status changed",
    TASK_BLOCKED: "Task blocked",
    BLOCKER_REASON_ADDED: "Blocker added",
    WAITING_ON_PARTS: "Waiting on parts",
    WAITING_ON_APPROVAL: "Waiting on approval",
    READY_FOR_REVIEW: "Ready for review",
    MANAGER_APPROVED_COMPLETION: "Manager approved",
    TASK_COMPLETED: "Task completed",
    COMMENT_ADDED: "Update added"
  };

  return labels[eventType] ?? eventType.toLowerCase().replaceAll("_", " ").replace(/^\w/, (match) => match.toUpperCase());
}

function formatRelativeTime(value: string) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);

  if (seconds < 60) return "Just now";

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getActivityTone(eventType: string) {
  if (eventType === "DAILY_BOARD_GENERATED") return "system";
  if (eventType === "TASK_COMPLETED" || eventType === "MANAGER_APPROVED_COMPLETION") return "success";
  if (eventType === "READY_FOR_REVIEW") return "review";
  if (eventType === "TASK_BLOCKED" || eventType === "BLOCKER_REASON_ADDED") return "danger";
  if (eventType === "WAITING_ON_PARTS" || eventType === "WAITING_ON_APPROVAL") return "warning";

  return "neutral";
}

function renderActivityIcon(eventType: string) {
  const tone = getActivityTone(eventType);

  if (eventType === "COMMENT_ADDED") return <MessageSquareText size={14} />;
  if (tone === "danger") return <AlertCircle size={14} />;
  if (tone === "warning") return <Clock3 size={14} />;
  if (tone === "review") return <ShieldCheck size={14} />;
  if (tone === "success") return <CheckCircle2 size={14} />;
  if (tone === "system") return <Wrench size={14} />;

  return <CircleDot size={14} />;
}

export function TaskActivityPanel({ events }: { events: TaskActivityReadModel[] }) {
  return (
    <article className="panel-card task-comments-card">
      <div className="task-comments-header">
        <div>
          <strong>History</strong>
          <h2>Activity history</h2>
        </div>
        <p>Track the workflow moves, review moments, and system-recorded changes for this task.</p>
      </div>

      {events.length === 0 ? (
        <EmptyStateCard
          eyebrow="No workflow history yet"
          message="As the task moves, key workflow events will appear here."
          title="No activity on this task"
        />
      ) : (
        <div className="task-comments-list">
          {events.map((event) => (
            <article className={`activity-feed-item activity-feed-item-${getActivityTone(event.eventType)}`} key={event.id}>
              <time dateTime={event.createdAt}>{formatRelativeTime(event.createdAt)}</time>
              <div className="activity-feed-marker">{renderActivityIcon(event.eventType)}</div>
              <div className="activity-feed-copy">
                <div className="activity-feed-heading">
                  <strong>{formatActivityEventLabel(event.eventType)}</strong>
                  <span>{event.actor?.name ?? "System"}</span>
                </div>
                <p>{event.message}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </article>
  );
}
