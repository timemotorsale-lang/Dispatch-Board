import Link from "next/link";

import { listProjectCardSummaries } from "@/features/projects/project-data";
import { ProjectsHubScreen } from "@/features/projects/projects-hub-screen";
import { requireCurrentUser } from "@/server/auth/current-user";
import { listActivityFeedEventsForToday } from "@/server/services/activity-feed";
import { getBoardReadModelForToday } from "@/server/services/board-read";

export default async function ProjectsPage() {
  const user = await requireCurrentUser();
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
