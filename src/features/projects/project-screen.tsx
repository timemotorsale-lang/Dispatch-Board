import Link from "next/link";

import {
  formatActivityEventLabel,
  getActivityEventTone,
  type ActivityFeedTone
} from "@/features/activity/activity-types";
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

type CalendarBucket = {
  label: string;
  detail: string;
  tone: "danger" | "warning" | "neutral" | "success";
  tasks: ProjectTaskLike[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatBoardDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeEventType(eventType: string) {
  return eventType.replaceAll(".", "_").toUpperCase();
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

function addDaysToBoardDate(boardDate: string, days: number) {
  const value = new Date(`${boardDate}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);

  return value.toISOString().slice(0, 10);
}

function isTaskCompleted(task: ProjectTaskLike) {
  return task.status === "COMPLETED";
}

function isTaskOverdue(task: ProjectTaskLike) {
  return !isTaskCompleted(task) && new Date(task.dueAt).getTime() < Date.now();
}

function isTaskDueOnBoardDate(task: ProjectTaskLike, boardDate: string) {
  return !isTaskCompleted(task) && task.dueAt.slice(0, 10) === boardDate;
}

function getStatusToneClass(status: string) {
  if (status === "BLOCKED") {
    return "status-danger";
  }

  if (status === "WAITING_ON_APPROVAL" || status === "WAITING_ON_PARTS") {
    return "status-warning";
  }

  if (status === "READY_FOR_REVIEW") {
    return "status-review";
  }

  if (status === "COMPLETED") {
    return "status-success";
  }

  if (status === "IN_PROGRESS" || status === "NOT_STARTED") {
    return "status-progress";
  }

  return "status-neutral";
}

function getActivityToneClass(tone: ActivityFeedTone) {
  if (tone === "danger") {
    return "status-danger";
  }

  if (tone === "warning") {
    return "status-warning";
  }

  if (tone === "review") {
    return "status-review";
  }

  if (tone === "success") {
    return "status-success";
  }

  if (tone === "system") {
    return "status-progress";
  }

  return "status-neutral";
}

function getDueStatePill(task: ProjectTaskLike, boardDate: string) {
  if (isTaskCompleted(task)) {
    return { className: "status-success", label: "Completed" };
  }

  if (isTaskOverdue(task)) {
    return { className: "status-danger", label: "Overdue" };
  }

  if (isTaskDueOnBoardDate(task, boardDate)) {
    return { className: "status-warning", label: "Due today" };
  }

  return { className: "status-neutral", label: formatDateTime(task.dueAt) };
}

function getStagePill(tasks: ProjectTaskLike[]) {
  if (!tasks.length) {
    return { className: "status-neutral", label: "Clear" };
  }

  if (tasks.some((task) => task.status === "BLOCKED")) {
    return { className: "status-danger", label: "Blocked" };
  }

  if (
    tasks.some(
      (task) => task.status === "WAITING_ON_APPROVAL" || task.status === "WAITING_ON_PARTS"
    )
  ) {
    return { className: "status-warning", label: "Watch" };
  }

  if (tasks.some((task) => task.status === "READY_FOR_REVIEW")) {
    return { className: "status-review", label: "Review" };
  }

  return { className: "status-success", label: "Moving" };
}

function getOwnershipRows(tasks: ProjectTaskLike[]) {
  const counts = new Map<string, number>();

  for (const task of tasks) {
    const name = task.assignedUser?.name ?? "Unassigned";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ count, name }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, 4);
}

function getCalendarBuckets(tasks: ProjectTaskLike[], boardDate: string): CalendarBucket[] {
  const nextWindow = addDaysToBoardDate(boardDate, 3);
  const sorted = [...tasks]
    .filter((task) => !isTaskCompleted(task))
    .sort((left, right) => +new Date(left.dueAt) - +new Date(right.dueAt));

  const overdue = sorted.filter((task) => isTaskOverdue(task));
  const today = sorted.filter((task) => !isTaskOverdue(task) && isTaskDueOnBoardDate(task, boardDate));
  const next = sorted.filter((task) => {
    const dueDate = task.dueAt.slice(0, 10);

    return !isTaskOverdue(task) && dueDate > boardDate && dueDate <= nextWindow;
  });
  const later = sorted.filter((task) => {
    const dueDate = task.dueAt.slice(0, 10);

    return !isTaskOverdue(task) && dueDate > nextWindow;
  });

  return [
    {
      detail: "Items already past target time.",
      label: "Overdue",
      tasks: overdue,
      tone: "danger"
    },
    {
      detail: `Work scheduled for ${formatBoardDate(boardDate)}.`,
      label: "Due today",
      tasks: today,
      tone: "warning"
    },
    {
      detail: "Upcoming in the next three days.",
      label: "Up next",
      tasks: next,
      tone: "neutral"
    },
    {
      detail: "Longer-range project commitments.",
      label: "Later",
      tasks: later,
      tone: "success"
    }
  ];
}

function getConversationEvents(events: ActivityFeedEvent[]) {
  const commentEvents = events.filter((event) => {
    const normalized = normalizeEventType(event.eventType);
    const message = event.message.toLowerCase();

    return (
      normalized.includes("COMMENT") ||
      normalized.includes("NOTE") ||
      message.includes("added an update") ||
      message.includes("comment")
    );
  });

  if (commentEvents.length) {
    return commentEvents.slice(0, 6);
  }

  return events.filter((event) => Boolean(event.actor)).slice(0, 6);
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
              <td>
                <span className={`status-pill ${getStatusToneClass(task.status)}`}>
                  {formatLabel(task.status)}
                </span>
              </td>
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

function renderBoard(project: ProjectDefinition, tasks: ProjectTaskLike[], boardDate: string) {
  if (!tasks.length) {
    return (
      <EmptyStateCard
        actions={[
          {
            href: getProjectWorkspaceHref(project, "overview"),
            label: "Back to overview",
            tone: "secondary"
          }
        ]}
        eyebrow="Board is clear"
        message="As project-linked tasks land on the board, they will group here by the workflow stages for this project."
        title="No board cards yet"
      />
    );
  }

  const columns = getProjectStageColumns(project.slug, tasks);
  const activeColumns = columns.filter((column) => column.tasks.length).length;
  const blocked = tasks.filter((task) => task.status === "BLOCKED").length;
  const dueToday = tasks.filter((task) => isTaskDueOnBoardDate(task, boardDate)).length;
  const reviewReady = tasks.filter((task) => task.status === "READY_FOR_REVIEW").length;

  return (
    <section className="project-board-shell">
      <div className="project-board-summary">
        <article className="project-board-summary-card">
          <strong>Live stages</strong>
          <span>{activeColumns}</span>
          <p>{columns.length - activeColumns} stages are currently clear.</p>
        </article>
        <article className="project-board-summary-card">
          <strong>Due today</strong>
          <span>{dueToday}</span>
          <p>{reviewReady} items are already waiting for review.</p>
        </article>
        <article className="project-board-summary-card">
          <strong>Pressure points</strong>
          <span>{blocked}</span>
          <p>{blocked ? "Blocked work is visible in the flow." : "No blocked work is stopping the line."}</p>
        </article>
      </div>

      <div className="project-board-columns">
        {columns.map((column) => {
          const stagePill = getStagePill(column.tasks);

          return (
            <section className="project-board-column" key={column.label}>
              <header>
                <div className="project-board-column-copy">
                  <h2>{column.label}</h2>
                  <small>
                    {column.tasks.length
                      ? `${column.tasks.length} task${column.tasks.length === 1 ? "" : "s"} in this stage`
                      : "No tasks parked here"}
                  </small>
                </div>
                <div className="project-board-column-meta">
                  <span>{column.tasks.length}</span>
                  <strong className={`status-pill ${stagePill.className}`}>{stagePill.label}</strong>
                </div>
              </header>
              <div className="project-board-stack">
                {column.tasks.length ? (
                  column.tasks.map((task) => {
                    const dueState = getDueStatePill(task, boardDate);

                    return (
                      <article className="project-board-card" key={task.id}>
                        <div className="project-board-card-top">
                          <strong>{task.title}</strong>
                          <span className={`status-pill ${getStatusToneClass(task.status)}`}>
                            {formatLabel(task.status)}
                          </span>
                        </div>
                        <p>{getTaskReference(task)}</p>
                        <div className="project-task-detail-row">
                          <span>{task.assignedUser?.name ?? "Unassigned"}</span>
                          <span className={`status-pill ${dueState.className}`}>{dueState.label}</span>
                        </div>
                        <div className="project-task-tag-row">
                          {task.requiresManagerApproval ? (
                            <span className="status-pill status-review">Manager approval</span>
                          ) : null}
                          {task.blockerReason ? (
                            <span className="status-pill status-danger">Blocker noted</span>
                          ) : null}
                          {task.requiredUpdateFields.length ? (
                            <span className="status-pill status-neutral">
                              {task.requiredUpdateFields.length} required field
                              {task.requiredUpdateFields.length === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </div>
                        <div className="project-board-card-footer">
                          <small>Updated {formatDateTime(task.updatedAt)}</small>
                          <Link className="row-action" href={getTaskHref(task.id)}>
                            Open task
                          </Link>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="project-column-empty">No tasks mapped here yet.</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function renderWorkflow(project: ProjectDefinition, tasks: ProjectTaskLike[]) {
  if (!tasks.length) {
    return (
      <EmptyStateCard
        eyebrow="Workflow is clear"
        message="This stage map becomes more useful as project-linked tasks enter each part of the operating flow."
        title="No workflow traffic yet"
      />
    );
  }

  const columns = getProjectStageColumns(project.slug, tasks);
  const occupiedStages = columns.filter((column) => column.tasks.length).length;

  return (
    <section className="project-workflow-shell">
      <div className="project-workflow-summary">
        <article className="panel-card">
          <strong>Flow coverage</strong>
          <h2>How work is moving</h2>
          <p>
            {occupiedStages} of {columns.length} stages are active right now, which shows where this
            project is concentrated and where flow is already clear.
          </p>
        </article>
        <article className="panel-card">
          <strong>Manager cue</strong>
          <h2>Where to look first</h2>
          <p>
            Start with the first stage carrying blocked or waiting work, then clear review-ready tasks
            so the next stage can keep moving.
          </p>
        </article>
      </div>

      <section className="project-workflow">
        {columns.map((column, index) => {
          const blocked = column.tasks.filter((task) => task.status === "BLOCKED").length;
          const waiting = column.tasks.filter(
            (task) => task.status === "WAITING_ON_APPROVAL" || task.status === "WAITING_ON_PARTS"
          ).length;
          const ready = column.tasks.filter((task) => task.status === "READY_FOR_REVIEW").length;
          const stagePill = getStagePill(column.tasks);

          return (
            <article className="project-workflow-step" key={column.label}>
              <div className="project-workflow-step-top">
                <span>{index + 1}</span>
                <strong>{column.label}</strong>
              </div>
              <p>
                {column.tasks.length
                  ? `${column.tasks.length} task${column.tasks.length === 1 ? "" : "s"} currently land here.`
                  : "No active work is sitting in this stage right now."}
              </p>
              <div className="project-workflow-step-stats">
                <div>
                  <small>Load</small>
                  <strong>{column.tasks.length}</strong>
                </div>
                <div>
                  <small>Blocked</small>
                  <strong>{blocked}</strong>
                </div>
                <div>
                  <small>Ready</small>
                  <strong>{ready}</strong>
                </div>
              </div>
              <div className="project-task-tag-row">
                <span className={`status-pill ${stagePill.className}`}>{stagePill.label}</span>
                {waiting ? <span className="status-pill status-warning">{waiting} waiting</span> : null}
              </div>
              <div className="project-workflow-preview-list">
                {column.tasks.slice(0, 2).map((task) => (
                  <Link className="project-workflow-preview-item" href={getTaskHref(task.id)} key={task.id}>
                    {task.title}
                  </Link>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}

function renderDashboard(summary: ProjectCardSummary, boardDate: string) {
  const { health, owner, project, stats, tasks } = summary;
  const ownershipRows = getOwnershipRows(tasks);
  const dueToday = tasks.filter((task) => isTaskDueOnBoardDate(task, boardDate)).length;

  return (
    <section className="project-dashboard-shell">
      <article className={`panel-card project-health-spotlight project-health-spotlight-${health.tone}`}>
        <strong>Health pulse</strong>
        <div className="project-health-spotlight-top">
          <div>
            <h2>{project.shortName} is {health.label.toLowerCase()}</h2>
            <p>{health.reason}</p>
          </div>
          <span>{health.score}%</span>
        </div>
      </article>

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

      <div className="project-dashboard-grid">
        <article className="panel-card">
          <strong>Pressure points</strong>
          <h2>What could slow the project</h2>
          <div className="project-dashboard-list">
            <div>
              <span>Overdue</span>
              <strong>{stats.overdue}</strong>
            </div>
            <div>
              <span>Blocked</span>
              <strong>{stats.blocked}</strong>
            </div>
            <div>
              <span>Waiting</span>
              <strong>{stats.waiting}</strong>
            </div>
            <div>
              <span>Ready for review</span>
              <strong>{stats.readyForReview}</strong>
            </div>
          </div>
        </article>

        <article className="panel-card">
          <strong>Ownership</strong>
          <h2>Where the team load sits</h2>
          <div className="project-owner-list">
            {ownershipRows.length ? (
              ownershipRows.map((entry) => (
                <div className="project-owner-row" key={entry.name}>
                  <span>{entry.name}</span>
                  <strong>{entry.count}</strong>
                </div>
              ))
            ) : (
              <p>No active owner load is visible yet.</p>
            )}
          </div>
        </article>

        <article className="panel-card">
          <strong>Today</strong>
          <h2>Board-day focus</h2>
          <div className="project-dashboard-list">
            <div>
              <span>Due today</span>
              <strong>{dueToday}</strong>
            </div>
            <div>
              <span>Completed today</span>
              <strong>{stats.completedToday}</strong>
            </div>
            <div>
              <span>Manager approvals</span>
              <strong>{tasks.filter((task) => task.requiresManagerApproval).length}</strong>
            </div>
            <div>
              <span>Reference-linked</span>
              <strong>
                {
                  tasks.filter((task) => Boolean(task.vehicleReference) || Boolean(task.customerReference))
                    .length
                }
              </strong>
            </div>
          </div>
        </article>
      </div>
    </section>
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
    <section className="project-timeline">
      {events.map((event) => {
        const normalizedType = normalizeEventType(event.eventType);
        const tone = getActivityEventTone({ eventType: normalizedType, task: event.task });
        const label = formatActivityEventLabel(normalizedType);
        const context = event.task?.title ?? event.appointment?.title ?? "Project system activity";

        return (
          <article className="project-timeline-item" key={event.id}>
            <div className="project-timeline-rail">
              <span className={`project-timeline-dot project-timeline-dot-${tone}`} />
            </div>
            <div className="project-timeline-card">
              <div className="project-timeline-top">
                <span className={`status-pill ${getActivityToneClass(tone)}`}>{label}</span>
                <small>{formatDateTime(event.createdAt)}</small>
              </div>
              <strong>{event.message}</strong>
              <p>
                {event.actor?.name ?? "System"} on {context}
              </p>
              {event.task ? (
                <div className="project-timeline-actions">
                  <Link className="row-action" href={getTaskHref(event.task.id)}>
                    Open task
                  </Link>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function renderCalendar(tasks: ProjectTaskLike[], boardDate: string) {
  const buckets = getCalendarBuckets(tasks, boardDate);
  const visibleBuckets = buckets.filter((bucket) => bucket.tasks.length);

  if (!visibleBuckets.length) {
    return (
      <EmptyStateCard
        eyebrow="No due dates"
        message="When project tasks have due times, they will appear here as a due-today and upcoming planning view."
        title="Calendar is clear"
      />
    );
  }

  return (
    <section className="project-calendar-grid">
      {visibleBuckets.map((bucket) => (
        <article className={`project-calendar-column project-calendar-column-${bucket.tone}`} key={bucket.label}>
          <div className="project-calendar-column-top">
            <div>
              <strong>{bucket.label}</strong>
              <p>{bucket.detail}</p>
            </div>
            <span>{bucket.tasks.length}</span>
          </div>
          <div className="project-calendar-list">
            {bucket.tasks.map((task) => (
              <Link className="project-calendar-item" href={getTaskHref(task.id)} key={task.id}>
                <div className="project-calendar-time">{formatDateTime(task.dueAt)}</div>
                <div className="project-calendar-copy">
                  <strong>{task.title}</strong>
                  <p>{task.assignedUser?.name ?? "Unassigned"}</p>
                </div>
                <span className={`status-pill ${getStatusToneClass(task.status)}`}>
                  {formatLabel(task.status)}
                </span>
              </Link>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function renderMessages(summary: ProjectCardSummary, events: ActivityFeedEvent[], boardDate: string) {
  const attentionTasks = summary.tasks
    .filter(
      (task) =>
        task.status === "BLOCKED" ||
        task.status === "WAITING_ON_APPROVAL" ||
        task.status === "READY_FOR_REVIEW"
    )
    .sort((left, right) => +new Date(left.dueAt) - +new Date(right.dueAt))
    .slice(0, 5);
  const conversationEvents = getConversationEvents(events);

  return (
    <section className="project-messages-grid">
      <article className="panel-card">
        <strong>Needs follow-up</strong>
        <h2>Where the manager should reply</h2>
        {attentionTasks.length ? (
          <div className="project-messages-list">
            {attentionTasks.map((task) => (
              <Link className="project-message-row" href={getTaskHref(task.id)} key={task.id}>
                <div className="project-message-row-top">
                  <strong>{task.title}</strong>
                  <span className={`status-pill ${getStatusToneClass(task.status)}`}>
                    {formatLabel(task.status)}
                  </span>
                </div>
                <p>{task.blockerReason || getTaskReference(task)}</p>
                <div className="project-message-row-meta">
                  <span>{task.assignedUser?.name ?? "Unassigned"}</span>
                  <small>{getDueStatePill(task, boardDate).label}</small>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="project-message-empty">No reply-worthy project tasks are waiting right now.</p>
        )}
      </article>

      <article className="panel-card">
        <strong>Recent conversation</strong>
        <h2>Updates coming from the floor</h2>
        {conversationEvents.length ? (
          <div className="project-messages-list">
            {conversationEvents.map((event) => {
              const normalizedType = normalizeEventType(event.eventType);
              const tone = getActivityEventTone({ eventType: normalizedType, task: event.task });

              return (
                <article className="project-message-row" key={event.id}>
                  <div className="project-message-row-top">
                    <strong>{event.task?.title ?? "Project update"}</strong>
                    <span className={`status-pill ${getActivityToneClass(tone)}`}>
                      {formatActivityEventLabel(normalizedType)}
                    </span>
                  </div>
                  <p>{event.message}</p>
                  <div className="project-message-row-meta">
                    <span>{event.actor?.name ?? "System"}</span>
                    <small>{formatDateTime(event.createdAt)}</small>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="project-message-empty">No human updates have landed in this project feed yet.</p>
        )}
      </article>
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
  const referenceCount = tasks.filter(
    (task) => Boolean(task.vehicleReference) || Boolean(task.customerReference)
  ).length;
  const requiredFieldCount = tasks.reduce(
    (total, task) => total + task.requiredUpdateFields.length,
    0
  );
  const blockerNoteCount = tasks.filter((task) => Boolean(task.blockerReason)).length;

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
    <section className="project-files-shell">
      <div className="project-files-summary">
        <article className="project-files-summary-card">
          <strong>References</strong>
          <span>{referenceCount}</span>
          <p>Customer and vehicle-linked tasks.</p>
        </article>
        <article className="project-files-summary-card">
          <strong>Required fields</strong>
          <span>{requiredFieldCount}</span>
          <p>Inputs still expected from the team.</p>
        </article>
        <article className="project-files-summary-card">
          <strong>Blocker notes</strong>
          <span>{blockerNoteCount}</span>
          <p>Documented reasons slowing movement.</p>
        </article>
      </div>

      <div className="project-feed">
        {fileLikeTasks.map((task) => (
          <article className="project-feed-item" key={task.id}>
            <div>
              <strong>{task.title}</strong>
              <p>{getReferenceLabel(task)}</p>
              <div className="project-task-tag-row">
                {task.customerReference ? (
                  <span className="status-pill status-neutral">Customer ref</span>
                ) : null}
                {task.vehicleReference ? (
                  <span className="status-pill status-neutral">Vehicle ref</span>
                ) : null}
                {task.requiredUpdateFields.length ? (
                  <span className="status-pill status-warning">
                    {task.requiredUpdateFields.length} required field
                    {task.requiredUpdateFields.length === 1 ? "" : "s"}
                  </span>
                ) : null}
                {task.blockerReason ? (
                  <span className="status-pill status-danger">Blocker note</span>
                ) : null}
              </div>
            </div>
            <div className="project-feed-meta">
              <span>Updated {formatDateTime(task.updatedAt)}</span>
              <Link className="row-action" href={getTaskHref(task.id)}>
                Open task
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function renderView(
  project: ProjectDefinition,
  summary: ProjectCardSummary,
  events: ActivityFeedEvent[],
  view: ProjectView,
  boardDate: string
) {
  if (view === "overview") {
    return renderOverview(project, summary.tasks, events);
  }

  if (view === "list") {
    return renderList(summary.tasks);
  }

  if (view === "board") {
    return renderBoard(project, summary.tasks, boardDate);
  }

  if (view === "workflow") {
    return renderWorkflow(project, summary.tasks);
  }

  if (view === "dashboard") {
    return renderDashboard(summary, boardDate);
  }

  if (view === "timeline") {
    return renderTimeline(events);
  }

  if (view === "calendar") {
    return renderCalendar(summary.tasks, boardDate);
  }

  if (view === "messages") {
    return renderMessages(summary, events, boardDate);
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

        {renderView(project, projectSummary, events, selectedView, boardDate)}
      </section>
    </section>
  );
}
