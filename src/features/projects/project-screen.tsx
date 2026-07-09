import Link from "next/link";

import { EmptyStateCard } from "@/components/ui/state-card";
import type { ActivityFeedEvent } from "@/server/services/activity-feed";

import {
  getProjectActivity,
  getProjectStageColumns,
  getProjectStats,
  type ProjectCardSummary,
  type ProjectTaskLike
} from "./project-data";
import {
  projectViewOptions,
  type ProjectDefinition,
  type ProjectView
} from "./project-definitions";

type ProjectScreenProps = {
  activityEvents: ActivityFeedEvent[];
  boardDate: string;
  projectCards: ProjectCardSummary[];
  projectSummary: ProjectCardSummary;
  selectedView: ProjectView;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTaskReference(task: ProjectTaskLike) {
  return task.vehicleReference || task.customerReference || task.description || "No extra reference";
}

function getTaskHref(taskId: string) {
  return `/tasks/${taskId}`;
}

function getProjectWorkspaceHref(project: ProjectDefinition, view: ProjectView) {
  return `/projects/${project.slug}?view=${view}`;
}

function getReferenceLabel(task: ProjectTaskLike) {
  return task.vehicleReference || task.customerReference || task.description || "No reference attached yet";
}

function renderOverview(project: ProjectDefinition, tasks: ProjectTaskLike[], events: ActivityFeedEvent[]) {
  const stats = getProjectStats(tasks);
  const blockedTasks = tasks.filter((task) => task.status === "BLOCKED").slice(0, 3);
  const waitingTasks = tasks
    .filter((task) => task.status === "WAITING_ON_APPROVAL" || task.status === "WAITING_ON_PARTS")
    .slice(0, 3);

  return (
    <div className="project-view-grid">
      <article className="panel-card">
        <strong>Summary</strong>
        <h2>What matters most</h2>
        <p>
          {project.name} has {stats.active} active tasks, {stats.blocked} blocked items, and{" "}
          {stats.readyForReview} review-ready tasks on today&apos;s board.
        </p>
      </article>

      <article className="panel-card">
        <strong>Bottlenecks</strong>
        <h2>Current friction</h2>
        {blockedTasks.length || waitingTasks.length ? (
          <div className="project-note-list">
            {blockedTasks.map((task) => (
              <p key={task.id}>
                <strong>{task.title}</strong> is blocked{task.blockerReason ? `: ${task.blockerReason}` : "."}
              </p>
            ))}
            {waitingTasks.map((task) => (
              <p key={task.id}>
                <strong>{task.title}</strong> is waiting in {formatLabel(task.status)}.
              </p>
            ))}
          </div>
        ) : (
          <p>No blockers or waiting items are slowing this project down right now.</p>
        )}
      </article>

      <article className="panel-card">
        <strong>Next actions</strong>
        <h2>Best next moves</h2>
        <div className="project-note-list">
          <p>
            {stats.readyForReview
              ? "Clear ready-for-review items first to keep work moving."
              : "No review queue is building yet."}
          </p>
          <p>
            {stats.overdue
              ? `${stats.overdue} tasks are overdue and need a deadline check.`
              : "No overdue tasks are showing on today's board."}
          </p>
          <p>
            {events.length
              ? "Activity is already flowing into the project timeline for this board day."
              : "Timeline will populate as project tasks receive updates."}
          </p>
        </div>
      </article>
    </div>
  );
}

function renderList(tasks: ProjectTaskLike[]) {
  if (!tasks.length) {
    return (
      <EmptyStateCard
        eyebrow="No tasks"
        message="This project does not have any matching tasks on today's board yet."
        title="Nothing is assigned here today"
      />
    );
  }

  return (
    <section className="project-table-card">
      <table className="project-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Assigned</th>
            <th>Status</th>
            <th>Due</th>
            <th>Customer / Vehicle</th>
            <th>Last updated</th>
            <th>Open</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                <strong>{task.title}</strong>
              </td>
              <td>{task.assignedUser?.name ?? "Unassigned"}</td>
              <td>{formatLabel(task.status)}</td>
              <td>{formatDateTime(task.dueAt)}</td>
              <td>{task.vehicleReference || task.customerReference || "None"}</td>
              <td>{formatDateTime(task.updatedAt)}</td>
              <td>
                <Link className="row-action" href={getTaskHref(task.id)}>
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function renderBoard(project: ProjectDefinition, tasks: ProjectTaskLike[]) {
  const columns = getProjectStageColumns(project.slug, tasks);

  return (
    <div className="project-board-columns">
      {columns.map((column) => (
        <section className="project-board-column" key={column.label}>
          <header>
            <h2>{column.label}</h2>
            <span>{column.tasks.length}</span>
          </header>
          <div className="project-board-stack">
            {column.tasks.length ? (
              column.tasks.map((task) => (
                <article className="project-board-card" key={task.id}>
                  <strong>{task.title}</strong>
                  <p>{getTaskReference(task)}</p>
                  <div className="project-board-meta">
                    <span>{task.assignedUser?.name ?? "Unassigned"}</span>
                    <span>{formatLabel(task.status)}</span>
                  </div>
                  <Link className="row-action" href={getTaskHref(task.id)}>
                    Open task
                  </Link>
                </article>
              ))
            ) : (
              <p className="project-column-empty">No tasks mapped here yet.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function renderWorkflow(project: ProjectDefinition, tasks: ProjectTaskLike[]) {
  const columns = getProjectStageColumns(project.slug, tasks);

  return (
    <section className="project-workflow">
      {columns.map((column, index) => (
        <article className="project-workflow-step" key={column.label}>
          <span>{index + 1}</span>
          <strong>{column.label}</strong>
          <p>{column.tasks.length} tasks currently land in this stage view.</p>
        </article>
      ))}
    </section>
  );
}

function renderDashboard(summary: ProjectCardSummary) {
  const { owner, stats } = summary;

  return (
    <div className="project-metric-grid">
      <article className="project-metric-card">
        <span>Active</span>
        <strong>{stats.active}</strong>
        <small>Open work in motion today</small>
      </article>
      <article className="project-metric-card">
        <span>Blocked</span>
        <strong>{stats.blocked}</strong>
        <small>Items needing intervention</small>
      </article>
      <article className="project-metric-card">
        <span>Waiting</span>
        <strong>{stats.waiting}</strong>
        <small>Approval or parts delays</small>
      </article>
      <article className="project-metric-card">
        <span>Ready for review</span>
        <strong>{stats.readyForReview}</strong>
        <small>Manager-visible handoffs</small>
      </article>
      <article className="project-metric-card">
        <span>Completed today</span>
        <strong>{stats.completedToday}</strong>
        <small>Finished work on this board day</small>
      </article>
      <article className="project-metric-card">
        <span>Lead load</span>
        <strong>{owner ?? "None"}</strong>
        <small>Most active owner right now</small>
      </article>
    </div>
  );
}

function renderTimeline(events: ActivityFeedEvent[]) {
  if (!events.length) {
    return (
      <EmptyStateCard
        eyebrow="Timeline waiting"
        message="Timeline entries will appear as tasks in this project receive status changes, comments, and handoffs."
        title="No project activity yet"
      />
    );
  }

  return (
    <section className="project-feed">
      {events.map((event) => (
        <article className="project-feed-item" key={event.id}>
          <div>
            <strong>{event.message}</strong>
            <p>{event.actor?.name ?? "System"}</p>
          </div>
          <div className="project-feed-meta">
            <span>{formatDateTime(event.createdAt)}</span>
            {event.task ? (
              <Link className="row-action" href={getTaskHref(event.task.id)}>
                Open task
              </Link>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}

function renderCalendar(tasks: ProjectTaskLike[]) {
  const sorted = [...tasks].sort((left, right) => +new Date(left.dueAt) - +new Date(right.dueAt));

  if (!sorted.length) {
    return (
      <EmptyStateCard
        eyebrow="No due dates"
        message="When project tasks have due times, they will appear here as a due-today and upcoming list."
        title="Calendar is clear"
      />
    );
  }

  return (
    <section className="project-feed">
      {sorted.map((task) => (
        <article className="project-feed-item" key={task.id}>
          <div>
            <strong>{task.title}</strong>
            <p>{task.assignedUser?.name ?? "Unassigned"}</p>
          </div>
          <div className="project-feed-meta">
            <span>{formatDateTime(task.dueAt)}</span>
            <Link className="row-action" href={getTaskHref(task.id)}>
              Open task
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}

function renderMessages(events: ActivityFeedEvent[]) {
  if (!events.length) {
    return (
      <EmptyStateCard
        eyebrow="No messages"
        message="Task comments and operating updates will surface here as this project accumulates conversation."
        title="No project updates yet"
      />
    );
  }

  return (
    <section className="project-feed">
      {events.map((event) => (
        <article className="project-feed-item" key={event.id}>
          <div>
            <strong>{event.task?.title ?? "Project update"}</strong>
            <p>{event.message}</p>
          </div>
          <div className="project-feed-meta">
            <span>{event.actor?.name ?? "System"}</span>
            {event.task ? (
              <Link className="row-action" href={getTaskHref(event.task.id)}>
                Open task
              </Link>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}

function renderFiles(project: ProjectDefinition, tasks: ProjectTaskLike[]) {
  const fileLikeTasks = tasks
    .filter(
      (task) =>
        Boolean(task.vehicleReference) ||
        Boolean(task.customerReference) ||
        Boolean(task.requiredUpdateFields.length) ||
        Boolean(task.blockerReason)
    )
    .slice(0, 8);

  if (!fileLikeTasks.length) {
    return (
      <EmptyStateCard
        actions={[
          {
            href: getProjectWorkspaceHref(project, "list"),
            label: "Open task list",
            tone: "secondary"
          },
          {
            href: getProjectWorkspaceHref(project, "overview"),
            label: "Back to overview",
            tone: "primary"
          }
        ]}
        eyebrow="No project references"
        message="Reference-linked tasks, paperwork prompts, and blocker notes will appear here as this project fills out."
        title="Nothing is waiting in the file lane"
      />
    );
  }

  return (
    <section className="project-feed">
      {fileLikeTasks.map((task) => (
        <article className="project-feed-item" key={task.id}>
          <div>
            <strong>{task.title}</strong>
            <p>{getReferenceLabel(task)}</p>
          </div>
          <div className="project-feed-meta">
            <span>
              {task.requiredUpdateFields.length
                ? `${task.requiredUpdateFields.length} required field${task.requiredUpdateFields.length === 1 ? "" : "s"}`
                : task.blockerReason
                  ? "Blocker note"
                  : "Reference attached"}
            </span>
            <Link className="row-action" href={getTaskHref(task.id)}>
              Open task
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}

function renderView(project: ProjectDefinition, summary: ProjectCardSummary, events: ActivityFeedEvent[], view: ProjectView) {
  if (view === "overview") {
    return renderOverview(project, summary.tasks, events);
  }

  if (view === "list") {
    return renderList(summary.tasks);
  }

  if (view === "board") {
    return renderBoard(project, summary.tasks);
  }

  if (view === "workflow") {
    return renderWorkflow(project, summary.tasks);
  }

  if (view === "dashboard") {
    return renderDashboard(summary);
  }

  if (view === "timeline") {
    return renderTimeline(events);
  }

  if (view === "calendar") {
    return renderCalendar(summary.tasks);
  }

  if (view === "messages") {
    return renderMessages(events);
  }

  return renderFiles(project, summary.tasks);
}

export function ProjectScreen({
  activityEvents,
  boardDate,
  projectCards,
  projectSummary,
  selectedView
}: ProjectScreenProps) {
  const { owner, project, stats, tasks } = projectSummary;
  const events = getProjectActivity(activityEvents, tasks);
  const Icon = project.icon;
  const projectOptions = projectCards.map((summary) => summary.project);

  return (
    <section className="page-stack dashboard-page board-page project-page">
      <div className="dashboard-page-header">
        <div className="dashboard-page-copy">
          <span className="eyebrow">Projects hub</span>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
          <div className="project-header-metrics">
            <span>{tasks.length} tasks today</span>
            <span>{stats.blocked} blocked</span>
            <span>{stats.readyForReview} ready for review</span>
            <span>{stats.completedToday} completed today</span>
            <span>{owner ? `Lead load: ${owner}` : "No owner load yet"}</span>
          </div>
        </div>

        <div className="board-toolbar">
          <div className="board-toolbar-actions">
            <Link className="pill pill-secondary" href={`/board?date=${encodeURIComponent(boardDate)}`}>
              Back to Dispatch Board
            </Link>
            <Link className="pill pill-primary" href={`/projects/${project.slug}?view=board`}>
              Open Board View
            </Link>
          </div>
        </div>
      </div>

      <section className={`project-shell project-shell-${project.accent}`}>
        <header className="project-shell-header">
          <div className="project-shell-title">
            <span className="project-shell-icon">
              <Icon size={18} />
            </span>
            <div>
              <strong>{project.shortName}</strong>
              <p>Board date {boardDate}</p>
            </div>
          </div>
          <nav className="project-switch-row" aria-label="Project areas">
            {projectOptions.map((option) => (
              <Link
                className={project.slug === option.slug ? "project-switch project-switch-active" : "project-switch"}
                href={getProjectWorkspaceHref(option, selectedView)}
                key={option.slug}
              >
                {option.shortName}
              </Link>
            ))}
          </nav>
          <nav className="project-tab-row" aria-label="Project views">
            {projectViewOptions.map((view) => (
              <Link
                className={selectedView === view.value ? "project-tab project-tab-active" : "project-tab"}
                href={getProjectWorkspaceHref(project, view.value)}
                key={view.value}
              >
                {view.label}
              </Link>
            ))}
          </nav>
        </header>

        {renderView(project, projectSummary, events, selectedView)}
      </section>
    </section>
  );
}
