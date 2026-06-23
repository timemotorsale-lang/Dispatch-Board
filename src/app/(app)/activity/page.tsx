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
    </section>
  );
}
