import Link from "next/link";

import { listProjectCardSummaries } from "@/features/projects/project-data";
import { ProjectsHubScreen } from "@/features/projects/projects-hub-screen";
import { requireCurrentUser } from "@/server/auth/current-user";
import { listActivityFeedEventsForToday } from "@/server/services/activity-feed";
import { getBoardReadModelForToday } from "@/server/services/board-read";

type ProjectsPageProps = {
  searchParams?: Promise<{
    filter?: string | string[];
    filters?: string | string[];
    focus?: string | string[];
    query?: string | string[];
    view?: string | string[];
  }>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const user = await requireCurrentUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [boardResult, activityResult] = await Promise.all([
    getBoardReadModelForToday(user),
    listActivityFeedEventsForToday(user)
  ]);
  const tasks = boardResult.board?.tasks ?? [];
  const projects = listProjectCardSummaries(tasks);

  return (
    <>
      <ProjectsHubScreen
        activityEvents={activityResult.events}
        boardDate={boardResult.date}
        currentUserId={user.id}
        currentUserName={user.name}
        rawFilter={getSingleValue(resolvedSearchParams?.filter)}
        rawFocus={getSingleValue(resolvedSearchParams?.focus)}
        rawQuery={getSingleValue(resolvedSearchParams?.query)}
        rawView={getSingleValue(resolvedSearchParams?.view)}
        showFiltersTray={getSingleValue(resolvedSearchParams?.filters) === "open"}
        projectCards={projects}
        tasks={tasks}
      />

      <div className="projects-hub-back-link">
        <Link className="pill pill-secondary" href={`/board?date=${encodeURIComponent(boardResult.date)}`}>
          Back to Dispatch Board
        </Link>
      </div>
    </>
  );
}
