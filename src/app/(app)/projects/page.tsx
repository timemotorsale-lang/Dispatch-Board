import Link from "next/link";

import { listProjectCardSummaries } from "@/features/projects/project-data";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getBoardReadModelForToday } from "@/server/services/board-read";

export default async function ProjectsPage() {
  const user = await requireCurrentUser();
  const boardResult = await getBoardReadModelForToday(user);
  const projects = listProjectCardSummaries(boardResult.board?.tasks ?? []);

  return (
    <section className="page-stack dashboard-page board-page project-page">
      <div className="dashboard-page-header">
        <div className="dashboard-page-copy">
          <span className="eyebrow">Projects hub</span>
          <h1>Projects</h1>
          <p>Choose a project area first, then move between board, list, workflow, timeline, and dashboard views inside that project.</p>
        </div>

        <div className="board-toolbar">
          <div className="board-toolbar-actions">
            <Link className="pill pill-secondary" href={`/board?date=${encodeURIComponent(boardResult.date)}`}>
              Back to Dispatch Board
            </Link>
          </div>
        </div>
      </div>

      <section className="project-directory">
        {projects.map(({ owner, project, stats, tasks }) => {
          const Icon = project.icon;

          return (
            <Link className={`project-directory-card project-directory-card-${project.accent}`} href={`/projects/${project.slug}?view=board`} key={project.slug}>
              <div className="project-directory-top">
                <span className="project-directory-icon">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{project.name}</strong>
                  <p>{project.description}</p>
                </div>
              </div>
              <dl className="project-directory-metrics">
                <div><dt>Tasks</dt><dd>{tasks.length}</dd></div>
                <div><dt>Blocked</dt><dd>{stats.blocked}</dd></div>
                <div><dt>Review</dt><dd>{stats.readyForReview}</dd></div>
                <div><dt>Done</dt><dd>{stats.completedToday}</dd></div>
              </dl>
              <span className="project-directory-meta">{owner ? `Lead load: ${owner}` : "No project tasks yet today."}</span>
            </Link>
          );
        })}
      </section>
    </section>
  );
}
