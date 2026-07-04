import { notFound } from "next/navigation";

import { ProjectScreen } from "@/features/projects/project-screen";
import { getProjectCardSummary, listProjectCardSummaries } from "@/features/projects/project-data";
import { getProjectDefinition, isProjectView, type ProjectView } from "@/features/projects/project-definitions";
import { requireCurrentUser } from "@/server/auth/current-user";
import { listActivityFeedEventsForToday } from "@/server/services/activity-feed";
import { getBoardReadModelForToday } from "@/server/services/board-read";

type ProjectPageProps = {
  params: Promise<{
    projectSlug: string;
  }>;
  searchParams?: Promise<{
    view?: string | string[];
  }>;
};

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const user = await requireCurrentUser();
  const { projectSlug } = await params;
  const project = getProjectDefinition(projectSlug);

  if (!project) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawView = Array.isArray(resolvedSearchParams?.view)
    ? resolvedSearchParams.view[0]
    : resolvedSearchParams?.view;
  const selectedView: ProjectView = rawView && isProjectView(rawView) ? rawView : "board";
  const [boardResult, activityResult] = await Promise.all([
    getBoardReadModelForToday(user),
    listActivityFeedEventsForToday(user)
  ]);
  const projectCards = listProjectCardSummaries(boardResult.board?.tasks ?? []);
  const projectSummary = getProjectCardSummary(boardResult.board?.tasks ?? [], project.slug);

  if (!projectSummary) {
    notFound();
  }

  return (
    <ProjectScreen
      activityEvents={activityResult.events}
      boardDate={boardResult.date}
      projectCards={projectCards}
      projectSummary={projectSummary}
      selectedView={selectedView}
    />
  );
}
