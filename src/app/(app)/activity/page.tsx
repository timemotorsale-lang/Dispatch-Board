<<<<<<< HEAD
import Link from "next/link";

import { EmptyStateCard } from "@/components/ui/state-card";
import { requireCurrentUser } from "@/server/auth/current-user";
import { listActivityFeedEventsForToday } from "@/server/services/activity-feed";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function ActivityPage() {
  const user = await requireCurrentUser();
  const activity = await listActivityFeedEventsForToday(user);

  return (
    <section className="page-stack dashboard-page board-page">
      <div className="dashboard-page-header">
        <div className="dashboard-page-copy">
          <span className="eyebrow">Activity</span>
          <h1>Today&apos;s Activity Feed</h1>
          <p>Track the key board events that matter most across generation, status changes, blockers, and handoff-ready updates.</p>
        </div>
        <div className="board-toolbar">
          <div className="board-toolbar-actions">
            <Link className="pill pill-primary" href={`/board?date=${encodeURIComponent(activity.date)}`}>
              Open board
            </Link>
          </div>
        </div>
      </div>

      {activity.events.length === 0 ? (
        <EmptyStateCard
          eyebrow="Quiet board"
          message="As soon as the board is generated or staff begin updating work, those events will appear here."
          title="No activity has been recorded yet"
        />
      ) : (
        <section className="panel-card">
          <strong>Today</strong>
          <h2>{activity.date}</h2>
          <div className="task-comments-list">
            {activity.events.map((event) => (
              <article className="task-comment-card" key={event.id}>
                <div className="task-comment-meta">
                  <strong>{event.actor?.name ?? "System"}</strong>
                  <span>{formatTimestamp(event.createdAt)}</span>
                </div>
                <p className="task-comment-body">{event.message}</p>
                {event.task ? (
                  <Link className="row-action" href={`/tasks/${event.task.id}`}>
                    Open {event.task.title}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      )}
=======
import { ActivityFeedPanel } from "@/features/activity/activity-feed-panel";
import { getGenerationSettings } from "@/server/services/app-settings-service";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

type ActivityPageProps = {
  searchParams?: Promise<{
    date?: string | string[];
  }>;
};

function resolveActivityDate(rawDate: string | undefined, fallbackDate: string) {
  if (!rawDate) return { date: fallbackDate, error: null };

  try {
    return { date: normalizeBoardDate(rawDate), error: null };
  } catch {
    return {
      date: fallbackDate,
      error: "The requested activity date was invalid, so activity has been reset to today."
    };
  }
}

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedDate = Array.isArray(resolvedSearchParams?.date)
    ? resolvedSearchParams?.date[0]
    : resolvedSearchParams?.date;
  const settings = await getGenerationSettings();
  const todayBoardDate = getBoardDateInTimeZone(new Date(), settings.timezone);
  const { date, error } = resolveActivityDate(requestedDate, todayBoardDate);

  return (
    <section className="activity-page dashboard-page page-stack">
      <header className="dashboard-page-header">
        <div className="dashboard-page-copy">
          <span className="eyebrow">Activity</span>
          <h1>Activity Feed</h1>
          <p>Today&apos;s board changes, task updates, blockers, approvals, and comments in one place.</p>
        </div>
      </header>
      {error ? <div className="board-notice board-notice-danger">{error}</div> : null}
      <ActivityFeedPanel boardDate={date} showFullLink={false} title="Live Activity Feed" />
>>>>>>> main
    </section>
  );
}
